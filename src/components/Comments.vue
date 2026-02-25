<template>
  <section class="comments">
    <header class="head">
      <h4 class="title">Comments <span class="count">({{ items.length }})</span></h4>
      <button class="btn ghost" @click="refresh" :disabled="loading">
        {{ loading ? "Loading..." : "Refresh" }}
      </button>
    </header>

    <div v-if="error" class="alert">{{ error }}</div>

    <div v-if="loading" class="state">Loading comments...</div>

    <div v-else class="list">
      <div v-if="items.length === 0" class="empty">Be the first to comment.</div>

      <article v-for="c in items" :key="c.id" class="item">
        <div class="meta">
          <span class="who">{{ c.username || c.name || c.email || `User #${c.user_id}` }}</span>
          <span class="time">{{ formatDate(c.created_at) }}</span>
        </div>
        <div class="text">{{ c.body }}</div>

        <button
          v-if="canDelete(c)"
          class="btn danger"
          :disabled="busyDeleteId === c.id"
          @click="remove(c)"
          title="Delete your comment"
        >
          {{ busyDeleteId === c.id ? "Deleting..." : "Delete" }}
        </button>
      </article>
    </div>

    <footer class="compose">
      <input
        v-model="draft"
        class="input"
        placeholder="Write a comment..."
        @keydown.enter.prevent="send"
      />
      <button class="btn primary" :disabled="sending || !draft.trim()" @click="send">
        {{ sending ? "Sending..." : "Send" }}
      </button>
    </footer>
  </section>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";

const props = defineProps({
  postId: { type: [Number, String], required: true },
});

// if you want parent to refresh counts, you can emit
const emit = defineEmits(["changed"]);

const apiUrl = import.meta.env.VITE_API_URL;
const token = localStorage.getItem("token");

const me = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
})();

const items = ref([]);
const draft = ref("");
const loading = ref(false);
const sending = ref(false);
const error = ref("");
const busyDeleteId = ref(null);

const postIdNum = computed(() => Number(props.postId));

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleString();
}

function authHeaders(json = false) {
  const h = {};
  if (json) h["Content-Type"] = "application/json";
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

function canDelete(c) {
  return me?.id && Number(c.user_id) === Number(me.id);
}

async function refresh() {
  if (!postIdNum.value) return;
  loading.value = true;
  error.value = "";

  try {
    const res = await fetch(`${apiUrl}/posts/${postIdNum.value}/comments`, {
      headers: authHeaders(false),
    });
    const data = await res.json();

    if (!res.ok) {
      items.value = [];
      error.value = data?.error || "Failed to load comments";
      return;
    }

    // backend returns {items:[...]} or [...]
    items.value = Array.isArray(data) ? data : (data.items || []);
  } catch {
    items.value = [];
    error.value = "Failed to load comments";
  } finally {
    loading.value = false;
  }
}

async function send() {
  const text = String(draft.value || "").trim();
  if (!text || !postIdNum.value) return;

  if (!token) {
    error.value = "Please login again to comment.";
    return;
  }

  sending.value = true;
  error.value = "";

  // optimistic
  const tempId = `tmp-${Date.now()}`;
  const optimistic = {
    id: tempId,
    post_id: postIdNum.value,
    user_id: me?.id || 0,
    username: me?.username || "me",
    body: text,
    created_at: new Date().toISOString(),
    _optimistic: true,
  };
  items.value = [optimistic, ...items.value];
  draft.value = "";

  try {
    const res = await fetch(`${apiUrl}/posts/${postIdNum.value}/comments`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ body: text }), // IMPORTANT: backend expects "body"
    });
    const data = await res.json();

    if (!res.ok) {
      items.value = items.value.filter((c) => c.id !== tempId);
      error.value = data?.error || "Failed to send comment";
      return;
    }

    // replace optimistic with real row
    items.value = items.value.map((c) => (c.id === tempId ? data : c));
    emit("changed");
  } catch {
    items.value = items.value.filter((c) => c.id !== tempId);
    error.value = "Failed to send comment";
  } finally {
    sending.value = false;
  }
}

async function remove(c) {
  if (!token) return;
  if (!c?.id) return;

  busyDeleteId.value = c.id;
  error.value = "";

  const prev = [...items.value];
  items.value = items.value.filter((x) => x.id !== c.id);

  try {
    const res = await fetch(`${apiUrl}/posts/${postIdNum.value}/comments/${c.id}`, {
      method: "DELETE",
      headers: authHeaders(false),
    });
    const data = await res.json();

    if (!res.ok) {
      items.value = prev;
      error.value = data?.error || "Delete failed";
      return;
    }

    emit("changed");
  } catch {
    items.value = prev;
    error.value = "Delete failed";
  } finally {
    busyDeleteId.value = null;
  }
}

onMounted(refresh);
</script>

<style scoped>
.comments {
  margin-top: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 12px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.title { margin: 0; font-weight: 900; }
.count { opacity: 0.8; font-weight: 800; }

.state, .empty { opacity: 0.85; padding: 8px 0; }

.alert {
  margin: 10px 0;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 80, 80, 0.18);
  border: 1px solid rgba(255, 80, 80, 0.35);
}

.list {
  display: grid;
  gap: 10px;
  max-height: 280px;
  overflow: auto;
  padding-right: 4px;
}
.item {
  padding: 10px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.10);
}
.meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  align-items: center;
}
.who { font-weight: 900; font-size: 12px; opacity: 0.95; }
.time { font-size: 12px; opacity: 0.75; }
.text { line-height: 1.5; font-size: 14px; }

.compose {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.input {
  flex: 1;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  padding: 10px 12px;
  border-radius: 12px;
  outline: none;
}
.btn {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.12);
  color: white;
}
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn.primary { background: linear-gradient(45deg, #ff416c, #ff4b2b); }
.btn.ghost { opacity: 0.95; }
.btn.danger { background: rgba(255, 80, 80, 0.22); border: 1px solid rgba(255, 80, 80, 0.35); }
</style>
<template>
  <Transition name="modal">
    <div
      v-if="modelValue"
      class="backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-title"
      @keydown.esc="handleEscape"
      tabindex="-1"
      ref="backdropRef"
    >
      <div class="card" role="document">
        <div id="call-title" class="title">
          📞 Incoming {{ callDisplayKind }} Call
        </div>
        
        <div class="from">
          From: <strong>{{ call.fromUsername || 'Unknown' }}</strong>
        </div>

        <div v-if="error" class="error-banner" role="alert">
          {{ error }}
        </div>

        <div class="actions">
          <button
            class="btn danger"
            :disabled="isProcessing"
            @click="reject"
            aria-label="Reject incoming call"
          >
            <span v-if="isProcessing && action === 'reject'" class="spinner" />
            {{ isProcessing && action === 'reject' ? 'Rejecting...' : 'Reject' }}
          </button>
          
          <button
            class="btn primary"
            :disabled="isProcessing"
            @click="accept"
            aria-label="Accept incoming call"
          >
            <span v-if="isProcessing && action === 'accept'" class="spinner" />
            {{ isProcessing && action === 'accept' ? 'Connecting...' : 'Accept' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { 
  ref, 
  computed, 
  watch, 
  nextTick, 
  onBeforeUnmount 
} from 'vue';
import { useRouter } from 'vue-router';

// ─── Types (JSDoc for IntelliSense even without TS) ─────────────────
/**
 * @typedef {Object} CallPayload
 * @property {string} roomId
 * @property {string} fromSocketId
 * @property {string} fromUsername
 * @property {'video'|'audio'} kind
 */

// ─── Props ──────────────────────────────────────────────────────────
const props = defineProps({
  /** Controls modal visibility (v-model) */
  modelValue: {
    type: Boolean,
    required: true,
  },
  /** Incoming call metadata */
  call: {
    type: Object,
    required: true,
    validator(value) {
      return (
        typeof value?.roomId === 'string' &&
        typeof value?.fromSocketId === 'string' &&
        typeof value?.kind === 'string'
      );
    },
  },
  /** Socket.io instance (socketRef.value) — can be null initially */
  socket: {
    type: Object,
    default: null,
  },
});

// ─── Emits ──────────────────────────────────────────────────────────
const emit = defineEmits([
  'update:modelValue',
  'accept',
  'reject',
  'error',
]);

// ─── State ──────────────────────────────────────────────────────────
const router = useRouter();
const backdropRef = ref(null);
const isProcessing = ref(false);
const action = ref(null); // 'accept' | 'reject' | null
const error = ref('');

let _timeoutId = null;

// ─── Computed ───────────────────────────────────────────────────────
const callDisplayKind = computed(() => 
  props.call?.kind === 'video' ? 'Video' : 'Audio'
);

const isSocketReady = computed(() => 
  props.socket?.connected === true
);

// ─── Watchers ───────────────────────────────────────────────────────
/** Auto-focus trap when modal opens */
watch(() => props.modelValue, async (visible) => {
  if (visible) {
    error.value = '';
    await nextTick();
    backdropRef.value?.focus();
  }
});

/** Clear any pending timeouts on unmount */
onBeforeUnmount(() => {
  if (_timeoutId) clearTimeout(_timeoutId);
});

// ─── Helpers ────────────────────────────────────────────────────────
function close() {
  if (isProcessing.value) return; // Prevent closing while processing
  emit('update:modelValue', false);
}

function showError(msg, autoClear = true) {
  error.value = msg;
  emit('error', msg);
  if (autoClear) {
    if (_timeoutId) clearTimeout(_timeoutId);
    _timeoutId = setTimeout(() => { error.value = ''; }, 4000);
  }
}

function validateCall() {
  if (!props.call?.roomId || !props.call?.fromSocketId) {
    showError('Invalid call data received.', false);
    return false;
  }
  if (!props.socket) {
    showError('Connection not available. Please refresh.', false);
    return false;
  }
  if (!isSocketReady.value) {
    showError('Connection lost. Trying to reconnect...');
    return false;
  }
  return true;
}

function handleEscape() {
  if (!isProcessing.value) reject();
}

// ─── Actions ────────────────────────────────────────────────────────
async function reject() {
  if (isProcessing.value) return;
  
  action.value = 'reject';
  isProcessing.value = true;

  try {
    if (props.socket && isSocketReady.value) {
      await new Promise((resolve, reject) => {
        props.socket.emit(
          'call:reject',
          {
            roomId: props.call.roomId,
            fromSocketId: props.call.fromSocketId,
          },
          (ack) => {
            if (ack?.error) reject(new Error(ack.error));
            else resolve(ack);
          }
        );
        
        // Timeout fallback if server doesn't ack
        setTimeout(() => resolve(), 2000);
      });
    }
    
    emit('reject', props.call);
    close();
  } catch (err) {
    showError(`Reject failed: ${err.message}`);
    // Still close on reject failure — user explicitly wants it gone
    close();
  } finally {
    isProcessing.value = false;
    action.value = null;
  }
}

async function accept() {
  if (isProcessing.value) return;
  
  if (!validateCall()) return;

  action.value = 'accept';
  isProcessing.value = true;

  try {
    // Emit with timeout-based ack handling
    await new Promise((resolve, reject) => {
      let resolved = false;
      
      props.socket.emit(
        'call:accept',
        {
          roomId: props.call.roomId,
          fromSocketId: props.call.fromSocketId,
          kind: props.call.kind,
        },
        (ack) => {
          if (resolved) return;
          resolved = true;
          if (ack?.error) reject(new Error(ack.error));
          else resolve(ack);
        }
      );

      // Fallback: don't block UI forever if server is slow
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(); // Proceed optimistically
        }
      }, 3000);
    });

    emit('accept', props.call);

    // Navigate — handle router failures gracefully
    await router.push({
      path: '/call',
      query: {
        roomId: props.call.roomId,
        role: 'callee',
        kind: props.call.kind,
        otherSocketId: props.call.fromSocketId,
      },
    });

    close();
  } catch (err) {
    showError(`Accept failed: ${err.message}`);
    isProcessing.value = false;
    action.value = null;
  }
}
</script>

<style scoped>
/* ─── Backdrop ───────────────────────────────────────────────────── */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
  z-index: 9999;
  outline: none; /* We handle focus visually via card */
}

/* ─── Card ───────────────────────────────────────────────────────── */
.card {
  width: min(420px, 92vw);
  background: rgba(20, 26, 40, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  padding: 24px;
  color: white;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.title {
  font-weight: 900;
  font-size: 18px;
  margin-bottom: 8px;
}

.from {
  opacity: 0.9;
  margin-bottom: 14px;
  font-size: 15px;
}

/* ─── Error Banner ───────────────────────────────────────────────── */
.error-banner {
  background: rgba(255, 80, 80, 0.15);
  border: 1px solid rgba(255, 80, 80, 0.3);
  color: #ff8080;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 14px;
}

/* ─── Actions ────────────────────────────────────────────────────── */
.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn {
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.12);
  color: white;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 90px;
  justify-content: center;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.1);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.primary {
  background: linear-gradient(45deg, #ff416c, #ff4b2b);
}

.btn.danger {
  background: rgba(255, 80, 80, 0.22);
  border: 1px solid rgba(255, 80, 80, 0.35);
}

/* ─── Spinner ────────────────────────────────────────────────────── */
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ─── Transitions ────────────────────────────────────────────────── */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .card,
.modal-leave-active .card {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from .card,
.modal-leave-to .card {
  transform: scale(0.92) translateY(10px);
}
</style>
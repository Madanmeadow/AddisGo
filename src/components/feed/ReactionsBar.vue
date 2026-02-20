<template>
  <div class="reactions">
    <button @click="react('like')">❤️</button>
    <button @click="react('fire')">🔥</button>
    <button @click="react('laugh')">😂</button>
    <button @click="react('wow')">😮</button>
  </div>
</template>

<script>
export default {
  props: ["post"],

  methods: {
    react(type) {
      console.log(`Reacted with ${type} to post ${this.post.id}`)
    }
  }
}
</script>

<style scoped>
.reactions {
  display: flex;
  gap: 15px;
  margin-top: 10px;
}
button {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
}
</style>
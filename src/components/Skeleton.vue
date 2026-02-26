<template>
  <div
    class="sk"
    :class="[variant, { round }]"
    :style="{
      width,
      height,
      borderRadius: radius
    }"
  />
</template>

<script setup>
const props = defineProps({
  width: { type: String, default: "100%" },
  height: { type: String, default: "14px" },
  radius: { type: String, default: "12px" },
  round: { type: Boolean, default: false }, // circle avatar
  variant: { type: String, default: "base" } // base | shimmer
});
</script>

<style scoped>
.sk {
  background: rgba(255,255,255,0.09);
  border: 1px solid rgba(255,255,255,0.10);
  overflow: hidden;
  position: relative;
}
.sk.round { border-radius: 999px !important; }

.sk.shimmer::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-120%);
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255,255,255,0.10),
    transparent
  );
  animation: shimmer 1.25s infinite;
}

@keyframes shimmer {
  100% { transform: translateX(120%); }
}
</style>
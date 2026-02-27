// src/composables/useRingtone.js
import { ref } from "vue";

const isRinging = ref(false);

let audio = null;

function ensureAudio() {
  if (audio) return audio;

  audio = new Audio("/sounds/ringtone.mp3");
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 1.0;
  return audio;
}

/**
 * iPhone/autoplay rule:
 * you must call this once in a user gesture (tap/click)
 * e.g. after login, or on first "Start" button.
 */
export async function unlockAudioOnce() {
  try {
    const a = ensureAudio();
    a.muted = true;
    await a.play();
    a.pause();
    a.currentTime = 0;
    a.muted = false;
  } catch {
    // ignore, user might not allow until later
  }
}

export async function startRingtone() {
  try {
    const a = ensureAudio();
    isRinging.value = true;
    await a.play();
  } catch {
    // if blocked, UI should show "Tap to enable sound"
  }
}

export function stopRingtone() {
  try {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  } catch {}
  isRinging.value = false;
}

export function useRingtoneState() {
  return { isRinging };
}
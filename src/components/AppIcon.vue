<script setup lang="ts">
withDefaults(defineProps<{ name: 'arrow' | 'check' | 'close' | 'shield' | 'phone' | 'device' | 'wechat' | 'clock' | 'alert'; size?: number }>(), { size: 24 })
const paths = {
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6',
  phone: 'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 14h2',
  device: 'M4 4h16a1 1 0 0 1 1 1v11H3V5a1 1 0 0 1 1-1ZM1 20h22M8 16v4m8-4v4',
  wechat: 'M14 14c4 0 7-2.5 7-6s-3-6-7-6-7 2.5-7 6c0 1 .3 2 .8 2.8L7 14l3.2-1c1.1.6 2.4 1 3.8 1ZM6 9c-3 .6-5 2.6-5 5 0 1.5.7 2.8 2 3.7L2 21l3.5-1.5c.8.3 1.7.5 2.5.5 3 0 5.5-1.7 6-4M11 7h.01M17 7h.01',
  clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  alert: 'M12 8v5m0 3h.01M10.3 4.5 2 19h20L13.7 4.5a2 2 0 0 0-3.4 0Z',
}
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="paths[name]" />
  </svg>
</template>

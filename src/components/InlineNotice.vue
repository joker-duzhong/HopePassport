<script setup lang="ts">
import AppIcon from './AppIcon.vue'
withDefaults(defineProps<{ tone?: 'error' | 'info'; title?: string }>(), { tone: 'info', title: '' })
</script>

<template>
  <div class="notice" :class="{ 'notice-error': tone === 'error' }" :role="tone === 'error' ? 'alert' : 'status'">
    <AppIcon :name="tone === 'error' ? 'alert' : 'shield'" :size="20" />
    <div><strong v-if="title">{{ title }}</strong><slot /></div>
  </div>
</template>

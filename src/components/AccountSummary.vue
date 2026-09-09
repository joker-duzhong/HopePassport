<script setup lang="ts">
import { computed } from 'vue'
import type { User } from '../api/types'
const props = defineProps<{ user: User }>()
const name = computed(() => props.user.nickname || props.user.username || 'Hope 用户')
const phone = computed(() => {
  const value = props.user.phone
  if (!value) return '尚未绑定手机号'
  return value.length >= 7 ? `${value.slice(0, 3)} **** ${value.slice(-4)}` : '已绑定手机号'
})
</script>

<template>
  <div class="account-summary">
    <div class="avatar" aria-hidden="true">{{ Array.from(name)[0] }}</div>
    <div class="account-details"><strong>{{ name }}</strong><span>{{ phone }}</span></div>
    <slot />
  </div>
</template>

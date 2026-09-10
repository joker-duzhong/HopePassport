<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { errorMessage } from '../api/client'
import { deploymentUrl } from '../config/environment'
import { finishOAuth, readOAuthContext } from '../lib/oauth'
import { setPendingIdentity } from '../lib/pendingIdentity'
import { AccountDisabledError, useAuthStore } from '../stores/auth'
import { useFlowStore } from '../stores/flow'
import AppIcon from '../components/AppIcon.vue'
import InlineNotice from '../components/InlineNotice.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const flow = useFlowStore()
const error = ref('')

onMounted(async () => {
  const context = readOAuthContext()
  if (context) flow.setContext(context.transactionId, context.appKey, context.returnTarget ?? null)
  else flow.capture(route.query)
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  const clean = new URL('wechat/callback', deploymentUrl)
  for (const [name, value] of Object.entries(flow.query)) clean.searchParams.set(name, value)
  window.history.replaceState(window.history.state, '', clean.pathname + clean.search)
  try {
    const result = await finishOAuth(code, state)
    if (result.status === 'PHONE_REQUIRED') {
      auth.logout()
      setPendingIdentity(result, flow.transactionId)
    } else auth.accept(result)
    await router.replace({ name: flow.transactionId ? 'scan' : result.status === 'PHONE_REQUIRED' ? 'bind' : 'result', query: { ...flow.query, status: 'success' } })
  } catch (failure) {
    if (failure instanceof AccountDisabledError) await router.replace({ name: 'result', query: { ...flow.query, status: 'disabled' } })
    else error.value = errorMessage(failure)
  }
})

function retry(): void {
  auth.logout()
  void router.replace({ name: 'login', query: flow.query })
}
</script>

<template>
  <section class="page result-page">
    <template v-if="error">
      <div class="status-emblem status-emblem-muted"><AppIcon name="alert" :size="36" /></div>
      <header class="page-heading"><h1>微信登录未完成</h1></header>
      <InlineNotice tone="error">{{ error }}</InlineNotice>
      <button class="button button-primary" @click="retry">重试登录</button>
    </template>
    <div v-else class="loading-status" role="status"><span class="spinner" aria-hidden="true"></span>正在登录…</div>
  </section>
</template>

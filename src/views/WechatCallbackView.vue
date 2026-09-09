<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { errorMessage } from '../api/client'
import { finishOAuth, readOAuthContext } from '../lib/oauth'
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
  if (context) flow.setContext(context.transactionId, context.appKey)
  else flow.capture(route.query)
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  const clean = new URL('/wechat/callback', window.location.origin)
  for (const [name, value] of Object.entries(flow.query)) clean.searchParams.set(name, value)
  window.history.replaceState(window.history.state, '', clean.pathname + clean.search)
  try {
    auth.accept(await finishOAuth(code, state))
    await router.replace({ name: flow.transactionId ? 'scan' : auth.needsBinding ? 'bind' : 'result', query: { ...flow.query, status: 'success' } })
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
    <div class="status-emblem" :class="{ 'status-emblem-muted': error }"><AppIcon :name="error ? 'alert' : 'wechat'" :size="36" /></div>
    <header class="page-heading">
      <h1>{{ error ? '微信登录未完成' : '正在登录微信账号' }}</h1>
      <p>{{ error ? '你可以重新发起授权，或改用短信登录。' : '正在核对授权信息，请稍候。' }}</p>
    </header>
    <InlineNotice v-if="error" tone="error">{{ error }}</InlineNotice>
    <button v-if="error" class="button button-primary" @click="retry">返回登录 / 重新授权<AppIcon name="arrow" :size="20" /></button>
    <div v-else class="loading-status" role="status"><span class="spinner" aria-hidden="true"></span>正在验证授权</div>
  </section>
</template>

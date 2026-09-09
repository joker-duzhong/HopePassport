<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { errorMessage } from '../api/client'
import { AccountDisabledError, useAuthStore } from '../stores/auth'
import { useFlowStore } from '../stores/flow'
import { useScanStore } from '../stores/scan'
import AppIcon from '../components/AppIcon.vue'
import AccountSummary from '../components/AccountSummary.vue'
import InlineNotice from '../components/InlineNotice.vue'

const auth = useAuthStore()
const flow = useFlowStore()
const scan = useScanStore()
const router = useRouter()
const route = useRoute()
const busy = ref(false)
const error = ref('')
const states = {
  success: { title: '登录成功', description: '欢迎回来，你已登录 Hope 通行证。', icon: 'check', positive: true },
  confirmed: { title: '已确认登录', description: '已确认，请返回原设备继续。', icon: 'check', positive: true },
  consumed: { title: '本次授权已完成', description: '原设备已获取登录凭据，请返回原设备继续。', icon: 'check', positive: true },
  cancelled: { title: '已取消登录', description: '本次登录请求已取消，未授予新的登录权限。', icon: 'close', positive: false },
  expired: { title: '二维码已过期', description: '请返回原设备刷新二维码，再重新扫码。', icon: 'clock', positive: false },
  disabled: { title: '账号已被禁用', description: '当前账号无法继续操作，请联系管理员。', icon: 'alert', positive: false },
  'session-error': { title: '暂时无法验证账号', description: '请检查网络后重试，或重新登录。', icon: 'alert', positive: false },
  invalid: { title: '页面参数无效', description: '登录链接不完整或已失效，请返回原设备重新扫码。', icon: 'alert', positive: false },
} as const
const status = computed(() => typeof route.query.status === 'string' && Object.hasOwn(states, route.query.status) ? route.query.status as keyof typeof states : 'invalid')
const content = computed(() => states[status.value])
const isScanResult = computed(() => ['confirmed', 'consumed', 'cancelled', 'expired'].includes(status.value))
const verifiedScanResult = computed(() => !!flow.transactionId &&
  scan.transaction?.transaction_id.toLowerCase() === flow.transactionId.toLowerCase() &&
  scan.transaction.status === status.value.toUpperCase())

onMounted(() => {
  if (!isScanResult.value) return
  if (!flow.transactionId) { void router.replace({ name: 'result', query: { status: 'invalid' } }); return }
  const expected = status.value.toUpperCase()
  if (scan.transaction?.transaction_id.toLowerCase() !== flow.transactionId.toLowerCase() || scan.transaction.status !== expected) {
    void router.replace({ name: 'scan', query: flow.query })
  }
})

async function retry(): Promise<void> {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await auth.restore(true)
    await router.replace({ name: flow.transactionId ? 'scan' : 'login', query: flow.query })
  } catch (failure) {
    if (failure instanceof AccountDisabledError) await router.replace({ name: 'result', query: { ...flow.query, status: 'disabled' } })
    else error.value = errorMessage(failure)
  } finally { busy.value = false }
}

async function loginAgain(): Promise<void> {
  auth.logout()
  if (status.value !== 'disabled' && status.value !== 'session-error') flow.setContext('', flow.appKey)
  await router.replace({ name: 'login', query: flow.query })
}
</script>

<template>
  <section v-if="!isScanResult || verifiedScanResult" class="page result-page">
    <div class="status-emblem" :class="{ 'status-emblem-muted': !content.positive }"><AppIcon :name="content.icon" :size="38" /></div>
    <header class="page-heading"><h1>{{ content.title }}</h1><p>{{ content.description }}</p></header>
    <AccountSummary v-if="status === 'success' && auth.user" :user="auth.user" />
    <InlineNotice v-if="!auth.sessionPersisted && status === 'success'">浏览器无法保存登录状态，刷新或关闭页面后可能需要重新登录。</InlineNotice>
    <InlineNotice v-if="error" tone="error">{{ error }}</InlineNotice>
    <div v-if="isScanResult" class="terminal-note"><AppIcon name="shield" :size="20" /><p>本次请求已结束，你可以关闭此页面。</p></div>
    <template v-else>
      <button v-if="status === 'session-error'" class="button button-primary" :disabled="busy" @click="retry"><span v-if="busy" class="spinner" aria-hidden="true"></span>{{ busy ? '正在验证…' : '重试验证' }}</button>
      <button class="button button-secondary" :disabled="busy" @click="loginAgain">{{ status === 'success' ? '切换账号' : status === 'disabled' ? '使用其他账号登录' : '返回登录' }}</button>
    </template>
  </section>
  <div v-else class="loading-status boot-loading" role="status"><span class="spinner" aria-hidden="true"></span>正在核对请求结果</div>
</template>

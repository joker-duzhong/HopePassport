<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, errorMessage } from '../api/client'
import type { ScanTransaction } from '../api/types'
import { useClock } from '../composables/useClock'
import { AccountDisabledError, useAuthStore } from '../stores/auth'
import { useFlowStore } from '../stores/flow'
import { useScanStore } from '../stores/scan'
import AccountSummary from '../components/AccountSummary.vue'
import AppIcon from '../components/AppIcon.vue'
import InlineNotice from '../components/InlineNotice.vue'

const auth = useAuthStore()
const flow = useFlowStore()
const scan = useScanStore()
const router = useRouter()
const busy = ref(false)
const ready = ref(false)
const error = ref('')
const retryAt = ref(0)
const now = useClock()
const transactionId = flow.transactionId
let disposed = false
const transaction = computed(() => scan.transaction?.transaction_id.toLowerCase() === transactionId.toLowerCase() ? scan.transaction : null)
const expiresAt = computed(() => transaction.value?.expires_at ? Date.parse(transaction.value.expires_at) : 0)
const expired = computed(() => expiresAt.value > 0 && now.value >= expiresAt.value)
const remaining = computed(() => {
  const seconds = Math.max(0, Math.ceil((expiresAt.value - now.value) / 1000))
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
})
const wait = computed(() => Math.max(0, Math.ceil((retryAt.value - Math.max(now.value, Date.now())) / 1000)))

async function terminal(value: ScanTransaction): Promise<boolean> {
  const statusMap = { CONFIRMED: 'confirmed', CONSUMED: 'consumed', CANCELLED: 'cancelled', EXPIRED: 'expired' } as const
  if (value.status === 'PENDING' || value.status === 'WAITING_SCAN') return false
  if (!disposed) await router.replace({ name: 'result', query: { ...flow.query, status: statusMap[value.status] } })
  return true
}

async function ensureAccount(): Promise<boolean> {
  if (!auth.isLoggedIn || auth.needsBinding) {
    if (!disposed) await router.replace({ name: auth.isLoggedIn ? 'bind' : 'login', query: flow.query })
    return false
  }
  return true
}

async function handleFailure(failure: unknown): Promise<void> {
  if (disposed) return
  if (failure instanceof AccountDisabledError) {
    await router.replace({ name: 'result', query: { ...flow.query, status: 'disabled' } })
  } else if (failure instanceof ApiError && failure.status === 401) {
    auth.logout()
    await router.replace({ name: 'login', query: flow.query })
  } else {
    error.value = errorMessage(failure)
    if (failure instanceof ApiError) retryAt.value = failure.retryAt
  }
}

async function load(): Promise<void> {
  if (busy.value || wait.value > 0 || disposed) return
  if (!transactionId) {
    await router.replace({ name: 'result', query: { status: 'invalid' } })
    return
  }
  busy.value = true
  ready.value = false
  error.value = ''
  try {
    const value = await scan.load(transactionId)
    if (disposed || await terminal(value)) return
    if (value.status !== 'PENDING') throw new Error('扫码状态暂未更新，请点击重试。')
    if (!value.app?.name.trim()) throw new Error('未获取到授权应用信息，无法确认登录。请返回原设备重新扫码。')
    if (!await ensureAccount()) return
    ready.value = true
  } catch (failure) { await handleFailure(failure) } finally { busy.value = false }
}

async function act(action: 'confirm' | 'cancel'): Promise<void> {
  if (busy.value || !ready.value || expired.value || wait.value > 0) return
  busy.value = true
  error.value = ''
  try {
    const current = await scan.load(transactionId, false)
    if (disposed || await terminal(current)) return
    if (current.status !== 'PENDING') throw new Error('登录请求状态已改变，请重新查询。')
    await auth.restore(true)
    if (disposed || !await ensureAccount()) return
    const result = await scan.act(transactionId, action)
    if (!await terminal(result)) throw new Error('授权结果尚未确定，请重试查询状态，不要重复提交。')
  } catch (failure) {
    ready.value = false
    await handleFailure(failure)
  } finally { busy.value = false }
}

async function switchAccount(): Promise<void> {
  if (busy.value) return
  auth.logout()
  await router.replace({ name: 'login', query: flow.query })
}

function onVisibility(): void {
  if (document.visibilityState === 'visible') void load()
}
onMounted(() => { void load(); document.addEventListener('visibilitychange', onVisibility) })
onUnmounted(() => { disposed = true; document.removeEventListener('visibilitychange', onVisibility) })
</script>

<template>
  <section class="page scan-page">
    <div class="device-emblem"><AppIcon :name="expired ? 'clock' : 'device'" :size="42" /></div>
    <header class="page-heading">
      <h1 v-if="expired">二维码已过期</h1>
      <h1 v-else>确认在另一设备<br /><span class="accent-text">登录{{ transaction?.app?.name ? `「${transaction.app.name}」` : '应用' }}</span></h1>
      <p>{{ expired ? '请返回原设备刷新二维码，再重新扫码。' : '只有你确认后，原设备才能登录。' }}</p>
    </header>
    <template v-if="!expired">
      <div v-if="busy && !ready" class="loading-status" role="status"><span class="spinner" aria-hidden="true"></span>正在核对登录请求</div>
      <InlineNotice v-if="error" tone="error">{{ error }}</InlineNotice>
      <template v-if="ready">
        <AccountSummary v-if="auth.user" :user="auth.user"><button class="text-button account-switch" :disabled="busy" @click="switchAccount">切换账号</button></AccountSummary>
        <InlineNotice title="请确认这是你本人发起的登录请求。"><p>如果不是，请取消登录。不要为陌生人的设备授权。</p></InlineNotice>
        <div v-if="expiresAt" class="expiry"><AppIcon name="clock" :size="16" /><span>请求有效期剩余 <time>{{ remaining }}</time></span></div>
        <div class="action-stack">
          <button class="button button-primary" :disabled="busy || wait > 0" @click="act('confirm')"><span v-if="busy" class="spinner" aria-hidden="true"></span>{{ busy ? '正在处理…' : '确认登录' }}<AppIcon v-if="!busy" name="check" :size="20" /></button>
          <button class="button button-secondary" :disabled="busy || wait > 0" @click="act('cancel')">取消登录</button>
        </div>
      </template>
      <button v-else-if="error" class="button button-primary" :disabled="busy || wait > 0" @click="load">{{ wait > 0 ? `${wait} 秒后重试` : '重试查询状态' }}</button>
    </template>
    <div v-else class="terminal-note">手机端不会创建新的登录请求。请在发起登录的设备上重新操作。</div>
  </section>
</template>

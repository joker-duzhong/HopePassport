<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, errorMessage } from '../api/client'
import type { ScanTransaction } from '../api/types'
import { useClock } from '../composables/useClock'
import { AccountDisabledError, useAuthStore } from '../stores/auth'
import { useFlowStore } from '../stores/flow'
import { useScanStore } from '../stores/scan'
import { pendingFor } from '../lib/pendingIdentity'
import { runtime } from '../config/environment'
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
const accepted = ref(true)
const now = useClock()
const transactionId = flow.transactionId
let disposed = false
const transaction = computed(() => scan.transaction?.transaction_id.toLowerCase() === transactionId.toLowerCase() ? scan.transaction : null)
const expiresAt = computed(() => transaction.value?.expires_at ? Date.parse(transaction.value.expires_at) : 0)
const expired = computed(() => expiresAt.value > 0 && Math.max(now.value, Date.now()) >= expiresAt.value)
const wait = computed(() => Math.max(0, Math.ceil((retryAt.value - Math.max(now.value, Date.now())) / 1000)))

async function terminal(value: ScanTransaction): Promise<boolean> {
  const statusMap = { CONFIRMED: 'confirmed', CONSUMED: 'consumed', CANCELLED: 'cancelled', EXPIRED: 'expired' } as const
  if (value.status === 'PENDING' || value.status === 'WAITING_SCAN') return false
  if (!disposed) await router.replace({ name: 'result', query: { ...flow.query, status: statusMap[value.status] } })
  return true
}

async function ensureAccount(): Promise<boolean> {
  if (!auth.isLoggedIn || auth.needsBinding) {
    if (!disposed) await router.replace({ name: pendingFor(transactionId) ? 'bind' : 'login', query: flow.query })
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
    if (expired.value) return
    if (value.status !== 'PENDING') throw new Error('扫码状态暂未更新，请点击重试。')
    if (!value.app?.name.trim()) throw new Error('未获取到授权应用信息，无法确认登录。请返回原设备重新扫码。')
    if (!await ensureAccount()) return
    ready.value = true
  } catch (failure) { await handleFailure(failure) } finally { busy.value = false }
}

async function confirm(): Promise<void> {
  if (busy.value || !ready.value || expired.value || wait.value > 0 || !accepted.value) return
  busy.value = true
  error.value = ''
  try {
    const current = await scan.load(transactionId, false)
    if (disposed || await terminal(current)) return
    if (expired.value) return
    if (current.status !== 'PENDING') throw new Error('登录请求状态已改变，请重新查询。')
    await auth.restore(true)
    if (disposed || expired.value || !await ensureAccount()) return
    const result = await scan.act(transactionId, 'confirm')
    if (!await terminal(result)) throw new Error('授权结果尚未确定，请重试查询状态，不要重复提交。')
  } catch (failure) {
    ready.value = false
    await handleFailure(failure)
  } finally { busy.value = false }
}

function onVisibility(): void {
  if (document.visibilityState === 'visible') void load()
}
onMounted(() => { void load(); document.addEventListener('visibilitychange', onVisibility) })
onUnmounted(() => { disposed = true; document.removeEventListener('visibilitychange', onVisibility) })
</script>

<template>
  <section v-if="expired && !busy" class="page result-page">
    <div class="status-emblem status-emblem-muted"><AppIcon name="clock" :size="36" /></div>
    <header class="page-heading"><h1>二维码已过期</h1><p>请在原设备刷新二维码后重新扫码</p></header>
  </section>
  <section v-else class="page scan-page" :class="{ 'page-with-agreement': ready }">
      <div v-if="busy && !ready" class="loading-status boot-loading" role="status"><span class="spinner" aria-hidden="true"></span>正在验证…</div>
      <InlineNotice v-if="error" tone="error">{{ error }}</InlineNotice>
      <template v-if="ready">
        <header class="authorization-heading">
          <p class="application-name"><AppIcon name="device" :size="24" /><span>{{ transaction?.app?.name }} <span class="application-intent">申请登录</span></span></p>
          <h1>确认在电脑上登录</h1>
        </header>
        <p class="account-label">登录账号</p>
        <AccountSummary v-if="auth.user" :user="auth.user" />
        <div class="bottom-actions">
          <button class="button button-primary" :disabled="busy || wait > 0 || !accepted || expired" @click="confirm"><span v-if="busy" class="spinner" aria-hidden="true"></span>{{ busy ? '正在确认…' : '确认登录' }}</button>
          <div class="agreement-footer">
            <div class="agreement-row">
              <label class="check-target"><input v-model="accepted" type="checkbox" :disabled="busy" aria-label="我已阅读并同意用户协议和隐私政策" /></label>
              <p>我已阅读并同意 <a :href="runtime.termsUrl" target="_blank" rel="noopener noreferrer">用户协议</a> 和 <a :href="runtime.privacyUrl" target="_blank" rel="noopener noreferrer">隐私政策</a></p>
            </div>
          </div>
        </div>
      </template>
      <button v-else-if="error" class="button button-primary" :disabled="busy || wait > 0" @click="load">{{ wait > 0 ? '请稍后重试' : '重新查询' }}</button>
  </section>
</template>

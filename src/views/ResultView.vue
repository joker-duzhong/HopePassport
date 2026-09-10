<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { errorMessage } from '../api/client'
import { AccountDisabledError, useAuthStore } from '../stores/auth'
import { useFlowStore } from '../stores/flow'
import { useScanStore } from '../stores/scan'
import AppIcon from '../components/AppIcon.vue'
import InlineNotice from '../components/InlineNotice.vue'
import { returnUrl } from '../config/returnTargets'

const auth = useAuthStore()
const flow = useFlowStore()
const scan = useScanStore()
const router = useRouter()
const route = useRoute()
const busy = ref(false)
const error = ref('')
const states = {
  success: { title: '登录成功', description: '可以关闭此页面', icon: 'check', positive: true },
  confirmed: { title: '已确认登录', description: '请回到电脑继续', icon: 'check', positive: true },
  consumed: { title: '登录成功', description: '请回到电脑继续', icon: 'check', positive: true },
  cancelled: { title: '登录已取消', description: '可以关闭此页面', icon: 'close', positive: false },
  expired: { title: '二维码已过期', description: '请在原设备刷新二维码后重新扫码', icon: 'clock', positive: false },
  disabled: { title: '账号已被禁用', description: '当前账号无法继续操作，请联系管理员。', icon: 'alert', positive: false },
  'session-error': { title: '登录验证失败', description: '请检查网络后重试', icon: 'alert', positive: false },
  invalid: { title: '链接无效', description: '请重新打开登录链接或扫码', icon: 'alert', positive: false },
} as const
const status = computed(() => typeof route.query.status === 'string' && Object.prototype.hasOwnProperty.call(states, route.query.status) ? route.query.status as keyof typeof states : 'invalid')
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
    return
  }
  returnToApp()
})

function returnToApp(): void {
  if (flow.returnTarget && verifiedScanResult.value) window.location.replace(returnUrl(flow.returnTarget, flow.transactionId))
}

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

</script>

<template>
  <section v-if="!isScanResult || verifiedScanResult" class="page result-page">
    <div class="status-emblem" :class="{ 'status-emblem-muted': !content.positive }"><AppIcon :name="content.icon" :size="38" /></div>
    <header class="page-heading"><h1>{{ content.title }}</h1><p>{{ flow.returnTarget && verifiedScanResult ? '正在返回应用…' : content.description }}</p></header>
    <button v-if="flow.returnTarget && verifiedScanResult" class="button button-primary" @click="returnToApp">返回应用</button>
    <InlineNotice v-if="!auth.sessionPersisted && status === 'success'">浏览器无法保存登录状态，刷新或关闭页面后可能需要重新登录。</InlineNotice>
    <InlineNotice v-if="error" tone="error">{{ error }}</InlineNotice>
    <button v-if="status === 'session-error'" class="button button-primary" :disabled="busy" @click="retry"><span v-if="busy" class="spinner" aria-hidden="true"></span>{{ busy ? '正在验证…' : '重试' }}</button>
  </section>
  <div v-else class="loading-status boot-loading" role="status"><span class="spinner" aria-hidden="true"></span>正在验证…</div>
</template>

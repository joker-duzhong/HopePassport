<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../api/auth'
import { ApiError, errorMessage } from '../api/client'
import { runtime } from '../config/environment'
import { useClock } from '../composables/useClock'
import { canAutoOAuth, isWechat, startOAuth } from '../lib/oauth'
import { AccountDisabledError, useAuthStore } from '../stores/auth'
import { useFlowStore } from '../stores/flow'
import AppIcon from '../components/AppIcon.vue'
import PhoneForm from '../components/PhoneForm.vue'
import InlineNotice from '../components/InlineNotice.vue'

const auth = useAuthStore()
const flow = useFlowStore()
const router = useRouter()
const accepted = ref(true)
const busy = ref(false)
const oauthBusy = ref(canAutoOAuth(flow.transactionId))
const error = ref('')
const retryAt = ref(0)
const oauthRetryAt = ref(0)
const now = useClock()
const oauthWait = computed(() => Math.max(0, Math.ceil((oauthRetryAt.value - Math.max(now.value, Date.now())) / 1000)))

async function login(phone: string, code: string): Promise<void> {
  if (busy.value || oauthBusy.value || !accepted.value || retryAt.value > Date.now()) return
  busy.value = true
  error.value = ''
  try {
    auth.accept(await authApi.phoneLogin(phone, code))
    await router.replace({ name: flow.transactionId ? 'scan' : auth.needsBinding ? 'bind' : 'result', query: { ...flow.query, status: 'success' } })
  } catch (failure) {
    if (failure instanceof AccountDisabledError) await router.replace({ name: 'result', query: { ...flow.query, status: 'disabled' } })
    else {
      error.value = errorMessage(failure)
      if (failure instanceof ApiError) retryAt.value = failure.retryAt
    }
  } finally { busy.value = false }
}

async function wechat(): Promise<void> {
  if (busy.value || oauthBusy.value || oauthWait.value > 0) return
  error.value = ''
  oauthBusy.value = true
  try { await startOAuth(flow.transactionId, flow.appKey, flow.returnTarget) } catch (failure) {
    error.value = errorMessage(failure)
    if (failure instanceof ApiError) oauthRetryAt.value = failure.retryAt
  } finally { oauthBusy.value = false }
}

onMounted(() => {
  if (oauthBusy.value) { oauthBusy.value = false; void wechat() }
})
</script>

<template>
  <section class="page login-page" :class="{ 'page-with-agreement': !oauthBusy }">
    <div v-if="oauthBusy" class="loading-status boot-loading" role="status"><span class="spinner" aria-hidden="true"></span>正在登录…</div>
    <template v-else>
      <header class="page-heading"><h1>手机号登录</h1><p v-if="flow.appName">继续登录 {{ flow.appName }}</p></header>
      <InlineNotice v-if="error" tone="error">{{ error }}</InlineNotice>
      <PhoneForm v-model:accepted="accepted" :busy="busy" label="登录" agreement :retry-at="retryAt" @submit="login">
        <p class="form-caption">未注册手机号将自动注册</p>
        <div v-if="isWechat && runtime.wechatAppId" class="secondary-action">
          <button type="button" class="text-button" :disabled="busy || oauthWait > 0" @click="wechat">
            <AppIcon name="wechat" :size="20" />{{ oauthWait > 0 ? '请稍后重试' : '微信登录' }}
          </button>
        </div>
      </PhoneForm>
    </template>
  </section>
</template>

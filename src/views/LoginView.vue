<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../api/auth'
import { ApiError, errorMessage } from '../api/client'
import { runtime } from '../config/environment'
import { useClock } from '../composables/useClock'
import { isWechat, startOAuth } from '../lib/oauth'
import { AccountDisabledError, useAuthStore } from '../stores/auth'
import { useFlowStore } from '../stores/flow'
import AppIcon from '../components/AppIcon.vue'
import PhoneForm from '../components/PhoneForm.vue'
import InlineNotice from '../components/InlineNotice.vue'

const auth = useAuthStore()
const flow = useFlowStore()
const router = useRouter()
const accepted = ref(false)
const busy = ref(false)
const oauthBusy = ref(false)
const error = ref('')
const retryAt = ref(0)
const oauthRetryAt = ref(0)
const now = useClock()
const oauthWait = computed(() => Math.max(0, Math.ceil((oauthRetryAt.value - Math.max(now.value, Date.now())) / 1000)))

async function login(phone: string, code: string): Promise<void> {
  if (busy.value || oauthBusy.value || retryAt.value > Date.now()) return
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
  try { await startOAuth(flow.transactionId, flow.appKey, accepted.value) } catch (failure) {
    error.value = errorMessage(failure)
    if (failure instanceof ApiError) oauthRetryAt.value = failure.retryAt
  } finally { oauthBusy.value = false }
}
</script>

<template>
  <section class="page login-page">
    <header class="page-heading">
      <h1>一个账号，<br /><span class="accent-text">连接 Hope。</span></h1>
      <p>欢迎使用 Hope 通行证。<br />登录后，继续你想做的事。</p>
    </header>
    <div v-if="flow.transactionId" class="flow-context">
      <AppIcon name="device" :size="21" />
      <span>登录后，确认授权<span v-if="flow.appName">「{{ flow.appName }}」</span><span v-else>另一设备</span></span>
    </div>
    <InlineNotice v-if="error" tone="error">{{ error }}</InlineNotice>
    <PhoneForm v-model:accepted="accepted" :busy="busy || oauthBusy" label="登录 / 注册" agreement :retry-at="retryAt" @submit="login">
      <p class="form-caption">未注册手机号验证成功后自动创建账号。</p>
    </PhoneForm>
    <template v-if="isWechat">
      <div class="alternative-divider"><span>也可以使用</span></div>
      <button class="button button-secondary" :disabled="busy || oauthBusy || oauthWait > 0 || !runtime.wechatAppId" @click="wechat">
        <span v-if="oauthBusy" class="spinner" aria-hidden="true"></span><AppIcon v-else name="wechat" />
        {{ oauthBusy ? '正在打开微信授权…' : oauthWait > 0 ? `${oauthWait} 秒后重试` : '微信账号登录' }}
      </button>
      <p v-if="!runtime.wechatAppId" class="form-caption">微信公众号尚未配置，请使用短信登录。</p>
    </template>
  </section>
</template>

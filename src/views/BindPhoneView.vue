<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, errorMessage } from '../api/client'
import { AccountDisabledError, useAuthStore } from '../stores/auth'
import { useFlowStore } from '../stores/flow'
import AccountSummary from '../components/AccountSummary.vue'
import PhoneForm from '../components/PhoneForm.vue'
import InlineNotice from '../components/InlineNotice.vue'

const auth = useAuthStore()
const flow = useFlowStore()
const router = useRouter()
const busy = ref(false)
const error = ref('')
const retryAt = ref(0)

async function bind(phone: string, code: string): Promise<void> {
  if (busy.value || retryAt.value > Date.now()) return
  busy.value = true
  error.value = ''
  try {
    await auth.bindPhone(phone, code)
    await router.replace({ name: flow.transactionId ? 'scan' : 'result', query: { ...flow.query, status: 'success' } })
  } catch (failure) {
    if (failure instanceof AccountDisabledError) await router.replace({ name: 'result', query: { ...flow.query, status: 'disabled' } })
    else if (failure instanceof ApiError && failure.status === 401) await switchAccount()
    else {
      error.value = errorMessage(failure)
      if (failure instanceof ApiError) retryAt.value = failure.retryAt
    }
  } finally { busy.value = false }
}

async function switchAccount(): Promise<void> {
  auth.logout()
  await router.replace({ name: 'login', query: flow.query })
}
</script>

<template>
  <section class="page">
    <header class="page-heading">
      <h1>再绑定一个<br /><span class="accent-text">手机号。</span></h1>
      <p>微信登录已完成。绑定手机号后，<br />即可继续{{ flow.transactionId ? '本次登录授权' : '使用 Hope 账号' }}。</p>
    </header>
    <AccountSummary v-if="auth.user" :user="auth.user" />
    <InlineNotice v-if="error" tone="error">{{ error }}</InlineNotice>
    <PhoneForm :busy="busy" label="绑定并继续" :retry-at="retryAt" @submit="bind" />
    <div class="switch-account-section">
      <p>这个手机号已经有账号？</p>
      <button class="text-button" :disabled="busy" @click="switchAccount">使用已有手机号账号登录</button>
      <p class="form-caption">将切换当前登录账号，不会合并账号或绑定微信身份。</p>
    </div>
  </section>
</template>

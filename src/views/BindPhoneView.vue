<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, errorMessage } from '../api/client'
import { pendingIdentity } from '../lib/pendingIdentity'
import { preferSms } from '../lib/oauth'
import { useClock } from '../composables/useClock'
import { AccountDisabledError, useAuthStore } from '../stores/auth'
import { useFlowStore } from '../stores/flow'
import PhoneForm from '../components/PhoneForm.vue'
import InlineNotice from '../components/InlineNotice.vue'

const auth = useAuthStore()
const flow = useFlowStore()
const router = useRouter()
const busy = ref(false)
const error = ref('')
const retryAt = ref(0)
const accepted = ref(true)
const now = useClock()
const canBind = computed(() => !!pendingIdentity.value && Date.parse(pendingIdentity.value.expires_at) > now.value)

async function bind(phone: string, code: string): Promise<void> {
  if (busy.value || !accepted.value || retryAt.value > Date.now()) return
  busy.value = true
  error.value = ''
  try {
    await auth.bindPhone(phone, code)
    await router.replace({ name: flow.transactionId ? 'scan' : 'result', query: { ...flow.query, status: 'success' } })
  } catch (failure) {
    if (failure instanceof AccountDisabledError) await router.replace({ name: 'result', query: { ...flow.query, status: 'disabled' } })
    else {
      error.value = errorMessage(failure)
      if (failure instanceof ApiError) retryAt.value = failure.retryAt
    }
  } finally { busy.value = false }
}

async function retry(): Promise<void> {
  preferSms(flow.transactionId)
  auth.logout()
  await router.replace({ name: 'login', query: flow.query })
}
</script>

<template>
  <section class="page" :class="{ 'page-with-agreement': canBind }">
    <header class="page-heading">
      <h1>{{ canBind ? '绑定手机号' : '验证已结束' }}</h1>
      <p>{{ canBind ? '验证后关联你的 Hope 账号' : '请重新登录后继续' }}</p>
    </header>
    <InlineNotice v-if="error" tone="error">{{ error }}</InlineNotice>
    <PhoneForm v-if="canBind" v-model:accepted="accepted" agreement :busy="busy" label="绑定并继续" :retry-at="retryAt" @submit="bind" />
    <button v-else class="button button-primary" :disabled="busy" @click="retry">重新登录</button>
  </section>
</template>

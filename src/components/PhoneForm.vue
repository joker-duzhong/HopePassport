<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { authApi } from '../api/auth'
import { ApiError, errorMessage } from '../api/client'
import { runtime, scopedKey } from '../config/environment'
import { useClock } from '../composables/useClock'
import { readStorage, writeStorage } from '../lib/storage'
import AppIcon from './AppIcon.vue'

const props = withDefaults(defineProps<{ busy: boolean; label: string; agreement?: boolean; accepted?: boolean; retryAt?: number }>(),
  { agreement: false, accepted: false, retryAt: 0 })
const emit = defineEmits<{ submit: [phone: string, code: string]; 'update:accepted': [accepted: boolean] }>()
const phone = ref('')
const code = ref('')
const sending = ref(false)
const phoneError = ref('')
const codeError = ref('')
const agreementError = ref('')
const smsError = ref('')
const sentMessage = ref('')
const smsDeadline = ref(0)
const smsRateKey = scopedKey('sms-rate-limit')
const rateDeadline = ref(Number(readStorage('session', smsRateKey)) || 0)
const now = useClock()
const seconds = computed(() => Math.max(0, Math.ceil((Math.max(smsDeadline.value, rateDeadline.value) - Math.max(now.value, Date.now())) / 1000)))
const submitSeconds = computed(() => Math.max(0, Math.ceil((props.retryAt - Math.max(now.value, Date.now())) / 1000)))
const smsLabel = computed(() => sending.value ? '发送中' : seconds.value > 0 ? `${seconds.value} 秒后重试` : '获取验证码')

watch(phone, value => {
  phoneError.value = ''
  smsError.value = ''
  sentMessage.value = ''
  smsDeadline.value = Number(readStorage('session', scopedKey(`sms:${value}`))) || 0
})
watch(code, () => { codeError.value = '' })
watch(() => props.accepted, () => { agreementError.value = '' })

function validatePhone(): boolean {
  phoneError.value = /^1[0-9]{10}$/.test(phone.value) ? '' : '请输入 11 位中国大陆手机号。'
  return !phoneError.value
}

async function sendSms(): Promise<void> {
  if (sending.value || props.busy || seconds.value > 0 || !validatePhone()) return
  sending.value = true
  smsError.value = ''
  sentMessage.value = ''
  const target = phone.value
  try {
    await authApi.sendSms(target)
    smsDeadline.value = Date.now() + 60_000
    writeStorage('session', scopedKey(`sms:${target}`), String(smsDeadline.value))
    sentMessage.value = '验证码已发送，请留意短信。'
  } catch (error) {
    smsError.value = errorMessage(error)
    if (error instanceof ApiError && error.retryAt) {
      rateDeadline.value = error.retryAt
      writeStorage('session', smsRateKey, String(error.retryAt))
    }
  } finally { sending.value = false }
}

function submit(): void {
  if (props.busy || sending.value || submitSeconds.value > 0) return
  const validPhone = validatePhone()
  codeError.value = /^[0-9]{4}$/.test(code.value) ? '' : '请输入短信中的 4 位验证码。'
  agreementError.value = props.agreement && !props.accepted ? '请先阅读并同意用户协议和隐私政策。' : ''
  if (validPhone && !codeError.value && !agreementError.value) emit('submit', phone.value, code.value)
}
</script>

<template>
  <form class="phone-form" novalidate :aria-busy="busy" @submit.prevent="submit">
    <div class="field-group">
      <label for="phone">手机号</label>
      <div class="phone-input" :class="{ invalid: phoneError }">
        <span class="dial-code" aria-label="中国大陆区号">+86</span>
        <input id="phone" v-model.trim="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="输入手机号" maxlength="11" :disabled="busy || sending" :aria-invalid="!!phoneError" :aria-describedby="phoneError ? 'phone-error' : undefined" />
      </div>
      <p v-if="phoneError" id="phone-error" class="field-error" role="alert">{{ phoneError }}</p>
    </div>
    <div class="field-group">
      <label for="code">短信验证码</label>
      <div class="code-input" :class="{ invalid: codeError }">
        <input id="code" v-model="code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="4 位验证码" maxlength="4" pattern="[0-9]{4}" :disabled="busy" :aria-invalid="!!codeError" :aria-describedby="codeError ? 'code-error' : undefined" />
        <button class="sms-button" type="button" :disabled="sending || busy || seconds > 0" @click="sendSms">{{ smsLabel }}</button>
      </div>
      <p v-if="codeError" id="code-error" class="field-error" role="alert">{{ codeError }}</p>
      <p v-if="sentMessage" class="field-hint" role="status">{{ sentMessage }}</p>
      <p v-if="smsError" class="field-error" role="alert">{{ smsError }}</p>
    </div>
    <div v-if="agreement" class="agreement-group">
      <div class="agreement-row">
        <label class="check-target">
          <input type="checkbox" :checked="accepted" :disabled="busy" aria-label="我已阅读并同意用户协议和隐私政策" :aria-invalid="!!agreementError" @change="emit('update:accepted', ($event.target as HTMLInputElement).checked)" />
        </label>
        <p>我已阅读并同意
          <a :href="runtime.termsUrl" target="_blank" rel="noopener noreferrer">用户协议</a>
          和 <a :href="runtime.privacyUrl" target="_blank" rel="noopener noreferrer">隐私政策</a>
        </p>
      </div>
      <p v-if="agreementError" class="field-error" role="alert">{{ agreementError }}</p>
    </div>
    <button class="button button-primary" type="submit" :disabled="busy || sending || submitSeconds > 0">
      <span v-if="busy" class="spinner" aria-hidden="true"></span>
      <span>{{ busy ? '正在处理…' : submitSeconds > 0 ? `${submitSeconds} 秒后重试` : label }}</span>
      <AppIcon v-if="!busy && submitSeconds === 0" name="arrow" :size="20" />
    </button>
    <slot />
  </form>
</template>

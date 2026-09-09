import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import type { LoginSession, User } from '../api/types'
import { loginSession, sessionEpoch, sessionPersisted, setSession, updateUser } from '../lib/session'

export class AccountDisabledError extends Error {
  constructor() { super('账号已被禁用，请联系管理员。') }
}

export const useAuthStore = defineStore('auth', () => {
  const verified = ref(false)
  const user = computed(() => loginSession.value?.user ?? null)
  const isLoggedIn = computed(() => !!loginSession.value && verified.value)
  const needsBinding = computed(() => !!user.value && (!user.value.phone || user.value.needs_phone_binding))
  let restoration: Promise<void> | null = null
  let restorationEpoch = -1

  function assertActive(value: User): void {
    if (value.is_active === false) {
      logout()
      throw new AccountDisabledError()
    }
  }

  function accept(session: LoginSession): void {
    assertActive(session.user)
    setSession(session)
    verified.value = true
  }

  function logout(): void {
    setSession(null)
    verified.value = false
  }

  async function restore(force = false): Promise<void> {
    if (!loginSession.value) { verified.value = false; return }
    if (verified.value && !force) return
    const epoch = sessionEpoch.value
    if (restoration && restorationEpoch === epoch) return restoration
    restorationEpoch = epoch
    const operation = (async () => {
      try {
        const current = await authApi.me()
        if (epoch !== sessionEpoch.value) return
        assertActive(current)
        updateUser(current)
        verified.value = true
      } catch (error) {
        if (epoch !== sessionEpoch.value && loginSession.value) return
        verified.value = false
        if (error instanceof ApiError && error.status === 401) return
        throw error
      }
    })()
    restoration = operation
    try { await operation } finally { if (restoration === operation) restoration = null }
  }

  async function bindPhone(phone: string, code: string): Promise<void> {
    const current = await authApi.bindPhone(phone, code)
    assertActive(current)
    updateUser(current)
    if (!current.phone || current.needs_phone_binding) throw new Error('手机号尚未绑定成功，请重试。')
  }

  return { user, isLoggedIn, needsBinding, verified, sessionPersisted, accept, logout, restore, bindPhone }
})

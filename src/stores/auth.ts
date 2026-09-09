import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import type { LoginSession, User } from '../api/types'
import { loginSession, sessionEpoch, sessionPersisted, setSession, updateUser } from '../lib/session'
import { pendingIdentity, setPendingIdentity } from '../lib/pendingIdentity'
import { scopedKey } from '../config/environment'
import { writeStorage } from '../lib/storage'

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
    writeStorage('session', scopedKey('oauth'), null)
    setPendingIdentity(null)
    setSession(session)
    verified.value = true
  }

  function logout(): void {
    writeStorage('session', scopedKey('oauth'), null)
    setPendingIdentity(null)
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
    const pending = pendingIdentity.value
    if (!pending || Date.parse(pending.expires_at) <= Date.now()) {
      setPendingIdentity(null)
      throw new ApiError('微信验证已过期，请重新发起微信登录。', 410)
    }
    try { accept(await authApi.completeIdentity(pending.login_ticket, phone, code)) } catch (error) {
      if (!(error instanceof ApiError) || ![400, 422, 429].includes(error.status)) setPendingIdentity(null)
      throw error
    }
  }

  return { user, isLoggedIn, needsBinding, verified, sessionPersisted, accept, logout, restore, bindPhone }
})

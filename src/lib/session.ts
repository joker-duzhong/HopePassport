import { shallowRef } from 'vue'
import { parseLogin } from '../api/types'
import type { LoginSession, Tokens, User } from '../api/types'
import { scopedKey } from '../config/environment'
import { readJson, writeStorage } from './storage'

const key = scopedKey('session')
function readSession(): LoginSession | null {
  const cached = readJson('session', key)
  if (!cached) return null
  try { return parseLogin(cached) } catch {
    writeStorage('session', key, null)
    return null
  }
}

export const loginSession = shallowRef<LoginSession | null>(readSession())
export const sessionEpoch = shallowRef(0)
export const sessionPersisted = shallowRef(true)

function persist(): void {
  sessionPersisted.value = writeStorage('session', key, loginSession.value ? JSON.stringify(loginSession.value) : null)
}

export function setSession(value: LoginSession | null): void {
  sessionEpoch.value += 1
  loginSession.value = value
  persist()
}

export function updateTokens(tokens: Tokens): void {
  if (loginSession.value) {
    loginSession.value = { ...loginSession.value, ...tokens }
    persist()
  }
}

export function updateUser(user: User): void {
  if (loginSession.value) {
    loginSession.value = { ...loginSession.value, user }
    persist()
  }
}

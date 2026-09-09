import { shallowRef } from 'vue'
import { isRecord, parseIdentity } from '../api/types'
import type { PendingIdentity } from '../api/types'
import { scopedKey } from '../config/environment'
import { readJson, writeStorage } from './storage'

interface PendingContext extends PendingIdentity { transactionId: string }
const key = scopedKey('pending-identity')

function readPending(): PendingContext | null {
  const cached = readJson('session', key)
  try {
    const identity = parseIdentity(cached)
    if (identity.status === 'PHONE_REQUIRED' && isRecord(cached) && typeof cached.transactionId === 'string') {
      return { ...identity, transactionId: cached.transactionId }
    }
  } catch {
    writeStorage('session', key, null)
    return null
  }
  writeStorage('session', key, null)
  return null
}

export const pendingIdentity = shallowRef<PendingContext | null>(readPending())

export function setPendingIdentity(value: PendingIdentity | null, transactionId = ''): void {
  pendingIdentity.value = value ? { ...value, transactionId } : null
  if (!writeStorage('session', key, pendingIdentity.value ? JSON.stringify(pendingIdentity.value) : null) && value) {
    pendingIdentity.value = null
    throw new Error('无法保存手机号验证状态，请允许站点存储或改用短信登录。')
  }
}

export function pendingFor(transactionId: string): boolean {
  const pending = pendingIdentity.value
  if (pending && (pending.transactionId !== transactionId || Date.parse(pending.expires_at) <= Date.now())) {
    setPendingIdentity(null)
    return false
  }
  return !!pending
}

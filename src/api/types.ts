export interface Tokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface User {
  id: string
  nickname?: string | null
  username?: string | null
  phone?: string | null
  avatar?: { url: string; thumb_url?: string | null } | null
  is_active?: boolean | null
  needs_phone_binding: boolean
}

export interface LoginSession extends Tokens { user: User }
export const scanStatuses = ['WAITING_SCAN', 'PENDING', 'CONFIRMED', 'CONSUMED', 'CANCELLED', 'EXPIRED'] as const
export type ScanStatus = typeof scanStatuses[number]
export interface ScanTransaction {
  transaction_id: string
  status: ScanStatus
  app?: { app_key: string; name: string } | null
  expires_at?: string | null
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function parseTokens(value: unknown): Tokens {
  if (!isRecord(value) || typeof value.access_token !== 'string' || !value.access_token ||
    typeof value.refresh_token !== 'string' || !value.refresh_token ||
    (value.token_type !== undefined && value.token_type !== 'bearer' && value.token_type !== 'Bearer')) {
    throw new Error('登录凭据格式异常，请重新登录。')
  }
  return { access_token: value.access_token, refresh_token: value.refresh_token, token_type: 'bearer' }
}

export function parseUser(value: unknown): User {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id ||
    typeof value.needs_phone_binding !== 'boolean' ||
    (value.phone != null && typeof value.phone !== 'string') ||
    (value.is_active != null && typeof value.is_active !== 'boolean')) {
    throw new Error('用户信息格式异常，请重试。')
  }
  return {
    id: value.id, needs_phone_binding: value.needs_phone_binding,
    phone: typeof value.phone === 'string' ? value.phone : null,
    nickname: typeof value.nickname === 'string' ? value.nickname : null,
    username: typeof value.username === 'string' ? value.username : null,
    is_active: value.is_active as boolean | null | undefined,
  }
}

export function parseLogin(value: unknown): LoginSession {
  if (!isRecord(value)) throw new Error('登录响应格式异常，请重试。')
  return { ...parseTokens(value), user: parseUser(value.user) }
}

export function parseScan(value: unknown): ScanTransaction {
  if (!isRecord(value) || typeof value.transaction_id !== 'string' ||
    !scanStatuses.includes(value.status as ScanStatus) ||
    (value.expires_at != null && (typeof value.expires_at !== 'string' || !Number.isFinite(Date.parse(value.expires_at)))) ||
    (value.app != null && (!isRecord(value.app) || typeof value.app.name !== 'string' || typeof value.app.app_key !== 'string'))) {
    throw new Error('扫码信息格式异常，请返回原设备刷新二维码。')
  }
  return value as unknown as ScanTransaction
}

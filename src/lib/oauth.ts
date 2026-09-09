import { authApi } from '../api/auth'
import { isRecord } from '../api/types'
import { deploymentUrl, runtime, scopedKey } from '../config/environment'
import { isAppKey, isTransactionId } from '../stores/flow'
import { readJson, readStorage, writeStorage } from './storage'
import { sessionEpoch } from './session'

export const isWechat = /MicroMessenger/i.test(navigator.userAgent)
const oauthKey = scopedKey('oauth')
const validityMs = 10 * 60_000
interface OAuthContext {
  state: string
  transactionId: string
  appKey: string
  appid: string
  environment: string
  origin: string
  deploymentUrl: string
  startedAt: number
}

export function preferSms(transactionId: string): void {
  writeStorage('session', scopedKey(`oauth-attempt:${transactionId || 'standalone'}`), 'sms')
  writeStorage('session', oauthKey, null)
}

export function canAutoOAuth(transactionId: string): boolean {
  return !!transactionId && isWechat && !!runtime.wechatAppId &&
    !readStorage('session', scopedKey(`oauth-attempt:${transactionId}`))
}

function assertOAuthTransport(): void {
  if (runtime.environment !== 'local' &&
    (window.location.protocol !== 'https:' || !window.isSecureContext || !window.crypto?.subtle)) {
    throw new Error('正式环境微信授权需要 HTTPS 安全页面，请使用短信登录或联系管理员。')
  }
}

export async function startOAuth(transactionId: string, appKey: string): Promise<void> {
  if (!isWechat) throw new Error('请在微信中打开，或使用短信验证码登录。')
  if (!runtime.wechatAppId) throw new Error('当前环境尚未配置微信公众号，请使用短信登录。')
  if (runtime.passportUrl !== deploymentUrl) throw new Error('请从配置的 Passport 部署地址打开，以便安全校验微信授权。')
  assertOAuthTransport()
  if (!window.crypto?.getRandomValues) throw new Error('当前浏览器无法安全生成授权状态，请更新浏览器或使用短信登录。')
  const epoch = sessionEpoch.value
  if (!writeStorage('session', scopedKey(`oauth-attempt:${transactionId || 'standalone'}`), 'attempted')) {
    throw new Error('浏览器无法保存授权状态，请使用短信登录。')
  }
  const state = Array.from(crypto.getRandomValues(new Uint8Array(24)), value => value.toString(16).padStart(2, '0')).join('')
  const context: OAuthContext = { state, transactionId, appKey, appid: runtime.wechatAppId,
    environment: runtime.environment, origin: window.location.origin, deploymentUrl, startedAt: Date.now() }
  if (!writeStorage('session', oauthKey, JSON.stringify(context))) throw new Error('浏览器无法保存授权状态，请允许站点存储或使用短信登录。')
  const callback = new URL('wechat/callback', runtime.passportUrl)
  if (runtime.environment === 'local') callback.searchParams.set('env', 'local')
  try {
    const target = await authApi.wechatUrl({ appid: context.appid, state, redirect_uri: callback.href })
    if (epoch !== sessionEpoch.value || readOAuthContext()?.state !== state) throw new Error('本次微信登录已取消。')
    const parsed = new URL(target)
    if (parsed.searchParams.get('state') !== state || parsed.searchParams.get('appid') !== context.appid ||
      parsed.searchParams.get('redirect_uri') !== callback.href || parsed.searchParams.get('scope') !== 'snsapi_base') {
      throw new Error('微信授权参数不匹配，请联系管理员。')
    }
    window.location.assign(target)
  } catch (error) {
    writeStorage('session', oauthKey, null)
    throw error
  }
}

export function readOAuthContext(): OAuthContext | null {
  const value = readJson('session', oauthKey)
  if (!isRecord(value) || typeof value.state !== 'string' || typeof value.startedAt !== 'number' ||
    typeof value.transactionId !== 'string' || (value.transactionId && !isTransactionId(value.transactionId)) ||
    typeof value.appKey !== 'string' || (value.appKey && !isAppKey(value.appKey)) ||
    value.environment !== runtime.environment || value.origin !== window.location.origin ||
    value.deploymentUrl !== deploymentUrl || value.deploymentUrl !== runtime.passportUrl ||
    value.appid !== runtime.wechatAppId || Date.now() - value.startedAt > validityMs || value.startedAt > Date.now() + 30_000) return null
  return value as unknown as OAuthContext
}

export async function finishOAuth(code: string, state: string) {
  const epoch = sessionEpoch.value
  const context = readOAuthContext()
  writeStorage('session', oauthKey, null)
  if (!context || !state || state !== context.state) throw new Error('微信授权状态无效或已使用，请重新发起登录。')
  if (!code || code.length > 512) throw new Error('未取得有效的微信授权，请重试或使用短信登录。')
  assertOAuthTransport()
  const bytes = new TextEncoder().encode(code)
  const hash = window.crypto?.subtle
    ? new Uint8Array(await window.crypto.subtle.digest('SHA-256', bytes))
    : (await import('@noble/hashes/sha256')).sha256(bytes)
  if (epoch !== sessionEpoch.value) throw new Error('账号已切换，请重新登录。')
  const fingerprint = Array.from(hash, value => value.toString(16).padStart(2, '0')).join('')
  const usedKey = scopedKey('oauth-used')
  const cached = readJson('session', usedKey)
  const used = Array.isArray(cached) ? cached.filter((value): value is string => typeof value === 'string') : []
  if (used.includes(fingerprint)) throw new Error('本次微信授权已处理，请重新发起登录。')
  if (!writeStorage('session', usedKey, JSON.stringify([...used.slice(-31), fingerprint]))) {
    throw new Error('无法记录授权状态，请使用短信登录。')
  }
  const result = await authApi.wechatLogin(context.appid, code, context.transactionId)
  if (epoch !== sessionEpoch.value) throw new Error('账号已切换，请重新登录。')
  return result
}

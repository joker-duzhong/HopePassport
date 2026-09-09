import { authApi } from '../api/auth'
import { isRecord } from '../api/types'
import { runtime, scopedKey } from '../config/environment'
import { isAppKey, isTransactionId } from '../stores/flow'
import { readJson, writeStorage } from './storage'

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
  startedAt: number
}

export async function startOAuth(transactionId: string, appKey: string, accepted: boolean): Promise<void> {
  if (!accepted) throw new Error('请阅读并同意用户协议和隐私政策。')
  if (!isWechat) throw new Error('请在微信中打开，或使用短信验证码登录。')
  if (!runtime.wechatAppId) throw new Error('当前环境尚未配置微信公众号，请使用短信登录。')
  if (runtime.passportUrl !== window.location.origin) throw new Error('请从配置的 Passport 部署域名打开，以便安全校验微信授权。')
  if (!window.isSecureContext || !crypto.subtle) throw new Error('微信授权需要 HTTPS 安全页面，请使用短信登录或联系管理员。')
  const state = Array.from(crypto.getRandomValues(new Uint8Array(24)), value => value.toString(16).padStart(2, '0')).join('')
  const context: OAuthContext = { state, transactionId, appKey, appid: runtime.wechatAppId,
    environment: runtime.environment, origin: window.location.origin, startedAt: Date.now() }
  if (!writeStorage('session', oauthKey, JSON.stringify(context))) throw new Error('浏览器无法保存授权状态，请允许站点存储或使用短信登录。')
  const callback = new URL('/wechat/callback', runtime.passportUrl)
  if (runtime.environment === 'local') callback.searchParams.set('env', 'local')
  try {
    const target = await authApi.wechatUrl({ appid: context.appid, state, redirect_uri: callback.href })
    const parsed = new URL(target)
    if (parsed.searchParams.get('state') !== state || parsed.searchParams.get('appid') !== context.appid ||
      parsed.searchParams.get('redirect_uri') !== callback.href) {
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
    value.appid !== runtime.wechatAppId || Date.now() - value.startedAt > validityMs || value.startedAt > Date.now() + 30_000) return null
  return value as unknown as OAuthContext
}

export async function finishOAuth(code: string, state: string) {
  const context = readOAuthContext()
  writeStorage('session', oauthKey, null)
  if (!context || !state || state !== context.state) throw new Error('微信授权状态无效或已使用，请重新发起登录。')
  if (!code || code.length > 512 || !crypto.subtle) throw new Error('未取得有效的微信授权，请重试或使用短信登录。')
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))
  const fingerprint = Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('')
  const usedKey = scopedKey('oauth-used')
  const cached = readJson('session', usedKey)
  const used = Array.isArray(cached) ? cached.filter((value): value is string => typeof value === 'string') : []
  if (used.includes(fingerprint)) throw new Error('本次微信授权已处理，请重新发起登录。')
  if (!writeStorage('session', usedKey, JSON.stringify([...used.slice(-31), fingerprint]))) {
    throw new Error('无法记录授权状态，请使用短信登录。')
  }
  return authApi.wechatLogin(context.appid, code)
}

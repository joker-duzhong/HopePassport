export type ReturnEnvironment = 'local' | 'production'

const callbackPath = '/auth/passport/callback'
const origins: Record<ReturnEnvironment, readonly string[]> = {
  production: ['https://nesttalk.lxyy.fun'],
  local: ['http://localhost:5174', 'http://127.0.0.1:5174', 'http://192.168.31.93:5174'],
}
export interface ReturnTarget { url: string; state: string; environment: ReturnEnvironment }

export function parseReturnTarget(url: unknown, state: unknown, environment: unknown, appKey: string): ReturnTarget | null {
  if (url === undefined && state === undefined && environment === undefined) return null
  if (appKey !== 'hope_teacher_logbook' || typeof url !== 'string' || typeof state !== 'string' ||
      !/^[a-f0-9]{48}$/.test(state) || (environment !== 'local' && environment !== 'production')) throw new Error('授权返回参数无效。')
  const target = new URL(url)
  if (target.username || target.password || target.search || target.hash || target.pathname !== callbackPath ||
      !origins[environment].includes(target.origin) || target.href !== url) throw new Error('授权返回地址未登记。')
  return { url, state, environment }
}

export function returnUrl(target: ReturnTarget, transactionId: string): string {
  const url = new URL(target.url)
  url.hash = new URLSearchParams({ transaction_id: transactionId, state: target.state }).toString()
  return url.href
}

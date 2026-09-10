export const allowedReturnDomains: readonly string[] = ['lxyy.fun']
export interface ReturnTarget { url: string }

function isLocalHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '[::1]') return true
  if (/^\[(?:f[cd][0-9a-f]{2}:|fe[89ab][0-9a-f]:)/i.test(hostname)) return true
  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [first, second] = parts
  return first === 127 || first === 10 || (first === 172 && second! >= 16 && second! <= 31) ||
    (first === 192 && second === 168) || (first === 169 && second === 254)
}

export function parseReturnTarget(back: unknown): ReturnTarget | null {
  if (back === undefined) return null
  if (typeof back !== 'string' || !back || /[\s\\]/.test(back)) throw new Error('授权返回参数无效。')
  const target = new URL(back)
  const local = isLocalHost(target.hostname)
  const allowed = allowedReturnDomains.some(domain => target.hostname === domain || target.hostname.endsWith('.' + domain))
  if (target.username || target.password || (!local && !allowed) ||
      (target.protocol !== 'https:' && !(local && target.protocol === 'http:'))) throw new Error('授权返回域名未放行。')
  return { url: target.href }
}

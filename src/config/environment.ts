import { readStorage, writeStorage } from '../lib/storage'
import { parseReturnTarget } from './returnTargets'

export type Environment = 'production' | 'local'
export const deploymentUrl = new URL(import.meta.env.BASE_URL, window.location.origin).href
const environmentKey = 'hope-passport:environment'
const entryUrl = new URL(window.location.href)
const environmentParams = entryUrl.searchParams.getAll('env')
const invalidEnvironment = environmentParams.length > 1 || environmentParams.some(value => value !== 'local')
// An explicit, registered return flow overrides a previously cached local environment.
let returnEnvironment: Environment | undefined
let returnError = ''
if (['return_to', 'return_state', 'return_env'].some(key => entryUrl.searchParams.has(key))) {
  try {
    if (['return_to', 'return_state', 'return_env', 'app_key'].some(key => entryUrl.searchParams.getAll(key).length !== 1)) throw new Error('授权返回参数重复或缺失。')
    const target = parseReturnTarget(entryUrl.searchParams.get('return_to'), entryUrl.searchParams.get('return_state'),
      entryUrl.searchParams.get('return_env'), entryUrl.searchParams.get('app_key') ?? '')
    if (!target || invalidEnvironment || (target.environment === 'production' && environmentParams.length)) throw new Error('授权环境不匹配。')
    returnEnvironment = target.environment
  } catch { returnError = '授权返回地址或环境无效，请重新打开台账登录。' }
}

if (!returnError && returnEnvironment === 'production') {
  writeStorage('local', environmentKey, null)
} else if (!returnError && !invalidEnvironment && (returnEnvironment === 'local' || environmentParams[0] === 'local')) {
  writeStorage('local', environmentKey, 'local')
}

const environment: Environment = returnEnvironment ?? (!invalidEnvironment &&
  (environmentParams[0] === 'local' || readStorage('local', environmentKey) === 'local')
  ? 'local' : 'production')

function configured(name: string): string {
  const value: unknown = import.meta.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

function httpUrl(value: string, secureOnly = false): string {
  if (!value) return ''
  const url = new URL(value)
  if (url.username || url.password || !['http:', 'https:'].includes(url.protocol) ||
    (secureOnly && url.protocol !== 'https:')) {
    throw new Error('地址配置无效，请联系管理员检查前端环境配置。')
  }
  return url.href
}

function loadConfig() {
  const prefix = environment === 'local' ? 'VITE_LOCAL_' : 'VITE_PROD_'
  try {
    const api = new URL(httpUrl(configured(prefix + 'API_BASE_URL') ||
      (environment === 'local' ? 'http://192.168.31.93:8000/' : 'https://api.lxyy.fun'), environment === 'production'))
    if (api.search || api.hash || api.pathname !== '/') throw new Error('API 地址只能配置服务端源地址，不包含路径或参数。')
    const passport = new URL(httpUrl(configured(prefix + 'PASSPORT_URL') || deploymentUrl))
    if (!passport.pathname.endsWith('/')) passport.pathname += '/'
    if (passport.search || passport.hash || passport.pathname !== new URL(deploymentUrl).pathname) {
      throw new Error('Passport 地址须包含正确的部署目录，不含查询参数或片段。')
    }
    return {
      apiBaseUrl: api.origin,
      passportUrl: passport.href,
      wechatAppId: configured(prefix + 'WECHAT_APP_ID'),
      error: returnError || (invalidEnvironment ? '环境参数无效，仅支持 env=local；正式环境无需 URL 参数。' : ''),
    }
  } catch (error) {
    return { apiBaseUrl: '', passportUrl: '', wechatAppId: '',
      error: error instanceof Error ? error.message : '环境配置无效。' }
  }
}

export const runtime = Object.freeze({ environment, ...loadConfig(),
  termsUrl: new URL('terms', deploymentUrl).pathname,
  privacyUrl: new URL('privacy', deploymentUrl).pathname,
})
export const scopedKey = (name: string) => `hope-passport:${environment}:${name}`

export function restoreProduction(): void {
  writeStorage('local', environmentKey, null)
  writeStorage('session', scopedKey('flow'), null)
  writeStorage('session', scopedKey('oauth'), null)
  window.location.replace(new URL('login', deploymentUrl).href)
}

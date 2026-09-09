import { watch } from 'vue'
import { runtime } from '../config/environment'
import { loginSession, sessionEpoch, setSession, updateTokens } from '../lib/session'
import { isRecord, parseTokens } from './types'

export class ApiError extends Error {
  constructor(message: string, public status = 0, public retryAt = 0, public cancelled = false) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: Record<string, string>
  authenticated?: boolean
}

const activeRequests = new Set<AbortController>()
const rateLimits = new Map<string, number>()
let refreshPromise: Promise<void> | null = null
let refreshEpoch = -1

export function abortRequests(): void {
  for (const controller of activeRequests) controller.abort()
  activeRequests.clear()
}
watch(sessionEpoch, abortRequests, { flush: 'sync' })
window.addEventListener('pagehide', abortRequests)

function retryDeadline(value: string | null): number {
  if (!value) return Date.now() + 60_000
  const seconds = Number(value)
  const deadline = Number.isFinite(seconds) && seconds >= 0 ? Date.now() + seconds * 1000 : Date.parse(value)
  return Number.isFinite(deadline) ? Math.max(Date.now() + 1000, deadline) : Date.now() + 60_000
}

function responseMessage(data: unknown, status: number): string {
  if (isRecord(data)) {
    if (typeof data.message === 'string' && data.message !== 'success') return data.message
    if (typeof data.detail === 'string') return data.detail
  }
  if (status === 401) return '登录已失效，请重新登录。'
  if (status === 403) return '当前操作不可用，应用可能已停用或账号已被禁用。'
  if (status === 404) return '请求的信息不存在，请返回原设备重新操作。'
  if (status === 422) return '提交的信息格式有误，请检查后重试。'
  if (status === 429) return '操作过于频繁，请稍后再试。'
  return '服务暂时不可用，请稍后重试。'
}

async function send(path: string, options: RequestOptions): Promise<unknown> {
  if (runtime.error) throw new ApiError(runtime.error)
  const method = options.method ?? 'GET'
  const rateKey = `${method}:${path.split('?')[0]}`
  const retryAt = rateLimits.get(rateKey) ?? 0
  if (retryAt > Date.now()) throw new ApiError('操作过于频繁，请等待倒计时结束。', 429, retryAt)
  const epoch = sessionEpoch.value
  const controller = new AbortController()
  activeRequests.add(controller)
  let timedOut = false
  const timeout = window.setTimeout(() => { timedOut = true; controller.abort() }, 15_000)
  const headers = new Headers({ Accept: 'application/json' })
  if (options.body) headers.set('Content-Type', 'application/json')
  if (options.authenticated) {
    const token = loginSession.value?.access_token
    if (!token) {
      clearTimeout(timeout)
      activeRequests.delete(controller)
      throw new ApiError('请先登录后继续。', 401)
    }
    headers.set('Authorization', `Bearer ${token}`)
  }
  try {
    const response = await fetch(`${runtime.apiBaseUrl}/api/v1${path}`, {
      method, headers, body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
    })
    const data: unknown = await response.json().catch(() => null)
    if (epoch !== sessionEpoch.value || (controller.signal.aborted && !timedOut)) {
      throw new ApiError('本次操作已取消。', 0, 0, true)
    }
    if (timedOut) throw new ApiError('请求超时，请检查网络后重试。')
    const status = !response.ok ? response.status : isRecord(data) && typeof data.code === 'number' ? data.code : 0
    if (status !== 200) {
      const deadline = status === 429 ? retryDeadline(response.headers.get('Retry-After')) : 0
      if (deadline) rateLimits.set(rateKey, deadline)
      throw new ApiError(responseMessage(data, status), status, deadline)
    }
    if (!isRecord(data) || !('data' in data)) throw new ApiError('接口响应格式异常，请稍后重试。')
    return data.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (controller.signal.aborted && !timedOut) throw new ApiError('本次操作已取消。', 0, 0, true)
    throw new ApiError(timedOut ? '请求超时，请检查网络后重试。' : '网络连接失败，请检查网络或稍后重试。')
  } finally {
    clearTimeout(timeout)
    activeRequests.delete(controller)
  }
}

async function refresh(): Promise<void> {
  const epoch = sessionEpoch.value
  if (refreshPromise && refreshEpoch === epoch) return refreshPromise
  refreshEpoch = epoch
  const operation = (async () => {
    try {
      const token = loginSession.value?.refresh_token
      if (!token) throw new ApiError('登录已失效，请重新登录。', 401)
      const data = await send('/auth/refresh', { method: 'POST', body: { refresh_token: token } })
      if (epoch !== sessionEpoch.value) throw new ApiError('账号已切换。', 0, 0, true)
      updateTokens(parseTokens(data))
    } catch (error) {
      if (epoch === sessionEpoch.value) setSession(null)
      if (error instanceof ApiError && error.cancelled) throw error
      throw new ApiError('登录状态无法续期，请重新登录。', 401)
    }
  })()
  refreshPromise = operation
  try { await operation } finally {
    if (refreshPromise === operation) refreshPromise = null
  }
}

export async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
  const epoch = sessionEpoch.value
  const originalToken = loginSession.value?.access_token
  try { return await send(path, options) } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !options.authenticated) throw error
    if (epoch !== sessionEpoch.value) throw new ApiError('账号已切换，请重新操作。', 0, 0, true)
    if (originalToken === loginSession.value?.access_token) await refresh()
    if (epoch !== sessionEpoch.value) throw new ApiError('登录已失效，请重新登录。', 401)
    try { return await send(path, options) } catch (retryError) {
      if (retryError instanceof ApiError && retryError.status === 401 && epoch === sessionEpoch.value) setSession(null)
      throw retryError
    }
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请稍后重试。'
}

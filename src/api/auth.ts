import { request } from './client'
import { isRecord, parseLogin, parseScan, parseUser } from './types'

export const authApi = {
  sendSms: (phone: string) => request('/auth/sms/send', { method: 'POST', body: { phone } }),
  phoneLogin: async (phone: string, code: string) => parseLogin(await request('/auth/phone/login', { method: 'POST', body: { phone, code } })),
  wechatLogin: async (appid: string, code: string) => parseLogin(await request('/auth/wechat/login', { method: 'POST', body: { appid, code } })),
  bindPhone: async (phone: string, code: string) => parseUser(await request('/auth/phone/bind', { method: 'POST', body: { phone, code }, authenticated: true })),
  me: async () => parseUser(await request('/auth/me', { authenticated: true })),
  wechatUrl: async (params: { appid: string; redirect_uri: string; state: string }) => {
    const data = await request('/auth/wechat/url?' + new URLSearchParams(params).toString())
    if (!isRecord(data) || typeof data.auth_url !== 'string') throw new Error('微信授权地址异常，请使用短信登录。')
    const url = new URL(data.auth_url)
    if (url.protocol !== 'https:' || url.hostname !== 'open.weixin.qq.com' || url.username || url.password || url.port) {
      throw new Error('微信授权地址不可信，请联系管理员。')
    }
    return url.href
  },
}

export async function scanInfo(id: string) {
  return parseScan(await request(`/auth/scan/sessions/${encodeURIComponent(id)}/info`))
}

export async function scanAction(id: string, action: 'scanned' | 'confirm' | 'cancel') {
  return parseScan(await request(`/auth/scan/sessions/${encodeURIComponent(id)}/${action}`, {
    method: 'POST', authenticated: action !== 'scanned',
  }))
}

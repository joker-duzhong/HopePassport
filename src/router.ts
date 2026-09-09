import { createRouter, createWebHistory } from 'vue-router'
import { runtime } from './config/environment'
import { AccountDisabledError, useAuthStore } from './stores/auth'
import { useFlowStore } from './stores/flow'
import { pendingFor } from './lib/pendingIdentity'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: to => ({ path: '/login', query: to.query }) },
    { path: '/terms', name: 'terms', component: () => import('./views/TermsView.vue'), meta: { title: '用户协议', publicDocument: true } },
    { path: '/privacy', name: 'privacy', component: () => import('./views/PrivacyView.vue'), meta: { title: '隐私政策', publicDocument: true } },
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { title: '登录' } },
    { path: '/bind-phone', name: 'bind', component: () => import('./views/BindPhoneView.vue'), meta: { title: '绑定手机号' } },
    { path: '/wechat/callback', name: 'callback', component: () => import('./views/WechatCallbackView.vue'), meta: { title: '微信登录' } },
    { path: '/scan', name: 'scan', component: () => import('./views/ScanView.vue'), meta: { title: '登录授权' } },
    { path: '/result', name: 'result', component: () => import('./views/ResultView.vue'), meta: { title: '操作结果' } },
    { path: '/:pathMatch(.*)*', redirect: { name: 'result', query: { status: 'invalid' } } },
  ],
  scrollBehavior: (to, _from, savedPosition) => savedPosition ??
    (to.meta.publicDocument && /^#[a-z][a-z0-9-]*$/.test(to.hash) ? { el: to.hash, top: 24 } : { top: 0 }),
})

router.beforeEach(async to => {
  if (to.meta.publicDocument || runtime.error || to.name === 'callback') return true
  const flow = useFlowStore()
  const auth = useAuthStore()
  if (!flow.capture(to.query)) return { name: 'result', query: { status: 'invalid' } }
  if (to.name === 'scan' && !flow.transactionId) return { name: 'result', query: { status: 'invalid' } }
  if (to.name === 'result' && to.query.status !== 'success') return true
  try { await auth.restore() } catch (error) {
    return { name: 'result', query: { ...flow.query, status: error instanceof AccountDisabledError ? 'disabled' : 'session-error' } }
  }
  if ((to.name === 'login' || to.name === 'bind') && flow.transactionId && flow.preparedId !== flow.transactionId) {
    return { name: 'scan', query: flow.query }
  }
  const pending = pendingFor(flow.transactionId)
  if (to.name === 'login' && pending) return { name: 'bind', query: flow.query }
  if (to.name === 'bind' && !pending) return { name: auth.isLoggedIn ? flow.transactionId ? 'scan' : 'result' : 'login', query: { ...flow.query, status: 'success' } }
  if (to.name === 'login' && auth.isLoggedIn) {
    return { name: auth.needsBinding ? 'bind' : flow.transactionId ? 'scan' : 'result', query: { ...flow.query, status: 'success' } }
  }
  if (to.name === 'result' && to.query.status === 'success') {
    if (!auth.isLoggedIn) return { name: 'login', query: flow.query }
    if (auth.needsBinding) return { name: 'bind', query: flow.query }
  }
  return true
})

router.afterEach(to => {
  document.title = `${String(to.meta.title ?? 'Hope 通行证')} · Hope 通行证`
})

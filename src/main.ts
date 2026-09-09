import { createApp, h, onErrorCaptured, ref } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { appError } from './lib/appError'
import './styles.css'

const renderFailed = ref(false)

function diagnose(error: unknown, source: 'component' | 'router'): void {
  if (!import.meta.env.DEV) return
  const category = error instanceof TypeError ? 'TypeError' : error instanceof SyntaxError ? 'SyntaxError' : 'Error'
  console.error(`[Hope Passport] ${source}: ${category}. 请在开发者工具启用“遇到异常时暂停（包含已捕获）”后刷新定位；为保护凭据，不输出原始异常。`)
}

function handleRenderError(error: unknown): void {
  diagnose(error, 'component')
  appError.value = '页面发生异常，请刷新后重试。'
  renderFailed.value = true
}

const app = createApp({
  setup() {
    onErrorCaptured(error => { handleRenderError(error); return false })
    return () => renderFailed.value
      ? h('main', { role: 'alert', style: { maxWidth: '480px', margin: '0 auto', padding: '48px 24px', color: '#161823' } }, [
        h('h1', { style: { fontSize: '24px', lineHeight: '1.5' } }, '页面暂不可用'),
        h('p', { style: { margin: '16px 0', lineHeight: '1.8' } }, '页面发生异常，请刷新后重试。'),
        h('button', { type: 'button', style: { width: '100%', minHeight: '52px', padding: '10px 20px', border: '0', borderRadius: '8px', background: '#fe2c55', color: '#ffffff', fontSize: '20px', fontWeight: '700' }, onClick: () => window.location.reload() }, '刷新页面'),
      ])
      : h(App)
  },
})
app.config.errorHandler = handleRenderError
router.onError(error => {
  diagnose(error, 'router')
  appError.value = '页面加载失败，请刷新后重试。'
})
app.use(createPinia())
app.use(router)
app.mount('#app')
5

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { appError } from './lib/appError'
import './styles.css'

const app = createApp(App)
app.config.errorHandler = () => { appError.value = '页面发生异常，请刷新后重试。' }
router.onError(() => { appError.value = '页面加载失败，请刷新后重试。' })
app.use(createPinia())
app.use(router)
app.mount('#app')
5
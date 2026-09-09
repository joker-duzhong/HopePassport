<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { router } from './router'
import { abortRequests } from './api/client'
import { runtime, restoreProduction } from './config/environment'
import { themeVariables } from './config/themes'
import { useFlowStore } from './stores/flow'
import { useAuthStore } from './stores/auth'
import { appError } from './lib/appError'
import AppIcon from './components/AppIcon.vue'
import BrandMark from './components/BrandMark.vue'
import InlineNotice from './components/InlineNotice.vue'

const flow = useFlowStore()
const auth = useAuthStore()
const route = useRoute()
const isLegalPage = computed(() => route.meta.publicDocument === true)
const ready = ref(false)
const environmentChanged = ref(false)
const variables = computed(() => themeVariables(flow.theme))
const fatalError = computed(() => appError.value || (isLegalPage.value ? '' : runtime.error))

function onEnvironmentChange(event: StorageEvent): void {
  if (event.key !== 'hope-passport:environment' && event.key !== null) return
  const next = event.newValue === 'local' ? 'local' : 'production'
  if (next !== runtime.environment) {
    abortRequests()
    environmentChanged.value = true
  }
}
function production(): void { auth.logout(); restoreProduction() }
function reload(): void { window.location.reload() }
onMounted(() => {
  void router.isReady().then(() => { ready.value = true }).catch(() => { appError.value = '页面加载失败，请刷新后重试。' })
  window.addEventListener('storage', onEnvironmentChange)
})
onUnmounted(() => window.removeEventListener('storage', onEnvironmentChange))
</script>

<template>
  <div class="passport" :style="variables" :data-theme="flow.theme.key">
    <div class="mobile-shell" :class="{ 'legal-shell': isLegalPage, 'auth-shell': !isLegalPage }">
      <header v-if="isLegalPage" class="site-header"><div class="brand"><BrandMark /><div><strong>Hope</strong><span>通行证</span></div></div><span class="header-note">协议与隐私</span></header>
      <header v-else class="auth-header">{{ flow.transactionId ? 'Hope 授权' : 'Hope 通行证' }}</header>
      <aside v-if="runtime.environment === 'local' && !isLegalPage" class="environment-banner" aria-label="当前环境"><span>开发环境</span><button @click="production">恢复正式环境</button></aside>
      <main id="main-content">
        <section v-if="fatalError || (environmentChanged && !isLegalPage)" class="page result-page">
          <div class="status-emblem status-emblem-muted"><AppIcon name="alert" :size="32" /></div>
          <header class="page-heading"><h1>{{ environmentChanged ? '运行环境已切换' : '页面暂不可用' }}</h1></header>
          <InlineNotice tone="error">{{ environmentChanged ? '另一个页面修改了运行环境。当前操作已暂停，请重新打开登录页。' : fatalError }}</InlineNotice>
          <button class="button button-primary" @click="environmentChanged || runtime.error ? production() : reload()">{{ environmentChanged || runtime.error ? '回到正式环境登录' : '刷新页面' }}</button>
        </section>
        <RouterView v-else-if="ready" v-slot="{ Component, route: currentRoute }"><component :is="Component" :key="isLegalPage ? currentRoute.path : currentRoute.fullPath" /></RouterView>
        <div v-else class="loading-status boot-loading" role="status"><span class="spinner" aria-hidden="true"></span>{{ isLegalPage ? '正在加载…' : '正在登录…' }}</div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.legal-shell { max-width: 800px; }
@media (min-width: 900px) {
  .legal-shell { max-width: 1120px; padding-left: 48px; padding-right: 48px; }
  .legal-shell .site-header { padding-top: 40px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
}
</style>

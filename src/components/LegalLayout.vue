<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

defineProps<{ title: string; description: string; sections: readonly { id: string; title: string }[] }>()
const route = useRoute()
const wideScreen = ref(false)
let media: MediaQueryList | undefined
const updateWidth = () => { wideScreen.value = media?.matches ?? false }
onMounted(() => {
  media = window.matchMedia('(min-width: 900px)')
  updateWidth()
  media.addEventListener('change', updateWidth)
})
onUnmounted(() => media?.removeEventListener('change', updateWidth))
</script>

<template>
  <div class="legal-document">
    <nav class="legal-switch" aria-label="协议文档">
      <RouterLink to="/terms">用户协议</RouterLink>
      <RouterLink to="/privacy">隐私政策</RouterLink>
    </nav>
    <header class="legal-heading">
      <h1 id="document-title" tabindex="-1">{{ title }}</h1>
      <p>{{ description }}</p>
      <span class="legal-version">基础草案 · 待运营方确认</span>
    </header>
    <div class="legal-grid">
      <nav class="legal-directory" aria-label="本页目录">
        <details :open="wideScreen">
          <summary>本页目录</summary>
          <ol>
            <li v-for="section in sections" :key="section.id">
              <RouterLink :to="{ path: route.path, hash: '#' + section.id }">{{ section.title }}</RouterLink>
            </li>
          </ol>
        </details>
      </nav>
      <article class="legal-article" aria-labelledby="document-title">
        <div class="legal-draft" role="note">
          <strong>关于此版本</strong>
          <p>本页为 Hope 通行证的基础协议草案。运营主体、联系方式与数据处理细节尚待运营方确认，当前文本不是已完成审核的正式版本。</p>
        </div>
        <div class="legal-intro"><slot name="intro" /></div>
        <section v-for="(section, index) in sections" :key="section.id" class="legal-section" :aria-labelledby="section.id">
          <h2 :id="section.id" tabindex="-1">{{ index + 1 }}. {{ section.title }}</h2>
          <slot :name="section.id" />
        </section>
        <div class="legal-end"><RouterLink :to="{ path: route.path, hash: '#document-title' }">返回顶部</RouterLink></div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.legal-document { padding: 28px 0 32px; }
.legal-switch { display: flex; gap: 28px; border-bottom: 1px solid var(--border); }
.legal-switch a { display: flex; align-items: center; min-height: 48px; padding: 12px 0; color: var(--muted); text-decoration: none; font-size: 15px; }
.legal-switch a.router-link-active { color: var(--accent); font-weight: 600; border-bottom: 2px solid var(--accent); }
.legal-heading { padding: 32px 0 28px; }
.legal-heading h1 { margin: 0; font-size: 32px; font-weight: 650; line-height: 1.4; letter-spacing: 0; }
.legal-heading > p { margin-top: 12px; color: var(--muted); font-size: 16px; line-height: 1.8; }
.legal-version { display: block; margin-top: 18px; font-size: 13px; line-height: 1.6; color: var(--muted); }
.legal-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; }
.legal-directory { min-width: 0; }
.legal-directory details { border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.legal-directory summary { cursor: pointer; min-height: 48px; padding: 14px 0; color: var(--text); font-weight: 600; font-size: 14px; }
.legal-directory ol { margin: 0; padding: 0 0 14px 24px; }
.legal-directory li { padding-left: 2px; color: var(--muted); font-size: 13px; }
.legal-directory a { display: block; padding: 11px 0; line-height: 1.7; min-height: 44px; color: var(--muted); text-decoration: none; }
.legal-directory a:hover { color: var(--accent); text-decoration: underline; }
.legal-article { min-width: 0; font-size: 16px; line-height: 1.9; overflow-wrap: anywhere; }
.legal-article :deep(p + p) { margin-top: 12px; }
.legal-article :deep(ul) { padding-left: 22px; margin: 14px 0 0; }
.legal-article :deep(li + li) { margin-top: 10px; }
.legal-draft { padding: 18px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); color: var(--muted); font-size: 14px; line-height: 1.8; }
.legal-draft strong { display: block; margin-bottom: 6px; color: var(--text); }
.legal-intro { margin-top: 24px; }
.legal-section { margin-top: 34px; }
.legal-section h2 { margin: 0 0 14px; font-size: 20px; font-weight: 650; line-height: 1.6; letter-spacing: 0; scroll-margin-top: 24px; }
.legal-section :deep(dl) { margin: 16px 0 0; }
.legal-section :deep(dt) { margin-top: 14px; font-weight: 600; }
.legal-section :deep(dd) { margin: 4px 0 0; color: var(--muted); }
.legal-end { border-top: 1px solid var(--border); padding-top: 20px; margin-top: 40px; }
.legal-end a { display: inline-flex; align-items: center; min-height: 44px; font-size: 14px; }
@media (min-width: 900px) {
  .legal-document { padding-top: 24px; }
  .legal-heading { margin-left: 256px; padding-top: 40px; padding-bottom: 32px; }
  .legal-heading h1 { font-size: 36px; }
  .legal-grid { grid-template-columns: 208px minmax(0, 1fr); gap: 48px; }
  .legal-directory { position: sticky; top: 24px; align-self: start; max-height: calc(100vh - 48px); overflow-y: auto; }
  .legal-directory details { border-bottom: 0; }
  .legal-article { font-size: 17px; }
  .legal-section { margin-top: 40px; }
  .legal-section h2 { font-size: 22px; }
}
@media print {
  .legal-switch, .legal-directory, .legal-end { display: none; }
  .legal-heading { margin-left: 0; }
  .legal-grid { display: block; }
  .legal-section h2 { break-after: avoid; }
}
</style>

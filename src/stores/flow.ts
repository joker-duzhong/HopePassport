import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { LocationQuery } from 'vue-router'
import { resolveTheme } from '../config/themes'
import { parseReturnTarget } from '../config/returnTargets'
import type { ReturnTarget } from '../config/returnTargets'
import { runtime } from '../config/environment'

export const isTransactionId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export const isAppKey = (value: string) => /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(value)

export const useFlowStore = defineStore('flow', () => {
  const transactionId = ref('')
  const appKey = ref('')
  const appName = ref('')
  const preparedId = ref('')
  const returnTarget = ref<ReturnTarget | null>(null)
  const theme = computed(() => resolveTheme(appKey.value))
  const query = computed(() => ({
    ...(transactionId.value ? { transaction_id: transactionId.value } : {}),
    ...(appKey.value ? { app_key: appKey.value } : {}),
    ...(returnTarget.value ? { return_to: returnTarget.value.url, return_state: returnTarget.value.state, return_env: returnTarget.value.environment } : {}),
    ...(runtime.environment === 'local' ? { env: 'local' } : {}),
  }))

  function setContext(id: string, key: string, target: ReturnTarget | null = null): void {
    if (id !== transactionId.value) { appName.value = ''; preparedId.value = '' }
    transactionId.value = id
    appKey.value = key
    returnTarget.value = target
  }

  function capture(params: LocationQuery): boolean {
    const id = params.transaction_id
    const key = params.app_key
    if ((id !== undefined && (typeof id !== 'string' || !isTransactionId(id))) ||
      (key !== undefined && (typeof key !== 'string' || !isAppKey(key)))) return false
    try {
      const target = parseReturnTarget(params.return_to, params.return_state, params.return_env, typeof key === 'string' ? key : '')
      if (target && (!id || target.environment !== runtime.environment)) return false
      setContext(typeof id === 'string' ? id : '', typeof key === 'string' ? key : '', target)
    } catch { return false }
    return true
  }

  return { transactionId, appKey, appName, preparedId, returnTarget, theme, query, capture, setContext }
})

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { scanAction, scanInfo } from '../api/auth'
import type { ScanTransaction } from '../api/types'
import { useFlowStore } from './flow'

export const useScanStore = defineStore('scan', () => {
  const transaction = ref<ScanTransaction | null>(null)
  const flow = useFlowStore()

  function accept(id: string, value: ScanTransaction): ScanTransaction {
    if (value.transaction_id.toLowerCase() !== id.toLowerCase()) throw new Error('扫码事务不匹配，请返回原设备重新扫码。')
    if (flow.transactionId !== id) throw new Error('扫码事务已切换，请重试。')
    if (flow.returnTarget && flow.appKey && value.app && value.app.app_key !== flow.appKey) throw new Error('授权应用与返回地址不匹配，请重新登录。')
    transaction.value = value
    if (value.app) {
      flow.appName = value.app.name
      flow.appKey = value.app.app_key
    }
    return value
  }

  async function load(id: string, markScanned = true): Promise<ScanTransaction> {
    let value = accept(id, await scanInfo(id))
    if (markScanned && value.status === 'WAITING_SCAN') value = accept(id, await scanAction(id, 'scanned'))
    if (value.status === 'PENDING') flow.preparedId = id
    return value
  }

  async function act(id: string, action: 'confirm' | 'cancel'): Promise<ScanTransaction> {
    return accept(id, await scanAction(id, action))
  }

  return { transaction, load, act }
})

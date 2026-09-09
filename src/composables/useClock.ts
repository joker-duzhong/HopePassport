import { onMounted, onUnmounted, ref } from 'vue'

export function useClock() {
  const now = ref(Date.now())
  let timer: number | undefined
  const update = () => { now.value = Date.now() }
  onMounted(() => {
    timer = window.setInterval(update, 500)
    document.addEventListener('visibilitychange', update)
  })
  onUnmounted(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', update)
  })
  return now
}

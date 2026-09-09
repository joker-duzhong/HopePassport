export function readStorage(storage: 'local' | 'session', key: string): string | null {
  try {
    return window[storage === 'local' ? 'localStorage' : 'sessionStorage'].getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(storage: 'local' | 'session', key: string, value: string | null): boolean {
  try {
    const target = window[storage === 'local' ? 'localStorage' : 'sessionStorage']
    if (value === null) target.removeItem(key)
    else target.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function readJson(storage: 'local' | 'session', key: string): unknown {
  const value = readStorage(storage, key)
  if (!value) return null
  try {
    return JSON.parse(value) as unknown
  } catch {
    writeStorage(storage, key, null)
    return null
  }
}

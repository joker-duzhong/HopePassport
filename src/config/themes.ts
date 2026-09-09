export interface PassportTheme {
  key: string
  tokens: {
    background: string
    surface: string
    field: string
    accent: string
    accentHover: string
    accentSoft: string
    onAccent: string
    text: string
    muted: string
    border: string
    danger: string
    dangerSoft: string
    radius: string
  }
}

export const defaultTheme: PassportTheme = {
  key: 'hope',
  tokens: {
    background: '#f4f8f7', surface: '#ffffff', field: '#f0f5f3',
    accent: '#126750', accentHover: '#0b4e3c', accentSoft: '#e0efe7',
    onAccent: '#ffffff', text: '#172f28', muted: '#566b63',
    border: '#d4dfd9', danger: '#a53232', dangerSoft: '#fff0ef', radius: '14px',
  },
}

export const appThemes: Readonly<Record<string, PassportTheme>> = {}

export function resolveTheme(appKey: string): PassportTheme {
  return Object.hasOwn(appThemes, appKey) ? appThemes[appKey]! : defaultTheme
}

export function themeVariables(theme: PassportTheme): Record<string, string> {
  return Object.fromEntries(Object.entries(theme.tokens).map(([name, value]) =>
    [`--${name.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())}`, value]))
}

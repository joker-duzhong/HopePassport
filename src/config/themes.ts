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
    link: string
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
    background: '#ffffff', surface: '#ffffff', field: '#f7f7f8',
    accent: '#fe2c55', accentHover: '#e51f48', accentSoft: '#fff0f3',
    onAccent: '#ffffff', link: '#b8183b', text: '#161823', muted: '#686970',
    border: '#e9e9eb', danger: '#b4233e', dangerSoft: '#fff0f3', radius: '8px',
  },
}

export const appThemes: Readonly<Record<string, PassportTheme>> = {}

export function resolveTheme(appKey: string): PassportTheme {
  return Object.prototype.hasOwnProperty.call(appThemes, appKey) ? appThemes[appKey]! : defaultTheme
}

export function themeVariables(theme: PassportTheme): Record<string, string> {
  return Object.fromEntries(Object.entries(theme.tokens).map(([name, value]) =>
    [`--${name.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())}`, value]))
}

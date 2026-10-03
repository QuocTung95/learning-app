import { createContext, useContext, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, ConfigProvider, Popover, Tooltip, theme } from 'antd'
import { BgColorsOutlined, CheckOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons'

export const appThemes = [
  { id: 'lime', name: 'Lime', color: '#bef264', lightColor: '#4d7c0f' },
  { id: 'blue', name: 'Blue', color: '#60a5fa', lightColor: '#1d4ed8' },
  { id: 'indigo', name: 'Indigo', color: '#818cf8', lightColor: '#4338ca' },
  { id: 'violet', name: 'Violet', color: '#c084fc', lightColor: '#7e22ce' },
  { id: 'rose', name: 'Rose', color: '#fb7185', lightColor: '#be123c' },
  { id: 'orange', name: 'Orange', color: '#fb923c', lightColor: '#c2410c' },
  { id: 'teal', name: 'Teal', color: '#2dd4bf', lightColor: '#0f766e' },
  { id: 'slate', name: 'Slate', color: '#cbd5e1', lightColor: '#475569' },
] as const

type ColorMode = 'dark' | 'light'
type ThemeId = typeof appThemes[number]['id']
const storageKey = 'quiz-atlas-theme'
const modeStorageKey = 'quizz-app-mode'
const fontFamily = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const ThemeContext = createContext<{ selected: ThemeId; select: (id: ThemeId) => void; mode: ColorMode; setMode: (mode: ColorMode) => void }>({ selected: 'lime', select: () => {}, mode: 'dark', setMode: () => {} })

export function useAppTheme() { return useContext(ThemeContext) }

function readMode(): ColorMode {
  try { return window.localStorage.getItem(modeStorageKey) === 'light' ? 'light' : 'dark' } catch { return 'dark' }
}

function mix(color: string, base: string, amount: number): string {
  return '#' + [1, 3, 5].map(index => Math.round(parseInt(color.slice(index, index + 2), 16) * amount + parseInt(base.slice(index, index + 2), 16) * (1 - amount)).toString(16).padStart(2, '0')).join('')
}

function readTheme(): ThemeId {
  try {
    const saved = window.localStorage.getItem(storageKey)
    return appThemes.find(item => item.id === saved)?.id ?? 'lime'
  } catch { return 'lime' }
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [selected, select] = useState<ThemeId>(readTheme)
  const [mode, setMode] = useState<ColorMode>(readMode)
  const palette = appThemes.find(item => item.id === selected) ?? appThemes[0]
  const dark = mode === 'dark'
  const accent = dark ? palette.color : palette.lightColor
  const background = dark ? '#101318' : '#f6f8fb'
  const surface = dark ? '#151a21' : '#ffffff'
  const elevated = dark ? '#1c232d' : '#ffffff'
  const text = dark ? '#e7ebf0' : '#18212f'
  const muted = dark ? '#939daa' : '#647084'
  const border = mix(accent, dark ? '#252d37' : '#e2e7ef', 0.2)
  const accentSoft = mix(accent, surface, dark ? 0.12 : 0.07)
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = palette.id
    root.dataset.mode = mode
    root.style.colorScheme = mode
    Object.entries({ accent, bg: background, surface, text, muted, border, 'accent-soft': accentSoft }).forEach(([key, value]) => root.style.setProperty(`--${key}`, value))
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background)
    try {
      window.localStorage.setItem(storageKey, palette.id)
      window.localStorage.setItem(modeStorageKey, mode)
    } catch { /* Appearance works without storage. */ }
  }, [palette, mode, accent, background, surface, text, muted, border, accentSoft])
  return <ThemeContext.Provider value={{ selected, select, mode, setMode }}>
    <ConfigProvider theme={{
      algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: { colorPrimary: accent, colorLink: accent, colorTextBase: text, colorTextSecondary: muted, colorBgBase: background, colorBgContainer: surface, colorBgElevated: elevated, colorBorder: border, colorBorderSecondary: border, borderRadius: 8, fontFamily, fontSize: 14, controlHeight: 36, boxShadow: 'none', boxShadowSecondary: 'none' },
      components: {
        Button: { primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none', fontWeight: 600, primaryColor: dark ? '#101318' : '#ffffff' },
        Card: { headerFontSize: 14 },
        Table: { headerBg: accentSoft, headerColor: muted, rowHoverBg: accentSoft, cellPaddingBlock: 14 },
        Menu: { itemBg: surface, subMenuItemBg: surface, itemSelectedBg: accentSoft, itemSelectedColor: accent, itemHoverBg: accentSoft, itemHoverColor: accent, darkItemBg: surface, darkSubMenuItemBg: surface, darkItemSelectedBg: accentSoft, darkItemSelectedColor: accent, darkItemHoverBg: accentSoft, darkItemHoverColor: accent, itemBorderRadius: 6 },
        Layout: { headerBg: background, siderBg: surface, triggerBg: accentSoft, triggerColor: accent },
      },
    }}>{children}</ConfigProvider>
  </ThemeContext.Provider>
}

export function ThemePicker() {
  const { selected, select, mode, setMode } = useAppTheme()
  const [open, setOpen] = useState(false)
  return <div className="appearance-controls"><Tooltip title={mode === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}><Button type="text" className="theme-trigger" aria-label={mode === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />} /></Tooltip><Popover trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen} title="Màu giao diện" content={<div className="theme-grid">{appThemes.map(item => <button key={item.id} type="button" className="theme-option" aria-pressed={selected === item.id} aria-label={`Theme ${item.name}`} onClick={() => { select(item.id); setOpen(false) }}><span className="theme-swatch" style={{ background: mode === 'dark' ? item.color : item.lightColor, color: mode === 'dark' ? '#101318' : '#ffffff' }}>{selected === item.id && <CheckOutlined />}</span><span>{item.name}</span></button>)}</div>}>
    <Tooltip title="Đổi màu giao diện"><Button type="text" className="theme-trigger" aria-label="Đổi màu giao diện" icon={<BgColorsOutlined />} /></Tooltip>
  </Popover></div>
}

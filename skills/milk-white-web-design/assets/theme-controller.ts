import { computed, onMounted, onUnmounted, ref } from 'vue'

export type ThemeMode = 'light' | 'dark'
export const THEME_STORAGE_KEY = 'milk-design-theme'
export const THEME_EVENT = 'milk-theme-change'
const BROWSER_COLORS: Record<ThemeMode, string> = { light: '#e9eaee', dark: '#1c1f24' }
let current: ThemeMode = 'light'

/** Exact RGB complement; alpha and geometry are never changed. */
export function invertHex(color: string): string {
  const match = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(color)
  if (!match) return color
  let hex = match[1]!
  if (hex.length < 5) hex = [...hex].map(c => c + c).join('')
  return '#' + [0, 2, 4].map(i => (255 - parseInt(hex.slice(i, i + 2), 16)).toString(16).padStart(2, '0')).join('') + hex.slice(6)
}

export function getTheme(): ThemeMode {
  if (typeof document !== 'undefined') return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  return current
}
export function isDark(): boolean { return getTheme() === 'dark' }

/** For Canvas, WebGL inputs and chart libraries that require resolved colors. */
export function themeColor(color: string): string {
  if (!isDark()) return color
  if (color.startsWith('#')) return invertHex(color)
  if (color === 'white') return 'black'
  if (color === 'black') return 'white'
  const rgb = /^(rgba?)\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(\s*,\s*[^)]+)?\s*\)$/i.exec(color)
  return rgb ? `${rgb[1]}(${[2, 3, 4].map(i => 255 - Number(rgb[i])).join(',')}${rgb[5] ?? ''})` : color
}

function applyTheme(mode: ThemeMode) {
  current = mode
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = mode
  document.documentElement.style.colorScheme = mode
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BROWSER_COLORS[mode])
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: mode }))
}

export function setTheme(mode: ThemeMode) {
  applyTheme(mode)
  try { localStorage.setItem(THEME_STORAGE_KEY, mode) } catch { /* Private/blocked storage still permits this session. */ }
}

export function initTheme() {
  let mode: ThemeMode = 'light'
  try { if (localStorage.getItem(THEME_STORAGE_KEY) === 'dark') mode = 'dark' } catch { /* Default remains light. */ }
  applyTheme(mode)
}

export function useTheme() {
  const theme = ref<ThemeMode>(getTheme())
  const sync = () => { theme.value = getTheme() }
  const storage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) applyTheme(event.newValue === 'dark' ? 'dark' : 'light')
  }
  onMounted(() => { sync(); window.addEventListener(THEME_EVENT, sync); window.addEventListener('storage', storage) })
  onUnmounted(() => { window.removeEventListener(THEME_EVENT, sync); window.removeEventListener('storage', storage) })
  return { theme, isDark: computed(() => theme.value === 'dark'), setTheme, toggle: () => setTheme(getTheme() === 'dark' ? 'light' : 'dark') }
}

import { computed, onMounted, onUnmounted, ref } from 'vue'

export type MaterialMode = 'solid' | 'glass'
export const MATERIAL_STORAGE_KEY = 'milk-design-material'
export const MATERIAL_EVENT = 'milk-material-change'
let current: MaterialMode = 'solid'

function storedMaterial(value: unknown): MaterialMode {
  return value === 'glass' ? 'glass' : 'solid'
}

export function getMaterial(): MaterialMode {
  if (typeof document !== 'undefined') return storedMaterial(document.documentElement.dataset.material)
  return current
}

/** Material changes are independent of the selected color theme and its native controls. */
function applyMaterial(mode: MaterialMode) {
  current = mode
  if (typeof document !== 'undefined') document.documentElement.dataset.material = mode
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(MATERIAL_EVENT, { detail: mode }))
}

export function setMaterial(mode: MaterialMode) {
  const material = storedMaterial(mode)
  applyMaterial(material)
  try { localStorage.setItem(MATERIAL_STORAGE_KEY, material) } catch { /* Blocked storage still permits a session selection. */ }
}

export function initMaterial() {
  let material: MaterialMode = 'solid'
  try { material = storedMaterial(localStorage.getItem(MATERIAL_STORAGE_KEY)) } catch { /* Default remains solid. */ }
  applyMaterial(material)
}

export function useMaterial() {
  const material = ref<MaterialMode>(getMaterial())
  const sync = () => { material.value = getMaterial() }
  const storage = (event: StorageEvent) => {
    if (event.key === MATERIAL_STORAGE_KEY || event.key === null) applyMaterial(storedMaterial(event.newValue))
  }
  onMounted(() => {
    sync()
    if (typeof window === 'undefined') return
    window.addEventListener(MATERIAL_EVENT, sync)
    window.addEventListener('storage', storage)
  })
  onUnmounted(() => {
    if (typeof window === 'undefined') return
    window.removeEventListener(MATERIAL_EVENT, sync)
    window.removeEventListener('storage', storage)
  })
  return {
    material,
    isGlass: computed(() => material.value === 'glass'),
    setMaterial,
    toggle: () => setMaterial(getMaterial() === 'glass' ? 'solid' : 'glass'),
  }
}

/** A decorative border follows native focus without changing control geometry. */
const installations = new WeakMap<Document, () => void>()
const SVG_NS = 'http://www.w3.org/2000/svg'
let installationId = 0

/** Install once at the app entry point; dispose on unmount or Vite HMR. */
export function initFocusBorder(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {}
  const existing = installations.get(document)
  if (existing) return existing
  const doc = document
  const win = window
  const removers: Array<() => void> = []
  const svg = doc.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('class', 'milk-focus-overlay')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  const defs = doc.createElementNS(SVG_NS, 'defs')
  const clip = doc.createElementNS(SVG_NS, 'clipPath')
  const clipId = `milk-focus-clip-${++installationId}`
  clip.setAttribute('id', clipId)
  clip.setAttribute('clipPathUnits', 'userSpaceOnUse')
  const clipRect = doc.createElementNS(SVG_NS, 'rect')
  clip.append(clipRect)
  defs.append(clip)
  const group = doc.createElementNS(SVG_NS, 'g')
  group.setAttribute('clip-path', `url(#${clipId})`)
  const paths = ['track', 'glow', 'trail', 'head'].map(name => {
    const path = doc.createElementNS(SVG_NS, 'path')
    path.setAttribute('class', `milk-focus-${name}`)
    path.setAttribute('pathLength', '100')
    path.setAttribute('fill', 'none')
    group.append(path)
    return path
  })
  svg.append(defs, group)
  let source: Element | null = null
  let owner: Element | null = null
  let frame = 0
  let suspended = false
  let disposed = false
  let geometry = ''

  function hide() {
    svg.style.visibility = 'hidden'
    source?.removeAttribute('data-milk-focus-source')
    owner?.removeAttribute('data-milk-focus-owner')
    source = owner = null
  }
  function cancel() {
    if (frame) win.cancelAnimationFrame(frame)
    frame = 0
    hide()
  }
  function focusOwner(focused: Element): Element {
    const explicit = focused.closest('[data-milk-focus-surface]')
    if (explicit) return explicit
    if (focused.matches('[data-input-otp],input[data-slot="input-otp"]')) {
      const container = focused.closest('[data-input-otp-container]') ?? focused.parentElement
      return container?.querySelector('[data-slot="input-otp-slot"][data-active="true"]')
        ?? container?.querySelector('[data-slot="input-otp-slot"]') ?? focused
    }
    if (focused.matches('input,textarea,[contenteditable]:not([contenteditable="false"])')) {
      return focused.closest('[data-slot="input-group"],[data-slot="number-field-content"],[data-slot="tags-input"],[data-slot="command-input-wrapper"],[data-slot="questionnaire-choice"]') ?? focused
    }
    if (focused.matches('[data-slot="attachment-trigger"]')) return focused.closest('[data-slot="attachment"]') ?? focused
    if (focused.matches('[data-slot="scroll-area-viewport"]')) return focused.closest('[data-slot="scroll-area"]') ?? focused
    return focused
  }
  function topLayerHost(target: Element): Element {
    // Native modal dialogs/popovers paint above body regardless of z-index.
    for (let node: Element | null = target; node; node = node.parentElement) {
      if (node.matches('dialog[open]')) return node
      if (node.hasAttribute('popover')) {
        try { if (node.matches(':popover-open')) return node } catch { /* Older browsers have no popover selector. */ }
      }
    }
    return doc.body
  }
  function setRect(node: Element, x: number, y: number, width: number, height: number) {
    for (const [name, value] of Object.entries({ x, y, width, height })) node.setAttribute(name, String(value))
  }
  function radius(value: string, width: number, height: number): [number, number] {
    const [horizontal, vertical = horizontal] = value.split(/\s+/)
    const length = (part: string, size: number) => Math.max(0, (parseFloat(part) || 0) * (part.endsWith('%') ? size / 100 : 1))
    return [length(horizontal, width), length(vertical, height)]
  }
  function borderPath(target: Element, style: CSSStyleDeclaration, x: number, y: number, width: number, height: number) {
    const element = target as HTMLElement
    const baseWidth = element.offsetWidth || width
    const baseHeight = element.offsetHeight || height
    const radii = [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius]
      .map(value => radius(value, baseWidth, baseHeight).map((n, axis) => n * (axis ? height / baseHeight : width / baseWidth)) as [number, number])
    const factor = Math.min(1, width / (radii[0][0] + radii[1][0] || 1), width / (radii[3][0] + radii[2][0] || 1), height / (radii[0][1] + radii[3][1] || 1), height / (radii[1][1] + radii[2][1] || 1))
    const inset = Math.min(1, width / 4, height / 4)
    const [[tlx, tly], [trx, try_], [brx, bry], [blx, bly]] = radii.map(([rx, ry]) => [Math.max(0, rx * factor - inset), Math.max(0, ry * factor - inset)])
    const left = x + inset, top = y + inset, right = x + width - inset, bottom = y + height - inset
    return `M${left + tlx},${top}H${right - trx}A${trx},${try_} 0 0 1 ${right},${top + try_}V${bottom - bry}A${brx},${bry} 0 0 1 ${right - brx},${bottom}H${left + blx}A${blx},${bly} 0 0 1 ${left},${bottom - bly}V${top + tly}A${tlx},${tly} 0 0 1 ${left + tlx},${top}Z`
  }
  function draw(): boolean {
    let focused = doc.activeElement
    while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement
    if (!focused || focused === doc.body || focused === doc.documentElement || !focused.isConnected
      || focused.matches(':disabled,[disabled],[aria-disabled="true"],[data-disabled]') || focused.closest('[inert]')) {
      hide()
      return false
    }
    const target = focusOwner(focused)
    const style = win.getComputedStyle(target)
    const rect = target.getBoundingClientRect()
    if (!target.isConnected || style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0 || rect.width <= 0 || rect.height <= 0) {
      hide()
      return true
    }
    const viewport = win.visualViewport
    let left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0
    let right = left + (viewport?.width ?? win.innerWidth), bottom = top + (viewport?.height ?? win.innerHeight)
    // Rectangular intersection respects independent horizontal/vertical clipping.
    for (let ancestor = target.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const parentStyle = win.getComputedStyle(ancestor)
      if (parentStyle.visibility === 'hidden' || Number(parentStyle.opacity) === 0) { hide(); return true }
      const paintClip = /\b(paint|strict|content)\b/.test(parentStyle.contain)
      const clipX = paintClip || /^(auto|scroll|hidden|clip)$/.test(parentStyle.overflowX)
      const clipY = paintClip || /^(auto|scroll|hidden|clip)$/.test(parentStyle.overflowY)
      if (!clipX && !clipY) continue
      const box = ancestor.getBoundingClientRect()
      const element = ancestor as HTMLElement
      const sx = element.offsetWidth ? box.width / element.offsetWidth : 1
      const sy = element.offsetHeight ? box.height / element.offsetHeight : 1
      const x = box.left + (element.clientLeft || 0) * sx
      const y = box.top + (element.clientTop || 0) * sy
      if (clipX) { left = Math.max(left, x); right = Math.min(right, x + (element.clientWidth || box.width) * sx) }
      if (clipY) { top = Math.max(top, y); bottom = Math.min(bottom, y + (element.clientHeight || box.height) * sy) }
    }
    if (right <= left || bottom <= top || rect.right <= left || rect.left >= right || rect.bottom <= top || rect.top >= bottom) { hide(); return true }
    const cx = Math.max(left, Math.min(right - .5, rect.left + rect.width / 2))
    const cy = Math.max(top, Math.min(bottom - .5, rect.top + rect.height / 2))
    const hit = doc.elementFromPoint(cx, cy)
    if (hit && !target.contains(hit) && !focused.contains(hit) && !hit.contains(target)) { hide(); return true }
    const host = topLayerHost(target)
    if (svg.parentElement !== host) { host.append(svg); geometry = '' }
    svg.setAttribute('viewBox', `0 0 ${win.innerWidth} ${win.innerHeight}`)
    // Fixed descendants of transformed native top-layer hosts use that host's
    // coordinate space. Measuring the SVG origin also covers ordinary dialogs.
    const origin = svg.getBoundingClientRect()
    const sx = origin.width / win.innerWidth || 1, sy = origin.height / win.innerHeight || 1
    const x = (rect.left - origin.left) / sx, y = (rect.top - origin.top) / sy
    const path = borderPath(target, style, x, y, rect.width / sx, rect.height / sy)
    const key = `${path}|${left}|${top}|${right}|${bottom}|${origin.left}|${origin.top}|${sx}|${sy}`
    if (geometry !== key) {
      paths.forEach(node => node.setAttribute('d', path))
      setRect(clipRect, (left - origin.left) / sx, (top - origin.top) / sy, (right - left) / sx, (bottom - top) / sy)
      geometry = key
    }
    if (source !== focused || owner !== target) {
      hide()
      source = focused
      owner = target
      source.setAttribute('data-milk-focus-source', '')
      owner.setAttribute('data-milk-focus-owner', '')
    }
    svg.style.visibility = 'visible'
    return true
  }
  function tick() {
    frame = 0
    if (!disposed && !suspended && !doc.hidden && draw()) frame = win.requestAnimationFrame(tick)
  }
  function resume() {
    if (!frame && !disposed && !suspended && !doc.hidden) tick()
  }
  function listen(node: EventTarget, type: string, handler: () => void) {
    node.addEventListener(type, handler, { capture: true, passive: true })
    removers.push(() => node.removeEventListener(type, handler, true))
  }
  listen(doc, 'focusin', resume)
  // Focusout fires before activeElement settles; resolve it on the next frame.
  listen(doc, 'focusout', () => { if (!frame && !suspended) frame = win.requestAnimationFrame(tick) })
  listen(win, 'blur', () => { suspended = true; cancel() })
  listen(win, 'focus', () => { suspended = false; resume() })
  listen(doc, 'visibilitychange', () => { if (doc.hidden) cancel(); else resume() })
  listen(doc, 'scroll', resume)
  listen(win, 'resize', resume)
  if (win.visualViewport) {
    listen(win.visualViewport, 'resize', resume)
    listen(win.visualViewport, 'scroll', resume)
  }
  const dispose = () => {
    if (disposed) return
    disposed = true
    cancel()
    svg.remove()
    removers.forEach(remove => remove())
    installations.delete(doc)
  }
  installations.set(doc, dispose)
  resume()
  return dispose
}

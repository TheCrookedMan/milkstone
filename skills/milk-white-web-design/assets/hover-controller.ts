/** A brief surface ripple, independent of the control's material and press transform. */
const installations = new WeakMap<Document, () => void>()
const SVG_NS = 'http://www.w3.org/2000/svg'
const TARGET = 'button,a.pill,summary,[role="button"],[data-milk-press-target]'
const IGNORE = '[data-milk-hover-ignore],[data-milk-press-ignore],[draggable="true"],.vue-flow__node,.workflow-node,[role="slider"],input[type="range"]'
const DURATION = 1500
const EXIT = 180
let installationId = 0

/** Install once at the app entry; the disposer also supports unmount and Vite HMR. */
export function initHoverRipple(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {}
  const existing = installations.get(document)
  if (existing) return existing
  const doc = document, win = window
  const motion = win.matchMedia('(prefers-reduced-motion: reduce)')
  const hover = win.matchMedia('(any-hover: hover)')
  const forced = win.matchMedia('(forced-colors: active)')
  const removers: Array<() => void> = []
  const svg = doc.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('class', 'milk-hover-overlay')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  const defs = doc.createElementNS(SVG_NS, 'defs')
  const serial = ++installationId
  const viewportClip = doc.createElementNS(SVG_NS, 'clipPath')
  viewportClip.setAttribute('id', `milk-hover-viewport-${serial}`)
  viewportClip.setAttribute('clipPathUnits', 'userSpaceOnUse')
  const clipRect = doc.createElementNS(SVG_NS, 'rect')
  viewportClip.append(clipRect)
  const surfaceClip = doc.createElementNS(SVG_NS, 'clipPath')
  surfaceClip.setAttribute('id', `milk-hover-surface-${serial}`)
  surfaceClip.setAttribute('clipPathUnits', 'userSpaceOnUse')
  const clipPath = doc.createElementNS(SVG_NS, 'path')
  surfaceClip.append(clipPath)
  defs.append(viewportClip, surfaceClip)
  const viewportGroup = doc.createElementNS(SVG_NS, 'g')
  viewportGroup.setAttribute('clip-path', `url(#milk-hover-viewport-${serial})`)
  const surfaceGroup = doc.createElementNS(SVG_NS, 'g')
  surfaceGroup.setAttribute('clip-path', `url(#milk-hover-surface-${serial})`)
  const rings = Array.from({ length: 3 }, () => {
    const circle = doc.createElementNS(SVG_NS, 'circle')
    circle.setAttribute('class', 'milk-hover-ring')
    surfaceGroup.append(circle)
    return circle
  })
  viewportGroup.append(surfaceGroup)
  svg.append(defs, viewportGroup)
  let hovered: HTMLElement | null = null
  let ripple: { control: HTMLElement; x: number; y: number; start: number; exit: number | null } | null = null
  let frame = 0
  let disposed = false

  function allowed(control: HTMLElement) {
    return control.isConnected && !control.matches(':disabled,[disabled],[aria-disabled="true"],[data-disabled]') && !control.closest('[inert]')
  }
  function target(origin: EventTarget | null): HTMLElement | null {
    if (!(origin instanceof Element) || origin.closest(IGNORE)) return null
    const control = origin.closest<HTMLElement>(TARGET)
    if (!control || control.namespaceURI !== 'http://www.w3.org/1999/xhtml' || !allowed(control)) return null
    if (origin.closest('textarea,[contenteditable="true"],input:not([type="checkbox"]):not([type="radio"])')) return null
    return control
  }
  function reset() {
    if (frame) win.cancelAnimationFrame(frame)
    frame = 0
    ripple = null
    hovered = null
    svg.style.visibility = 'hidden'
  }
  function hostFor(control: Element): Element {
    for (let node: Element | null = control; node; node = node.parentElement) {
      if (node.matches('dialog[open]')) return node
      if (node.hasAttribute('popover')) {
        try { if (node.matches(':popover-open')) return node } catch { /* Older browsers lack native popovers. */ }
      }
    }
    return doc.body
  }
  function roundedPath(control: HTMLElement, style: CSSStyleDeclaration, x: number, y: number, width: number, height: number) {
    const baseWidth = control.offsetWidth || width, baseHeight = control.offsetHeight || height
    const radii = [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].map(value => {
      const [horizontal, vertical = horizontal] = value.split(/\s+/)
      const length = (part: string, size: number) => Math.max(0, (parseFloat(part) || 0) * (part.endsWith('%') ? size / 100 : 1))
      return [length(horizontal, baseWidth) * width / baseWidth, length(vertical, baseHeight) * height / baseHeight]
    })
    const factor = Math.min(1, width / (radii[0][0] + radii[1][0] || 1), width / (radii[3][0] + radii[2][0] || 1), height / (radii[0][1] + radii[3][1] || 1), height / (radii[1][1] + radii[2][1] || 1))
    const inset = Math.min(1.5, width / 4, height / 4)
    const [[tlx, tly], [trx, try_], [brx, bry], [blx, bly]] = radii.map(([rx, ry]) => [Math.max(0, rx * factor - inset), Math.max(0, ry * factor - inset)])
    const left = x + inset, top = y + inset, right = x + width - inset, bottom = y + height - inset
    return `M${left + tlx},${top}H${right - trx}A${trx},${try_} 0 0 1 ${right},${top + try_}V${bottom - bry}A${brx},${bry} 0 0 1 ${right - brx},${bottom}H${left + blx}A${blx},${bly} 0 0 1 ${left},${bottom - bly}V${top + tly}A${tlx},${tly} 0 0 1 ${left + tlx},${top}Z`
  }
  function draw(now: number): boolean {
    if (!ripple || !allowed(ripple.control) || motion.matches || !hover.matches || forced.matches || doc.hidden) return false
    const { control, start, exit } = ripple
    // A callback scheduled during a frame can receive that frame's slightly
    // earlier timestamp. Keep the first sample at the ripple's resting origin.
    const elapsed = Math.max(0, now - start)
    if (elapsed >= DURATION || (exit !== null && now - exit >= EXIT)) return false
    const rect = control.getBoundingClientRect(), style = win.getComputedStyle(control)
    if (rect.width <= 0 || rect.height <= 0 || style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return false
    const viewport = win.visualViewport
    let left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0
    let right = left + (viewport?.width ?? win.innerWidth), bottom = top + (viewport?.height ?? win.innerHeight)
    for (let ancestor = control.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const parentStyle = win.getComputedStyle(ancestor)
      if (parentStyle.visibility === 'hidden' || Number(parentStyle.opacity) === 0) return false
      const paintClip = /\b(paint|strict|content)\b/.test(parentStyle.contain)
      const clipX = paintClip || /^(auto|scroll|hidden|clip)$/.test(parentStyle.overflowX)
      const clipY = paintClip || /^(auto|scroll|hidden|clip)$/.test(parentStyle.overflowY)
      if (!clipX && !clipY) continue
      const box = ancestor.getBoundingClientRect(), element = ancestor as HTMLElement
      const sx = element.offsetWidth ? box.width / element.offsetWidth : 1, sy = element.offsetHeight ? box.height / element.offsetHeight : 1
      const x = box.left + (element.clientLeft || 0) * sx, y = box.top + (element.clientTop || 0) * sy
      if (clipX) { left = Math.max(left, x); right = Math.min(right, x + (element.clientWidth || box.width) * sx) }
      if (clipY) { top = Math.max(top, y); bottom = Math.min(bottom, y + (element.clientHeight || box.height) * sy) }
    }
    if (right <= left || bottom <= top || rect.right <= left || rect.left >= right || rect.bottom <= top || rect.top >= bottom) return false
    const hit = doc.elementFromPoint(Math.max(left, Math.min(right - .5, rect.left + rect.width / 2)), Math.max(top, Math.min(bottom - .5, rect.top + rect.height / 2)))
    if (hit && !control.contains(hit) && !hit.contains(control)) return false
    const host = hostFor(control)
    if (svg.parentElement !== host) host.append(svg)
    svg.setAttribute('viewBox', `0 0 ${win.innerWidth} ${win.innerHeight}`)
    const origin = svg.getBoundingClientRect()
    const sx = origin.width / win.innerWidth || 1, sy = origin.height / win.innerHeight || 1
    const x = (rect.left - origin.left) / sx, y = (rect.top - origin.top) / sy
    const width = rect.width / sx, height = rect.height / sy
    clipPath.setAttribute('d', roundedPath(control, style, x, y, width, height))
    for (const [name, value] of Object.entries({ x: (left - origin.left) / sx, y: (top - origin.top) / sy, width: (right - left) / sx, height: (bottom - top) / sy })) clipRect.setAttribute(name, String(value))
    const cx = width * ripple.x, cy = height * ripple.y
    const radius = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy))
    const exitFade = exit === null ? 1 : (1 - (now - exit) / EXIT) ** 2
    rings.forEach((ring, index) => {
      const progress = Math.max(0, Math.min(1, (elapsed - index * 120) / (DURATION - 240)))
      ring.setAttribute('cx', String(x + cx))
      ring.setAttribute('cy', String(y + cy))
      ring.setAttribute('r', String(radius * progress ** .8))
      ring.setAttribute('opacity', String(Math.sin(Math.PI * progress) ** 1.4 * .56 * exitFade))
    })
    svg.style.visibility = 'visible'
    return true
  }
  function tick(now: number) {
    frame = 0
    if (!disposed && draw(now)) frame = win.requestAnimationFrame(tick)
    else { ripple = null; svg.style.visibility = 'hidden' }
  }
  function listen<T extends Event>(node: EventTarget, type: string, handler: (event: T) => void) {
    node.addEventListener(type, handler as EventListener, { capture: true, passive: true })
    removers.push(() => node.removeEventListener(type, handler as EventListener, true))
  }
  listen<PointerEvent>(doc, 'pointerover', event => {
    if (event.pointerType === 'touch' || event.buttons || motion.matches || !hover.matches || forced.matches || doc.hidden) return
    const control = target(event.target)
    if (!control || hovered === control || target(event.relatedTarget) === control) return
    const rect = control.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    hovered = control
    ripple = { control, x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)), start: win.performance.now(), exit: null }
    if (!frame) frame = win.requestAnimationFrame(tick)
  })
  listen<PointerEvent>(doc, 'pointerout', event => {
    if (!hovered || !(event.target instanceof Element) || !hovered.contains(event.target) || target(event.relatedTarget) === hovered) return
    if (ripple && ripple.exit === null) ripple.exit = win.performance.now()
    hovered = null
  })
  listen(win, 'blur', reset)
  listen(doc, 'visibilitychange', () => { if (doc.hidden) reset() })
  listen(doc, 'pointercancel', reset)
  listen(motion, 'change', reset)
  listen(hover, 'change', reset)
  listen(forced, 'change', reset)
  const dispose = () => {
    if (disposed) return
    disposed = true
    reset()
    svg.remove()
    removers.forEach(remove => remove())
    installations.delete(doc)
  }
  installations.set(doc, dispose)
  return dispose
}

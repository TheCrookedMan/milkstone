/** Visual feedback only: native click, focus, selection and drag behavior stay in charge. */
// Complete the short compression even on a very quick tap, then let the softer
// return settle. Keep these values aligned with milk-tokens.css.
export const PRESS_FEEDBACK_TIMING = { minimumHold: 112, release: 420 } as const
const TARGET = 'button,a.pill,summary,[data-milk-press-target]'
const IGNORE = '[data-milk-press-ignore],[draggable="true"],.vue-flow__node,.workflow-node,[role="slider"],input[type="range"]'
const installations = new WeakMap<Document, () => void>()

type Press = {
  started: number
  sources: Set<string>
  releaseTimer?: ReturnType<typeof setTimeout>
  cleanTimer?: ReturnType<typeof setTimeout>
}

/** Install once at the app entry point; returned disposer also supports Vite HMR. */
export function initPressFeedback(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {}
  const existing = installations.get(document)
  if (existing) return existing
  const doc = document
  const win = window
  const motion = win.matchMedia('(prefers-reduced-motion: reduce)')
  const presses = new Map<HTMLElement, Press>()
  const removers: Array<() => void> = []

  function target(event: Event): HTMLElement | null {
    const origin = event.target
    if (!(origin instanceof Element) || origin.closest(IGNORE)) return null
    const control = origin.closest<HTMLElement>(TARGET)
    if (!control || control.namespaceURI !== 'http://www.w3.org/1999/xhtml') return null
    if (control.matches(':disabled,[disabled],[aria-disabled="true"],[data-disabled]') || control.closest('[inert]')) return null
    // Editable text never gets a mechanical press; hidden checkbox/radio labels may opt in.
    if (origin.closest('textarea,[contenteditable="true"],input:not([type="checkbox"]):not([type="radio"])')) return null
    return control
  }
  function clearTimers(press: Press) {
    clearTimeout(press.releaseTimer)
    clearTimeout(press.cleanTimer)
  }
  function clear(control: HTMLElement) {
    const press = presses.get(control)
    if (press) clearTimers(press)
    control.removeAttribute('data-milk-press')
    presses.delete(control)
  }
  function begin(control: HTMLElement, source: string) {
    let press = presses.get(control)
    if (press?.sources.has(source)) return
    if (press) clearTimers(press)
    else press = { started: 0, sources: new Set() }
    // A new down during return interrupts from the current visual position.
    press.started = performance.now()
    press.sources.add(source)
    presses.set(control, press)
    control.setAttribute('data-milk-press', 'down')
  }
  function end(control: HTMLElement, source: string, cancelled = false) {
    const press = presses.get(control)
    if (!press || !press.sources.delete(source) || press.sources.size) return
    const release = () => {
      if (presses.get(control) !== press || press.sources.size) return
      if (!control.isConnected || motion.matches) { clear(control); return }
      control.setAttribute('data-milk-press', 'release')
      press.cleanTimer = setTimeout(() => clear(control), PRESS_FEEDBACK_TIMING.release)
    }
    // Touch scrolling or a drag cancellation should start returning immediately;
    // the minimum hold is only for an intentional native activation.
    const remaining = motion.matches || cancelled ? 0 : Math.max(0, PRESS_FEEDBACK_TIMING.minimumHold - (performance.now() - press.started))
    if (remaining) press.releaseTimer = setTimeout(release, remaining)
    else release()
  }
  function endSource(source: string, cancelled = false) {
    for (const control of presses.keys()) end(control, source, cancelled)
  }
  function clearAll() {
    for (const control of presses.keys()) clear(control)
  }
  function listen<T extends Event>(node: EventTarget, type: string, handler: (event: T) => void) {
    node.addEventListener(type, handler as EventListener, { capture: true, passive: true })
    removers.push(() => node.removeEventListener(type, handler as EventListener, true))
  }

  listen<PointerEvent>(doc, 'pointerdown', event => {
    if (event.button !== 0) return
    const control = target(event)
    if (control) begin(control, `pointer:${event.pointerId}`)
  })
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    listen<PointerEvent>(win, type, event => endSource(`pointer:${event.pointerId}`, type !== 'pointerup'))
  }
  listen<KeyboardEvent>(doc, 'keydown', event => {
    if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return
    const control = target(event)
    if (control) begin(control, `key:${event.key}`)
  })
  listen<KeyboardEvent>(win, 'keyup', event => endSource(`key:${event.key}`))
  // Assistive/synthetic native activation has no pointerdown; still give it the same feedback.
  listen<MouseEvent>(doc, 'click', event => {
    const control = target(event)
    if (event.detail !== 0 || !control || presses.has(control)) return
    begin(control, 'activation')
    end(control, 'activation')
  })
  listen(win, 'blur', clearAll)
  listen(doc, 'visibilitychange', () => { if (doc.hidden) clearAll() })
  listen(motion, 'change', clearAll)
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    clearAll()
    removers.forEach(remove => remove())
    installations.delete(doc)
  }
  installations.set(doc, dispose)
  return dispose
}

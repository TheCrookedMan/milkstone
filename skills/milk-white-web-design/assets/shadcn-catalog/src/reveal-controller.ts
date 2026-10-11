/** Progressive disclosure is visual only: content remains readable without this controller. */
export const REVEAL_TIMING = { duration: 700, stagger: 80, maximumDelay: 240 } as const
const TARGET = '[data-milk-reveal],[data-milk-reveal-group] > *'
const STATE = 'data-milk-reveal-state'
const installations = new WeakMap<Document | HTMLElement, () => void>()

/** Call after mount. Mark a surface with data-milk-reveal, or its group for direct children. */
export function initRevealMotion(root?: Document | HTMLElement): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {}
  const scope = root ?? document
  const existing = installations.get(scope)
  if (existing) return existing
  // Unsupported browsers never receive a hidden state.
  if (!('IntersectionObserver' in window) || !('MutationObserver' in window)) return () => {}
  const doc = scope.ownerDocument ?? scope as Document
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (typeof motion.addEventListener !== 'function') return () => {}
  const seen = new WeakSet<HTMLElement>()
  const unsettled = new Set<HTMLElement>()

  function settle(element: HTMLElement) {
    intersection.unobserve(element)
    element.removeAttribute(STATE)
    element.style.removeProperty('--milk-reveal-delay')
    unsettled.delete(element)
  }
  function reveal(element: HTMLElement, delay = 0) {
    intersection.unobserve(element)
    if (motion.matches || doc.hidden || element.contains(doc.activeElement)) { settle(element); return }
    element.style.setProperty('--milk-reveal-delay', `${delay}ms`)
    element.setAttribute(STATE, 'entering')
  }
  const intersection = new IntersectionObserver(entries => {
    const groups = new Map<Element, number>()
    for (const entry of entries) {
      const element = entry.target as HTMLElement
      if (!entry.isIntersecting || !unsettled.has(element)) continue
      const parent = element.parentElement
      const group = parent?.hasAttribute('data-milk-reveal-group') ? parent : undefined
      const index = group ? (groups.get(group) ?? 0) : 0
      if (group) groups.set(group, index + 1)
      reveal(element, Math.min(index * REVEAL_TIMING.stagger, REVEAL_TIMING.maximumDelay))
    }
  }, { threshold: 0, rootMargin: '0px 0px -24px 0px' })

  function register(element: Element) {
    if (!(element instanceof HTMLElement) || seen.has(element) || !scope.contains(element)) return
    // One layer per surface; nesting reveals would multiply opacity and postpone its content.
    if (element.parentElement?.closest(TARGET)) return
    seen.add(element)
    if (motion.matches || doc.hidden || element.contains(doc.activeElement)) return
    unsettled.add(element)
    element.setAttribute(STATE, 'pending')
    intersection.observe(element)
  }
  function scan(node: Document | Element) {
    if (node instanceof Element && node.matches(TARGET)) register(node)
    node.querySelectorAll(TARGET).forEach(register)
  }
  const mutations = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) if (node instanceof Element) scan(node)
    }
    // Routing and filtering release references to removed surfaces, including active animations.
    if (records.some(record => record.removedNodes.length)) {
      for (const element of unsettled) if (!scope.contains(element)) settle(element)
    }
  })
  function onAnimationEnd(event: AnimationEvent) {
    if (event.animationName !== 'milk-reveal-in' || !(event.target instanceof HTMLElement)) return
    if (unsettled.has(event.target)) settle(event.target)
  }
  function onFocus(event: FocusEvent) {
    if (!(event.target instanceof Element)) return
    for (const element of unsettled) if (element.contains(event.target)) settle(element)
  }
  function revealAll() { for (const element of unsettled) settle(element) }
  function onMotionChange() { if (motion.matches) revealAll() }
  function onVisibilityChange() { if (doc.hidden) revealAll() }

  scan(scope)
  mutations.observe(scope, { childList: true, subtree: true })
  scope.addEventListener('animationend', onAnimationEnd as EventListener)
  scope.addEventListener('animationcancel', onAnimationEnd as EventListener)
  scope.addEventListener('focusin', onFocus as EventListener)
  motion.addEventListener('change', onMotionChange)
  doc.addEventListener('visibilitychange', onVisibilityChange)
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    intersection.disconnect()
    mutations.disconnect()
    revealAll()
    scope.removeEventListener('animationend', onAnimationEnd as EventListener)
    scope.removeEventListener('animationcancel', onAnimationEnd as EventListener)
    scope.removeEventListener('focusin', onFocus as EventListener)
    motion.removeEventListener('change', onMotionChange)
    doc.removeEventListener('visibilitychange', onVisibilityChange)
    installations.delete(scope)
  }
  installations.set(scope, dispose)
  return dispose
}

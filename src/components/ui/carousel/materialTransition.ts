import type { UnwrapRefCarouselApi } from "./interface"

type CarouselApi = NonNullable<UnwrapRefCarouselApi>
const properties = ["--milk-carousel-depth", "--milk-carousel-opacity", "--milk-carousel-position"]

/** Follow Fade's real opacity, including drag/reversal, rather than starting another animation clock. */
export function materialTransition() {
  let api: CarouselApi
  let motion: MediaQueryList | undefined
  let originals: { node: HTMLElement; hidden: string | null; inert: boolean; values: { value: string; priority: string }[] }[] = []

  function render() {
    const { axis, scrollSnaps, slideRegistry } = api.internalEngine()
    const selected = api.selectedScrollSnap()
    slideRegistry.forEach((slides, snap) => slides.forEach(index => {
      const node = api.slideNodes()[index]
      const opacity = motion?.matches ? Number(snap === selected) : Math.max(0, Math.min(1, Number(node.style.opacity)))
      node.style.setProperty("--milk-carousel-depth", String(opacity ** 1.6))
      node.style.setProperty("--milk-carousel-opacity", String(opacity))
      node.style.setProperty("--milk-carousel-position", `translate${axis.scroll.toUpperCase()}(${axis.direction(scrollSnaps[snap])}px)`)
      // Outgoing and invisible slides cannot receive input or duplicate announcements.
      const interactive = snap === selected && opacity > 0.5
      node.inert = originals[index].inert || !interactive
      if (interactive && originals[index].hidden === null) node.removeAttribute("aria-hidden")
      else node.setAttribute("aria-hidden", interactive ? originals[index].hidden! : "true")
    }))
  }

  function init(instance: CarouselApi) {
    api = instance
    originals = api.slideNodes().map(node => ({
      node, hidden: node.getAttribute("aria-hidden"), inert: node.inert,
      values: properties.map(property => ({ value: node.style.getPropertyValue(property), priority: node.style.getPropertyPriority(property) })),
    }))
    motion = api.rootNode().ownerDocument.defaultView?.matchMedia("(prefers-reduced-motion: reduce)")
    motion?.addEventListener("change", render)
    api.on("select", render).on("scroll", render).on("settle", render).on("slideFocus", render)
    render()
  }

  function destroy() {
    api.off("select", render).off("scroll", render).off("settle", render).off("slideFocus", render)
    motion?.removeEventListener("change", render)
    originals.forEach(({ node, hidden, inert, values }) => {
      node.inert = inert
      if (hidden === null) node.removeAttribute("aria-hidden")
      else node.setAttribute("aria-hidden", hidden)
      properties.forEach((property, index) => {
        if (values[index].value) node.style.setProperty(property, values[index].value, values[index].priority)
        else node.style.removeProperty(property)
      })
    })
    originals = []
  }

  return { name: "milk-material", options: {}, init, destroy }
}

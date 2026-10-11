import type { UnwrapRefCarouselApi as CarouselApi, CarouselEmits, CarouselProps } from "./interface"
import { createInjectionState } from "@vueuse/core"
import emblaCarouselVue from "embla-carousel-vue"
import Fade from "embla-carousel-fade"
import { usePreferredReducedMotion } from "@vueuse/core"
import { computed, onUnmounted, ref, unref, watch } from "vue"
import { materialTransition } from "./materialTransition"

const [useProvideCarousel, useInjectCarousel] = createInjectionState(
  ({
    opts,
    orientation,
    plugins,
    effect = "slide",
  }: CarouselProps, emits: CarouselEmits) => {
    const reducedMotion = usePreferredReducedMotion()
    const options = computed(() => {
      const resolved = unref(opts)
      return {
        ...resolved,
        ...(effect === "material" ? { containScroll: false as const, slidesToScroll: 1, duration: reducedMotion.value === "reduce" ? 0 : (resolved?.duration ?? 45) } : {}),
        axis: orientation === "horizontal" ? "x" as const : "y" as const,
      }
    })
    const resolvedPlugins = computed(() => effect === "material"
      ? [...(unref(plugins) ?? []).filter(plugin => plugin.name !== "fade"), Fade(), materialTransition()]
      : unref(plugins) ?? [])
    const [emblaNode, emblaApi] = emblaCarouselVue(options, resolvedPlugins)

    function scrollPrev() {
      emblaApi.value?.scrollPrev(reducedMotion.value === "reduce")
    }
    function scrollNext() {
      emblaApi.value?.scrollNext(reducedMotion.value === "reduce")
    }

    const canScrollNext = ref(false)
    const canScrollPrev = ref(false)

    function onSelect(api: CarouselApi) {
      canScrollNext.value = api?.canScrollNext() || false
      canScrollPrev.value = api?.canScrollPrev() || false
    }

    const selectedIndex = ref(0)
    const slideCount = ref(0)

    function update(api: CarouselApi) {
      onSelect(api)
      selectedIndex.value = api?.selectedScrollSnap() ?? 0
      slideCount.value = api?.scrollSnapList().length ?? 0
    }

    watch(emblaApi, (api, previous) => {
      previous?.off("reInit", update).off("select", update)
      if (!api)
        return
      update(api)
      api.on("reInit", update).on("select", update)
      emits("init-api", api)
    }, { immediate: true })
    onUnmounted(() => emblaApi.value?.off("reInit", update).off("select", update))

    return { carouselRef: emblaNode, carouselApi: emblaApi, canScrollPrev, canScrollNext, scrollPrev, scrollNext, orientation, effect, selectedIndex, slideCount }
  },
)

function useCarousel() {
  const carouselState = useInjectCarousel()

  if (!carouselState)
    throw new Error("useCarousel must be used within a <Carousel />")

  return carouselState
}

export { useCarousel, useProvideCarousel }

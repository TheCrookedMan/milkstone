<script setup lang="ts">
import type { CarouselEmits, CarouselProps, WithClassAsProps } from "./interface"
import { cn } from "@/lib/utils"
import { useProvideCarousel } from "./useCarousel"

const props = withDefaults(defineProps<CarouselProps & WithClassAsProps>(), {
  orientation: "horizontal",
  effect: "slide",
})

const emits = defineEmits<CarouselEmits>()

const { canScrollNext, canScrollPrev, carouselApi, carouselRef, orientation, scrollNext, scrollPrev, selectedIndex, slideCount } = useProvideCarousel(props, emits)

defineExpose({
  canScrollNext,
  canScrollPrev,
  carouselApi,
  carouselRef,
  orientation,
  scrollNext,
  scrollPrev,
  selectedIndex,
  slideCount,
})

function onKeyDown(event: KeyboardEvent) {
  if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"], [role="slider"]')) return
  const prevKey = props.orientation === "vertical" ? "ArrowUp" : "ArrowLeft"
  const nextKey = props.orientation === "vertical" ? "ArrowDown" : "ArrowRight"

  if (event.key === prevKey) {
    event.preventDefault()
    scrollPrev()

    return
  }

  if (event.key === nextKey) {
    event.preventDefault()
    scrollNext()
  }
}
</script>

<template>
  <div
    data-slot="carousel"
    :data-effect="effect"
    :data-orientation="orientation"
    :class="cn('relative', props.class)"
    role="region"
    aria-roledescription="carousel"
    tabindex="0"
    @keydown="onKeyDown"
  >
    <slot :can-scroll-next :can-scroll-prev :carousel-api :carousel-ref :orientation :scroll-next :scroll-prev :selected-index :slide-count />
  </div>
</template>

<style>
[data-slot=carousel][data-effect=material] [data-slot=carousel-content] { touch-action:pan-y pinch-zoom; }
[data-slot=carousel][data-effect=material][data-orientation=vertical] [data-slot=carousel-content] { touch-action:pan-x pinch-zoom; }
[data-slot=carousel][data-effect=material] [data-slot=carousel-material] {
  --milk-carousel-blur:calc((1 - var(--milk-carousel-depth, 1)) * 5px);
  filter:blur(var(--milk-carousel-blur));
  transform:translateY(calc((1 - var(--milk-carousel-depth, 1)) * 4px)) scale(calc(.985 + var(--milk-carousel-depth, 1) * .015));
  transform-origin:center;
}
[data-slot=carousel][data-effect=material] :is([data-slot=card], [data-carousel-surface], [data-carousel-relief]) {
  animation:milk-carousel-relief 1s linear both paused;
  animation-delay:calc(var(--milk-carousel-depth, 1) * -1s);
}
[data-slot=carousel][data-effect=material] [data-carousel-relief=object] { --milk-carousel-relief-shadow:var(--milk-shadow); }
@keyframes milk-carousel-relief {
  from { box-shadow:0 0 0 transparent; }
  to { box-shadow:var(--milk-carousel-relief-shadow, var(--milk-card-shadow)); }
}
@media (prefers-reduced-motion:reduce) {
  [data-slot=carousel][data-effect=material] [data-slot=carousel-item] {
    opacity:var(--milk-carousel-opacity, 1)!important;
    transform:var(--milk-carousel-position)!important;
  }
  [data-slot=carousel][data-effect=material] [data-slot=carousel-material] { filter:none; transform:none; }
  [data-slot=carousel][data-effect=material] :is([data-slot=card], [data-carousel-surface], [data-carousel-relief]) { animation:none; }
}
</style>

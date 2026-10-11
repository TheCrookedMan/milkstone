import type { Component, Ref } from "vue"
import { createContext } from "reka-ui"

export { default as ChartContainer } from "./ChartContainer.vue"
export { default as ChartLegendContent } from "./ChartLegendContent.vue"
export { default as ChartTooltipContent } from "./ChartTooltipContent.vue"
export { componentToString } from "./utils"

// Prefer semantic palette variables. Milk may override the light series palette;
// existing light/dark theme pairs remain valid.
// Format: { THEME_NAME: CSS_SELECTOR }
export const THEMES = { light: "", dark: ":root[data-theme=dark]", milk: ":root[data-theme=milk]" } as const

export type ChartConfig = {
  [k in string]: {
    label?: string | Component
    icon?: string | Component
  } & (
    | { color?: string, theme?: never }
    | { color?: never, theme: Record<"light" | "dark", string> & Partial<Record<"milk", string>> }
  )
}

interface ChartContextProps {
  id: string
  config: Ref<ChartConfig>
}

export const [useChart, provideChartContext] = createContext<ChartContextProps>("Chart")

export { VisCrosshair as ChartCrosshair, VisTooltip as ChartTooltip } from "@unovis/vue"

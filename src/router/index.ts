import { nextTick } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import LandingPage from '../pages/LandingPage.vue'
import GuidePage from '../pages/GuidePage.vue'
export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [{ path: '/', component: LandingPage }, { path: '/guide', component: GuidePage }, { path: '/:pathMatch(.*)*', redirect: '/' }],
  async scrollBehavior(to, from, saved) {
    if (saved) return saved
    await nextTick()
    if (to.hash) return { el: to.hash, top: 96, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }
    return { top: 0 }
  }
})

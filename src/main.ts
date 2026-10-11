import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource-variable/noto-sans-sc'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import App from './app/App.vue'
import { router } from './router'
import './styles/main.css'
import { initTheme } from './theme-controller'
import { initPressFeedback } from '../skills/milk-white-web-design/assets/press-controller'
import { initRevealMotion } from '../skills/milk-white-web-design/assets/reveal-controller'
initTheme()
const disposePressFeedback = initPressFeedback()
import.meta.hot?.dispose(disposePressFeedback)
createApp(App).use(createPinia()).use(router).mount('#app')
const disposeRevealMotion = initRevealMotion(document.getElementById('app')!)
import.meta.hot?.dispose(disposeRevealMotion)

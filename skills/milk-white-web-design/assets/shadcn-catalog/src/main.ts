import { createApp } from 'vue'
import '@fontsource-variable/noto-sans-sc'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import App from './App.vue'
import { initTheme } from './theme-controller'
import { initPressFeedback } from './press-controller'
import { initRevealMotion } from './reveal-controller'
import { initFocusBorder } from './focus-controller'
import { initHoverRipple } from './hover-controller'
import './style.css'
initTheme()
const disposePressFeedback = initPressFeedback()
import.meta.hot?.dispose(disposePressFeedback)
const disposeHoverRipple = initHoverRipple()
import.meta.hot?.dispose(disposeHoverRipple)
const disposeFocusBorder = initFocusBorder()
import.meta.hot?.dispose(disposeFocusBorder)
createApp(App).mount('#app')
const disposeRevealMotion = initRevealMotion(document.getElementById('app')!)
import.meta.hot?.dispose(disposeRevealMotion)

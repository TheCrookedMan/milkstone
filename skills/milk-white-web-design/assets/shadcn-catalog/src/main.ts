import { createApp } from 'vue'
import '@fontsource-variable/noto-sans-sc'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import App from './App.vue'
import { initTheme } from './theme-controller'
import { initPressFeedback } from './press-controller'
import './style.css'
initTheme()
const disposePressFeedback = initPressFeedback()
import.meta.hot?.dispose(disposePressFeedback)
createApp(App).mount('#app')

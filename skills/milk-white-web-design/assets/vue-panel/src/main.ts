import { createApp } from 'vue'
import App from './App.vue'
import { initTheme } from '../../theme-controller'
import '../../theme-colors.css'
import '../../milk-tokens.css'

import { initPressFeedback } from '../../press-controller'
initTheme()
const disposePressFeedback = initPressFeedback()
import.meta.hot?.dispose(disposePressFeedback)
createApp(App).mount('#app')

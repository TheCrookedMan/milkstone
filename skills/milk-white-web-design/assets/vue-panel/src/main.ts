import { createApp } from 'vue'
import App from './App.vue'
import { initTheme } from '../../theme-controller'
import '../../theme-colors.css'
import '../../milk-tokens.css'
import '../../milk-focus.css'

import { initPressFeedback } from '../../press-controller'
import { initFocusBorder } from '../../focus-controller'
initTheme()
const disposePressFeedback = initPressFeedback()
import.meta.hot?.dispose(disposePressFeedback)
const disposeFocusBorder = initFocusBorder()
import.meta.hot?.dispose(disposeFocusBorder)
createApp(App).mount('#app')

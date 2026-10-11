import { createApp } from 'vue'
import App from './App.vue'
import { initTheme } from '../../theme-controller'
import '../../theme-colors.css'
import '../../milk-tokens.css'
import '../../milk-focus.css'
import '../../milk-hover.css'

import { initPressFeedback } from '../../press-controller'
import { initFocusBorder } from '../../focus-controller'
import { initHoverRipple } from '../../hover-controller'
initTheme()
const disposePressFeedback = initPressFeedback()
import.meta.hot?.dispose(disposePressFeedback)
const disposeHoverRipple = initHoverRipple()
import.meta.hot?.dispose(disposeHoverRipple)
const disposeFocusBorder = initFocusBorder()
import.meta.hot?.dispose(disposeFocusBorder)
createApp(App).mount('#app')

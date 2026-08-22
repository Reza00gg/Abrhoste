import { createApp } from 'vue'
import VWave from 'v-wave'

import './style.css'
import App from './App.vue'
import router from './router'

createApp(App)
  .use(router)
  .use(VWave, {
    // ripple stays while the finger is held down, dissolves on release
    color: 'currentColor',
    initialOpacity: 0.16,
    finalOpacity: 0.08,
    duration: 0.45,
    dissolveDuration: 0.22,
    waitForRelease: true,
    easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
    // small delay so scrolling never leaves a stray ripple behind
    cancellationPeriod: 70,
    respectPrefersReducedMotion: true,
  })
  .mount('#app')

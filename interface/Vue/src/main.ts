import "./style.css";

import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import { useAuthStore } from './stores/AuthStore'
import router from './router/index'
const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Global watcher reacting to auth changes immediately
const authStore = useAuthStore()
authStore.$subscribe(
  (_mutation, state: any) => {
    const isAuth = state.isAuthenticated as boolean
    const current = router.currentRoute.value?.name as string | undefined
    if (isAuth && current !== 'Home') {
      router.replace({ name: 'Home' })
    } else if (!isAuth && current !== 'Login') {
      router.replace({ name: 'Login' })
    }
  },
  { detached: true }
)

app.mount('#app')
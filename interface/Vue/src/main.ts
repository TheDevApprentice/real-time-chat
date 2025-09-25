import "./style.css";
import { createApp, nextTick } from 'vue'
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
  async (_mutation, state: any) => {
    const isAuth = state.isAuthenticated as boolean
    const current = router.currentRoute.value?.name as string | undefined
    if (isAuth && current !== 'Home') {
      await nextTick();
      setTimeout(() => {
        router.replace({ name: 'Home' })
      }, 150);
    } else if (!isAuth && current !== 'Login') {
      await nextTick();
      setTimeout(() => {
        router.replace({ name: 'Login' })
      }, 150);
    }
  },
  { detached: true }
)

app.mount('#app')

console.log("Env variable");
console.log("Node Environment: ", import.meta.env.NODE_ENV);
console.log("API Base URL: ", import.meta.env.VITE_API_BASE_URL);
console.log("WebSocket URL: ", import.meta.env.VITE_WEBSOCKET_URL);
console.log("WebSocket Reconnect Interval: ", import.meta.env.VITE_WEBSOCKET_RECONNECT_INTERVAL);
console.log("Enable Debug Mode: ", import.meta.env.VITE_ENABLE_DEBUG_MODE);


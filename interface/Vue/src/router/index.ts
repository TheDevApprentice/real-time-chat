import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/AuthStore';
import { storeToRefs } from 'pinia';
import { nextTick } from 'vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/',
    redirect: (to) => {
        if (to.meta.requiresAuth) {
            return { name: 'Home' };
        } else {
            return { name: 'Login' };
        }
    }
  },
  {
    path: '/:catchAll(.*)',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard pour la redirection automatique
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  // Si le store n'est pas initialisé (ex: SSR), attendre un tick
  await nextTick();
  const { isAuthenticated } = storeToRefs(authStore);
  // Si sur la racine, rediriger selon l'état d'auth
  if (to.path === '/') {
    if (isAuthenticated.value) {
      next({ name: 'Home' });
    } else {
      next({ name: 'Login' });
    }
    return;
  }
  // Si la route nécessite l'auth et que l'user n'est pas connecté
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ name: 'Login' });
    return;
  }
  // Si la route est pour guest et que l'user est connecté
  if (to.meta.guest && isAuthenticated.value) {
    next({ name: 'Home' });
    return;
  }
  next();
});

export default router;

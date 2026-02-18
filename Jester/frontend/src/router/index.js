import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'login',
            component: () => import('../views/LoginView.vue')
        },
        {
            path: '/dashboard',
            name: 'dashboard',
            component: () => import('../views/DashboardView.vue'),
            // Simple auth check: if no user_id param, maybe redirect? 
            // For now, we rely on the logic inside the view.
        },
        {
            path: '/create',
            name: 'create',
            component: () => import('../views/CreateJesterView.vue')
        },
        {
            path: '/browse',
            name: 'browse',
            component: () => import('../views/BrowseJestersView.vue')
        }
    ]
})

export default router

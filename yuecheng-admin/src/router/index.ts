import { createMemoryHistory, createRouter, createWebHashHistory } from 'vue-router'
import AdminLayout from '../layouts/AdminLayout.vue'
import MerchantReviewPage from '../views/review/MerchantReviewPage.vue'
import IncidentPage from '../views/regulation/IncidentPage.vue'
import DictionaryPage from '../views/config/DictionaryPage.vue'

export const adminRoutes = [
  {
    path: '/review/merchants',
    name: 'merchant-review',
    title: '商家审核',
    component: MerchantReviewPage
  },
  {
    path: '/regulation/incidents',
    name: 'incident-regulation',
    title: '异常监管',
    component: IncidentPage
  },
  {
    path: '/config/dictionaries',
    name: 'dictionary-config',
    title: '字典配置',
    component: DictionaryPage
  }
]

const createAdminHistory = () => {
  if (typeof window === 'undefined' || typeof location === 'undefined') {
    return createMemoryHistory()
  }

  return createWebHashHistory()
}

export const router = createRouter({
  history: createAdminHistory(),
  routes: [
    {
      path: '/',
      component: AdminLayout,
      redirect: '/review/merchants',
      children: adminRoutes.map((route) => ({
        path: route.path.replace(/^\//, ''),
        name: route.name,
        component: route.component,
        meta: {
          title: route.title
        }
      }))
    }
  ]
})

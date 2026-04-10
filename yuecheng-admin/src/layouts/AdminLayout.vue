<template>
  <div class="layout-shell">
    <aside class="sidebar">
      <h1>悦程后台</h1>
      <nav>
        <RouterLink
          v-for="route in adminRoutes"
          :key="route.name"
          class="nav-item"
          :class="{ active: activeRoute === route.name }"
          :to="route.path"
        >
          {{ route.title }}
        </RouterLink>
      </nav>
    </aside>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { adminRoutes } from '../router'

const route = useRoute()
const activeRoute = computed(() => (route.name as string) || adminRoutes[0]?.name || 'merchant-review')
</script>

<style scoped>
.layout-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 220px 1fr;
  background: #f5f7fb;
}

.sidebar {
  background: #1f2937;
  color: #fff;
  padding: 24px 18px;
}

.sidebar h1 {
  margin: 0 0 24px;
  font-size: 20px;
}

.nav-item {
  display: block;
  color: #d1d5db;
  text-decoration: none;
  padding: 10px 12px;
  border-radius: 10px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.04);
}

.nav-item.active {
  background: #fff;
  color: #111827;
  font-weight: 600;
}

.content {
  padding: 24px;
}
</style>

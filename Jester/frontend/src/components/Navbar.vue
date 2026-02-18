<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <nav class="navbar">
    <div class="nav-content">
      <router-link to="/" class="brand">Jester</router-link>
      <div class="nav-links">
        <router-link to="/" class="nav-link">Home</router-link>
        <router-link to="/browse" class="nav-link">browse</router-link>
        <a href="https://fluxer-bots.github.io/Jester/" target="_blank" class="nav-link">docs</a>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  height: 60px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid #202225;
  display: flex;
  justify-content: center;
  width: 100%;
  flex-shrink: 0;
}

.nav-content {
  width: 100%;
  max-width: 1200px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.brand {
  font-size: 1.2rem;
  font-weight: 800;
  color: #fff;
  text-decoration: none;
  letter-spacing: 0.5px;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-link {
  color: var(--header-secondary);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  transition: color 0.2s;
  text-transform: lowercase;
}

.nav-link:hover {
  color: #fff;
}

.nav-link.router-link-active {
  color: #fff;
}
</style>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const jesters = ref([])
const loading = ref(true)

const fetchAllJesters = async () => {
    loading.value = true
    try {
        const response = await axios.get('/api/jesters/all')
        jesters.value = response.data
    } catch (error) {
        console.error("Failed to load public directory:", error)
    } finally {
        loading.value = false
    }
}

const getAvatar = (jester) => {
    if (jester.discord_avatar_url) return jester.discord_avatar_url
    if (jester.local_avatar_url) return jester.local_avatar_url
    if (jester.avatar_url) return jester.avatar_url
    return null
}

onMounted(() => {
    fetchAllJesters()
})
</script>

<template>
  <div class="browse-container">
    <div class="header-group">
        <h1>Jester Browser</h1>
        <h2>All registered Jesters in the database</h2>
    </div>

    <div v-if="loading" class="loading">
        Loading public directory...
    </div>

    <div v-else class="grid">
        <div v-for="jester in jesters" :key="jester.id" class="card">
            <div class="card-header">
                <strong>{{ jester.name }}</strong>
            </div>
            <div class="card-body">
                <img v-if="getAvatar(jester)" :src="getAvatar(jester)" :alt="jester.name" class="avatar">
                <div v-else class="avatar placeholder">?</div>

                <div class="details">
                    <p>Prefix: <code>{{ jester.prefix }}</code></p>
                    <small>User ID: {{ jester.user_id }}</small>
                </div>
            </div>
            <div v-if="jester.discord_avatar_url" class="card-footer">
                <small>Starting from CDN</small>
            </div>
        </div>
        
        <p v-if="jesters.length === 0">No jesters found.</p>
    </div>
  </div>
</template>

<style scoped>
.browse-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
    color: var(--text-normal);
}

.header-group {
    margin-bottom: 2rem;
    text-align: center;
}

h1 { font-size: 2.5rem; color: #fff; margin-bottom: 0.5rem; }
h2 { font-size: 1.2rem; color: var(--text-muted); font-weight: 400; }

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}

.card {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 20px;
    border: 1px solid #2b2d31;
    display: flex;
    flex-direction: column;
}

.card-header {
    margin-bottom: 1rem;
    font-size: 1.1rem;
    color: #fff;
}

.card-body {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex: 1;
}

.avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--bg-tertiary);
    flex-shrink: 0;
}

.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 1.5rem;
}

.details p {
    margin-bottom: 0.25rem;
}

code {
    background: var(--bg-tertiary);
    padding: 2px 4px;
    border-radius: 4px;
    font-family: monospace;
}

small { color: var(--text-muted); }

.card-footer {
    margin-top: 1rem;
    border-top: 1px solid #3f4147;
    padding-top: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-muted);
}

.loading {
    text-align: center;
    font-size: 1.2rem;
    color: var(--text-muted);
    margin-top: 3rem;
}
</style>

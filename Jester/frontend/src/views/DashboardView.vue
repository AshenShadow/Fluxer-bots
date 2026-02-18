<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const userId = ref(route.query.user_id || '')
const jesters = ref([])
const selectedJester = ref(null)
const loading = ref(true)

const fetchJesters = async () => {
    if (!userId.value) return
    loading.value = true
    try {
        const response = await axios.get(`/api/jesters/user/${userId.value}`)
        jesters.value = response.data
    } catch (error) {
        console.error("Failed to fetch jesters:", error)
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

const selectJester = (jester) => {
    selectedJester.value = jester
}

const deleteJester = async (jester) => {
    if (!confirm(`Are you sure you want to delete "${jester.name}"?`)) return
    
    try {
        await axios.delete(`/api/jesters/${jester.id}`)
        // Remove from list
        jesters.value = jesters.value.filter(j => j.id !== jester.id)
        if (selectedJester.value && selectedJester.value.id === jester.id) {
            selectedJester.value = null
        }
    } catch (error) {
        console.error("Failed to delete jester:", error)
        alert("Failed to delete jester.")
    }
}

onMounted(() => {
    fetchJesters()
})
</script>

<template>
  <div class="dashboard-layout">
    <!-- Sidebar -->
    <div class="sidebar">
        <div class="sidebar-header">
            <span>Your Jesters</span>
            <div class="sidebar-actions">
                <router-link :to="{ name: 'create', query: { user_id: userId } }" class="action-btn" title="Create New">+</router-link>
                <!-- Maybe a settings/more menu later, for now just create is fine -->
            </div>
        </div>
        
        <div class="list-container">
            <div v-if="loading" class="loading-state">Loading...</div>
            
            <div v-else-if="jesters.length === 0" class="empty-list-state">
                No Jesters found.<br>
                <router-link :to="{ name: 'create', query: { user_id: userId } }" class="link">Create one</router-link>
            </div>

            <div v-else v-for="jester in jesters" 
                 :key="jester.id" 
                 class="list-item" 
                 :class="{ active: selectedJester && selectedJester.id === jester.id }"
                 @click="selectJester(jester)">
                
                <span class="caret">▶</span>
                
                <img v-if="getAvatar(jester)" :src="getAvatar(jester)" class="avatar-small">
                <div v-else class="avatar-small placeholder">?</div>
                
                <span class="name-small">{{ jester.name }}</span>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="main-panel">
        
        <!-- Empty State -->
        <div v-if="!selectedJester" class="empty-state">
            <div class="box-icon"></div>
            <h3>No jesters selected!</h3>
        </div>

        <!-- Detail View -->
        <div v-else class="detail-view">
            <div class="detail-header">
                <img v-if="getAvatar(selectedJester)" :src="getAvatar(selectedJester)" class="avatar-large">
                <div v-else class="avatar-large placeholder-large">?</div>

                <div class="info-group">
                    <div class="label">Name</div>
                    <div class="name-large">{{ selectedJester.name }}</div>
                    
                    <div class="label mt-4">Prefix</div>
                    <div class="field">{{ selectedJester.prefix }}:text</div>
                </div>

                <div class="header-actions">
                    <button @click="deleteJester(selectedJester)" class="btn-danger" title="Delete Jester">
                        🗑️
                    </button>
                </div>
            </div>
            
            <div class="tabs-container">
                 <div class="tabs">
                     <span class="tab active">Info</span>
                     <span class="tab">Avatar</span>
                     <span class="tab">Settings</span>
                 </div>
                 
                 <div class="tab-content">
                     <em>More configuration options pending implementation...</em>
                 </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-layout {
    display: flex;
    width: 100%;
    height: 100%;
}

.sidebar {
    width: 300px;
    background-color: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    user-select: none;
}

.sidebar-header {
    height: 48px;
    background-color: var(--tb-blue);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    color: #fff;
    font-weight: 600;
    font-size: 14px;
    box-shadow: 0 1px 0 rgba(0,0,0,0.2);
}

.sidebar-actions {
    display: flex;
    gap: 8px;
}

.action-btn {
    cursor: pointer;
    opacity: 0.8;
    font-size: 18px;
    line-height: 1;
    color: white;
    text-decoration: none;
}
.action-btn:hover { opacity: 1; }

.list-container {
    flex: 1;
    overflow-y: auto;
    padding-top: 8px;
}

.list-item {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    cursor: pointer;
    color: var(--interactive-normal);
}

.list-item:hover {
    background-color: rgba(79,84,92,0.16);
    color: var(--interactive-hover);
}

.list-item.active {
    background-color: rgba(79,84,92,0.32);
    color: #fff;
}

.caret {
    margin-right: 8px;
    font-size: 10px;
    color: var(--text-muted);
}

.avatar-small {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    margin-right: 10px;
    background-color: var(--bg-primary);
    object-fit: cover;
}

.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #fff;
}

.name-small {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.main-panel {
    flex: 1;
    background-color: var(--bg-primary);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
}

.empty-state {
    text-align: center;
    opacity: 0.5;
}

.box-icon {
    width: 120px;
    height: 120px;
    margin-bottom: 20px;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dcddde'%3E%3Cpath d='M20 7H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM4 9h16v10H4V9z'/%3E%3Cpath d='M4 9h16v2H4z' opacity='.3'/%3E%3C/svg%3E") no-repeat center;
    background-size: contain;
    display: inline-block;
    filter: grayscale(100%);
}

.detail-view {
    width: 100%;
    height: 100%;
    padding: 40px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: 800px;
}

.detail-header {
    display: flex;
    width: 100%;
    margin-bottom: 30px;
    align-items: flex-start;
}

.avatar-large {
    width: 128px;
    height: 128px;
    min-width: 128px;
    min-height: 128px;
    border-radius: 50%;
    object-fit: cover;
    background-color: var(--bg-secondary);
    margin-right: 24px;
    border: 4px solid var(--bg-secondary);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.placeholder-large {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    color: var(--text-muted);
}

.info-group {
    flex: 1;
}

.name-large {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
}

.field {
    background-color: var(--bg-secondary);
    border: 1px solid var(--bg-tertiary);
    border-radius: 4px;
    padding: 10px;
    color: var(--text-normal);
    font-family: 'Consolas', monospace;
    margin-bottom: 16px;
    display: inline-block;
}

.label {
    font-size: 12px;
    text-transform: uppercase;
    color: var(--interactive-normal);
    margin-bottom: 4px;
    font-weight: 700;
}

.mt-4 { margin-top: 16px; }

.header-actions {
    margin-left: 20px;
}

.btn-danger {
    background: transparent;
    border: 1px solid var(--mod-warning);
    color: var(--mod-warning);
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1.2rem;
    transition: all 0.2s;
}

.btn-danger:hover {
    background: var(--mod-warning);
    color: #fff;
}

.tabs-container {
    width: 100%;
    margin-top: 20px; 
    border-top: 1px solid #4f545c; 
    padding-top: 20px;
}

.tabs {
    display: flex;
    gap: 20px;
    color: var(--interactive-normal);
    border-bottom: 1px solid var(--bg-tertiary);
    padding-bottom: 10px;
    margin-bottom: 20px;
}

.tab {
    cursor: pointer;
}

.tab.active {
    color: #fff;
    border-bottom: 2px solid #fff;
    padding-bottom: 10px;
    margin-bottom: -12px;
}

.empty-list-state {
    padding: 16px;
    text-align: center;
    color: var(--text-muted);
    font-size: 12px;
}

.link { color: #00b0f4; text-decoration: none; }
.loading-state { padding: 16px; text-align: center; color: var(--text-muted); }
</style>

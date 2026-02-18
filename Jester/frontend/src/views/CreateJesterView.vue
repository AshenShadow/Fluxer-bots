<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

const userId = ref(route.query.user_id || '')
const name = ref('')
const prefix = ref('')
const file = ref(null)
const previewUrl = ref(null)
const submitting = ref(false)

const sanitizePrefix = () => {
    prefix.value = prefix.value.replace(/\s+/g, '')
}

const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0]
    if (selectedFile) {
        file.value = selectedFile
        const reader = new FileReader()
        reader.onload = (e) => {
            previewUrl.value = e.target.result
        }
        reader.readAsDataURL(selectedFile)
    } else {
        file.value = null
        previewUrl.value = null
    }
}

const isValid = computed(() => {
    return name.value && prefix.value && file.value
})

const handleSubmit = async () => {
    if (!isValid.value || submitting.value) return

    submitting.value = true
    const formData = new FormData()
    formData.append('name', name.value)
    formData.append('prefix', prefix.value)
    formData.append('user_id', userId.value)
    formData.append('avatar', file.value)

    try {
        await axios.post('/api/jesters/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        // Redirect back to dashboard
        router.push({ name: 'dashboard', query: { user_id: userId.value } })
    } catch (error) {
        console.error("Failed to create jester:", error)
        alert("Failed to create Jester. Please try again.")
    } finally {
        submitting.value = false
    }
}
</script>

<template>
  <div class="create-container">
    <div class="page-header">
        <h1>Create a New Jester</h1>
        <router-link :to="{ name: 'dashboard', query: { user_id: userId } }" class="btn-outline">Cancel</router-link>
    </div>

    <div class="create-card">
        <form @submit.prevent="handleSubmit">
            <div class="form-group">
                <label for="name">Jester Name</label>
                <input type="text" v-model="name" id="name" placeholder="e.g. My Awesome Character" required>
                <span class="form-hint">The name displayed when the bot proxies your message.</span>
            </div>

            <div class="form-group">
                <label for="prefix">Trigger Prefix</label>
                <input type="text" v-model="prefix" @input="sanitizePrefix" id="prefix" placeholder="e.g. mychar" required>
                <span class="form-hint">
                    Type <code>{{ prefix || 'prefix' }}: your message</code> to proxy.
                </span>
            </div>

            <div class="form-group">
                <label for="avatar">Avatar</label>
                <div class="preview-avatar" :class="{ hasImage: previewUrl }">
                    <img v-if="previewUrl" :src="previewUrl" alt="Preview">
                    <span v-else class="placeholder-icon">?</span>
                </div>
                <input type="file" @change="handleFileUpload" id="avatar" accept="image/*" required>
                <span class="form-hint">Upload an image to set as the profile picture.</span>
            </div>

            <button type="submit" class="btn-primary" :disabled="!isValid || submitting">
                {{ submitting ? 'Creating...' : 'Create Jester' }}
            </button>
        </form>
    </div>
  </div>
</template>

<style scoped>
.create-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 20px;
    color: var(--text-normal);
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.page-header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #fff;
}

.create-card {
    background: var(--bg-secondary);
    padding: 2.5rem;
    border-radius: 8px;
    border: 1px solid #2b2d31;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.form-group {
    margin-bottom: 2rem;
}

label {
    margin-bottom: 0.5rem;
    display: block;
    font-weight: 600;
}

input[type="text"] {
    width: 100%;
    padding: 10px;
    background-color: var(--bg-tertiary);
    border: 1px solid #202225;
    border-radius: 4px;
    color: #fff;
    font-size: 1rem;
}

.form-hint {
    display: block;
    color: var(--text-muted);
    font-size: 0.85rem;
    margin-top: 0.5rem;
}

.preview-avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background-color: var(--bg-tertiary);
    border: 2px dashed #2b2d31;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    overflow: hidden;
}

.preview-avatar.hasImage {
    border: 2px solid var(--accent-primary);
    border-style: solid;
}

.preview-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.placeholder-icon {
    font-size: 2rem;
    color: #444;
}

.btn-primary {
    width: 100%;
    margin-top: 1rem;
    background-color: var(--accent-primary);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
}

.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-outline {
    border: 1px solid var(--text-muted);
    color: var(--text-normal);
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 4px;
    transition: all 0.2s;
}

.btn-outline:hover {
    border-color: #fff;
    color: #fff;
}
</style>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userId = ref('')

const isValid = computed(() => userId.value.length > 5)

const submitForm = () => {
  if (isValid.value) {
    // Navigate to dashboard with query param
    router.push({ name: 'dashboard', query: { user_id: userId.value } })
  }
}
</script>

<template>
  <div class="hero-container">
    <div class="hero-card">
      <h1 class="hero-title">Welcome to Jester</h1>
      <p class="hero-subtitle">Manage your roleplay proxies with a modern, intuitive dashboard.</p>

      <form @submit.prevent="submitForm" class="login-form">
        <div class="form-group">
          <label for="user_id">Fluxer User ID</label>
          <input 
            type="text" 
            v-model="userId" 
            id="user_id" 
            placeholder="e.g. 1473229..." 
            required 
            autofocus
          >
          <small class="hint">
            Use <code>j!id</code> in chat to find your ID.
          </small>
        </div>

        <button type="submit" class="btn-primary" :disabled="!isValid">
          Enter Dashboard
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.hero-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.hero-card {
  background: var(--bg-secondary);
  padding: 2.5rem;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  width: 100%;
  max-width: 480px;
  border: 1px solid #2b2d31;
  text-align: center;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #fff 0%, #a3a6aa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: var(--text-muted);
  margin-bottom: 2rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  text-align: left;
}

.form-group label {
  margin-bottom: 0.5rem;
  display: block;
  font-weight: 600;
  color: var(--text-normal);
}

input {
  width: 100%;
  padding: 10px;
  background-color: var(--bg-tertiary);
  border: 1px solid #202225;
  border-radius: 4px;
  color: #fff;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.hint {
  color: var(--text-muted);
  display: block;
  margin-top: 0.5rem;
  font-size: 0.8rem;
}

.btn-primary {
  background-color: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background-color: #4752c4;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

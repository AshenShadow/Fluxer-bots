<script setup>
import { RouterView } from 'vue-router'
import Navbar from './components/Navbar.vue'
</script>

<template>
  <div class="app-layout">
    <Navbar />
    <div class="content-wrapper">
      <RouterView />
    </div>
  </div>
</template>

<style>
/* Global Reset and Base Styles matching Tupperbox */
:root {
  /* Jester Purple Palette */
  --bg-primary: #352e42; /* Deep Purple Grey */
  --bg-secondary: #2b2536; /* Darker Purple Grey (Sidebar) */
  --bg-tertiary: #201c29; /* Very Dark Purple (Inputs) */
  
  --header-primary: #fff;
  --header-secondary: #b9bbbe;
  --text-normal: #e0dce6; /* Slightly purple-tinted white */
  --text-muted: #9f9aa6;
  
  --accent-primary: #9b59b6; /* Bright Purple Accent */
  
  --channel-textarea-border: rgba(79,84,92,0.48);
  --interactive-normal: #b9bbbe;
  --interactive-hover: #dcddde;
  --interactive-active: #fff;
  
  --mod-warning: #f04747;
  --spotify: #1db954;
  
  /* Replaces existing blue with the Jester Purple */
  --tb-blue: #6a4c93; 
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-normal);
  line-height: 1.5;
  overflow: hidden; 
  height: 100vh;
  width: 100vw;
}

.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.content-wrapper {
  flex: 1;
  overflow: hidden; /* Important for inner scrollable areas */
  position: relative;
}

/* Scrollbar */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
    background-color: #2b2e33;
}
::-webkit-scrollbar-thumb {
    background-color: #202225;
    border-radius: 4px;
}
</style>

<script setup>
import AppNav from '@/components/AppNav.vue'

// 根组件：顶部导航 + 路由出口
</script>

<template>
  <div id="layout">
    <AppNav />
    <router-view />
  </div>
</template>

<style scoped>
#layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>

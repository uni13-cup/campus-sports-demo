<script setup>
// 根组件：仅承载路由出口，具体内容由各页面组件实现
</script>

<template>
  <div id="layout">
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

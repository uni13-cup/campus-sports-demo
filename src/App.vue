<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/TabBar.vue'

// 根组件：路由出口 + 五个主 Tab 页面显示底部导航
const route = useRoute()
const showTabBar = computed(() => route.meta?.tab === true)
</script>

<template>
  <div id="layout">
    <router-view />
    <TabBar v-if="showTabBar" />
  </div>
</template>

<style scoped>
#layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>

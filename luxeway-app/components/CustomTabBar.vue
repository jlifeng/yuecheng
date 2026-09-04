<template>
  <view class="custom-tabbar">
    <view
      class="tab-item"
      :class="{ active: currentIndex === 0 }"
      @click="switchTab(0)"
    >
      <uni-icons
        type="home"
        size="22"
        :color="currentIndex === 0 ? '#000' : '#999'"
      ></uni-icons>
      <text class="tab-text">首页</text>
    </view>
    <view
      class="tab-item"
      :class="{ active: currentIndex === 1 }"
      @click="switchTab(1)"
    >
      <uni-icons
        type="person"
        size="22"
        :color="currentIndex === 1 ? '#000' : '#999'"
      ></uni-icons>
      <text class="tab-text">我的</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps({
  current: {
    type: Number,
    default: 0
  }
})

const currentIndex = ref(0)

// 监听 props 变化
watch(() => props.current, (newVal) => {
  currentIndex.value = newVal
}, { immediate: true })

// 根据当前页面决定首页路径
// 如果当前在商家工作台/商家相关页面，首页=工作台
// 否则首页=乘客首页
const getHomePath = () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const currentPath = currentPage?.route || ''

  // 当前在商家工作台或商家子页面时，首页回到工作台
  if (currentPath.startsWith('pages/provider/') || currentPath.startsWith('pages/admin/')) {
    return '/pages/provider/workbench'
  }
  return '/pages/index/index'
}

const getMinePath = () => {
  // 统一使用 pages/mine/mine，页面内部根据角色显示不同内容
  return '/pages/mine/mine'
}

const switchTab = (index: number) => {
  if (index === currentIndex.value) return

  currentIndex.value = index

  const path = index === 0 ? getHomePath() : getMinePath()
  uni.redirectTo({ url: path })
}
</script>

<style scoped>
.custom-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  background: #fff;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.tab-text {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.tab-item.active .tab-text {
  color: #000;
  font-weight: bold;
}
</style>
<template>
  <view class="custom-tabbar">
    <view 
      v-for="(item, index) in tabList" 
      :key="index"
      class="tab-item" 
      :class="{ active: currentIndex === index }"
      @click="switchTab(index, item.path)"
    >
      <uni-icons 
        :type="item.icon" 
        :size="22"
        :color="currentIndex === index ? '#1e2023' : '#999999'"
      ></uni-icons>
      <text class="tab-text">{{ item.text }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { providerTabItemsForRole, type ProviderRole } from '@/types/provider';
import { ProviderSessionManager } from '@/utils/dataManager';

const props = defineProps({
  current: {
    type: Number,
    default: 0
  }
});

const currentIndex = ref(props.current);
const userRole = ref('passenger');
const providerRole = ref<ProviderRole>('OWNER');

onMounted(() => {
  userRole.value = uni.getStorageSync('userRole') || 'passenger';
  providerRole.value = ProviderSessionManager.getSession().role;
});

// 根据角色动态生成 TabBar 列表
const tabList = computed(() => {
  if (userRole.value === 'provider') {
    return providerTabItemsForRole(providerRole.value);
  } else {
    return [
      { icon: 'home', text: '首页', path: '/pages/index/index' },
      { icon: 'person', text: '我的', path: '/pages/mine/mine' }
    ];
  }
});

const switchTab = (index: number, path: string) => {
  if (index === currentIndex.value) return;
  
  currentIndex.value = index;
  uni.redirectTo({ url: path });
};
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
  color: #1e2023;
  font-weight: bold;
}
</style>

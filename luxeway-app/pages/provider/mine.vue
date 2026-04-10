<template>
  <view class="container">
    <view class="user-header">
       <view class="avatar">
         <text class="avatar-text">{{ userInfo.companyName?.charAt(0) || '商' }}</text>
       </view>
       <view class="info">
         <text class="nickname">{{ userInfo.companyName || '商务接待' }}</text>
         <text class="company">{{ userInfo.nickname || '' }}</text>
       </view>
    </view>

    <view class="menu-section">
      <view class="section-title">车队管理</view>
      <view v-if="!isDriverMode" class="menu-list">
        <view class="menu-item" @click="goToFleetManage">
          <text>我的车队</text>
          <text class="arrow" decode="true">&gt;</text>
        </view>
        <view class="menu-item" @click="goToDriverManage">
          <text>司机管理</text>
          <text class="arrow" decode="true">&gt;</text>
        </view>
      </view>
      <view v-else class="menu-list">
        <view class="menu-item disabled-menu">
          <text>司机模式不开放车队管理</text>
        </view>
      </view>
    </view>

    <view v-if="!isDriverMode" class="menu-section">
      <view class="section-title">业务管理</view>
      <view class="menu-list">
        <view class="menu-item">
          <text>我的报价</text>
          <text class="arrow" decode="true">&gt;</text>
        </view>
        <view class="menu-item">
          <text>订单记录</text>
          <text class="arrow" decode="true">&gt;</text>
        </view>
        <view class="menu-item">
          <text>收入统计</text>
          <text class="arrow" decode="true">&gt;</text>
        </view>
      </view>
    </view>

    <view v-else class="menu-section">
      <view class="section-title">任务说明</view>
      <view class="menu-list">
        <view class="menu-item disabled-menu">
          <text>当前账号仅查看任务与当前订单，不显示报价和经营入口</text>
        </view>
      </view>
    </view>

    <view class="menu-section">
      <view class="section-title">其他</view>
      <view class="menu-list">
        <view class="menu-item">
          <text>设置</text>
          <text class="arrow" decode="true">&gt;</text>
        </view>
        <view class="menu-item logout" @click="handleLogout">
          <text class="logout-text">退出登录</text>
        </view>
      </view>
    </view>

    <CustomTabBar :current="1" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { ProviderSessionManager } from '@/utils/dataManager';
import { type ProviderRole } from '@/types/provider';

const userInfo = ref({
  companyName: '',
  nickname: ''
});
const providerRole = ref<ProviderRole>('OWNER');
const isDriverMode = computed(() => providerRole.value === 'DRIVER');

onMounted(() => {
  loadUserInfo();
  providerRole.value = ProviderSessionManager.getSession().role;
});

// 加载用户信息
const loadUserInfo = () => {
  const storedUserInfo = uni.getStorageSync('userInfo');
  if (storedUserInfo) {
    userInfo.value = storedUserInfo;
  }
};

const goToFleetManage = () => {
  uni.navigateTo({ url: '/pages/provider/my_fleet/index' });
};

const goToDriverManage = () => {
  uni.navigateTo({ url: '/pages/provider/driver_management/index' });
};

const navigate = (url: string) => {
  uni.navigateTo({ url });
};

// 退出登录
const handleLogout = () => {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    confirmColor: '#f5222d',
    success: (res) => {
      if (res.confirm) {
        // 清除登录信息
        uni.removeStorageSync('token');
        uni.removeStorageSync('userId');
        uni.removeStorageSync('userRole');
        uni.removeStorageSync('userInfo');
        uni.removeStorageSync('savedAccount');

        uni.showToast({ title: '已退出登录', icon: 'success' });

        // 跳转到登录页
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/login/index' });
        }, 500);
      }
    }
  });
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
  padding-bottom: 80px;
}

.user-header {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #1e2023 0%, #303741 100%);
  padding: 30px 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.avatar {
  width: 60px;
  height: 60px;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  margin-right: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  color: #fff;
  font-size: 24px;
  font-weight: bold;
}

.info {
  display: flex;
  flex-direction: column;
}

.nickname {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 5px;
}

.company {
  font-size: 14px;
  color: rgba(255,255,255,0.7);
}

.menu-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 13px;
  color: #999;
  padding: 0 5px;
  margin-bottom: 10px;
}

.menu-list {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  padding: 15px 20px;
  border-bottom: 1px solid #f5f5f5;
  font-size: 15px;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item.disabled-menu {
  color: #999;
  line-height: 1.6;
}

.menu-item.logout {
  justify-content: center;
}

.logout-text {
  color: #f5222d;
}

.arrow {
  color: #ccc;
  font-size: 14px;
}
</style>

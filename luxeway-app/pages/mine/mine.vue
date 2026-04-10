<template>
  <view class="container">
    <view class="user-header">
       <view class="avatar">
         <text class="avatar-text">{{ userInfo.nickname?.charAt(0) || 'U' }}</text>
       </view>
       <view class="info">
         <text class="nickname">{{ userInfo.nickname || '未登录' }}</text>
         <text class="phone">{{ userInfo.phone || '' }}</text>
       </view>
    </view>

    <view class="menu-section">
      <view class="section-title">我的服务</view>
      <view class="menu-list">
        <view class="menu-item">
          <text>我的订单</text>
          <text class="arrow" decode="true">&gt;</text>
        </view>
        <view class="menu-item">
          <text>我的行程</text>
          <text class="arrow" decode="true">&gt;</text>
        </view>
        <view class="menu-item">
          <text>常用地址</text>
          <text class="arrow" decode="true">&gt;</text>
        </view>
        <view class="menu-item">
          <text>优惠券</text>
          <text class="arrow" decode="true">&gt;</text>
        </view>
      </view>
    </view>

    <view class="menu-section">
      <view class="section-title">其他</view>
      <view class="menu-list">
        <view class="menu-item">
          <text>联系客服</text>
          <text class="arrow" decode="true">&gt;</text>
        </view>
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
import { ref, onMounted } from 'vue';
import CustomTabBar from '@/components/CustomTabBar.vue';

const userInfo = ref({
  nickname: '',
  phone: ''
});

onMounted(() => {
  loadUserInfo();
});

// 加载用户信息
const loadUserInfo = () => {
  const storedUserInfo = uni.getStorageSync('userInfo');
  if (storedUserInfo) {
    userInfo.value = storedUserInfo;
    // 格式化手机号显示
    if (userInfo.value.phone && !userInfo.value.phone.includes('*')) {
      userInfo.value.phone = userInfo.value.phone.slice(0, 3) + '****' + userInfo.value.phone.slice(7);
    }
  }
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.avatar {
  width: 60px;
  height: 60px;
  background: rgba(255,255,255,0.3);
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
  display: block;
  margin-bottom: 5px;
}

.phone {
  font-size: 14px;
  color: rgba(255,255,255,0.8);
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

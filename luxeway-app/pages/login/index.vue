<template>
  <view class="login-container" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 背景装饰 -->
    <view class="bg-decoration">
      <view class="circle circle-1"></view>
      <view class="circle circle-2"></view>
    </view>

    <!-- Logo 区域 -->
    <view class="logo-section">
      <view class="logo">
        <text class="logo-icon">🚗</text>
      </view>
      <text class="app-name">LuxeWay 悦途</text>
      <text class="app-slogan">高端出行，尊贵体验</text>
    </view>

    <!-- 登录表单 -->
    <view class="form-section">
      <view class="form-tabs">
        <view
          class="tab-item"
          :class="{ active: loginType === 'password' }"
          @click="switchLoginType('password')"
        >
          <text>密码登录</text>
        </view>
        <view
          class="tab-item"
          :class="{ active: loginType === 'code' }"
          @click="switchLoginType('code')"
        >
          <text>验证码登录</text>
        </view>
      </view>

      <!-- 密码登录表单 -->
      <view v-if="loginType === 'password'" class="form-content">
        <view class="form-item">
          <view class="input-wrapper">
            <uni-icons type="person" size="18" color="#999"></uni-icons>
            <input
              class="form-input"
              v-model="passwordForm.account"
              placeholder="请输入手机号/用户名"
              placeholder-class="input-placeholder"
            />
          </view>
        </view>

        <view class="form-item">
          <view class="input-wrapper">
            <uni-icons type="locked" size="18" color="#999"></uni-icons>
            <input
              class="form-input"
              v-model="passwordForm.password"
              placeholder="请输入密码"
              placeholder-class="input-placeholder"
              :password="!showPassword"
            />
            <uni-icons
              :type="showPassword ? 'eye' : 'eye-slash'"
              size="18"
              color="#999"
              @click="showPassword = !showPassword"
            ></uni-icons>
          </view>
        </view>

        <view class="form-options">
          <view class="checkbox-wrapper" @click="passwordForm.remember = !passwordForm.remember">
            <view class="checkbox" :class="{ checked: passwordForm.remember }">
              <uni-icons v-if="passwordForm.remember" type="checkmarkempty" size="14" color="#fff"></uni-icons>
            </view>
            <text class="checkbox-label">记住密码</text>
          </view>
        </view>
      </view>

      <!-- 验证码登录表单 -->
      <view v-else class="form-content">
        <view class="form-item">
          <view class="input-wrapper">
            <uni-icons type="phone" size="18" color="#999"></uni-icons>
            <input
              class="form-input"
              v-model="codeForm.phone"
              placeholder="请输入手机号"
              placeholder-class="input-placeholder"
              type="number"
              maxlength="11"
            />
          </view>
        </view>

        <view class="form-item">
          <view class="input-wrapper code-wrapper">
            <uni-icons type="email" size="18" color="#999"></uni-icons>
            <input
              class="form-input"
              v-model="codeForm.code"
              placeholder="请输入验证码"
              placeholder-class="input-placeholder"
              type="number"
              maxlength="6"
            />
            <button
              class="code-btn"
              :class="{ disabled: countdown > 0 }"
              @click="sendCode"
              :disabled="countdown > 0"
            >
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </button>
          </view>
        </view>
      </view>

      <!-- 登录按钮 -->
      <button class="login-btn" @click="handleLogin" :loading="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>

      <!-- 注册链接 -->
      <view class="register-link">
        <text class="link-text">还没有账号？</text>
        <text class="link-action" @click="goToRegister">立即注册</text>
      </view>
    </view>

    <!-- 演示账号提示 -->
    <view class="demo-accounts">
      <view class="demo-title">演示账号（点击直接填充）</view>
      <view class="demo-list">
        <view class="demo-item" @click="fillDemo('passenger')">
          <view class="demo-info">
            <text class="demo-name">普通用户</text>
            <text class="demo-account">user / 123456</text>
          </view>
          <uni-icons type="right" size="14" color="#999"></uni-icons>
        </view>
        <view class="demo-item" @click="fillDemo('provider')">
          <view class="demo-info">
            <text class="demo-name">商务接待</text>
            <text class="demo-account">provider / 123456</text>
          </view>
          <uni-icons type="right" size="14" color="#999"></uni-icons>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// 获取状态栏高度
const systemInfo = uni.getSystemInfoSync();
const statusBarHeight = ref(systemInfo.statusBarHeight || 0);

// 登录方式：password-密码登录, code-验证码登录
const loginType = ref('password');
const loading = ref(false);
const showPassword = ref(false);
const countdown = ref(0);

// 密码登录表单
const passwordForm = ref({
  account: '',
  password: '',
  remember: false
});

// 验证码登录表单
const codeForm = ref({
  phone: '',
  code: ''
});

// Mock 用户数据
const mockUsers = [
  {
    id: 1,
    account: 'user',
    password: '123456',
    phone: '13800138000',
    role: 'passenger', // 普通用户
    userInfo: {
      nickname: '张三',
      avatar: '',
      balance: 998.5
    }
  },
  {
    id: 2,
    account: 'provider',
    password: '123456',
    phone: '13900139000',
    role: 'provider', // 商务接待公司
    userInfo: {
      companyName: 'LuxeWay 商务接待',
      nickname: '商家用户',
      avatar: ''
    }
  }
];

onMounted(() => {
  // 检查是否已登录
  const token = uni.getStorageSync('token');
  const userRole = uni.getStorageSync('userRole');
  // 注释掉自动跳转，方便测试登录页面
  // if (token && userRole) {
  //   navigateToHome(userRole);
  // }

  // 检查记住的密码
  const savedAccount = uni.getStorageSync('savedAccount');
  if (savedAccount) {
    passwordForm.value.account = savedAccount.account;
    passwordForm.value.password = savedAccount.password;
    passwordForm.value.remember = true;
  }
});

// 切换登录方式
const switchLoginType = (type: string) => {
  loginType.value = type;
};

// 发送验证码
const sendCode = () => {
  if (!codeForm.value.phone) {
    uni.showToast({ title: '请输入手机号', icon: 'none' });
    return;
  }
  if (!/^1\d{10}$/.test(codeForm.value.phone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return;
  }

  // 模拟发送验证码
  uni.showToast({ title: '验证码已发送', icon: 'success' });
  countdown.value = 60;
  const timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(timer);
    }
  }, 1000);
};

// 填充演示账号
const fillDemo = (type: string) => {
  loginType.value = 'password';
  if (type === 'passenger') {
    passwordForm.value.account = 'user';
    passwordForm.value.password = '123456';
  } else if (type === 'provider') {
    passwordForm.value.account = 'provider';
    passwordForm.value.password = '123456';
  }
};

// 处理登录
const handleLogin = () => {
  if (loginType.value === 'password') {
    handlePasswordLogin();
  } else {
    handleCodeLogin();
  }
};

// 密码登录
const handlePasswordLogin = () => {
  const { account, password } = passwordForm.value;

  if (!account) {
    uni.showToast({ title: '请输入账号', icon: 'none' });
    return;
  }
  if (!password) {
    uni.showToast({ title: '请输入密码', icon: 'none' });
    return;
  }

  loading.value = true;

  // 模拟登录请求
  setTimeout(() => {
    const user = mockUsers.find(u => u.account === account && u.password === password);

    if (user) {
      // 保存登录信息
      const token = `mock_token_${user.id}_${Date.now()}`;
      uni.setStorageSync('token', token);
      uni.setStorageSync('userId', user.id);
      uni.setStorageSync('userRole', user.role);
      uni.setStorageSync('userInfo', user.userInfo);

      // 记住密码
      if (passwordForm.value.remember) {
        uni.setStorageSync('savedAccount', { account, password });
      } else {
        uni.removeStorageSync('savedAccount');
      }

      loading.value = false;
      uni.showToast({ title: '登录成功', icon: 'success' });

      // 跳转到对应首页
      setTimeout(() => {
        navigateToHome(user.role);
      }, 500);
    } else {
      loading.value = false;
      uni.showToast({ title: '账号或密码错误', icon: 'none' });
    }
  }, 1000);
};

// 验证码登录
const handleCodeLogin = () => {
  const { phone, code } = codeForm.value;

  if (!phone) {
    uni.showToast({ title: '请输入手机号', icon: 'none' });
    return;
  }
  if (!/^1\d{10}$/.test(phone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return;
  }
  if (!code) {
    uni.showToast({ title: '请输入验证码', icon: 'none' });
    return;
  }
  if (code !== '123456') { // 模拟验证码
    uni.showToast({ title: '验证码错误', icon: 'none' });
    return;
  }

  loading.value = true;

  // 模拟登录请求
  setTimeout(() => {
    const user = mockUsers.find(u => u.phone === phone);

    if (user) {
      // 保存登录信息
      const token = `mock_token_${user.id}_${Date.now()}`;
      uni.setStorageSync('token', token);
      uni.setStorageSync('userId', user.id);
      uni.setStorageSync('userRole', user.role);
      uni.setStorageSync('userInfo', user.userInfo);

      loading.value = false;
      uni.showToast({ title: '登录成功', icon: 'success' });

      setTimeout(() => {
        navigateToHome(user.role);
      }, 500);
    } else {
      loading.value = false;
      uni.showToast({ title: '该手机号未注册', icon: 'none' });
    }
  }, 1000);
};

// 根据角色跳转到对应首页
const navigateToHome = (role: string) => {
  if (role === 'provider') {
    uni.reLaunch({ url: '/pages/provider/workbench' });
  } else {
    uni.reLaunch({ url: '/pages/index/index' });
  }
};

// 跳转注册页面
const goToRegister = () => {
  uni.showToast({ title: '注册功能开发中', icon: 'none' });
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -50px;
}

.circle-2 {
  width: 200px;
  height: 200px;
  bottom: 100px;
  left: -50px;
}

/* Logo 区域 */
.logo-section {
  text-align: center;
  padding-top: 100px;
  padding-bottom: 40px;
  position: relative;
  z-index: 1;
}

.logo {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-icon {
  font-size: 40px;
}

.app-name {
  display: block;
  font-size: 28px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8px;
}

.app-slogan {
  display: block;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

/* 表单区域 */
.form-section {
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 30px 20px;
  min-height: 60vh;
  position: relative;
  z-index: 1;
}

.form-tabs {
  display: flex;
  margin-bottom: 30px;
  border-bottom: 1px solid #f0f0f0;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 15px;
  color: #666;
  position: relative;
}

.tab-item.active {
  color: #667eea;
  font-weight: bold;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: #667eea;
  border-radius: 2px;
}

.form-content {
  margin-bottom: 20px;
}

.form-item {
  margin-bottom: 20px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: #f5f7fa;
  border-radius: 12px;
  padding: 14px 16px;
  gap: 10px;
}

.form-input {
  flex: 1;
  font-size: 15px;
  color: #333;
}

.input-placeholder {
  color: #999;
}

.code-wrapper {
  padding-right: 12px;
}

.code-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  height: auto;
  line-height: normal;
  white-space: nowrap;
}

.code-btn::after {
  border: none;
}

.code-btn.disabled {
  opacity: 0.6;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid #ddd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checkbox.checked {
  background: #667eea;
  border-color: #667eea;
}

.checkbox-label {
  font-size: 13px;
  color: #666;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  border-radius: 25px;
  border: none;
  margin-bottom: 20px;
}

.login-btn::after {
  border: none;
}

/* 注册链接 */
.register-link {
  text-align: center;
  font-size: 14px;
}

.link-text {
  color: #666;
}

.link-action {
  color: #667eea;
  font-weight: 500;
  margin-left: 4px;
}

/* 演示账号 */
.demo-accounts {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.demo-title {
  font-size: 13px;
  color: #999;
  margin-bottom: 15px;
}

.demo-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.demo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 12px 16px;
  border-radius: 10px;
}

.demo-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.demo-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.demo-account {
  font-size: 12px;
  color: #999;
}
</style>

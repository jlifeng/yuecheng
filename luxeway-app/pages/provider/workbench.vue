<template>
  <view class="container">
    <view class="header">
      <!-- 城市选择器 -->
      <view class="city-selector-wrapper">
        <view class="city-selector" :class="{ active: currentCity !== '全国' }" @click="showCityPicker">
          <text class="city-name">{{ currentCity === '全国' ? '选择城市' : currentCity }}</text>
          <uni-icons type="arrowdown" size="14" color="#666"></uni-icons>
        </view>
        <view class="city-divider"></view>
        <view class="city-selector" @click="locateCity">
          <uni-icons type="location" size="18" color="#666"></uni-icons>
        </view>
        <view class="city-divider"></view>
        <view class="city-selector" :class="{ active: currentCity === '全国' }" @click="switchToAll">
          <text class="city-name">全国</text>
        </view>
      </view>

      <view class="tabs">
        <view class="tab active">{{ isDriverMode ? '今日任务' : '待报价需求' }}</view>
        <view class="tab">{{ isDriverMode ? '当前订单' : '已报价' }}</view>
        <view class="tab">{{ isDriverMode ? '服务记录' : '进行中' }}</view>
      </view>

      <view v-if="statusBanner" class="status-banner">
        <text class="status-banner__text">{{ statusBanner }}</text>
      </view>
    </view>

    <!-- Order List -->
    <scroll-view scroll-y class="list-area">
      <view v-if="filteredDemands.length === 0" class="empty">
        <text class="empty-icon">📋</text>
        <text class="empty-text">{{ currentCity === '全国' ? '暂无待接订单' : '该城市暂无待接订单' }}</text>
        <text class="empty-hint" v-if="currentCity !== '全国'">试试切换到其他城市</text>
      </view>

      <view class="order-card" v-for="order in filteredDemands" :key="order.id" @click="goToBid(order)">
        <view class="order-header">
          <text class="order-type">{{ isDriverMode ? '执行任务' : '包车/预约' }}</text>
          <text class="order-time">{{ order.publishTime }}</text>
        </view>

        <view class="route-info">
          <view class="route-row">
            <view class="dot green-dot"></view>
            <text class="address">{{ order.start }}</text>
          </view>
          <view class="route-row">
            <view class="dot orange-dot"></view>
            <text class="address">{{ order.end }}</text>
          </view>
        </view>

        <view class="details-row">
          <view class="detail-item">
            <text class="detail-label">出发时间</text>
            <text class="detail-val">{{ order.startTime }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">人数</text>
            <text class="detail-val">{{ order.passengerCount }}人</text>
          </view>
          <view class="detail-item" v-if="order.remark">
             <text class="detail-label">备注</text>
             <text class="detail-val remark">{{ order.remark }}</text>
          </view>
        </view>

        <view class="action-row">
          <button class="bid-btn" :class="{ disabled: !canEnterBid }">
            {{ isDriverMode ? '查看任务' : canEnterBid ? '立即报价' : '审核后可报价' }}
          </button>
        </view>
      </view>

      <!-- 其他城市订单提示 -->
      <view class="other-cities-tip" v-if="hasOtherCityOrders && filteredDemands.length > 0">
        <text class="tip-text">还有 {{ otherCityCount }} 个其他城市的订单</text>
        <text class="tip-action" @click="switchToAll">查看全部</text>
      </view>
    </scroll-view>

    <CustomTabBar :current="0" />

    <!-- 城市选择弹窗 -->
    <view class="city-popup-mask" v-if="showCityModal" @click="closeCityPicker"></view>
    <view class="city-popup" :class="{ show: showCityModal }">
      <view class="popup-header">
        <text class="popup-title">选择城市</text>
        <text class="popup-close" @click="closeCityPicker">×</text>
      </view>
      <view class="search-box">
        <input type="text" class="search-input" placeholder="搜索城市" v-model="searchQuery" @input="handleSearchInput" />
      </view>

      <!-- 已选择的路径 - 简化版，直接显示城市 -->
      <view class="selected-path">
        <view
          class="path-item active"
          v-if="selectedCity.name"
        >
          <text>{{ selectedCity.name }}</text>
        </view>
        <view
          class="path-item"
          v-else
        >
          <text>请选择城市</text>
        </view>
      </view>

      <!-- 区域列表 -->
      <view class="city-list-container">
        <view v-if="loading" class="loading-wrapper">
          <text class="loading-text">加载中...</text>
        </view>
        <view v-else>
          <view
            v-for="district in displayedDistricts"
            :key="district.id"
            class="district-item"
            @click="selectDistrict(district)"
          >
            <text class="district-name">{{ district.name }}</text>
            <text class="province-tag" v-if="district.provinceName && !district.isMunicipality">{{ district.provinceName }}</text>
            <uni-icons v-if="isSelected(district)" type="checkmarkempty" size="18" color="#1e2023"></uni-icons>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import CustomTabBar from '@/components/CustomTabBar.vue';
import md5 from '@/utils/md5';
import { providerService } from '@/services/provider';
import { canQuoteDemand, type MerchantReviewStatus, type ProviderRole } from '@/types/provider';

// 腾讯地图配置 - 请替换为你自己的密钥
// 申请地址: https://lbs.qq.com/
const TENCENT_MAP_KEY = 'YOUR_TENCENT_MAP_KEY';
const TENCENT_MAP_SK = 'YOUR_TENCENT_MAP_SK';

// 当前选择的城市（显示用）
const currentCity = ref('武汉');

// 是否显示城市选择弹窗
const showCityModal = ref(false);

// 行政区划数据
const allDistricts = ref<any[]>([]);
const loading = ref(false);

// 当前选择的层级：0-省，1-市，2-区
const selectedLevel = ref(0);

// 已选择的区域
const selectedProvince = ref<any>({ id: 0, name: '' });
const selectedCity = ref<any>({ id: 0, name: '' });
const selectedDistrict = ref<any>({ id: 0, name: '' });
const searchQuery = ref('');
const providerRole = ref<ProviderRole>('OWNER');
const reviewStatus = ref<MerchantReviewStatus>('APPROVED');

const handleSearchInput = (e: any) => {
  searchQuery.value = e.detail.value;
};

// 滚动定位
const scrollToId = ref('');

// 默认城市列表 - 作为API加载失败的备选方案
const DEFAULT_CITIES = ref([
  { id: 1, name: '北京', provinceName: '北京市', isMunicipality: true },
  { id: 2, name: '上海', provinceName: '上海市', isMunicipality: true },
  { id: 3, name: '天津', provinceName: '天津市', isMunicipality: true },
  { id: 4, name: '重庆', provinceName: '重庆市', isMunicipality: true },
  { id: 5, name: '广州', provinceName: '广东省' },
  { id: 6, name: '深圳', provinceName: '广东省' },
  { id: 7, name: '杭州', provinceName: '浙江省' },
  { id: 8, name: '南京', provinceName: '江苏省' },
  { id: 9, name: '成都', provinceName: '四川省' },
  { id: 10, name: '武汉', provinceName: '湖北省' },
  { id: 11, name: '西安', provinceName: '陕西省' },
  { id: 12, name: '苏州', provinceName: '江苏省' },
  { id: 13, name: '郑州', provinceName: '河南省' },
  { id: 14, name: '长沙', provinceName: '湖南省' },
  { id: 15, name: '沈阳', provinceName: '辽宁省' },
  { id: 16, name: '青岛', provinceName: '山东省' },
  { id: 17, name: '大连', provinceName: '辽宁省' },
  { id: 18, name: '厦门', provinceName: '福建省' },
  { id: 19, name: '济南', provinceName: '山东省' },
  { id: 20, name: '合肥', provinceName: '安徽省' }
]);

// 当前显示的区域列表 - 直接显示所有城市，跳过省份层级
const displayedDistricts = computed(() => {
  return DEFAULT_CITIES.value;
});

// 所有订单数据
const allDemands = ref([
  {
    id: 101,
    publishTime: '5分钟前',
    start: '武汉天河国际机场-T3航站楼',
    end: '武汉洪山区人民法院',
    startTime: '今天 16:30-16:45',
    passengerCount: 4,
    remark: '需要别克GL8，有两件大行李',
    city: '武汉'
  },
  {
    id: 102,
    publishTime: '12分钟前',
    start: '武汉站',
    end: '光谷希尔顿酒店',
    startTime: '明天 09:00',
    passengerCount: 2,
    remark: '准时出发',
    city: '武汉'
  },
  {
    id: 103,
    publishTime: '20分钟前',
    start: '北京首都国际机场-T3航站楼',
    end: '北京朝阳区国贸大厦',
    startTime: '今天 18:00',
    passengerCount: 3,
    remark: '需要商务车',
    city: '北京'
  },
  {
    id: 104,
    publishTime: '30分钟前',
    start: '上海浦东国际机场',
    end: '上海外滩华尔道夫酒店',
    startTime: '后天 10:00',
    passengerCount: 2,
    remark: '',
    city: '上海'
  },
  {
    id: 105,
    publishTime: '1小时前',
    start: '广州白云国际机场',
    end: '广州天河区珠江新城',
    startTime: '明天 14:00',
    passengerCount: 4,
    remark: '有婴儿车',
    city: '广州'
  }
]);

// 根据当前城市过滤订单
const filteredDemands = computed(() => {
  if (currentCity.value === '全国') {
    return allDemands.value;
  }
  return allDemands.value.filter(order => order.city === currentCity.value);
});

// 是否有其他城市的订单
const hasOtherCityOrders = computed(() => {
  if (currentCity.value === '全国') return false;
  return allDemands.value.some(order => order.city !== currentCity.value);
});

// 其他城市订单数量
const otherCityCount = computed(() => {
  if (currentCity.value === '全国') return 0;
  return allDemands.value.filter(order => order.city !== currentCity.value).length;
});

const isDriverMode = computed(() => providerRole.value === 'DRIVER');
const canEnterBid = computed(() => !isDriverMode.value && canQuoteDemand(reviewStatus.value));
const statusBanner = computed(() => {
  if (isDriverMode.value) {
    return '当前为司机模式，仅展示任务与订单进度，不开放报价和经营入口';
  }
  if (!canQuoteDemand(reviewStatus.value)) {
    return '商家审核通过后才能参与报价，当前可先查看需求与准备车队资源';
  }
  return '';
});

const loadWorkbenchAccess = async () => {
  try {
    const workbench = await providerService.fetchWorkbench();
    providerRole.value = workbench.session.role;
    reviewStatus.value = workbench.session.reviewStatus;
  } catch (error) {
    console.error('加载工作台权限失败', error);
  }
};

// 加载行政区划数据
const loadDistrictData = async () => {
  if (allDistricts.value.length > 0) return;

  loading.value = true;
  try {
    // 行政区划API签名计算
    const params = {
      key: TENCENT_MAP_KEY,
      struct_type: 1
    };

    // 签名计算（使用原始值，不编码）
    const keys = Object.keys(params).sort();
    let qs = '';
    keys.forEach((k) => {
      qs += `${k}=${params[k]}&`;
    });
    qs = qs.slice(0, -1);
    const path = '/ws/district/v1/list';
    const strToSign = `${path}?${qs}${TENCENT_MAP_SK}`;
    const sig = md5(strToSign);

    // 发送请求时，需要对参数值进行URL编码
    const encodedParams: any = {};
    Object.keys(params).forEach(k => {
      encodedParams[k] = encodeURIComponent(params[k]);
    });

    console.log('=== 行政区划API签名调试 ===');
    console.log('排序后的参数:', qs);
    console.log('签名字符串:', strToSign);
    console.log('计算得到的签名:', sig);

    const res = await uni.request({
      url: 'https://apis.map.qq.com' + path,
      data: {
        ...encodedParams,
        sig: sig
      }
    });

    console.log('=== 行政区划API响应 ===', res.data);

    if (res.data.status === 0) {
      // 确保 result 是数组
      const result = res.data.result;
      if (Array.isArray(result)) {
        allDistricts.value = result;
      } else if (Array.isArray(result && result[0])) {
        // 如果是嵌套结构，取第一级
        allDistricts.value = result[0];
      } else {
        console.error('行政区划数据格式异常:', result);
        allDistricts.value = [];
      }
    } else {
      console.error('获取行政区划失败:', res.data.message);
      allDistricts.value = [];
    }
  } catch (err) {
    console.error('行政区划请求失败:', err);
  } finally {
    loading.value = false;
  }
};

// 显示城市选择器
const showCityPicker = async () => {
  showCityModal.value = true;
  await loadDistrictData();
};

// 关闭城市选择器
const closeCityPicker = () => {
  showCityModal.value = false;
  // 重置选择状态
  selectedLevel.value = 0;
  selectedProvince.value = { id: 0, name: '' };
  selectedCity.value = { id: 0, name: '' };
  selectedDistrict.value = { id: 0, name: '' };
};

// 切换层级
const switchLevel = (level: number) => {
  selectedLevel.value = level;
};

// 判断是否已选中
const isSelected = (district: any) => {
  return selectedCity.value.id === district.id;
};

// 选择区域 - 简化逻辑，直接选择城市
const selectDistrict = (district: any) => {
  // 保存选中的城市（无论是否有子级，直接完成选择）
  selectedCity.value = district;

  // 提取城市名称（去掉"市"后缀）
  const cityName = district.name.replace(/市|省/g, '');
  currentCity.value = cityName;

  // 关闭弹窗并显示提示
  closeCityPicker();
  uni.showToast({ title: `已切换至${cityName}`, icon: 'none' });
};

// 选择城市（旧函数，保留兼容）
const selectCity = (city: string) => {
  currentCity.value = city;
  closeCityPicker();
  uni.showToast({ title: `已切换至${city}`, icon: 'none' });
};

// 切换到全部订单
const switchToAll = () => {
  currentCity.value = '全国';
};

const goToBid = (order: any) => {
  if (isDriverMode.value) {
    uni.showToast({ title: '司机模式请查看任务进度', icon: 'none' });
    return;
  }

  if (!canQuoteDemand(reviewStatus.value)) {
    uni.showToast({ title: '商家审核通过后才能报价', icon: 'none' });
    return;
  }

  uni.navigateTo({
    url: `/pages/provider/bid_input?id=${order.id}`
  });
};

// 定位当前城市
const locateCity = () => {
  uni.getLocation({
    type: 'gcj02',
    geocode: true,
    isHighAccuracy: true,
    success: async (res) => {
      let cityName = '';

      // 1. 先尝试直接获取（App端）
      if (res.address && typeof res.address === 'object') {
        cityName = res.address.city || res.address.province || '';
        if (cityName) {
          cityName = cityName.replace(/市|省/g, '');
          currentCity.value = cityName;
          return;
        }
      }

      // 2. 调用腾讯地图API进行逆地址解析
      const params = {
        key: TENCENT_MAP_KEY,
        location: `${res.latitude},${res.longitude}`,
        get_poi: '0'
      };

      // 签名计算（使用原始值，不编码）
      const keys = Object.keys(params).sort();
      let qs = '';
      keys.forEach((k) => {
        qs += `${k}=${params[k]}&`;
      });
      qs = qs.slice(0, -1);
      const path = '/ws/geocoder/v1';
      const strToSign = `${path}?${qs}${TENCENT_MAP_SK}`;
      const sig = md5(strToSign);

      // 调试输出签名计算过程
      console.log('=== 腾讯地图签名调试 ===');
      console.log('排序后的参数:', qs);
      console.log('签名字符串:', strToSign);
      console.log('计算得到的签名:', sig);

      // 发送请求时，需要对参数值进行URL编码
      const encodedParams: any = {};
      Object.keys(params).forEach(k => {
        encodedParams[k] = encodeURIComponent(params[k]);
      });
      console.log('URL编码后的参数:', encodedParams);

      try {
        const apiRes = await uni.request({
          url: 'https://apis.map.qq.com' + path,
          data: {
            ...encodedParams,
            sig: sig
          }
        });

        if (apiRes.data && apiRes.data.status === 0) {
          const result = apiRes.data.result;
          const addressComponent = result.address_component;
          // 优先使用城市，其次是省份
          cityName = addressComponent.city || addressComponent.province || '';
          // 去掉"市"或"省"字
          cityName = cityName.replace(/市|省/g, '');

          if (cityName) {
            currentCity.value = cityName;
          } else {
            currentCity.value = '全国';
          }
        } else {
          console.error('逆地址解析失败:', apiRes.data.message);
          currentCity.value = '全国';
        }
      } catch (err) {
        console.error('地图API请求失败:', err);
        currentCity.value = '全国';
      }
    },
    fail: (err) => {
      console.log('定位失败，使用全国:', err);
      // 定位失败时设置为全国
      currentCity.value = '全国';
    }
  });
};

onMounted(() => {
  loadWorkbenchAccess();
  // 自动定位城市
  locateCity();
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.header {
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

/* 城市选择器 */
.city-selector-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 15px;
  border-bottom: 1px solid #f5f5f5;
}

.city-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s;
}

.city-selector.active {
  background: #1e2023;
}

.city-selector.active .city-name {
  color: #fff;
}

.city-selector:not(.active) .city-name {
  color: #666;
}

.city-divider {
  width: 1px;
  height: 16px;
  background: #e0e0e0;
  margin: 0 8px;
}

.city-name {
  font-size: 14px;
  font-weight: 500;
  color: #1e2023;
}

.tabs {
  display: flex;
  justify-content: space-around;
  padding: 10px 0;
}

.tab {
  font-size: 15px;
  color: #666;
  padding: 5px 0;
  position: relative;
}

.tab.active {
  color: #1e2023;
  font-weight: bold;
}

.status-banner {
  margin: 0 15px 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff7e6;
  border: 1px solid #ffd591;
}

.status-banner__text {
  font-size: 12px;
  color: #ad6800;
  line-height: 1.6;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 20%;
  width: 60%;
  height: 3px;
  background: #1e2023;
  border-radius: 2px;
}

.list-area {
  padding: 15px;
  padding-right: 15px;
  height: calc(100vh - 120px);
  box-sizing: border-box;
}

.order-card {
  background: #fff;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
}

.order-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.order-type {
  font-size: 12px;
  background: #f0f0f0;
  color: #666;
  padding: 2px 8px;
  border-radius: 4px;
}

.order-time {
  font-size: 12px;
  color: #999;
}

.route-info {
  margin-bottom: 15px;
}

.route-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 10px;
}
.green-dot { background: #3cb371; }
.orange-dot { background: #ff5f00; }

.address {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.details-row {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  border-top: 1px solid #f5f5f5;
  padding-top: 15px;
  margin-bottom: 15px;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
}

.detail-val {
  font-size: 14px;
  color: #333;
}

.remark {
  color: #ff5f00;
}

.action-row {
  display: flex;
  justify-content: flex-end;
}

.bid-btn {
  background: #1e2023;
  color: #fff;
  font-size: 14px;
  border-radius: 20px;
  padding: 0 20px;
  height: 36px;
  line-height: 36px;
}

.bid-btn.disabled {
  background: #d9d9d9;
  color: #666;
}

.bid-btn::after { border: none; }

/* 空状态 */
.empty {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 60px;
  display: block;
  margin-bottom: 15px;
}

.empty-text {
  font-size: 16px;
  color: #999;
  display: block;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 13px;
  color: #ccc;
  display: block;
}

/* 其他城市订单提示 */
.other-cities-tip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff8f5;
  border-radius: 8px;
  padding: 12px 15px;
  margin-top: 10px;
}

.tip-text {
  font-size: 13px;
  color: #ff5f00;
}

.tip-action {
  font-size: 13px;
  color: #1e2023;
  font-weight: 500;
}

/* 城市选择弹窗 */
.city-popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
}

.city-popup {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 20px 20px 0 0;
  z-index: 1000;
  transform: translateY(100%);
  transition: transform 0.3s ease-in-out;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.city-popup.show {
  transform: translateY(0);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.popup-title {
  font-size: 16px;
  font-weight: bold;
  color: #1e2023;
}

.popup-close {
  font-size: 28px;
  color: #999;
  line-height: 1;
}

/* 选择的路径 */
.selected-path {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid #f5f5f5;
  overflow-x: auto;
  white-space: nowrap;
  flex-shrink: 0;
}

.path-item {
  font-size: 14px;
  color: #666;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.path-item.active {
  color: #1e2023;
  font-weight: 500;
  background: #f0f5ff;
}

.path-arrow {
  margin: 0 4px;
  color: #ccc;
  font-size: 12px;
}

/* 城市列表容器 */
.city-list-container {
  flex: 1;
  overflow-y: auto;
  max-height: calc(70vh - 180px);
  padding: 10px 0;
}

.loading-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
}

.loading-text {
  font-size: 14px;
  color: #999;
}

.district-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.2s;
}

.district-item:active {
  background: #f5f5f5;
}

.district-name {
  font-size: 15px;
  color: #333;
  flex: 1;
}

.province-tag {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}
</style>

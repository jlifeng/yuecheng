<template>
  <view class="container">
    <!-- 固定头部区域 -->
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
        <view class="tab" :class="{ active: currentTab === 'pending' }" @click="switchTab('pending')">
          <text>{{ isDriverMode ? '今日任务' : '待报价需求' }}</text>
        </view>
        <view class="tab" :class="{ active: currentTab === 'quoted' }" @click="switchTab('quoted')">
          <text>{{ isDriverMode ? '当前订单' : '已报价' }}</text>
        </view>
        <view class="tab" :class="{ active: currentTab === 'ongoing' }" @click="switchTab('ongoing')">
          <text>{{ isDriverMode ? '服务记录' : '进行中' }}</text>
        </view>
      </view>

      <view v-if="statusBanner" class="status-banner">
        <text class="status-banner__text">{{ statusBanner }}</text>
      </view>

      <!-- 商家信息卡片 - 审核通过后显示 -->
      <view v-if="reviewStatus === 'approved' && companyName" class="merchant-info-card">
        <view class="merchant-info-header">
          <text class="merchant-name">{{ companyName }}</text>
          <view class="merchant-status-badge approved">已认证</view>
        </view>
        <view class="merchant-info-body">
          <text class="merchant-welcome">欢迎，{{ displayName || '商家' }}</text>
          <text class="merchant-tip">可正常接单报价</text>
        </view>
      </view>

      <!-- 审核状态提示卡片 -->
      <view v-if="reviewStatus === 'pending'" class="review-pending-card">
        <view class="review-status-icon">⏳</view>
        <view class="review-status-content">
          <text class="review-status-title">审核中</text>
          <text class="review-status-desc">商家入驻申请正在审核，审核通过后可参与报价接单</text>
        </view>
      </view>

      <view v-if="reviewStatus === 'rejected'" class="review-rejected-card">
        <view class="review-status-icon">❌</view>
        <view class="review-status-content">
          <text class="review-status-title">审核未通过</text>
          <text class="review-status-desc">入驻申请被拒绝，请检查资料后重新申请</text>
        </view>
      </view>
    </view>

    <!-- 滚动列表区域 - 自动填充剩余空间 -->
    <scroll-view scroll-y class="list-area" @scrolltolower="loadMoreData">
      <view v-if="displayOrders.length === 0 && !isLoadingMore" class="empty">
        <text class="empty-icon">📋</text>
        <text class="empty-text">{{ emptyText }}</text>
      </view>

      <!-- Uber 风格卡片 - 与乘客端一致 -->
      <view class="trip-card" v-for="order in displayOrders" :key="order.id" @click="handleOrderClick(order)">
        <view class="trip-card-header">
          <view class="trip-status-badge" :class="getStatusBadgeClass(order)">{{ getOrderType(order) }}</view>
          <uni-icons type="forward" size="16" color="#000"></uni-icons>
        </view>
        <view class="trip-card-body">
          <!-- 路线信息 -->
          <view class="trip-route-row">
            <view class="trip-route-dot"></view>
            <text class="trip-route-text">{{ order.start }}</text>
          </view>
          <view class="trip-route-row">
            <view class="trip-route-dot"></view>
            <text class="trip-route-text">前往 {{ order.end }}</text>
          </view>
          <!-- 时间信息 -->
          <view class="trip-meta-row">
            <view class="trip-route-dot"></view>
            <text class="trip-time-text">{{ order.startTime }}</text>
          </view>
          <!-- 附加信息：人数、报价、备注 -->
          <view class="trip-meta-row" v-if="order.passengerCount || order.price || order.remark">
            <view class="trip-route-dot"></view>
            <text class="trip-time-text">
              <text v-if="order.passengerCount">{{ order.passengerCount }}人</text>
              <text v-if="order.price" class="price-tag"> ¥{{ order.price }}</text>
              <text v-if="order.remark" class="remark-tag">{{ order.remark }}</text>
            </text>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="isLoadingMore" class="loading-more">
        <text>加载中...</text>
      </view>
      <view v-else-if="displayOrders.length > 0 && !currentHasMore" class="no-more">
        <text>没有更多了</text>
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
import { providerService, fetchPendingDemands, fetchQuotedBids, fetchOngoingOrders, type WorkbenchTab } from '@/services/provider';
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
const companyName = ref('');
const displayName = ref('');

// Tab 状态
const currentTab = ref<WorkbenchTab>('pending');

// 各 Tab 数据
const pendingDemands = ref<any[]>([]);  // 待报价需求
const quotedBids = ref<any[]>([]);       // 已报价
const ongoingOrders = ref<any[]>([]);    // 进行中订单

// 分页状态
const pendingPage = ref(1);
const quotedPage = ref(1);
const ongoingPage = ref(1);
const pendingHasMore = ref(true);
const quotedHasMore = ref(true);
const ongoingHasMore = ref(true);
const isLoadingMore = ref(false);

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

// 格式化时间显示
const formatDemandTime = (earliest: string, latest: string) => {
  const start = new Date(earliest)
  const end = new Date(latest)
  const now = new Date()
  const isToday = start.toDateString() === now.toDateString()
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === start.toDateString()

  const startHour = start.getHours().toString().padStart(2, '0')
  const startMin = start.getMinutes().toString().padStart(2, '0')
  const endHour = end.getHours().toString().padStart(2, '0')
  const endMin = end.getMinutes().toString().padStart(2, '0')

  let datePrefix = ''
  if (isToday) {
    datePrefix = '今天 '
  } else if (isTomorrow) {
    datePrefix = '明天 '
  } else {
    const month = start.getMonth() + 1
    const day = start.getDate()
    datePrefix = `${month}月${day}日 `
  }

  return `${datePrefix}${startHour}:${startMin}-${endHour}:${endMin}`
}

// 计算发布时间差
const formatPublishTime = (createdAt: string) => {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return created.toLocaleDateString()
}

// 加载待报价需求列表
const loadDemands = async (isLoadMore: boolean = false) => {
  if (isLoadingMore.value) return

  if (isLoadMore) {
    if (!pendingHasMore.value) return
    pendingPage.value++
  } else {
    pendingPage.value = 1
    pendingHasMore.value = true
  }

  isLoadingMore.value = true
  try {
    const { data, hasMore } = await fetchPendingDemands(pendingPage.value)
    const formatted = data.map(d => ({
      id: d.id,
      publishTime: formatPublishTime(d.created_at),
      start: d.start_address,
      end: d.end_address,
      startTime: formatDemandTime(d.earliest_departure, d.latest_departure),
      passengerCount: d.passenger_count || 1,
      remark: d.requirements || '',
      city: extractCity(d.start_address),
      rawData: d
    }))

    if (isLoadMore) {
      pendingDemands.value.push(...formatted)
    } else {
      pendingDemands.value = formatted
    }
    pendingHasMore.value = hasMore
  } catch (error) {
    console.error('加载需求列表失败', error)
    if (!isLoadMore) pendingDemands.value = []
  } finally {
    isLoadingMore.value = false
  }
}

// 从地址中提取城市名
const extractCity = (address: string) => {
  // 尝试从地址中提取城市名
  const cityMatch = address.match(/([^市]+市|[^省]+省)/)
  if (cityMatch) {
    return cityMatch[1].replace(/市|省/g, '')
  }
  // 尝试匹配常见城市关键词
  const cities = ['北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '武汉', '西安', '苏州', '郑州', '长沙', '沈阳', '青岛', '大连', '厦门', '济南', '合肥']
  for (const city of cities) {
    if (address.includes(city)) return city
  }
  return '其他'
}

// 根据当前 Tab 和城市显示订单
const displayOrders = computed(() => {
  let orders: any[] = [];

  if (currentTab.value === 'pending') {
    orders = pendingDemands.value;
  } else if (currentTab.value === 'quoted') {
    orders = quotedBids.value;
  } else if (currentTab.value === 'ongoing') {
    orders = ongoingOrders.value;
  }

  // 城市过滤（仅对 pending 和 quoted 有效）
  if (currentTab.value === 'pending' || currentTab.value === 'quoted') {
    if (currentCity.value !== '全国') {
      orders = orders.filter(order => order.city === currentCity.value);
    }
  }

  return orders;
});

// 空状态提示文字
const emptyText = computed(() => {
  if (currentTab.value === 'pending') {
    return '暂无待报价的需求';
  } else if (currentTab.value === 'quoted') {
    return '暂无已报价的订单';
  } else {
    return '暂无进行中的订单';
  }
});

// 当前 Tab 是否还有更多数据
const currentHasMore = computed(() => {
  if (currentTab.value === 'pending') return pendingHasMore.value
  if (currentTab.value === 'quoted') return quotedHasMore.value
  return ongoingHasMore.value
});

// 切换 Tab
const switchTab = (tab: WorkbenchTab) => {
  currentTab.value = tab;
  loadTabData(tab);
};

// 加载指定 Tab 的数据
const loadTabData = async (tab: WorkbenchTab) => {
  if (tab === 'pending') {
    await loadDemands();
  } else if (tab === 'quoted') {
    await loadQuotedBids();
  } else if (tab === 'ongoing') {
    await loadOngoingOrders();
  }
};

// 加载已报价列表
const loadQuotedBids = async (isLoadMore: boolean = false) => {
  if (isLoadingMore.value) return

  if (isLoadMore) {
    if (!quotedHasMore.value) return
    quotedPage.value++
  } else {
    quotedPage.value = 1
    quotedHasMore.value = true
  }

  isLoadingMore.value = true
  try {
    const { data, hasMore } = await fetchQuotedBids(quotedPage.value)
    const formatted = data.map(b => ({
      id: b.id,
      demandId: b.demandId,
      price: b.price,
      status: b.status,
      start: b.start,
      end: b.end,
      startTime: formatDemandTime(b.earliestDeparture, b.latestDeparture),
      passengerCount: b.passengerCount,
      remark: b.remark,
      demandStatus: b.demandStatus,
      city: extractCity(b.start),
      rawData: b
    }))

    if (isLoadMore) {
      quotedBids.value.push(...formatted)
    } else {
      quotedBids.value = formatted
    }
    quotedHasMore.value = hasMore
  } catch (error) {
    console.error('加载已报价列表失败', error)
    if (!isLoadMore) quotedBids.value = []
  } finally {
    isLoadingMore.value = false
  }
};

// 加载进行中订单
const loadOngoingOrders = async (isLoadMore: boolean = false) => {
  if (isLoadingMore.value) return

  if (isLoadMore) {
    if (!ongoingHasMore.value) return
    ongoingPage.value++
  } else {
    ongoingPage.value = 1
    ongoingHasMore.value = true
  }

  isLoadingMore.value = true
  try {
    const { data, hasMore } = await fetchOngoingOrders(ongoingPage.value)
    const formatted = data.map(o => ({
      id: o.id,
      bidId: o.bidId,
      price: o.price,
      start: o.start,
      end: o.end,
      startTime: formatDemandTime(o.earliestDeparture, o.latestDeparture),
      passengerCount: o.passengerCount,
      remark: o.remark,
      status: o.status,
      statusDesc: o.statusDesc,
      rawData: o
    }))

    if (isLoadMore) {
      ongoingOrders.value.push(...formatted)
    } else {
      ongoingOrders.value = formatted
    }
    ongoingHasMore.value = hasMore
  } catch (error) {
    console.error('加载进行中订单失败', error)
    if (!isLoadMore) ongoingOrders.value = []
  } finally {
    isLoadingMore.value = false
  }
};

// 获取订单类型标签
const getOrderType = (order: any) => {
  if (currentTab.value === 'pending') {
    return '待报价';
  } else if (currentTab.value === 'quoted') {
    // 根据报价状态显示
    switch (order.status) {
      case 'PENDING': return '已报价';
      case 'ACCEPTED': return '已被接受';
      case 'REJECTED': return '已被拒绝';
      default: return '已报价';
    }
  } else {
    return order.statusDesc || '进行中';
  }
};

// 获取状态徽章样式类
const getStatusBadgeClass = (order: any) => {
  if (currentTab.value === 'pending') {
    return 'status-bidding';  // 黑色
  } else if (currentTab.value === 'quoted') {
    switch (order.status) {
      case 'PENDING': return 'status-bidding';  // 黑色
      case 'ACCEPTED': return 'status-active';  // 蓝色
      case 'REJECTED': return 'status-cancelled';  // 灰色
      default: return 'status-bidding';
    }
  } else {
    // 进行中
    if (order.status === 'IN_PROGRESS') {
      return 'status-active';  // 蓝色
    }
    return 'status-bidding';  // 黑色
  }
};

// 处理订单点击
const handleOrderClick = (order: any) => {
  if (currentTab.value === 'pending') {
    // 待报价：跳转到报价页面
    goToBid(order.rawData || order);
  } else if (currentTab.value === 'quoted') {
    // 已报价：根据状态跳转
    if (order.status === 'ACCEPTED' || order.demandStatus === 'ACCEPTED') {
      // 报价被接受，跳转到商家端订单详情
      uni.navigateTo({ url: `/pages/provider/order_detail?demandId=${order.demandId}` });
    } else {
      uni.showToast({ title: '报价等待乘客选择中', icon: 'none' });
    }
  } else if (currentTab.value === 'ongoing') {
    // 进行中：跳转商家端订单详情
    uni.navigateTo({ url: `/pages/provider/order_detail?demandId=${order.id}` });
  }
};

// 加载更多数据
const loadMoreData = async () => {
  if (isLoadingMore.value) return

  if (currentTab.value === 'pending' && pendingHasMore.value) {
    await loadDemands(true)
  } else if (currentTab.value === 'quoted' && quotedHasMore.value) {
    await loadQuotedBids(true)
  } else if (currentTab.value === 'ongoing' && ongoingHasMore.value) {
    await loadOngoingOrders(true)
  }
};

const isDriverMode = computed(() => providerRole.value === 'DRIVER');
const canEnterBid = computed(() => !isDriverMode.value && canQuoteDemand(reviewStatus.value));

// 仅司机模式或无 merchant_id 时显示 banner 提示
const statusBanner = computed(() => {
  if (isDriverMode.value) {
    return '当前为司机模式，仅展示任务与订单进度';
  }
  // 其他状态用卡片展示，不用 banner
  return '';
});

const loadWorkbenchAccess = async () => {
  try {
    const workbench = await providerService.fetchWorkbench();
    providerRole.value = workbench.session.role;
    reviewStatus.value = workbench.session.reviewStatus;
    companyName.value = workbench.session.companyName || '';
    displayName.value = workbench.session.displayName || '';
    console.log('loadWorkbenchAccess - reviewStatus:', reviewStatus.value, 'companyName:', companyName.value);
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
    url: `/pages/provider/bid_input?demandId=${order.id}`
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

onMounted(async () => {
  await loadWorkbenchAccess();
  // 加载当前 Tab 的数据
  await loadTabData(currentTab.value);
  // 自动定位城市
  locateCity();
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #f7f8fa;
  display: flex;
  flex-direction: column;
}

.header {
  background: #fff;
  flex-shrink: 0;
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

/* 商家信息卡片 - 审核通过 */
.merchant-info-card {
  margin: 0 30rpx 24rpx;
  background: linear-gradient(135deg, #1e2023 0%, #333 100%);
  border-radius: 16rpx;
  padding: 24rpx;
}

.merchant-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.merchant-name {
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
}

.merchant-status-badge {
  font-size: 22rpx;
  padding: 6rpx 12rpx;
  border-radius: 6rpx;
}

.merchant-status-badge.approved {
  background: rgba(59, 130, 246, 0.8);
  color: #fff;
}

.merchant-info-body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.merchant-welcome {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
}

.merchant-tip {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
}

/* 审核中状态卡片 */
.review-pending-card,
.review-rejected-card {
  margin: 0 30rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.review-pending-card {
  background: #fff7e6;
  border: 1px solid #ffd591;
}

.review-rejected-card {
  background: #fff1f0;
  border: 1px solid #ffa39e;
}

.review-status-icon {
  font-size: 48rpx;
}

.review-status-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.review-status-title {
  font-size: 28rpx;
  font-weight: 600;
}

.review-pending-card .review-status-title,
.review-pending-card .review-status-desc {
  color: #ad6800;
}

.review-rejected-card .review-status-title,
.review-rejected-card .review-status-desc {
  color: #cf1322;
}

.review-status-desc {
  font-size: 24rpx;
  opacity: 0.8;
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
  padding: 30rpx;
  flex: 1;
  box-sizing: border-box;
}

/* Uber 风格卡片 - 与乘客端一致 */
.trip-card {
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
}

.trip-card:last-child {
  margin-bottom: 0;
}

.trip-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

/* 状态徽章 */
.trip-status-badge {
  font-size: 24rpx;
  font-weight: 500;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  color: #fff;
}

.trip-status-badge.status-bidding { background: #000; }
.trip-status-badge.status-accepted { background: #000; }
.trip-status-badge.status-active { background: #3b82f6; }
.trip-status-badge.status-pending { background: #999; }
.trip-status-badge.status-done { background: #999; }
.trip-status-badge.status-cancelled { background: #999; }

.trip-card-body {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.trip-route-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.trip-route-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #000;
}

.trip-route-text {
  font-size: 30rpx;
  color: #000;
  font-weight: 500;
}

.trip-meta-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.trip-time-text {
  font-size: 26rpx;
  color: #666;
}

.price-tag {
  color: #3b82f6;
  font-weight: 500;
}

.remark-tag {
  color: #999;
  font-size: 24rpx;
}

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

/* 加载状态 */
.loading-more,
.no-more {
  text-align: center;
  padding: 30rpx 0;
  font-size: 26rpx;
  color: #999;
}

.loading-more {
  color: #666;
}
</style>

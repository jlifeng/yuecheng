<template>
  <view class="agreement-page">
    <view class="header">
      <text class="title">{{ title }}</text>
      <text class="update-time">更新日期：{{ updateTime }}</text>
    </view>

    <scroll-view scroll-y class="content-area">
      <view class="section" v-for="(section, index) in sections" :key="index">
        <text class="section-title">{{ section.title }}</text>
        <view class="section-content">
          <text v-for="(para, pIndex) in section.paragraphs" :key="pIndex" class="paragraph">
            {{ para }}
          </text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const type = ref('user')

onMounted((options: any) => {
  // 获取 URL 参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  if (currentPage?.options?.type) {
    type.value = currentPage.options.type
  }
})

const title = computed(() => {
  return type.value === 'privacy' ? '隐私政策' : '用户协议'
})

const updateTime = ref('2025年4月28日')

// 用户协议内容
const userAgreementSections = [
  {
    title: '一、服务条款',
    paragraphs: [
      '欢迎使用 LuxeWay 悦途出行服务平台（以下简称"本平台"）。在使用本平台服务前，请您仔细阅读以下服务条款。',
      '本平台为用户提供出行信息服务，包括但不限于行程发布、商家报价、订单管理等功能。',
      '使用本平台服务即表示您同意遵守本协议的所有条款。如您不同意本协议的任何条款，请停止使用本平台服务。'
    ]
  },
  {
    title: '二、用户注册',
    paragraphs: [
      '用户需使用真实手机号码进行注册，并确保个人信息的真实性、准确性和完整性。',
      '用户应妥善保管账户信息，因账户泄露造成的损失由用户自行承担。',
      '本平台有权对违规账户进行冻结或注销处理。'
    ]
  },
  {
    title: '三、服务内容',
    paragraphs: [
      '本平台提供信息撮合服务，帮助乘客与商家建立联系。',
      '本平台不参与实际的交易过程，不承担交易中的任何责任。',
      '商家提供的服务由商家自行负责，本平台不对服务质量承担担保责任。'
    ]
  },
  {
    title: '四、用户行为规范',
    paragraphs: [
      '用户不得发布虚假行程信息或恶意报价。',
      '用户不得利用本平台从事违法违规活动。',
      '用户应尊重其他用户和商家的合法权益。'
    ]
  },
  {
    title: '五、免责声明',
    paragraphs: [
      '本平台不对因网络原因导致的服务中断承担责任。',
      '本平台不对因不可抗力导致的服务中断或延迟承担责任。',
      '本平台保留对本协议的最终解释权和修改权。'
    ]
  },
  {
    title: '六、联系我们',
    paragraphs: [
      '如有任何问题或建议，请通过以下方式联系我们：',
      '客服电话：400-xxx-xxxx',
      '电子邮箱：support@luxeway.com'
    ]
  }
]

// 隐私政策内容
const privacyPolicySections = [
  {
    title: '一、信息收集',
    paragraphs: [
      '我们收集的信息包括：手机号码、微信昵称、头像等基本信息。',
      '在使用服务过程中，我们会收集行程信息、位置信息等必要数据。',
      '我们不会收集与提供服务无关的个人信息。'
    ]
  },
  {
    title: '二、信息使用',
    paragraphs: [
      '我们使用您的信息为您提供出行服务。',
      '我们使用您的信息改进服务质量和用户体验。',
      '未经您的同意，我们不会将您的信息用于其他目的。'
    ]
  },
  {
    title: '三、信息共享',
    paragraphs: [
      '我们不会向第三方出售您的个人信息。',
      '为了完成服务，我们可能需要向商家提供必要的行程信息。',
      '法律法规要求披露时，我们将依法配合。'
    ]
  },
  {
    title: '四、信息保护',
    paragraphs: [
      '我们采用业界标准的安全措施保护您的信息。',
      '我们对敏感信息进行加密存储和传输。',
      '我们定期审查信息安全措施，确保数据安全。'
    ]
  },
  {
    title: '五、用户权利',
    paragraphs: [
      '您有权查看、更正、删除您的个人信息。',
      '您有权注销账户并要求删除相关数据。',
      '您有权拒绝提供非必要信息。'
    ]
  },
  {
    title: '六、未成年人保护',
    paragraphs: [
      '我们不会主动收集未成年人的个人信息。',
      '如发现误收集未成年人信息，我们将尽快删除。',
      '监护人有权代为行使相关权利。'
    ]
  },
  {
    title: '七、政策更新',
    paragraphs: [
      '我们可能会不时更新本隐私政策。',
      '重大变更时，我们将通过应用内通知或其他方式告知您。',
      '继续使用服务即表示您同意更新后的政策。'
    ]
  },
  {
    title: '八、联系我们',
    paragraphs: [
      '如有任何隐私相关问题，请联系我们：',
      '电子邮箱：privacy@luxeway.com',
      '我们将在15个工作日内回复您的请求。'
    ]
  }
]

const sections = computed(() => {
  return type.value === 'privacy' ? privacyPolicySections : userAgreementSections
})
</script>

<style scoped>
.agreement-page {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 40rpx 32rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #000;
  display: block;
  margin-bottom: 12rpx;
}

.update-time {
  font-size: 24rpx;
  color: #999;
}

.content-area {
  flex: 1;
  padding: 32rpx;
}

.section {
  margin-bottom: 40rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #000;
  display: block;
  margin-bottom: 20rpx;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.paragraph {
  font-size: 28rpx;
  color: #333;
  line-height: 1.8;
}
</style>

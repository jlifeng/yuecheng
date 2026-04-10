<template>
  <section class="panel">
    <header class="page-header">
      <div>
        <h2>商家审核</h2>
        <p>审核商务接待公司入驻资质、联系人和车队规模，控制商家报价准入。</p>
      </div>
      <div class="summary-card">
        <span class="summary-label">待审核</span>
        <strong class="summary-value">{{ pendingCount }}</strong>
      </div>
    </header>

    <div class="table-head">
      <span>公司</span>
      <span>联系人</span>
      <span>城市 / 车队</span>
      <span>提交时间</span>
      <span>状态</span>
      <span>操作</span>
    </div>

    <div v-if="loading" class="empty-state">加载中...</div>

    <div v-else-if="records.length === 0" class="empty-state">暂无商家审核记录</div>

    <div v-else class="review-list">
      <article v-for="record in records" :key="record.id" class="review-row">
        <div>
          <strong>{{ record.companyName }}</strong>
        </div>
        <div>{{ record.contactName }}</div>
        <div>{{ record.city }} / {{ record.fleetSize }} 台车</div>
        <div>{{ record.submittedAt }}</div>
        <div>
          <span class="status-chip" :class="record.status.toLowerCase()">{{ statusTextMap[record.status] }}</span>
        </div>
        <div class="actions">
          <button
            class="action-btn approve"
            :disabled="record.status !== 'PENDING'"
            @click="handleReview(record.id, 'APPROVED')"
          >
            通过
          </button>
          <button
            class="action-btn reject"
            :disabled="record.status !== 'PENDING'"
            @click="handleReview(record.id, 'REJECTED')"
          >
            驳回
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  fetchMerchantReviewList,
  reviewMerchant,
  type MerchantReviewDecision,
  type MerchantReviewRecord
} from '../../services/admin'

const loading = ref(false)
const records = ref<MerchantReviewRecord[]>([])

const statusTextMap = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回'
} as const

const pendingCount = computed(() => records.value.filter((item) => item.status === 'PENDING').length)

const loadRecords = async () => {
  loading.value = true
  try {
    records.value = await fetchMerchantReviewList()
  } finally {
    loading.value = false
  }
}

const handleReview = async (merchantId: string, decision: MerchantReviewDecision) => {
  await reviewMerchant(merchantId, decision)
  await loadRecords()
}

onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
.panel {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px;
}

.page-header p {
  margin: 0;
  color: #6b7280;
}

.summary-card {
  min-width: 120px;
  border-radius: 14px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #fff7ed, #ffedd5);
  text-align: right;
}

.summary-label {
  display: block;
  font-size: 12px;
  color: #9a3412;
  margin-bottom: 6px;
}

.summary-value {
  font-size: 28px;
  color: #c2410c;
}

.table-head,
.review-row {
  display: grid;
  grid-template-columns: 1.4fr 0.9fr 1fr 1fr 0.8fr 1fr;
  gap: 12px;
  align-items: center;
}

.table-head {
  padding: 0 0 12px;
  border-bottom: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 13px;
}

.review-list {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.review-row {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.status-chip.pending {
  background: #fff7ed;
  color: #c2410c;
}

.status-chip.approved {
  background: #ecfdf5;
  color: #047857;
}

.status-chip.rejected {
  background: #fef2f2;
  color: #b91c1c;
}

.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  border: none;
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
}

.action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.action-btn.approve {
  background: #111827;
  color: #fff;
}

.action-btn.reject {
  background: #f3f4f6;
  color: #111827;
}

.empty-state {
  padding: 32px 0;
  text-align: center;
  color: #6b7280;
}
</style>

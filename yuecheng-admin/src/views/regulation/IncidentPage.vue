<template>
  <section class="panel">
    <header class="page-header">
      <div>
        <h2>异常监管</h2>
        <p>集中处理投诉、费用争议和客服升级事件，确保平台能及时介入。</p>
      </div>
      <div class="summary-group">
        <div class="summary-card open">
          <span>待处理</span>
          <strong>{{ openCount }}</strong>
        </div>
        <div class="summary-card processing">
          <span>处理中</span>
          <strong>{{ processingCount }}</strong>
        </div>
      </div>
    </header>

    <div v-if="loading" class="empty-state">加载中...</div>
    <div v-else-if="records.length === 0" class="empty-state">暂无异常事件</div>

    <div v-else class="incident-list">
      <article v-for="record in records" :key="record.id" class="incident-card">
        <div class="incident-main">
          <div class="incident-title-row">
            <strong>{{ record.summary }}</strong>
            <span class="level-chip" :class="record.level.toLowerCase()">{{ levelTextMap[record.level] }}</span>
          </div>
          <p class="incident-meta">
            订单 {{ record.orderId }} · {{ record.source }} · {{ record.reportedAt }}
          </p>
        </div>

        <div class="incident-side">
          <span class="status-chip" :class="record.status.toLowerCase()">{{ statusTextMap[record.status] }}</span>
          <button
            class="resolve-btn"
            :disabled="record.status === 'RESOLVED'"
            @click="handleResolve(record.id)"
          >
            标记已解决
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchIncidentList, resolveIncident, type IncidentRecord } from '../../services/admin'

const loading = ref(false)
const records = ref<IncidentRecord[]>([])

const levelTextMap = {
  HIGH: '高优先级',
  MEDIUM: '中优先级',
  LOW: '低优先级'
} as const

const statusTextMap = {
  OPEN: '待处理',
  PROCESSING: '处理中',
  RESOLVED: '已解决'
} as const

const openCount = computed(() => records.value.filter((item) => item.status === 'OPEN').length)
const processingCount = computed(() => records.value.filter((item) => item.status === 'PROCESSING').length)

const loadRecords = async () => {
  loading.value = true
  try {
    records.value = await fetchIncidentList()
  } finally {
    loading.value = false
  }
}

const handleResolve = async (incidentId: string) => {
  await resolveIncident(incidentId)
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

.summary-group {
  display: flex;
  gap: 12px;
}

.summary-card {
  min-width: 96px;
  border-radius: 14px;
  padding: 14px 16px;
  text-align: right;
}

.summary-card span {
  display: block;
  font-size: 12px;
  margin-bottom: 6px;
}

.summary-card strong {
  font-size: 24px;
}

.summary-card.open {
  background: #fff7ed;
  color: #c2410c;
}

.summary-card.processing {
  background: #eff6ff;
  color: #1d4ed8;
}

.incident-list {
  display: grid;
  gap: 12px;
}

.incident-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px;
}

.incident-main {
  flex: 1;
}

.incident-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.incident-meta {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.incident-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.level-chip,
.status-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.level-chip.high {
  background: #fef2f2;
  color: #b91c1c;
}

.level-chip.medium {
  background: #fff7ed;
  color: #c2410c;
}

.level-chip.low {
  background: #ecfdf5;
  color: #047857;
}

.status-chip.open {
  background: #fff7ed;
  color: #c2410c;
}

.status-chip.processing {
  background: #eff6ff;
  color: #1d4ed8;
}

.status-chip.resolved {
  background: #ecfdf5;
  color: #047857;
}

.resolve-btn {
  border: none;
  border-radius: 10px;
  padding: 8px 12px;
  background: #111827;
  color: #fff;
  cursor: pointer;
}

.resolve-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.empty-state {
  padding: 32px 0;
  text-align: center;
  color: #6b7280;
}
</style>

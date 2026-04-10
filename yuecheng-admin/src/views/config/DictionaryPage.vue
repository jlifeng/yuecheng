<template>
  <section class="panel">
    <header class="page-header">
      <div>
        <h2>字典配置</h2>
        <p>维护车型、服务标签和异常类型，供小程序和后台统一复用。</p>
      </div>
      <div class="summary-card">
        <span>字典总数</span>
        <strong>{{ items.length }}</strong>
      </div>
    </header>

    <form class="create-form" @submit.prevent="handleSubmit">
      <select v-model="draft.type" class="form-control">
        <option value="CAR_MODEL">车型</option>
        <option value="SERVICE_TAG">服务标签</option>
        <option value="INCIDENT_TYPE">异常类型</option>
      </select>
      <input v-model.trim="draft.label" class="form-control" placeholder="输入字典名称" />
      <button class="submit-btn" type="submit">新增字典项</button>
    </form>

    <div v-if="loading" class="empty-state">加载中...</div>
    <div v-else class="group-list">
      <article v-for="group in groupedItems" :key="group.type" class="group-card">
        <header class="group-header">
          <h3>{{ typeTextMap[group.type] }}</h3>
          <span>{{ group.items.length }} 项</span>
        </header>
        <div class="chip-list">
          <span v-for="item in group.items" :key="item.id" class="chip">{{ item.label }}</span>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { addDictionaryItem, fetchDictionaryItems, type DictionaryItem, type DictionaryType } from '../../services/admin'

const loading = ref(false)
const items = ref<DictionaryItem[]>([])
const draft = reactive<{ type: DictionaryType; label: string }>({
  type: 'CAR_MODEL',
  label: ''
})

const typeTextMap = {
  CAR_MODEL: '车型',
  SERVICE_TAG: '服务标签',
  INCIDENT_TYPE: '异常类型'
} as const

const groupedItems = computed(() => {
  return (['CAR_MODEL', 'SERVICE_TAG', 'INCIDENT_TYPE'] as DictionaryType[]).map((type) => ({
    type,
    items: items.value.filter((item) => item.type === type)
  }))
})

const loadItems = async () => {
  loading.value = true
  try {
    items.value = await fetchDictionaryItems()
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!draft.label) return
  await addDictionaryItem({
    type: draft.type,
    label: draft.label
  })
  draft.label = ''
  await loadItems()
}

onMounted(() => {
  loadItems()
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
  min-width: 110px;
  border-radius: 14px;
  padding: 14px 16px;
  background: #f3f4f6;
  text-align: right;
}

.summary-card span {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
}

.summary-card strong {
  font-size: 24px;
  color: #111827;
}

.create-form {
  display: grid;
  grid-template-columns: 180px 1fr 140px;
  gap: 12px;
  margin-bottom: 20px;
}

.form-control {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}

.submit-btn {
  border: none;
  border-radius: 10px;
  background: #111827;
  color: #fff;
  cursor: pointer;
}

.group-list {
  display: grid;
  gap: 14px;
}

.group-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.group-header h3 {
  margin: 0;
}

.group-header span {
  color: #6b7280;
  font-size: 13px;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #111827;
  font-size: 13px;
}

.empty-state {
  padding: 32px 0;
  text-align: center;
  color: #6b7280;
}
</style>

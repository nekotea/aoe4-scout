<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PlayerSummary } from '../types/aoe4world'
import { searchPlayers } from '../api/aoe4world'
import { useAllies } from '../stores/allies'
import { getCountryName, getCountryFlagClass } from '../utils/country'

const { allies, isAlly, addAlly, removeAlly } = useAllies()

const searchInput = ref('')
const results = ref<PlayerSummary[]>([])
const searching = ref(false)
let seq = 0
let debounce: ReturnType<typeof setTimeout> | null = null

watch(searchInput, (q) => {
  if (debounce) clearTimeout(debounce)
  const query = q?.trim() ?? ''
  if (query.length < 2) {
    results.value = []
    return
  }
  debounce = setTimeout(async () => {
    const s = ++seq
    searching.value = true
    try {
      const players = await searchPlayers(query)
      if (s === seq) results.value = players
    } catch {
      /* 静默 */
    } finally {
      if (s === seq) searching.value = false
    }
  }, 300)
})

function add(p: PlayerSummary) {
  addAlly({
    profile_id: p.profile_id,
    name: p.name,
    country: p.country,
    avatars: p.avatars,
    added_at: Date.now(),
  })
}
</script>

<template>
  <div class="allies-page">
    <!-- 搜索框 -->
    <v-card class="pa-3 mb-3" variant="flat">
      <v-text-field
        v-model="searchInput"
        label="搜索玩家"
        placeholder="输入玩家名（远程搜索建议）…"
        prepend-inner-icon="mdi-account-search"
        :loading="searching"
        density="comfortable"
        variant="outlined"
        hide-details
        clearable
      />
      <v-list v-if="results.length" density="compact" class="mt-2 search-results">
        <v-list-item
          v-for="p in results"
          :key="p.profile_id"
          :title="p.name"
          :subtitle="getCountryName(p.country)"
        >
          <template #prepend>
            <v-avatar size="32"><v-img :src="p.avatars?.small" /></v-avatar>
          </template>
          <template #append>
            <span v-if="p.country" :class="getCountryFlagClass(p.country)" class="mr-3" />
            <v-btn
              v-if="!isAlly(p.profile_id)"
              size="small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-star-plus-outline"
              @click="add(p)"
            >收藏</v-btn>
            <v-chip v-else size="small" color="amber" prepend-icon="mdi-star">已收藏</v-chip>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- 友军列表 -->
    <v-card variant="flat">
      <v-card-title class="text-subtitle-1">
        <v-icon class="mr-1" color="amber">mdi-star</v-icon>友军（{{ allies.length }}）
      </v-card-title>
      <v-list v-if="allies.length" density="comfortable">
        <v-list-item
          v-for="a in allies"
          :key="a.profile_id"
          :title="a.name"
          :subtitle="getCountryName(a.country)"
        >
          <template #prepend>
            <v-avatar size="36"><v-img :src="a.avatars?.small" /></v-avatar>
          </template>
          <template #append>
            <span v-if="a.country" :class="getCountryFlagClass(a.country)" class="mr-3" />
            <v-btn
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              color="red"
              title="删除"
              @click="removeAlly(a.profile_id)"
            />
          </template>
        </v-list-item>
      </v-list>
      <v-empty-state v-else icon="mdi-account-group-outline" title="还没有收藏友军" text="搜索玩家并点击收藏" />
    </v-card>
  </div>
</template>

<style scoped>
.allies-page {
  max-width: 760px;
  margin: 0 auto;
}
.search-results {
  max-height: 320px;
  overflow-y: auto;
  border-radius: 8px;
}
</style>

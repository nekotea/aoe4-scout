<script setup lang="ts">
import { computed } from 'vue'
import type { StoredAlly } from '../types/aoe4world'
import { useHistoryAnalysis } from '../stores/history'

const props = defineProps<{ allies: StoredAlly[] }>()

const {
  loading,
  error,
  enemyPlayers,
  isGrouped,
  getPairCount,
  getRecord,
  getSummary,
} = useHistoryAnalysis()

const summary = computed(() => getSummary(props.allies))

function fmtRate(rate: number | null): string {
  return rate == null ? '暂无' : `${rate.toFixed(1)}%`
}

function shortName(name: string): string {
  return name.length > 10 ? `${name.slice(0, 10)}...` : name
}
</script>

<template>
  <v-card v-if="enemyPlayers.length" class="history-card mb-3" variant="tonal">
    <div class="history-head">
      <div>
        <div class="title">
          <v-icon size="18" class="mr-1">mdi-history</v-icon>
          对局历史分析
        </div>
        <div class="summary">
          对方玩家{{ isGrouped ? '是' : '不是' }}车队，与我方交手过
          {{ summary.battleCount }} 人次，我方胜率 {{ fmtRate(summary.winRate) }}。
          {{ summary.comment }}
        </div>
      </div>
      <v-progress-circular v-if="loading" indeterminate size="20" width="2" />
    </div>

    <v-alert
      v-if="error"
      type="warning"
      density="compact"
      class="mt-2"
      :text="`历史分析拉取失败：${error}`"
    />

    <div class="tables">
      <div class="panel">
        <div class="panel-title">车队信息</div>
        <div class="matrix" :style="{ '--cols': String(enemyPlayers.length) }">
          <div class="corner" />
          <div
            v-for="enemy in enemyPlayers"
            :key="`col-${enemy.profile_id}`"
            class="th"
            :title="enemy.name"
          >
            {{ shortName(enemy.name) }}
          </div>
          <template v-for="row in enemyPlayers" :key="`row-${row.profile_id}`">
            <div class="th row-head" :title="row.name">{{ shortName(row.name) }}</div>
            <div
              v-for="col in enemyPlayers"
              :key="`${row.profile_id}-${col.profile_id}`"
              class="td"
              :class="{ muted: row.profile_id === col.profile_id }"
            >
              {{ row.profile_id === col.profile_id ? '-' : getPairCount(row.profile_id, col.profile_id) }}
            </div>
          </template>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">历史对局记录</div>
        <div v-if="allies.length" class="matrix" :style="{ '--cols': String(enemyPlayers.length) }">
          <div class="corner" />
          <div
            v-for="enemy in enemyPlayers"
            :key="`enemy-${enemy.profile_id}`"
            class="th"
            :title="enemy.name"
          >
            {{ shortName(enemy.name) }}
          </div>
          <template v-for="ally in allies" :key="`ally-${ally.profile_id}`">
            <div class="th row-head" :title="ally.name">
              <v-icon size="13" color="amber" class="mr-1">mdi-star</v-icon>
              {{ shortName(ally.name) }}
            </div>
            <div
              v-for="enemy in enemyPlayers"
              :key="`${ally.profile_id}-${enemy.profile_id}`"
              class="td record"
            >
              <span class="win">{{ getRecord(ally.profile_id, enemy.profile_id).wins }}</span>
              <span class="sep">:</span>
              <span class="loss">{{ getRecord(ally.profile_id, enemy.profile_id).losses }}</span>
            </div>
          </template>
        </div>
        <v-empty-state
          v-else
          icon="mdi-star-outline"
          title="暂无友军"
          text="收藏友军后，这里会统计友军与敌方的历史胜败"
        />
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.history-card {
  padding: 12px;
}
.history-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.title {
  display: flex;
  align-items: center;
  font-weight: 700;
  margin-bottom: 4px;
}
.summary {
  font-size: 0.88rem;
  opacity: 0.85;
  line-height: 1.5;
}
.tables {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 12px;
  margin-top: 12px;
}
.panel {
  min-width: 0;
}
.panel-title {
  font-size: 0.8rem;
  font-weight: 700;
  opacity: 0.75;
  margin-bottom: 6px;
}
.matrix {
  display: grid;
  grid-template-columns: minmax(88px, 1.2fr) repeat(var(--cols), minmax(56px, 1fr));
  overflow-x: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 6px;
}
.corner,
.th,
.td {
  min-height: 30px;
  padding: 6px 8px;
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  font-size: 0.78rem;
}
.th {
  font-weight: 700;
  background: rgba(var(--v-theme-on-surface), 0.04);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-head {
  display: flex;
  align-items: center;
}
.td {
  text-align: center;
}
.muted {
  opacity: 0.35;
}
.record .win {
  color: #66bb6a;
  font-weight: 700;
}
.record .loss {
  color: #ef5350;
  font-weight: 700;
}
.sep {
  opacity: 0.55;
  margin: 0 3px;
}
@media (max-width: 900px) {
  .tables {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import type { ModeStats, PlayerInGame, TacticData } from '../types/aoe4world'
import { rankLevelFromRating, getRankDisplay } from '../utils/rank'
import { getCivName, getCivFlagUrl } from '../utils/civ'
import { getCountryName, getCountryFlagClass } from '../utils/country'
import TacticChart from './TacticChart.vue'

const props = defineProps<{
  player: PlayerInGame
  side: 'left' | 'right'
  isAlly?: boolean
  /** 战术分析数据；null=无可用对局，undefined=加载中 */
  tactic?: TacticData | null
}>()

const emit = defineEmits<{ toggleAlly: [] }>()

interface ModeRow {
  label: string
  mmr: number | null
  seasonPeak: number | null
  seasonPeakRank: string
  careerPeak: number | null
  careerPeakSeason: number | null
  wins: number
  losses: number
  total: number
  winRate: number | null
}

function buildRow(label: string, mode: ModeStats | undefined, mmr: number | null): ModeRow {
  const seasonPeak = mode?.max_rating ?? null
  // 历史最高：当前赛季峰值与历届赛季 rating 一起比较
  let careerPeak: number | null = seasonPeak
  let careerPeakSeason: number | null = seasonPeak != null ? (mode?.season ?? null) : null
  for (const s of mode?.previous_seasons ?? []) {
    if (careerPeak == null || s.rating > careerPeak) {
      careerPeak = s.rating
      careerPeakSeason = s.season
    }
  }
  return {
    label,
    mmr,
    seasonPeak,
    seasonPeakRank: seasonPeak != null ? (getRankDisplay(rankLevelFromRating(seasonPeak))?.label ?? '无段位') : '—',
    careerPeak,
    careerPeakSeason,
    wins: mode?.wins_count ?? 0,
    losses: mode?.losses_count ?? 0,
    total: mode?.games_count ?? 0,
    winRate: mode?.win_rate ?? null,
  }
}

const soloRow = computed(() =>
  buildRow('单排', props.player.modes.rm_solo, props.player.modes.rm_1v1_elo?.rating ?? null),
)
const teamRow = computed(() => {
  const m = props.player.modes
  // 组排 mmr 取各组排 ELO 中最高的一项
  const teamElo = Math.max(
    m.rm_2v2_elo?.rating ?? 0,
    m.rm_3v3_elo?.rating ?? 0,
    m.rm_4v4_elo?.rating ?? 0,
  )
  return buildRow('组排', m.rm_team, teamElo > 0 ? teamElo : null)
})

const countryName = computed(() => getCountryName(props.player.country))
const civName = computed(() => getCivName(props.player.civilization))
const civFlag = computed(() => getCivFlagUrl(props.player.civilization))
const mirrored = computed(() => props.side === 'right')

function fmt(n: number | null | undefined): string {
  return n != null ? String(n) : '—'
}
</script>

<template>
  <v-card class="player-card mb-2" :class="{ mirrored }" density="compact" variant="tonal">
    <!-- 战术分析背景图表：最近一局同文明的前 15 分钟军事价值曲线 -->
    <TacticChart v-if="tactic" :tactic="tactic" />
    <!-- 首行 -->
    <div class="row head-row">
      <div class="cell rating-cell">
        <span class="elo">{{ fmt(player.rating) }}</span>
        <span class="sep">|</span>
        <span class="mmr">{{ fmt(player.mmr) }}</span>
      </div>
      <div class="cell name-cell">
        <span class="player-name" :title="player.name">{{ player.name }}</span>
        <span v-if="countryName" class="country-name">{{ countryName }}</span>
        <span v-if="player.country" :class="getCountryFlagClass(player.country)" class="country-flag" />
        <v-btn
          icon
          size="x-small"
          variant="text"
          :color="isAlly ? 'amber' : 'grey'"
          :title="isAlly ? '取消友军标记' : '标记为友军'"
          @click="emit('toggleAlly')"
        >
          <v-icon size="16">{{ isAlly ? 'mdi-star' : 'mdi-star-outline' }}</v-icon>
        </v-btn>
      </div>
      <div class="cell civ-cell">
        <img :src="civFlag" :alt="civName" :title="civName" class="civ-flag" />
        <!-- <span class="civ-name">{{ civName }}</span> -->
      </div>
    </div>

    <!-- 单排 / 组排 -->
    <div v-for="row in [soloRow, teamRow]" :key="row.label" class="row stats-row">
      <div class="cell mode-label">{{ row.label }}</div>
      <div class="cell stat" :title="`${row.label}MMR`">
        <v-icon size="12" class="stat-icon">mdi-chart-line</v-icon>{{ fmt(row.mmr) }}
      </div>
      <div class="cell stat" title="本赛季最高">
        <v-icon size="12" class="stat-icon">mdi-trophy-outline</v-icon>
        {{ fmt(row.seasonPeak) }}<template v-if="row.seasonPeak != null"> · {{ row.seasonPeakRank }}</template>
      </div>
      <div class="cell stat" title="历史最高">
        <v-icon size="12" class="stat-icon">mdi-crown-outline</v-icon>
        {{ fmt(row.careerPeak) }}<template v-if="row.careerPeakSeason != null"> · S{{ row.careerPeakSeason }}</template>
      </div>
      <div class="cell stat record" title="胜 / 负 / 总场次 / 胜率">
        <span class="win">{{ row.wins }}</span>/<span class="loss">{{ row.losses }}</span>/{{ row.total }}
        <template v-if="row.winRate != null"> · {{ row.winRate.toFixed(1) }}%</template>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.player-card {
  padding: 8px 12px;
  position: relative;
  overflow: hidden;
}
.player-card > .row {
  position: relative;
  z-index: 1;
  transition: opacity 0.2s ease;
}
/* 悬停时淡化文字，凸显背景图表 */
.player-card:hover > .row {
  opacity: 0.2;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.mirrored .row {
  flex-direction: row-reverse;
}
.head-row {
  margin-bottom: 4px;
}
.rating-cell {
  font-weight: 700;
  white-space: nowrap;
}
.rating-cell .elo {
  font-size: 1.1rem;
}
.rating-cell .mmr {
  opacity: 0.7;
}
.sep {
  opacity: 0.4;
  margin: 0 4px;
}
.name-cell {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.mirrored .name-cell {
  flex-direction: row-reverse;
}
.player-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.country-name {
  font-size: 0.75rem;
  opacity: 0.65;
  white-space: nowrap;
}
.country-flag {
  border-radius: 2px;
  flex-shrink: 0;
}
.civ-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.mirrored .civ-cell {
  flex-direction: row-reverse;
}
.civ-flag {
  height: 22px;
  border-radius: 3px;
}
.civ-name {
  font-size: 0.8rem;
  opacity: 0.85;
}
.stats-row {
  font-size: 0.78rem;
  opacity: 0.92;
  padding: 1px 0;
}
.mode-label {
  font-weight: 600;
  width: 32px;
  flex-shrink: 0;
  opacity: 0.7;
}
.mirrored .mode-label {
  text-align: right;
}
.stat {
  white-space: nowrap;
}
.stat-icon {
  margin-right: 2px;
  opacity: 0.6;
}
.record .win { color: #66bb6a; }
.record .loss { color: #ef5350; }
</style>

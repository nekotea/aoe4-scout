<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PlayerInGame, PlayerSummary, StoredAlly } from '../types/aoe4world'
import { searchPlayers } from '../api/aoe4world'
import { useScout } from '../stores/scout'
import { useAllies } from '../stores/allies'
import { useTactics } from '../stores/tactics'
import { useHistoryAnalysis } from '../stores/history'
import PlayerCard from './PlayerCard.vue'
import HistoryAnalysis from './HistoryAnalysis.vue'
import OpeningAnalysis from './OpeningAnalysis.vue'

const { target, game, tracking, loading, error, setTarget, setTracking } = useScout()
const { allies, isAlly, toggleAlly } = useAllies()
const { load: loadTactic, getTactic } = useTactics()
const { loadForGame: loadHistory } = useHistoryAnalysis()

// 对局数据更新后，为双方每个玩家拉取战术分析（同文明最近完成局）
watch(game, (g) => {
  if (!g) return
  for (const p of g.teams.flat()) {
    loadTactic(p.profile_id, p.civilization)
  }
}, { immediate: true })

// ─── 搜索框 ───────────────────────────────────────────────
const searchInput = ref('')
const remoteResults = ref<PlayerSummary[]>([])
const searching = ref(false)
let searchSeq = 0

function allyToSummary(a: StoredAlly): PlayerSummary {
  return {
    name: a.name,
    profile_id: a.profile_id,
    steam_id: null,
    site_url: `https://aoe4world.com/players/${a.profile_id}`,
    avatars: a.avatars,
    country: a.country,
    social: {},
    modes: {},
  }
}

const suggestions = computed<PlayerSummary[]>(() => {
  const q = searchInput.value?.trim() ?? ''
  if (q.length <= 2) {
    // 2 字以内：展示收藏的友军（本地过滤）
    const list = allies.map(allyToSummary)
    if (!q) return list
    return list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
  }
  // 3 字以上：本地优先 + 远端建议去重
  const lower = q.toLowerCase()
  const local = allies.filter((a) => a.name.toLowerCase().includes(lower)).map(allyToSummary)
  const localIds = new Set(local.map((p) => p.profile_id))
  return [...local, ...remoteResults.value.filter((p) => !localIds.has(p.profile_id))]
})

let debounce: ReturnType<typeof setTimeout> | null = null
watch(searchInput, (q) => {
  if (debounce) clearTimeout(debounce)
  const query = q?.trim() ?? ''
  if (query.length <= 2) {
    remoteResults.value = []
    return
  }
  debounce = setTimeout(async () => {
    const seq = ++searchSeq
    searching.value = true
    try {
      const players = await searchPlayers(query)
      if (seq === searchSeq) remoteResults.value = players
    } catch {
      /* 搜索失败静默，保留旧建议 */
    } finally {
      if (seq === searchSeq) searching.value = false
    }
  }, 300)
})

function onSelectTarget(p: PlayerSummary | null) {
  setTarget(p) // 选中立即拉取一次最新对局
}

// ─── 对局双方分列 ─────────────────────────────────────────
function teamScore(team: PlayerInGame[]): number {
  // 含目标玩家的队伍优先视为友方；其次比较友军收藏数
  let score = team.reduce((n, p) => n + (isAlly(p.profile_id) ? 1 : 0), 0)
  if (target.value && team.some((p) => p.profile_id === target.value!.profile_id)) score += 100
  return score
}

const friendlyTeam = computed<PlayerInGame[]>(() => {
  const teams = game.value?.teams ?? []
  if (!teams.length) return []
  return [...teams].sort((a, b) => teamScore(b) - teamScore(a))[0]
})

const enemyTeams = computed<PlayerInGame[]>(() => {
  const teams = game.value?.teams ?? []
  return teams.filter((t) => t !== friendlyTeam.value).flat()
})

watch(() => game.value?.game_id, (gameId) => {
  if (!gameId) return
  loadHistory(gameId, enemyTeams.value)
}, { immediate: true })

function playerToAlly(p: PlayerInGame): StoredAlly {
  return {
    profile_id: p.profile_id,
    name: p.name,
    country: p.country,
    avatars: p.avatars,
    added_at: Date.now(),
  }
}

const gameMeta = computed(() => {
  const g = game.value
  if (!g) return null
  return {
    map: g.map,
    kind: g.kind,
    server: g.server,
    ongoing: g.ongoing,
    startedAt: new Date(g.started_at).toLocaleString('zh-CN'),
  }
})

function markTargetAlly() {
  const t = target.value
  if (!t) return
  toggleAlly({
    profile_id: t.profile_id,
    name: t.name,
    country: t.country,
    avatars: t.avatars,
    added_at: Date.now(),
  })
}
</script>

<template>
  <div class="scout-page">
    <!-- 搜索与操作栏 -->
    <v-card class="pa-3 mb-3" variant="flat">
      <div class="d-flex align-center ga-3 flex-wrap">
        <v-autocomplete
          :model-value="target"
          :items="suggestions"
          :loading="searching"
          v-model:search="searchInput"
          item-title="name"
          return-object
          label="目标玩家"
          placeholder="输入玩家名搜索…"
          prepend-inner-icon="mdi-magnify"
          density="comfortable"
          variant="outlined"
          hide-details
          clearable
          no-filter
          class="target-search"
          @update:model-value="onSelectTarget"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :title="item.raw.name">
              <template #prepend>
                <v-avatar size="28">
                  <v-img :src="item.raw.avatars?.small" />
                </v-avatar>
              </template>
              <template #append>
                <v-icon v-if="isAlly(item.raw.profile_id)" color="amber" size="16">mdi-star</v-icon>
              </template>
            </v-list-item>
          </template>
        </v-autocomplete>

        <v-btn
          :disabled="!target"
          :color="target && isAlly(target.profile_id) ? 'amber' : undefined"
          :prepend-icon="target && isAlly(target.profile_id) ? 'mdi-star' : 'mdi-star-outline'"
          variant="tonal"
          @click="markTargetAlly"
        >
          {{ target && isAlly(target.profile_id) ? '已是友军' : '标记友军' }}
        </v-btn>

        <v-switch
          :model-value="tracking"
          color="primary"
          label="追踪"
          hide-details
          density="compact"
          :disabled="!target"
          @update:model-value="(v: unknown) => setTracking(!!v)"
        />

        <v-progress-circular v-if="loading" indeterminate size="20" width="2" />
      </div>
      <v-alert v-if="error" type="warning" density="compact" class="mt-2" :text="`拉取失败：${error}（保留当前数据）`" />
    </v-card>

    <!-- 对局情报栏 -->
    <template v-if="game">
      <div class="d-flex align-center justify-center ga-4 mb-2 game-meta">
        <v-chip size="small" prepend-icon="mdi-map">{{ gameMeta!.map }}</v-chip>
        <v-chip size="small">{{ gameMeta!.kind }}</v-chip>
        <v-chip size="small" prepend-icon="mdi-server">{{ gameMeta!.server }}</v-chip>
        <v-chip size="small" :color="gameMeta!.ongoing ? 'green' : undefined">
          {{ gameMeta!.ongoing ? '进行中' : '已结束' }}
        </v-chip>
        <span class="text-caption opacity-60">{{ gameMeta!.startedAt }}</span>
      </div>

      <div class="battle-columns">
        <div class="column">
          <div class="column-title friendly">友军</div>
          <PlayerCard
            v-for="p in friendlyTeam"
            :key="p.profile_id"
            :player="p"
            side="left"
            :tactic="getTactic(p.profile_id, p.civilization)"
            :is-ally="isAlly(p.profile_id)"
            @toggle-ally="toggleAlly(playerToAlly(p))"
          />
        </div>
        <v-divider vertical class="mx-1" />
        <div class="column">
          <div class="column-title enemy">敌军</div>
          <PlayerCard
            v-for="p in enemyTeams"
            :key="p.profile_id"
            :player="p"
            side="right"
            :tactic="getTactic(p.profile_id, p.civilization)"
            :is-ally="isAlly(p.profile_id)"
            @toggle-ally="toggleAlly(playerToAlly(p))"
          />
        </div>
      </div>

      <HistoryAnalysis style="margin-top: 12px;" :allies="allies" />

      <OpeningAnalysis :game-id="game.game_id" :enemies="enemyTeams" />
    </template>

    <v-empty-state
      v-else-if="!loading"
      icon="mdi-binoculars"
      title="尚无对局数据"
      text="搜索并选择目标玩家后，将自动拉取其最近一局对局信息"
    />
  </div>
</template>

<style scoped>
.scout-page {
  max-width: 1280px;
  margin: 0 auto;
}
.target-search {
  min-width: 280px;
  flex: 1;
}
.battle-columns {
  display: flex;
  align-items: stretch;
}
.column {
  flex: 1;
  min-width: 0;
}
.column-title {
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 6px;
  letter-spacing: 2px;
}
.column-title.friendly {
  color: #42a5f5;
  text-align: left;
}
.column-title.enemy {
  color: #ef5350;
  text-align: right;
}
</style>

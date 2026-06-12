<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PlayerInGame, SummaryPlayer } from '../types/aoe4world'
import { useLlmAnalysis } from '../stores/llm'
import { useTactics } from '../stores/tactics'

const props = defineProps<{ gameId: number; enemies: PlayerInGame[] }>()

const { settings, state, analyze } = useLlmAnalysis()
const { getTactic } = useTactics()

const showSettings = ref(false)

/** 各敌方玩家的开局数据（来自战术分析已拉取的 summary） */
const enemySummaries = computed<SummaryPlayer[]>(() =>
  props.enemies
    .map((p) => getTactic(p.profile_id, p.civilization)?.summaryPlayer)
    .filter((s): s is SummaryPlayer => !!s),
)

/** 无 summary 的敌方玩家（至少把文明名传进去） */
const fallbackEnemies = computed(() => {
  const withSummary = new Set(enemySummaries.value.map((s) => s.profileId))
  return props.enemies
    .filter((p) => !withSummary.has(p.profile_id) && getTactic(p.profile_id, p.civilization) === null)
    .map((p) => ({ profile_id: p.profile_id, name: p.name, civilization: p.civilization }))
})

/** 战术数据是否仍在拉取中 */
const dataPending = computed(() =>
  props.enemies.some((p) => getTactic(p.profile_id, p.civilization) === undefined),
)

const isCurrent = computed(() => state.gameId === props.gameId)

function onGenerate() {
  analyze(props.gameId, enemySummaries.value, fallbackEnemies.value)
}

// 自动分析：数据就绪后（dataPending 变为 false）且设置开启，自动触发一次
watch(dataPending, (pending) => {
  if (!pending && settings.autoAnalyze && !isCurrent.value && !state.loading) {
    onGenerate()
  }
})

// ─── 轻量 Markdown → HTML ──────────────────────────────────────────
function renderMd(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // 标题
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    // 粗体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 列表项
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // 将连续 li 包裹成 ul
    .replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, (m) => `<ul>${m}</ul>`)
    // 水平线
    .replace(/^---$/gm, '<hr>')
    // 换行：两个连续换行 → 段落间距
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    // 包一层 p
    .replace(/^/, '<p>').replace(/$/, '</p>')
    // 去掉 h/ul/hr 外多余的 p 标签
    .replace(/<p>(<h[2-4]>|<ul>|<hr>)/g, '$1')
    .replace(/(<\/h[2-4]>|<\/ul>|<hr>)<\/p>/g, '$1')
    .replace(/<p><\/p>/g, '')
}
</script>

<template>
  <v-card v-if="enemies.length" class="opening-card mb-3" variant="tonal">
    <div class="head">
      <div class="title">
        <v-icon size="18" class="mr-1">mdi-robot-outline</v-icon>
        开局分析报告
      </div>
      <div class="actions">
        <v-btn
          size="small"
          variant="tonal"
          color="primary"
          :loading="state.loading"
          :disabled="dataPending && !enemySummaries.length && !fallbackEnemies.length"
          prepend-icon="mdi-creation"
          @click="onGenerate"
        >
          {{ isCurrent && state.report ? '重新生成' : '生成分析' }}
        </v-btn>
        <v-btn
          size="small"
          variant="text"
          icon="mdi-cog-outline"
          @click="showSettings = !showSettings"
        />
      </div>
    </div>

    <v-expand-transition>
      <div v-if="showSettings" class="settings">
        <v-text-field
          v-model="settings.endpoint"
          label="LLM 端点（OpenAI 兼容 chat/completions）"
          density="compact"
          variant="outlined"
          hide-details
        />
        <v-text-field
          v-model="settings.apiKey"
          label="API Key"
          type="password"
          density="compact"
          variant="outlined"
          hide-details
        />
        <v-text-field
          v-model="settings.model"
          label="模型"
          density="compact"
          variant="outlined"
          hide-details
        />
        <v-switch
          v-model="settings.autoAnalyze"
          label="数据就绪后自动生成分析"
          density="compact"
          color="primary"
          hide-details
          class="auto-switch"
        />
      </div>
    </v-expand-transition>

    <v-alert
      v-if="state.error"
      type="warning"
      density="compact"
      class="mt-2"
      :text="`分析失败：${state.error}`"
    />

    <div v-if="state.loading" class="hint">
      <v-progress-circular indeterminate size="16" width="2" class="mr-2" />
      正在分析对方开局……
    </div>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-else-if="isCurrent && state.report" class="report" v-html="renderMd(state.report)" />
    <div v-else-if="dataPending" class="hint">正在拉取敌方对局数据……</div>
    <div v-else-if="!enemySummaries.length && !fallbackEnemies.length" class="hint">
      暂无敌方数据
    </div>
    <div v-else class="hint">
      已就绪：{{ enemySummaries.length }}/{{ enemies.length }} 名有完整开局数据，点击"生成分析"
    </div>
  </v-card>
</template>

<style scoped>
.opening-card {
  padding: 12px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.title {
  display: flex;
  align-items: center;
  font-weight: 700;
}
.actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.settings {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr;
  gap: 8px;
  margin-top: 10px;
  align-items: center;
}
.auto-switch {
  grid-column: 1 / -1;
}
.hint {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  opacity: 0.7;
  margin-top: 10px;
}
.report {
  margin-top: 10px;
  font-size: 0.88rem;
  line-height: 1.65;
}
.report :deep(h2),
.report :deep(h3),
.report :deep(h4) {
  margin: 10px 0 4px;
  font-size: 0.92rem;
}
.report :deep(h2) { font-size: 1rem; }
.report :deep(ul) {
  padding-left: 18px;
  margin: 4px 0;
}
.report :deep(li) { margin: 2px 0; }
.report :deep(strong) { font-weight: 700; }
.report :deep(p) { margin: 4px 0; }
.report :deep(hr) {
  border: none;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  margin: 8px 0;
}
@media (max-width: 900px) {
  .settings {
    grid-template-columns: 1fr;
  }
}
</style>

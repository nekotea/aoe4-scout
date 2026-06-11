<script setup lang="ts">
import { computed } from 'vue'
import type { TacticData } from '../types/aoe4world'

const props = defineProps<{ tactic: TacticData }>()

const W = 600
const H = 100
const T_MAX = 900 // 15 分钟
// 横线价值刻度：1000 以下每 200 一条，1000–5000 每 1000 一条，5000 以上每 5000 一条
function valueTicks(max: number): number[] {
  const ticks: number[] = []
  for (let v = 200; v < max && v < 1000; v += 200) ticks.push(v)
  for (let v = 1000; v < max && v <= 5000; v += 1000) ticks.push(v)
  for (let v = 10000; v < max; v += 5000) ticks.push(v)
  return ticks
}

const vMax = computed(() => {
  const peak = Math.max(...props.tactic.military, 1)
  // 向上取整到刻度步长的倍数
  const step = peak < 1000 ? 200 : peak < 5000 ? 1000 : 5000
  return Math.max(Math.ceil(peak / step) * step, 200)
})

const x = (t: number) => (t / T_MAX) * W
const y = (v: number) => H - (v / vMax.value) * H

const curvePoints = computed(() =>
  props.tactic.timestamps.map((t, i) => `${x(t).toFixed(1)},${y(props.tactic.military[i] ?? 0).toFixed(1)}`).join(' '),
)

const areaPoints = computed(() => {
  const ts = props.tactic.timestamps
  if (!ts.length) return ''
  return `${x(ts[0]).toFixed(1)},${H} ${curvePoints.value} ${x(ts[ts.length - 1]).toFixed(1)},${H}`
})

// 时间轴：每 1 分钟一条虚线，每 5 分钟一条实线
const vLines = computed(() => {
  const lines: { x: number; major: boolean }[] = []
  for (let t = 60; t < T_MAX; t += 60) lines.push({ x: x(t), major: t % 300 === 0 })
  return lines
})

const hLines = computed(() =>
  valueTicks(vMax.value).map((v) => ({ value: v, y: y(v) })),
)

function fmtValue(v: number): string {
  return v >= 1000 ? `${v / 1000}k` : String(v)
}

const AGE_LABEL: Record<number, string> = { 2: 'Ⅱ', 3: 'Ⅲ', 4: 'Ⅳ' }
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="tactic-chart">
    <!-- 辅助线 -->
    <line
      v-for="l in vLines"
      :key="`v${l.x}`"
      :x1="l.x" y1="0" :x2="l.x" :y2="H"
      class="grid"
      :class="l.major ? 'grid-major' : 'grid-minor'"
    />
    <g v-for="l in hLines" :key="`h${l.value}`">
      <line x1="0" :y1="l.y" :x2="W" :y2="l.y" class="grid" />
      <text x="3" :y="l.y - 2" class="value-label">{{ fmtValue(l.value) }}</text>
    </g>
    <!-- 军事价值曲线 -->
    <polygon :points="areaPoints" class="area" />
    <polyline :points="curvePoints" class="curve" />
    <!-- 升本时间点（时间轴标记） -->
    <g v-for="a in tactic.ageUps" :key="a.age">
      <line :x1="x(a.at)" :y1="H - 14" :x2="x(a.at)" :y2="H" class="age-tick" />
      <text :x="x(a.at)" :y="H - 16" text-anchor="middle" class="age-label">{{ AGE_LABEL[a.age] }}</text>
    </g>
  </svg>
</template>

<style scoped>
.tactic-chart {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.grid {
  stroke: currentColor;
  stroke-opacity: 0.08;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.grid-minor {
  stroke-dasharray: 3 3;
  stroke-opacity: 0.06;
}
.grid-major {
  stroke-opacity: 0.14;
}
.area {
  fill: #ef9a3c;
  fill-opacity: 0.10;
}
.curve {
  fill: none;
  stroke: #ef9a3c;
  stroke-opacity: 0.45;
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}
.age-tick {
  stroke: #ffd54f;
  stroke-opacity: 0.8;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}
.age-label {
  fill: #ffd54f;
  fill-opacity: 0.9;
  font-size: 13px;
  font-weight: 700;
}
.value-label {
  fill: currentColor;
  fill-opacity: 0.35;
  font-size: 9px;
}
</style>

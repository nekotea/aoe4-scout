import { ref, shallowRef } from 'vue'
import type { Game, PlayerSummary } from '../types/aoe4world'
import { getLastGame } from '../api/aoe4world'

const POLL_INTERVAL = 30_000

const target = shallowRef<PlayerSummary | null>(null)
const game = shallowRef<Game | null>(null)
const tracking = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
let timer: ReturnType<typeof setInterval> | null = null

/** 拉取最新对局；失败或轮询期间都不清空已有数据 */
async function fetchNow() {
  const t = target.value
  if (!t || loading.value) return
  loading.value = true
  error.value = null
  try {
    const g = await getLastGame(t.profile_id)
    // 目标可能在请求期间被切换，丢弃过期响应
    if (target.value?.profile_id === t.profile_id) {
      if (!game.value || game.value.game_id !== g.game_id || game.value.updated_at !== g.updated_at) {
        game.value = g
      }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function stopPolling() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function startPolling() {
  stopPolling()
  timer = setInterval(fetchNow, POLL_INTERVAL)
}

function setTracking(on: boolean) {
  tracking.value = on
  on ? startPolling() : stopPolling()
}

function setTarget(p: PlayerSummary | null) {
  target.value = p
  game.value = null
  error.value = null
  if (p) {
    fetchNow()
    if (tracking.value) startPolling()
  } else {
    stopPolling()
  }
}

// 全局单例：切换页面不中断追踪轮询
export function useScout() {
  return { target, game, tracking, loading, error, fetchNow, setTarget, setTracking }
}

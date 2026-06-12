import { reactive } from 'vue'
import type { TacticData } from '../types/aoe4world'
import { fetchPlayerSummary } from '../api/summary'

const CUTOFF = 900 // 前 15 分钟

/** key: `${profileId}:${civ}` */
const cache = reactive<Record<string, TacticData | null>>({})
const pending = new Set<string>()

const AGE_ACTIONS: { key: string; age: 2 | 3 | 4 }[] = [
  { key: 'feudalAge', age: 2 },
  { key: 'castleAge', age: 3 },
  { key: 'imperialAge', age: 4 },
]

async function load(profileId: number, civ: string): Promise<void> {
  const key = `${profileId}:${civ}`
  if (key in cache || pending.has(key)) return
  pending.add(key)
  try {
    const summary = await fetchPlayerSummary(profileId, civ)
    const me = summary?.players.find((p) => p.profileId === profileId)
    if (!summary || !me?.resources?.timestamps?.length) {
      cache[key] = null
      return
    }
    const { timestamps, military } = me.resources
    const end = timestamps.findIndex((t) => t > CUTOFF)
    const cut = end === -1 ? timestamps.length : end
    cache[key] = {
      gameId: summary.gameId,
      civilization: civ,
      timestamps: timestamps.slice(0, cut),
      military: (military ?? []).slice(0, cut),
      ageUps: AGE_ACTIONS.flatMap(({ key: ak, age }) => {
        const at = me.actions?.[ak]?.[0]
        return at != null && at <= CUTOFF ? [{ age, at }] : []
      }),
      summaryPlayer: me,
    }
  } catch {
    // 拉取失败不缓存，下次仍可重试
  } finally {
    pending.delete(key)
  }
}

export function useTactics() {
  function getTactic(profileId: number, civ: string): TacticData | null | undefined {
    return cache[`${profileId}:${civ}`]
  }
  return { cache, load, getTactic }
}

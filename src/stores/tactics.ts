import { reactive } from 'vue'
import type { Game, PlayerInGame, TacticData } from '../types/aoe4world'
import { getPlayerGames, getGameSummary } from '../api/aoe4world'

const CUTOFF = 900 // 前 15 分钟

/** key: `${profileId}:${civ}` */
const cache = reactive<Record<string, TacticData | null>>({})
const pending = new Set<string>()

const AGE_ACTIONS: { key: string; age: 2 | 3 | 4 }[] = [
  { key: 'feudalAge', age: 2 },
  { key: 'castleAge', age: 3 },
  { key: 'imperialAge', age: 4 },
]

/**
 * 战术分析：在该玩家最近的同文明对局（最多回溯 10 盘）中，
 * 取最近一局已完成的，拉取 summary 并截取前 15 分钟军事曲线与升本点。
 */
async function load(profileId: number, civ: string): Promise<void> {
  const key = `${profileId}:${civ}`
  if (key in cache || pending.has(key)) return
  pending.add(key)
  try {
    const games = await getPlayerGames(profileId, 50)
    // games 列表接口的 team 成员包了一层 {player: {...}}，games/last 则没有
    const flatPlayers = (g: Game): PlayerInGame[] =>
      g.teams.flat().map((p) => ('player' in p ? (p as unknown as { player: PlayerInGame }).player : p))
    // 该玩家使用同文明的最近 10 盘
    const sameCiv = games
      .filter((g) => flatPlayers(g).some((p) => p.profile_id === profileId && p.civilization === civ))
      .slice(0, 10)
    // 依次尝试已完成对局，部分对局可能没有 summary（404）
    let summary = null
    for (const g of sameCiv.filter((x) => !x.ongoing)) {
      try {
        summary = await getGameSummary(profileId, g.game_id)
        break
      } catch {
        /* 该局无 summary，尝试更早一局 */
      }
    }
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

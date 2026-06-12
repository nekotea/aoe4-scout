import type { Game, GameSummary, PlayerInGame } from '../types/aoe4world'
import { getPlayerGames, getGameSummary } from './aoe4world'

// ─── Semaphore ────────────────────────────────────────────────────────────────

class Semaphore {
  private count: number
  private waiters: (() => void)[] = []

  constructor(capacity: number) {
    this.count = capacity
  }

  acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--
      return Promise.resolve()
    }
    return new Promise((resolve) => this.waiters.push(resolve))
  }

  release(): void {
    const next = this.waiters.shift()
    if (next) {
      next()
    } else {
      this.count++
    }
  }
}

/** 全局并发限制：最多同时处理 5 名玩家的 summary 拉取 */
const sem = new Semaphore(5)

const MIN_DURATION = 900 // 15 分钟，秒

// games 列表接口的 team 成员包了一层 {player:{...}}，游戏列表页面则没有
function flatPlayers(g: Game): PlayerInGame[] {
  return g.teams
    .flat()
    .map((p) => ('player' in p ? (p as unknown as { player: PlayerInGame }).player : p))
}

/**
 * 对单局比赛，依次用局内每个玩家的 id 尝试拉取 summary。
 * 如果目标玩家（profileId）隐藏了战绩，会 fallback 到队友/对手，
 * 直到某个玩家的请求成功为止。
 */
export async function fetchGameSummary(
  game: Game,
  profileId: number,
): Promise<GameSummary | null> {
  const players = flatPlayers(game)
  // 目标玩家排在最前，优先用自己的视角
  const ordered = [
    ...players.filter((p) => p.profile_id === profileId),
    ...players.filter((p) => p.profile_id !== profileId),
  ]
  for (const p of ordered) {
    try {
      return await getGameSummary(p.profile_id, game.game_id)
    } catch {
      /* 该玩家无权限，尝试下一个 */
    }
  }
  return null
}

/**
 * 为目标玩家获取一份可用的 GameSummary。
 *
 * 流程：
 * 1. 获取该玩家最近 50 局对局，过滤出同文明、时长 > 15 分钟、已结束的前 10 局。
 * 2. 对每局依次调用 fetchGameSummary（含 fallback 逻辑）。
 * 3. 得到第一份有效 summary 即返回。
 *
 * 持有全局 Semaphore 槽位直到拿到数据（或全部失败），确保并发不超过 5。
 */
export async function fetchPlayerSummary(
  profileId: number,
  civ: string,
): Promise<GameSummary | null> {
  await sem.acquire()
  try {
    const games = await getPlayerGames(profileId, 50)
    const candidates = games
      .filter(
        (g) =>
          !g.ongoing &&
          g.duration != null &&
          g.duration > MIN_DURATION &&
          flatPlayers(g).some((p) => p.profile_id === profileId && p.civilization === civ),
      )
      .slice(0, 10)

    for (const g of candidates) {
      const summary = await fetchGameSummary(g, profileId)
      if (summary) return summary
    }
    return null
  } finally {
    sem.release()
  }
}

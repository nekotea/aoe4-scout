import { computed, reactive, ref } from 'vue'
import type { Game, PlayerInGame, StoredAlly } from '../types/aoe4world'
import { getPlayerGames } from '../api/aoe4world'

const HISTORY_LIMIT = 200

interface HistoryCell {
  wins: number
  losses: number
}

interface PairCount {
  a: number
  b: number
  count: number
}

const gameId = ref<number | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const enemyPlayers = ref<PlayerInGame[]>([])
const enemyGames = reactive<Record<number, Game[]>>({})

function playersOf(game: Game): PlayerInGame[] {
  return game.teams.flat().map((p) => ('player' in p ? (p as unknown as { player: PlayerInGame }).player : p))
}

function teamHas(game: Game, teamIndex: number, profileId: number): boolean {
  return game.teams[teamIndex]?.some((p) => {
    const player = 'player' in p ? (p as unknown as { player: PlayerInGame }).player : p
    return player.profile_id === profileId
  }) ?? false
}

function sameTeam(game: Game, a: number, b: number): boolean {
  return game.teams.some((_, teamIndex) => teamHas(game, teamIndex, a) && teamHas(game, teamIndex, b))
}

function playerTeamIndex(game: Game, profileId: number): number | null {
  const index = game.teams.findIndex((_, teamIndex) => teamHas(game, teamIndex, profileId))
  return index >= 0 ? index : null
}

function playerResult(game: Game, profileId: number): PlayerInGame['result'] | null {
  return playersOf(game).find((p) => p.profile_id === profileId)?.result ?? null
}

function uniqueGames(games: Game[]): Game[] {
  const seen = new Set<number>()
  return games.filter((game) => {
    if (seen.has(game.game_id)) return false
    seen.add(game.game_id)
    return true
  })
}

const pairCounts = computed<PairCount[]>(() => {
  const ids = enemyPlayers.value.map((p) => p.profile_id)
  const rows: PairCount[] = []
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]
      const b = ids[j]
      const games = uniqueGames([...(enemyGames[a] ?? []), ...(enemyGames[b] ?? [])])
      rows.push({ a, b, count: games.filter((game) => sameTeam(game, a, b)).length })
    }
  }
  return rows
})

const isGrouped = computed(() => pairCounts.value.some((pair) => pair.count > 0))

function getPairCount(a: number, b: number): number | null {
  if (a === b) return null
  return pairCounts.value.find((pair) =>
    (pair.a === a && pair.b === b) || (pair.a === b && pair.b === a),
  )?.count ?? 0
}

function getRecord(allyId: number, enemyId: number): HistoryCell {
  const record: HistoryCell = { wins: 0, losses: 0 }
  for (const game of enemyGames[enemyId] ?? []) {
    const allyTeam = playerTeamIndex(game, allyId)
    const enemyTeam = playerTeamIndex(game, enemyId)
    if (allyTeam == null || enemyTeam == null || allyTeam === enemyTeam) continue
    const result = playerResult(game, allyId)
    if (result === 'win') record.wins += 1
    else if (result === 'loss') record.losses += 1
  }
  return record
}

function getSummary(allies: StoredAlly[]) {
  let wins = 0
  let losses = 0
  for (const ally of allies) {
    for (const enemy of enemyPlayers.value) {
      const record = getRecord(ally.profile_id, enemy.profile_id)
      wins += record.wins
      losses += record.losses
    }
  }
  const battleCount = wins + losses
  const winRate = battleCount > 0 ? (wins / battleCount) * 100 : null
  let comment = '暂无历史交手记录，先按陌生对手处理。'
  if (winRate != null) {
    if (winRate >= 66) comment = '实属手下败将，不足挂齿。'
    else if (winRate >= 33) comment = '与我方互有胜负。'
    else if (winRate >= 5) comment = '敌人相当凶猛，得坐起来打。'
    else comment = '我军根本没赢过，要么还是退了保颜面吧……'
  }
  return { battleCount, wins, losses, winRate, comment }
}

async function loadForGame(nextGameId: number, enemies: PlayerInGame[]): Promise<void> {
  if (gameId.value === nextGameId) return
  gameId.value = nextGameId
  enemyPlayers.value = enemies
  error.value = null
  loading.value = true
  for (const key of Object.keys(enemyGames)) delete enemyGames[Number(key)]
  try {
    await Promise.all(enemies.map(async (enemy) => {
      enemyGames[enemy.profile_id] = await getPlayerGames(enemy.profile_id, HISTORY_LIMIT)
    }))
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

export function useHistoryAnalysis() {
  return {
    gameId,
    loading,
    error,
    enemyPlayers,
    enemyGames,
    pairCounts,
    isGrouped,
    getPairCount,
    getRecord,
    getSummary,
    loadForGame,
  }
}

import type { Game, GamesListResponse, GameSummary, PlayersSearchResponse, PlayerSummary } from '../types/aoe4world'

const ORIGIN = 'https://aoe4world.com'

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/**
 * Tauri 环境下走 Rust 侧 HTTP（@tauri-apps/plugin-http），完全绕过 webview 的
 * CORS 限制（summary 端点没有 CORS 放行）；浏览器环境用原生 fetch。
 */
async function smartFetch(url: string): Promise<Response> {
  if (isTauri) {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http')
    return tauriFetch(url)
  }
  return fetch(url)
}

async function get<T>(path: string): Promise<T> {
  const res = await smartFetch(`${ORIGIN}/api/v0${path}`)
  if (!res.ok) throw new Error(`aoe4world API ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

/** 远端玩家搜索建议 */
export async function searchPlayers(query: string): Promise<PlayerSummary[]> {
  const data = await get<PlayersSearchResponse>(
    `/players/search?query=${encodeURIComponent(query)}`,
  )
  return data.players ?? []
}

/** 拉取某玩家最近一局（含双方完整数据） */
export function getLastGame(profileId: number): Promise<Game> {
  return get<Game>(`/players/${profileId}/games/last`)
}

/** 拉取某玩家最近对局列表 */
export async function getPlayerGames(profileId: number, limit = 50): Promise<Game[]> {
  const data = await get<GamesListResponse>(`/players/${profileId}/games?limit=${limit}`)
  return data.games ?? []
}

/**
 * 拉取对局详情。summary 端点不在 /api/v0 下且无 CORS 放行：
 * - Tauri：smartFetch 走 Rust 侧，直连无碍
 * - 浏览器：走本地代理 /aoe4world（见 vite.config.ts）
 */
export async function getGameSummary(profileId: number, gameId: number): Promise<GameSummary> {
  const base = isTauri ? ORIGIN : '/aoe4world'
  const res = await smartFetch(`${base}/players/${profileId}/games/${gameId}/summary?camelize=true`)
  if (!res.ok) throw new Error(`aoe4world summary ${res.status}`)
  return res.json() as Promise<GameSummary>
}

// ─── Rank levels ─────────────────────────────────────────────────────────────

export type RankLevel =
  | 'conqueror_3'
  | 'conqueror_2'
  | 'conqueror_1'
  | 'diamond_3'
  | 'diamond_2'
  | 'diamond_1'
  | 'platinum_3'
  | 'platinum_2'
  | 'platinum_1'
  | 'gold_3'
  | 'gold_2'
  | 'gold_1'
  | 'silver_3'
  | 'silver_2'
  | 'silver_1'
  | 'unranked'

// RP 区间推算见 src/utils/rank.ts 的 rankLevelFromRating

// ─── Shared mode stats ───────────────────────────────────────────────────────

export interface RatingHistoryEntry {
  rating: number
  streak: number | null
  wins_count: number
  games_count: number
  drops_count?: number
  disputes_count?: number
  orig_rating?: number
}

export interface SeasonStats {
  rating: number
  rank: number | null
  rank_level: RankLevel | null
  streak: number
  games_count: number
  wins_count: number
  losses_count: number
  disputes_count: number
  drops_count: number
  last_game_at: string
  win_rate: number
  season: number
}

export interface ModeStats {
  rating?: number
  max_rating?: number
  max_rating_7d?: number
  max_rating_1m?: number
  rank?: number | null
  rank_level: RankLevel | null
  streak: number
  games_count: number
  wins_count: number
  losses_count?: number
  disputes_count?: number
  drops_count?: number
  last_game_at?: string
  win_rate?: number
  /** keyed by unix timestamp string */
  rating_history?: Record<string, RatingHistoryEntry>
  season?: number
  previous_seasons?: SeasonStats[]
}

// ─── Player modes ────────────────────────────────────────────────────────────

export interface PlayerModes {
  rm_solo?: ModeStats
  rm_team?: ModeStats
  rm_1v1_elo?: ModeStats
  rm_2v2_elo?: ModeStats
  rm_3v3_elo?: ModeStats
  rm_4v4_elo?: ModeStats
  qm_1v1?: ModeStats
  qm_2v2?: ModeStats
  qm_3v3?: ModeStats
  qm_4v4?: ModeStats
  qm_ffa?: ModeStats
  /** @deprecated use rm_solo */
  rm_1v1?: ModeStats
}

// ─── Player in a game ────────────────────────────────────────────────────────

export type GameResult = 'win' | 'loss' | 'unknown'

export interface PlayerAvatars {
  small: string
  medium: string
  full: string
}

export interface PlayerSocial {
  twitch?: string
  twitter?: string
  youtube?: string
  instagram?: string
  liquipedia?: string
}

export interface PlayerInGame {
  result: GameResult
  civilization: string
  civilization_randomized: boolean
  rating: number
  rating_diff: number | null
  mmr: number
  mmr_diff: number | null
  input_type: string
  twitch_video_url: string | null
  name: string
  profile_id: number
  steam_id: string
  site_url: string
  avatars: PlayerAvatars
  country: string | null
  social: PlayerSocial
  modes: PlayerModes
}

// ─── Game ─────────────────────────────────────────────────────────────────────

export type GameKind =
  | 'rm_1v1'
  | 'rm_2v2'
  | 'rm_3v3'
  | 'rm_4v4'
  | 'qm_1v1'
  | 'qm_2v2'
  | 'qm_3v3'
  | 'qm_4v4'
  | 'qm_ffa'

export type LeaderboardKey =
  | 'rm_solo'
  | 'rm_team'
  | 'rm_1v1_elo'
  | 'rm_2v2_elo'
  | 'rm_3v3_elo'
  | 'rm_4v4_elo'
  | 'qm_1v1'
  | 'qm_2v2'
  | 'qm_3v3'
  | 'qm_4v4'
  | 'qm_ffa'

export interface GameFilters {
  profile_ids: number[]
}

export interface Game {
  filters: GameFilters
  game_id: number
  started_at: string
  updated_at: string
  duration: number | null
  map: string
  kind: GameKind
  leaderboard: LeaderboardKey
  mmr_leaderboard: string
  season: number
  server: string
  patch: number
  average_rating: number | null
  average_rating_deviation: number | null
  average_mmr: number | null
  average_mmr_deviation: number | null
  ongoing: boolean
  just_finished: boolean
  /** teams[0] = one side, teams[1] = other side; each side is an array of players */
  teams: PlayerInGame[][]
}

// ─── Search / player summary (aoe4world /players search endpoint) ─────────────

export interface PlayerSummary {
  name: string
  profile_id: number
  steam_id: string | null
  site_url: string
  avatars: PlayerAvatars
  country: string | null
  social: PlayerSocial
  modes: PlayerModes
  last_game_at?: string
}

export interface PlayersSearchResponse {
  players: PlayerSummary[]
  count: number
  page: number
  per_page: number
}

// ─── Games list (/players/{id}/games) ─────────────────────────────────────────

export interface GamesListResponse {
  games: Game[]
  count: number
  page: number
  per_page: number
}

// ─── Game summary (/players/{id}/games/{gid}/summary?camelize=true) ───────────

export interface SummaryResources {
  timestamps: number[]
  /** 各项分数随时间变化，与 timestamps 等长 */
  military: number[]
  economy: number[]
  technology: number[]
  society: number[]
  total: number[]
  /** 资源存量随时间变化 */
  food?: number[]
  gold?: number[]
  wood?: number[]
  stone?: number[]
  /** 累计采集量随时间变化 */
  foodGathered?: number[]
  goldGathered?: number[]
  woodGathered?: number[]
  stoneGathered?: number[]
}

export interface BuildOrderItem {
  id: string
  /** 如 icons/races/jin/units/mounted_villager，末段即名称 */
  icon: string
  pbgid: number
  type: 'Unit' | 'Building' | 'Technology' | 'Animal' | string
  /** 各次完成时间（秒）；起始单位为 0 */
  finished: number[]
  constructed: number[]
}

export interface SummaryLandmark {
  pbgid: number
  gameTime: number
  minAge: number
  /** 非 null 表示该地标用于升本，值为升到的时代 */
  newAge: number | null
  name: string
  icon: string
}

export interface SummaryPlayer {
  profileId: number
  name: string
  civilization: string
  team: number
  apm: number
  result: 'win' | 'loss' | string
  /** key 如 feudalAge / castleAge / imperialAge，值为发生时间（秒）数组 */
  actions: Record<string, number[]>
  resources: SummaryResources
  buildOrder?: BuildOrderItem[]
  analysis?: { landmarks?: SummaryLandmark[] }
}

export interface GameSummary {
  gameId: number
  duration: number
  mapName: string
  leaderboard: string
  players: SummaryPlayer[]
}

// ─── 战术分析（前端推导） ──────────────────────────────────────────────────────

export interface TacticData {
  /** 来源对局 id */
  gameId: number
  civilization: string
  /** 截取前 15 分钟的采样点 */
  timestamps: number[]
  military: number[]
  /** 升本时间（秒）：feudal/castle/imperial，未升则缺省 */
  ageUps: { age: 2 | 3 | 4; at: number }[]
  /** 该玩家在来源对局中的原始 summary 数据，供 LLM 开局分析使用 */
  summaryPlayer: SummaryPlayer
}

// ─── Locally stored ally ──────────────────────────────────────────────────────

export interface StoredAlly {
  profile_id: number
  name: string
  country: string | null
  avatars: PlayerAvatars
  added_at: number
}

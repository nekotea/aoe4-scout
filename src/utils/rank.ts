import type { RankLevel } from '../types/aoe4world'

const RANK_THRESHOLDS: [number, RankLevel][] = [
  [1600, 'conqueror_3'],
  [1500, 'conqueror_2'],
  [1400, 'conqueror_1'],
  [1350, 'diamond_3'],
  [1300, 'diamond_2'],
  [1200, 'diamond_1'],
  [1150, 'platinum_3'],
  [1100, 'platinum_2'],
  [1000, 'platinum_1'],
  [900,  'gold_3'],
  [850,  'gold_2'],
  [800,  'gold_1'],
  [700,  'silver_3'],
  [650,  'silver_2'],
  [600,  'silver_1'],
]

export function rankLevelFromRating(rating: number): RankLevel {
  for (const [threshold, level] of RANK_THRESHOLDS) {
    if (rating >= threshold) return level
  }
  return 'unranked'
}

export interface RankDisplay {
  tier: string   // '征服者' | '钻石' | '白金' | '黄金' | '白银'
  division: number // 1 | 2 | 3
  label: string  // '征服者 III'
}

const RANK_DISPLAY: Record<RankLevel, RankDisplay | null> = {
  conqueror_3:  { tier: '征服者', division: 3, label: '征服者 III' },
  conqueror_2:  { tier: '征服者', division: 2, label: '征服者 II' },
  conqueror_1:  { tier: '征服者', division: 1, label: '征服者 I' },
  diamond_3:    { tier: '钻石',   division: 3, label: '钻石 III' },
  diamond_2:    { tier: '钻石',   division: 2, label: '钻石 II' },
  diamond_1:    { tier: '钻石',   division: 1, label: '钻石 I' },
  platinum_3:   { tier: '白金',   division: 3, label: '白金 III' },
  platinum_2:   { tier: '白金',   division: 2, label: '白金 II' },
  platinum_1:   { tier: '白金',   division: 1, label: '白金 I' },
  gold_3:       { tier: '黄金',   division: 3, label: '黄金 III' },
  gold_2:       { tier: '黄金',   division: 2, label: '黄金 II' },
  gold_1:       { tier: '黄金',   division: 1, label: '黄金 I' },
  silver_3:     { tier: '白银',   division: 3, label: '白银 III' },
  silver_2:     { tier: '白银',   division: 2, label: '白银 II' },
  silver_1:     { tier: '白银',   division: 1, label: '白银 I' },
  unranked:     null,
}

export function getRankDisplay(level: RankLevel | null): RankDisplay | null {
  if (!level) return null
  return RANK_DISPLAY[level] ?? null
}

/** 从 previous_seasons 中找历史最高 rating 及其赛季 */
export function getCareerPeak(previousSeasons: Array<{ rating: number; season: number }> | undefined): { rating: number; season: number } | null {
  if (!previousSeasons?.length) return null
  return previousSeasons.reduce((best, s) =>
    s.rating > best.rating ? s : best
  )
}

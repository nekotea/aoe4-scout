import { reactive, watch } from 'vue'
import type { SummaryPlayer } from '../types/aoe4world'

const LS_KEY = 'aoe4scout.llm.settings'
const CUTOFF = 900 // 前 15 分钟

export interface LlmSettings {
  endpoint: string
  apiKey: string
  model: string
  autoAnalyze: boolean
  autoSpeak: boolean
}

// 单位中文名对照表（内嵌，避免运行时读文件）
const UNIT_DICT = `
通用单位：Villager=村民/农民，Scout=斥候/侦察兵，Archer=弓箭手，Spearman=长矛兵/叉子，Horseman=骑手/肉马，Man-at-Arms=重装步兵/重步，Crossbowman=弩手，Handcannoneer=火枪手，Knight=骑士，Lancer=枪骑兵，Monk=僧侣/老头，Trader=商人
攻城：Battering Ram=冲车，Mangonel=投石机/拍子，Springald=弩炮/弩车，Bombard=火炮，Culverin=长管炮，Counterweight Trebuchet=配重投石机/巨投
英格兰：Longbowman=长弓兵，Wynguard Ranger=温嘉德长弓，Wynguard Footman=温嘉德斧王，Ribauldequin=风琴炮
法兰西：Royal Knight=皇家骑士，Arbalétrier=皇家弩手/盾弩，Royal Culverin=皇家长管炮
神圣罗马帝国：Prelate=教长/老头，Landsknecht=双手剑士/国土佣仆，Black Rider=黑骑士
蒙古：Mangudai=蒙古突骑/突骑，Keshik=怯薛，Traction Trebuchet=牵引投石机/小巨投
中国：Imperial Official=税吏/狗官，Zhuge Nu=诸葛弩手，Palace Guard=羽林军/关刀，Fire Lancer=火枪骑兵，Nest of Bees=神机箭/蜂巢
朱熹之遗：Shaolin Monk=少林僧，Yuan Raider=元朝掠夺者/白马
日本：Samurai=武士，Mounted Samurai=骑马武士，Onna-Bugeisha=女武者/马弩，Shinobi=忍者，Yumi Ashigaru=弓足轻，Ozutsu=大筒
拜占庭：Cataphract=铁甲圣骑兵/圣骑，Varangian Guard=瓦兰吉卫队，Cheirosiphon=希腊火喷射器/喷火车
奥斯曼：Janissary=耶尼切里/苏丹亲兵，Sipahi=西帕希骑兵，Great Bombard=巨型火炮/巨炮
阿拔斯：Camel Archer=骆驼弓骑兵，Camel Rider=骆驼骑兵，Ghulam=古拉姆
阿尤布：Desert Raider=沙漠袭击者，Bedouin Skirmisher=贝都因标枪手，Camel Lancer=骆驼枪骑兵
龙骑：Gilded Spearman=镀金长矛兵/金矛，Gilded Archer=镀金弓箭手/金弓，Gilded Horseman=镀金骑手，Gilded Knight=镀金骑士/金骑
`.trim()

function loadSettings(): LlmSettings {
  const defaults: LlmSettings = {
    endpoint: 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions',
    apiKey: '',
    model: 'mimo-v2.5-pro',
    autoAnalyze: false,
    autoSpeak: false,
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<LlmSettings>) } : defaults
  } catch {
    return defaults
  }
}

const settings = reactive<LlmSettings>(loadSettings())
watch(settings, (v) => localStorage.setItem(LS_KEY, JSON.stringify(v)), { deep: true })

// ─── 数据预处理：把 summary 玩家数据整理成按分钟的时间线 ──────────────

function fmtTime(sec: number): string {
  return `${Math.floor(sec / 60)}分${sec % 60}秒`
}

function itemName(icon: string): string {
  return (icon.split('/').pop() ?? icon).replace(/_/g, ' ')
}

const TYPE_LABELS: Record<string, string> = { Building: '建筑', Unit: '单位', Technology: '科技' }

/** 单个玩家 → 提示词文本段 */
export function playerToPromptSection(p: SummaryPlayer): string {
  const lines: string[] = [`## 对方玩家：${p.name}（文明：${p.civilization}）`, `APM：${p.apm}`]

  // 地标全列出，标注用于升本的
  const landmarks = p.analysis?.landmarks ?? []
  if (landmarks.length) {
    lines.push('', '### 地标与升本')
    for (const l of landmarks) {
      const tag = l.newAge != null ? `【升至${l.newAge}本】` : ''
      lines.push(`- ${l.name}（${fmtTime(l.gameTime)}）${tag}`)
    }
  }

  // 资源快照：每分钟存量 + 本分钟采集增量（用 gathered 累计差值，避免消耗干扰）
  const res = p.resources
  const ts = res.timestamps ?? []
  const idxAt = (t: number) => {
    let idx = -1
    for (let i = 0; i < ts.length; i++) if (ts[i] <= t) idx = i
    return idx
  }
  type Snap = Record<string, { stock: number; delta: number }>
  const snapshots: Record<number, Snap> = {}
  const KINDS = [
    ['食', res.food, res.foodGathered],
    ['金', res.gold, res.goldGathered],
    ['木', res.wood, res.woodGathered],
    ['石', res.stone, res.stoneGathered],
  ] as const
  for (let min = 1; min <= 15; min++) {
    const i = idxAt(min * 60)
    const iPrev = idxAt((min - 1) * 60)
    if (i < 0) continue
    const snap: Snap = {}
    for (const [label, stock, gathered] of KINDS) {
      if (!stock?.length) continue
      snap[label] = {
        stock: stock[i] ?? 0,
        delta: (gathered?.[i] ?? 0) - (gathered?.[iPrev >= 0 ? iPrev : 0] ?? 0),
      }
    }
    if (Object.keys(snap).length) snapshots[min] = snap
  }

  // buildOrder 按分钟分桶，同类合并计数
  const buildByMinute: Record<number, Record<string, Record<string, number>>> = {}
  for (const item of p.buildOrder ?? []) {
    // Animal 无战术意义；Age/Upgrade 与地标升本、升级行重复
    if (item.type === 'Animal' || item.type === 'Age' || item.type === 'Upgrade') continue
    for (const t of item.finished) {
      if (t <= 0 || t > CUTOFF) continue
      const min = Math.ceil(t / 60)
      const name = itemName(item.icon)
      const byType = (buildByMinute[min] ??= {})
      const byName = (byType[item.type] ??= {})
      byName[name] = (byName[name] ?? 0) + 1
    }
  }

  // 科技升级按分钟分桶（actions 里 upgrade 前缀）
  const upgradeByMinute: Record<number, string[]> = {}
  for (const [key, times] of Object.entries(p.actions ?? {})) {
    if (!key.startsWith('upgrade')) continue
    const label = key.replace(/^upgrade/, '').replace(/([A-Z])/g, ' $1').trim()
    for (const t of times) {
      if (t > CUTOFF) continue
      const min = Math.ceil(Math.max(t, 1) / 60)
      ;(upgradeByMinute[min] ??= []).push(label)
    }
  }

  lines.push('', '### 开局时间线（前15分钟）')
  for (let min = 1; min <= 15; min++) {
    const snap = snapshots[min]
    const builds = buildByMinute[min]
    const upgrades = upgradeByMinute[min]
    if (!snap && !builds && !upgrades) continue
    lines.push('', `第${min}分钟：`)
    if (snap) {
      const parts = Object.entries(snap).map(([k, v]) => `${k}${v.stock}(本分钟+${v.delta})`)
      lines.push(`* 资源快照（存量+增量）：${parts.join(' ')}`)
    }
    if (builds) {
      for (const [type, items] of Object.entries(builds)) {
        const list = Object.entries(items)
          .map(([n, c]) => (c > 1 ? `${n}×${c}` : n))
          .join('、')
        lines.push(`* 建造${TYPE_LABELS[type] ?? type}：${list}`)
      }
    }
    if (upgrades?.length) lines.push(`* 升级：${upgrades.join('、')}`)
  }

  return lines.join('\n')
}

const SYSTEM_PROMPT =
  `你是一名《帝国时代4》战术分析师。根据对手开局数据，判断其战术意图并给出应对要点。用中文输出，语言简洁直接。
请使用以下社区常用译名：
${UNIT_DICT}`

/** 无 summary 的玩家仅生成文明说明行，有数据的走完整预处理 */
function playerToPromptSectionOrFallback(p: SummaryPlayer | { name: string; civilization: string }): string {
  if (!('resources' in p)) {
    return `## 对方玩家：${p.name}（文明：${p.civilization}）\n（无近期同文明完成局数据，仅供文明参考）`
  }
  return playerToPromptSection(p)
}

export function buildUserPrompt(
  summaries: SummaryPlayer[],
  fallbackPlayers: { name: string; civilization: string }[] = [],
): string {
  // 已有 summary 的玩家 id 集合，排除重复
  const summaryIds = new Set(summaries.map((p) => p.profileId))
  const allSections = [
    ...summaries.map(playerToPromptSectionOrFallback),
    ...fallbackPlayers
      .filter((p) => !summaryIds.has((p as { profile_id?: number }).profile_id ?? -1))
      .map(playerToPromptSectionOrFallback),
  ]
  const sections = allSections.join('\n\n---\n\n')
  return `以下是本局各敌方玩家近期对局的开局数据（前15分钟，资源增量按每分钟采集量统计），请分析他们的战术习惯。

${sections}

---

请输出:
第一部分： 战术简报，对每个玩家使用的战术进行逐个时代的总结，格式为：

[玩家名](玩家文明): [战术定性]。([t.min]分钟[t.sec]秒[地标名]上[k(二/三/四)]本，[n(单/双/三/n)]TC，[不种田|养牛|养羊|吃鹿]，[不|少量|适量|大量]爆[兵种]，在[k]本停留[t1]分钟。)×n
每个时代输出一条完整的时代总结，输出时不要带"[]"，三个玩家的战术简报放在一起，一个玩家一行。

举例：

Player1(神圣罗马帝国): 直城大兵营推进。5分30秒上二本，单TC，不种田，不爆兵，在二本停留1分钟。7分0秒上三本，单TC，不种田，大量爆重步，在三本停留8分钟。
Player2(法兰西): 二本金马压制。4分10秒上二本，单TC，不种田，大量爆金马，在二本停留11分钟。

第二部分：对每个玩家分析：
1. **战术定性**：二本骚扰/单TC卷2本/双TC卷2本/速三{地标名}/直帝{地标名}/{tcCount}TC发育/马里养牛上城银马/三本步兵海等等，可以同时有多条
2. **核心套路**：简短描述最可能的开局路线，主要表现：二本、三本、四本策略（上本地标、上本时间、停留时间、单位数量及配比等）
3. **军事曲线分析**：简述对方什么时候开始出兵、持续出兵、大量爆兵及部队构成

第三部分：如果是团队赛，请对对方阵容进行定性：谁负责二本/三本骚扰？谁是发育位？谁负责主攻和推进？有人直城或者直帝吗？
`


}

// ─── 调用与缓存 ─────────────────────────────────────────────────────

interface AnalysisState {
  loading: boolean
  error: string | null
  /** 已生成报告的对局 id */
  gameId: number | null
  report: string | null
}

const state = reactive<AnalysisState>({ loading: false, error: null, gameId: null, report: null })

async function analyze(
  gameId: number,
  players: SummaryPlayer[],
  fallbackPlayers: { name: string; civilization: string }[] = [],
): Promise<void> {
  if (state.loading || (!players.length && !fallbackPlayers.length)) return
  if (!settings.apiKey || !settings.endpoint) {
    state.error = '请先填写 LLM 端点和 API Key'
    return
  }
  state.loading = true
  state.error = null
  try {
    const res = await fetch(settings.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(players, fallbackPlayers) },
        ],
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`LLM API ${res.status}${text ? `：${text.slice(0, 200)}` : ''}`)
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) throw new Error('LLM 返回内容为空')
    state.gameId = gameId
    state.report = content
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e)
  } finally {
    state.loading = false
  }
}

export function useLlmAnalysis() {
  return { settings, state, analyze }
}

interface CivInfo {
  name: string
  flag: string // public/civ-flags/ 下的文件名
}

const CIVS: Record<string, CivInfo> = {
  abbasid_dynasty:     { name: '阿拔斯王朝',   flag: 'abbasid.png' },
  ayyubids:            { name: '阿尤布王朝',   flag: 'ayyubids.png' },
  byzantines:          { name: '拜占庭',       flag: 'byzantines.png' },
  chinese:             { name: '中国',         flag: 'chinese.png' },
  delhi_sultanate:     { name: '德里苏丹国',   flag: 'delhi.png' },
  english:             { name: '英格兰',       flag: 'english.png' },
  french:              { name: '法兰西',       flag: 'french.png' },
  golden_horde:        { name: '金帐汗国',     flag: 'goldenhorde.png' },
  holy_roman_empire:   { name: '神圣罗马帝国', flag: 'hre.png' },
  japanese:            { name: '日本',         flag: 'japanese.png' },
  jeanne_darc:         { name: '圣女贞德',     flag: 'jeannedarc.png' },
  jin_dynasty:         { name: '金朝',         flag: 'jin_dynasty.png' },
  house_of_lancaster:  { name: '兰开斯特王朝', flag: 'lancaster.png' },
  macedonians:         { name: '马其顿',       flag: 'macedonian.png' },
  malians:             { name: '马里',         flag: 'malians.png' },
  mongols:             { name: '蒙古',         flag: 'mongols.png' },
  order_of_the_dragon: { name: '龙骑士团',     flag: 'orderofthedragon.png' },
  ottomans:            { name: '奥斯曼',       flag: 'ottomans.png' },
  rus:                 { name: '罗斯',         flag: 'rus.png' },
  sengoku_daimyo:      { name: '战国大名',     flag: 'sengoku.png' },
  knights_templar:     { name: '圣殿骑士团',   flag: 'templar.png' },
  tughlaq_dynasty:     { name: '图格鲁克王朝', flag: 'tughlaq.png' },
  zhu_xis_legacy:      { name: '朱熹遗风',     flag: 'zhuxi.png' },
}

export function getCivName(key: string): string {
  return CIVS[key]?.name ?? key
}

export function getCivFlagUrl(key: string): string {
  const file = CIVS[key]?.flag ?? 'unknown.png'
  return `${import.meta.env.BASE_URL}civ-flags/${file}`
}

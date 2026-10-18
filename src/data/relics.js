/**
 * 왕실 유물과 칙령. 시너지 세트 6종, 유물 48종, 보정치 합산 로직.
 */

export const DEFAULT_RELIC_MODS = {
  goldIncomeMult: 0,
  argonIncomeMult: 0,
  killGoldChance: 0,
  killGoldAmount: 0,
  towerDamageMult: 0,
  towerAttackSpeedMult: 0,
  towerRangeMult: 0,
  heroDamageMult: 0,
  heroAttackSpeedMult: 0,
  heroMoveSpeedMult: 0,
  heroCooldownMult: 0,
  heroMaxHpMult: 0,
  heroLifesteal: 0,
  troopDamageMult: 0,
  troopHpMult: 0,
  troopSpawnSpeedMult: 0,
  buildingHpMult: 0,
  buildingRegenPerSec: 0,
  buildDiscount: 0,
  critChance: 0,
  critDamageMult: 0,
  burnDamageMult: 0,
  frostSlowBonus: 0,
  lightningChainBonus: 0,
  bossDamageMult: 0,
  thornsReflect: 0,
  startingDawnGold: 0,
  interestRateCap: 0,
  cursedEnemySpeedMult: 0,
  cursedWallCostHp: 0
};

export const SYNERGY_SETS = {
  solar_crown: {
    id: 'solar_crown',
    name: '태양 왕관 서약',
    nameEn: 'Solar Crown Covenant',
    icon: '☀️',
    color: '#f59e0b',
    description: '아침 수입과 화염 피해를 같이 올립니다. 돈이 곧 화력이 되는 조합입니다.',
    tiers: [
      {
        count: 2,
        label: '여명 금화 수입 +15%, 화염 지속 피해 +20%',
        effectKey: 'solar_2',
        value: { goldIncomeMult: 0.15, burnDamageMult: 0.20 }
      },
      {
        count: 4,
        label: '여명 금화 수입 +35%, 포탑 및 영웅 치명타 확률 +12%',
        effectKey: 'solar_4',
        value: { goldIncomeMult: 0.20, critChance: 0.12, burnDamageMult: 0.25 }
      },
      {
        count: 6,
        label: '태양신의 강림: 여명마다 보너스 금화 +60, 모든 포탑·영웅 피해량 +40%',
        effectKey: 'solar_6',
        value: { startingDawnGold: 60, towerDamageMult: 0.40, heroDamageMult: 0.40 }
      }
    ]
  },
  argon_guild: {
    id: 'argon_guild',
    name: '아르곤 연금 길드',
    nameEn: 'Argon Alchemical Guild',
    icon: '💎',
    color: '#06b6d4',
    description: '건설 비용을 깎고 포탑의 사거리와 공격 속도를 올립니다.',
    tiers: [
      {
        count: 2,
        label: '아르곤 채굴량 +20%, 건설 및 증축 비용 -10%',
        effectKey: 'argon_2',
        value: { argonIncomeMult: 0.20, buildDiscount: 0.10 }
      },
      {
        count: 4,
        label: '포탑 공격 속도 +22%, 포탑 사거리 +15%',
        effectKey: 'argon_4',
        value: { towerAttackSpeedMult: 0.22, towerRangeMult: 0.15 }
      },
      {
        count: 6,
        label: '초공간 결정 반응로: 아르곤 수입 +40%, 포탑 치명타 피해 +65%',
        effectKey: 'argon_6',
        value: { argonIncomeMult: 0.40, critDamageMult: 0.65, towerDamageMult: 0.25 }
      }
    ]
  },
  iron_bastion: {
    id: 'iron_bastion',
    name: '강철 성채 기사단',
    nameEn: 'Iron Bastion Order',
    icon: '🛡️',
    color: '#94a3b8',
    description: '성벽과 건물을 단단하게 만들고, 때린 적에게 피해를 돌려줍니다.',
    tiers: [
      {
        count: 2,
        label: '모든 성벽·건물 최대 체력 +25%, 초당 건물 자동 수리 +8',
        effectKey: 'bastion_2',
        value: { buildingHpMult: 0.25, buildingRegenPerSec: 8 }
      },
      {
        count: 4,
        label: '근접 피해 반사(가시) +25%, 수비대 병력 체력 +30%',
        effectKey: 'bastion_4',
        value: { thornsReflect: 0.25, troopHpMult: 0.30, buildingRegenPerSec: 12 }
      },
      {
        count: 6,
        label: '불멸의 철옹성: 건물 최대 체력 +50%, 수비대 공격력 +45%, 가시 반사 +30%',
        effectKey: 'bastion_6',
        value: { buildingHpMult: 0.50, troopDamageMult: 0.45, thornsReflect: 0.30 }
      }
    ]
  },
  blood_crusade: {
    id: 'blood_crusade',
    name: '진홍의 성전군',
    nameEn: 'Crimson Blood Crusade',
    icon: '⚔️',
    color: '#ef4444',
    description: '군주와 병력의 공격력, 생명력 흡수, 보스 처치 능력을 끌어올립니다.',
    tiers: [
      {
        count: 2,
        label: '영웅 공격력 +20%, 영웅 생명력 흡수 +8%',
        effectKey: 'crusade_2',
        value: { heroDamageMult: 0.20, heroLifesteal: 0.08 }
      },
      {
        count: 4,
        label: '수비대 공격력 +30%, 보스 대상 추가 피해 +25%',
        effectKey: 'crusade_4',
        value: { troopDamageMult: 0.30, bossDamageMult: 0.25, heroAttackSpeedMult: 0.18 }
      },
      {
        count: 6,
        label: '피의 군주: 영웅·병력 공격력 +45%, 치명타 피해 +50%, 생명력 흡수 +10%',
        effectKey: 'crusade_6',
        value: { heroDamageMult: 0.45, troopDamageMult: 0.45, critDamageMult: 0.50, heroLifesteal: 0.10 }
      }
    ]
  },
  absolute_zero: {
    id: 'absolute_zero',
    name: '절대영도 빙결학파',
    nameEn: 'Absolute Zero Schola',
    icon: '❄️',
    color: '#38bdf8',
    description: '적을 느리게 만들고, 얼어붙은 적을 부수면 주변까지 얼립니다.',
    tiers: [
      {
        count: 2,
        label: '빙결 둔화 및 쇄빙 추가 피해 +20%, 포탑 사거리 +10%',
        effectKey: 'frost_2',
        value: { frostSlowBonus: 0.20, towerRangeMult: 0.10 }
      },
      {
        count: 4,
        label: '빙결 및 쇄빙 피해 +35%, 영웅 스킬 쿨타임 가속 +18%',
        effectKey: 'frost_4',
        value: { frostSlowBonus: 0.35, heroCooldownMult: 0.18, towerDamageMult: 0.15 }
      },
      {
        count: 6,
        label: '영원한 겨울의 심장: 빙결 쇄빙 보너스 +50%, 보스 추가 피해 +40%',
        effectKey: 'frost_6',
        value: { frostSlowBonus: 0.50, bossDamageMult: 0.40, critChance: 0.15 }
      }
    ]
  },
  storm_conclave: {
    id: 'storm_conclave',
    name: '천둥 폭풍 의회',
    nameEn: 'Storm Conclave',
    icon: '⚡',
    color: '#a855f7',
    description: '공격 속도와 연쇄 번개를 올려 순간 화력을 높입니다.',
    tiers: [
      {
        count: 2,
        label: '번개 연쇄 및 전격 피해 +22%, 영웅 이동 속도 +12%',
        effectKey: 'storm_2',
        value: { lightningChainBonus: 0.22, heroMoveSpeedMult: 0.12 }
      },
      {
        count: 4,
        label: '포탑 공격 속도 +25%, 영웅 스킬 쿨타임 가속 +20%',
        effectKey: 'storm_4',
        value: { towerAttackSpeedMult: 0.25, heroCooldownMult: 0.20, lightningChainBonus: 0.25 }
      },
      {
        count: 6,
        label: '뇌신 아스트라의 심판: 전격 연쇄 보너스 +55%, 모든 공격 속도 +35%, 치명타 확률 +15%',
        effectKey: 'storm_6',
        value: { lightningChainBonus: 0.55, towerAttackSpeedMult: 0.35, heroAttackSpeedMult: 0.35, critChance: 0.15 }
      }
    ]
  }
};

export const RELICS = [
  // =========================================================================
  // 1-10: ECONOMY RELICS & ROYAL DECREES
  // =========================================================================
  {
    id: 'solar_tithe',
    name: '태양의 십일조',
    nameEn: 'Solar Tithe',
    rarity: 'common',
    category: 'economy',
    synergy: 'solar_crown',
    icon: '☀️',
    color: '#f59e0b',
    desc: '아침마다 금광 수입이 15% 늘어납니다.',
    lore: '솔라리아 초대 국왕이 정한 조세 칙령. 지금도 그대로 지켜진다.',
    mods: {
      goldIncomeMult: 0.15
    },
    specialTrigger: null
  },
  {
    id: 'argon_pickaxe',
    name: '공명하는 아르곤 곡괭이',
    nameEn: 'Resonant Argon Pickaxe',
    rarity: 'common',
    category: 'economy',
    synergy: 'argon_guild',
    icon: '⛏️',
    color: '#06b6d4',
    desc: '아르곤 채굴량 22% 증가, 아침마다 15골드 추가.',
    lore: '광맥의 진동에 맞춰 스스로 떨리는 드워프 곡괭이.',
    mods: {
      argonIncomeMult: 0.22,
      startingDawnGold: 15
    },
    specialTrigger: null
  },
  {
    id: 'mercenary_bounty_ledger',
    name: '용병단 현상금 장부',
    nameEn: 'Mercenary Bounty Ledger',
    rarity: 'common',
    category: 'economy',
    synergy: 'blood_crusade',
    icon: '📜',
    color: '#f97316',
    desc: '적을 잡으면 25% 확률로 4골드를 더 받습니다.',
    lore: '성벽 밖에서 죽은 것들의 귀에도 값이 매겨져 있다.',
    mods: {
      killGoldChance: 0.25,
      killGoldAmount: 4
    },
    specialTrigger: 'kill_gold_burst'
  },
  {
    id: 'royal_architect_seal',
    name: '왕립 건축가의 인장',
    nameEn: 'Royal Architect Seal',
    rarity: 'rare',
    category: 'economy',
    synergy: ['argon_guild', 'iron_bastion'],
    icon: '📐',
    color: '#38bdf8',
    desc: '건설과 강화 비용 12% 감소, 건물 최대 체력 10% 증가.',
    lore: '왕국의 모든 설계도에 찍히는 청금석 인장.',
    mods: {
      buildDiscount: 0.12,
      buildingHpMult: 0.10
    },
    specialTrigger: null
  },
  {
    id: 'golden_sun_dial',
    name: '황금 해시계 성배',
    nameEn: 'Golden Sundial Chalice',
    rarity: 'rare',
    category: 'economy',
    synergy: 'solar_crown',
    icon: '🏆',
    color: '#fbbf24',
    desc: '아침마다 35골드 추가, 금광 수입 12% 증가.',
    lore: '아침 해가 닿는 순간 성배 안쪽에 금빛 이슬이 맺힌다.',
    mods: {
      startingDawnGold: 35,
      goldIncomeMult: 0.12
    },
    specialTrigger: null
  },
  {
    id: 'alchemist_crucible',
    name: '현자의 연금 도가니',
    nameEn: 'Philosopher Crucible',
    rarity: 'epic',
    category: 'economy',
    synergy: 'argon_guild',
    icon: '⚗️',
    color: '#22d3ee',
    desc: '금화 수입 18%, 아르곤 28% 증가. 적 처치 시 15% 확률로 6골드.',
    lore: '전장의 재와 마석 조각을 녹여 금으로 바꾼다.',
    mods: {
      goldIncomeMult: 0.18,
      argonIncomeMult: 0.28,
      killGoldChance: 0.15,
      killGoldAmount: 6
    },
    specialTrigger: 'kill_gold_burst'
  },
  {
    id: 'imperial_bank_charter',
    name: '제국 은행 복리 칙령',
    nameEn: 'Imperial Bank Charter',
    rarity: 'epic',
    category: 'economy',
    synergy: 'solar_crown',
    icon: '🏦',
    color: '#eab308',
    desc: '아침 이자 상한 45 증가, 건설 비용 10% 감소.',
    lore: '전쟁 중에도 황실 은행의 이자는 하루도 거르지 않는다.',
    mods: {
      interestRateCap: 45,
      goldIncomeMult: 0.15,
      buildDiscount: 0.10
    },
    specialTrigger: null
  },
  {
    id: 'crown_of_midas_sol',
    name: '솔라리아 황금왕의 보옥',
    nameEn: 'Orb of the Golden Sovereign',
    rarity: 'legendary',
    category: 'economy',
    synergy: 'solar_crown',
    icon: '👑',
    color: '#f59e0b',
    desc: '금화 수입 30%, 아침 보너스 50골드. 보유 금화에 비례해 군주와 포탑 공격력이 오릅니다.',
    lore: '왕국의 부가 곧 검의 날카로움이라고 못 박은 전설의 보옥.',
    mods: {
      goldIncomeMult: 0.30,
      startingDawnGold: 50,
      heroDamageMult: 0.20,
      towerDamageMult: 0.20
    },
    specialTrigger: 'gold_scales_hero_dmg'
  },
  {
    id: 'crystal_monopoly_edict',
    name: '아르곤 독점 무역장',
    nameEn: 'Argon Monopoly Edict',
    rarity: 'rare',
    category: 'economy',
    synergy: 'argon_guild',
    icon: '💎',
    color: '#0ea5e9',
    desc: '아르곤 수입 32%, 건설·강화 비용 8% 감소.',
    lore: '왕실 광산 밖의 사적 거래를 모두 금지한 칙령.',
    mods: {
      argonIncomeMult: 0.32,
      buildDiscount: 0.08
    },
    specialTrigger: null
  },
  {
    id: 'storm_trade_compass',
    name: '폭풍항해사의 나침반',
    nameEn: 'Storm Navigator Compass',
    rarity: 'common',
    category: 'economy',
    synergy: 'storm_conclave',
    icon: '🧭',
    color: '#a855f7',
    desc: '아침마다 25골드, 군주 이동 속도 10% 증가.',
    lore: '어떤 폭풍에도 보급선을 성채까지 데려다 놓는다.',
    mods: {
      startingDawnGold: 25,
      heroMoveSpeedMult: 0.10
    },
    specialTrigger: null
  },

  // =========================================================================
  // 11-20: TOWER RELICS & ARTILLERY INSTRUMENTS
  // =========================================================================
  {
    id: 'ballista_tension_spring',
    name: '고장력 미스릴 태엽',
    nameEn: 'Mithril Tension Spring',
    rarity: 'common',
    category: 'tower',
    synergy: 'argon_guild',
    icon: '⚙️',
    color: '#38bdf8',
    desc: '모든 포탑 공격 속도 16% 증가.',
    lore: '수천 번 당겨도 탄성을 잃지 않는 미스릴 태엽.',
    mods: {
      towerAttackSpeedMult: 0.16
    },
    specialTrigger: null
  },
  {
    id: 'hawk_eye_lens',
    name: '천리안 수정 렌즈',
    nameEn: 'Hawkeye Crystal Lens',
    rarity: 'common',
    category: 'tower',
    synergy: ['argon_guild', 'absolute_zero'],
    icon: '🔭',
    color: '#60a5fa',
    desc: '포탑 사거리 15%, 치명타 확률 6% 증가.',
    lore: '안개 낀 밤에도 몇 리 밖 갑주 틈을 찾아낸다.',
    mods: {
      towerRangeMult: 0.15,
      critChance: 0.06
    },
    specialTrigger: null
  },
  {
    id: 'sunfire_brazier',
    name: '태양불꽃 화로',
    nameEn: 'Sunfire Brazier',
    rarity: 'rare',
    category: 'tower',
    synergy: 'solar_crown',
    icon: '🔥',
    color: '#f97316',
    desc: '포탑 공격력 18%, 화상 피해 35% 증가.',
    lore: '성탑 꼭대기에서 한 번도 꺼진 적 없는 불씨.',
    mods: {
      towerDamageMult: 0.18,
      burnDamageMult: 0.35
    },
    specialTrigger: null
  },
  {
    id: 'permafrost_core',
    name: '만년설 빙결 핵',
    nameEn: 'Permafrost Core',
    rarity: 'rare',
    category: 'tower',
    synergy: 'absolute_zero',
    icon: '🧊',
    color: '#38bdf8',
    desc: '빙결 둔화와 쇄빙 피해 30%, 포탑 사거리 10% 증가.',
    lore: '북방 빙하 가장 깊은 곳에서 캐낸 얼음 정령의 핵.',
    mods: {
      frostSlowBonus: 0.30,
      towerRangeMult: 0.10
    },
    specialTrigger: 'frost_shatter_aoe'
  },
  {
    id: 'tesla_induction_coil',
    name: '아스트라 전격 유도 코일',
    nameEn: 'Astra Induction Coil',
    rarity: 'rare',
    category: 'tower',
    synergy: 'storm_conclave',
    icon: '⚡',
    color: '#c084fc',
    desc: '번개 연쇄 피해 30%, 포탑 공격 속도 14% 증가.',
    lore: '대기 중의 마나를 전류로 바꿔 옆의 적에게 넘긴다.',
    mods: {
      lightningChainBonus: 0.30,
      towerAttackSpeedMult: 0.14
    },
    specialTrigger: 'chain_overload'
  },
  {
    id: 'siege_breaker_munitions',
    name: '거신 파쇄 철갑탄',
    nameEn: 'Titanbreaker Armor-Piercing Rounds',
    rarity: 'epic',
    category: 'tower',
    synergy: ['iron_bastion', 'blood_crusade'],
    icon: '💣',
    color: '#ef4444',
    desc: '포탑 공격력 22%, 보스와 정예에게 35% 추가 피해.',
    lore: '공성 거인의 흑요석 외피를 뚫으려고 만든 중량탄.',
    mods: {
      towerDamageMult: 0.22,
      bossDamageMult: 0.35
    },
    specialTrigger: null
  },
  {
    id: 'arcane_overclock_matrix',
    name: '비전 과부하 제어반',
    nameEn: 'Arcane Overclock Matrix',
    rarity: 'epic',
    category: 'tower',
    synergy: ['argon_guild', 'storm_conclave'],
    icon: '🔮',
    color: '#8b5cf6',
    desc: '포탑 공격 속도 28%, 치명타 확률 10%, 치명타 피해 30% 증가.',
    lore: '안전 장치를 떼어낸 제어반. 남은 건 발사 속도뿐이다.',
    mods: {
      towerAttackSpeedMult: 0.28,
      critChance: 0.10,
      critDamageMult: 0.30
    },
    specialTrigger: 'chain_overload'
  },
  {
    id: 'eye_of_the_storm_spire',
    name: '천공 뇌제의 주권석',
    nameEn: 'Sovereign Stone of the Sky Tempest',
    rarity: 'legendary',
    category: 'tower',
    synergy: 'storm_conclave',
    icon: '🌩️',
    color: '#a855f7',
    desc: '포탑 피해 32%, 공격 속도 25%, 번개 연쇄 45% 증가. 공격할 때 과전류가 터집니다.',
    lore: '하늘 요새 아스트라가 지상에 두고 간 번개 결정.',
    mods: {
      towerDamageMult: 0.32,
      towerAttackSpeedMult: 0.25,
      lightningChainBonus: 0.45,
      towerRangeMult: 0.15
    },
    specialTrigger: 'chain_overload'
  },
  {
    id: 'glacial_cataclysm_prism',
    name: '빙하 대재앙의 프리즘',
    nameEn: 'Glacial Cataclysm Prism',
    rarity: 'legendary',
    category: 'tower',
    synergy: 'absolute_zero',
    icon: '💠',
    color: '#0284c7',
    desc: '포탑 피해 28%, 빙결·쇄빙 피해 45%, 치명타 피해 40% 증가. 얼린 적이 죽으면 파편이 터집니다.',
    lore: '빛까지 얼린다는 칠면체. 전장을 조각상으로 바꿔 놓는다.',
    mods: {
      towerDamageMult: 0.28,
      frostSlowBonus: 0.45,
      critDamageMult: 0.40
    },
    specialTrigger: 'frost_shatter_aoe'
  },
  {
    id: 'helios_orbital_mirror',
    name: '헬리오스 천상 반사경',
    nameEn: 'Helios Orbital Mirror',
    rarity: 'legendary',
    category: 'tower',
    synergy: 'solar_crown',
    icon: '🌞',
    color: '#f59e0b',
    desc: '포탑 사거리 25%, 화염 피해 50%, 보스 피해 30% 증가. 아침과 전투 중에 태양 유성이 떨어집니다.',
    lore: '성층권 너머의 햇빛을 한 점에 모으는 고대 병기.',
    mods: {
      towerRangeMult: 0.25,
      burnDamageMult: 0.50,
      bossDamageMult: 0.30,
      towerDamageMult: 0.20
    },
    specialTrigger: 'dawn_meteor'
  },

  // =========================================================================
  // 21-30: HERO RELICS & ROYAL REGALIA
  // =========================================================================
  {
    id: 'valkyrie_feather_boots',
    name: '발키리의 날개 장화',
    nameEn: 'Valkyrie Winged Greaves',
    rarity: 'common',
    category: 'hero',
    synergy: 'storm_conclave',
    icon: '👢',
    color: '#c084fc',
    desc: '군주 이동 속도 18%, 공격 속도 12% 증가.',
    lore: '바람처럼 달려 전열을 메우는 날개 각반.',
    mods: {
      heroMoveSpeedMult: 0.18,
      heroAttackSpeedMult: 0.12
    },
    specialTrigger: null
  },
  {
    id: 'vampiric_signet_ring',
    name: '선혈 군주의 인장 반지',
    nameEn: 'Signet of the Blood Lord',
    rarity: 'common',
    category: 'hero',
    synergy: 'blood_crusade',
    icon: '💍',
    color: '#ef4444',
    desc: '군주 생명력 흡수 10%, 공격력 14% 증가.',
    lore: '적의 심장이 멈출 때마다 착용자의 상처가 아문다.',
    mods: {
      heroLifesteal: 0.10,
      heroDamageMult: 0.14
    },
    specialTrigger: null
  },
  {
    id: 'chrono_hourglass_pendant',
    name: '시간왜곡 모래시계 펜던트',
    nameEn: 'Chrono Hourglass Pendant',
    rarity: 'rare',
    category: 'hero',
    synergy: ['absolute_zero', 'storm_conclave'],
    icon: '⏳',
    color: '#38bdf8',
    desc: '군주 스킬 재사용 대기시간 22% 감소, 이동 속도 10% 증가.',
    lore: '모래알 하나에 짧은 순간을 길게 늘리는 법이 담겨 있다.',
    mods: {
      heroCooldownMult: 0.22,
      heroMoveSpeedMult: 0.10
    },
    specialTrigger: null
  },
  {
    id: 'lionheart_breastplate',
    name: '사자심장 국왕의 흉갑',
    nameEn: 'Lionheart Royal Cuirass',
    rarity: 'rare',
    category: 'hero',
    synergy: 'iron_bastion',
    icon: '🦺',
    color: '#94a3b8',
    desc: '군주 최대 체력 35%, 가시 반사 15% 증가.',
    lore: '화살을 수백 대 맞고도 성문을 놓지 않은 왕의 흉갑.',
    mods: {
      heroMaxHpMult: 0.35,
      thornsReflect: 0.15
    },
    specialTrigger: null
  },
  {
    id: 'executioner_crimson_axe',
    name: '집행자의 진홍 단두도',
    nameEn: 'Executioner Crimson Cleaver',
    rarity: 'rare',
    category: 'hero',
    synergy: 'blood_crusade',
    icon: '🪓',
    color: '#dc2626',
    desc: '군주 치명타 확률 12%, 치명타 피해 35%, 보스 피해 20% 증가.',
    lore: '자비를 남기지 않는 양손 도끼. 한 번에 끝낸다.',
    mods: {
      critChance: 0.12,
      critDamageMult: 0.35,
      bossDamageMult: 0.20
    },
    specialTrigger: null
  },
  {
    id: 'frostmourne_runeblade',
    name: '혹한의 룬검 프레야',
    nameEn: 'Runeblade of Frost Queen Freya',
    rarity: 'epic',
    category: 'hero',
    synergy: 'absolute_zero',
    icon: '🗡️',
    color: '#0ea5e9',
    desc: '군주 공격력 26%, 스킬 대기시간 18%, 빙결 피해 28% 증가.',
    lore: '검날이 지나간 자리의 물기가 고드름이 된다.',
    mods: {
      heroDamageMult: 0.26,
      heroCooldownMult: 0.18,
      frostSlowBonus: 0.28
    },
    specialTrigger: 'frost_shatter_aoe'
  },
  {
    id: 'phoenix_soul_mantle',
    name: '불사조의 태양 망토',
    nameEn: 'Mantle of the Undying Phoenix',
    rarity: 'epic',
    category: 'hero',
    synergy: 'solar_crown',
    icon: '🪶',
    color: '#f97316',
    desc: '군주 최대 체력 30%, 공격력 24%, 화상 피해 30% 증가.',
    lore: '죽음의 문턱에서도 불꽃과 함께 다시 일어난다.',
    mods: {
      heroMaxHpMult: 0.30,
      heroDamageMult: 0.24,
      burnDamageMult: 0.30
    },
    specialTrigger: 'low_hp_frenzy'
  },
  {
    id: 'berserker_blood_grail',
    name: '광전사의 선혈 성배',
    nameEn: 'Berserker Blood Grail',
    rarity: 'epic',
    category: 'hero',
    synergy: 'blood_crusade',
    icon: '🍷',
    color: '#ef4444',
    desc: '군주 공격 속도 28%, 생명력 흡수 12%. 체력이 낮을수록 공격력이 오릅니다.',
    lore: '고통을 잊게 하고 앞으로만 밀어붙이는 성배.',
    mods: {
      heroAttackSpeedMult: 0.28,
      heroLifesteal: 0.12,
      heroDamageMult: 0.22
    },
    specialTrigger: 'low_hp_frenzy'
  },
  {
    id: 'astralis_thunder_spear',
    name: '뇌신창 아스트랄리스',
    nameEn: 'Thunderlance Astralis',
    rarity: 'legendary',
    category: 'hero',
    synergy: 'storm_conclave',
    icon: '🔱',
    color: '#a855f7',
    desc: '군주 공격력 40%, 공격 속도 30%, 스킬 대기시간 25%, 번개 연쇄 35% 증가.',
    lore: '한 번 던지면 먹구름이 갈라지고 군단에 벼락이 꽂힌다.',
    mods: {
      heroDamageMult: 0.40,
      heroAttackSpeedMult: 0.30,
      heroCooldownMult: 0.25,
      lightningChainBonus: 0.35
    },
    specialTrigger: 'chain_overload'
  },
  {
    id: 'godslayer_regalia',
    name: '신살자의 왕권 검',
    nameEn: 'Regalia Blade of the Godslayer',
    rarity: 'legendary',
    category: 'hero',
    synergy: ['blood_crusade', 'solar_crown'],
    icon: '⚔️',
    color: '#f43f5e',
    desc: '군주 공격력 45%, 보스 피해 50%, 치명타 확률 15%, 치명타 피해 45% 증가.',
    lore: '심연의 고대신을 둘로 갈랐다는 왕가의 검.',
    mods: {
      heroDamageMult: 0.45,
      bossDamageMult: 0.50,
      critChance: 0.15,
      critDamageMult: 0.45
    },
    specialTrigger: null
  },

  // =========================================================================
  // 31-36: ARMY & GARRISON RELICS
  // =========================================================================
  {
    id: 'royal_war_horn',
    name: '왕실 총진군 뿔피리',
    nameEn: 'Royal Warhorn of Valor',
    rarity: 'common',
    category: 'army',
    synergy: 'blood_crusade',
    icon: '📯',
    color: '#f59e0b',
    desc: '병력 충원 속도 22%, 병력 공격력 15% 증가.',
    lore: '성루에서 울리면 지친 병사도 창을 다시 쥔다.',
    mods: {
      troopSpawnSpeedMult: 0.22,
      troopDamageMult: 0.15
    },
    specialTrigger: null
  },
  {
    id: 'templar_shield_wall',
    name: '성전기사단 방패진 교범',
    nameEn: 'Templar Phalanx Codex',
    rarity: 'common',
    category: 'army',
    synergy: 'iron_bastion',
    icon: '🛡️',
    color: '#94a3b8',
    desc: '병력 최대 체력 28% 증가, 가시 반사 10% 추가.',
    lore: '방패 사이로 손가락 하나 들어갈 틈도 두지 않는 진형.',
    mods: {
      troopHpMult: 0.28,
      thornsReflect: 0.10
    },
    specialTrigger: null
  },
  {
    id: 'sunblessed_halberds',
    name: '태양축복 미스릴 미늘창',
    nameEn: 'Sunblessed Mithril Halberds',
    rarity: 'rare',
    category: 'army',
    synergy: 'solar_crown',
    icon: '🔱',
    color: '#fbbf24',
    desc: '병력 공격력 26%, 화상 피해 20%, 보스 피해 15% 증가.',
    lore: '태양열로 벼려 마물의 갑피를 녹이는 미늘창.',
    mods: {
      troopDamageMult: 0.26,
      burnDamageMult: 0.20,
      bossDamageMult: 0.15
    },
    specialTrigger: null
  },
  {
    id: 'frostguard_banner',
    name: '북방 설원 수호기',
    nameEn: 'Banner of the Frostguard',
    rarity: 'rare',
    category: 'army',
    synergy: 'absolute_zero',
    icon: '🚩',
    color: '#38bdf8',
    desc: '병력 체력 25%, 충원 속도 20%, 빙결 피해 18% 증가.',
    lore: '눈보라 속에서도 한 번 꺾이지 않은 북방 군기.',
    mods: {
      troopHpMult: 0.25,
      troopSpawnSpeedMult: 0.20,
      frostSlowBonus: 0.18
    },
    specialTrigger: null
  },
  {
    id: 'immortal_legion_standard',
    name: '불멸 군단의 황금 군기',
    nameEn: 'Golden Standard of the Immortal Legion',
    rarity: 'epic',
    category: 'army',
    synergy: ['iron_bastion', 'blood_crusade'],
    icon: '🦅',
    color: '#eab308',
    desc: '병력 공격력 35%, 체력 35%, 충원 속도 25% 증가.',
    lore: '황금 독수리가 서 있는 한 근위대는 돌아서지 않는다.',
    mods: {
      troopDamageMult: 0.35,
      troopHpMult: 0.35,
      troopSpawnSpeedMult: 0.25
    },
    specialTrigger: null
  },
  {
    id: 'valhalla_oath_tablet',
    name: '발할라 영령의 서약비',
    nameEn: 'Oath Tablet of Valhalla',
    rarity: 'legendary',
    category: 'army',
    synergy: 'blood_crusade',
    icon: '🪦',
    color: '#ef4444',
    desc: '병력 공격력 50%, 체력 45%, 충원 속도 35%, 치명타 확률 10% 증가.',
    lore: '죽은 자들의 혼이 검에 깃들어 병사를 다시 세운다.',
    mods: {
      troopDamageMult: 0.50,
      troopHpMult: 0.45,
      troopSpawnSpeedMult: 0.35,
      critChance: 0.10
    },
    specialTrigger: null
  },

  // =========================================================================
  // 37-42: FORTRESS & BASTION RELICS
  // =========================================================================
  {
    id: 'dwarven_masonry_trowel',
    name: '드워프 장인의 석공 흙손',
    nameEn: 'Dwarven Master Masonry Trowel',
    rarity: 'common',
    category: 'fortress',
    synergy: 'iron_bastion',
    icon: '🧱',
    color: '#94a3b8',
    desc: '모든 건물 최대 체력 22% 증가, 건설 비용 6% 감소.',
    lore: '화강암을 강철처럼 맞물리게 다듬는 흙손.',
    mods: {
      buildingHpMult: 0.22,
      buildDiscount: 0.06
    },
    specialTrigger: null
  },
  {
    id: 'spiked_barricade_kit',
    name: '흑철 가시 성벽 보강재',
    nameEn: 'Black-Iron Spiked Ramparts',
    rarity: 'common',
    category: 'fortress',
    synergy: 'iron_bastion',
    icon: '🌵',
    color: '#64748b',
    desc: '근접 피해의 22%를 반사하고, 건물 최대 체력 12% 증가.',
    lore: '성벽을 오르던 것들은 제 무게에 찔려 떨어진다.',
    mods: {
      thornsReflect: 0.22,
      buildingHpMult: 0.12
    },
    specialTrigger: null
  },
  {
    id: 'living_ivy_seed',
    name: '세계수의 자생 덩굴 씨앗',
    nameEn: 'World-Tree Regrowth Ivy',
    rarity: 'rare',
    category: 'fortress',
    synergy: 'iron_bastion',
    icon: '🌿',
    color: '#22c55e',
    desc: '모든 건물이 전투 중에도 초당 14씩 회복합니다. 최대 체력 18% 증가.',
    lore: '균열마다 덩굴이 자라 무너진 돌을 다시 엮는다.',
    mods: {
      buildingRegenPerSec: 14,
      buildingHpMult: 0.18
    },
    specialTrigger: null
  },
  {
    id: 'runic_aegis_keystone',
    name: '이지스 방호 쐐기돌',
    nameEn: 'Runic Aegis Keystone',
    rarity: 'epic',
    category: 'fortress',
    synergy: ['iron_bastion', 'argon_guild'],
    icon: '🪨',
    color: '#38bdf8',
    desc: '건물 최대 체력 38%, 초당 수리 18, 가시 반사 20% 증가.',
    lore: '성문 한가운데 박혀 요새 전체를 감싸는 룬석.',
    mods: {
      buildingHpMult: 0.38,
      buildingRegenPerSec: 18,
      thornsReflect: 0.20
    },
    specialTrigger: null
  },
  {
    id: 'citadel_heart_reactor',
    name: '왕성 심장부 아르곤 노심',
    nameEn: 'Citadel Heart Argon Core',
    rarity: 'epic',
    category: 'fortress',
    synergy: 'argon_guild',
    icon: '💠',
    color: '#06b6d4',
    desc: '건물 최대 체력 30%, 포탑 공격력 20%, 아르곤 수입 25% 증가.',
    lore: '왕성 지하의 반응로가 성채 전체에 힘을 보낸다.',
    mods: {
      buildingHpMult: 0.30,
      towerDamageMult: 0.20,
      argonIncomeMult: 0.25
    },
    specialTrigger: null
  },
  {
    id: 'aegis_of_solaria',
    name: '솔라리아 불락의 성좌 방패',
    nameEn: 'Constellation Aegis of Solaria',
    rarity: 'legendary',
    category: 'fortress',
    synergy: ['iron_bastion', 'solar_crown'],
    icon: '🛡️',
    color: '#f59e0b',
    desc: '건물 최대 체력 55%, 초당 회복 28, 가시 반사 35% 증가. 아침마다 성채가 충격파를 뿜습니다.',
    lore: '일곱 마왕의 공성을 백 년 버텨낸 황금 방패.',
    mods: {
      buildingHpMult: 0.55,
      buildingRegenPerSec: 28,
      thornsReflect: 0.35
    },
    specialTrigger: 'dawn_meteor'
  },

  // =========================================================================
  // 43-48: CURSED RELICS (HIGH RISK, MASSIVE REWARD)
  // =========================================================================
  {
    id: 'cursed_blood_pact',
    name: '금단의 선혈 계약서',
    nameEn: 'Forbidden Blood Pact',
    rarity: 'cursed',
    category: 'cursed',
    synergy: 'blood_crusade',
    icon: '🩸',
    color: '#e11d48',
    desc: '[저주] 군주와 포탑 공격력 45%, 생명력 흡수 15% 증가. 대신 건물 최대 체력 20% 감소.',
    lore: '수호 결계를 담보로 잡고 살상력만 챙긴 계약.',
    mods: {
      heroDamageMult: 0.45,
      towerDamageMult: 0.45,
      heroLifesteal: 0.15,
      cursedWallCostHp: 0.20
    },
    specialTrigger: null
  },
  {
    id: 'cursed_greed_idol',
    name: '탐욕의 황금 마신상',
    nameEn: 'Idol of Avaricious Demon',
    rarity: 'cursed',
    category: 'cursed',
    synergy: 'solar_crown',
    icon: '👹',
    color: '#f43f5e',
    desc: '[저주] 금화 수입 50%, 아르곤 수입 40%, 처치 골드 확률 30% 증가. 대신 적 이동 속도 18% 증가.',
    lore: '황금을 토해내지만 그 냄새에 굶주린 것들이 몰려온다.',
    mods: {
      goldIncomeMult: 0.50,
      argonIncomeMult: 0.40,
      killGoldChance: 0.30,
      killGoldAmount: 8,
      cursedEnemySpeedMult: 0.18
    },
    specialTrigger: 'kill_gold_burst'
  },
  {
    id: 'cursed_glass_cannon_core',
    name: '균열된 과출력 마능 핵',
    nameEn: 'Fractured Overdrive Core',
    rarity: 'cursed',
    category: 'cursed',
    synergy: 'argon_guild',
    icon: '☢️',
    color: '#ec4899',
    desc: '[저주] 포탑 공격력 55%, 공격 속도 35% 증가. 대신 건물 최대 체력 25% 감소.',
    lore: '언제 터질지 모르는 마석. 성탑이 흔들리는데도 화력은 확실하다.',
    mods: {
      towerDamageMult: 0.55,
      towerAttackSpeedMult: 0.35,
      cursedWallCostHp: 0.25
    },
    specialTrigger: 'chain_overload'
  },
  {
    id: 'cursed_nightmare_horn',
    name: '심연의 광란 나팔',
    nameEn: 'Horn of Abyssal Frenzy',
    rarity: 'cursed',
    category: 'cursed',
    synergy: 'storm_conclave',
    icon: '🎺',
    color: '#db2777',
    desc: '[저주] 치명타 확률 20%, 치명타 피해 65%, 스킬 대기시간 25% 감소. 대신 적 이동 속도 15% 증가.',
    lore: '아군과 적군을 가리지 않고 광란으로 몰아넣는 나팔.',
    mods: {
      critChance: 0.20,
      critDamageMult: 0.65,
      heroCooldownMult: 0.25,
      cursedEnemySpeedMult: 0.15
    },
    specialTrigger: null
  },
  {
    id: 'cursed_frostbite_crown',
    name: '얼어붙은 망자의 면류관',
    nameEn: 'Crown of the Frozen Revenant',
    rarity: 'cursed',
    category: 'cursed',
    synergy: 'absolute_zero',
    icon: '💀',
    color: '#be123c',
    desc: '[저주] 빙결·쇄빙 피해 60%, 보스 피해 45% 증가. 대신 성벽 체력 15% 감소, 적 이동 속도 10% 증가.',
    lore: '설원에서 얼어 죽은 왕의 원한이 남은 왕관.',
    mods: {
      frostSlowBonus: 0.60,
      bossDamageMult: 0.45,
      cursedWallCostHp: 0.15,
      cursedEnemySpeedMult: 0.10
    },
    specialTrigger: 'frost_shatter_aoe'
  },
  {
    id: 'cursed_martyr_thorns',
    name: '순교자의 고행 철가시관',
    nameEn: 'Martyr Crown of Iron Thorns',
    rarity: 'cursed',
    category: 'cursed',
    synergy: 'iron_bastion',
    icon: '⛓️',
    color: '#9f1239',
    desc: '[저주] 가시 반사 55%, 병력 공격력 45%, 초당 건물 회복 22 증가. 대신 성벽 최대 체력 18% 감소.',
    lore: '맞을수록 더 세게 돌려주는 성유물.',
    mods: {
      thornsReflect: 0.55,
      troopDamageMult: 0.45,
      buildingRegenPerSec: 22,
      cursedWallCostHp: 0.18
    },
    specialTrigger: null
  }
];

/**
 * Aggregates modifiers from owned relic IDs, evaluates 2/4/6 set synergies,
 * applies set bonuses directly into `mods`, and collects special triggers.
 *
 * @param {string[]} ownedRelicIds - Array of relic IDs owned in the current run
 * @param {number} [synergyAmplifier=0] - Optional amplifier from Sanctum (e.g. +0.15 boosts set bonus values by 15%)
 * @returns {{
 *   mods: typeof DEFAULT_RELIC_MODS,
 *   activeSets: Array<{
 *     id: string,
 *     name: string,
 *     nameEn: string,
 *     icon: string,
 *     color: string,
 *     count: number,
 *     unlockedTiers: Array<object>,
 *     nextTierCount: number | null
 *   }>,
 *   specialTriggers: string[],
 *   ownedRelics: Array<object>
 * }}
 */
export function computeRelicModifiers(ownedRelicIds = [], synergyAmplifier = 0) {
  const mods = { ...DEFAULT_RELIC_MODS };
  const setCounts = {};
  const specialTriggersSet = new Set();
  const ownedRelics = [];

  for (const setKey of Object.keys(SYNERGY_SETS)) {
    setCounts[setKey] = 0;
  }

  const relicMap = new Map(RELICS.map((r) => [r.id, r]));

  for (const relicId of ownedRelicIds) {
    const relic = relicMap.get(relicId);
    if (!relic) continue;
    ownedRelics.push(relic);

    // 1. Sum direct relic modifiers
    if (relic.mods) {
      for (const [modKey, modVal] of Object.entries(relic.mods)) {
        if (typeof modVal === 'number' && modKey in mods) {
          mods[modKey] += modVal;
        }
      }
    }

    // 2. Count synergy sets (supports single string or array of 1-2 set IDs)
    const synergies = Array.isArray(relic.synergy) ? relic.synergy : [relic.synergy];
    for (const synId of synergies) {
      if (synId && synId in setCounts) {
        setCounts[synId] += 1;
      }
    }

    // 3. Collect special triggers
    if (relic.specialTrigger) {
      specialTriggersSet.add(relic.specialTrigger);
    }
  }

  // 4. Evaluate active Synergy Sets & fold unlocked tier bonuses into `mods`
  const activeSets = [];
  const ampMultiplier = 1 + Math.max(0, synergyAmplifier);

  for (const [setId, setDef] of Object.entries(SYNERGY_SETS)) {
    const count = setCounts[setId] || 0;
    if (count <= 0) continue;

    const unlockedTiers = [];
    let nextTierCount = null;

    for (const tier of setDef.tiers) {
      if (count >= tier.count) {
        unlockedTiers.push(tier);
        if (tier.value && typeof tier.value === 'object') {
          for (const [modKey, modVal] of Object.entries(tier.value)) {
            if (typeof modVal === 'number' && modKey in mods) {
              mods[modKey] += modVal * ampMultiplier;
            }
          }
        }
      } else if (nextTierCount === null) {
        nextTierCount = tier.count;
      }
    }

    activeSets.push({
      id: setDef.id,
      name: setDef.name,
      nameEn: setDef.nameEn,
      icon: setDef.icon,
      color: setDef.color,
      description: setDef.description,
      count,
      unlockedTiers,
      nextTierCount
    });
  }

  // Sort active sets by highest count first
  activeSets.sort((a, b) => b.count - a.count);

  // Apply cursed wall HP penalty directly into buildingHpMult so simulation engines can use either
  if (mods.cursedWallCostHp > 0) {
    mods.buildingHpMult = Math.max(-0.6, mods.buildingHpMult - mods.cursedWallCostHp);
  }

  return {
    mods,
    activeSets,
    specialTriggers: Array.from(specialTriggersSet),
    ownedRelics
  };
}

/**
 * Argonia Royal Relics & Decrees System (왕실 유물 & 칙령 도감)
 * Includes 6 Synergy Sets, 48 Distinct Royal Relics & Decrees, and Modifier Aggregation Engine.
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
    description: '여명의 황금 축복과 화염 심판을 결합하여 부와 화력을 동시에 증폭시키는 왕실 정통 서약입니다.',
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
    description: '고순도 아르곤 결정과 공학 설계를 통해 건설 비용을 절감하고 포탑 사거리와 공속을 극대화합니다.',
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
    description: '성벽과 방어탑을 난공불락의 요새로 단련하고 접근하는 적들에게 치명적인 가시 반사 피해를 되돌려줍니다.',
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
    description: '전장의 피로 영웅과 병사들을 각성시켜 압도적인 공격력과 생명력 흡수, 보스 처단 능력을 부여합니다.',
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
        label: '피의 군주 강림: 영웅·병력 공격력 +45%, 치명타 피해 +50%, 생명력 흡수 +10%',
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
    description: '혹한의 마력으로 진격하는 적들을 둔화시키고 얼어붙은 적을 산산조각내어 광역 파편 피해를 입힙니다.',
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
    description: '전격 연쇄와 가속 마법을 통해 포탑과 영웅의 공격 속도를 한계 이상으로 끌어올립니다.',
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
    desc: '매 아침(여명)마다 모든 금광이 추가 +15% 보너스 골드를 즉시 생산합니다.',
    lore: '솔라리아 초대 국왕이 제정한 황금 조세 칙령.',
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
    desc: '아르곤 결정 광산의 채굴 효율이 +22% 증가하고 아침마다 추가 금화 +15를 얻습니다.',
    lore: '광맥의 주파수에 맞춰 스스로 진동하는 드워프제 채굴 도구.',
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
    desc: '적 처치 시 25% 확률로 현상금 주머니(+4 금화)를 즉시 획득합니다.',
    lore: '성벽 밖에서 쓰러진 마물의 귀마다 은화가 매겨져 있다.',
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
    desc: '모든 건물 건설 및 업그레이드 비용이 12% 감소하며 건물 최대 체력이 +10% 증가합니다.',
    lore: '왕국의 모든 성채 설계도에 찍히는 청금석 인장.',
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
    desc: '매 여명마다 고정 보너스 금화 +35를 획득하고 금광 수입이 +12% 증가합니다.',
    lore: '아침 햇살이 닿는 순간 성배 내부에 순금 이슬이 맺힌다.',
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
    desc: '금화 수입 +18%, 아르곤 채굴량 +28%, 적 처치 시 15% 확률로 +6 금화를 연성합니다.',
    lore: '전장의 잿더미와 마석 파편을 순도 높은 귀금속으로 정제한다.',
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
    desc: '여명 도래 시 보유 중인 금화의 이자 한도가 +45 증가하고 건설 비용이 10% 절감됩니다.',
    lore: '전쟁 중에도 황실 은행의 복리 이자는 단 하루도 멈추지 않는다.',
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
    desc: '금화 수입 +30%, 여명 보너스 금화 +50. 보유한 금화에 비례해 영웅과 포탑의 공격력이 추가 상승합니다.',
    lore: '왕국의 부가 곧 검의 예리함이요 성벽의 높이라 선언한 전설의 보옥.',
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
    desc: '아르곤 수입 +32%, 모든 건물 건설 및 승급 비용 -8%.',
    lore: '왕실 직할 광산 외의 모든 사적 아르곤 거래를 금한다는 칙령.',
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
    desc: '여명마다 보급선 금화 +25가 도착하며 영웅의 이동 속도가 +10% 빨라집니다.',
    lore: '어떤 폭풍우 속에서도 보급선을 성채까지 인도하는 마법 나침반.',
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
    desc: '모든 방어 포탑의 공격 속도가 +16% 증가합니다.',
    lore: '수천 번을 당겨도 탄성을 잃지 않는 정밀 미스릴 태엽 장치.',
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
    desc: '모든 방어 포탑의 사거리가 +15% 증가하고 치명타 확률이 +6% 상승합니다.',
    lore: '안개 낀 밤에도 수 킬로미터 밖 적장의 갑주 틈새를 비춘다.',
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
    desc: '포탑 공격력 +18%, 화염 지속 피해(화상) +35% 증가.',
    lore: '성탑 꼭대기에서 꺼지지 않고 타오르는 성스러운 태양의 불씨.',
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
    desc: '빙결 포탑 및 냉기 효과의 둔화·쇄빙 피해가 +30% 증가하고 포탑 사거리가 +10% 늘어납니다.',
    lore: '북방 극지의 빙하 가장 깊은 곳에서 채취한 얼어붙은 정령의 핵.',
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
    desc: '번개 연쇄 피해량 +30%, 모든 포탑 공격 속도 +14%.',
    lore: '대기 중의 마나를 고압 전류로 치환하여 인접한 적들을 연쇄 감전시킨다.',
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
    desc: '포탑 공격력 +22%, 보스 및 정예 괴수에게 입히는 피해 +35% 증가.',
    lore: '공성 거인의 두꺼운 흑요석 외피를 단숨에 관통하기 위해 제작된 중량 탄환.',
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
    desc: '포탑 공격 속도 +28%, 치명타 확률 +10%, 치명타 피해 +30%.',
    lore: '안전 제한 장치를 해제하여 마도 포탑의 발사 속도를 극한까지 끌어올린다.',
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
    desc: '포탑 피해량 +32%, 포탑 공속 +25%, 번개 연쇄 보너스 +45%. 공격 시 과전류 연쇄 폭발을 일으킵니다.',
    lore: '하늘의 요새 아스트라가 지상에 남긴 태초의 번개 결정체.',
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
    desc: '포탑 피해량 +28%, 빙결 및 쇄빙 피해 +45%, 치명타 피해 +40%. 빙결된 적 처치 시 얼음 파편이 폭발합니다.',
    lore: '빛조차 얼려버리는 칠면체 프리즘으로, 전장을 고요한 얼음 조각상으로 바꾼다.',
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
    desc: '포탑 사거리 +25%, 화염 피해 +50%, 보스 대상 피해 +30%. 여명과 전투 중 태양 유성 세례를 부릅니다.',
    lore: '성층권 너머의 태양열을 한 점으로 집속시켜 적진을 증발시키는 고대 병기.',
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
    desc: '영웅 이동 속도 +18%, 영웅 공격 속도 +12% 증가.',
    lore: '전장의 어느 곳이라도 바람처럼 달려가 전열을 구원하는 신성한 각반.',
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
    desc: '영웅 생명력 흡수 +10%, 영웅 공격력 +14% 증가.',
    lore: '적의 심장 박동을 멈출 때마다 착용자의 상처가 순식간에 아문다.',
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
    desc: '영웅 액티브 스킬 쿨타임 가속 +22%, 영웅 이동 속도 +10%.',
    lore: '흐르는 모래알마다 짧은 찰나를 영원처럼 늘리는 시간 마법이 깃들어 있다.',
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
    desc: '영웅 최대 체력 +35%, 가시 반사 피해 +15%.',
    lore: '수백 자루의 화살을 맞고도 끝내 성문을 지켜낸 사자왕의 황금빛 흉갑.',
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
    desc: '영웅 치명타 확률 +12%, 치명타 피해 +35%, 보스 추가 피해 +20%.',
    lore: '군주의 적에게 자비 없는 일격을 내리는 거대한 양손 처형 도끼.',
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
    desc: '영웅 공격력 +26%, 스킬 쿨타임 가속 +18%, 빙결 및 쇄빙 피해 +28%.',
    lore: '검신이 스치는 궤적마다 공기 중의 수분이 칼날 같은 고드름으로 변한다.',
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
    desc: '영웅 최대 체력 +30%, 영웅 공격력 +24%, 화염 지속 피해 +30%.',
    lore: '죽음의 문턱에서도 태양의 불꽃과 함께 다시 솟구쳐 오르는 불사조 깃털 망토.',
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
    desc: '영웅 공격 속도 +28%, 생명력 흡수 +12%, 체력이 낮을수록 공격력이 폭발적으로 증가합니다.',
    lore: '고통을 잊게 하고 오직 전진과 살육만을 갈망하게 만드는 금단의 성배.',
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
    desc: '영웅 공격력 +40%, 공격 속도 +30%, 스킬 쿨타임 가속 +25%, 번개 연쇄 보너스 +35%.',
    lore: '한 번의 투창으로 먹구름을 가르고 적 군단 전체에 벼락을 꽂아넣는 신화 속 무기.',
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
    desc: '영웅 공격력 +45%, 보스 대상 피해 +50%, 치명타 확률 +15%, 치명타 피해 +45%.',
    lore: '심연의 고대신마저 두 동강 냈다고 전해지는 아르곤 왕가의 최고 비보.',
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
    desc: '수비대 병력의 훈련 및 충원 속도가 +22% 빨라지고 병력 공격력이 +15% 증가합니다.',
    lore: '성루에서 뿔피리가 울려 퍼지면 지친 병사들도 다시 창을 고쳐 쥔다.',
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
    desc: '아군 병력의 최대 체력이 +28% 증가하고 근접 가시 반사가 +10% 부여됩니다.',
    lore: '방패와 방패 사이에 단 한 치의 틈도 허용하지 않는 강철 진형 전술서.',
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
    desc: '아군 병력 공격력 +26%, 화염 추가 피해 +20%, 보스 대상 피해 +15%.',
    lore: '대장장이 사제들이 태양열로 단조하여 마물의 갑피를 녹여버리는 장창.',
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
    desc: '아군 병력 체력 +25%, 병력 충원 속도 +20%, 빙결 둔화 및 쇄빙 피해 +18%.',
    lore: '혹한의 눈보라 속에서도 단 한 번도 꺾이지 않은 북방 변경백의 군기.',
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
    desc: '아군 병력 공격력 +35%, 병력 최대 체력 +35%, 병력 충원 속도 +25%.',
    lore: '황금 독수리 군기가 서 있는 한 왕국의 근위대는 결코 패주하지 않는다.',
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
    desc: '병력 공격력 +50%, 병력 체력 +45%, 병력 충원 속도 +35%, 치명타 확률 +10%.',
    lore: '전사한 영웅들의 혼이 수비대 병사들의 검에 깃들어 초인적인 무력을 발휘한다.',
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
    desc: '모든 성벽과 건물의 최대 체력이 +22% 증가하고 건설 비용이 6% 감소합니다.',
    lore: '화강암을 강철처럼 맞물리게 다듬는 고대 산맥 드워프의 비전 도구.',
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
    desc: '성벽과 아군을 공격하는 근접 적에게 입은 피해의 22%를 가시 피해로 즉시 반사합니다.',
    lore: '성벽을 기어오르려던 마물들은 스스로의 무게에 찔려 추락한다.',
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
    desc: '모든 손상된 성벽과 건물이 전투 중에도 초당 +14의 체력을 스스로 회복합니다.',
    lore: '성벽의 균열마다 푸른 마력 덩굴이 자라나 무너진 돌을 다시 엮어낸다.',
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
    desc: '성벽 및 건물 최대 체력 +38%, 초당 자동 수리 +18, 가시 반사 +20%.',
    lore: '성문 정중앙에 박혀 요새 전체에 보이지 않는 역장을 두르는 핵심 룬석.',
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
    desc: '건물 최대 체력 +30%, 포탑 공격력 +20%, 아르곤 수입 +25%.',
    lore: '왕성 지하 거대 반응로에서 뿜어져 나오는 마력이 성채 전체의 포탑과 성벽을 강화한다.',
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
    desc: '건물 최대 체력 +55%, 초당 건물 회복 +28, 가시 반사 +35%, 여명마다 성채가 태양 충격파를 발산합니다.',
    lore: '신화 시대 일곱 마왕의 공성을 백 년간 막아낸 불멸의 황금 방패.',
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
    desc: '[저주] 영웅 및 포탑 공격력 +45%, 생명력 흡수 +15%. 단, 성벽과 건물의 최대 체력이 20% 감소합니다.',
    lore: '성벽의 수호 결계를 제물로 바쳐 파괴적인 살상력을 얻는 심연의 계약.',
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
    desc: '[저주] 금화 수입 +50%, 아르곤 수입 +40%, 처치 금화 확률 +30%. 단, 적들의 이동 속도가 18% 빨라집니다.',
    lore: '황금을 끝없이 토해내지만 그 냄새에 굶주린 마물들이 광분하여 달려든다.',
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
    desc: '[저주] 포탑 공격력 +55%, 포탑 공격 속도 +35%. 단, 건물 최대 체력이 25% 감소합니다.',
    lore: '불안정하게 폭주하는 고대 마석. 성탑이 무너질 듯 진동하지만 화력만큼은 절대적이다.',
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
    desc: '[저주] 모든 치명타 확률 +20%, 치명타 피해 +65%, 스킬 쿨타임 가속 +25%. 단, 적 이동 속도가 15% 증가합니다.',
    lore: '피아를 가리지 않고 전장의 모든 존재를 극한의 광란 상태로 몰아넣는 마계의 나팔.',
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
    desc: '[저주] 빙결·쇄빙 피해 +60%, 보스 대상 피해 +45%. 단, 성벽 체력이 15% 감소하고 적 이동 속도가 10% 증가합니다.',
    lore: '북방 설원에서 얼어 죽은 고대 왕의 원한이 서린 얼음 왕관.',
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
    desc: '[저주] 가시 반사 피해 +55%, 수비대 공격력 +45%, 초당 건물 회복 +22. 단, 성벽 최대 체력이 18% 감소합니다.',
    lore: '상처를 입을수록 적에게 수배의 고통을 되돌려주는 잔혹한 성유물.',
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

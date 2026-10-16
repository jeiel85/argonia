/**
 * Argonia Starlight Sanctum (별빛 성소), Challenge Skulls (시련의 해골), & Royal Achievements (업적)
 * Provides 24 Permanent Meta-Progression Upgrades across 4 constellations,
 * 6 Optional Challenge Skulls, 30 Achievements, and stat computation helpers.
 */

export const SANCTUM_BRANCHES = {
  crown_economy: {
    id: 'crown_economy',
    name: '왕실 재정학 (번영)',
    nameEn: 'Crown Economy',
    icon: '🪙',
    color: '#f59e0b',
    desc: '초기 자금, 여명 금화 및 아르곤 생산량, 건설 비용 절감을 영구적으로 강화합니다.'
  },
  citadel_bastion: {
    id: 'citadel_bastion',
    name: '불락의 성채학 (수호)',
    nameEn: 'Citadel Bastion',
    icon: '🏰',
    color: '#38bdf8',
    desc: '왕성과 성벽의 내구도, 자동 수리, 방어 포탑의 화력과 사거리를 영구적으로 강화합니다.'
  },
  warlord_valor: {
    id: 'warlord_valor',
    name: '전쟁군주의 무훈 (무력)',
    nameEn: 'Warlord Valor',
    icon: '⚔️',
    color: '#ef4444',
    desc: '영웅의 전투력, 스킬 쿨타임, 부활 속도 및 수비대 병사들의 역량을 영구적으로 강화합니다.'
  },
  astral_arcana: {
    id: 'astral_arcana',
    name: '성좌의 비전학 (운명)',
    nameEn: 'Astral Arcana',
    icon: '✨',
    color: '#a855f7',
    desc: '유물 리롤, 희귀 유물 행운, 세트 시너지 증폭 및 별빛 왕관 획득량을 영구적으로 강화합니다.'
  }
};

export const SANCTUM_UPGRADES = [
  // =========================================================================
  // BRANCH 1: CROWN ECONOMY (왕실 재정학 - 6 Upgrades)
  // =========================================================================
  {
    id: 'sanctum_start_gold',
    branch: 'crown_economy',
    branchName: '왕실 재정학 (번영)',
    name: '왕실 금고 증축',
    icon: '🪙',
    maxLevel: 5,
    baseCost: 40,
    costScale: 1.6,
    descPerLevel: '원정 시작 시 초기 금화 +35 증가',
    statKey: 'startGoldBonus',
    valuePerLevel: 35
  },
  {
    id: 'sanctum_start_argon',
    branch: 'crown_economy',
    branchName: '왕실 재정학 (번영)',
    name: '아르곤 비축 창고',
    icon: '💎',
    maxLevel: 5,
    baseCost: 45,
    costScale: 1.65,
    descPerLevel: '원정 시작 시 초기 아르곤 +20 증가',
    statKey: 'startArgonBonus',
    valuePerLevel: 20
  },
  {
    id: 'sanctum_dawn_income',
    branch: 'crown_economy',
    branchName: '왕실 재정학 (번영)',
    name: '여명의 조세 개혁',
    icon: '☀️',
    maxLevel: 5,
    baseCost: 60,
    costScale: 1.7,
    descPerLevel: '매 여명마다 금광 및 아르곤 수입 +6% 증가',
    statKey: 'dawnIncomeMult',
    valuePerLevel: 0.06
  },
  {
    id: 'sanctum_build_discount',
    branch: 'crown_economy',
    branchName: '왕실 재정학 (번영)',
    name: '왕립 공병대 표준화',
    icon: '📐',
    maxLevel: 5,
    baseCost: 70,
    costScale: 1.75,
    descPerLevel: '모든 건물 건설 및 업그레이드 비용 -4% 절감',
    statKey: 'buildCostDiscount',
    valuePerLevel: 0.04
  },
  {
    id: 'sanctum_crown_gain',
    branch: 'crown_economy',
    branchName: '왕실 재정학 (번영)',
    name: '성좌의 공물 서약',
    icon: '👑',
    maxLevel: 5,
    baseCost: 90,
    costScale: 1.8,
    descPerLevel: '전투 종료 시 획득하는 별빛 왕관(메타 재화) +10% 증가',
    statKey: 'crownGainMult',
    valuePerLevel: 0.10
  },
  {
    id: 'sanctum_starting_relic',
    branch: 'crown_economy',
    branchName: '왕실 재정학 (번영)',
    name: '선대 왕의 유산 상속',
    icon: '🎁',
    maxLevel: 1,
    baseCost: 220,
    costScale: 2.0,
    descPerLevel: '원정 시작 시 첫날 아침 즉시 왕실 유물 선택권 +1회 부여',
    statKey: 'startingRelicChoice',
    valuePerLevel: 1
  },

  // =========================================================================
  // BRANCH 2: CITADEL BASTION (불락의 성채학 - 6 Upgrades)
  // =========================================================================
  {
    id: 'sanctum_citadel_hp',
    branch: 'citadel_bastion',
    branchName: '불락의 성채학 (수호)',
    name: '왕성 본채 초석 강화',
    icon: '🏰',
    maxLevel: 5,
    baseCost: 45,
    costScale: 1.6,
    descPerLevel: '중앙 왕성(Citadel)의 최대 체력 +12% 증가',
    statKey: 'citadelMaxHpMult',
    valuePerLevel: 0.12
  },
  {
    id: 'sanctum_wall_hp',
    branch: 'citadel_bastion',
    branchName: '불락의 성채학 (수호)',
    name: '미스릴 합금 성벽',
    icon: '🧱',
    maxLevel: 5,
    baseCost: 50,
    costScale: 1.6,
    descPerLevel: '모든 성벽 및 방어 건물의 최대 체력 +10% 증가',
    statKey: 'wallMaxHpMult',
    valuePerLevel: 0.10
  },
  {
    id: 'sanctum_auto_repair',
    branch: 'citadel_bastion',
    branchName: '불락의 성채학 (수호)',
    name: '자율 수복 룬 각인',
    icon: '🔧',
    maxLevel: 5,
    baseCost: 65,
    costScale: 1.7,
    descPerLevel: '모든 성벽과 건물이 초당 +3의 체력을 자동 회복',
    statKey: 'buildingAutoRepair',
    valuePerLevel: 3
  },
  {
    id: 'sanctum_tower_damage',
    branch: 'citadel_bastion',
    branchName: '불락의 성채학 (수호)',
    name: '고순도 마도 포신',
    icon: '🗼',
    maxLevel: 5,
    baseCost: 60,
    costScale: 1.65,
    descPerLevel: '모든 방어 포탑의 공격력 +7% 증가',
    statKey: 'towerDamageMult',
    valuePerLevel: 0.07
  },
  {
    id: 'sanctum_tower_speed',
    branch: 'citadel_bastion',
    branchName: '불락의 성채학 (수호)',
    name: '자동 장전 태엽기',
    icon: '⚙️',
    maxLevel: 5,
    baseCost: 65,
    costScale: 1.7,
    descPerLevel: '모든 방어 포탑의 공격 속도 +6% 증가',
    statKey: 'towerSpeedMult',
    valuePerLevel: 0.06
  },
  {
    id: 'sanctum_tower_range',
    branch: 'citadel_bastion',
    branchName: '불락의 성채학 (수호)',
    name: '성루 관측소 증설',
    icon: '🔭',
    maxLevel: 4,
    baseCost: 75,
    costScale: 1.75,
    descPerLevel: '모든 방어 포탑의 사거리 +5% 증가',
    statKey: 'towerRangeMult',
    valuePerLevel: 0.05
  },

  // =========================================================================
  // BRANCH 3: WARLORD VALOR (전쟁군주의 무훈 - 6 Upgrades)
  // =========================================================================
  {
    id: 'sanctum_hero_damage',
    branch: 'warlord_valor',
    branchName: '전쟁군주의 무훈 (무력)',
    name: '왕가의 무예 전수',
    icon: '🗡️',
    maxLevel: 5,
    baseCost: 50,
    costScale: 1.6,
    descPerLevel: '영웅의 기본 및 스킬 공격력 +8% 증가',
    statKey: 'heroDamageMult',
    valuePerLevel: 0.08
  },
  {
    id: 'sanctum_hero_hp',
    branch: 'warlord_valor',
    branchName: '전쟁군주의 무훈 (무력)',
    name: '용혈의 축복 갑주',
    icon: '🛡️',
    maxLevel: 5,
    baseCost: 45,
    costScale: 1.6,
    descPerLevel: '영웅의 최대 체력 +10% 증가',
    statKey: 'heroMaxHpMult',
    valuePerLevel: 0.10
  },
  {
    id: 'sanctum_hero_haste',
    branch: 'warlord_valor',
    branchName: '전쟁군주의 무훈 (무력)',
    name: '전술적 직관 각성',
    icon: '⏳',
    maxLevel: 5,
    baseCost: 70,
    costScale: 1.7,
    descPerLevel: '영웅 스킬 쿨타임 감소 +5% 가속',
    statKey: 'heroSkillHaste',
    valuePerLevel: 0.05
  },
  {
    id: 'sanctum_hero_movespeed',
    branch: 'warlord_valor',
    branchName: '전쟁군주의 무훈 (무력)',
    name: '질풍의 기마술',
    icon: '🐎',
    maxLevel: 4,
    baseCost: 55,
    costScale: 1.65,
    descPerLevel: '영웅의 이동 속도 +5% 증가',
    statKey: 'heroMoveSpeedMult',
    valuePerLevel: 0.05
  },
  {
    id: 'sanctum_troop_power',
    branch: 'warlord_valor',
    branchName: '전쟁군주의 무훈 (무력)',
    name: '근위대 정예 훈련',
    icon: '⚔️',
    maxLevel: 5,
    baseCost: 60,
    costScale: 1.65,
    descPerLevel: '병영 수비대 유닛의 공격력 및 체력 +8% 증가',
    statKey: 'troopPowerMult',
    valuePerLevel: 0.08
  },
  {
    id: 'sanctum_troop_respawn',
    branch: 'warlord_valor',
    branchName: '전쟁군주의 무훈 (무력)',
    name: '신속 징집 체계',
    icon: '📯',
    maxLevel: 4,
    baseCost: 65,
    costScale: 1.7,
    descPerLevel: '병영 유닛 충원 속도 +8% 증가',
    statKey: 'troopRespawnSpeed',
    valuePerLevel: 0.08
  },

  // =========================================================================
  // BRANCH 4: ASTRAL ARCANA (성좌의 비전학 - 6 Upgrades)
  // =========================================================================
  {
    id: 'sanctum_relic_reroll',
    branch: 'astral_arcana',
    branchName: '성좌의 비전학 (운명)',
    name: '운명의 수레바퀴 재굴림',
    icon: '🎲',
    maxLevel: 3,
    baseCost: 85,
    costScale: 1.85,
    descPerLevel: '원정 당 유물 선택지 리롤(재추첨) 횟수 +1회 추가',
    statKey: 'relicRerollCount',
    valuePerLevel: 1
  },
  {
    id: 'sanctum_rare_luck',
    branch: 'astral_arcana',
    branchName: '성좌의 비전학 (운명)',
    name: '성좌의 축복받은 눈',
    icon: '🍀',
    maxLevel: 5,
    baseCost: 75,
    costScale: 1.75,
    descPerLevel: '희귀·영웅·전설 등급 유물 등장 확률 가중치 +10% 증가',
    statKey: 'rareRelicLuck',
    valuePerLevel: 0.10
  },
  {
    id: 'sanctum_crit_chance',
    branch: 'astral_arcana',
    branchName: '성좌의 비전학 (운명)',
    name: '천체 관측 정밀타격',
    icon: '🎯',
    maxLevel: 5,
    baseCost: 70,
    costScale: 1.7,
    descPerLevel: '영웅과 모든 포탑의 기본 치명타 확률 +2.5% 증가',
    statKey: 'critChanceBonus',
    valuePerLevel: 0.025
  },
  {
    id: 'sanctum_boss_damage',
    branch: 'astral_arcana',
    branchName: '성좌의 비전학 (운명)',
    name: '거신 사냥꾼의 비기',
    icon: '🐉',
    maxLevel: 5,
    baseCost: 65,
    costScale: 1.7,
    descPerLevel: '보스 및 정예 몬스터에게 입히는 모든 피해 +8% 증가',
    statKey: 'bossDamageBonus',
    valuePerLevel: 0.08
  },
  {
    id: 'sanctum_revive_grace',
    branch: 'astral_arcana',
    branchName: '성좌의 비전학 (운명)',
    name: '불멸의 별빛 소생술',
    icon: '✨',
    maxLevel: 4,
    baseCost: 60,
    costScale: 1.65,
    descPerLevel: '영웅 사망 시 부활 대기 시간 -10% 단축',
    statKey: 'reviveGraceSpeed',
    valuePerLevel: 0.10
  },
  {
    id: 'sanctum_synergy_amp',
    branch: 'astral_arcana',
    branchName: '성좌의 비전학 (운명)',
    name: '왕실 문장 공명 증폭기',
    icon: '🔮',
    maxLevel: 4,
    baseCost: 110,
    costScale: 1.9,
    descPerLevel: '유물 세트 시너지(2/4/6세트) 보너스 효과 +10% 증폭',
    statKey: 'synergyAmplifier',
    valuePerLevel: 0.10
  }
];

/**
 * 6 Optional Challenge Skulls (시련의 해골 - Thronefall / Hades Heat style mutators)
 */
export const MUTATOR_SKULLS = [
  {
    id: 'skull_horde',
    name: '군단의 해골',
    nameEn: 'Skull of the Endless Horde',
    icon: '💀',
    color: '#f97316',
    heat: 1,
    crownBonusMult: 0.25,
    desc: '매일 밤 몰려오는 적의 개체 수가 +35% 증가합니다.',
    rewardText: '별빛 왕관 보상 +25%',
    mods: {
      enemyCountMult: 0.35
    }
  },
  {
    id: 'skull_titan',
    name: '거신의 해골',
    nameEn: 'Skull of Titan Flesh',
    icon: '👹',
    color: '#ef4444',
    heat: 1,
    crownBonusMult: 0.25,
    desc: '모든 일반 및 정예 적의 최대 체력이 +40% 증가합니다.',
    rewardText: '별빛 왕관 보상 +25%',
    mods: {
      enemyHpMult: 0.40
    }
  },
  {
    id: 'skull_blitz',
    name: '질풍의 해골',
    nameEn: 'Skull of Relentless Blitz',
    icon: '⚡',
    color: '#eab308',
    heat: 2,
    crownBonusMult: 0.30,
    desc: '적들의 이동 속도와 공격 속도가 +25% 빨라집니다.',
    rewardText: '별빛 왕관 보상 +30%',
    mods: {
      enemySpeedMult: 0.25,
      enemyAttackSpeedMult: 0.25
    }
  },
  {
    id: 'skull_famine',
    name: '기근의 해골',
    nameEn: 'Skull of Royal Famine',
    icon: '🥀',
    color: '#a855f7',
    heat: 2,
    crownBonusMult: 0.30,
    desc: '여명마다 금광과 아르곤 광산의 생산량이 -20% 감소합니다.',
    rewardText: '별빛 왕관 보상 +30%',
    mods: {
      economyPenaltyMult: 0.20
    }
  },
  {
    id: 'skull_fragile',
    name: '균열의 해골',
    nameEn: 'Skull of Brittle Stone',
    icon: '🏚️',
    color: '#38bdf8',
    heat: 1,
    crownBonusMult: 0.25,
    desc: '아군 성벽과 방어 포탑이 적에게 받는 피해가 +30% 증가합니다.',
    rewardText: '별빛 왕관 보상 +25%',
    mods: {
      buildingDamageTakenMult: 0.30
    }
  },
  {
    id: 'skull_abyssal_lord',
    name: '심연 군주의 해골',
    nameEn: 'Skull of the Abyssal Overlord',
    icon: '👑',
    color: '#ec4899',
    heat: 3,
    crownBonusMult: 0.40,
    desc: '보스 몬스터의 체력이 +50% 증가하고 주변 적을 강화하는 광폭화 오라를 두릅니다.',
    rewardText: '별빛 왕관 보상 +40%',
    mods: {
      bossHpMult: 0.50,
      bossEnrageAura: true
    }
  }
];

/**
 * 30 Royal Achievements (왕실 업적 도감)
 */
export const ACHIEVEMENTS = [
  // Campaign & Territory Mastery (1-8)
  {
    id: 'ach_first_dawn',
    name: '첫 번째 여명',
    desc: '첫 밤의 습격을 막아내고 아침 해를 맞이하세요.',
    icon: '🌅',
    rewardCrowns: 25,
    category: 'campaign',
    conditionText: '웨이브 1 클리어'
  },
  {
    id: 'ach_solaria_victor',
    name: '황금 평원의 수호자',
    desc: '솔라리아 황금 평원의 모든 웨이브를 방어하고 승리하세요.',
    icon: '🌾',
    rewardCrowns: 60,
    category: 'campaign',
    conditionText: '제1영지 클리어'
  },
  {
    id: 'ach_frost_victor',
    name: '만년설 협곡의 정복자',
    desc: '북방 설원 협곡의 혹한과 빙결 거인을 물리치세요.',
    icon: '❄️',
    rewardCrowns: 80,
    category: 'campaign',
    conditionText: '제2영지 클리어'
  },
  {
    id: 'ach_volcano_victor',
    name: '잿빛 화산의 파수꾼',
    desc: '화산 분화구에서 쏟아지는 화염 군단을 격파하세요.',
    icon: '🌋',
    rewardCrowns: 100,
    category: 'campaign',
    conditionText: '제3영지 클리어'
  },
  {
    id: 'ach_abyss_savior',
    name: '아르곤 왕국의 구원자',
    desc: '최종장 심연의 균열에서 고대 마왕을 처단하고 왕국을 구원하세요.',
    icon: '👑',
    rewardCrowns: 150,
    category: 'campaign',
    conditionText: '최종 영지 클리어'
  },
  {
    id: 'ach_untouched_citadel',
    name: '흠집 없는 왕성',
    desc: '중앙 왕성(Citadel)이 단 1의 피해도 입지 않고 원정에서 승리하세요.',
    icon: '🏰',
    rewardCrowns: 90,
    category: 'campaign',
    conditionText: '왕성 체력 100% 유지 승리'
  },
  {
    id: 'ach_speed_commander',
    name: '전격전의 명장',
    desc: '모든 밤 웨이브를 지체 없이 즉시 호출하여 원정을 완수하세요.',
    icon: '⚡',
    rewardCrowns: 70,
    category: 'campaign',
    conditionText: '조기 호출만으로 승리'
  },
  {
    id: 'ach_endless_wave_15',
    name: '끝없는 밤의 파수꾼',
    desc: '무한 혈투 모드에서 15일 밤 이상 생존하세요.',
    icon: '🌙',
    rewardCrowns: 120,
    category: 'campaign',
    conditionText: '무한 모드 15웨이브 돌파'
  },

  // Economy & Architecture (9-14)
  {
    id: 'ach_gold_tycoon',
    name: '황금성의 재벌',
    desc: '단일 원정 중 보유 금화 1,000 이상을 달성하세요.',
    icon: '💰',
    rewardCrowns: 50,
    category: 'economy',
    conditionText: '보유 금화 1,000 달성'
  },
  {
    id: 'ach_argon_baron',
    name: '아르곤 연금 남작',
    desc: '단일 원정 중 보유 아르곤 결정 400 이상을 달성하세요.',
    icon: '💎',
    rewardCrowns: 55,
    category: 'economy',
    conditionText: '보유 아르곤 400 달성'
  },
  {
    id: 'ach_full_fortification',
    name: '철옹성 건설자',
    desc: '영지 내의 모든 건설 슬롯에 건물이나 포탑을 건설하세요.',
    icon: '🔨',
    rewardCrowns: 45,
    category: 'economy',
    conditionText: '모든 건설 슬롯 활성화'
  },
  {
    id: 'ach_tier3_architect',
    name: '왕립 대건축가',
    desc: '한 원정에서 5개 이상의 건물을 최고 단계(3티어)까지 승급하세요.',
    icon: '🏛️',
    rewardCrowns: 65,
    category: 'economy',
    conditionText: '3티어 건물 5개 보유'
  },
  {
    id: 'ach_mine_monopoly',
    name: '채굴왕의 전성시대',
    desc: '모든 금광과 아르곤 광산을 최고 단계로 업그레이드하세요.',
    icon: '⛏️',
    rewardCrowns: 60,
    category: 'economy',
    conditionText: '모든 광산 최대 레벨 달성'
  },
  {
    id: 'ach_zero_wall_loss',
    name: '무너지지 않는 방벽',
    desc: '원정 승리 시까지 성벽이 단 한 번도 완파되지 않게 방어하세요.',
    icon: '🧱',
    rewardCrowns: 75,
    category: 'economy',
    conditionText: '성벽 완파 0회 승리'
  },

  // Combat & Hero Mastery (15-22)
  {
    id: 'ach_slayer_500',
    name: '백전노장 집행관',
    desc: '누적 500마리의 침략군 몬스터를 처치하세요.',
    icon: '⚔️',
    rewardCrowns: 40,
    category: 'combat',
    conditionText: '누적 적 처치 500회'
  },
  {
    id: 'ach_slayer_2500',
    name: '심연의 학살자',
    desc: '누적 2,500마리의 침략군 몬스터를 처치하세요.',
    icon: '🩸',
    rewardCrowns: 95,
    category: 'combat',
    conditionText: '누적 적 처치 2,500회'
  },
  {
    id: 'ach_boss_hunter',
    name: '거신 사냥꾼',
    desc: '보스급 거대 괴수를 누적 10회 처치하세요.',
    icon: '🐉',
    rewardCrowns: 85,
    category: 'combat',
    conditionText: '보스 몬스터 10회 처치'
  },
  {
    id: 'ach_immortal_commander',
    name: '불멸의 군주',
    desc: '영웅이 단 한 번도 쓰러지지 않고 원정을 승리로 이끄세요.',
    icon: '🛡️',
    rewardCrowns: 75,
    category: 'combat',
    conditionText: '영웅 사망 0회 승리'
  },
  {
    id: 'ach_all_heroes_victor',
    name: '삼위일체 왕권',
    desc: '태양성기사, 폭풍궁수, 비전마도사 세 영웅으로 각각 승리를 달성하세요.',
    icon: '🎖️',
    rewardCrowns: 110,
    category: 'combat',
    conditionText: '3명의 영웅 모두로 승리'
  },
  {
    id: 'ach_crit_master',
    name: '섬광의 일격',
    desc: '단일 원정에서 치명타 확률 45% 이상을 달성하세요.',
    icon: '🎯',
    rewardCrowns: 65,
    category: 'combat',
    conditionText: '치명타 확률 45% 달성'
  },
  {
    id: 'ach_thorns_fortress',
    name: '가시 면류관의 성채',
    desc: '가시 반사 피해 비율 60% 이상을 달성하여 적들이 스스로 자멸하게 만드세요.',
    icon: '🌵',
    rewardCrowns: 70,
    category: 'combat',
    conditionText: '가시 반사 60% 달성'
  },
  {
    id: 'ach_garrison_legion',
    name: '왕국 총동원령',
    desc: '한 전장에 아군 수비대 병사를 동시에 16기 이상 유지하세요.',
    icon: '📯',
    rewardCrowns: 55,
    category: 'combat',
    conditionText: '동시 수비대 병력 16기 배치'
  },

  // Relics, Synergies & Challenge Skulls (23-30)
  {
    id: 'ach_synergy_4set',
    name: '왕실 문장의 공명',
    desc: '아무 유물 세트나 4세트 시너지 효과를 활성화하세요.',
    icon: '✨',
    rewardCrowns: 55,
    category: 'relics',
    conditionText: '4세트 시너지 발동'
  },
  {
    id: 'ach_synergy_6set',
    name: '절대 서약의 완성',
    desc: '단일 원정에서 6세트 최종 유물 시너지를 완성하세요.',
    icon: '🌟',
    rewardCrowns: 110,
    category: 'relics',
    conditionText: '6세트 시너지 발동'
  },
  {
    id: 'ach_cursed_pact',
    name: '금단에 손을 댄 군주',
    desc: '저주받은 유물(Cursed Relic)을 2개 이상 보유한 상태로 승리하세요.',
    icon: '🩸',
    rewardCrowns: 90,
    category: 'relics',
    conditionText: '저주 유물 2개 이상 보유 승리'
  },
  {
    id: 'ach_legendary_hoarder',
    name: '전설의 보물고',
    desc: '단일 원정에서 전설(Legendary) 등급 유물을 3개 이상 수집하세요.',
    icon: '🏆',
    rewardCrowns: 85,
    category: 'relics',
    conditionText: '전설 유물 3개 수집'
  },
  {
    id: 'ach_skull_initiate',
    name: '시련을 마주한 자',
    desc: '시련의 해골을 1개 이상 활성화한 상태로 원정에서 승리하세요.',
    icon: '💀',
    rewardCrowns: 70,
    category: 'challenge',
    conditionText: '시련의 해골 1개 이상 승리'
  },
  {
    id: 'ach_skull_veteran',
    name: '고통의 정복자',
    desc: '시련의 해골을 3개 이상 동시에 활성화하고 원정에서 승리하세요.',
    icon: '🔥',
    rewardCrowns: 130,
    category: 'challenge',
    conditionText: '시련의 해골 3개 이상 승리'
  },
  {
    id: 'ach_skull_all_six',
    name: '심연의 절대군주',
    desc: '6개의 모든 시련의 해골을 동시에 활성화하고 불가능한 승리를 쟁취하세요.',
    icon: '👑',
    rewardCrowns: 250,
    category: 'challenge',
    conditionText: '시련의 해골 6개 전부 활성화 승리'
  },
  {
    id: 'ach_sanctum_archmage',
    name: '성좌의 대현자',
    desc: '별빛 성소에서 영구 특성 업그레이드를 총 25레벨 이상 달성하세요.',
    icon: '🌌',
    rewardCrowns: 100,
    category: 'challenge',
    conditionText: '성소 누적 레벨 25 달성'
  }
];

export const DEFAULT_SANCTUM_STATS = {
  startGoldBonus: 0,
  startArgonBonus: 0,
  dawnIncomeMult: 0,
  buildCostDiscount: 0,
  citadelMaxHpMult: 0,
  wallMaxHpMult: 0,
  buildingAutoRepair: 0,
  towerDamageMult: 0,
  towerSpeedMult: 0,
  towerRangeMult: 0,
  heroDamageMult: 0,
  heroMaxHpMult: 0,
  heroSkillHaste: 0,
  heroMoveSpeedMult: 0,
  troopPowerMult: 0,
  troopRespawnSpeed: 0,
  relicRerollCount: 0,
  rareRelicLuck: 0,
  critChanceBonus: 0,
  bossDamageBonus: 0,
  crownGainMult: 0,
  reviveGraceSpeed: 0,
  startingRelicChoice: 0,
  synergyAmplifier: 0
};

/**
 * Computes the cost of upgrading a specific Sanctum node from `currentLevel` to `currentLevel + 1`.
 */
export function getSanctumUpgradeCost(upgradeDef, currentLevel = 0) {
  if (!upgradeDef || currentLevel >= upgradeDef.maxLevel) return Infinity;
  return Math.round(upgradeDef.baseCost * Math.pow(upgradeDef.costScale, currentLevel));
}

/**
 * Aggregates permanent meta-progression stats from a map of `{ [upgradeId]: level }`.
 *
 * @param {Record<string, number>} sanctumLevelsMap
 * @returns {typeof DEFAULT_SANCTUM_STATS & { totalLevels: number }}
 */
export function computeSanctumStats(sanctumLevelsMap = {}) {
  const stats = { ...DEFAULT_SANCTUM_STATS };
  let totalLevels = 0;

  for (const upgrade of SANCTUM_UPGRADES) {
    const rawLevel = Number(sanctumLevelsMap?.[upgrade.id] || 0);
    const level = Math.max(0, Math.min(upgrade.maxLevel, rawLevel));
    if (level <= 0) continue;

    totalLevels += level;
    if (upgrade.statKey in stats) {
      stats[upgrade.statKey] += upgrade.valuePerLevel * level;
    }
  }

  return {
    ...stats,
    totalLevels
  };
}

/**
 * Helper to aggregate active Challenge Skull modifiers & total Crown reward multiplier.
 *
 * @param {string[]} activeSkullIds
 */
export function computeSkullModifiers(activeSkullIds = []) {
  const mods = {
    enemyCountMult: 0,
    enemyHpMult: 0,
    enemySpeedMult: 0,
    enemyAttackSpeedMult: 0,
    economyPenaltyMult: 0,
    buildingDamageTakenMult: 0,
    bossHpMult: 0,
    bossEnrageAura: false
  };

  let crownBonusMult = 0;
  let totalHeat = 0;
  const activeSkulls = [];
  const skullMap = new Map(MUTATOR_SKULLS.map((s) => [s.id, s]));

  for (const id of activeSkullIds) {
    const skull = skullMap.get(id);
    if (!skull) continue;
    activeSkulls.push(skull);
    crownBonusMult += skull.crownBonusMult || 0;
    totalHeat += skull.heat || 1;

    if (skull.mods) {
      for (const [k, v] of Object.entries(skull.mods)) {
        if (typeof v === 'boolean') {
          mods[k] = mods[k] || v;
        } else if (typeof v === 'number' && k in mods) {
          mods[k] += v;
        }
      }
    }
  }

  return {
    mods,
    crownBonusMult,
    totalHeat,
    activeSkulls
  };
}

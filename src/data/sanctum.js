/**
 * 왕실 성소 특성 24종, 시련의 서약 6종, 업적 30종과 계산 함수.
 */

export const SANCTUM_BRANCHES = {
  crown_economy: {
    id: 'crown_economy',
    name: '왕실 재정학',
    nameEn: 'Crown Economy',
    icon: '🪙',
    color: '#f59e0b',
    desc: '시작 자금과 아침 수입, 건설 비용을 영구히 개선합니다.'
  },
  citadel_bastion: {
    id: 'citadel_bastion',
    name: '불락의 성채학',
    nameEn: 'Citadel Bastion',
    icon: '🏰',
    color: '#38bdf8',
    desc: '성채와 성벽의 내구도, 포탑 화력과 사거리를 올립니다.'
  },
  warlord_valor: {
    id: 'warlord_valor',
    name: '전쟁군주의 무훈',
    nameEn: 'Warlord Valor',
    icon: '⚔️',
    color: '#ef4444',
    desc: '군주의 전투력과 스킬 회전, 병력의 질을 올립니다.'
  },
  astral_arcana: {
    id: 'astral_arcana',
    name: '성좌의 비전학',
    nameEn: 'Astral Arcana',
    icon: '✨',
    color: '#a855f7',
    desc: '유물 선택과 시너지, 왕관 수급을 손봅니다.'
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
    descPerLevel: '원정 시작 금화 +35',
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
    descPerLevel: '원정 시작 아르곤 +20',
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
    descPerLevel: '아침 금광·아르곤 수입 +6%',
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
    descPerLevel: '건설·강화 비용 -4%',
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
    descPerLevel: '획득 왕관 +10%',
    statKey: 'crownGainMult',
    valuePerLevel: 0.10
  },
  {
    id: 'sanctum_starting_relic',
    branch: 'crown_economy',
    branchName: '왕실 재정학 (번영)',
    name: '선왕의 유산',
    icon: '🎁',
    maxLevel: 1,
    baseCost: 220,
    costScale: 2.0,
    descPerLevel: '첫날 아침 유물 선택 +1회',
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
    name: '성채 초석 보강',
    icon: '🏰',
    maxLevel: 5,
    baseCost: 45,
    costScale: 1.6,
    descPerLevel: '성채 최대 체력 +12%',
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
    descPerLevel: '성벽·건물 최대 체력 +10%',
    statKey: 'wallMaxHpMult',
    valuePerLevel: 0.10
  },
  {
    id: 'sanctum_auto_repair',
    branch: 'citadel_bastion',
    branchName: '불락의 성채학 (수호)',
    name: '자동 수복 룬',
    icon: '🔧',
    maxLevel: 5,
    baseCost: 65,
    costScale: 1.7,
    descPerLevel: '모든 건물 초당 수리 +3',
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
    descPerLevel: '포탑 공격력 +7%',
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
    descPerLevel: '포탑 공격 속도 +6%',
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
    descPerLevel: '포탑 사거리 +5%',
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
    descPerLevel: '군주 공격력 +8%',
    statKey: 'heroDamageMult',
    valuePerLevel: 0.08
  },
  {
    id: 'sanctum_hero_hp',
    branch: 'warlord_valor',
    branchName: '전쟁군주의 무훈 (무력)',
    name: '용혈 갑주',
    icon: '🛡️',
    maxLevel: 5,
    baseCost: 45,
    costScale: 1.6,
    descPerLevel: '군주 최대 체력 +10%',
    statKey: 'heroMaxHpMult',
    valuePerLevel: 0.10
  },
  {
    id: 'sanctum_hero_haste',
    branch: 'warlord_valor',
    branchName: '전쟁군주의 무훈 (무력)',
    name: '전술 직관',
    icon: '⏳',
    maxLevel: 5,
    baseCost: 70,
    costScale: 1.7,
    descPerLevel: '군주 스킬 대기시간 -5%',
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
    descPerLevel: '군주 이동 속도 +5%',
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
    descPerLevel: '병력 공격력·체력 +8%',
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
    descPerLevel: '병력 충원 속도 +8%',
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
    name: '운명의 재추첨',
    icon: '🎲',
    maxLevel: 3,
    baseCost: 85,
    costScale: 1.85,
    descPerLevel: '유물 다시 뽑기 +1회',
    statKey: 'relicRerollCount',
    valuePerLevel: 1
  },
  {
    id: 'sanctum_rare_luck',
    branch: 'astral_arcana',
    branchName: '성좌의 비전학 (운명)',
    name: '성좌의 눈',
    icon: '🍀',
    maxLevel: 5,
    baseCost: 75,
    costScale: 1.75,
    descPerLevel: '희귀 이상 유물 확률 +10%',
    statKey: 'rareRelicLuck',
    valuePerLevel: 0.10
  },
  {
    id: 'sanctum_crit_chance',
    branch: 'astral_arcana',
    branchName: '성좌의 비전학 (운명)',
    name: '정밀 조준',
    icon: '🎯',
    maxLevel: 5,
    baseCost: 70,
    costScale: 1.7,
    descPerLevel: '치명타 확률 +2.5%',
    statKey: 'critChanceBonus',
    valuePerLevel: 0.025
  },
  {
    id: 'sanctum_boss_damage',
    branch: 'astral_arcana',
    branchName: '성좌의 비전학 (운명)',
    name: '거신 사냥법',
    icon: '🐉',
    maxLevel: 5,
    baseCost: 65,
    costScale: 1.7,
    descPerLevel: '보스·정예 피해 +8%',
    statKey: 'bossDamageBonus',
    valuePerLevel: 0.08
  },
  {
    id: 'sanctum_revive_grace',
    branch: 'astral_arcana',
    branchName: '성좌의 비전학 (운명)',
    name: '별빛 소생',
    icon: '✨',
    maxLevel: 4,
    baseCost: 60,
    costScale: 1.65,
    descPerLevel: '군주 부활 대기시간 -10%',
    statKey: 'reviveGraceSpeed',
    valuePerLevel: 0.10
  },
  {
    id: 'sanctum_synergy_amp',
    branch: 'astral_arcana',
    branchName: '성좌의 비전학 (운명)',
    name: '문장 공명 증폭',
    icon: '🔮',
    maxLevel: 4,
    baseCost: 110,
    costScale: 1.9,
    descPerLevel: '세트 시너지 효과 +10%',
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
    desc: '밤마다 오는 적의 수가 35% 늘어납니다.',
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
    desc: '일반·정예 적의 최대 체력이 40% 늘어납니다.',
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
    desc: '적의 이동과 공격이 25% 빨라집니다.',
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
    desc: '아침 금광·아르곤 생산이 20% 줄어듭니다.',
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
    desc: '성벽과 포탑이 받는 피해가 30% 늘어납니다.',
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
    desc: '보스 체력 50% 증가. 주변 적을 강화하는 오라를 두릅니다.',
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
  // 왕국
  {
    id: 'ach_first_dawn',
    name: '첫날 밤',
    desc: '첫 습격을 막아내면 열립니다.',
    icon: '🌅',
    rewardCrowns: 25,
    category: 'campaign',
    conditionText: '1일차 밤 방어'
  },
  {
    id: 'ach_solaria',
    name: '솔라리아 평정',
    desc: '제1왕국을 끝까지 지켜냅니다.',
    icon: '🌾',
    rewardCrowns: 60,
    category: 'campaign',
    conditionText: '제1왕국 클리어'
  },
  {
    id: 'ach_frostpeak',
    name: '서리봉우리 평정',
    desc: '눈보라가 몰아치는 제2왕국을 지켜냅니다.',
    icon: '❄️',
    rewardCrowns: 80,
    category: 'campaign',
    conditionText: '제2왕국 클리어'
  },
  {
    id: 'ach_crimson',
    name: '붉은 사구 평정',
    desc: '모래폭풍이 지나간 제3왕국을 지켜냅니다.',
    icon: '🏜️',
    rewardCrowns: 100,
    category: 'campaign',
    conditionText: '제3왕국 클리어'
  },
  {
    id: 'ach_ashen',
    name: '잿빛 용광로 평정',
    desc: '용암 위의 제4왕국을 지켜냅니다.',
    icon: '🌋',
    rewardCrowns: 120,
    category: 'campaign',
    conditionText: '제4왕국 클리어'
  },
  {
    id: 'ach_astral',
    name: '성좌의 심장 평정',
    desc: '마지막 제5왕국을 지켜냅니다.',
    icon: '🌌',
    rewardCrowns: 180,
    category: 'campaign',
    conditionText: '제5왕국 클리어'
  },
  {
    id: 'ach_all_realms',
    name: '다섯 왕국',
    desc: '다섯 왕국을 모두 평정합니다.',
    icon: '👑',
    rewardCrowns: 300,
    category: 'campaign',
    conditionText: '왕국 5개 클리어'
  },
  {
    id: 'ach_endless_15',
    name: '열다섯 밤',
    desc: '무한의 심연에서 15일차까지 버팁니다.',
    icon: '🌙',
    rewardCrowns: 120,
    category: 'campaign',
    conditionText: '무한 15일차'
  },
  {
    id: 'ach_endless_30',
    name: '서른 밤',
    desc: '무한의 심연에서 30일차까지 버팁니다.',
    icon: '♾️',
    rewardCrowns: 250,
    category: 'campaign',
    conditionText: '무한 30일차'
  },

  // 경제
  {
    id: 'ach_gold_run',
    name: '금고가 두둑한 날',
    desc: '한 원정에서 금화를 1,000 이상 캡니다.',
    icon: '💰',
    rewardCrowns: 50,
    category: 'economy',
    conditionText: '한 원정 금화 1,000'
  },
  {
    id: 'ach_argon_run',
    name: '아르곤 부자',
    desc: '한 원정에서 아르곤을 400 이상 캡니다.',
    icon: '💎',
    rewardCrowns: 55,
    category: 'economy',
    conditionText: '한 원정 아르곤 400'
  },
  {
    id: 'ach_build_18',
    name: '빈 부지 없이',
    desc: '한 원정에서 건물을 18채 올립니다.',
    icon: '🔨',
    rewardCrowns: 45,
    category: 'economy',
    conditionText: '건물 18채 건설'
  },
  {
    id: 'ach_evo_5',
    name: '다섯 갈래 진화',
    desc: '한 원정에서 특화 진화를 5번 합니다.',
    icon: '🏛️',
    rewardCrowns: 65,
    category: 'economy',
    conditionText: '특화 진화 5회'
  },
  {
    id: 'ach_gold_total',
    name: '누적 채굴',
    desc: '금화를 모두 합쳐 10,000을 캡니다.',
    icon: '⛏️',
    rewardCrowns: 90,
    category: 'economy',
    conditionText: '누적 금화 10,000'
  },

  // 전투
  {
    id: 'ach_slayer_500',
    name: '오백',
    desc: '적을 모두 합쳐 500 마리 잡습니다.',
    icon: '⚔️',
    rewardCrowns: 40,
    category: 'combat',
    conditionText: '누적 처치 500'
  },
  {
    id: 'ach_slayer_2500',
    name: '이천오백',
    desc: '적을 모두 합쳐 2,500 마리 잡습니다.',
    icon: '🩸',
    rewardCrowns: 95,
    category: 'combat',
    conditionText: '누적 처치 2,500'
  },
  {
    id: 'ach_boss_10',
    name: '보스 사냥꾼',
    desc: '보스를 모두 합쳐 10번 잡습니다.',
    icon: '🐉',
    rewardCrowns: 85,
    category: 'combat',
    conditionText: '보스 10회 처치'
  },
  {
    id: 'ach_score_50k',
    name: '오만 점',
    desc: '한 원정에서 50,000점을 넘깁니다.',
    icon: '🎯',
    rewardCrowns: 70,
    category: 'combat',
    conditionText: '한 원정 50,000점'
  },
  {
    id: 'ach_victories_5',
    name: '다섯 번의 승리',
    desc: '원정을 5번 성공시킵니다.',
    icon: '🎖️',
    rewardCrowns: 110,
    category: 'combat',
    conditionText: '승리 5회'
  },
  {
    id: 'ach_hero_all',
    name: '네 명의 군주',
    desc: '네 군주로 각각 한 번씩 이깁니다.',
    icon: '🏆',
    rewardCrowns: 150,
    category: 'combat',
    conditionText: '군주 4명 승리'
  },

  // 유물
  {
    id: 'ach_synergy_4',
    name: '네 개의 표식',
    desc: '아무 세트나 4세트를 맞춥니다.',
    icon: '✨',
    rewardCrowns: 55,
    category: 'relics',
    conditionText: '4세트 시너지'
  },
  {
    id: 'ach_synergy_6',
    name: '여섯 개의 표식',
    desc: '아무 세트나 6세트를 완성합니다.',
    icon: '🌟',
    rewardCrowns: 110,
    category: 'relics',
    conditionText: '6세트 시너지'
  },
  {
    id: 'ach_relic_legend_3',
    name: '전설 셋',
    desc: '한 원정에서 전설 유물을 3개 모읍니다.',
    icon: '📜',
    rewardCrowns: 85,
    category: 'relics',
    conditionText: '전설 유물 3개'
  },
  {
    id: 'ach_cursed_2',
    name: '저주 두 개',
    desc: '저주 유물 2개를 안고 이깁니다.',
    icon: '🩸',
    rewardCrowns: 90,
    category: 'relics',
    conditionText: '저주 유물 2개 보유 승리'
  },
  {
    id: 'ach_relic_10',
    name: '유물 수집가',
    desc: '한 원정에서 유물을 10개 모읍니다.',
    icon: '🏺',
    rewardCrowns: 100,
    category: 'relics',
    conditionText: '유물 10개 보유'
  },

  // 시련
  {
    id: 'ach_skull_1',
    name: '시련 하나',
    desc: '시련의 서약 1개를 걸고 이깁니다.',
    icon: '💀',
    rewardCrowns: 70,
    category: 'challenge',
    conditionText: '서약 1개 승리'
  },
  {
    id: 'ach_skull_3',
    name: '시련 셋',
    desc: '시련의 서약 3개를 걸고 이깁니다.',
    icon: '🔥',
    rewardCrowns: 130,
    category: 'challenge',
    conditionText: '서약 3개 승리'
  },
  {
    id: 'ach_skull_6',
    name: '시련 여섯',
    desc: '여섯 개를 모두 걸고 이깁니다.',
    icon: '👑',
    rewardCrowns: 250,
    category: 'challenge',
    conditionText: '서약 6개 승리'
  },
  {
    id: 'ach_sanctum_25',
    name: '성소 25레벨',
    desc: '성소 특성을 합쳐 25레벨 올립니다.',
    icon: '🌠',
    rewardCrowns: 100,
    category: 'challenge',
    conditionText: '성소 누적 25레벨'
  },
  {
    id: 'ach_runs_10',
    name: '열 번의 원정',
    desc: '원정을 10번 치릅니다.',
    icon: '🗺️',
    rewardCrowns: 60,
    category: 'challenge',
    conditionText: '원정 10회'
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
    enemyCountBonus: mods.enemyCountMult,
    enemyHpBonus: mods.enemyHpMult,
    enemySpeedBonus: mods.enemySpeedMult,
    goldPenalty: mods.economyPenaltyMult,
    buildingDamageTakenBonus: mods.buildingDamageTakenMult,
    bossHpBonus: mods.bossHpMult,
    crownBonusMult,
    totalHeat,
    activeSkulls
  };
}

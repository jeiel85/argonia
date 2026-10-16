/**
 * ARGONIA: Crown of the Spire
 * 5 Handcrafted 3D Realms, Strategic Socket Layouts, Spawn Portals & 55+ Wave Tables + Endless Generator
 */

export const REALMS = [
  // =========================================================================
  // REALM 1: SOLARIA MEADOWLANDS (솔라리아 여명 평원)
  // =========================================================================
  {
    id: 'solaria_meadows',
    index: 0,
    name: '제1왕국: 솔라리아 여명 평원',
    nameEn: 'Realm I: Solaria Meadowlands',
    subtitle: '에메랄드 강줄기와 황금 들판의 성채',
    icon: '🌿',
    difficultyLabel: '★☆☆☆☆ (입문 ~ 정규)',
    totalWaves: 10,
    startGold: 135,
    startArgon: 4,
    rewardCrowns: 150,
    bossId: 'boss_kragasha',
    desc: '푸른 초원과 두 갈래 다리 건너편에서 고블린 약탈군과 강철 오크 군단이 침공합니다. 금광과 풍차를 빠르게 확보해 경제를 부흥시키고 길목에 성벽과 포탑을 세우세요.',
    palette: {
      groundPrimary: 0x3b6e38,
      groundSecondary: 0x2d572c,
      pathColor: 0x9c8259,
      waterColor: 0x1d709c,
      cliffColor: 0x57606f,
      foliageColor: 0x4d8b31,
      crystalColor: 0x38bdf8,
      daySkyTop: 0x2563eb,
      daySkyHorizon: 0x93c5fd,
      dayFog: 0xbfdbfe,
      daySun: 0xfffbeb,
      nightSkyTop: 0x070b19,
      nightSkyHorizon: 0x1e1b4b,
      nightFog: 0x0f172a,
      nightMoon: 0x818cf8,
    },
    hazard: {
      type: 'none',
      name: '온화한 여명풍',
      desc: '낮 동안 건설 비용이 5% 절감되며 성채 수리 효율이 높습니다.',
    },
    spawnPortals: [
      { id: 'north_rift', name: '북부 숲 협곡', x: 0, z: -38, color: 0xef4444 },
      { id: 'east_bridge', name: '동부 강변 가도', x: 37, z: -6, color: 0xf97316 },
      { id: 'west_pass', name: '서부 고대 광산길', x: -37, z: 4, color: 0xa855f7 },
    ],
    sockets: [
      // Core Citadel
      { id: 'citadel_core', x: 0, z: 2, slotType: 'citadel', allowed: ['citadel'], defaultType: 'citadel', prebuiltTier: 1, label: '왕실 성채' },
      // Inner Economy Ring
      { id: 'gold_1', x: -8, z: 9, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '황금 광맥 A' },
      { id: 'gold_2', x: 9, z: 9, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '황금 광맥 B' },
      { id: 'gold_3', x: -18, z: 14, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '남서부 금광맥' },
      { id: 'gold_4', x: 18, z: 14, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '남동부 금광맥' },
      { id: 'argon_1', x: -13, z: -3, slotType: 'argon_vein', allowed: ['argon_refinery'], defaultType: 'argon_refinery', label: '아르곤 수정맥 A' },
      { id: 'argon_2', x: 13, z: -3, slotType: 'argon_vein', allowed: ['argon_refinery'], defaultType: 'argon_refinery', label: '아르곤 수정맥 B' },
      { id: 'farm_1', x: -5, z: 16, slotType: 'fertile_land', allowed: ['windmill'], defaultType: 'windmill', label: '비옥한 경작지 A' },
      { id: 'farm_2', x: 5, z: 16, slotType: 'fertile_land', allowed: ['windmill'], defaultType: 'windmill', label: '비옥한 경작지 B' },
      { id: 'farm_3', x: 0, z: 22, slotType: 'fertile_land', allowed: ['windmill'], defaultType: 'windmill', label: '남부 대농장지' },
      // Chokepoint Walls
      { id: 'wall_n', x: 0, z: -15, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '북부 관문 성벽', rotationY: 0 },
      { id: 'wall_e', x: 17, z: -2, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '동부 다리 성벽', rotationY: Math.PI / 2 },
      { id: 'wall_w', x: -17, z: 2, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '서부 길목 성벽', rotationY: Math.PI / 2 },
      // Tactical Defense & Army Pads (player chooses tower or barracks!)
      { id: 'tac_n1', x: -6, z: -11, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'archer_tower', label: '북서 방어 거점' },
      { id: 'tac_n2', x: 6, z: -11, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'barracks', label: '북동 방어 거점' },
      { id: 'tac_n3', x: 0, z: -7, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'flame_mortar', label: '중앙 전초 거점' },
      { id: 'tac_e1', x: 12, z: -6, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'archer_tower', label: '동부 상단 포대' },
      { id: 'tac_e2', x: 12, z: 3, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'frost_spire', label: '동부 하단 포대' },
      { id: 'tac_w1', x: -12, z: -1, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'arcane_obelisk', label: '서부 상단 포대' },
      { id: 'tac_w2', x: -12, z: 7, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'barracks', label: '서부 하단 포대' },
      { id: 'tac_c1', x: -6, z: 3, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'archer_tower', label: '성채 서측 수호탑' },
      { id: 'tac_c2', x: 6, z: 3, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'arcane_obelisk', label: '성채 동측 수호탑' },
      // Outer Forward Outposts
      { id: 'tac_out_n', x: -5, z: -22, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'frost_spire', label: '북부 최전선 감시터' },
      { id: 'tac_out_e', x: 24, z: -5, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'flame_mortar', label: '동부 강변 전초지' },
    ],
  },

  // =========================================================================
  // REALM 2: FROSTPEAK CALDERA (서리봉우리 칼데라)
  // =========================================================================
  {
    id: 'frostpeak_caldera',
    index: 1,
    name: '제2왕국: 서리봉우리 만년설 칼데라',
    nameEn: 'Realm II: Frostpeak Caldera',
    subtitle: '얼어붙은 호수와 고대 빙룡의 둥지',
    icon: '❄️',
    difficultyLabel: '★★☆☆☆ (숙련)',
    totalWaves: 10,
    startGold: 155,
    startArgon: 6,
    rewardCrowns: 220,
    bossId: 'boss_borealis',
    desc: '혹한의 눈보라가 몰아치는 설원 분지입니다. 성벽을 넘어 날아오는 한기 망령과 거대한 빙하 맘모스를 화염 박격포와 대공 궁수탑으로 요격하세요.',
    palette: {
      groundPrimary: 0xcbd5e1,
      groundSecondary: 0x94a3b8,
      pathColor: 0x64748b,
      waterColor: 0x38bdf8,
      cliffColor: 0x334155,
      foliageColor: 0x0f766e,
      crystalColor: 0x22d3ee,
      daySkyTop: 0x0284c7,
      daySkyHorizon: 0xe0f2fe,
      dayFog: 0xcffafe,
      daySun: 0xe0f2fe,
      nightSkyTop: 0x020617,
      nightSkyHorizon: 0x0f172a,
      nightFog: 0x082f49,
      nightMoon: 0x38bdf8,
    },
    hazard: {
      type: 'blizzard',
      name: '극저온 한파 돌풍',
      desc: '밤 동안 18초마다 눈보라가 불어닥쳐 화염 계열 포탑 주변이 아닌 외부 유닛의 이동 속도가 잠시 느려집니다.',
    },
    spawnPortals: [
      { id: 'glacier_north', name: '북부 빙하 협곡', x: -12, z: -38, color: 0x38bdf8 },
      { id: 'glacier_northeast', name: '북동 설산 능선', x: 26, z: -32, color: 0x06b6d4 },
      { id: 'frozen_lake_west', name: '서부 빙판 호수', x: -38, z: -4, color: 0x818cf8 },
      { id: 'south_ridge', name: '동남부 눈사태 길목', x: 35, z: 14, color: 0xf43f5e },
    ],
    sockets: [
      { id: 'citadel_core', x: 0, z: 2, slotType: 'citadel', allowed: ['citadel'], defaultType: 'citadel', prebuiltTier: 1, label: '설원 왕실 성채' },
      { id: 'gold_1', x: -8, z: 10, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '동토 금광 A' },
      { id: 'gold_2', x: 8, z: 10, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '동토 금광 B' },
      { id: 'gold_3', x: -16, z: 16, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '남서 빙하 광맥' },
      { id: 'gold_4', x: 16, z: 16, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '남동 빙하 광맥' },
      { id: 'argon_1', x: -14, z: -2, slotType: 'argon_vein', allowed: ['argon_refinery'], defaultType: 'argon_refinery', label: '빙결정 아르곤맥 A' },
      { id: 'argon_2', x: 14, z: -2, slotType: 'argon_refinery', defaultType: 'argon_refinery', slotType: 'argon_vein', allowed: ['argon_refinery'], label: '빙결정 아르곤맥 B' },
      { id: 'argon_3', x: 0, z: 18, slotType: 'argon_vein', allowed: ['argon_refinery'], defaultType: 'argon_refinery', label: '성채 남단 아르곤맥' },
      { id: 'farm_1', x: -6, z: 20, slotType: 'fertile_land', allowed: ['windmill'], defaultType: 'windmill', label: '온실 풍차 농장 A' },
      { id: 'farm_2', x: 6, z: 20, slotType: 'fertile_land', allowed: ['windmill'], defaultType: 'windmill', label: '온실 풍차 농장 B' },
      { id: 'wall_nw', x: -6, z: -16, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '북서 빙벽 성문', rotationY: 0.25 },
      { id: 'wall_ne', x: 11, z: -14, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '북동 설산 성문', rotationY: -0.45 },
      { id: 'wall_w', x: -18, z: -2, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '서부 호수 방벽', rotationY: Math.PI / 2 },
      { id: 'wall_se', x: 17, z: 6, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '동남 협곡 방벽', rotationY: Math.PI / 2 },
      { id: 'tac_1', x: -7, z: -10, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'flame_mortar', label: '북서 화력 거점' },
      { id: 'tac_2', x: 7, z: -9, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'archer_tower', label: '북동 대공 거점' },
      { id: 'tac_3', x: 0, z: -6, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'barracks', label: '북부 중앙 병영터' },
      { id: 'tac_4', x: -12, z: -5, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'arcane_obelisk', label: '서부 빙판 감시터' },
      { id: 'tac_5', x: -12, z: 4, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'barracks', label: '서부 측면 수비터' },
      { id: 'tac_6', x: 12, z: 3, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'flame_mortar', label: '동부 능선 포대' },
      { id: 'tac_7', x: 12, z: -5, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'frost_spire', label: '동부 교차로 첨탑' },
      { id: 'tac_8', x: -6, z: 3, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'archer_tower', label: '내성 서측 수호탑' },
      { id: 'tac_9', x: 6, z: 3, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'arcane_obelisk', label: '내성 동측 수호탑' },
      { id: 'tac_10', x: 2, z: -20, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'frost_spire', label: '설산 최전방 보루' },
    ],
  },

  // =========================================================================
  // REALM 3: CRIMSON DUNE OASIS (붉은 사구 오아시스)
  // =========================================================================
  {
    id: 'crimson_oasis',
    index: 2,
    name: '제3왕국: 붉은 사구 태양 오아시스',
    nameEn: 'Realm III: Crimson Dune Oasis',
    subtitle: '고대 파라오의 유적과 황금 모래폭풍',
    icon: '🏜️',
    difficultyLabel: '★★★☆☆ (베테랑)',
    totalWaves: 11,
    startGold: 175,
    startArgon: 8,
    rewardCrowns: 310,
    bossId: 'boss_akhen_ra',
    desc: '풍부한 황금 광맥이 묻힌 오아시스 유적지입니다. 끊임없이 해골을 소환하는 강령술사와 잠복 전갈 군세를 광역 화력과 성기사단으로 분쇄하세요.',
    palette: {
      groundPrimary: 0xd97706,
      groundSecondary: 0xb45309,
      pathColor: 0xfde68a,
      waterColor: 0x0d9488,
      cliffColor: 0x78350f,
      foliageColor: 0x15803d,
      crystalColor: 0xf59e0b,
      daySkyTop: 0xd97706,
      daySkyHorizon: 0xfef3c7,
      dayFog: 0xfde68a,
      daySun: 0xffedd5,
      nightSkyTop: 0x1c1917,
      nightSkyHorizon: 0x4c1d95,
      nightFog: 0x2e1065,
      nightMoon: 0xf59e0b,
    },
    hazard: {
      type: 'sandstorm',
      name: '황금 사막의 신기루',
      desc: '모든 금광의 여명 수입이 +15% 증가하지만, 적 원거리 술사들의 사거리가 길어집니다.',
    },
    spawnPortals: [
      { id: 'pyramid_north', name: '북부 태양 피라미드', x: 0, z: -39, color: 0xf59e0b },
      { id: 'canyon_west', name: '서부 붉은 협곡', x: -38, z: -12, color: 0xea580c },
      { id: 'canyon_east', name: '동부 신전 폐허', x: 38, z: -12, color: 0xa855f7 },
      { id: 'oasis_south', name: '남부 사구 기습로', x: 0, z: 36, color: 0xef4444 },
    ],
    sockets: [
      { id: 'citadel_core', x: 0, z: 0, slotType: 'citadel', allowed: ['citadel'], defaultType: 'citadel', prebuiltTier: 1, label: '오아시스 황금 성채' },
      { id: 'gold_1', x: -8, z: 7, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '왕가의 황금맥 A' },
      { id: 'gold_2', x: 8, z: 7, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '왕가의 황금맥 B' },
      { id: 'gold_3', x: -16, z: -8, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '서부 유적 금광' },
      { id: 'gold_4', x: 16, z: -8, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '동부 유적 금광' },
      { id: 'gold_5', x: 0, z: 14, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '오아시스 심층 금광' },
      { id: 'argon_1', x: -14, z: 3, slotType: 'argon_vein', allowed: ['argon_refinery'], defaultType: 'argon_refinery', label: '태양석 아르곤맥 A' },
      { id: 'argon_2', x: 14, z: 3, slotType: 'argon_vein', allowed: ['argon_refinery'], defaultType: 'argon_refinery', label: '태양석 아르곤맥 B' },
      { id: 'farm_1', x: -7, z: -7, slotType: 'fertile_land', allowed: ['windmill'], defaultType: 'windmill', label: '오아시스 농장 A' },
      { id: 'farm_2', x: 7, z: -7, slotType: 'fertile_land', allowed: ['windmill'], defaultType: 'windmill', label: '오아시스 농장 B' },
      { id: 'wall_n', x: 0, z: -17, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '북부 피라미드 성문', rotationY: 0 },
      { id: 'wall_w', x: -19, z: -5, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '서부 사구 성문', rotationY: Math.PI / 2 },
      { id: 'wall_e', x: 19, z: -5, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '동부 신전 성문', rotationY: Math.PI / 2 },
      { id: 'wall_s', x: 0, z: 19, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '남부 오아시스 방벽', rotationY: 0 },
      { id: 'tac_n1', x: -5, z: -13, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'archer_tower', label: '북서 오벨리스크터' },
      { id: 'tac_n2', x: 5, z: -13, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'arcane_obelisk', label: '북동 오벨리스크터' },
      { id: 'tac_w1', x: -13, z: -2, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'flame_mortar', label: '서부 협곡 포대' },
      { id: 'tac_e1', x: 13, z: -2, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'frost_spire', label: '동부 협곡 포대' },
      { id: 'tac_s1', x: -6, z: 13, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'barracks', label: '남서 수비 병영터' },
      { id: 'tac_s2', x: 6, z: 13, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'archer_tower', label: '남동 수비 포대' },
      { id: 'tac_c1', x: -5, z: 1, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'barracks', label: '성채 서측 근위터' },
      { id: 'tac_c2', x: 5, z: 1, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'arcane_obelisk', label: '성채 동측 근위터' },
      { id: 'tac_out1', x: -10, z: -21, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'frost_spire', label: '북서 외곽 감시탑' },
      { id: 'tac_out2', x: 10, z: -21, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'flame_mortar', label: '북동 외곽 포격진' },
    ],
  },

  // =========================================================================
  // REALM 4: ASHEN FORGE & MAGMA RIFT (잿빛 용광로 화구)
  // =========================================================================
  {
    id: 'ashen_forge',
    index: 3,
    name: '제4왕국: 잿빛 용광로 대화구',
    nameEn: 'Realm IV: Ashen Magma Forge',
    subtitle: '끓어오르는 용암 강과 풍부한 아르곤 결정 지대',
    icon: '🌋',
    difficultyLabel: '★★★★☆ (마스터)',
    totalWaves: 12,
    startGold: 195,
    startArgon: 12,
    rewardCrowns: 420,
    bossId: 'boss_ignis_valkor',
    desc: '용암이 흐르는 흑요석 협곡입니다. 죽으면서 분열하는 용암 골렘과 하늘을 뒤덮는 화염 와이번 군단을 상대로 빙결 첨탑과 비전 오벨리스크의 극한 시너지를 발휘하세요.',
    palette: {
      groundPrimary: 0x27272a,
      groundSecondary: 0x18181b,
      pathColor: 0x3f3f46,
      waterColor: 0xea580c, // Glowing Magma river!
      cliffColor: 0x09090b,
      foliageColor: 0x7f1d1d,
      crystalColor: 0xf97316,
      daySkyTop: 0x450a0a,
      daySkyHorizon: 0xea580c,
      dayFog: 0x7c2d12,
      daySun: 0xfdba74,
      nightSkyTop: 0x090508,
      nightSkyHorizon: 0x7f1d1d,
      nightFog: 0x450a0a,
      nightMoon: 0xef4444,
    },
    hazard: {
      type: 'magma_surge',
      name: '지열 과충전',
      desc: '아르곤 정제소 생산량이 +25% 증가하며 모든 포탑의 공격력이 +10% 상승하지만, 적들의 이동 속도가 10% 빠릅니다.',
    },
    spawnPortals: [
      { id: 'magma_nw', name: '북서 용암 분화구', x: -28, z: -34, color: 0xef4444 },
      { id: 'magma_ne', name: '북동 흑요석 관문', x: 28, z: -34, color: 0xf97316 },
      { id: 'magma_sw', name: '남서 잿빛 다리', x: -34, z: 18, color: 0xeab308 },
      { id: 'magma_se', name: '남동 화산 협곡', x: 34, z: 18, color: 0xa855f7 },
    ],
    sockets: [
      { id: 'citadel_core', x: 0, z: 0, slotType: 'citadel', allowed: ['citadel'], defaultType: 'citadel', prebuiltTier: 1, label: '흑요석 대성채' },
      { id: 'gold_1', x: -8, z: 8, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '용광로 금광 A' },
      { id: 'gold_2', x: 8, z: 8, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '용광로 금광 B' },
      { id: 'gold_3', x: -8, z: -8, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '북서 화구 금광' },
      { id: 'gold_4', x: 8, z: -8, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '북동 화구 금광' },
      { id: 'argon_1', x: -15, z: 0, slotType: 'argon_vein', allowed: ['argon_refinery'], defaultType: 'argon_refinery', label: '고순도 아르곤맥 A' },
      { id: 'argon_2', x: 15, z: 0, slotType: 'argon_refinery', defaultType: 'argon_refinery', slotType: 'argon_vein', allowed: ['argon_refinery'], label: '고순도 아르곤맥 B' },
      { id: 'argon_3', x: 0, z: -15, slotType: 'argon_vein', allowed: ['argon_refinery'], defaultType: 'argon_refinery', label: '북부 코어 아르곤맥' },
      { id: 'argon_4', x: 0, z: 15, slotType: 'argon_vein', allowed: ['argon_refinery'], defaultType: 'argon_refinery', label: '남부 코어 아르곤맥' },
      { id: 'farm_1', x: -4, z: 13, slotType: 'fertile_land', allowed: ['windmill'], defaultType: 'windmill', label: '지열 보급소 A' },
      { id: 'farm_2', x: 4, z: 13, slotType: 'fertile_land', allowed: ['windmill'], defaultType: 'windmill', label: '지열 보급소 B' },
      { id: 'wall_nw', x: -14, z: -14, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '북서 흑요석 성벽', rotationY: Math.PI / 4 },
      { id: 'wall_ne', x: 14, z: -14, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '북동 흑요석 성벽', rotationY: -Math.PI / 4 },
      { id: 'wall_sw', x: -16, z: 10, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '남서 화구 성벽', rotationY: -Math.PI / 4 },
      { id: 'wall_se', x: 16, z: 10, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '남동 화구 성벽', rotationY: Math.PI / 4 },
      { id: 'tac_1', x: -10, z: -12, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'frost_spire', label: '북서 냉각 방어터' },
      { id: 'tac_2', x: 10, z: -12, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'frost_spire', label: '북동 냉각 방어터' },
      { id: 'tac_3', x: -12, z: 6, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'barracks', label: '남서 전술 거점' },
      { id: 'tac_4', x: 12, z: 6, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'barracks', label: '남동 전술 거점' },
      { id: 'tac_5', x: -5, z: -4, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'arcane_obelisk', label: '성채 북서 수호터' },
      { id: 'tac_6', x: 5, z: -4, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'archer_tower', label: '성채 북동 수호터' },
      { id: 'tac_7', x: -5, z: 4, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'archer_tower', label: '성채 남서 수호터' },
      { id: 'tac_8', x: 5, z: 4, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'flame_mortar', label: '성채 남동 수호터' },
      { id: 'tac_9', x: -18, z: -7, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'arcane_obelisk', label: '서부 외곽 감시탑' },
      { id: 'tac_10', x: 18, z: -7, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'arcane_obelisk', label: '동부 외곽 감시탑' },
    ],
  },

  // =========================================================================
  // REALM 5: ARGONIA ASTRAL CITADEL (아르고니아 성좌의 심장)
  // =========================================================================
  {
    id: 'astral_citadel',
    index: 4,
    name: '제5왕국: 아르고니아 성좌의 심장',
    nameEn: 'Realm V: Argonia Astral Sanctum',
    subtitle: '천공의 부유섬과 별포식자 말라코르와의 최후 결전',
    icon: '🌌',
    difficultyLabel: '★★★★★ (신화 / 최종장)',
    totalWaves: 12,
    startGold: 290,
    startArgon: 18,
    rewardCrowns: 650,
    bossId: 'boss_malakor',
    desc: '아르고니아 제국의 수도이자 별빛 에너지가 응집된 천공 요새입니다. 사방의 차원 균열에서 쏟아지는 공허 군단과 심연의 별포식자 말라코르를 물리치고 왕좌를 되찾으세요!',
    palette: {
      groundPrimary: 0x1e1b4b,
      groundSecondary: 0x312e81,
      pathColor: 0x6366f1,
      waterColor: 0x7c3aed,
      cliffColor: 0x0f172a,
      foliageColor: 0x38bdf8,
      crystalColor: 0xe879f9,
      daySkyTop: 0x1e1b4b,
      daySkyHorizon: 0x6366f1,
      dayFog: 0x312e81,
      daySun: 0xe0e7ff,
      nightSkyTop: 0x030014,
      nightSkyHorizon: 0x3b0764,
      nightFog: 0x1e1b4b,
      nightMoon: 0xf43f5e,
    },
    hazard: {
      type: 'astral_convergence',
      name: '성좌의 가호와 공허 침식',
      desc: '영웅의 스킬 재사용 대기시간이 20% 감소하고 시작 자원이 풍부하지만, 모든 차원문에서 동시에 대군이 진격합니다.',
    },
    spawnPortals: [
      { id: 'void_north', name: '북방 천공 차원문', x: 0, z: -39, color: 0xf43f5e },
      { id: 'void_east', name: '동방 성좌 균열', x: 39, z: 0, color: 0xa855f7 },
      { id: 'void_west', name: '서방 심연 균열', x: -39, z: 0, color: 0x38bdf8 },
      { id: 'void_south', name: '남방 황혼 차원문', x: 0, z: 38, color: 0xf59e0b },
    ],
    sockets: [
      { id: 'citadel_core', x: 0, z: 0, slotType: 'citadel', allowed: ['citadel'], defaultType: 'citadel', prebuiltTier: 1, label: '아르고니아 성좌 왕좌' },
      { id: 'gold_1', x: -7, z: 7, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '성좌 황금맥 A' },
      { id: 'gold_2', x: 7, z: 7, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '성좌 황금맥 B' },
      { id: 'gold_3', x: -7, z: -7, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '성좌 황금맥 C' },
      { id: 'gold_4', x: 7, z: -7, slotType: 'gold_vein', allowed: ['gold_mine'], defaultType: 'gold_mine', label: '성좌 황금맥 D' },
      { id: 'argon_1', x: -13, z: -13, slotType: 'argon_vein', allowed: ['argon_refinery'], defaultType: 'argon_refinery', label: '아스트랄 코어 A' },
      { id: 'argon_2', x: 13, z: -13, slotType: 'argon_vein', allowed: ['argon_refinery'], defaultType: 'argon_refinery', label: '아스트랄 코어 B' },
      { id: 'argon_3', x: -13, z: 13, slotType: 'argon_vein', allowed: ['argon_refinery'], defaultType: 'argon_refinery', label: '아스트랄 코어 C' },
      { id: 'argon_4', x: 13, z: 13, slotType: 'argon_vein', allowed: ['argon_refinery'], defaultType: 'argon_refinery', label: '아스트랄 코어 D' },
      { id: 'farm_1', x: -11, z: 0, slotType: 'fertile_land', allowed: ['windmill'], defaultType: 'windmill', label: '성좌 에테르 농장 A' },
      { id: 'farm_2', x: 11, z: 0, slotType: 'fertile_land', allowed: ['windmill'], defaultType: 'windmill', label: '성좌 에테르 농장 B' },
      { id: 'wall_n', x: 0, z: -18, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', prebuiltTier: 1, label: '북방 빛의 성문', rotationY: 0 },
      { id: 'wall_s', x: 0, z: 18, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '남방 빛의 성문', rotationY: 0 },
      { id: 'wall_w', x: -18, z: 0, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '서방 빛의 성문', rotationY: Math.PI / 2 },
      { id: 'wall_e', x: 18, z: 0, slotType: 'wall', allowed: ['stone_wall'], defaultType: 'stone_wall', label: '동방 빛의 성문', rotationY: Math.PI / 2 },
      { id: 'tac_c1', x: -5, z: -8, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'arcane_obelisk', prebuiltTier: 1, label: '내성 북서 수호탑' },
      { id: 'tac_c2', x: 5, z: -8, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'archer_tower', label: '내성 북동 수호탑' },
      { id: 'tac_n1', x: -6, z: -14, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'barracks', label: '북서 성좌 병영터' },
      { id: 'tac_n2', x: 6, z: -14, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'flame_mortar', label: '북동 성좌 포대' },
      { id: 'tac_s1', x: -5, z: 12, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'flame_mortar', label: '남서 성좌 포대' },
      { id: 'tac_s2', x: 5, z: 12, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'frost_spire', label: '남동 성좌 포대' },
      { id: 'tac_w1', x: -13, z: -4, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'barracks', label: '서북 성기사 거점' },
      { id: 'tac_w2', x: -13, z: 4, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'frost_spire', label: '서남 성좌 포대' },
      { id: 'tac_e1', x: 13, z: -4, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'barracks', label: '동북 성기사 거점' },
      { id: 'tac_e2', x: 13, z: 4, slotType: 'tactical', allowed: ['archer_tower', 'arcane_obelisk', 'flame_mortar', 'frost_spire', 'barracks'], defaultType: 'flame_mortar', label: '동남 성좌 포대' },
    ],
  },
];

// Enemy pools per realm for structured wave generation + cross-realm escalation
const REALM_ENEMY_POOLS = [
  // Realm 0: Solaria
  {
    fodder: ['goblin_raider'],
    regular: ['shield_orc', 'warg_rider'],
    specialist: ['kobold_sapper', 'dark_shaman'],
    heavy: ['siege_ram'],
    boss: 'boss_kragasha',
  },
  // Realm 1: Frostpeak
  {
    fodder: ['frost_wolf', 'goblin_raider'],
    regular: ['shield_orc', 'ice_wraith'],
    specialist: ['kobold_sapper', 'dark_shaman', 'ice_wraith'],
    heavy: ['frost_mammoth', 'siege_ram'],
    boss: 'boss_borealis',
  },
  // Realm 2: Crimson Oasis
  {
    fodder: ['skeleton_warrior', 'sand_stalker'],
    regular: ['sand_stalker', 'warg_rider'],
    specialist: ['dune_necromancer', 'kobold_sapper', 'dark_shaman'],
    heavy: ['scorpion_juggernaut', 'siege_ram'],
    boss: 'boss_akhen_ra',
  },
  // Realm 3: Ashen Forge
  {
    fodder: ['hellhound', 'sand_stalker'],
    regular: ['hellhound', 'chaos_wyvern'],
    specialist: ['chaos_wyvern', 'dune_necromancer', 'kobold_sapper'],
    heavy: ['magma_golem', 'scorpion_juggernaut'],
    boss: 'boss_ignis_valkor',
  },
  // Realm 4: Astral Citadel
  {
    fodder: ['skeleton_warrior', 'hellhound'],
    regular: ['sand_stalker', 'chaos_wyvern'],
    specialist: ['void_reaver', 'dune_necromancer', 'chaos_wyvern'],
    heavy: ['astral_archon', 'magma_golem', 'scorpion_juggernaut'],
    boss: 'boss_malakor',
  },
];

/**
 * Generates a complete Wave Descriptor for any Realm and Wave Number (1..totalWaves, or 1..999 in Endless Mode).
 * Returns `{ waveNumber, isBossWave, title, groups: [{ portalIndex, enemyId, count, interval, delay, hpScale, dmgScale }], clearGoldBonus, clearArgonBonus, grantsRelic }`
 */
export function generateWaveDescriptor(realmIndex, waveNumber, isEndless = false, skullMods = {}) {
  const realm = REALMS[realmIndex] || REALMS[0];
  const pool = REALM_ENEMY_POOLS[realmIndex] || REALM_ENEMY_POOLS[0];
  const portals = realm.spawnPortals;
  const isFinalCampaignWave = !isEndless && waveNumber === realm.totalWaves;
  const isMidBossWave = waveNumber === Math.floor(realm.totalWaves / 2) && waveNumber >= 5;
  const isEndlessBossWave = isEndless && waveNumber % 5 === 0;
  const isBossWave = isFinalCampaignWave || isEndlessBossWave;

  const countMult = 1 + (skullMods.enemyCountBonus || 0);
  const hpScale = (1 + (waveNumber - 1) * 0.16 + realmIndex * 0.14) * (1 + (skullMods.enemyHpBonus || 0));
  const dmgScale = (1 + (waveNumber - 1) * 0.10 + realmIndex * 0.10) * (1 + (skullMods.enemyDmgBonus || 0));

  const groups = [];
  const activePortalCount = Math.min(
    portals.length,
    waveNumber <= 2 ? 1 : waveNumber <= 5 ? 2 : waveNumber <= 8 ? 3 : portals.length
  );

  for (let p = 0; p < activePortalCount; p++) {
    const portalIdx = p % portals.length;
    // Fodder wave pack
    const fodderId = pool.fodder[(waveNumber + p) % pool.fodder.length];
    const fodderCount = Math.max(4, Math.round((6 + waveNumber * 2.4) * countMult / activePortalCount));
    groups.push({
      portalIndex: portalIdx,
      portalId: portals[portalIdx].id,
       portalName: portals[portalIdx].name,
      enemyId: fodderId,
      count: fodderCount,
      interval: Math.max(0.38, 1.05 - waveNumber * 0.04),
      delay: p * 1.5,
      hpScale,
      dmgScale,
    });

    // Regular wave pack (from wave 2+)
    if (waveNumber >= 2) {
      const regId = pool.regular[(waveNumber + p) % pool.regular.length];
      const regCount = Math.max(2, Math.round((2 + waveNumber * 1.3) * countMult / activePortalCount));
      groups.push({
        portalIndex: portalIdx,
        portalId: portals[portalIdx].id,
        portalName: portals[portalIdx].name,
        enemyId: regId,
        count: regCount,
        interval: 1.2,
        delay: 2.5 + p * 1.2,
        hpScale,
        dmgScale,
      });
    }

    // Specialist wave pack (from wave 4+)
    if (waveNumber >= 4) {
      const specId = pool.specialist[(waveNumber + p) % pool.specialist.length];
      const specCount = Math.max(1, Math.round((1 + (waveNumber - 3) * 0.9) * countMult / activePortalCount));
      groups.push({
        portalIndex: portalIdx,
        portalId: portals[portalIdx].id,
        portalName: portals[portalIdx].name,
        enemyId: specId,
        count: specCount,
        interval: 1.65,
        delay: 4.5 + p * 1.5,
        hpScale,
        dmgScale,
      });
    }

    // Heavy siege units (from wave 6+ or midboss wave)
    if (waveNumber >= 6 || isMidBossWave) {
      const heavyId = pool.heavy[(waveNumber + p) % pool.heavy.length];
      const heavyCount = Math.max(1, Math.round((waveNumber - 4) * 0.55 * countMult / activePortalCount));
      groups.push({
        portalIndex: portalIdx,
        portalId: portals[portalIdx].id,
        portalName: portals[portalIdx].name,
        enemyId: heavyId,
        count: heavyCount,
        interval: 2.8,
        delay: 6.0 + p * 2.0,
        hpScale,
        dmgScale,
      });
    }
  }

  // Boss spawn on Final Wave or every 5th Endless wave
  if (isBossWave) {
    const bossId = isEndless
      ? REALM_ENEMY_POOLS[(realmIndex + Math.floor(waveNumber / 5) - 1) % REALM_ENEMY_POOLS.length].boss
      : pool.boss;
    groups.push({
      portalIndex: 0,
      portalId: portals[0].id,
      portalName: portals[0].name,
      enemyId: bossId,
      count: 1,
      interval: 3.0,
      delay: 4.0,
      hpScale: hpScale * (1 + (skullMods.bossHpBonus || 0)),
      dmgScale,
    });
  }

  // Summarize threat composition for daytime tactical preview badges
  const summaryMap = {};
  for (const g of groups) {
    if (!summaryMap[g.portalId]) {
      summaryMap[g.portalId] = { portalId: g.portalId, portalName: g.portalName, portalIndex: g.portalIndex, enemies: {} };
    }
    summaryMap[g.portalId].enemies[g.enemyId] = (summaryMap[g.portalId].enemies[g.enemyId] || 0) + g.count;
  }

  return {
    waveNumber,
    isBossWave,
    isMidBossWave,
    title: isBossWave
      ? `💀 제${waveNumber}야: 심연의 군주 강림`
      : isMidBossWave
      ? `⚔️ 제${waveNumber}야: 정예 공성군 선봉대`
      : `🌙 제${waveNumber}야: 어둠의 진군`,
    groups,
    portalSummaries: Object.values(summaryMap),
    clearGoldBonus: Math.round(25 + waveNumber * 12 + (isBossWave ? 90 : 0)),
    clearArgonBonus: Math.round(2 + Math.floor(waveNumber / 2) + (isBossWave ? 8 : 0)),
    grantsRelic: true, // Player drafts a Royal Relic after surviving each night!
  };
}

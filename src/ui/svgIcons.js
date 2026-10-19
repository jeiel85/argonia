/**
 * ARGONIA: Crown of the Spire
 * Bespoke Obsidian & Brass Vector SVG Icon System (Zero Emoji / Zero AI-Slop)
 *
 * Replaces all unicode emojis across the Command Hub, Codex, Sanctum, Relic Rack,
 * and Tactical Modals with crisp geometric heraldic line-art SVGs.
 */

const PATHS = {
  crown: `<polygon points="3,18 5,7 9.5,12 12,5 14.5,12 19,7 21,18"/><line x1="3" y1="21" x2="21" y2="21"/>`,
  sword: `<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/>`,
  swords: `<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M9.5 17.5L21 6V3h-3L6.5 14.5"/><path d="M11 19l-6-6"/>`,
  shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="6" x2="12" y2="18"/>`,
  tower: `<path d="M5 3h2v3h3V3h4v3h3V3h2v6l-2 2v10H7V11L5 9V3z"/><line x1="9" y1="21" x2="9" y2="15"/><line x1="15" y1="21" x2="15" y2="15"/>`,
  citadel: `<polygon points="12,2 16,7 16,21 8,21 8,7"/><rect x="3" y="11" width="5" height="10"/><rect x="16" y="11" width="5" height="10"/>`,
  coin: `<circle cx="12" cy="12" r="9"/><polygon points="12,7 15,12 12,17 9,12"/>`,
  crystal: `<polygon points="12,2 20,8.5 12,22 4,8.5"/><line x1="4" y1="8.5" x2="20" y2="8.5"/>`,
  windmill: `<circle cx="12" cy="12" r="2.5"/><path d="M12 2v7.5M12 14.5V22M2 12h7.5M14.5 12H22"/><path d="M4.9 4.9l5.3 5.3M13.8 13.8l5.3 5.3M19.1 4.9l-5.3 5.3M10.2 13.8l-5.3 5.3"/>`,
  flame: `<path d="M12 2c1.5 4 6 6.5 6 12a6 6 0 0 1-12 0c0-3.5 2-6.5 4-8.5 0 2.5 2 3.5 2 3.5s-1-4 0-7z"/>`,
  frost: `<line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="4.9" y2="19.1"/><polygon points="12,8 16,12 12,16 8,12"/>`,
  arcane: `<polygon points="12,2 15,9 22,12 15,15 12,22 9,15 2,12 9,9"/><circle cx="12" cy="12" r="2"/>`,
  bow: `<path d="M5 3c9 2 14 7 14 9s-5 7-14 9"/><line x1="5" y1="3" x2="5" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/><polyline points="17,8 21,12 17,16"/>`,
  scythe: `<path d="M6 21L17 4"/><path d="M17 4c-5-2-11 0-14 5 4-1 8 0 11 3"/>`,
  skull: `<circle cx="12" cy="10" r="7"/><rect x="8" y="15" width="8" height="6"/><circle cx="9.5" cy="10" r="1.5"/><circle cx="14.5" cy="10" r="1.5"/>`,
  boss: `<polygon points="12,2 19,7 22,15 17,21 7,21 2,15 5,7"/><polygon points="8,10 11,12 8,14"/><polygon points="16,10 13,12 16,14"/>`,
  wing: `<path d="M3 19c4-1 8-4 11-9 2-3.5 5-6 8-7-1 5-3 9-6 12-3 3-7 4-13 4z"/>`,
  lock: `<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>`,
  star: `<polygon points="12,2 14.8,8.5 22,9.3 16.5,14 18.2,21 12,17.3 5.8,21 7.5,14 2,9.3 9.2,8.5"/>`,
  sun: `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/>`,
  infinity: `<path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/>`,
  reroll: `<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>`,
  relic: `<polygon points="12,2 21,7 21,17 12,22 3,17 3,7"/><polygon points="12,7 16.5,9.5 16.5,14.5 12,17 7.5,14.5 7.5,9.5"/>`,
};

/**
 * Renders an inline SVG icon string by key.
 */
export function svgIcon(key = 'relic', size = 14, color = 'currentColor') {
  const body = PATHS[key] || PATHS.relic;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;flex-shrink:0;">${body}</svg>`;
}

/**
 * Infers the best bespoke heraldic SVG icon from an entity's id, category, or name.
 */
export function resolveEntitySvgKey(entityOrId) {
  if (!entityOrId) return 'relic';
  const id = typeof entityOrId === 'string'
    ? entityOrId.toLowerCase()
    : String(entityOrId.id || entityOrId.category || entityOrId.name || '').toLowerCase();

  if (entityOrId?.isBoss || id.startsWith('boss_')) return 'boss';
  if (entityOrId?.isFlying) return 'wing';

  if (id.includes('arthuria') || id.includes('crown') || id.includes('royal') || id.includes('monarch')) return 'crown';
  if (id.includes('kaelen') || id.includes('arcane') || id.includes('obelisk') || id.includes('chrono')) return 'arcane';
  if (id.includes('sylvanis') || id.includes('archer') || id.includes('bow') || id.includes('sniper') || id.includes('volley') || id.includes('meadow')) return 'bow';
  if (id.includes('vespera') || id.includes('void') || id.includes('scythe') || id.includes('malakor') || id.includes('rift')) return 'scythe';
  if (id.includes('citadel') || id.includes('keep')) return 'citadel';
  if (id.includes('gold') || id.includes('mine') || id.includes('mint') || id.includes('greed') || id.includes('economy')) return 'coin';
  if (id.includes('windmill') || id.includes('wheat') || id.includes('harvest')) return 'windmill';
  if (id.includes('argon') || id.includes('refinery') || id.includes('crystal')) return 'crystal';
  if (id.includes('flame') || id.includes('mortar') || id.includes('fire') || id.includes('cinder') || id.includes('ignis') || id.includes('solar') || id.includes('sun')) return 'flame';
  if (id.includes('frost') || id.includes('glacier') || id.includes('ice') || id.includes('boreal')) return 'frost';
  if (id.includes('barracks') || id.includes('wall') || id.includes('shield') || id.includes('bastion') || id.includes('iron') || id.includes('defense')) return 'shield';
  if (id.includes('tower') || id.includes('fortress')) return 'tower';
  if (id.includes('skull') || id.includes('blood') || id.includes('undead') || id.includes('necromancer')) return 'skull';
  if (id.includes('sword') || id.includes('combat') || id.includes('war') || id.includes('slayer') || id.includes('goblin') || id.includes('orc')) return 'swords';

  return 'relic';
}

export function entitySvg(entityOrId, size = 14, color = 'currentColor') {
  return svgIcon(resolveEntitySvgKey(entityOrId), size, color);
}

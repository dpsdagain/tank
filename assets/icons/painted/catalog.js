/* Painted weapon badges from the saved Flow boards. Source JPEGs are unmodified. */
(function (root) {
  'use strict';
  const sheets = [
    { src: 'assets/icons/painted/classic.jpg', size: [1376, 768], sha256: 'd09a8286dca1e3f1d3bf2af1007a76855a868318596d813bb8980a6d0037d925',
      columns: [143, 447, 751, 1055], rows: [47, 293, 534], cell: [179, 179],
      ids: ['single_shot', 'big_shot', '3_shot', '5_shot', 'sniper_rifle', 'cannon_ball', 'chain_reaction', 'skipper', 'roller', 'heavy_roller', 'napalm', 'hail_storm'] },
    { src: 'assets/icons/painted/terrain.jpg', size: [1376, 768], sha256: '94d9662439d13837c1dc4b0cf9602937cc377096fc420802d848eef7faf74334',
      columns: [245, 481, 715, 950], rows: [46, 292, 532], cell: [185, 185],
      ids: ['dirtball', 'big_dirtball', 'dirt_slinger', 'mud_pie', 'jackhammer', 'digger', 'ground_hog', 'pile_driver', 'heatseeker', 'homing_worm', 'beehive', 'pin_cushion'] },
    { src: 'assets/icons/painted/energy.jpg', size: [1376, 768], sha256: '76616931b768c62633771277158354feaae360018d8a3fda93a9fe67b9c80932',
      columns: [204, 468, 729, 991], rows: [30, 278, 522], cell: [199, 199],
      ids: ['laser', 'super_laser', 'lightning_strike', 'space_laser', 'nuke', 'mega_nuke', 'comet', 'meteor_shower', 'fireball', 'volcano', 'jump_jets', 'magic_wall'] }
  ];
  const catalog = Object.freeze(Object.fromEntries(sheets.flatMap((sheet, sheetIndex) =>
    sheet.ids.map((id, index) => [id, Object.freeze({ sheet: sheetIndex,
      rect: Object.freeze([sheet.columns[index % 4], sheet.rows[Math.floor(index / 4)], ...sheet.cell]) })]))));
  function html(weapon) {
    const frame = catalog[weapon.id];
    if (!frame) return `<img src="assets/icons/${weapon.icon}.png" alt="">`;
    const sheet = sheets[frame.sheet], [x, y, w, h] = frame.rect, [sw, sh] = sheet.size;
    // CSS samples only the illustrated badge; board labels and neighboring tiles
    // remain outside its window. No generated-image pixels are rewritten.
    const size = `${sw / w * 100}% ${sh / h * 100}%`;
    const position = `${x / (sw - w) * 100}% ${y / (sh - h) * 100}%`;
    return `<span class="weapon-icon" data-weapon-icon="${weapon.id}" data-sheet="${frame.sheet}" aria-hidden="true"><img class="weapon-icon-fallback" src="assets/icons/${weapon.icon}.png" alt="" decoding="async"><span class="weapon-icon-paint" style="background-image:url('${sheet.src}');background-size:${size};background-position:${position}"></span></span>`;
  }
  // One decode per board. Existing icons stay visible if artwork cannot load.
  const images = [];
  if (typeof document !== 'undefined' && typeof Image !== 'undefined') sheets.forEach((sheet, index) => {
    const img = new Image(); images.push(img); img.decoding = 'async';
    img.onload = () => document.documentElement.classList.add(`weapon-art-${index}`);
    img.src = sheet.src;
  });
  const api = Object.freeze({ catalog, sheets, html });
  root.WeaponIcons = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

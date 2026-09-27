/*
 * 啾啾與啵啵：情侶紀錄 App 的吉祥物（定稿 2026-09-27）
 * 純 SVG 字串，不需要圖檔。用法見同資料夾的 README.md。
 *
 *   Mascot.svg('happy')                         // 預設配色：奶油黃 × 霧藍
 *   Mascot.svg('cloud', { left: '蜜桃', right: '天藍' })
 *   Mascot.COLORS                               // 12 個可選顏色 [名稱, 身體色, 肚子色]
 *
 * 表情 mood：happy 首頁、empty 沒有紀錄、celebrate 蓋到印章、cloud 烏雲、fight 吵架、clear 放晴
 */
(function () {
const INK = '#4A3530';
const BLUSH = '#F29BAE';
const SW = 'stroke="' + INK + '" stroke-linecap="round" stroke-linejoin="round"';

/* ---------- 共用小元件 ---------- */
function face(mood, o = {}) {
  const d = o.d || 11;
  let s = '';
  const fight = mood === 'fight';
  const br = fight ? 5.6 : 4.3;
  const op = mood === 'cloud' ? .45 : .85;
  for (const sx of [-1, 1]) s += `<ellipse cx="${sx * (d + 7)}" cy="6" rx="${br}" ry="${br * .62}" fill="${fight ? '#EE7F95' : BLUSH}" opacity="${op}"/>`;
  const eye = { happy: 'arc', celebrate: 'arc', clear: 'arc', empty: 'dot', cloud: 'dot', fight: 'dot', sleep: 'sleep' }[mood];
  for (const sx of [-1, 1]) {
    const x = sx * d;
    if (eye === 'arc' && o.soft) s += `<path d="M${x - 3.5} 1 Q${x} -3.5 ${x + 3.5} 1" fill="none" ${SW} stroke-width="2.6"/>`;
    else if (eye === 'arc') s += `<path d="M${x - 4.5} 1.5 Q${x} -5 ${x + 4.5} 1.5" fill="none" ${SW} stroke-width="2.6"/>`;
    else if (eye === 'sleep') s += `<path d="M${x - 4.5} -.5 Q${x} 3.5 ${x + 4.5} -.5" fill="none" ${SW} stroke-width="2.6"/>`;
    else s += `<circle cx="${x}" cy="0" r="3.4" fill="${INK}"/><circle cx="${x + 1.1}" cy="-1.3" r="1.05" fill="#fff"/>`;
    const outer = x + sx * 5, inner = x - sx * 4;
    if (mood === 'cloud') s += `<path d="M${outer} -6 L${inner} -9.5" ${SW} stroke-width="2.2"/>`;
    if (fight) s += `<path d="M${outer} -10 L${inner} -6.5" ${SW} stroke-width="2.2"/>`;
  }
  if (mood === 'cloud') s += `<path d="M${d + 1} 5 Q${d + 4} 10 ${d + 1} 12 Q${d - 2} 10 ${d + 1} 5Z" fill="#8DB3E2"/>`;
  if (o.beak) {
    if (mood === 'celebrate') s += `<path d="M-4 3.5 L4 3.5 L0 7.5Z" fill="#F2A541" ${SW} stroke-width="1.8"/><path d="M-3 9 L3 9 L0 12.5Z" fill="#F2A541" ${SW} stroke-width="1.8"/>`;
    else s += `<path d="M-3.8 4 L3.8 4 L0 9.5Z" fill="#F2A541" ${SW} stroke-width="1.8"/>`;
  } else {
    const m = {
      happy: `<path d="M-4.5 7 Q0 11.5 4.5 7" fill="none" ${SW} stroke-width="2.4"/>`,
      clear: `<path d="M-4.5 7 Q0 11.5 4.5 7" fill="none" ${SW} stroke-width="2.4"/>`,
      empty: `<path d="M-3 8 Q0 10.5 3 8" fill="none" ${SW} stroke-width="2.4"/>`,
      celebrate: `<path d="M-5.5 6.5 Q0 16 5.5 6.5Z" fill="#C4455E" ${SW} stroke-width="2.2"/>`,
      cloud: `<path d="M-5 10 q2.5 -3 5 0 q2.5 3 5 0" fill="none" ${SW} stroke-width="2.2"/>`,
      fight: `<path d="M-3.5 10 Q0 7 3.5 10" fill="none" ${SW} stroke-width="2.4"/>`,
      sleep: `<circle cx="0" cy="8.5" r="1.8" fill="${INK}"/>`,
    }[mood];
    const softM = {
      happy: `<path d="M-2.5 6.5 Q0 8.8 2.5 6.5" fill="none" ${SW} stroke-width="2.3"/>`,
      clear: `<path d="M-2.5 6.5 Q0 8.8 2.5 6.5" fill="none" ${SW} stroke-width="2.3"/>`,
      celebrate: `<path d="M-3.5 6 Q0 10.5 3.5 6" fill="none" ${SW} stroke-width="2.3"/>`,
      empty: `<path d="M-2 7 Q0 8.5 2 7" fill="none" ${SW} stroke-width="2.3"/>`,
    }[mood];
    s += (o.soft && softM) || m;
  }
  return s;
}
const heart = (x, y, sc = 1, fill = '#E0607E') =>
  `<path transform="translate(${x} ${y}) scale(${sc})" d="M0 5 C-7 -1 -11 -8 -5.5 -11.5 C-2.5 -13.5 0 -11 0 -8.5 C0 -11 2.5 -13.5 5.5 -11.5 C11 -8 7 -1 0 5Z" fill="${fill}" ${SW} stroke-width="2"/>`;
const sparkle = (x, y, sc = 1, fill = '#F7C35C') =>
  `<path transform="translate(${x} ${y}) scale(${sc})" d="M0 -7 Q1.2 -1.2 7 0 Q1.2 1.2 0 7 Q-1.2 1.2 -7 0 Q-1.2 -1.2 0 -7Z" fill="${fill}"/>`;
const drop = (x, y, sc = 1) =>
  `<path transform="translate(${x} ${y}) scale(${sc})" d="M0 -5 Q4.5 1 0 4 Q-4.5 1 0 -5Z" fill="#8DB3E2"/>`;
const bolt = (x, y, sc = 1) =>
  `<path transform="translate(${x} ${y}) scale(${sc})" d="M3 -11 L-6 1 L0 1 L-3 11 L7 -2 L1 -2Z" fill="#F7C35C" ${SW} stroke-width="2"/>`;
function sun(x, y, r) {
  let s = `<g transform="translate(${x} ${y})">`;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, r1 = r + 4, r2 = r + 10;
    s += `<line x1="${(Math.cos(a) * r1).toFixed(1)}" y1="${(Math.sin(a) * r1).toFixed(1)}" x2="${(Math.cos(a) * r2).toFixed(1)}" y2="${(Math.sin(a) * r2).toFixed(1)}" stroke="#F2A541" stroke-width="3" stroke-linecap="round"/>`;
  }
  return s + `<circle r="${r}" fill="#F7C35C" ${SW} stroke-width="2.5"/></g>`;
}
function confetti(seed = 1) {
  const cols = ['#E0607E', '#F7C35C', '#8DBF7A', '#7FA3D6', '#C7A3E0'];
  const pts = [[18, 20], [40, 10], [124, 12], [146, 26], [30, 44], [136, 50], [70, 8], [98, 14], [12, 64], [150, 70]];
  return pts.map(([x, y], i) => {
    const c = cols[(i + seed) % cols.length];
    return i % 3 === 0
      ? `<circle cx="${x}" cy="${y}" r="2.6" fill="${c}"/>`
      : `<rect x="${x - 3}" y="${y - 1.6}" width="6" height="3.2" rx="1" fill="${c}" transform="rotate(${(i * 37) % 90 - 45} ${x} ${y})"/>`;
  }).join('');
}
const svg = (inner, label) => `<svg viewBox="0 0 160 112" role="img" aria-label="${label}">${inner}</svg>`;


/* 線條變細、墨色變淡：第二輪用 */
const SOFT_INK = '#6E534B';
const soften = str => str
  .replace(/stroke-width="([\d.]+)"/g, (m, v) => `stroke-width="${Math.max(v * .6, 1.6).toFixed(2)}"`)
  .replaceAll(INK, SOFT_INK);
function bird(x, y, bodyC, bellyC, mood, o = {}) {
  let g = `<g transform="translate(${x} ${y}) rotate(${o.rot || 0})">`;
  g += `<path d="M-7 22 L-7 28 M7 22 L7 28" stroke="#E09A3A" stroke-width="2.6" stroke-linecap="round"/>`;
  if (o.flap) g += `<ellipse cx="-27" cy="-8" rx="7" ry="12" transform="rotate(-45 -27 -8)" fill="${bodyC}" ${SW} stroke-width="2.6"/><ellipse cx="27" cy="-8" rx="7" ry="12" transform="rotate(45 27 -8)" fill="${bodyC}" ${SW} stroke-width="2.6"/>`;
  else g += `<ellipse cx="-22" cy="6" rx="7" ry="12" transform="rotate(20 -22 6)" fill="${bodyC}" ${SW} stroke-width="2.6"/><ellipse cx="22" cy="6" rx="7" ry="12" transform="rotate(-20 22 6)" fill="${bodyC}" ${SW} stroke-width="2.6"/>`;
  g += `<circle r="24" fill="${bodyC}" ${SW} stroke-width="3"/><ellipse cx="0" cy="11" rx="14" ry="10" fill="${bellyC}"/>`;
  g += mood === 'fight'
    ? `<path d="M-6 -23 L-4 -33 L0 -26 L3 -35 L6 -23" fill="none" ${SW} stroke-width="2.4"/>`
    : `<path d="M-3 -23 Q-7 -33 0 -30 Q3 -37 6 -26" fill="none" ${SW} stroke-width="2.4"/>`;
  g += `<g transform="translate(0 -4)">${face(mood, { beak: 1, d: 10 })}</g></g>`;
  return g;
}
function scene(mood, pal) {
  const branch = `<path d="M8 98 Q80 91 154 99" fill="none" stroke="#8A5A12" stroke-width="5" stroke-linecap="round"/><path d="M140 97 C146 88 156 88 158 92 C154 98 146 99 140 97Z" fill="#8DBF7A" ${SW} stroke-width="2"/>`;
  const [PB, PL] = pal.L, [YB, YL] = pal.R;
  const pair = (m, lr, rr, o = {}) =>
    bird(104 + (o.dx || 0), 70, YB, YL, m, { rot: rr, ...o }) + bird(56 - (o.dx || 0), 70, PB, PL, m, { rot: lr, ...o });
  switch (mood) {
    case 'happy': return svg(branch + pair('happy', 10, -10) + heart(80, 24, 1.1), '兩隻小鸚鵡靠在一起');
    case 'empty': return svg(branch + pair('empty', 0, 0) + `<path d="M118 14 h30 a6 6 0 0 1 6 6 v10 a6 6 0 0 1 -6 6 h-22 l-6 6 v-6 h-2 a6 6 0 0 1 -6 -6 v-10 a6 6 0 0 1 6 -6Z" fill="#fff" ${SW} stroke-width="2.2"/><circle cx="127" cy="25" r="1.8" fill="${INK}"/><circle cx="134" cy="25" r="1.8" fill="${INK}"/><circle cx="141" cy="25" r="1.8" fill="${INK}"/>`, '兩隻小鸚鵡在等第一則紀錄');
    case 'celebrate': return svg(confetti(1) + branch + pair('celebrate', 0, 0, { flap: 1 }), '兩隻小鸚鵡拍翅膀慶祝');
    case 'cloud': return svg(branch + pair('cloud', 8, -4) + `<path d="M104 46 L100 22" ${SW} stroke-width="2.4"/><path d="M34 30 C50 6 118 2 130 26 C112 18 100 24 96 24 C88 18 70 16 34 30Z" fill="#8DBF7A" ${SW} stroke-width="2.6"/>` + drop(22, 22) + drop(140, 40) + drop(62, 6, .8) + drop(116, 4, .8), '下雨了，一隻用葉子幫另一隻撐傘');
    case 'fight': return svg(branch + pair('fight', -12, 12, { dx: 6 }) + bolt(80, 60, 1.1), '兩隻小鸚鵡羽毛炸起來');
    case 'clear': return svg(sun(80, 24, 12) + branch + pair('clear', 10, -10) + sparkle(22, 36) + sparkle(140, 40, .8), '放晴了，兩隻小鸚鵡曬太陽');
  }
}


const BIRD_COLORS = [
  ['蜜桃', '#F8C8B4', '#FDEAE1'], ['珊瑚', '#F5B3A2', '#FDE4DC'], ['櫻花粉', '#F4BFCB', '#FCE6EB'],
  ['奶油黃', '#F6DE9A', '#FCF3D6'], ['奶茶', '#E6CDB2', '#F7ECDF'], ['抹茶', '#C9D9A6', '#EFF4E1'],
  ['薄荷', '#B9E0CE', '#E6F5EE'], ['天藍', '#B8D5EF', '#E5EFFA'], ['霧藍', '#A9BEDD', '#E2EAF5'],
  ['灰藍', '#B7C3CF', '#E7ECF1'], ['薰衣草', '#CFC3EA', '#EFEAF9'], ['奶霜白', '#F3EEE6', '#FFFFFF'],
];

const DEFAULT = { left: '奶油黃', right: '霧藍' };
const byName = n => BIRD_COLORS.find(c => c[0] === n);
const MOODS = ['happy', 'empty', 'celebrate', 'cloud', 'fight', 'clear'];
function mascotSVG(mood = 'happy', pick = {}) {
  if (!MOODS.includes(mood)) mood = 'happy';
  const l = byName(pick.left) || byName(DEFAULT.left);
  const r = byName(pick.right) || byName(DEFAULT.right);
  return soften(scene(mood, { L: [l[1], l[2]], R: [r[1], r[2]] }));
}
window.Mascot = { svg: mascotSVG, COLORS: BIRD_COLORS, DEFAULT, MOODS };
})();

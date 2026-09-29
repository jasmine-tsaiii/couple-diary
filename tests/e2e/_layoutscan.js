// 跑版掃描小幫手：找出畫面上「很短的字卻被擠成好幾行」、超出螢幕寬度、被切掉的字
// 用法：const issues = await p.evaluate(require('./_layoutscan'), '.tile *')  第二個參數：這些地方本來就會自然換行，不檢查「擠成多行」
module.exports = function layoutScan(ignore) {
  const out = [];
  const W = document.documentElement.clientWidth;
  const seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter('zh', { granularity: 'grapheme' }) : null;
  const glen = (s) => (seg ? [...seg.segment(s)].length : [...s].length);
  const visible = (el) => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const hidden = (el) => el.closest('[hidden], .tour-dlg, .swipe-back, script, style, svg, noscript, template');
  // 橫向可捲的容器（例如 chips 橫排）裡面超出去不算
  const inScroller = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true; } return false; };
  const desc = (el) => { const c = (el.className && el.className.baseVal === undefined ? el.className : '').toString().trim().split(/\s+/).slice(0, 2).join('.'); return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : ''); };
  if (document.scrollingElement.scrollWidth > W + 1) out.push({ kind: 'page-hscroll', text: `頁面可以左右捲 ${document.scrollingElement.scrollWidth}>${W}` });
  const els = document.querySelectorAll('#app *, .tabbar *, .celebrate *, .sheet *, dialog *');
  for (const el of els) {
    if (hidden(el) || !visible(el)) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    const text = (el.innerText || '').trim().replace(/\s+/g, ' ');
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    // 1. 很短的字被擠成多行（例如「新增的」斷成「新增 / 的」、「編輯過」斷成「編輯 / 過」；18 個字以內）
    if (own && text && glen(text) <= 18 && !(ignore && el.matches(ignore))) {
      // 每一段文字各自算：一段短字自己被拆成兩行才算（名字很長、整段換到下一行不算）
      const lines = Math.max(0, ...[...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => {
        const rg = document.createRange(); rg.selectNodeContents(n);
        // 上下沒有重疊才算新的一行（emoji 的字框比較高，同一行也會有高低不同的框）
        const rs = [...rg.getClientRects()].filter((x) => x.width > 1).sort((a, b) => a.top - b.top);
        let k = 0, bottom = -Infinity;
        for (const x of rs) { if (x.top >= bottom - 2) { k++; bottom = x.bottom; } else bottom = Math.max(bottom, x.bottom); }
        return k;
      }));
      if (lines >= 2) { el.setAttribute('data-ls', out.length); out.push({ kind: 'squeezed', el: desc(el), text, w: Math.round(r.width), i: out.length }); }
    }
    // 2. 超出螢幕
    if ((r.right > W + 1 || r.left < -1) && !inScroller(el) && s.position !== 'fixed') out.push({ kind: 'overflow', el: desc(el), text: text.slice(0, 30), right: Math.round(r.right) });
    // 3. 字被切掉（overflow:hidden 又沒有 … 省略號）
    if (own && (s.overflow === 'hidden' || s.overflowX === 'hidden') && s.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2 && s.whiteSpace === 'nowrap') out.push({ kind: 'clipped', el: desc(el), text: text.slice(0, 30) });
  }
  // 同一個元素只回報一次
  const seen = new Set();
  return out.filter((x) => { const k = x.kind + x.el + x.text; if (seen.has(k)) return false; seen.add(k); return true; });
};

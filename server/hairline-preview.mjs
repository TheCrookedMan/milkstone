import { createHash } from 'node:crypto'

/** A separate, opaque-origin host. The original downloadable bench is unchanged. */
export function createPreview({ id, source, kernel }) {
  const adapter = `(() => {
  const id = ${JSON.stringify(id)};
  let sent = false, handle;
  const report = (data) => { if (!sent) { sent = true; parent.postMessage({type:'milkstone-hairline-preview', id, ...data}, '*'); } };
  const failed = () => report({error:'Figure could not be rendered.'});
  addEventListener('error', failed);
  addEventListener('unhandledrejection', failed);
  setTimeout(failed, 9000);
  const attrs = ['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-dasharray','stroke-dashoffset','fill-opacity','stroke-opacity','opacity','fill-rule','vector-effect','stop-color','stop-opacity'];
  const tags = new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','defs','mask','linearGradient','stop']);
  const localUrl = value => {
    if (!value.includes('url(')) return value;
    const match = value.match(/^url\\([\"']?(?:[^#]*)#([a-zA-Z_][\\w:.-]*)[\"']?\\)$/);
    return match ? 'url(#'+match[1]+')' : 'none';
  };
  function snapshot(svg) {
    const clone = svg.cloneNode(true);
    const originals = [svg, ...svg.querySelectorAll('*')];
    const copies = [clone, ...clone.querySelectorAll('*')];
    if (copies.length > 2000) throw Error('Too many nodes');
    copies.forEach((el, index) => {
      if (!tags.has(el.localName)) throw Error('Unsupported node');
      for (const attr of [...el.attributes]) {
        if (/^on/i.test(attr.name) || ['style','class','href','xlink:href','tabindex','role','aria-label'].includes(attr.name)) el.removeAttribute(attr.name);
      }
      const computed = getComputedStyle(originals[index]);
      for (const key of attrs) {
        const value = computed.getPropertyValue(key).trim();
        if (value && !(key === 'vector-effect' && value === 'none')) el.setAttribute(key, localUrl(value));
      }
      if (el.hasAttribute('mask')) el.setAttribute('mask', localUrl(el.getAttribute('mask')));
    });
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    clone.setAttribute('width','400'); clone.setAttribute('height','320');
    return new XMLSerializer().serializeToString(clone);
  }
  const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.hairline = async figure => {
    try {
      const stage = document.getElementById('stage');
      HL.inject(document);
      stage.dataset.hairline = figure.name;
      stage.setAttribute('role','img'); stage.setAttribute('aria-label',figure.means);
      const svg = HL.mk('svg',{viewBox:'0 0 400 320','aria-hidden':'true'},stage);
      handle = figure.mount({stage,svg,read:document.getElementById('read')}, figure.range[1]);
      await new Promise(resolve => setTimeout(resolve, 1100));
      const palettes = {
        light: {plate:'#ebedf1',hi:'#2e3540',edge:'#8e97a4',mid:'#b4bbc6',lo:'#d2d7df'},
        dark: {plate:'#1d2025',hi:'#e2e7ef',edge:'#79818c',mid:'#505863',lo:'#343b45'},
        milk: {plate:'#f7f4ee',hi:'#48473f',edge:'#8d8a80',mid:'#b7b2a7',lo:'#ddd7cb'}
      };
      const palette = mode => {
        document.documentElement.dataset.theme = mode === 'dark' ? 'dark' : 'light';
        for (const [key,value] of Object.entries(palettes[mode])) stage.style.setProperty('--hairline-'+key,value);
      };
      palette('light'); await frame();
      const lightSvg = snapshot(svg);
      palette('dark'); await frame();
      const darkSvg = snapshot(svg);
      palette('milk'); await frame();
      const milkSvg = snapshot(svg);
      report({lightSvg,darkSvg,milkSvg});
    } catch { failed(); }
  };
  addEventListener('pagehide', () => handle?.destroy?.(), {once:true});
})();`
  const scripts = [kernel, adapter, source]
  const hashes = scripts.map(code => `'sha256-${createHash('sha256').update(code).digest('base64')}'`).join(' ')
  // The caller must also set iframe sandbox="allow-scripts" without same-origin.
  return `<!doctype html><html lang="zh-CN" data-theme="light"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${hashes}; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"><style>html,body{margin:0;width:400px;height:320px;overflow:hidden}#stage{width:400px;height:320px;position:relative}#stage svg{display:block;width:400px;height:320px}#stage *{transition:none!important}#read{display:none}</style></head><body><div id="stage"></div><output id="read">rest</output><script>${kernel}</script><script>${adapter}</script><script type="module">${source}</script></body></html>`
}

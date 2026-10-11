import kernel from './hairline/runtime/kernel.js?raw'

export interface HairlinePalette { plate: string; hi: string; edge: string; mid: string; lo: string }
export const hairlinePalettes: Record<'light' | 'dark' | 'milk', HairlinePalette> = {
  light: { plate: '#ebedf1', hi: '#2e3540', edge: '#8e97a4', mid: '#b4bbc6', lo: '#d2d7df' },
  dark: { plate: '#1d2025', hi: '#e2e7ef', edge: '#79818c', mid: '#505863', lo: '#343b45' },
  milk: { plate: '#f7f4ee', hi: '#48473f', edge: '#8d8a80', mid: '#b7b2a7', lo: '#ddd7cb' },
}

/** Only this fixed host and kernel execute a figure; imported HTML is never embedded. */
export function hairlineInteractionDocument(id: string, source: string): string {
  if (!/^[\w-]{1,100}$/.test(id) || !source.trim() || source.length > 40_000 || /<\/?script\b/i.test(source)) throw new Error('这幅作品没有可用的交互源码，仍可查看静态线稿。')
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(18)), b => b.toString(16).padStart(2, '0')).join('')
  const adapter = `(() => {
    const id = ${JSON.stringify(id)};
    const stage = document.getElementById('stage');
    const readout = document.getElementById('read');
    let text = 'rest';
    const read = {
      get textContent() { return text; },
      set textContent(value) {
        text = String(value ?? '');
        if (stage.matches(':hover') || stage.contains(document.activeElement) || text === 'rest') readout.textContent = text === 'rest' ? '静止' : text;
      }
    };
    let figure, handle, playing, mounted = false, ready = false, config = { play: false };
    const send = data => parent.postMessage({ type: 'milkstone-hairline-interaction', id, ...data }, '*');
    const fail = () => { playing?.stop(); handle?.destroy?.(); send({ error: true }); };
    addEventListener('error', fail);
    addEventListener('unhandledrejection', fail);
    const watchdog = setTimeout(() => { if (!ready) fail(); }, 7000);
    function update() {
      if (config.palette) for (const key of ['plate','hi','edge','mid','lo']) {
        const value = config.palette[key];
        if (typeof value === 'string' && /^(#[a-f0-9]{3,8}|rgba?\\([\\d.,% /]+\\))$/i.test(value)) stage.style.setProperty('--hairline-' + key, value);
      }
      document.documentElement.dataset.theme = config.theme === 'dark' ? 'dark' : 'light';
      document.documentElement.style.colorScheme = config.theme === 'dark' ? 'dark' : 'light';
      if (!handle) return;
      if (config.play && !playing) playing = HL.tour(stage, figure.tour || HL.LAP);
      if (!config.play && playing) { playing.stop(); playing = null; }
    }
    addEventListener('message', event => {
      const data = event.data;
      if (event.source !== parent || !data || data.type !== 'milkstone-hairline-control' || data.id !== id) return;
      config = { play: data.play === true, theme: data.theme, palette: data.palette };
      update();
    });
    window.hairline = value => {
      if (mounted) throw Error('One figure per host');
      mounted = true;
      figure = value;
      if (!Array.isArray(figure.range) || figure.range.length !== 3 || !figure.range.every(Number.isFinite)) throw Error('Invalid figure range');
      HL.inject(document);
      stage.dataset.hairline = figure.name;
      stage.setAttribute('aria-label', figure.means + '。使用方向键探索，Home 回到静止状态。');
      const svg = HL.mk('svg', { viewBox:'0 0 400 320', 'aria-hidden':'true' }, stage);
      handle = figure.mount({ stage, svg, read }, figure.range[1]);
      const stops = (figure.tour || HL.LAP).filter(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite));
      let choice = -1;
      stage.addEventListener('keydown', event => {
        if (event.key === 'Home') { event.preventDefault(); choice = -1; stage.dispatchEvent(new PointerEvent('pointerleave', { pointerType:'mouse' })); return; }
        if (!['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(event.key) || !stops.length) return;
        event.preventDefault();
        const backward = ['ArrowLeft','ArrowUp'].includes(event.key);
        choice = choice < 0 ? (backward ? stops.length - 1 : 0) : (choice + (backward ? -1 : 1) + stops.length) % stops.length;
        const [x, y] = stops[choice], rect = stage.getBoundingClientRect();
        stage.dispatchEvent(new PointerEvent('pointermove', { pointerType:'keyboard', clientX:rect.left+x/400*rect.width, clientY:rect.top+y/320*rect.height }));
      });
      stage.addEventListener('focusout', () => stage.dispatchEvent(new PointerEvent('pointerleave', { pointerType:'mouse' })));
      update();
      ready = true;
      clearTimeout(watchdog);
      send({ ready:true });
    };
    addEventListener('pagehide', () => { clearTimeout(watchdog); playing?.stop(); handle?.destroy?.(); }, { once:true });
  })();`
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}#stage{position:absolute;inset:0;width:100%;height:100%;outline:none!important}#stage>svg{width:100%;height:100%}#read{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}</style></head><body><div id="stage" role="group" tabindex="0"></div><output id="read" aria-live="polite" aria-atomic="true">静止</output><script nonce="${nonce}">${kernel}</script><script nonce="${nonce}">${adapter}</script><script nonce="${nonce}" type="module">${source}</script></body></html>`
}

/* Adapted from @lucasmarkes/hairline plot.ts, upstream a2217852fed6d1a4f20bc7d43d4fad1a3de117b8.
MIT License

Copyright (c) 2026 Lucas Marques

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const { Cam, clamp, facing, fillet, fit, hull, open, poly, prism, proj, rings, seg, spring, stepS, disposer, mk, pointer, put, register, solid } = HL;
/**
 * Plot: a bar chart standing up as an object, with no data in it. A base, a
 * back plate with dim grid lines, and seven flat tabs lying on the base where
 * the bars would stand. The pointer brushes the tabs: each lifts a little,
 * the nearest most, and drops back to zero while the pointer is still there.
 * At rest the tabs lie flat and one stands a hair proud, bright. The slider
 * is how far the nearest tab lifts.
 *
 * The pattern: a field, as Rail's. One spring per tab on its height, always
 * pulled back to zero; the brush is a kick of velocity, sized so the spring
 * peaks at the lift, falling off with the distance, in tabs, from the one
 * picked. The pick is the tab whose rest centre is nearest the pointer's
 * screen x, and the tabs are kicked only when the pick changes, so a pointer
 * held still leaves the chart flat.
 */
const N = 7, X0 = 13, DX = 10, TW = 5, TY0 = 6, TY1 = 11, TH = 1; // tabs: how many, the first one's centre, their pitch, width, far and near edge, thickness
const L = 2 * X0 + (N - 1) * DX, D = 16, BZ = 3.6, PY = 2, PT = 2, HP = 34, GRID = 4, AX = 7, TICK = 4; // base: length, depth, thickness; plate: back face, thickness, height; grid lines, the axis's x, a tick's length
const PROUD = 2.2, MARK = 4, S = 3.2;
const SPRING = { k: 40, c: 11, eps: 0.02 }, KICK = 16.4;
const falloff = (d) => 1 / (1 + 0.5 * d * d);
const ARC = 5, FACE = /* @__PURE__ */ fillet([[L - 2, 0], [L - 2, HP], [2, HP], [2, 0]], [0.6, 4, 4, 0.6], ARC), EDGE = [ARC, 3 * (ARC + 1)];
const mount = ({ stage, svg, read }, value) => {
    const bag = disposer();
    const TOP = 12;
    const C = Cam(45, 0.5, S);
    fit(C, [[0, 0, -BZ], [L, 0, -BZ], [0, D, -BZ], [L, D, -BZ], [0, PY, HP], [L, PY, HP]], 200, 166);
    const P = proj(C), front = facing(C);
    const g = mk("g", {}, svg);
    const [bo, bi] = rings(0, 0, L, D, 6, 1.6);
    put(solid(g), prism(P, front, bo, bi, -BZ, 0));
    const face = (y) => FACE.map(([x, z]) => P(x, y, z));
    put(solid(g), { sil: poly(hull(face(PY).concat(face(PY + PT)))), crease: open(face(PY + PT).slice(...EDGE)) });
    const at = (x, z) => P(x, PY + PT, z), zs = Array.from({ length: GRID }, (_, k) => (HP * (k + 1)) / (GRID + 1));
    mk("path", { class: "nf lo", d: zs.map((z) => seg(at(AX, z), at(L - 7, z))).join("") }, g);
    mk("path", { class: "nf", d: seg(at(AX, 0), at(AX, HP - 4)) + zs.map((z) => seg(at(AX - TICK, z), at(AX, z))).join("") }, g);
    const tabs = Array.from({ length: N }, (_, i) => { const x = X0 + i * DX; return { ring: rings(x - TW / 2, TY0, x + TW / 2, TY1, 1.2, 0.4), el: solid(g) }; });
    const sp = tabs.map((_, i) => spring(i === MARK ? PROUD : 0, SPRING));
    const drawn = tabs.map(() => NaN);
    function draw() {
        tabs.forEach((t, i) => {
            const h = clamp(sp[i].x, 0, TOP);
            if (h === drawn[i])
                return;
            drawn[i] = h;
            put(t.el, prism(P, front, t.ring[0], t.ring[1], 0, TH + h));
        });
    }
    const loop = register(stage, (dt) => { let m = false; for (const s of sp)
        m = stepS(s, dt) || m; draw(); return m; });
    bag.add(loop.unregister);
    const cx = tabs.map((_, i) => P(X0 + i * DX, (TY0 + TY1) / 2, 0)[0]);
    let lift = value, picked = -2;
    function kick(a) {
        sp.forEach((s, i) => { const need = lift * falloff(Math.abs(i - a)) - s.x; if (need > 0)
            s.v = Math.max(s.v, KICK * need); });
        loop.wake();
    }
    function choose(a) {
        if (a === picked)
            return;
        picked = a;
        sp.forEach((s, i) => { s.t = a < 0 && i === MARK ? PROUD : 0; });
        if (a >= 0)
            kick(a);
        tabs.forEach((t, i) => t.el.sil.classList.toggle("hi", i === (a < 0 ? MARK : a)));
        read.textContent = a < 0 ? "rest" : `bar ${a + 1} · 0`;
        loop.wake();
    }
    choose(-1);
    draw();
    bag.add(pointer(stage, {
        move: (p) => choose(cx.reduce((best, x, i) => (Math.abs(p[0] - x) < Math.abs(p[0] - cx[best]) ? i : best), 0)),
        leave: () => choose(-1),
    }));
    bag.add(() => svg.replaceChildren());
    return { set: (v) => { lift = v; if (picked >= 0)
            kick(picked); }, destroy: bag.dispose };
};
hairline({ name: "empty-plot", means: "An empty chart: brushing the flat tabs lifts them gently before they settle back to zero.", rules: [1, 3, 4, 5, 6, 7, 8, 9, 10], range: [3, 6, 12], tour: [[130, 160], [200, 155], [260, 180], null], mount });

/* Adapted from @lucasmarkes/hairline loupe.ts, upstream a2217852fed6d1a4f20bc7d43d4fad1a3de117b8.
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
const { Cam, circ, clamp, facing, fit, hull, open, poly, prism, proj, rings, rrect, seg, unproj, spring, stepS, disposer, mk, pointer, put, register, solid } = HL;
/**
 * Loupe: a stand loupe on three legs over a ruled sheet with nothing written
 * on it. The pointer drags the loupe across the sheet on a spring. Under the
 * glass the rules are drawn again, larger, and there is nothing between them.
 * At rest the glass straddles the margin where the rules start, so their ends
 * land inside it well away from where the runs outside it would put them;
 * its thin rim is the bright mark. The slider is the magnification.
 *
 * The pattern: follow a position. Two springs hold the point of the sheet the
 * eye sees through the glass's centre, set from the pointer on the sheet's
 * plane, which never moves; the loupe stands where its glass covers that
 * point. The glass shows the sheet there enlarged, cut to the lens by
 * arithmetic, not by a clip. Past the sheet's near edges the feet stand on
 * the table, so the glass reaches every rule.
 */
const SW = 124, SD = 92, ST = 2.4; // the sheet: width, depth, thickness
const ROWS = 7, Y0 = 13, DY = 11, ML = 26, MR = 12; // its rules: how many, the first one's y, their pitch, the left margin they start at, the right one
const R = 27, LZ = 20, RIM = 1.2, GLASS = R - 1.4; // the loupe: ring radius, height of its underside, ring depth, glass radius
const LEGS = [45, 165, 285], FOOT = 35, PAD = 1.8, REST = [ML + 9, 46], S = 2.1;
const mount = ({ stage, svg, read }, value) => {
    const bag = disposer();
    const C = Cam(45, 0.5, S), top = LZ + RIM;
    const feet = LEGS.map((a) => [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)]);
    const [bx, by] = unproj(C, ...proj(C)(0, 0, 0), top);
    const ext = [[0, 0, -ST], [SW, 0, -ST], [0, SD, -ST], [SW, SD, -ST]];
    for (const q of circ(R, 16))
        ext.push([REST[0] + bx + q.u, REST[1] + by + q.v, top]);
    fit(C, ext, 200, 166);
    const P = proj(C), front = facing(C);
    const g = mk("g", {}, svg);
    const [so, si] = rings(0, 0, SW, SD, 6, 1.4);
    put(solid(g), prism(P, front, so, si, -ST, 0));
    const rowY = (i) => Y0 + i * DY;
    const lines = [[[ML, Y0 - 7], [ML, rowY(ROWS - 1) + 7]], ...Array.from({ length: ROWS }, (_, i) => [[ML, rowY(i)], [SW - MR, rowY(i)]])];
    mk("path", { class: "nf lo", d: lines.map(([p, q]) => seg(P(p[0], p[1], 0), P(q[0], q[1], 0))).join("") }, g);
    const legs = mk("path", { class: "nf" }, g);
    const rim = solid(g);
    const glint = mk("path", { class: "nf lo" }, g);
    const seen = mk("path", { class: "nf sil" }, g);
    const shine = circ(GLASS * 0.72, 64).slice(26, 36);
    const ring = circ(R, 64), lens = circ(GLASS, 64), edge = rrect(0, 0, SW, SD, 6, 12), pad = circ(PAD, 12);
    const floor = (x, y) => (x >= 0 && x <= SW && y >= 0 && y <= SD ? 0 : -ST);
    const sx = spring(REST[0]), sy = spring(REST[1]), mag = spring(value);
    let cx = NaN, cy = NaN, dm = NaN;
    function draw() {
        if (sx.x === cx && sy.x === cy && mag.x === dm)
            return;
        const moved = sx.x !== cx || sy.x !== cy;
        cx = sx.x;
        cy = sy.x;
        dm = mag.x;
        const dx = cx + bx, dy = cy + by;
        if (moved) {
            const at = (q, z) => P(dx + q.u, dy + q.v, z);
            legs.setAttribute("d", feet.map(([c, s]) => {
                const fx = dx + c * FOOT, fy = dy + s * FOOT;
                const z = floor(fx, fy);
                return seg(P(fx, fy, z), P(dx + c * (R - 1), dy + s * (R - 1), LZ)) + poly(pad.map((q) => P(fx + q.u, fy + q.v, z)));
            }).join(""));
            put(rim, { sil: poly(hull(ring.map((q) => at(q, LZ)).concat(ring.map((q) => at(q, top))))), crease: poly(lens.map((q) => at(q, top))) });
            glint.setAttribute("d", open(shine.map((q) => at(q, top))));
        }
        const r = GLASS - 1;
        const cut = (p, q) => {
            const a0 = (p[0] - cx) * dm, a1 = (p[1] - cy) * dm, e0 = (q[0] - p[0]) * dm, e1 = (q[1] - p[1]) * dm;
            const A = e0 * e0 + e1 * e1, B = a0 * e0 + a1 * e1, D = B * B - A * (a0 * a0 + a1 * a1 - r * r);
            if (D <= 0)
                return "";
            const t0 = Math.max(0, (-B - Math.sqrt(D)) / A), t1 = Math.min(1, (-B + Math.sqrt(D)) / A);
            return t1 > t0 ? seg(P(dx + a0 + e0 * t0, dy + a1 + e1 * t0, top), P(dx + a0 + e0 * t1, dy + a1 + e1 * t1, top)) : "";
        };
        let d = edge.map((q, i) => cut([q.u, q.v], [edge[(i + 1) % edge.length].u, edge[(i + 1) % edge.length].v])).join("");
        for (const [p, q] of lines)
            d += cut(p, q);
        seen.setAttribute("d", d);
    }
    const loop = register(stage, (dt) => { const a = stepS(sx, dt), b = stepS(sy, dt), c = stepS(mag, dt); draw(); return a || b || c; });
    bag.add(loop.unregister);
    rim.sil.classList.add("hi");
    read.textContent = "rest";
    draw();
    bag.add(pointer(stage, {
        move: (p) => {
            const [x, y] = unproj(C, p[0], p[1], 0);
            sx.t = clamp(x, ML, SW - MR);
            sy.t = clamp(y, Y0, rowY(ROWS - 1));
            read.textContent = `row ${Math.round((sy.t - Y0) / DY) + 1} · 0`;
            loop.wake();
        },
        leave: () => { sx.t = REST[0]; sy.t = REST[1]; read.textContent = "rest"; loop.wake(); },
    }));
    bag.add(() => svg.replaceChildren());
    return { set: (v) => { mag.t = v; loop.wake(); }, destroy: bag.dispose };
};
hairline({ name: "empty-loupe", means: "A stand loupe follows the pointer over a blank sheet, finding only its empty rules.", rules: [1, 3, 4, 5, 6, 7, 8, 9, 10], range: [1.3, 1.8, 2.6], tour: [[180, 150], [220, 170], [250, 190], null], mount });

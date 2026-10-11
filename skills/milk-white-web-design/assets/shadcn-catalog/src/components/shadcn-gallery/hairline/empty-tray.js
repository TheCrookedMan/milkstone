/* Hairline runtime and fixed page license, preserved with the standalone HTML:
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

/** Three empty paper trays: a rolled rim, a recessed floor and a finger pull.
 * Static rest bands pick the tray; a lift spreads out by distance from it.
 */
const {
  Cam, facing, fit, hull, open, poly, proj, ringAt, rrect, run, unproj,
  disposer, mk, pointer, register, tdone, tset, tval, tween,
} = HL;

const W = 104, D = 82, H = 11, R = 11, LIFT = 17;
const REST = [
  { x: 5, y: 5, z: 3 },
  { x: 0, y: 1, z: 23 },
  { x: -7, y: -5, z: 43 },
];
const LR = (points) => points[0][0] < points.at(-1)[0] ? points : points.slice().reverse();

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stagger = value, active = -1;
  const C = Cam(45, 0.5, 1.84);
  const bounds = REST.flatMap(({ x, y, z }) => [
    [x - W / 2, y - D / 2, z], [x + W / 2, y - D / 2, z],
    [x - W / 2, y + D / 2, z + H + LIFT], [x + W / 2, y + D / 2, z + H + LIFT],
  ]);
  fit(C, bounds, 200, 166);
  const P = proj(C), front = facing(C);

  const trays = REST.map(({ x, y, z }, i) => {
    const group = mk("g", {}, svg);
    const outer = rrect(x - W / 2, y - D / 2, x + W / 2, y + D / 2, R, 14);
    const inner = rrect(x - W / 2 + 3, y - D / 2 + 3, x + W / 2 - 3, y + D / 2 - 3, R - 3, 14);
    const floor = rrect(x - W / 2 + 6, y - D / 2 + 6, x + W / 2 - 6, y + D / 2 - 6, R - 5, 14);
    const body = mk("path", { class: i === 2 ? "sil hi" : "sil" }, group);
    const well = mk("path", { class: "nf lo" }, group);
    const seam = mk("path", { class: "nf lo" }, group);
    const near = mk("path", { class: "fo" }, group);
    const edge = mk("path", { class: i === 2 ? "nf sil hi" : "nf sil" }, group);
    const rim = mk("path", { class: "nf lo" }, group);
    const lip = mk("path", { class: "nf" }, group);
    const pull = mk("path", { class: "nf lo" }, group);
    return { x, y, z, outer, inner, floor, body, well, seam, near, edge, rim, lip, pull, lift: tween(0), drawn: null };
  });

  function draw(tray, lift) {
    if (tray.drawn === lift) return;
    tray.drawn = lift;
    const z0 = tray.z + lift, top = z0 + H;
    const oT = LR(ringAt(P, run(tray.outer, front), top));
    const oB = LR(ringAt(P, run(tray.outer, front), z0));
    const iF = LR(ringAt(P, run(tray.inner, front), top));
    tray.body.setAttribute("d", poly(hull(ringAt(P, tray.outer, z0).concat(ringAt(P, tray.outer, top)))));
    tray.well.setAttribute("d", poly(ringAt(P, tray.inner, top)));
    tray.seam.setAttribute("d", poly(ringAt(P, tray.floor, z0 + 2.5)));
    // The near wall is opaque: the floor and far rim never show through it.
    tray.near.setAttribute("d", poly([...iF, oT.at(-1), ...oB.slice().reverse(), oT[0]]));
    tray.edge.setAttribute("d", open([oT[0], ...oB, oT.at(-1)]));
    tray.rim.setAttribute("d", open(oT));
    tray.lip.setAttribute("d", open(iF));
    tray.pull.setAttribute("d", poly(rrect(-12, 3, 12, 7.5, 2.2, 14).map((q) => P(tray.x + q.u, tray.y + D / 2, z0 + q.v))));
  }

  const loop = register(stage, (_dt, now) => {
    let moving = false;
    trays.forEach((tray) => {
      draw(tray, tval(tray.lift, now));
      if (!tdone(tray.lift, now)) moving = true;
    });
    return moving;
  });
  bag.add(loop.unregister);

  function hit([sx, sy]) {
    for (let i = trays.length - 1; i >= 0; i--) {
      const tray = trays[i];
      const [x, y] = unproj(C, sx, sy, tray.z + H);
      if (Math.abs(x - tray.x) <= W / 2 && Math.abs(y - tray.y) <= D / 2) return i;
    }
    return -1;
  }

  function choose(next) {
    if (next === active) return;
    const from = next < 0 ? active : next, now = performance.now();
    active = next;
    trays.forEach((tray, i) => {
      const distance = Math.abs(i - from);
      const height = next < 0 ? 0 : LIFT / (1 + distance * 1.6);
      tset(tray.lift, height, now, distance * stagger);
      tray.body.classList.toggle("hi", i === (next < 0 ? 2 : next));
      tray.edge.classList.toggle("hi", i === (next < 0 ? 2 : next));
    });
    read.textContent = next < 0 ? "rest" : `tray ${next + 1} · 0`;
    loop.wake();
  }

  bag.add(pointer(stage, { move: (point) => choose(hit(point)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());
  return { set: (next) => { stagger = next; }, destroy: bag.dispose };
}

hairline({
  name: "empty-tray",
  means: "Three empty trays: the tray under the pointer lifts gently, with its neighbours following by distance.",
  rules: [1, 2, 4, 5, 6, 7, 8, 9, 10],
  range: [24, 40, 60],
  tour: [[180, 120], [220, 160], [240, 210], null],
  mount,
});

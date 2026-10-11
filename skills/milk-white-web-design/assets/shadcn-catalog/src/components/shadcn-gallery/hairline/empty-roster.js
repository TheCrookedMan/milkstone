/* Empty roster: three empty card wells lift by distance from the selected well.
 * Geometry follows the rounded-solid and open-tray patterns of @lucasmarkes/hairline.
 * Engine/pattern source: a2217852fed6d1a4f20bc7d43d4fad1a3de117b8.
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
const { Cam, facing, fit, hull, open, poly, prism, proj, ringAt, rings, rrect, run, unproj, disposer, mk, pointer, put, register, solid, tween, tset, tval, tdone } = HL;
const W = 84, D = 25, H = 12, GAP = 26, REST = [2, 5, 3];
const LR = (points) => points[0][0] < points.at(-1)[0] ? points : points.slice().reverse();
function mount({ stage, svg, read }, value) {
  const bag = disposer(), C = Cam(45, 0.5, 2.15);
  fit(C, [[-7, -7, -4], [W + 7, -7, -4], [-7, GAP * 2 + D + 7, -4], [W + 7, GAP * 2 + D + 7, 30]], 200, 166);
  const P = proj(C), front = facing(C), g = mk('g', {}, svg);
  const base = rings(-7, -7, W + 7, GAP * 2 + D + 7, 8, 1.5);
  put(solid(g), prism(P, front, base[0], base[1], -4, 0));
  const wells = REST.map((z, i) => {
    const group = mk('g', {}, g), y = i * GAP;
    const outer = rrect(0, y, W, y + D, 6, 12), inner = rrect(2, y + 2, W - 2, y + D - 2, 4, 12);
    const floor = rrect(5, y + 5, W - 5, y + D - 5, 2, 12);
    const body = mk('path', { class: 'sil' }, group), well = mk('path', { class: 'nf lo' }, group);
    const seam = mk('path', { class: 'nf lo' }, group), wall = mk('path', { class: 'fo' }, group);
    const edge = mk('path', { class: 'nf sil' }, group), lip = mk('path', { class: 'nf' }, group);
    const pull = mk('path', { class: 'nf lo' }, group);
    return { y, z, outer, inner, floor, body, well, seam, wall, edge, lip, pull, motion: tween(0), drawn: NaN };
  });
  let lift = value, active = -2;
  function draw(well, rise) {
    if (well.drawn === rise) return;
    well.drawn = rise;
    const bottom = well.z + rise, top = bottom + H;
    const ot = LR(ringAt(P, run(well.outer, front), top)), ob = LR(ringAt(P, run(well.outer, front), bottom));
    const inside = LR(ringAt(P, run(well.inner, front), top));
    well.body.setAttribute('d', poly(hull(ringAt(P, well.outer, bottom).concat(ringAt(P, well.outer, top)))));
    well.well.setAttribute('d', poly(ringAt(P, well.inner, top)));
    well.seam.setAttribute('d', poly(ringAt(P, well.floor, bottom + 2)));
    well.wall.setAttribute('d', poly([...inside, ot.at(-1), ...ob.slice().reverse(), ot[0]]));
    well.edge.setAttribute('d', open([ot[0], ...ob, ot.at(-1)]));
    well.lip.setAttribute('d', open(inside));
    // A blank recessed label holder belongs to the physical card rack; it contains no name.
    well.pull.setAttribute('d', poly(rrect(26, 3.5, 58, 8, 2, 8).map((q) => P(q.u, well.y + D, bottom + q.v))));
  }
  const loop = register(stage, (_dt, now) => {
    let moving = false;
    wells.forEach((well) => { draw(well, tval(well.motion, now)); moving = !tdone(well.motion, now) || moving; });
    return moving;
  });
  bag.add(loop.unregister);
  function hit([sx, sy]) {
    for (let i = wells.length - 1; i >= 0; i--) {
      const well = wells[i], [x, y] = unproj(C, sx, sy, well.z + H);
      if (x >= 0 && x <= W && y >= well.y && y <= well.y + D) return i;
    }
    return -1;
  }
  function choose(next) {
    if (next === active) return;
    const from = next >= 0 ? next : active, now = performance.now();
    active = next;
    wells.forEach((well, i) => {
      const distance = Math.abs(i - from);
      tset(well.motion, next < 0 ? 0 : lift / (1 + distance * 1.6), now, distance * 40);
      well.body.classList.toggle('hi', i === (next < 0 ? 1 : next));
      well.edge.classList.toggle('hi', i === (next < 0 ? 1 : next));
    });
    read.textContent = next < 0 ? 'rest' : `slot ${next + 1} · 0`;
    loop.wake();
  }
  choose(-1);
  wells.forEach((well) => draw(well, 0));
  bag.add(pointer(stage, { move: (point) => choose(hit(point)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());
  return { set: (next) => { lift = next; const current = active; active = -2; choose(current); }, destroy: bag.dispose };
}
hairline({
  name: 'empty-roster', means: 'Three empty roster wells: the selected slot rises gently, with neighbouring slots following by distance.',
  rules: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], range: [3, 6, 10],
  tour: [[240, 144], [201, 158], [160, 182], null], mount,
});

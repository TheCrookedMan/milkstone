import test from 'node:test'
import assert from 'node:assert/strict'
import { dependencyPath, executionSnapshot, executionTimeline, graphEdgeKey, motionValue, retargetMotion } from '../skills/milk-white-web-design/assets/graph-motion.mjs'

test('dependency emphasis includes both real inputs at a merge, excludes unrelated branches', () => {
  const path = dependencyPath(['a', 'b', 'c', 'merge', 'out', 'other'], [{ from: 'a', to: 'c' }, { from: 'c', to: 'merge' }, { from: 'b', to: 'merge' }, { from: 'merge', to: 'out' }, { from: 'a', to: 'other' }], 'out')
  assert.equal(path.nodes.get('out'), 3)
  assert.equal(path.nodes.get('b'), 0)
  assert.equal(path.nodes.has('other'), false)
  assert.equal(path.edges.get(graphEdgeKey('c', 'merge')), 1)
  assert.equal(path.edges.size, 4)
})

test('path traversal handles missing selection and refuses cyclic or dangling paths', () => {
  assert.equal(dependencyPath(['a'], [], 'missing').nodes.size, 0)
  assert.throws(() => dependencyPath(['a', 'b'], [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }], 'a'), /环路/)
  assert.throws(() => dependencyPath(['a'], [{ from: 'a', to: 'b' }], 'a'), /不存在/)
})

test('rapid path handoff starts from the current visible pose and cancels a pending old target', () => {
  const lift = { from: 0, to: 1, start: 100, duration: 600 }
  const before = motionValue(lift, 300)
  const drop = retargetMotion(lift, 0, 300, 70, 900)
  assert.equal(motionValue(drop, 300), before)
  assert.equal(motionValue(drop, 350), before)
  const liftAgain = retargetMotion(drop, 1, 355, 0, 600)
  assert.equal(motionValue(liftAgain, 355), before)
  assert.equal(motionValue(liftAgain, 1000), 1)
})

test('signals follow source completion, merges wait for every incoming signal, roots run together', () => {
  const plan = executionTimeline(['root', 'independent', 'branch', 'merge', 'out'], [{ id: 'a', source: 'root', target: 'branch' }, { id: 'b', source: 'branch', target: 'merge' }, { id: 'c', source: 'independent', target: 'merge' }, { id: 'd', source: 'merge', target: 'out' }], 600, 300)
  const node = (id) => plan.nodes.find((item) => item.id === id)
  assert.equal(node('root').start, 0)
  assert.equal(node('independent').start, 0)
  assert.equal(plan.edges.find(({ id }) => id === 'a').start, node('root').end)
  assert.equal(node('merge').start, node('branch').end + 300)
  assert.equal(node('out').start, node('merge').end + 300)
  const snapshot = executionSnapshot(plan, 750)
  assert.equal(snapshot.nodes.get('root'), 'done')
  assert.equal(snapshot.nodes.get('branch'), 'idle')
  assert.equal(snapshot.edges.get('a').state, 'running')
  assert.equal(snapshot.edges.get('a').progress, .5)
  assert.equal(executionSnapshot(plan, plan.duration).completed, 5)
  assert.equal(executionSnapshot(plan, plan.duration).done, true)
})

test('each new simulation plan uses edited topology and resets all edge states', () => {
  const first = executionTimeline(['a', 'b'], [{ id: 'ab', source: 'a', target: 'b' }])
  assert.equal(executionSnapshot(first, first.duration).edges.get('ab').state, 'done')
  const second = executionTimeline(['a', 'b'], [])
  assert.equal(second.duration, 620)
  assert.equal(executionSnapshot(second, 0).edges.size, 0)
  assert.deepEqual([...executionSnapshot(second, 0).nodes.values()], ['running', 'running'])
  assert.throws(() => executionTimeline(['a'], [{ id: 'bad', source: 'a', target: 'b' }]), /悬空/)
  assert.throws(() => executionTimeline(['a', 'b'], [{ id: 'ab', source: 'a', target: 'b' }, { id: 'ba', source: 'b', target: 'a' }]), /环路/)
})

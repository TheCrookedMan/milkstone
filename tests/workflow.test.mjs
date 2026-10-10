import test from 'node:test'
import assert from 'node:assert/strict'
import { reactive } from 'vue'
import { connectGraph, createDefaultWorkflow, executionOrder, exportWorkflow, importWorkflow, validateGraph } from '../skills/milk-white-web-design/assets/workflow-model.mjs'

test('ComfyUI 0.4 sample exports a connected graph and reconstructs port backlinks', () => {
  const graph = createDefaultWorkflow()
  const exported = exportWorkflow(graph)
  assert.equal(exported.nodes.length, 7)
  assert.equal(exported.links.length, 9)
  assert.equal(exported.nodes.find((node) => node.id === 5).inputs[0].link, 1)
  assert.deepEqual(exported.nodes.find((node) => node.id === 1).outputs[1].links, [2, 3])
  const restored = importWorkflow(JSON.stringify(exported))
  assert.deepEqual(exportWorkflow(restored), exported)
  const order = executionOrder(restored)
  assert.ok(order.indexOf('1') < order.indexOf('5'))
  assert.ok(order.indexOf('5') < order.indexOf('6'))
  assert.ok(order.indexOf('6') < order.indexOf('7'))
})

test('Vue reactive graphs export without DataCloneError and preserve edits', () => {
  const graph = reactive(createDefaultWorkflow())
  graph.nodes[0].position = { x: 217.6, y: 91.2 }
  graph.nodes[0].data.label = 'edited model'
  graph.nodes[4].data.raw.widgets_values[0] = 12345
  const exported = exportWorkflow(graph)
  assert.deepEqual(exported.nodes[0].pos, [218, 91])
  assert.equal(exported.nodes[0].title, 'edited model')
  assert.equal(exported.nodes[4].widgets_values[0], 12345)
})

test('unknown node classes, widgets objects and extra metadata survive round trip', () => {
  const json = exportWorkflow(createDefaultWorkflow())
  json.extra = { extension: { untouched: true } }
  json.nodes[0].type = 'UserCustomNode'
  json.nodes[0].widgets_values = { options: [1, false, { file: 'local.safetensors' }], note: 'custom' }
  json.nodes[0].properties.vendor = { version: '1.0' }
  json.nodes[0].custom_field = 'preserved'
  const restored = exportWorkflow(importWorkflow(json))
  assert.deepEqual(restored.extra, json.extra)
  assert.deepEqual(restored.nodes[0].widgets_values, json.nodes[0].widgets_values)
  assert.deepEqual(restored.nodes[0].properties, json.nodes[0].properties)
  assert.equal(restored.nodes[0].custom_field, 'preserved')
})

test('adding a type-correct link is immutable and gives a unique id', () => {
  const graph = createDefaultWorkflow()
  graph.edges = graph.edges.filter((edge) => edge.id !== '1')
  const edges = connectGraph(graph, { source: '1', sourceHandle: 'out-0', target: '5', targetHandle: 'in-0' })
  assert.equal(graph.edges.length, 8)
  assert.equal(edges.length, 9)
  assert.equal(edges.at(-1).id, '10')
  assert.equal(validateGraph({ ...graph, edges }).length, 7)
})

test('rejects occupied inputs, incompatible types and dangling handles', () => {
  const graph = createDefaultWorkflow()
  assert.throws(() => connectGraph(graph, { source: '1', sourceHandle: 'out-0', target: '5', targetHandle: 'in-0' }), /只能连接一个/)
  graph.edges = graph.edges.filter((edge) => edge.id !== '1')
  assert.throws(() => connectGraph(graph, { source: '1', sourceHandle: 'out-1', target: '5', targetHandle: 'in-0' }), /类型不兼容/)
  assert.throws(() => connectGraph(graph, { source: '1', sourceHandle: 'out-99', target: '5', targetHandle: 'in-0' }), /源端口不存在/)
  assert.throws(() => connectGraph(graph, { source: 'missing', sourceHandle: 'out-0', target: '5', targetHandle: 'in-0' }), /源端口不存在/)
})

test('rejects cycles before a simulated execution can start', () => {
  const graph = createDefaultWorkflow()
  graph.nodes[0].data.raw.inputs = [{ name: 'image', type: 'IMAGE', link: null }]
  assert.throws(() => connectGraph(graph, { source: '6', sourceHandle: 'out-0', target: '1', targetHandle: 'in-0' }), /环路/)
})

test('imports reject unsupported formats and malformed graph references', () => {
  const fresh = () => exportWorkflow(createDefaultWorkflow())
  assert.throws(() => importWorkflow({ '1': { class_type: 'KSampler', inputs: {} } }), /0.4/)
  const v1 = fresh(); v1.version = 1
  assert.throws(() => importWorkflow(v1), /0.4/)
  const missingCounter = fresh(); delete missingCounter.last_node_id
  assert.throws(() => importWorkflow(missingCounter), /计数器/)
  const badLink = fresh(); badLink.links[0][3] = 999
  assert.throws(() => importWorkflow(badLink), /不存在的节点/)
  const badSlot = fresh(); badSlot.links[0][4] = 999
  assert.throws(() => importWorkflow(badSlot), /不存在的端口/)
  const duplicateId = fresh(); duplicateId.nodes[0].id = duplicateId.nodes[1].id
  assert.throws(() => importWorkflow(duplicateId), /重复/)
  const duplicateLink = fresh(); duplicateLink.links[0][0] = duplicateLink.links[1][0]
  assert.throws(() => importWorkflow(duplicateLink), /重复/)
  const mismatchedType = fresh(); mismatchedType.links[0][5] = 'IMAGE'
  assert.throws(() => importWorkflow(mismatchedType), /声明类型不匹配/)
})

test('removing a node and incident edges keeps export counters and remaining widgets', () => {
  const graph = createDefaultWorkflow()
  graph.nodes = graph.nodes.filter((node) => node.id !== '7')
  graph.edges = graph.edges.filter((edge) => edge.source !== '7' && edge.target !== '7')
  const exported = exportWorkflow(graph)
  assert.equal(exported.nodes.length, 6)
  assert.equal(exported.links.length, 8)
  assert.equal(exported.last_node_id, 7)
  assert.equal(exported.last_link_id, 9)
  assert.deepEqual(exported.nodes.find((node) => node.id === 6).outputs[0].links, [])
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const assets = new URL('../skills/milk-white-web-design/assets/', import.meta.url)
const tokens = readFileSync(new URL('milk-tokens.css', assets), 'utf8')
const palette = readFileSync(new URL('theme-colors.css', assets), 'utf8')
const declarations = block => Object.fromEntries([...block.matchAll(/--([\w-]+):([^;]+);/g)].map(([,name,value]) => [name,value.trim()]))
function material(mode) {
  const light = css => css.match(/:root\s*\{([\s\S]*?)\n\}/)[1]
  const dark = css => css.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/)[1]
  const vars = {...declarations(light(palette)),...declarations(light(tokens))}
  if(mode === 'dark') Object.assign(vars,declarations(dark(palette)),declarations(dark(tokens)))
  const resolve = value => value.replace(/var\(--([\w-]+)\)/g,(_,name)=>resolve(vars[name]))
  return name => resolve(vars[`milk-${name}`])
}
function brightness(color) {
  const channels = color.startsWith('#')
    ? [1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255)
    : color.match(/rgba?\(([^)]+)\)/)[1].split(',').slice(0,3).map(v=>Number(v)/255)
  const linear = channels.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
  return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722
}
const colorPattern = /#[\da-f]{6,8}\b|rgba?\([^)]*\)/gi

test('both themes preserve raised/recessed luminance and the same light direction',()=>{
  const light=material('light'),dark=material('dark')
  for(const mode of [light,dark]) {
    assert.ok(brightness(mode('light'))>brightness(mode('raised')))
    assert.ok(brightness(mode('raised'))>brightness(mode('canvas')),'raised faces sit above the page in either theme')
    assert.ok(brightness(mode('canvas'))>brightness(mode('inset')),'wells stay recessed in either theme')
    assert.ok(brightness(mode('highlight'))>brightness(mode('raised')),'rims remain lit rather than turning black')
    for(const name of ['shadow','card-shadow','card-hover-shadow','button-shadow','hover-shadow','floating-shadow']) {
      const colors=mode(name).match(colorPattern)
      assert.ok(brightness(colors[0])>brightness(mode('canvas')),`${name} upper-left highlight`)
      assert.ok(brightness(colors[1])<brightness(mode('canvas')),`${name} lower-right cast shadow`)
    }
    for(const name of ['pressed','control-shadow']) {
      const colors=mode(name).match(colorPattern)
      assert.ok(brightness(colors[0])<brightness(mode('inset')),`${name} inner top-left shade`)
      assert.ok(brightness(colors[1])>brightness(mode('inset')),`${name} inner bottom-right light`)
    }
  }
  for(const name of ['shadow','card-shadow','card-hover-shadow','pressed','button-shadow','hover-shadow','control-shadow','floating-shadow']) {
    assert.equal(light(name).replace(colorPattern,'COLOR'),dark(name).replace(colorPattern,'COLOR'),`${name} keeps offsets, blur, spread and inset placement`)
  }
  assert.equal(light('emission'),dark('emission'),'physical lights keep their emission color')
})

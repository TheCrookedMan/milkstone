import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const assets = new URL('../skills/milk-white-web-design/assets/', import.meta.url)
const tokens = readFileSync(new URL('milk-tokens.css', assets), 'utf8')
const palette = readFileSync(new URL('theme-colors.css', assets), 'utf8')
const declarations = block => Object.fromEntries([...block.matchAll(/--([\w-]+):([^;]+);/g)].map(([,name,value]) => [name,value.trim()]))
function material(mode) {
  const light = css => css.match(/:root\s*\{([\s\S]*?)\n\}/)[1]
  const override = css => css.match(new RegExp(`:root\\[data-theme="${mode}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1]
  const vars = {...declarations(light(palette)),...declarations(light(tokens))}
  if(mode !== 'light') {
    const themedTokens = override(tokens)
    assert.ok(themedTokens, `${mode} has a material palette`)
    Object.assign(vars,declarations(override(palette) ?? ''),declarations(themedTokens))
  }
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
function shadowLayers(value) {
  const colors = value.match(colorPattern)
  return value.replace(colorPattern,'').split(',').map((layer,index)=>{
    const [x,y,blur=0,spread=0] = layer.match(/-?(?:\d+\.?\d*|\.\d+)(?:px)?/g).map(Number.parseFloat)
    return {x,y,blur,spread,inset:layer.includes('inset'),color:colors[index]}
  })
}
const maxOffset = layers => Math.max(...layers.map(({x,y})=>Math.max(Math.abs(x),Math.abs(y))))
const maxBlur = layers => Math.max(...layers.map(({blur})=>blur))
const maxReach = layers => Math.max(...layers.map(({x,y,blur,spread})=>Math.max(Math.abs(x),Math.abs(y))+blur+Math.max(0,spread)))
const contrast = (foreground,background) => {
  const [lighter,darker] = [brightness(foreground),brightness(background)].sort((a,b)=>b-a)
  return (lighter+.05)/(darker+.05)
}
const modes = ['light','dark','milk']

test('all three themes preserve raised/recessed luminance and the same light direction',()=>{
  const light=material('light')
  for(const theme of modes) {
    const mode=material(theme)
    assert.ok(brightness(mode('light'))>brightness(mode('raised')),`${theme} lit face is brighter than the raised face`)
    assert.ok(brightness(mode('raised'))>brightness(mode('canvas')),`${theme} raised faces sit above the page`)
    assert.ok(brightness(mode('canvas'))>brightness(mode('inset')),`${theme} wells stay recessed`)
    assert.ok(brightness(mode('highlight'))>brightness(mode('raised')),`${theme} rims remain lit rather than turning black`)
    for(const name of ['shadow','card-shadow','card-hover-shadow','button-shadow','hover-shadow','floating-shadow']) {
      const colors=mode(name).match(colorPattern)
      assert.ok(brightness(colors[0])>brightness(mode('canvas')),`${theme} ${name} upper-left highlight`)
      assert.ok(brightness(colors[1])<brightness(mode('canvas')),`${theme} ${name} lower-right cast shadow`)
      const [highlight,shade]=shadowLayers(mode(name))
      assert.ok(!highlight.inset && highlight.x<0 && highlight.y<0,`${theme} ${name} highlight falls toward the upper left`)
      assert.ok(!shade.inset && shade.x>0 && shade.y>0,`${theme} ${name} cast shadow falls toward the lower right`)
    }
    for(const name of ['pressed','control-shadow']) {
      const colors=mode(name).match(colorPattern)
      assert.ok(brightness(colors[0])<brightness(mode('inset')),`${theme} ${name} inner top-left shade`)
      assert.ok(brightness(colors[1])>brightness(mode('inset')),`${theme} ${name} inner bottom-right light`)
      const [shade,highlight]=shadowLayers(mode(name))
      assert.ok(shade.inset && shade.x>0 && shade.y>0,`${theme} ${name} top-left wall stays recessed`)
      assert.ok(highlight.inset && highlight.x<0 && highlight.y<0,`${theme} ${name} bottom-right wall stays lit`)
    }
    if(theme !== 'milk') {
      for(const name of ['shadow','card-shadow','card-hover-shadow','pressed','button-shadow','hover-shadow','control-shadow','floating-shadow']) {
        assert.equal(light(name).replace(colorPattern,'COLOR'),mode(name).replace(colorPattern,'COLOR'),`${theme} ${name} keeps offsets, blur, spread and inset placement`)
      }
    }
    assert.equal(light('emission'),mode('emission'),`${theme} physical lights keep their emission color`)
  }
})

test('milk raised surfaces use compact shadows with firm contact and lit rims',()=>{
  const light=material('light')
  const milk=material('milk')
  const roles = {
    'shadow':7,
    'card-shadow':7,
    'card-hover-shadow':8,
    'button-shadow':3,
    'hover-shadow':4,
    'floating-shadow':12,
  }
  for(const [name,blurLimit] of Object.entries(roles)) {
    const layers=shadowLayers(milk(name))
    const outer=layers.filter(layer=>!layer.inset)
    const lightOuter=shadowLayers(light(name)).filter(layer=>!layer.inset)
    assert.ok(maxBlur(outer)<=blurLimit,`${name} stays within a compact ${blurLimit}px blur envelope`)
    assert.ok(maxBlur(outer)<maxBlur(lightOuter),`${name} is sharper than the cold white material`)
    assert.ok(maxOffset(outer)<maxOffset(lightOuter),`${name} casts closer to the raised face`)
    assert.ok(maxReach(outer)<maxReach(lightOuter),`${name} does not replace reduced blur with a wide spread`)
    assert.ok(outer.some(({x,y,blur,color})=>x>=0 && y>0 && blur>0 && blur<=2 && brightness(color)<brightness(milk('canvas'))),`${name} retains a short lower contact shadow`)
    if(name !== 'shadow') {
      assert.ok(layers.some(({x,y,blur,inset,color})=>inset && Math.abs(x)<=1 && Math.abs(y)<=1 && blur<=1 && brightness(color)>brightness(milk('raised'))),`${name} retains a thin lit inner rim`)
    }
  }
  for(const [rest,hover] of [['card-shadow','card-hover-shadow'],['button-shadow','hover-shadow']]) {
    assert.ok(maxReach(shadowLayers(milk(hover)))<=maxReach(shadowLayers(milk(rest)))*1.5,`${hover} lifts without returning to a broad blurred halo`)
  }
  assert.ok(maxReach(shadowLayers(milk('floating-shadow')))>maxReach(shadowLayers(milk('card-shadow'))),'floating panels keep more elevation than cards')
})

test('milk pressed buttons and input wells keep compact recessed depth',()=>{
  const light=material('light')
  const milk=material('milk')
  for(const name of ['pressed','control-shadow']) {
    const layers=shadowLayers(milk(name))
    const lightLayers=shadowLayers(light(name))
    assert.ok(layers.every(layer=>layer.inset),`${name} remains an inset material rather than an outside halo`)
    assert.ok(maxBlur(layers)<=3 && maxBlur(layers)<maxBlur(lightLayers),`${name} has a short, sharply recessed shadow`)
    assert.ok(maxOffset(layers)<=maxOffset(lightLayers),`${name} keeps its wall close to the control edge`)
    assert.ok(maxReach(layers)<maxReach(lightLayers),`${name} has less diffuse reach than the cold white well`)
  }
})

test('milk text remains readable across raised and recessed surfaces',()=>{
  const milk=material('milk')
  for(const ink of ['ink','muted']) {
    for(const surface of ['canvas','panel','inset','raised']) {
      const ratio=contrast(milk(ink),milk(surface))
      assert.ok(ratio>=4.5,`${ink} on ${surface} needs 4.5:1 contrast, received ${ratio.toFixed(2)}:1`)
    }
  }
})

test('switch state labels remain readable at both ends of each themed track',()=>{
  for(const theme of modes) {
    const mode=material(theme)
    for(const state of ['on','off']) {
      const surfaces=mode(`switch-${state}-surface`).match(colorPattern)
      assert.ok(surfaces?.length,`${theme} ${state} track has visible colors`)
      for(const surface of surfaces) {
        const ratio=contrast(mode(`switch-${state}-ink`),surface)
        assert.ok(ratio>=4.5,`${theme} ${state} label on ${surface} needs 4.5:1 contrast, received ${ratio.toFixed(2)}:1`)
      }
    }
  }
})

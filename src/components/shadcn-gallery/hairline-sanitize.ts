const svgNamespace = 'http://www.w3.org/2000/svg'
const tags = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'defs', 'mask', 'linearGradient', 'stop'])
const shapes = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'])
export const maxSvgLength = 160_000
const number = '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:e[+-]?\\d+)?'
const scalar = new RegExp(`^${number}(?:px)?$`, 'i')
const coordinates = new RegExp(`^(?:${number}[\\s,]*)+$`, 'i')
const color = /^(?:none|#[\da-f]{3,8}|rgba?\([\d.,%\s]+\))$/i
const safeId = /^[a-zA-Z_][a-zA-Z\d_.-]{0,80}$/
const localReference = /^url\(#([a-zA-Z_][a-zA-Z\d_.-]{0,80})\)$/
const transform = /^(?:(?:matrix|translate|scale|rotate|skewX|skewY)\([\d\s.,+eE-]+\)\s*)+$/

export function allowedSvgAttribute(name: string, value: string): boolean {
  if (value.length > maxSvgLength || /[<>"'&]|var\s*\(/i.test(value)) return false
  if (/url\s*\(/i.test(value) && (!['mask', 'fill', 'stroke'].includes(name) || !localReference.test(value))) return false
  if (name === 'xmlns') return value === svgNamespace
  if (name === 'id') return safeId.test(value)
  if (name === 'mask') return localReference.test(value) || value === 'none'
  if (name === 'viewBox') {
    if (!coordinates.test(value)) return false
    const bounds = value.trim().split(/[\s,]+/).map(Number)
    return bounds.length === 4 && bounds.every(item => Number.isFinite(item) && Math.abs(item) <= 100_000) && bounds[2]! > 0 && bounds[3]! > 0
  }
  if (['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'x2', 'y1', 'y2', 'stroke-width', 'stroke-dashoffset'].includes(name)) return (scalar.test(value) || /^[-+]?\d+(?:\.\d+)?%$/.test(value)) && Math.abs(Number.parseFloat(value)) <= (value.endsWith('%') ? 1_000 : 100_000)
  if (['opacity', 'fill-opacity', 'stroke-opacity'].includes(name)) return scalar.test(value) && Number(value) >= 0 && Number(value) <= 1
  if (['fill', 'stroke'].includes(name)) return color.test(value) || localReference.test(value)
  if (name === 'stop-color') return color.test(value)
  if (name === 'stop-opacity') return scalar.test(value) && Number(value) >= 0 && Number(value) <= 1
  if (name === 'offset') return /^(?:\d*\.)?\d+%?$/.test(value) && Number.parseFloat(value) >= 0 && Number.parseFloat(value) <= (value.endsWith('%') ? 100 : 1)
  if (name === 'd') return value.length > 0 && /^[MmZzLlHhVvCcSsQqTtAa\d\s.,+eE-]+$/.test(value)
  if (name === 'points' || name === 'stroke-dasharray') return value === 'none' || coordinates.test(value)
  if (name === 'transform' || name === 'gradientTransform') return transform.test(value) && (value.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi) ?? []).every(item => Number.isFinite(Number(item)) && Math.abs(Number(item)) <= 100_000)
  if (['maskUnits', 'maskContentUnits', 'gradientUnits'].includes(name)) return ['userSpaceOnUse', 'objectBoundingBox'].includes(value)
  if (name === 'mask-type') return ['alpha', 'luminance'].includes(value)
  if (name === 'spreadMethod') return ['pad', 'reflect', 'repeat'].includes(value)
  if (name === 'color-interpolation') return ['sRGB', 'linearRGB'].includes(value)
  if (name === 'stroke-linecap') return ['round', 'butt', 'square'].includes(value)
  if (name === 'stroke-linejoin') return ['round', 'miter', 'bevel'].includes(value)
  if (name === 'fill-rule') return ['nonzero', 'evenodd'].includes(value)
  if (name === 'vector-effect') return value === 'non-scaling-stroke'
  if (name === 'class') return /^[a-zA-Z\d_\s-]{0,120}$/.test(value)
  if (name === 'aria-hidden') return value === 'true'
  return false
}

/** Rebuild inert geometry and engine-local masks. No scripts, CSS or external URLs survive. */
export function sanitizeHairlineSvg(value: unknown): string {
  if (typeof value !== 'string' || value.length > maxSvgLength || /<!DOCTYPE|<!ENTITY/i.test(value)) throw new Error('线稿 SVG 格式或大小不符合要求。')
  const parsed = new DOMParser().parseFromString(value, 'image/svg+xml')
  const source = parsed.documentElement
  if (source.localName !== 'svg' || parsed.querySelector('parsererror') || source.namespaceURI !== svgNamespace) throw new Error('线稿 SVG 无法读取。')
  const output = document.implementation.createDocument(svgNamespace, 'svg', null)
  let count = 0
  let shapeCount = 0
  const ids = new Map<string, string>()
  const references: { id: string; attribute: string }[] = []
  function copy(element: Element, parent: Element | null, resource = false): Element {
    if (++count > 2_000 || element.namespaceURI !== svgNamespace || !tags.has(element.localName) || (parent && element.localName === 'svg')) throw new Error('线稿包含不支持的图形内容。')
    const target = parent ? output.createElementNS(svgNamespace, element.localName) : output.documentElement
    const inResource = resource || ['defs', 'mask', 'linearGradient'].includes(element.localName)
    for (const attribute of element.attributes) {
      if (!allowedSvgAttribute(attribute.name, attribute.value)) throw new Error(`线稿包含不支持的属性：${attribute.name}。`)
      if (attribute.name === 'id') {
        if (ids.has(attribute.value)) throw new Error('线稿中有重复的局部标识。')
        ids.set(attribute.value, element.localName)
      }
      const reference = localReference.exec(attribute.value)
      if (reference) references.push({ id: reference[1]!, attribute: attribute.name })
      target.setAttribute(attribute.name, attribute.value)
    }
    for (const child of element.childNodes) {
      if (child.nodeType === 1) copy(child as Element, target, inResource)
      else if (child.nodeType === 3 && child.textContent?.trim()) throw new Error('线稿中不能包含文字或脚本。')
      else if (![3, 8].includes(child.nodeType)) throw new Error('线稿包含不支持的内容。')
    }
    if (shapes.has(element.localName) && !inResource) shapeCount++
    if (parent) parent.append(target)
    return target
  }
  copy(source, null)
  if (!shapeCount || !source.hasAttribute('viewBox')) throw new Error('线稿缺少可见图形或画布尺寸。')
  if (references.some(reference => ids.get(reference.id) !== (reference.attribute === 'mask' ? 'mask' : 'linearGradient'))) throw new Error('线稿包含无效的局部遮罩或渐变引用。')
  output.documentElement.setAttribute('xmlns', svgNamespace)
  return new XMLSerializer().serializeToString(output.documentElement)
}

export function hairlineSvgUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

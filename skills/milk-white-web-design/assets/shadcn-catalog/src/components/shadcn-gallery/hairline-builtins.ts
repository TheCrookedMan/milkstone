import type { HairlineArtwork, HairlineScene } from './hairline-library'
import trayLight from './hairline/empty-tray.svg?raw'
import trayDark from './hairline/empty-tray-dark.svg?raw'
import trayMilk from './hairline/empty-tray-milk.svg?raw'
import trayHtml from './hairline/hairline-empty-tray.html?raw'
import traySource from './hairline/empty-tray.js?raw'
import plotLight from './hairline/empty-plot.svg?raw'
import plotDark from './hairline/empty-plot-dark.svg?raw'
import plotMilk from './hairline/empty-plot-milk.svg?raw'
import plotHtml from './hairline/hairline-empty-plot.html?raw'
import plotSource from './hairline/empty-plot.js?raw'
import rosterLight from './hairline/empty-roster.svg?raw'
import rosterDark from './hairline/empty-roster-dark.svg?raw'
import rosterMilk from './hairline/empty-roster-milk.svg?raw'
import rosterHtml from './hairline/hairline-empty-roster.html?raw'
import rosterSource from './hairline/empty-roster.js?raw'
import loupeLight from './hairline/empty-loupe.svg?raw'
import loupeDark from './hairline/empty-loupe-dark.svg?raw'
import loupeMilk from './hairline/empty-loupe-milk.svg?raw'
import loupeHtml from './hairline/hairline-empty-loupe.html?raw'
import loupeSource from './hairline/empty-loupe.js?raw'

const shared = { previewHtml: '', createdAt: '2026-10-11T00:00:00.000Z', model: null, runtimeVersion: 'hairline-a221785', validation: 'static' as const }
export const builtinArtworks: HairlineArtwork[] = [
  { ...shared, id: 'milkstone-empty-plot', name: '空图表', means: '刻度已经准备好，等待第一条数据。指针刷过，空刻度轻轻抬起再落回。', prompt: '一座尚无数据的圆角立体图表，指针刷过时空刻度轻抬并回落。', source: plotSource, html: plotHtml, lightSvg: plotLight, darkSvg: plotDark, milkSvg: plotMilk },
  { ...shared, id: 'milkstone-empty-roster', name: '空名册架', means: '名册架的卡槽尚未放入姓名卡片。指针靠近时，槽位与相邻槽位依次轻抬。', prompt: '一座圆角空名册架，三个空卡槽尚未放入姓名卡片，指针靠近时按距离轻轻抬起。', source: rosterSource, html: rosterHtml, lightSvg: rosterLight, darkSvg: rosterDark, milkSvg: rosterMilk },
  { ...shared, id: 'milkstone-empty-loupe', name: '空白寻迹', means: '放大镜掠过空白纸面，寻找尚未出现的内容。', prompt: '一架立体放大镜停在尚未写下内容的圆角纸面上，指针移动时镜架轻柔跟随。', source: loupeSource, html: loupeHtml, lightSvg: loupeLight, darkSvg: loupeDark, milkSvg: loupeMilk },
  { ...shared, id: 'milkstone-empty-tray', name: '空托盘', means: '空托盘已准备好，等第一条内容到来。', prompt: '一个尚未放入内容的等距圆角空托盘。', source: traySource, html: trayHtml, lightSvg: trayLight, darkSvg: trayDark, milkSvg: trayMilk },
]
export const defaultSceneArtworkIds: Record<HairlineScene, string> = { data: 'milkstone-empty-plot', people: 'milkstone-empty-roster', search: 'milkstone-empty-loupe' }
export function isBuiltinArtwork(id: string): boolean { return builtinArtworks.some(item => item.id === id) }

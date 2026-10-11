# 毛玻璃材质

毛玻璃是独立材质，不增加第四种颜色主题。`light` 白色、`dark` 黑色和 `milk` 乳白均可选择 `solid` 实面或 `glass` 毛玻璃；默认实面。材质切换不重置主题、组件数据、选中状态或连续动画相位。

## 材料角色

使用半透明表面、背景虚化与细亮边，让后景柔和透出。表面仍按 panel、raised、recessed 和 floating 角色组织：Card 浮起、按钮和选中 Tab 凸起、输入及 Tabbar 槽位内收、浮层与页面分离。左上亮、右下暗的光照方向保持，乳白继续使用范围较小、紧贴轮廓的接触影；不能把凹槽做成同亮度的悬浮玻璃块。

| 范围 | 背景虚化 | 保留的层次 |
| --- | --- | --- |
| Card、面板和页面壳 | 16px | 半透明面板、细边高光与外浮柔影 |
| 按钮、输入、Tabbar 等小控件 | 10px | 小尺度凸面、凹槽及选中拨片 |
| Dialog、Popover、菜单等浮层 | 20px | 较清晰的内容承载与浮层分离 |

玻璃投影与背景虚化分开设置：白色与黑色 Card 常态外影模糊 12px、悬浮 14px，浮层 18px；乳白 Card 收为 7px／8px，按钮 3px／4px，浮层 12px，保持紧密接触感。实际透明度、背景虚化、投影和角色映射以 [milk-glass.css](../assets/milk-glass.css) 为准。白色使用冷灰白玻璃，黑色使用石墨玻璃，乳白使用柔和奶白玻璃，不另加高饱和品牌色或整页滤镜。保留 [三种主题](theme-modes.md) 的正文对比、语义状态色和相同组件几何。

只使用 `backdrop-filter` 处理元素背后的内容；文字、图标、图片、SVG、Canvas/WebGL 与图表数据保持清晰。不要用整个组件的 `opacity`、元素 `filter: blur(...)` 或整页反相代替材质。后景应可辨但安静，避免移动大面积光斑、持续动画模糊半径和过多重叠的背景虚化层；透明度不能造成正文难读。Overlay 遮罩继续承担遮蔽背景的职责，不变成高亮玻璃面。

## 控制器与接入

保留 [material-controller.ts](../assets/material-controller.ts)、[milk-glass.css](../assets/milk-glass.css) 和 [MaterialModeSwitch.vue](../assets/components/MaterialModeSwitch.vue)。这些资源与主题控制器共同使用，材质 CSS 放在基础令牌、组件主题和交互 CSS 之后，避免上游实色表面覆盖材质角色。

应用启动时先 `initTheme()`，再 `initMaterial()`，随后初始化现有交互控制器并挂载应用。材质控制器管理 `html[data-material="solid"]`／`html[data-material="glass"]`，以 `milk-design-material` 为 localStorage 键保存有效选择；没有记录、记录无效或读取失败时使用 `solid`。受限存储仍允许本页切换，不能把存储失败称为已记住。

| 入口 | 用途 |
| --- | --- |
| `initMaterial` | 初始化根属性并恢复有效的已存材质 |
| `getMaterial` | 获取当前有效材质 |
| `setMaterial` | 设置 `solid` 或 `glass`，同步根属性和选择记录 |
| `useMaterial` | Vue 中连接 `material`、`isGlass`、`setMaterial` 与 `toggle` |

材质变化在 `window` 派发 `milk-material-change`，`useMaterial` 订阅当前页变化及存储事件，卸载时清理监听。主题继续使用 `data-theme` 与 `milk-design-theme`，两套状态各自保存，不交叉改写。需要避免首屏材质闪动时，在首屏脚本中恢复经过校验的材质值，并对存储异常回退实面；不能在 HTML 中无条件先开启玻璃。根页与独立 shadcn 沙盒使用同一源码，不手工维护两套控制器。

材质开关是原生按钮，使用 `role="switch"`、`aria-checked` 和明确的开／关说明；支持鼠标、Space 和 Enter，并复用现有阻尼反馈。多个入口应同步同一材质状态。切换不增加焦点框：仅真实输入框保留既有边框内的焦点流光，其他元素维持正常材质和选中状态。

## 局部展示与 Portal

独立展示可在具体玻璃表面使用 `.milk-glass`，无需开启全局材质。复用 [GlassMaterialShowcase.vue](../assets/components/GlassMaterialShowcase.vue) 时保留其后景舞台与随当前主题变化的样本；后景负责显示透光和虚化，玻璃类用于实际承载 Card 的表面。该示例的 Tab、编辑与操作仅修改当前组件，不冒充业务接口。局部样本不写入全局材质选择。

Dialog、Popover、Dropdown、Tooltip、Sheet 与通知的 Portal 继承根 `data-material` 及语义令牌，不能只给页面内部外壳设置玻璃。Card、按钮、输入和 Tabbar 的原有表面角色继续生效；Switch 开／关、错误、禁用、加载等状态不能因透明化失去辨识。图片和自然场景保留原内容，只让所属容器采用玻璃材质。

## 回退与验收

浏览器不支持背景虚化、用户请求 `prefers-reduced-transparency: reduce` 或启用强制颜色时，改用不透明角色表面；强制颜色使用系统表面与文字颜色，关闭背景虚化。材质状态仍可保存，回退不影响点击、输入、键盘和读数。系统减少动态效果仍按原运动规则关闭非必要动画，不能以反复模糊动画表达玻璃。

在三主题与两材质的六种组合中比较同一 Card、按钮、输入、Tabbar、选中拨片与 Portal；核对背景实际虚化、前景清晰、凸凹及光照一致、状态色和输入框专属焦点保留、阻尼与排版不变。检查开关同步、刷新恢复、主题与材质独立、局部样本隔离和约 390px 布局。验证切回实面及不透明回退，记录实际浏览器和系统偏好；未实测的回退不写成已通过。完整清单见 [验收](acceptance.md)。

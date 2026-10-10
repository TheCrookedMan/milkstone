# 交互与动效
下述颜色以默认 light 为基准。dark 使用对应深色主题并按角色校准材质颜色和透明度，保持相同凸起与凹槽感、边框宽度、阴影偏移与模糊和交互位移；高光继续受光、暗部继续遮光，切换不重置交互或动画相位，见 [双模式主题](theme-modes.md)。

Card 使用圆角灰白表面与外浮柔影，按钮采用紧凑胶囊；普通边框为 1px 半透明白，图片区保留 3px 白色 rim。左上白色高光与右下灰色投影表现柔和浮起。Card 悬浮使用 --milk-card-hover-shadow，小按钮悬浮使用 --milk-hover-shadow，按压切换 --milk-pressed 并保留小幅位移；输入、读数窗和功能槽使用内凹表面。Tabbar 整体为凹槽，选中拨片浮起，未选中项融入槽面。阴影参数复用统一令牌，不再使用伪元素硬底座；milk-relief 仅保留兼容，depth 为 0。普通按钮、Tab 与链接的 focus-visible 使用 3px #6b7c93 outline、偏移 5px；输入、下拉和复合输入容器取消最外层 outline、ring 与焦点边框变色，采用内部 inset 材质及状态反馈，正常边框和柔影保持，见 [焦点规范](design-system.md)。纸纹静态且极轻，disabled 降低不透明度且不可触发，loading 保留可读文字、阻止重复操作并向读屏报告状态。园区柔焦、扫描灯、星体光晕和电流光尾继续保留。

普通微交互过渡默认 180ms；进入 400–600ms，不遮挡内容、不阻止使用。实体按键单独使用轻微机械阻尼：按下 90ms、位移 1.5px、缩放 0.985，曲线 cubic-bezier(.2,.8,.2,1)；松开后以 320ms、cubic-bezier(.16,1,.3,1) 平稳回位，不越过初始位置，不做弹簧抖动。按下阶段至少保持 88ms，快速轻点也能看见浅凹反馈；阴影与表面同步压实，返回默认、悬浮或已选中材质。Tab 的默认位移减至 .75px，开关、Checkbox 和 Radio 原位微缩，不打断选中拨片或开关自身的位置变化。上述参数由 milk-tokens.css 的 --milk-press-* 与 --milk-release-* 令牌统一管理，light／dark 共用同一时序与运动几何。

复用 assets/press-controller.ts 的委托控制器，在应用入口 initTheme() 后、mount 前调用一次 initPressFeedback()；返回的清理函数用于卸载与 HMR dispose，不在每个按钮内新增计时器。启用的原生 button、a.pill、summary 及显式 data-milk-press-target 接收统一反馈，控制器通过 data-milk-press="down"／"release" 表达短暂按压状态。鼠标、触摸与 Space／Enter 均可触发，业务 click 与键盘语义保持原样，不因动画延迟操作。快速重复按下从当前状态平滑衔接；pointercancel、失焦与卸载清理状态、监听和定时器，禁用控件不触发。data-milk-press-ignore 可明确退出反馈；draggable、Vue Flow／工作流节点、SVG 图形和 range 滑杆不套用按键位移，浮层的定位 transform 不被覆盖。使用独立 translate 做 Y 轴居中的自定义按键，需将 --milk-press-origin-y 设为原本的 Y 偏移；内置轮播箭头与数字步进按钮已适配，原位压缩可用 data-milk-press-kind="switch"。

尊重 prefers-reduced-motion，按键立即改变材质，取消位移、缩放和过渡，连续动画停止，信息与操作仍完整。GSAP 使用 context 并在卸载 revert，事件监听与定时器清理。

弹窗可用原生 dialog 或 Reka：提供名称、初始焦点、Tab 约束、Esc 关闭与触发焦点恢复。复制操作处理权限失败；表单使用 label、原生校验、错误与成功状态。演示行为明确标注，不能伪装持久化。

仅当关系信息是真正任务时加入图谱，同时提供文本列表和键盘访问。浅灰柔和拟物视觉不需要神经网络装饰。

用户要求动态关系时，可用路径上的电流光点、星体自转及公转表达方向与层次。提供可见暂停操作，暂停冻结相位，恢复不补跳过的时间；页面后台、画布离开视区和减少动态效果时停止循环。静态路径、节点标签、皮肤选择与详情仍可用。每个实例独立管理 RAF、媒体查询和观察器，卸载时全部清理。星空组件的配置范围见 [动态关系与星空](stellar-relations.md)。

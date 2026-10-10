<script setup lang="ts">
import { computed, ref, shallowRef, useId } from 'vue'
import { CalendarDate, DateFormatter, getLocalTimeZone, type DateValue } from '@internationalized/date'
import type { DateRange } from 'reka-ui'
import { Bold, CalendarDays, Check, ChevronDown, Italic, Search, Underline } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox, ComboboxAnchor, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxItemIndicator, ComboboxList, ComboboxTrigger } from '@/components/ui/combobox'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { NumberField, NumberFieldContent, NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput } from '@/components/ui/number-field'
import { PinInput, PinInputGroup, PinInputSlot } from '@/components/ui/pin-input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { TagsInput, TagsInputInput, TagsInputItem, TagsInputItemDelete, TagsInputItemText } from '@/components/ui/tags-input'
import { Textarea } from '@/components/ui/textarea'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

defineProps<{ name: string }>()
const uid = useId()
const clicks = ref(0)
const group = ref('概览')
const checked = ref(true)
const frameworks = [{ value: 'vue', label: 'Vue 3' }, { value: 'nuxt', label: 'Nuxt' }, { value: 'vite', label: 'Vite' }]
const framework = ref<(typeof frameworks)[number]>()
const command = ref('选择一条命令，预览操作反馈')
const date = shallowRef<DateValue>(new CalendarDate(2026, 10, 9))
const pickerDate = shallowRef<DateValue>()
const dateRange = shallowRef<DateRange>({ start: new CalendarDate(2026, 10, 9), end: new CalendarDate(2026, 10, 14) })
const formatter = new DateFormatter('zh-CN', { dateStyle: 'medium' })
const formatDate = (value?: DateValue) => value ? formatter.format(value.toDate(getLocalTimeZone())) : '尚未选择'
const pickerOpen = ref(false)
const email = ref('')
const emailTouched = ref(false)
const emailError = computed(() => !emailTouched.value ? '' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) ? '' : '请输入完整的邮箱地址。')
const emailSaved = ref(false)
function validateEmail() {
  emailTouched.value = true
  emailSaved.value = !emailError.value
}
const validateUsername = (value: unknown) => typeof value === 'string' && value.trim().length >= 2 || '名称至少需要 2 个字符。'
const formSaved = ref('')
const inputValue = ref('MILK · 纸面组件集')
const searchValue = ref('')
const searchResult = ref('输入组件名称，找到合适的构件')
const searchable = ['按钮 Button', '输入框 Input', '日历 Calendar', '选择框 Select', '滑块 Slider', '开关 Switch']
function runSearch() {
  const query = searchValue.value.trim().toLocaleLowerCase()
  const matches = searchable.filter(item => item.toLocaleLowerCase().includes(query))
  searchResult.value = !query ? '请先输入关键词' : matches.length ? `找到：${matches.join('、')}` : '没有匹配的组件，试试“按钮”或 Input。'
}
const otp = ref('')
const pin = ref<number[]>([])
const labelChecked = ref(false)
const nativeSelection = ref('draft')
const quantity = ref(3)
const radio = ref('balanced')
const selected = ref('paper')
const slider = ref([64])
const switched = ref(true)
const tags = ref(['纸感', '微光'])
const textarea = ref('以纸面承载内容，以微光标出层次。按下有分量，回位留余地。')
const toggle = ref(false)
const toggleGroup = ref<string[]>(['bold'])
const nativeLabels: Record<string, string> = { draft: '草稿', review: '待审核', published: '已发布' }
</script>

<template>
  <div v-if="name === 'button'" class="demo-stack">
    <div class="demo-row flex-wrap">
      <Button @click="clicks++">轻按试试</Button>
      <Button variant="outline" @click="clicks = 0">重置</Button>
      <Button variant="secondary" disabled>禁用</Button>
    </div>
    <p class="demo-caption" aria-live="polite">已按下 {{ clicks }} 次</p>
  </div>

  <div v-else-if="name === 'button-group'" class="demo-stack">
    <ButtonGroup aria-label="工作区视图">
      <Button v-for="item in ['概览', '排版', '图层']" :key="item" :variant="group === item ? 'default' : 'outline'" :aria-pressed="group === item" @click="group = item">{{ item }}</Button>
    </ButtonGroup>
    <p class="demo-caption" aria-live="polite">当前视图：{{ group }}</p>
  </div>

  <div v-else-if="name === 'calendar'" class="demo-stack items-start">
    <Calendar v-model="date" locale="zh-CN" class="rounded-xl border" />
    <p class="demo-caption" aria-live="polite">选中：{{ formatDate(date) }}</p>
  </div>

  <div v-else-if="name === 'checkbox'" class="demo-stack">
    <div class="demo-row">
      <Checkbox :id="`${uid}-check`" v-model="checked" />
      <Label :for="`${uid}-check`">显示材质细节</Label>
    </div>
    <p class="demo-caption" aria-live="polite">{{ checked ? '材质细节：开启' : '材质细节：关闭' }}</p>
  </div>

  <div v-else-if="name === 'combobox'" class="demo-stack">
    <Combobox v-model="framework" by="value">
      <ComboboxAnchor as-child>
        <ComboboxTrigger as-child>
          <Button variant="outline" class="w-full justify-between" aria-label="选择前端框架">
            {{ framework?.label ?? '选择前端框架' }}<ChevronDown class="size-4 opacity-60" />
          </Button>
        </ComboboxTrigger>
      </ComboboxAnchor>
      <ComboboxList>
        <ComboboxInput placeholder="搜索框架…" aria-label="搜索前端框架" />
        <ComboboxEmpty>没有匹配的框架</ComboboxEmpty>
        <ComboboxGroup>
          <ComboboxItem v-for="item in frameworks" :key="item.value" :value="item">
            {{ item.label }}<ComboboxItemIndicator><Check class="size-4" /></ComboboxItemIndicator>
          </ComboboxItem>
        </ComboboxGroup>
      </ComboboxList>
    </Combobox>
    <p class="demo-caption" aria-live="polite">{{ framework ? `已选择 ${framework.label}` : '支持搜索和键盘选择' }}</p>
  </div>

  <div v-else-if="name === 'command'" class="demo-stack">
    <Command class="rounded-xl border">
      <CommandInput placeholder="搜索命令…" aria-label="搜索命令" />
      <CommandList class="max-h-40">
        <CommandEmpty>没有匹配的命令</CommandEmpty>
        <CommandGroup heading="工作区">
          <CommandItem v-for="item in ['查看材质', '检查图层', '切换视图']" :key="item" :value="item" @select="command = `演示反馈：${item}`">{{ item }}</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
    <p class="demo-caption" aria-live="polite">{{ command }}</p>
  </div>

  <div v-else-if="name === 'date-picker'" class="demo-field">
    <Label :for="`${uid}-date`">预览日期</Label>
    <Popover v-model:open="pickerOpen">
      <PopoverTrigger as-child>
        <Button :id="`${uid}-date`" variant="outline" class="w-full justify-start"><CalendarDays class="size-4" />{{ formatDate(pickerDate) }}</Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0" align="start">
        <Calendar v-model="pickerDate" locale="zh-CN" initial-focus @update:model-value="pickerOpen = false" />
      </PopoverContent>
    </Popover>
    <p class="demo-caption" aria-live="polite">{{ pickerDate ? `预览日期：${formatDate(pickerDate)}` : '打开日历选择日期' }}</p>
  </div>

  <form v-else-if="name === 'field'" class="demo-stack" novalidate @submit.prevent="validateEmail">
    <Field :data-invalid="!!emailError">
      <FieldLabel :for="`${uid}-email`">联系邮箱</FieldLabel>
      <Input :id="`${uid}-email`" v-model="email" type="email" placeholder="name@example.com" :aria-invalid="!!emailError" :aria-describedby="`${uid}-email-hint${emailError ? ` ${uid}-email-error` : ''}`" @blur="emailTouched = true" @update:model-value="emailSaved = false" />
      <FieldDescription :id="`${uid}-email-hint`">本次演示仅校验邮箱格式。</FieldDescription>
      <FieldError v-if="emailError" :id="`${uid}-email-error`">{{ emailError }}</FieldError>
    </Field>
    <Button type="submit" class="self-start">校验邮箱</Button>
    <p v-if="emailSaved" class="demo-caption" role="status">邮箱格式正确。</p>
  </form>

  <Form v-else-if="name === 'form'" class="demo-stack" :validation-schema="{ username: validateUsername }" :initial-values="{ username: '' }" @submit="formSaved = '名称校验通过，已保存至本次演示。'" @invalid-submit="formSaved = ''">
    <FormField v-slot="{ componentField }" name="username">
      <FormItem>
        <FormLabel>方案名称</FormLabel>
        <FormControl><Input v-bind="componentField" placeholder="输入至少 2 个字符" @update:model-value="formSaved = ''" /></FormControl>
        <FormDescription>校验通过后，名称保留在本次演示中。</FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>
    <Button type="submit" class="self-start">保存名称</Button>
    <p v-if="formSaved" class="demo-caption" role="status">{{ formSaved }}</p>
  </Form>

  <div v-else-if="name === 'input'" class="demo-field">
    <Label :for="`${uid}-input`">项目名称</Label>
    <Input :id="`${uid}-input`" v-model="inputValue" placeholder="输入项目名称" />
    <p class="demo-caption" aria-live="polite">{{ inputValue.length }} 个字符</p>
  </div>

  <div v-else-if="name === 'input-group'" class="demo-stack">
    <div class="demo-field">
      <Label :for="`${uid}-search`">搜索组件</Label>
      <InputGroup>
        <InputGroupInput :id="`${uid}-search`" v-model="searchValue" placeholder="例如：按钮" @keydown.enter="runSearch" />
        <InputGroupAddon><Search class="size-4" /></InputGroupAddon>
        <InputGroupAddon align="inline-end"><InputGroupButton @click="runSearch">检索</InputGroupButton></InputGroupAddon>
      </InputGroup>
      <p class="demo-caption" aria-live="polite">{{ searchResult }}</p>
    </div>
    <InputGroup>
      <InputGroupAddon><InputGroupText>https://</InputGroupText></InputGroupAddon>
      <InputGroupInput aria-label="工作区域名" placeholder="milk.local" />
    </InputGroup>
  </div>

  <div v-else-if="name === 'input-otp'" class="demo-field">
    <Label :for="`${uid}-otp`">六位验证码</Label>
    <InputOTP :id="`${uid}-otp`" v-model="otp" :maxlength="6" inputmode="numeric" pattern="^[0-9]+$">
      <InputOTPGroup><InputOTPSlot v-for="i in 3" :key="i" :index="i - 1" /></InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup><InputOTPSlot v-for="i in 3" :key="i" :index="i + 2" /></InputOTPGroup>
    </InputOTP>
    <p class="demo-caption" aria-live="polite">{{ otp.length === 6 ? '六位验证码已输入完成' : `已输入 ${otp.length} / 6 位` }}</p>
  </div>

  <div v-else-if="name === 'label'" class="demo-stack">
    <div class="demo-row"><Checkbox :id="`${uid}-label`" v-model="labelChecked" /><Label :for="`${uid}-label`">点击文字也可切换</Label></div>
    <p class="demo-caption" aria-live="polite">{{ labelChecked ? '已选中' : '未选中' }}</p>
  </div>

  <div v-else-if="name === 'native-select'" class="demo-field">
    <Label :for="`${uid}-native`">发布状态</Label>
    <NativeSelect :id="`${uid}-native`" v-model="nativeSelection" class="w-full">
      <NativeSelectOption value="draft">草稿</NativeSelectOption><NativeSelectOption value="review">待审核</NativeSelectOption><NativeSelectOption value="published">已发布</NativeSelectOption>
    </NativeSelect>
    <p class="demo-caption" aria-live="polite">当前：{{ nativeLabels[nativeSelection] }}</p>
  </div>

  <div v-else-if="name === 'number-field'" class="demo-stack">
    <NumberField :id="`${uid}-number`" v-model="quantity" :min="1" :max="12" locale="zh-CN" class="demo-field">
      <Label :for="`${uid}-number`">展示列数</Label>
      <NumberFieldContent><NumberFieldDecrement aria-label="减少展示列数" /><NumberFieldInput /><NumberFieldIncrement aria-label="增加展示列数" /></NumberFieldContent>
    </NumberField>
    <p class="demo-caption" aria-live="polite">{{ quantity }} 列 · 可直接输入或使用步进按钮</p>
  </div>

  <div v-else-if="name === 'pin-input'" class="demo-field">
    <span :id="`${uid}-pin-label`" class="demo-label">四位 PIN</span>
    <PinInput v-model="pin" type="number" otp :aria-labelledby="`${uid}-pin-label`">
      <PinInputGroup><PinInputSlot v-for="i in 4" :key="i" :index="i - 1" :aria-label="`第 ${i} 位 PIN`" /></PinInputGroup>
    </PinInput>
    <p class="demo-caption" aria-live="polite">{{ pin.join('').length === 4 ? 'PIN 已输入完成' : `已输入 ${pin.join('').length} / 4 位` }} · 旧版兼容组件</p>
  </div>

  <div v-else-if="name === 'radio-group'" class="demo-stack">
    <RadioGroup v-model="radio" aria-label="渲染模式">
      <div class="demo-row"><RadioGroupItem :id="`${uid}-fast`" value="fast" /><Label :for="`${uid}-fast`">优先流畅</Label></div>
      <div class="demo-row"><RadioGroupItem :id="`${uid}-balanced`" value="balanced" /><Label :for="`${uid}-balanced`">平衡模式</Label></div>
      <div class="demo-row"><RadioGroupItem :id="`${uid}-quality`" value="quality" /><Label :for="`${uid}-quality`">优先细节</Label></div>
    </RadioGroup>
    <p class="demo-caption" aria-live="polite">当前：{{ { fast: '优先流畅', balanced: '平衡模式', quality: '优先细节' }[radio] }}</p>
  </div>

  <div v-else-if="name === 'range-calendar'" class="demo-stack items-start">
    <RangeCalendar v-model="dateRange" locale="zh-CN" :number-of-months="1" class="rounded-xl border" />
    <p class="demo-caption" aria-live="polite">{{ formatDate(dateRange.start) }} — {{ formatDate(dateRange.end) }}</p>
  </div>

  <div v-else-if="name === 'select'" class="demo-field">
    <Label :for="`${uid}-select`">面板材质</Label>
    <Select v-model="selected">
      <SelectTrigger :id="`${uid}-select`" class="w-full"><SelectValue placeholder="选择材质" /></SelectTrigger>
      <SelectContent><SelectItem value="paper">纸面基底</SelectItem><SelectItem value="steel">凹槽表面</SelectItem><SelectItem value="silver">浮起亮面</SelectItem></SelectContent>
    </Select>
    <p class="demo-caption" aria-live="polite">已选择：{{ { paper: '纸面基底', steel: '凹槽表面', silver: '浮起亮面' }[selected] }}</p>
  </div>

  <div v-else-if="name === 'slider'" class="demo-field">
    <Label :id="`${uid}-slider-label`">材质强度</Label>
    <Slider v-model="slider" :max="100" :step="1" :aria-labelledby="`${uid}-slider-label`" />
    <p class="demo-caption" aria-live="polite">{{ slider[0] }}% · 支持方向键微调</p>
  </div>

  <div v-else-if="name === 'switch'" class="demo-stack">
    <div class="demo-row"><Switch :id="`${uid}-switch`" v-model="switched" /><Label :for="`${uid}-switch`">自动保存</Label></div>
    <p class="demo-caption" aria-live="polite">{{ switched ? '自动保存：开启 · 状态演示' : '自动保存：关闭 · 状态演示' }}</p>
  </div>

  <div v-else-if="name === 'tags-input'" class="demo-field">
    <Label :for="`${uid}-tags`">设计标签</Label>
    <TagsInput v-model="tags">
      <TagsInputItem v-for="tag in tags" :key="tag" :value="tag"><TagsInputItemText /><TagsInputItemDelete :aria-label="`移除 ${tag}`" /></TagsInputItem>
      <TagsInputInput :id="`${uid}-tags`" placeholder="输入并按 Enter…" />
    </TagsInput>
    <p class="demo-caption" aria-live="polite">{{ tags.length }} 个标签 · 可添加或移除</p>
  </div>

  <div v-else-if="name === 'textarea'" class="demo-field">
    <Label :for="`${uid}-textarea`">设计说明</Label>
    <Textarea :id="`${uid}-textarea`" v-model="textarea" placeholder="输入设计说明…" :maxlength="120" class="min-h-24" />
    <p class="demo-caption" aria-live="polite">{{ textarea.length }} / 120 字</p>
  </div>

  <div v-else-if="name === 'toggle'" class="demo-stack">
    <Toggle v-model="toggle" variant="outline" aria-label="切换粗体" class="self-start"><Bold class="size-4" />粗体</Toggle>
    <p class="demo-caption" :class="{ 'font-bold': toggle }" aria-live="polite">{{ toggle ? '文字已加粗' : '常规文字' }}</p>
  </div>

  <div v-else-if="name === 'toggle-group'" class="demo-stack">
    <ToggleGroup v-model="toggleGroup" type="multiple" variant="outline" aria-label="文字样式" class="justify-start">
      <ToggleGroupItem value="bold" aria-label="粗体"><Bold class="size-4" /></ToggleGroupItem><ToggleGroupItem value="italic" aria-label="斜体"><Italic class="size-4" /></ToggleGroupItem><ToggleGroupItem value="underline" aria-label="下划线"><Underline class="size-4" /></ToggleGroupItem>
    </ToggleGroup>
    <p class="demo-caption" :class="{ 'font-bold': toggleGroup.includes('bold'), italic: toggleGroup.includes('italic'), underline: toggleGroup.includes('underline') }" aria-live="polite">选一种笔触，或叠加使用</p>
  </div>
</template>

<style scoped>
.demo-label {
  font-size: var(--milk-ui-font-label);
  font-weight: var(--milk-ui-weight-medium);
  line-height: var(--milk-ui-leading-label);
}
</style>

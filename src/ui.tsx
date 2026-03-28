import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import '!./output.css'

import { Button } from './components/ui/button'
import { Checkbox } from './components/ui/checkbox'
import { Card, CardContent } from './components/ui/card'
import { Label } from './components/ui/label'
import { Separator } from './components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import {
  Loader2,
  Info,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Search,
  X,
  Check,
  Link,
  ArrowLeft,
  SlidersHorizontal,
  Languages,
  CaseSensitive,
} from 'lucide-react'
import bengaliCardImage from '../assets/bengali.png'
import gujaratiCardImage from '../assets/gujarati.png'
import kannadaCardImage from '../assets/kannada.png'
import malayalamCardImage from '../assets/malayalam.png'
import marathiCardImage from '../assets/marathi.png'
import punjabiCardImage from '../assets/punjabi.png'
import selectedBgImage from '../assets/selected_bg_image.png'
import tamilCardImage from '../assets/tamil.png'
import teluguCardImage from '../assets/telugu.png'
import brandingOne from '../assets/branding-1.png'
import brandingTwo from '../assets/branding-2.png'

type LanguageArt =
  | { kind: 'emoji'; value: string }
  | { kind: 'image'; src: string; alt: string; className?: string }

type LanguageOption = {
  value: string
  label: string
  scriptLabel: string
  nativeClassName: string
  selectedNativeClassName?: string
  art: LanguageArt
}

const languageOptions: LanguageOption[] = [
  {
    value: 'te',
    label: 'Telugu',
    scriptLabel: 'తెలుగు',
    nativeClassName: "font-['Kohinoor_Telugu:Regular',sans-serif]",
    art: { kind: 'image', src: teluguCardImage, alt: 'Telugu card illustration', className: 'max-h-[64px] max-w-[64px]' },
  },
  {
    value: 'ta',
    label: 'Tamil',
    scriptLabel: 'தமிழ்',
    nativeClassName: "font-['Noto_Sans_Tamil_UI:Regular',sans-serif]",
    selectedNativeClassName: "font-['Noto_Sans_Tamil_UI:Medium',sans-serif]",
    art: { kind: 'image', src: tamilCardImage, alt: 'Tamil card illustration', className: 'max-h-[66px] max-w-[66px]' },
  },
  {
    value: 'kn',
    label: 'Kannada',
    scriptLabel: 'ಕನ್ನಡ',
    nativeClassName: "font-['Noto_Sans_Kannada_UI:Regular',sans-serif]",
    art: { kind: 'image', src: kannadaCardImage, alt: 'Kannada card illustration', className: 'max-h-[64px] max-w-[66px]' },
  },
  {
    value: 'mr',
    label: 'Marathi',
    scriptLabel: 'मराठी',
    nativeClassName: 'font-sans',
    selectedNativeClassName: 'font-sans font-medium',
    art: { kind: 'image', src: marathiCardImage, alt: 'Marathi card illustration', className: 'max-h-[62px] max-w-[62px]' },
  },
  {
    value: 'gu',
    label: 'Gujarati',
    scriptLabel: 'ગુજરાતી',
    nativeClassName: "font-['Noto_Sans_Gujarati_UI:Regular',sans-serif]",
    art: { kind: 'image', src: gujaratiCardImage, alt: 'Gujarati card illustration', className: 'max-h-[62px] max-w-[62px]' },
  },
  {
    value: 'ml',
    label: 'Malayalam',
    scriptLabel: 'മലയാളം',
    nativeClassName: "font-['Noto_Sans_Malayalam_UI:Regular',sans-serif]",
    art: { kind: 'image', src: malayalamCardImage, alt: 'Malayalam card illustration', className: 'max-h-[60px] max-w-[64px]' },
  },
  {
    value: 'bn',
    label: 'Bengali',
    scriptLabel: 'বাংলা',
    nativeClassName: "font-['Noto_Sans_Bengali_UI:Regular',sans-serif]",
    art: { kind: 'image', src: bengaliCardImage, alt: 'Bengali card illustration', className: 'max-h-[60px] max-w-[64px]' },
  },
  {
    value: 'pa',
    label: 'Punjabi',
    scriptLabel: 'ਪੰਜਾਬੀ',
    nativeClassName: 'font-sans',
    selectedNativeClassName: 'font-sans font-medium',
    art: { kind: 'image', src: punjabiCardImage, alt: 'Punjabi card illustration', className: 'max-h-[62px] max-w-[62px]' },
  },
  {
    value: 'en',
    label: 'English',
    scriptLabel: 'English',
    nativeClassName: 'font-sans',
    selectedNativeClassName: 'font-sans font-medium',
    art: { kind: 'emoji', value: '🇬🇧' },
  },
  {
    value: 'hi',
    label: 'Hindi',
    scriptLabel: 'हिंदी',
    nativeClassName: 'font-sans',
    selectedNativeClassName: 'font-sans font-medium',
    art: { kind: 'emoji', value: '🇮🇳' },
  },
]
const bulkLanguageOptions = languageOptions.filter(o => o.value !== 'en')
const DEFAULT_BULK_LANGUAGES = ['te', 'ta', 'ml', 'kn', 'mr']

// Default fonts per language (must match main.ts LANGUAGE_FONTS)
const DEFAULT_LANGUAGE_FONTS: Record<string, string> = {
  hi: 'Noto Sans Devanagari UI',
  mr: 'Noto Sans Devanagari UI',
  bn: 'Noto Sans Bengali UI',
  gu: 'Noto Sans Gujarati UI',
  pa: 'Noto Sans Gurmukhi',
  ta: 'Noto Sans Tamil UI',
  te: 'Kohinoor Telugu',
  kn: 'Noto Sans Kannada UI',
  ml: 'Noto Sans Malayalam UI',
  en: 'Inter',
}

type TranslationMode = 'sarvam-translate' | 'formal' | 'classic-colloquial' | 'modern-colloquial'
const translationModeOptions: Array<{ value: TranslationMode; label: string; description: string }> = [
  { value: 'sarvam-translate', label: 'Sarvam', description: 'Default model with broader language support' },
  { value: 'formal', label: 'Formal', description: 'Polished and neutral' },
  { value: 'classic-colloquial', label: 'Classic', description: 'Natural everyday phrasing' },
  { value: 'modern-colloquial', label: 'Modern', description: 'More current and conversational' },
]

type RefineSelectionState = {
  canRefine: boolean
  kind: 'node' | 'range' | 'invalid'
  text: string
  layerText?: string
  charCount: number
  nodeId?: string
  nodeName?: string
  start?: number
  end?: number
  message?: string
}
type RefineConversationTurn = {
  role: 'user' | 'assistant'
  content: string
}
type RefineThreadState = {
  selectionKey: string
  nodeId: string
  seedText: string
  turns: RefineConversationTurn[]
}

function LanguageCardArt({
  art,
  selected,
}: {
  art: LanguageArt
  selected: boolean
}) {
  return (
    <div className="absolute inset-x-0 top-0 flex h-[82px] items-center justify-center">
      {art.kind === 'emoji' ? (
        <span className={`leading-none ${selected ? 'text-[34px]' : 'text-[32px]'}`}>
          {art.value}
        </span>
      ) : (
        <img
          src={art.src}
          alt={art.alt}
          className={`h-auto w-auto object-contain ${art.className || ''} ${selected ? 'scale-[1.02]' : ''}`}
        />
      )}
    </div>
  )
}

function LanguageCard({
  option,
  selected,
  onSelect,
  buttonRef,
}: {
  option: LanguageOption
  selected: boolean
  onSelect: (value: string) => void
  buttonRef?: (node: HTMLButtonElement | null) => void
}) {
  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={() => onSelect(option.value)}
      aria-pressed={selected}
      className="relative h-[130px] w-[100px] shrink-0 text-center transition-[transform,box-shadow,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171717]/15"
    >
      <div
        className="relative z-10 flex h-full flex-col items-center gap-1 overflow-hidden rounded-[8px] border border-input bg-white pb-2 [backface-visibility:hidden] [transform:translateZ(0)]"
        style={{ clipPath: 'inset(0 round 8px)' }}
      >
        <div
          className={`relative h-[82px] overflow-hidden rounded-t-[8px] ${selected ? '-mx-px w-[calc(100%+2px)]' : 'w-full'}`}
          style={{ clipPath: 'inset(0 round 8px 8px 0 0)' }}
        >
          {selected ? (
            <img
              src={selectedBgImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <LanguageCardArt art={option.art} selected={selected} />
        </div>
        <div className="flex w-full flex-col items-center text-center leading-none">
          <div
            className={`text-[13px] leading-5 ${selected ? 'text-[#171717]' : 'text-[rgba(23,23,23,0.65)]'} ${
              selected
                ? option.selectedNativeClassName || `${option.nativeClassName} font-medium`
                : option.nativeClassName
            }`}
          >
            {option.scriptLabel}
          </div>
          <div className="w-[60px] font-sans text-[11px] leading-4 text-[rgba(23,23,23,0.65)]">
            {option.label}
          </div>
        </div>
      </div>
    </button>
  )
}

function FontPickerModal({
  open,
  onClose,
  fonts,
  currentFont,
  onSelect,
  loading,
}: {
  open: boolean
  onClose: () => void
  fonts: string[]
  currentFont: string
  onSelect: (font: string) => void
  loading: boolean
}) {
  const [search, setSearch] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      setSearch('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const q = search.trim().toLowerCase()
  const filtered = fonts.filter(
    f => !q || f.toLowerCase().includes(q)
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-[min(400px,92vw)] max-h-[88vh] flex flex-col rounded-lg border border-border bg-card shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">Fonts</span>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3 space-y-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search fonts…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-8 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setSearch('')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none fade-scroll-y p-2 max-h-[280px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No fonts found</p>
          ) : (
            <div className="space-y-0.5">
              {filtered.map(font => (
                <button
                  key={font}
                  type="button"
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                    currentFont === font
                      ? 'bg-muted text-foreground'
                      : 'text-foreground hover:bg-muted/70'
                  }`}
                  style={{ fontFamily: font }}
                  onClick={() => { onSelect(font); onClose() }}
                >
                  {currentFont === font && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  <span className="truncate">{font}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const SIZE_TOLERANCE = 3
function isHeavierWeight(w: string): boolean {
  const s = (w || '').toLowerCase()
  return s.includes('medium') || s.includes('semibold') || s.includes('semi-bold') || s.includes('bold') || s.includes('heavy') || s.includes('black')
}
function targetSuggestsHeavier(name: string): boolean {
  const n = (name || '').toLowerCase()
  return n.includes('prominent') || n.includes('bold') || n.includes('semibold') || n.includes('semi-bold')
}

type StyleOption = {
  id: string
  name: string
  fontSize?: number | null
  weight?: string
  sizeStr?: string
}

type SourceStyleRow = {
  key: string
  font: string
  size: number
  lh: number | null
  weight: string
  decoration?: string
  segmentCount?: number
}

function StyleOptionPickerModal({
  open,
  sourceLabel,
  currentValue,
  availableStyles,
  onClose,
  onSelect,
}: {
  open: boolean
  sourceLabel: string
  currentValue: string
  availableStyles: StyleOption[]
  onClose: () => void
  onSelect: (value: string) => void
}) {
  if (!open) return null

  const options = [
    { id: '__none__', title: 'No mapping' },
    ...availableStyles.map(style => ({
      id: style.id,
      title: `${style.name}${style.sizeStr ? ` • ${style.sizeStr.replace('px / ', '/')}` : ''}`,
    })),
  ]

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4" onClick={onClose}>
      <div
        className="flex max-h-[78vh] w-[min(336px,calc(100vw-24px))] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Choose target style</p>
            <p className="mt-1 truncate text-[12px] text-muted-foreground">{sourceLabel}</p>
          </div>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Close style picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none fade-scroll-y p-2">
          <div className="space-y-1">
            {options.map(option => {
              const selected = currentValue === option.id || (!currentValue && option.id === '__none__')
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`flex h-10 w-full items-center gap-2 rounded-md px-3 text-left transition-colors ${
                    selected
                      ? 'bg-accent/12 text-foreground'
                      : 'text-foreground hover:bg-muted/70'
                  }`}
                  onClick={() => {
                    onSelect(option.id)
                    onClose()
                  }}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {selected ? <Check className="h-3.5 w-3.5 text-accent" /> : null}
                  </span>
                  <span className="truncate text-[13px] leading-5">{option.title}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function StyleMappingModal({
  open,
  onClose,
  lang,
  langLabel,
  fontForLang,
  availableStyles,
  sourceStyles,
  styleMappings,
  onMappingChange,
  onSave,
}: {
  open: boolean
  onClose: () => void
  lang: string
  langLabel: string
  fontForLang: string
  availableStyles: StyleOption[]
  sourceStyles: SourceStyleRow[]
  styleMappings: Record<string, Record<string, string>>
  onMappingChange: (lang: string, key: string, value: string) => void
  onSave: () => void
}) {
  const [pickerSourceKey, setPickerSourceKey] = React.useState<string | null>(null)
  const pendingActionRef = React.useRef<'scan' | 'refetch' | 'initial-load' | null>(null)
  const scanBaselineRef = React.useRef<string[]>([])
  const stylesBaselineRef = React.useRef<string[]>([])

  const notifyInFigma = React.useCallback((message: string, error = false) => {
    parent.postMessage({ pluginMessage: { type: 'style-mapping-notify', message, error } }, '*')
  }, [])

  React.useEffect(() => {
    if (open && fontForLang) {
      pendingActionRef.current = 'initial-load'
      parent.postMessage({ pluginMessage: { type: 'get-styles-for-font', fontFamily: fontForLang } }, '*')
    }
  }, [open, fontForLang])

  React.useEffect(() => {
    if (!open) {
      setPickerSourceKey(null)
      pendingActionRef.current = null
      scanBaselineRef.current = []
      stylesBaselineRef.current = []
    }
  }, [open])

  const langMap = styleMappings[lang] || {}

  const mappedSourceStyles: SourceStyleRow[] = Object.keys(langMap).map((key) => {
    const [font, sizeStr, lhStr, weight] = key.split('|')
    const parsedSize = Number(sizeStr)
    const parsedLineHeight = lhStr === 'auto' ? null : Number(lhStr)
    return {
      key,
      font: font || 'Unknown',
      size: Number.isFinite(parsedSize) ? parsedSize : 0,
      lh: Number.isFinite(parsedLineHeight) ? parsedLineHeight : null,
      weight: weight || 'Regular',
    }
  })
  const displaySourceStyles: SourceStyleRow[] = sourceStyles.length > 0 ? sourceStyles : mappedSourceStyles
  const pickerSource = displaySourceStyles.find(src => src.key === pickerSourceKey) || null

  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage
      if (!msg || !open) return

      if (msg.type === 'styles-for-font-loaded') {
        if (typeof msg.fontFamily !== 'string' || msg.fontFamily !== fontForLang) return

        const nextIds = Array.isArray(msg.styles) ? msg.styles.map((style: StyleOption) => style.id) : []
        const previousIds = stylesBaselineRef.current

        if (pendingActionRef.current === 'refetch') {
          const newCount = nextIds.filter((id: string) => !previousIds.includes(id)).length
          notifyInFigma(
            nextIds.length === 0
              ? `No styles found for ${fontForLang}.`
              : newCount > 0
                ? `Refetched ${nextIds.length} styles for ${fontForLang}. ${newCount} new style${newCount === 1 ? '' : 's'} found.`
                : `Refetched ${nextIds.length} styles for ${fontForLang}. No new updates found.`
          )
        }

        stylesBaselineRef.current = nextIds
        pendingActionRef.current = null
      }

      if (msg.type === 'scan-selection-loaded') {
        const nextKeys = Array.isArray(msg.sourceStyles) ? msg.sourceStyles.map((style: SourceStyleRow) => style.key) : []
        const previousKeys = scanBaselineRef.current

        if (pendingActionRef.current === 'scan') {
          const newCount = nextKeys.filter((key: string) => !previousKeys.includes(key)).length
          notifyInFigma(
            nextKeys.length === 0
              ? 'Scan finished. No text styles found in the current selection.'
              : previousKeys.length === 0
                ? `Scan finished. Found ${nextKeys.length} source style${nextKeys.length === 1 ? '' : 's'}.`
                : newCount > 0
                  ? `Scan finished. Found ${newCount} new source style${newCount === 1 ? '' : 's'}.`
                  : 'Scan finished. No new updates found in the current selection.'
          )
        }

        scanBaselineRef.current = nextKeys
        pendingActionRef.current = null
      }

      if (msg.type === 'style-mapping-feedback') {
        pendingActionRef.current = null
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [fontForLang, notifyInFigma, open])

  if (!open) return null

  const handleAutoApply = () => {
    if (availableStyles.length === 0 || sourceStyles.length === 0) return
    for (const src of sourceStyles) {
      const srcHeavier = isHeavierWeight(src.weight)
      let best: { id: string; score: number } | null = null
      for (const t of availableStyles) {
        const tSize = t.fontSize ?? 0
        const sizeDiff = Math.abs(src.size - tSize)
        if (sizeDiff > SIZE_TOLERANCE) continue
        const weightMatch = srcHeavier === targetSuggestsHeavier(t.name)
        const score = sizeDiff * 10 + (weightMatch ? 0 : 5)
        if (!best || score < best.score) best = { id: t.id, score }
      }
      if (best) onMappingChange(lang, src.key, best.id)
    }
  }

  const canAutoApply = sourceStyles.length > 0 && availableStyles.length > 0
  const hasDisplayRows = displaySourceStyles.length > 0
  const scanButtonLabel = 'Scan selection'

  const handleScanSelection = () => {
    scanBaselineRef.current = displaySourceStyles.map(style => style.key)
    pendingActionRef.current = 'scan'
    parent.postMessage({ pluginMessage: { type: 'scan-selection' } }, '*')
  }

  const handleRefetchStyles = () => {
    stylesBaselineRef.current = availableStyles.map(style => style.id)
    pendingActionRef.current = 'refetch'
    parent.postMessage({ pluginMessage: { type: 'get-styles-for-font', fontFamily: fontForLang } }, '*')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex max-h-[84vh] w-[min(336px,calc(100vw-24px))] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">Font style mapping - {langLabel}</span>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
          {hasDisplayRows ? (
            <>
              <div className="mb-3 flex items-center justify-end gap-4">
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                  onClick={handleScanSelection}
                  title="Find source styles in your selection"
                >
                  <Search className="h-3.5 w-3.5" />
                  {scanButtonLabel}
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                  onClick={handleRefetchStyles}
                >
                  Refetch styles
                </Button>
                {canAutoApply ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto px-0 text-[13px] font-medium text-[#1f9d55] hover:text-[#1f9d55]/80"
                    onClick={handleAutoApply}
                    title="Auto-match source styles to target by size and weight"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Auto apply
                  </Button>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto scrollbar-none fade-scroll-y pr-1">
                {displaySourceStyles.map((src) => {
                  const current = langMap[src.key] ?? ''
                  const selectedStyle = availableStyles.find(s => s.id === current)
                  return (
                    <div key={src.key} className="grid grid-cols-[minmax(0,1fr)_132px] items-start gap-2">
                      <span className="line-clamp-2 pt-1 text-[12px] leading-4.5 text-foreground" title={src.key}>
                        {src.font} {src.size}px {src.weight}
                        {src.decoration ? ` (${src.decoration.toLowerCase()})` : ''}
                        {src.segmentCount && src.segmentCount > 1 ? ` (${src.segmentCount})` : ''}
                      </span>
                      <button
                        type="button"
                        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 text-left shadow-sm transition-colors hover:bg-muted/40"
                        onClick={() => setPickerSourceKey(src.key)}
                      >
                        {selectedStyle ? (
                          <div className="min-w-0 truncate text-[12px] leading-4 text-foreground">
                            {selectedStyle.name}{selectedStyle.sizeStr ? ` • ${selectedStyle.sizeStr.replace('px / ', '/')}` : ''}
                          </div>
                        ) : (
                          <div className="min-w-0 truncate text-[12px] leading-4 text-muted-foreground">No mapping</div>
                        )}
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col justify-center">
              <button
                type="button"
                className="flex h-[64px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background text-base font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-muted/30"
                onClick={handleScanSelection}
                title="Find source styles in your selection"
              >
                <Search className="h-4 w-4" />
                {scanButtonLabel}
              </button>
              <div className="mt-4 px-4 py-2 text-center">
                <p className="text-[12px] text-muted-foreground">
                  Select a frame or text layer, then scan to load source styles.
                </p>
              </div>
            </div>
          )}
        </div>
        {hasDisplayRows && (
          <div className="p-4 border-t border-border flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-10" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="flex-1 h-10" onClick={() => { onSave(); onClose(); }}>Save mappings</Button>
          </div>
        )}
      </div>
      <StyleOptionPickerModal
        open={pickerSource !== null}
        sourceLabel={
          pickerSource
            ? `${pickerSource.font} ${pickerSource.size}px ${pickerSource.weight}${pickerSource.decoration ? ` (${pickerSource.decoration.toLowerCase()})` : ''}`
            : ''
        }
        currentValue={pickerSource ? langMap[pickerSource.key] ?? '' : ''}
        availableStyles={availableStyles}
        onClose={() => setPickerSourceKey(null)}
        onSelect={(value) => {
          if (!pickerSource) return
          onMappingChange(
            lang,
            pickerSource.key,
            value === '__none__' ? '' : value
          )
        }}
      />
    </div>
  )
}

function BrandingStrip() {
  return (
    <div className="border-t border-[#dddddd] px-4 pt-3">
      <div className="mx-auto grid w-full max-w-[520px] grid-cols-[1fr_auto_1fr] items-end gap-4">
        <a
          href="https://medium.com/lokal-design"
          target="_blank"
          rel="noreferrer"
          className="flex h-[29px] flex-col items-center justify-between justify-self-center"
        >
          <p className="text-[10px] leading-[11px] text-[rgba(110,110,104,0.6)]">
            Made with ♡
          </p>
          <img
            src={brandingOne}
            alt="Lokal School of Design"
            className="block h-[17px] w-auto max-w-none"
          />
        </a>

        <div className="h-[29px] w-px bg-[rgba(97,96,97,0.16)]" />

        <a
          href="https://www.sarvam.ai/blogs/sarvam-translate"
          target="_blank"
          rel="noreferrer"
          className="flex h-[29px] w-[84px] flex-col items-center justify-between justify-self-center"
        >
          <p className="text-center text-[10px] leading-[11px] text-[rgba(110,110,104,0.6)]">
            Translations by
          </p>
          <img
            src={brandingTwo}
            alt="Sarvam"
            className="block h-[16px] w-auto max-w-none"
          />
        </a>
      </div>
    </div>
  )
}

function UsageHintModal({
  open,
  onClose,
  onContinue,
}: {
  open: boolean
  onClose: () => void
  onContinue: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45" onClick={onClose}>
      <div
        className="w-[320px] rounded-xl border border-border bg-card px-4 py-4 shadow-[0_20px_44px_rgba(17,24,39,0.12),0_6px_18px_rgba(17,24,39,0.06)]"
        onClick={event => event.stopPropagation()}
      >
        <div className="space-y-4">
          <p className="text-center text-sm leading-relaxed text-muted-foreground">
            Rename a layer to <span className="font-medium text-foreground">&quot;hing&quot;</span> for transliteration, <span className="font-medium text-foreground">&quot;dnd&quot;</span> to skip translation and change to the target font style, or <span className="font-medium text-foreground">&quot;lma&quot;</span> to leave it alone.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              className="flex h-9 flex-1 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              onClick={onClose}
            >
              Close
            </button>
            <Button className="h-9 flex-1 rounded-md text-sm font-medium" onClick={onContinue}>
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Plugin() {
  const [targetLanguage, setTargetLanguage] = React.useState('te')
  const [isTranslateRunning, setIsTranslateRunning] = React.useState(false)
  const [isBulkRunning, setIsBulkRunning] = React.useState(false)
  const [isGeneratingCustomRefine, setIsGeneratingCustomRefine] = React.useState(false)
  const [weightMappingInfo, setWeightMappingInfo] = React.useState<string[]>([])
  const [showWeightMappings, setShowWeightMappings] = React.useState(false)
  const [bulkLanguages, setBulkLanguages] = React.useState<string[] | null>(DEFAULT_BULK_LANGUAGES)
  const [bulkSetupSelection, setBulkSetupSelection] = React.useState<string[]>(DEFAULT_BULK_LANGUAGES)
  const [assumeEnglishSource, setAssumeEnglishSource] = React.useState(false)
  const [translationMode, setTranslationMode] = React.useState<TranslationMode>('sarvam-translate')
  const [refinePrompt, setRefinePrompt] = React.useState('')
  const [refineSelection, setRefineSelection] = React.useState<RefineSelectionState | null>(null)
  const [refineThreads, setRefineThreads] = React.useState<Record<string, RefineThreadState>>({})
  const [refineAnswer, setRefineAnswer] = React.useState('')

  const [targetFont, setTargetFont] = React.useState('Noto Sans')
  const [isSwapping, setIsSwapping] = React.useState(false)

  const [fontPrefs, setFontPrefs] = React.useState<Record<string, string>>({})
  const [availableFonts, setAvailableFonts] = React.useState<string[]>([])
  const [fontsLoading, setFontsLoading] = React.useState(false)
  const [fontPickerForLang, setFontPickerForLang] = React.useState<string | null>(null)
  const [fontSwapPicker, setFontSwapPicker] = React.useState<'target' | null>(null)
  const [showTranslationStylePicker, setShowTranslationStylePicker] = React.useState(false)
  const [page, setPage] = React.useState<'translate' | 'refine' | 'fontSwap' | 'fontPrefs' | 'bulkPrefs' | 'apiKey'>('translate')
  const [apiKey, setApiKey] = React.useState('')
  const [apiKeyDraft, setApiKeyDraft] = React.useState('')
  const [apiKeyLoaded, setApiKeyLoaded] = React.useState(false)
  const [isSavingApiKey, setIsSavingApiKey] = React.useState(false)
  const [showApiKeyValue, setShowApiKeyValue] = React.useState(false)
  const [hasUnsavedFontPrefs, setHasUnsavedFontPrefs] = React.useState(false)
  const [styleMappingModalLang, setStyleMappingModalLang] = React.useState<string | null>(null)
  const [availableStyles, setAvailableStyles] = React.useState<Array<{ id: string; name: string; sizeStr?: string }>>([])
  const [sourceStyles, setSourceStyles] = React.useState<Array<{ key: string; font: string; size: number; lh: number | null; weight: string; decoration?: string; segmentCount?: number }>>([])
  const [styleMappings, setStyleMappings] = React.useState<Record<string, Record<string, string>>>({})
  const [hasSeenUsageHint, setHasSeenUsageHint] = React.useState(false)
  const [showUsageHintModal, setShowUsageHintModal] = React.useState(false)
  const [pendingUsageAction, setPendingUsageAction] = React.useState<'translate' | 'bulk' | null>(null)
  const pendingUsageActionRef = React.useRef<'translate' | 'bulk' | null>(null)
  const hasSeenUsageHintRef = React.useRef(false)
  const cardRailWrapperRef = React.useRef<HTMLDivElement | null>(null)
  const cardRailViewportRef = React.useRef<HTMLDivElement | null>(null)
  const cardRefs = React.useRef<Record<string, HTMLButtonElement | null>>({})
  const shadowFrameRef = React.useRef<number | null>(null)
  const [selectedCardShadow, setSelectedCardShadow] = React.useState<null | {
    left: number
    top: number
    width: number
    height: number
  }>(null)
  const notifyInFigma = React.useCallback((message: string, error = false) => {
    parent.postMessage({ pluginMessage: { type: 'ui-notify', message, error } }, '*')
  }, [])

  const updateSelectedCardShadow = React.useCallback(() => {
    if (page !== 'translate') {
      setSelectedCardShadow(null)
      return
    }
    const wrapper = cardRailWrapperRef.current
    const selectedCard = cardRefs.current[targetLanguage]
    if (!wrapper || !selectedCard) {
      setSelectedCardShadow(null)
      return
    }

    const wrapperRect = wrapper.getBoundingClientRect()
    const cardRect = selectedCard.getBoundingClientRect()

    setSelectedCardShadow({
      left: cardRect.left - wrapperRect.left,
      top: cardRect.top - wrapperRect.top,
      width: cardRect.width,
      height: cardRect.height,
    })
  }, [page, targetLanguage])

  React.useLayoutEffect(() => {
    if (page !== 'translate') {
      setSelectedCardShadow(null)
      return
    }

    const scheduleUpdate = () => {
      if (shadowFrameRef.current != null) return
      shadowFrameRef.current = window.requestAnimationFrame(() => {
        shadowFrameRef.current = null
        updateSelectedCardShadow()
      })
    }

    scheduleUpdate()

    const viewport = cardRailViewportRef.current
    const wrapper = cardRailWrapperRef.current
    const selectedCard = cardRefs.current[targetLanguage]
    const resizeObserver = new ResizeObserver(() => scheduleUpdate())

    if (viewport) {
      viewport.addEventListener('scroll', scheduleUpdate, { passive: true })
      resizeObserver.observe(viewport)
    }
    if (wrapper) resizeObserver.observe(wrapper)
    if (selectedCard) resizeObserver.observe(selectedCard)
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      if (shadowFrameRef.current != null) {
        window.cancelAnimationFrame(shadowFrameRef.current)
        shadowFrameRef.current = null
      }
      if (viewport) viewport.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      resizeObserver.disconnect()
    }
  }, [page, targetLanguage, updateSelectedCardShadow])

  const effectiveFontForLang = (lang: string): string => {
    const userChoice = fontPrefs[lang]
    if (userChoice && availableFonts.includes(userChoice)) return userChoice
    return DEFAULT_LANGUAGE_FONTS[lang] || 'Noto Sans'
  }

  const openFontPicker = (lang: string) => {
    setFontPickerForLang(lang)
    if (availableFonts.length === 0) {
      setFontsLoading(true)
      parent.postMessage({ pluginMessage: { type: 'get-fonts' } }, '*')
    }
  }

  const openFontSwapPicker = () => {
    setFontSwapPicker('target')
    if (availableFonts.length === 0) {
      setFontsLoading(true)
      parent.postMessage({ pluginMessage: { type: 'get-fonts' } }, '*')
    }
  }

  const loadRefineContext = React.useCallback((clearResults = false) => {
    if (clearResults) {
      setRefineAnswer('')
    }
    parent.postMessage({ pluginMessage: { type: 'get-refine-context' } }, '*')
  }, [])

  const getRefineThreadKey = React.useCallback((context: RefineSelectionState | null) => {
    if (!context?.canRefine || !context.nodeId) return null
    return context.nodeId
  }, [])

  React.useEffect(() => {
    parent.postMessage({ pluginMessage: { type: 'get-api-key' } }, '*')
    parent.postMessage({ pluginMessage: { type: 'get-bulk-prefs' } }, '*')
    parent.postMessage({ pluginMessage: { type: 'get-font-prefs' } }, '*')
    parent.postMessage({ pluginMessage: { type: 'get-style-mappings' } }, '*')
    parent.postMessage({ pluginMessage: { type: 'get-usage-hint-state' } }, '*')
  }, [])

  React.useEffect(() => {
    pendingUsageActionRef.current = pendingUsageAction
  }, [pendingUsageAction])

  React.useEffect(() => {
    hasSeenUsageHintRef.current = hasSeenUsageHint
  }, [hasSeenUsageHint])

  React.useEffect(() => {
    if (page === 'refine') loadRefineContext(true)
  }, [page, loadRefineContext, getRefineThreadKey])

  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage
      if (!msg) return
      switch (msg.type) {
        case 'api-key-loaded': {
          const loadedApiKey = typeof msg.apiKey === 'string' ? msg.apiKey : ''
          setApiKey(loadedApiKey)
          setApiKeyDraft(loadedApiKey)
          setApiKeyLoaded(true)
          break
        }
        case 'api-key-saved': {
          const savedApiKey = typeof msg.apiKey === 'string' ? msg.apiKey : ''
          setApiKey(savedApiKey)
          setApiKeyDraft(savedApiKey)
          setApiKeyLoaded(true)
          setIsSavingApiKey(false)
          setShowApiKeyValue(false)
          setPage('translate')
          if (pendingUsageActionRef.current && !hasSeenUsageHintRef.current) {
            setShowUsageHintModal(true)
          } else {
            setPendingUsageAction(null)
          }
          break
        }
        case 'api-key-cleared':
          setApiKey('')
          setApiKeyDraft('')
          setApiKeyLoaded(true)
          setIsSavingApiKey(false)
          setShowApiKeyValue(false)
          setPage('apiKey')
          break
        case 'translation-started':
          setIsTranslateRunning(true)
          setIsBulkRunning(false)
          break
        case 'refine-selection-changed':
          if (page === 'refine') {
            setRefineAnswer('')
            loadRefineContext(true)
          }
          break
        case 'refine-context':
          {
            const context = msg.context && typeof msg.context === 'object' ? msg.context as RefineSelectionState : null
            setRefineSelection(context)
            const nextKey = getRefineThreadKey(context)
            if (!nextKey || !context?.text) {
              setRefineAnswer('')
            } else {
              const existingThread = refineThreads[nextKey]
              setRefineAnswer(existingThread?.turns[existingThread.turns.length - 1]?.content || '')
            }
          }
          break
        case 'refine-custom-started':
          setIsGeneratingCustomRefine(true)
          break
        case 'refine-generated':
          setIsGeneratingCustomRefine(false)
          if (typeof msg.generatedText === 'string') {
            setRefineAnswer(msg.generatedText)
          }
          if (typeof msg.nodeId === 'string' && typeof msg.prompt === 'string' && typeof msg.generatedText === 'string') {
            setRefineThreads(prev => {
              const threadKey = msg.nodeId
              const current = prev[threadKey] ?? {
                selectionKey: threadKey,
                nodeId: msg.nodeId,
                seedText: typeof msg.seedText === 'string' ? msg.seedText : '',
                turns: [],
              }
              return {
                ...prev,
                [threadKey]: {
                  ...current,
                  turns: [
                    ...current.turns,
                    { role: 'user', content: msg.prompt },
                    { role: 'assistant', content: msg.generatedText },
                  ],
                },
              }
            })
          }
          setRefinePrompt('')
          break
        case 'refine-error':
          if (msg.scope === 'custom') {
            setIsGeneratingCustomRefine(false)
          }
          break
        case 'translation-progress':
          break
        case 'bulk-started':
          setIsBulkRunning(true)
          setIsTranslateRunning(false)
          break
        case 'bulk-progress':
          break
        case 'bulk-complete':
          setIsBulkRunning(false)
          break
        case 'translation-complete':
          setIsTranslateRunning(false)
          if (msg.weightMappings && msg.weightMappings.length > 0) {
            setWeightMappingInfo(msg.weightMappings)
            setShowWeightMappings(true)
          }
          break
        case 'translation-error':
          break
        case 'font-swap-started':
          break
        case 'font-swap-progress':
          break
        case 'font-swap-complete':
          setIsSwapping(false)
          break
        case 'font-swap-error':
          break
        case 'error':
          setIsTranslateRunning(false)
          setIsBulkRunning(false)
          setIsGeneratingCustomRefine(false)
          setIsSwapping(false)
          setIsSavingApiKey(false)
          if (typeof msg.message === 'string' && msg.message.toLowerCase().includes('api key')) {
            setPage('apiKey')
          }
          break
        case 'bulk-prefs-loaded':
          if (msg.bulkLanguages && msg.bulkLanguages.length > 0) {
            setBulkLanguages(msg.bulkLanguages)
            setBulkSetupSelection(msg.bulkLanguages)
          } else {
            setBulkLanguages(DEFAULT_BULK_LANGUAGES)
            setBulkSetupSelection(DEFAULT_BULK_LANGUAGES)
          }
          break
        case 'bulk-prefs-saved':
          setBulkLanguages(msg.bulkLanguages || [])
          break
        case 'font-list-loaded':
          setAvailableFonts(Array.isArray(msg.fonts) ? msg.fonts : [])
          setFontsLoading(false)
          break
        case 'font-prefs-loaded':
          setFontPrefs(msg.fontPrefs && typeof msg.fontPrefs === 'object' ? msg.fontPrefs : {})
          setHasUnsavedFontPrefs(false)
          break
        case 'font-prefs-saved':
          setFontPrefs(msg.fontPrefs && typeof msg.fontPrefs === 'object' ? msg.fontPrefs : {})
          setHasUnsavedFontPrefs(false)
          break
        case 'styles-for-font-loaded':
          setAvailableStyles(Array.isArray(msg.styles) ? msg.styles : [])
          break
        case 'scan-selection-loaded':
          setSourceStyles(Array.isArray(msg.sourceStyles) ? msg.sourceStyles : [])
          break
        case 'style-mappings-loaded':
          setStyleMappings(msg.mappings && typeof msg.mappings === 'object' ? msg.mappings : {})
          break
        case 'style-mappings-saved':
          setStyleMappings(msg.mappings && typeof msg.mappings === 'object' ? msg.mappings : {})
          break
        case 'usage-hint-state-loaded':
          setHasSeenUsageHint(Boolean(msg.seen))
          break
        case 'hard-reset-complete':
          setBulkLanguages(DEFAULT_BULK_LANGUAGES)
          setBulkSetupSelection(DEFAULT_BULK_LANGUAGES)
          setFontPrefs({})
          setHasUnsavedFontPrefs(false)
          setStyleMappings({})
          setSourceStyles([])
          setAssumeEnglishSource(false)
          setTranslationMode('sarvam-translate')
          setRefinePrompt('')
          setRefineSelection(null)
          setRefineThreads({})
          setRefineAnswer('')
          setHasSeenUsageHint(false)
          setShowUsageHintModal(false)
          setPendingUsageAction(null)
          break
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [getRefineThreadKey, loadRefineContext, page, refineThreads])

  const activePage = page
  const activeRefineSelectionKey = getRefineThreadKey(refineSelection)
  const activeRefineThread = activeRefineSelectionKey ? refineThreads[activeRefineSelectionKey] ?? null : null
  const hasActiveRefineThread = Boolean(activeRefineThread && activeRefineThread.turns.length > 0)
  const isApiKeyRequired = activePage === 'apiKey' && !apiKey.trim()
  const trimmedApiKeyDraft = apiKeyDraft.trim()
  const isApiKeyFormatValid = trimmedApiKeyDraft.length === 0 || /^sk_[A-Za-z0-9_]{16,}$/.test(trimmedApiKeyDraft)

  const handleSaveApiKey = () => {
    if (!trimmedApiKeyDraft) {
      notifyInFigma('Please enter your API key to continue.', true)
      return
    }
    if (!isApiKeyFormatValid) {
      notifyInFigma('Please enter a valid Sarvam API key. It should start with sk_.', true)
      return
    }
    setIsSavingApiKey(true)
    parent.postMessage({ pluginMessage: { type: 'save-api-key', apiKey: trimmedApiKeyDraft } }, '*')
  }

  const runTranslate = () => {
    if (isBulkRunning) {
      notifyInFigma('Please wait for bulk translate to finish before starting translate.', true)
      return
    }
    if (isSwapping) {
      notifyInFigma('Please wait for font swap to finish before starting translate.', true)
      return
    }
    if (isTranslateRunning) return
    setIsTranslateRunning(true)
    setWeightMappingInfo([])
    setShowWeightMappings(false)
    parent.postMessage({ pluginMessage: {
      type: 'translate', targetLanguage, assumeEnglish: assumeEnglishSource && targetLanguage !== 'en', translationMode,
    }}, '*')
  }

  const handleTranslate = () => {
    if (!apiKey.trim()) {
      setPendingUsageAction('translate')
      setApiKeyDraft(apiKey)
      setShowApiKeyValue(false)
      setPage('apiKey')
      return
    }
    if (!hasSeenUsageHint) {
      setPendingUsageAction('translate')
      setShowUsageHintModal(true)
      return
    }
    runTranslate()
  }

  const handleRunRefine = () => {
    if (isGeneratingCustomRefine) return
    if (!refineSelection?.canRefine) {
      loadRefineContext(true)
      notifyInFigma(refineSelection?.message || 'Select one text layer or highlight text to refine.', true)
      return
    }
    if (!refinePrompt.trim()) {
      notifyInFigma('Add a refine prompt to continue.', true)
      return
    }
    setIsGeneratingCustomRefine(true)
    parent.postMessage({
      pluginMessage: {
        type: 'refine-generate-custom',
        customPrompt: refinePrompt,
        selectionKey: activeRefineSelectionKey,
        history: activeRefineThread ? activeRefineThread.turns : [],
        layerText: refineSelection.layerText || refineSelection.text,
      },
    }, '*')
  }

  const runBulkStressTest = () => {
    if (isTranslateRunning) {
      notifyInFigma('Please wait for translate to finish before starting bulk translate.', true)
      return
    }
    if (isSwapping) {
      notifyInFigma('Please wait for font swap to finish before starting bulk translate.', true)
      return
    }
    if (isBulkRunning) return
    const activeBulkLanguages = bulkLanguages && bulkLanguages.length > 0
      ? bulkLanguages
      : DEFAULT_BULK_LANGUAGES
    setIsBulkRunning(true)
    setWeightMappingInfo([])
    setShowWeightMappings(false)
    parent.postMessage({ pluginMessage: {
      type: 'bulk-translate-all', bulkLanguages: activeBulkLanguages, assumeEnglish: assumeEnglishSource, translationMode,
    }}, '*')
  }

  const handleBulkStressTest = () => {
    if (!apiKey.trim()) {
      setPendingUsageAction('bulk')
      setApiKeyDraft(apiKey)
      setShowApiKeyValue(false)
      setPage('apiKey')
      return
    }
    if (!hasSeenUsageHint) {
      setPendingUsageAction('bulk')
      setShowUsageHintModal(true)
      return
    }
    runBulkStressTest()
  }

  const handleUsageHintContinue = () => {
    parent.postMessage({ pluginMessage: { type: 'dismiss-usage-hint' } }, '*')
    setHasSeenUsageHint(true)
    setShowUsageHintModal(false)
    setPendingUsageAction(null)
  }

  const handleUsageHintClose = () => {
    setShowUsageHintModal(false)
    setPendingUsageAction(null)
  }

  const handleBulkSetupSave = () => {
    if (bulkSetupSelection.length === 0) return
    parent.postMessage({ pluginMessage: { type: 'save-bulk-prefs', bulkLanguages: bulkSetupSelection } }, '*')
    setBulkLanguages(bulkSetupSelection)
    setPage('translate')
  }

  const toggleBulkLang = (code: string) => {
    setBulkSetupSelection(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  const handleFontSwap = () => {
    if (isTranslateRunning) {
      notifyInFigma('Please wait for translate to finish before starting font swap.', true)
      return
    }
    if (isBulkRunning) {
      notifyInFigma('Please wait for bulk translate to finish before starting font swap.', true)
      return
    }
    if (isSwapping) return
    setIsSwapping(true)
    parent.postMessage({ pluginMessage: {
      type: 'font-swap', targetFont,
    }}, '*')
  }

  const selectedLanguageLabel =
    languageOptions.find(option => option.value === targetLanguage)?.label || 'Selected language'

  const handleSaveFontPrefs = () => {
    parent.postMessage({ pluginMessage: { type: 'save-font-prefs', fontPrefs } }, '*')
  }

  const openStyleMappingModal = (lang: string) => {
    setSourceStyles([])
    setAvailableStyles([])
    setStyleMappingModalLang(lang)
  }

  const hasStyleMappingsForLang = (lang: string): boolean =>
    Object.values(styleMappings[lang] || {}).some(
      value => typeof value === 'string' && value.trim().length > 0 && value !== 'skip'
    )

  const isDedicatedPrefsPage = activePage === 'fontPrefs' || activePage === 'bulkPrefs' || activePage === 'apiKey'

  if (!apiKeyLoaded) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background font-sans antialiased">
        <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-4">
          <Card className="w-full rounded-lg border border-border bg-card shadow-[0_20px_44px_rgba(17,24,39,0.045),0_6px_18px_rgba(17,24,39,0.02)]">
            <CardContent className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-background font-sans antialiased">
      <div className={`flex-1 min-h-0 ${isDedicatedPrefsPage ? 'overflow-hidden' : 'overflow-y-auto scrollbar-none'}`}>
        <div className={`px-5 py-4 ${isDedicatedPrefsPage ? 'flex h-full min-h-0 flex-col' : ''}`}>
          <div className={isDedicatedPrefsPage ? 'flex min-h-0 flex-1 flex-col' : 'space-y-4'}>
            {activePage === 'translate' || activePage === 'refine' || activePage === 'fontSwap' ? (
              <div className="space-y-[8px] pt-1">
                <div className="flex items-end gap-[18px]">
                  <button
                    type="button"
                    onClick={() => setPage('translate')}
                    className={`relative flex items-center pb-2 text-[21px] leading-none tracking-[-0.04em] transition-colors ${
                      activePage === 'translate' ? 'font-semibold text-foreground' : 'font-semibold text-[#C7CDD8]'
                    }`}
                  >
                    <span>Translate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage('refine')}
                    className={`relative flex items-center pb-2 text-[21px] leading-none tracking-[-0.04em] transition-colors ${
                      activePage === 'refine' ? 'font-semibold text-foreground' : 'font-semibold text-[#C7CDD8]'
                    }`}
                  >
                    <span>Refine</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage('fontSwap')}
                    className={`relative flex items-center pb-2 text-[21px] leading-none tracking-[-0.04em] transition-colors ${
                      activePage === 'fontSwap' ? 'font-semibold text-foreground' : 'font-semibold text-[#C7CDD8]'
                    }`}
                  >
                    <span>Swap</span>
                  </button>
                </div>
                {activePage === 'translate' ? (
                  <div className="space-y-4">
                    <div ref={cardRailWrapperRef} className="relative z-10 -mx-5">
                      {selectedCardShadow ? (
                        <span
                          className="pointer-events-none absolute rounded-[8px] shadow-[0px_-2px_12px_0px_rgba(0,0,0,0.08)]
"
                          style={{
                            left: `${selectedCardShadow.left}px`,
                            top: `${selectedCardShadow.top}px`,
                            width: `${selectedCardShadow.width}px`,
                            height: `${selectedCardShadow.height}px`,
                          }}
                          aria-hidden="true"
                        />
                      ) : null}
                      <div ref={cardRailViewportRef} className="overflow-x-auto scrollbar-none fade-scroll-x px-5">
                        <div className="flex w-max gap-5 pt-0 pb-1">
                          {languageOptions.map(option => (
                            <LanguageCard
                              key={option.value}
                              option={option}
                              selected={targetLanguage === option.value}
                              onSelect={setTargetLanguage}
                              buttonRef={node => {
                                cardRefs.current[option.value] = node
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button className="h-9 flex-1 rounded-md text-sm font-medium shadow-sm" disabled={isTranslateRunning} onClick={handleTranslate}>
                          {isTranslateRunning ? <><Loader2 className="h-4 w-4 animate-spin" /> Translating…</> : `Translate to ${selectedLanguageLabel}`}
                        </Button>
                        <button
                          type="button"
                          className={`flex h-9 w-11 shrink-0 items-center justify-center rounded-md border border-input bg-background shadow-xs transition-colors ${
                            showTranslationStylePicker
                              ? 'text-foreground bg-muted'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                          onClick={() => setShowTranslationStylePicker(prev => !prev)}
                          aria-label="Open translation style settings"
                          title="Translation style"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="flex h-9 w-11 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground"
                          onClick={() => setPage('fontPrefs')}
                          aria-label="Open font preferences"
                          title="Font preferences"
                        >
                          <CaseSensitive className="h-4 w-4" />
                        </button>
                      </div>
                      {showTranslationStylePicker ? (
                        <Card className="rounded-lg border border-border bg-card shadow-[0_20px_44px_rgba(17,24,39,0.045),0_6px_18px_rgba(17,24,39,0.02)]">
                          <CardContent className="space-y-3 p-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-foreground" />
                                <h3 className="text-sm font-semibold text-foreground">Translation Style</h3>
                              </div>
                            </div>
                            <Tabs value={translationMode} onValueChange={(value) => setTranslationMode(value as TranslationMode)}>
                              <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0">
                                {translationModeOptions.map(option => (
                                  <TabsTrigger
                                    key={option.value}
                                    value={option.value}
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs data-[state=active]:border-foreground data-[state=active]:bg-foreground data-[state=active]:text-background"
                                  >
                                    {option.label}
                                  </TabsTrigger>
                                ))}
                              </TabsList>
                              {translationModeOptions.map(option => (
                                <TabsContent key={option.value} value={option.value} className="mt-2">
                                  <p className="rounded-md border border-dashed border-border/80 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                                    {option.value === 'sarvam-translate'
                                      ? 'Uses sarvam-translate:v1 with formal output, wider language coverage, and a longer 2000-character request limit.'
                                      : option.value === 'formal'
                                      ? 'Best for polished UI copy, structured product text, and crisp labels.'
                                      : option.value === 'classic-colloquial'
                                        ? 'Best when you want more natural everyday phrasing without feeling too casual.'
                                        : 'Best when you want the output to feel current, light, and conversational.'}
                                  </p>
                                </TabsContent>
                              ))}
                            </Tabs>
                          </CardContent>
                        </Card>
                      ) : null}
                    </div>

                    <div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="flex h-9 flex-1 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                          disabled={isBulkRunning}
                          onClick={handleBulkStressTest}
                        >
                          {isBulkRunning ? <><Loader2 className="h-4 w-4 animate-spin" /> Translating…</> : 'Bulk Translate'}
                        </button>
                        <button
                          type="button"
                          className="flex h-9 w-11 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground"
                          onClick={() => {
                            setBulkSetupSelection(bulkLanguages && bulkLanguages.length > 0 ? bulkLanguages : DEFAULT_BULK_LANGUAGES)
                            setPage('bulkPrefs')
                          }}
                          aria-label="Open bulk translate preferences"
                          title="Bulk translate preferences"
                        >
                          <Languages className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {showWeightMappings && weightMappingInfo.length > 0 && (
                      <Card className="rounded-lg border border-border bg-card shadow-[0_20px_44px_rgba(17,24,39,0.045),0_6px_18px_rgba(17,24,39,0.02)]">
                        <CardContent className="p-3">
                          <button className="flex w-full items-center justify-between" onClick={() => setShowWeightMappings(false)}>
                            <span className="text-xs font-medium text-foreground">Weight Mappings ({weightMappingInfo.length})</span>
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <div className="mt-2 max-h-20 overflow-y-auto scrollbar-none fade-scroll-y space-y-1">
                            {weightMappingInfo.map((m, i) => (
                              <p key={i} className="text-xs font-mono text-muted-foreground leading-relaxed">{m}</p>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : activePage === 'refine' ? (
                  <div className="space-y-4">
                    <Card className="rounded-lg border border-border bg-card shadow-[0_20px_44px_rgba(17,24,39,0.045),0_6px_18px_rgba(17,24,39,0.02)]">
                      <CardContent className="space-y-3 p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-foreground" />
                            <h3 className="text-sm font-semibold text-foreground">Selected Text</h3>
                          </div>
                        </div>
                        {refineSelection?.canRefine ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="rounded-full border border-border bg-muted/40 px-2 py-1">
                                {refineSelection.kind === 'range' ? 'Highlighted text' : 'Full layer'}
                              </span>
                              <span>{refineSelection.charCount} chars</span>
                              {refineSelection.nodeName ? <span className="truncate">Layer: {refineSelection.nodeName}</span> : null}
                            </div>
                            <div className="rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-sm leading-relaxed text-foreground">
                              {refineSelection.text}
                            </div>
                            {refineSelection.kind === 'range' && refineSelection.layerText ? (
                              <p className="text-[11px] leading-relaxed text-muted-foreground">
                                Using the full parent layer as supporting context for this conversation.
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <div className="rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                            {refineSelection?.message || 'Select one text layer or highlight text to refine.'}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="rounded-lg border border-border bg-card shadow-[0_20px_44px_rgba(17,24,39,0.045),0_6px_18px_rgba(17,24,39,0.02)]">
                      <CardContent className="space-y-3 p-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-foreground">Refine Chat</h3>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Chat with the selected layer. Replies are copy-only and this conversation stays attached to the same text layer.
                          </p>
                        </div>
                        {hasActiveRefineThread ? (
                          <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2">
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              Follow-up context active. This prompt will remember the last {activeRefineThread?.turns.length} turns for this layer.
                            </p>
                            <button
                              type="button"
                              className="shrink-0 text-[11px] font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
                              onClick={() => {
                                const nodeId = refineSelection?.nodeId
                                if (!activeRefineSelectionKey || !nodeId) return
                                setRefineThreads(prev => ({
                                  ...prev,
                                  [activeRefineSelectionKey]: {
                                    selectionKey: activeRefineSelectionKey,
                                    nodeId,
                                    seedText: refineSelection.text,
                                    turns: [],
                                  },
                                }))
                                setRefineAnswer('')
                              }}
                            >
                              Reset context
                            </button>
                          </div>
                        ) : null}
                        <div className="space-y-2">
                          {activeRefineThread && activeRefineThread.turns.length > 0 ? (
                            <div className="max-h-56 space-y-3 overflow-y-auto scrollbar-none fade-scroll-y rounded-md border border-border/80 bg-background p-3">
                              {activeRefineThread.turns.map((turn, index) => (
                                <div
                                  key={`${turn.role}-${index}`}
                                  className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                    className={`max-w-[92%] px-3 py-2 text-sm leading-relaxed ${
                                      turn.role === 'user'
                                        ? 'rounded-[18px] bg-[#F1F1F1] text-foreground'
                                        : 'text-foreground'
                                    }`}
                                  >
                                    <p className="mb-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                                      {turn.role === 'user' ? 'You' : 'Lokal Refine'}
                                    </p>
                                    <p className="whitespace-pre-wrap break-words">{turn.content}</p>
                                    {turn.role === 'assistant' ? (
                                      <div className="mt-2 flex justify-end">
                                        <button
                                          type="button"
                                          className="text-[11px] font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
                                          onClick={async () => {
                                            try {
                                              await navigator.clipboard.writeText(turn.content)
                                              notifyInFigma('Refine reply copied.')
                                            } catch {
                                              notifyInFigma('Could not copy reply. Please copy it manually.', true)
                                            }
                                          }}
                                        >
                                          Copy
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                              Start the conversation with a prompt. The reply will explain choices and give a best recommendation.
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Prompt</Label>
                          <textarea
                            value={refinePrompt}
                            onChange={event => setRefinePrompt(event.target.value)}
                            onKeyDown={event => {
                              if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault()
                                if (!isGeneratingCustomRefine && refineSelection?.canRefine && refinePrompt.trim()) {
                                  handleRunRefine()
                                }
                              }
                            }}
                            rows={3}
                            placeholder='Example: Change this to "personal" in Hindi script and explain the best choice.'
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/20"
                          />
                        </div>
                        <Button
                          className="h-9 w-full rounded-md text-sm font-medium shadow-sm"
                          disabled={isGeneratingCustomRefine || !refineSelection?.canRefine || !refinePrompt.trim()}
                          onClick={handleRunRefine}
                        >
                          {isGeneratingCustomRefine ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Send'}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Card className="rounded-lg border border-border bg-card shadow-[0_20px_44px_rgba(17,24,39,0.045),0_6px_18px_rgba(17,24,39,0.02)]">
                      <CardContent className="p-4 space-y-3">
                        <div className="space-y-0">
                          <Label className="mb-[7px] block text-xs font-medium text-muted-foreground">Convert to font</Label>
                          <button
                            type="button"
                            className="w-full flex items-center justify-between gap-2 h-9 px-3 rounded-md border border-input bg-background text-left text-sm truncate hover:bg-muted transition-colors"
                            onClick={() => openFontSwapPicker()}
                            disabled={isSwapping}
                          >
                            <span className="truncate">{targetFont}</span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>

                    <Button className="w-full h-9 rounded-md text-sm font-medium shadow-sm" disabled={isSwapping} onClick={handleFontSwap}>
                      {isSwapping ? <><Loader2 className="h-4 w-4 animate-spin" /> Converting…</> : `Convert selection to ${targetFont}`}
                    </Button>

                    <div className="flex gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                      <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Rename a layer to <span className="font-medium text-foreground">&quot;lma&quot;</span> to leave it alone.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : activePage === 'fontPrefs' ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setPage('translate')}
                    className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                </div>

                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-foreground">Font Preference</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Select a font to show in the translation result frame. You can also map your font styles.
                  </p>
                </div>

                <Card className="min-h-0 flex-1 rounded-lg border border-border bg-card shadow-[0_20px_44px_rgba(17,24,39,0.045),0_6px_18px_rgba(17,24,39,0.02)]">
                  <CardContent className="flex h-full flex-col p-4">
                    <div className="flex-1 space-y-2 overflow-y-auto scrollbar-none fade-scroll-y pr-1">
                      {languageOptions.map(o => (
                        <div key={o.value} className="flex items-center gap-2">
                          {(() => {
                            const hasMappings = hasStyleMappingsForLang(o.value)
                            return (
                              <>
                          <span className="text-xs truncate w-20">{o.label}</span>
                          <button
                            type="button"
                            className="flex-1 min-w-0 h-8 px-2.5 rounded-md border border-input bg-background text-left text-xs truncate hover:bg-muted"
                            onClick={() => openFontPicker(o.value)}
                          >
                            {effectiveFontForLang(o.value)}
                          </button>
                          <button
                            type="button"
                            className={`relative shrink-0 h-8 w-8 rounded-md border bg-background flex items-center justify-center transition-colors ${
                              hasMappings
                                ? 'border-input text-[#1f9d55] hover:bg-muted'
                                : 'border-input text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                            onClick={() => openStyleMappingModal(o.value)}
                            title={hasMappings ? `Style mappings applied for ${o.label}` : `Style mappings for ${o.label}`}
                          >
                            {hasMappings && (
                              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#1f9d55] ring-1 ring-white" />
                            )}
                            <Link className="h-3.5 w-3.5" />
                          </button>
                              </>
                            )
                          })()}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="mt-1 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full h-9 rounded-md text-sm"
                    onClick={() => {
                      setFontPrefs({})
                      setStyleMappings({})
                      setSourceStyles([])
                      setAvailableStyles([])
                      parent.postMessage({ pluginMessage: { type: 'save-style-mappings', mappings: {} } }, '*')
                      setHasUnsavedFontPrefs(true)
                    }}
                  >
                    Reset to default fonts
                  </Button>
                  <Button
                    className="w-full h-9 rounded-md text-sm"
                    onClick={handleSaveFontPrefs}
                    disabled={!hasUnsavedFontPrefs}
                  >
                    {hasUnsavedFontPrefs ? 'Save font preferences' : 'Font preferences saved'}
                  </Button>
                  {hasUnsavedFontPrefs && (
                    <p className="text-[11px] text-muted-foreground">
                      Save before translating to apply your updated font choices.
                    </p>
                  )}
                </div>
              </div>
            ) : activePage === 'bulkPrefs' ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setPage('translate')}
                    className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                </div>

                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-foreground">Bulk Translate Preferences</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Choose the languages to translate in when testing in bulk.
                  </p>
                </div>

                <Card className="rounded-lg border border-border bg-card shadow-[0_20px_44px_rgba(17,24,39,0.045),0_6px_18px_rgba(17,24,39,0.02)]">
                  <CardContent className="p-4">
                    <div className="grid auto-rows-min grid-cols-2 gap-x-2 gap-y-1 pr-1">
                      {bulkLanguageOptions.map(o => (
                        <label
                          key={o.value}
                          className="flex h-fit items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-muted/30"
                        >
                          <Checkbox
                            checked={bulkSetupSelection.includes(o.value)}
                            onCheckedChange={() => toggleBulkLang(o.value)}
                          />
                          <span className="truncate text-xs">{o.label}</span>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="mt-1">
                  <Button
                    className="w-full h-9 rounded-md text-sm"
                    disabled={bulkSetupSelection.length === 0}
                    onClick={handleBulkSetupSave}
                  >
                    Save {bulkSetupSelection.length} language{bulkSetupSelection.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                {!isApiKeyRequired ? (
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setPage('translate')}
                      className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground underline"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back
                    </button>
                  </div>
                ) : null}

                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-foreground">API Key</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Enter your Sarvam API key to use Lokal Translate.
                  </p>
                </div>

                <Card className="rounded-lg border border-border bg-card shadow-[0_20px_44px_rgba(17,24,39,0.045),0_6px_18px_rgba(17,24,39,0.02)]">
                  <CardContent className="space-y-4 p-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Sarvam API key</Label>
                      <div className="flex gap-2">
                        <input
                          type={showApiKeyValue ? 'text' : 'password'}
                          value={apiKeyDraft}
                          onChange={event => setApiKeyDraft(event.target.value)}
                          placeholder="sk_..."
                          autoComplete="off"
                          spellCheck={false}
                          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/20"
                        />
                        <button
                          type="button"
                          className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md border border-input bg-background px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={() => setShowApiKeyValue(prev => !prev)}
                        >
                          {showApiKeyValue ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {!isApiKeyFormatValid ? (
                        <p className="text-[11px] text-[#b42318]">
                          Use a valid Sarvam key format starting with <span className="font-medium">sk_</span>.
                        </p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>

                <div className="mt-1 space-y-2">
                  <Button
                    className="w-full h-9 rounded-md text-sm"
                    onClick={handleSaveApiKey}
                    disabled={isSavingApiKey || trimmedApiKeyDraft.length === 0 || !isApiKeyFormatValid}
                  >
                    {isSavingApiKey ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : apiKey.trim() ? 'Update API key' : 'Save API key'}
                  </Button>
                  <a
                    href="https://dashboard.sarvam.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Create API key (1000 free credits)
                  </a>
                </div>
              </div>
            )}
            <StyleMappingModal
              open={styleMappingModalLang !== null}
              onClose={() => setStyleMappingModalLang(null)}
              lang={styleMappingModalLang || ''}
              langLabel={languageOptions.find(o => o.value === styleMappingModalLang)?.label || ''}
              fontForLang={effectiveFontForLang(styleMappingModalLang || '')}
              availableStyles={availableStyles}
              sourceStyles={sourceStyles}
              styleMappings={styleMappings}
              onMappingChange={(lang, key, value) => {
                setStyleMappings(prev => ({
                  ...prev,
                  [lang]: { ...(prev[lang] || {}), [key]: value }
                }))
              }}
              onSave={() => parent.postMessage({ pluginMessage: { type: 'save-style-mappings', mappings: styleMappings } }, '*')}
            />

            {(activePage === 'translate' || activePage === 'refine' || activePage === 'fontSwap' || activePage === 'apiKey') ? <BrandingStrip /> : null}
          </div>
        </div>
      </div>
      {activePage === 'translate' || activePage === 'refine' ? (
        <div className="flex items-center gap-4 bg-background px-5 pb-3 pt-2">
          <button
            type="button"
            className="text-[11px] text-muted-foreground underline transition-colors hover:text-foreground"
            onClick={() => parent.postMessage({ pluginMessage: { type: 'hard-reset' } }, '*')}
          >
            Reset Data
          </button>
          {activePage === 'translate' ? (
            <button
              type="button"
              className={`text-[11px] underline transition-colors ${
                assumeEnglishSource ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setAssumeEnglishSource(prev => !prev)}
            >
              Assume English: {assumeEnglishSource ? 'On' : 'Off'}
            </button>
          ) : null}
          <button
            type="button"
            className="text-[11px] text-muted-foreground underline transition-colors hover:text-foreground"
            onClick={() => {
              setPendingUsageAction(null)
              setShowUsageHintModal(true)
            }}
          >
            Help
          </button>
          <button
            type="button"
            className="text-[11px] text-muted-foreground underline transition-colors hover:text-foreground"
            onClick={() => {
              setApiKeyDraft(apiKey)
              setShowApiKeyValue(false)
              setPage('apiKey')
            }}
          >
            API Key
          </button>
        </div>
      ) : null}

      <FontPickerModal
        open={fontPickerForLang !== null || fontSwapPicker !== null}
        onClose={() => { setFontPickerForLang(null); setFontSwapPicker(null) }}
        fonts={availableFonts}
        currentFont={
          fontSwapPicker === 'target' ? targetFont
          : fontPickerForLang ? effectiveFontForLang(fontPickerForLang)
          : ''
        }
        onSelect={font => {
          if (fontSwapPicker === 'target') {
            setTargetFont(font)
          } else if (fontPickerForLang) {
            setFontPrefs(p => ({ ...p, [fontPickerForLang]: font }))
            setHasUnsavedFontPrefs(true)
          }
          setFontPickerForLang(null)
          setFontSwapPicker(null)
        }}
        loading={fontsLoading}
      />
      <UsageHintModal
        open={showUsageHintModal}
        onClose={handleUsageHintClose}
        onContinue={handleUsageHintContinue}
      />
    </div>
  )
}

function loadThemeFonts() {
  if (typeof document === 'undefined') return
  if (document.querySelector('link[data-font="dm-sans"]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Text:ital@0;1&display=swap'
  link.setAttribute('data-font', 'dm-sans')
  document.head.appendChild(link)
}

export default function (rootNode: HTMLElement, _data: { greeting: string }) {
  loadThemeFonts()
  const root = ReactDOM.createRoot(rootNode)
  root.render(<Plugin />)
}

import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import '!./output.css'

import { Button } from './components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from './components/ui/select'
import { Checkbox } from './components/ui/checkbox'
import { Card, CardContent } from './components/ui/card'
import { Label } from './components/ui/label'
import { Separator } from './components/ui/separator'
import {
  Loader2,
  Type,
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Search,
  X,
  Check,
  Link2,
  ArrowLeft,
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
import brandingStrip from '../assets/branding-strip.svg'

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
  pa: 'Noto Sans Gurmukhi UI',
  ta: 'Noto Sans Tamil UI',
  te: 'Kohinoor Telugu',
  kn: 'Noto Sans Kannada UI',
  ml: 'Noto Sans Malayalam UI',
  en: 'Inter',
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
}: {
  option: LanguageOption
  selected: boolean
  onSelect: (value: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      aria-pressed={selected}
      className={`relative flex h-[130px] w-[100px] shrink-0 flex-col items-center gap-1 rounded-[8px] pb-2 text-center transition-[transform,box-shadow,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171717]/15 ${
        selected
          ? 'border-x border-b border-[#f0f0f0] bg-white shadow-[0px_-2px_12px_0px_rgba(0,0,0,0.08)]'
          : 'bg-white'
      }`}
    >
      <div className="relative h-[82px] w-full overflow-hidden rounded-t-[8px]">
        {selected ? (
          <img
            src={selectedBgImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <LanguageCardArt art={option.art} selected={selected} />
      </div>
      <div className="flex flex-col items-center text-center leading-none">
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
  availableStyles: Array<{ id: string; name: string; fontSize?: number | null; weight?: string; sizeStr?: string }>
  sourceStyles: Array<{ key: string; font: string; size: number; lh: number | null; weight: string; decoration?: string; segmentCount?: number }>
  styleMappings: Record<string, Record<string, string>>
  onMappingChange: (lang: string, key: string, value: string) => void
  onSave: () => void
}) {
  React.useEffect(() => {
    if (open && fontForLang) {
      parent.postMessage({ pluginMessage: { type: 'get-styles-for-font', fontFamily: fontForLang } }, '*')
    }
  }, [open, fontForLang])

  if (!open) return null

  const langMap = styleMappings[lang] || {}
  type DisplaySourceStyle = {
    key: string
    font: string
    size: number
    lh: number | null
    weight: string
    decoration?: string
    segmentCount?: number
  }

  const mappedSourceStyles: DisplaySourceStyle[] = Object.keys(langMap).map((key) => {
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
  const displaySourceStyles: DisplaySourceStyle[] = sourceStyles.length > 0 ? sourceStyles : mappedSourceStyles

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
  const scanButtonLabel = sourceStyles.length > 0 ? 'Rescan selection' : 'Scan selection'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-[min(560px,96vw)] max-h-[88vh] flex flex-col rounded-lg border border-border bg-card shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">Style mappings — {langLabel}</span>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto scrollbar-none fade-scroll-y">
          <button
            type="button"
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background text-base font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-muted/30"
            onClick={() => parent.postMessage({ pluginMessage: { type: 'scan-selection' } }, '*')}
            title="Find source styles in your selection"
          >
            <Search className="h-4 w-4" />
            {scanButtonLabel}
          </button>

          {hasDisplayRows ? (
            <>
              <div className="flex items-center justify-end gap-4">
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => parent.postMessage({ pluginMessage: { type: 'get-styles-for-font', fontFamily: fontForLang } }, '*')}
                >
                  Refetch styles
                </Button>
                {canAutoApply && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto px-0 text-[13px] font-medium text-accent hover:text-accent/80"
                    onClick={handleAutoApply}
                    title="Auto-match source styles to target by size and weight"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Auto apply
                  </Button>
                )}
              </div>

              <div className="space-y-3 max-h-[420px] overflow-y-auto scrollbar-none fade-scroll-y">
                {displaySourceStyles.map((src) => {
                const current = langMap[src.key] ?? ''
                const selectedStyle = availableStyles.find(s => s.id === current)
                return (
                  <div key={src.key} className="grid grid-cols-[180px_minmax(0,1fr)] items-start gap-4">
                    <span className="line-clamp-2 pt-2 text-[12px] leading-5 text-foreground" title={src.key}>
                      {src.font} {src.size}px {src.weight}
                      {src.decoration ? ` (${src.decoration.toLowerCase()})` : ''}
                      {src.segmentCount && src.segmentCount > 1 ? ` (${src.segmentCount})` : ''}
                    </span>
                    <Select
                      value={current || '__none__'}
                      onValueChange={(v) => onMappingChange(lang, src.key, v === '__none__' ? '' : v === 'skip' ? 'skip' : v)}
                    >
                      <SelectTrigger className="min-h-[56px] w-full items-start px-3 py-2 text-left">
                        {selectedStyle ? (
                          <div className="min-w-0 pr-6 text-left">
                            <div className="truncate text-[12px] leading-4 text-foreground">
                              {selectedStyle.name}
                            </div>
                            <div className="mt-1 text-[11px] leading-4 text-muted-foreground">
                              {selectedStyle.sizeStr || '\u2014'}
                            </div>
                          </div>
                        ) : current === 'skip' ? (
                          <div className="min-w-0 pr-6 text-left">
                            <div className="truncate text-[12px] leading-4 text-foreground">Skip</div>
                            <div className="mt-1 text-[11px] leading-4 text-muted-foreground">No style applied</div>
                          </div>
                        ) : current ? (
                          <div className="min-w-0 pr-6 text-left">
                            <div className="truncate text-[12px] leading-4 text-foreground">Mapped style</div>
                            <div className="mt-1 text-[11px] leading-4 text-muted-foreground">Refetch styles to preview details</div>
                          </div>
                        ) : (
                          <div className="min-w-0 pr-6 text-left">
                            <div className="truncate text-[12px] leading-4 text-foreground">No mapping</div>
                            <div className="mt-1 text-[11px] leading-4 text-muted-foreground">
                              Select a target style
                            </div>
                          </div>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        <SelectItem value="skip">Skip</SelectItem>
                        {availableStyles.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}{s.sizeStr ? ` (${s.sizeStr})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
                })}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-center">
              <p className="text-[12px] text-muted-foreground">
                Select a frame or text layer, then scan to load source styles.
              </p>
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
    </div>
  )
}

function StatusMessage({ message }: { message: string }) {
  const isSuccess = message.includes('Successfully') || message.includes('Swapped') || message.includes('Translated') || message.includes('created!')
  const isError = message.includes('failed') || message.includes('error') || message.includes('Error')

  return (
    <div className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm leading-relaxed ${
      isSuccess ? 'border-primary/30 bg-primary/10 text-primary' :
      isError ? 'border-destructive/30 bg-destructive/10 text-destructive' :
      'border-border bg-muted/80 text-muted-foreground'
    }`}>
      {isSuccess
        ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
        : isError
          ? <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          : <Loader2 className="h-4 w-4 shrink-0 mt-0.5 animate-spin" />}
      <span>{message}</span>
    </div>
  )
}

function BrandingStrip() {
  return (
    <div className="border-t border-[#dddddd] px-4 pt-3">
      <img
        src={brandingStrip}
        alt="Crafted by Lokal School of Design"
        className="mx-auto h-[auto] w-[300px]"
      />
    </div>
  )
}

function Plugin() {
  const [targetLanguage, setTargetLanguage] = React.useState('te')
  const [isTranslating, setIsTranslating] = React.useState(false)
  const [status, setStatus] = React.useState<string | null>(null)
  const [assumeEnglish, setAssumeEnglish] = React.useState(true)
  const [weightMappingInfo, setWeightMappingInfo] = React.useState<string[]>([])
  const [showWeightMappings, setShowWeightMappings] = React.useState(false)
  const [bulkLanguages, setBulkLanguages] = React.useState<string[] | null>(DEFAULT_BULK_LANGUAGES)
  const [bulkSetupSelection, setBulkSetupSelection] = React.useState<string[]>(DEFAULT_BULK_LANGUAGES)

  const [targetFont, setTargetFont] = React.useState('Noto Sans')
  const [isSwapping, setIsSwapping] = React.useState(false)
  const [swapStatus, setSwapStatus] = React.useState<string | null>(null)
  const [applyFontStyles, setApplyFontStyles] = React.useState(false)

  const [fontPrefs, setFontPrefs] = React.useState<Record<string, string>>({})
  const [availableFonts, setAvailableFonts] = React.useState<string[]>([])
  const [fontsLoading, setFontsLoading] = React.useState(false)
  const [fontPickerForLang, setFontPickerForLang] = React.useState<string | null>(null)
  const [fontSwapPicker, setFontSwapPicker] = React.useState<'target' | null>(null)
  const [page, setPage] = React.useState<'translate' | 'fontSwap' | 'fontPrefs' | 'bulkPrefs'>('translate')
  const [hasUnsavedFontPrefs, setHasUnsavedFontPrefs] = React.useState(false)
  const [styleMappingModalLang, setStyleMappingModalLang] = React.useState<string | null>(null)
  const [availableStyles, setAvailableStyles] = React.useState<Array<{ id: string; name: string; sizeStr?: string }>>([])
  const [sourceStyles, setSourceStyles] = React.useState<Array<{ key: string; font: string; size: number; lh: number | null; weight: string; decoration?: string; segmentCount?: number }>>([])
  const [styleMappings, setStyleMappings] = React.useState<Record<string, Record<string, string>>>({})

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

  React.useEffect(() => {
    parent.postMessage({ pluginMessage: { type: 'get-bulk-prefs' } }, '*')
    parent.postMessage({ pluginMessage: { type: 'get-font-prefs' } }, '*')
    parent.postMessage({ pluginMessage: { type: 'get-style-mappings' } }, '*')
  }, [])

  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage
      if (!msg) return
      switch (msg.type) {
        case 'translation-started':
          setStatus(`Starting translation of ${msg.count} text elements...`)
          break
        case 'translation-progress':
          setStatus(`Translating ${msg.current}/${msg.total} texts...`)
          break
        case 'bulk-started':
          setStatus(`Starting bulk stress test: ${msg.total} languages...`)
          break
        case 'bulk-progress':
          setStatus(msg.message || `Language ${msg.current}/${msg.total}...`)
          break
        case 'bulk-complete':
          setIsTranslating(false)
          setStatus(msg.message || 'Bulk stress test complete!')
          break
        case 'translation-complete':
          setIsTranslating(false)
          if (msg.weightMappings && msg.weightMappings.length > 0) {
            setWeightMappingInfo(msg.weightMappings)
            setShowWeightMappings(true)
          }
          if (msg.errors > 0) {
            const wt = msg.weightMappings?.length > 0 ? ` (${msg.weightMappings.length} weight mappings)` : ''
            const errDetails = msg.errorMessages?.length ? `\n\nWhy: ${msg.errorMessages.join(' • ')}` : ''
            setStatus(`Translated ${msg.count}/${msg.total} texts (${msg.errors} failed)${wt}${errDetails}`)
          } else if (msg.count === 0) {
            setStatus('No changes made. Text may already be in the target language.')
          } else {
            const wt = msg.weightMappings?.length > 0 ? ` (${msg.weightMappings.length} weight mappings)` : ''
            setStatus(`Successfully translated all ${msg.count} text elements!${wt}`)
          }
          break
        case 'translation-error':
          setStatus(msg.message)
          break
        case 'font-swap-started':
          setSwapStatus(`Starting font swap of ${msg.count} text elements...`)
          break
        case 'font-swap-progress':
          setSwapStatus(`Swapping ${msg.current}/${msg.total} fonts...`)
          break
        case 'font-swap-complete':
          setIsSwapping(false)
          if (msg.errors > 0 || msg.skipped > 0) {
            const errorPart = msg.errors > 0 ? `${msg.errors} failed` : ''
            const skippedPart = msg.skipped > 0 ? `${msg.skipped} skipped` : ''
            const details = [errorPart, skippedPart].filter(Boolean).join(', ')
            setSwapStatus(`Swapped ${msg.count} fonts (${details})`)
          } else {
            setSwapStatus(`Successfully swapped all ${msg.count} fonts!`)
          }
          break
        case 'font-swap-error':
          setSwapStatus(msg.message)
          break
        case 'error':
          setIsTranslating(false)
          setIsSwapping(false)
          setStatus(msg.message)
          setSwapStatus(msg.message)
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
        case 'hard-reset-complete':
          setBulkLanguages(DEFAULT_BULK_LANGUAGES)
          setBulkSetupSelection(DEFAULT_BULK_LANGUAGES)
          setFontPrefs({})
          setHasUnsavedFontPrefs(false)
          setStyleMappings({})
          setSourceStyles([])
          break
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const handleTranslate = () => {
    setIsTranslating(true)
    setStatus('Starting translation...')
    setWeightMappingInfo([])
    setShowWeightMappings(false)
    parent.postMessage({ pluginMessage: {
      type: 'translate', targetLanguage, assumeEnglish,
    }}, '*')
  }

  const handleBulkStressTest = () => {
    const activeBulkLanguages = bulkLanguages && bulkLanguages.length > 0
      ? bulkLanguages
      : DEFAULT_BULK_LANGUAGES
    setIsTranslating(true)
    setStatus(`Starting bulk translate (${activeBulkLanguages.length} languages)...`)
    setWeightMappingInfo([])
    setShowWeightMappings(false)
    parent.postMessage({ pluginMessage: {
      type: 'bulk-translate-all', bulkLanguages: activeBulkLanguages,
    }}, '*')
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
    setIsSwapping(true)
    setSwapStatus('Starting font swap...')
    parent.postMessage({ pluginMessage: {
      type: 'font-swap', targetFont, applyFontStyles,
    }}, '*')
  }

  const selectedLanguageLabel =
    languageOptions.find(option => option.value === targetLanguage)?.label || 'Selected language'

  const handleSaveFontPrefs = () => {
    parent.postMessage({ pluginMessage: { type: 'save-font-prefs', fontPrefs } }, '*')
  }

  const hasStyleMappingsForLang = (lang: string): boolean =>
    Object.values(styleMappings[lang] || {}).some(
      value => typeof value === 'string' && value.trim().length > 0 && value !== 'skip'
    )

  return (
    <div className="flex flex-col h-full min-h-0 bg-background font-sans antialiased">
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
        <div className="px-5 py-4">
          <div className="space-y-4">
            {page === 'translate' || page === 'fontSwap' ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-6">
                    <button
                      type="button"
                      onClick={() => setPage('translate')}
                      className={`text-[28px] leading-none tracking-[-0.04em] transition-colors ${
                        page === 'translate' ? 'font-semibold text-foreground' : 'font-medium text-[#C7CDD8]'
                      }`}
                    >
                      Translate
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage('fontSwap')}
                      className={`text-[28px] leading-none tracking-[-0.04em] transition-colors ${
                        page === 'fontSwap' ? 'font-semibold text-foreground' : 'font-medium text-[#C7CDD8]'
                      }`}
                    >
                      Swap
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage('fontPrefs')}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Open font preferences"
                    title="Font preferences"
                  >
                    <Type className="h-4 w-4" />
                  </button>
                </div>
                {page === 'translate' ? (
                  <>
                    <div className="-mx-5 overflow-x-auto scrollbar-none fade-scroll-x px-5 pb-1">
                      <div className="flex w-max gap-5">
                        {languageOptions.map(option => (
                          <LanguageCard
                            key={option.value}
                            option={option}
                            selected={targetLanguage === option.value}
                            onSelect={setTargetLanguage}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="flex cursor-pointer items-center gap-2.5">
                        <Checkbox checked={assumeEnglish} onCheckedChange={(c) => setAssumeEnglish(c === true)} />
                        <span className="text-sm text-foreground select-none">Assume source is English (faster, fewer API calls)</span>
                      </label>
                    </div>

                    <Button className="w-full h-9 rounded-md text-sm font-medium shadow-sm" disabled={isTranslating} onClick={handleTranslate}>
                      {isTranslating ? <><Loader2 className="h-4 w-4 animate-spin" /> Translating…</> : `Translate to ${selectedLanguageLabel}`}
                    </Button>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="flex h-9 flex-1 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                          disabled={isTranslating}
                          onClick={handleBulkStressTest}
                        >
                          {isTranslating ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : 'Bulk Translate'}
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
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {bulkLanguages && bulkLanguages.length > 0
                          ? bulkLanguages.map(c => bulkLanguageOptions.find(o => o.value === c)?.label || c).join(', ')
                          : 'Choose preferred languages'}
                      </p>
                    </div>

                    {status && <StatusMessage message={status} />}

                    {showWeightMappings && weightMappingInfo.length > 0 && (
                      <Card className="rounded-lg border border-border bg-card shadow-sm">
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

                    <div className="flex gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                      <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Translations are cached (24h) to reduce API costs. Duplicate text is translated once. <span className="font-medium text-foreground">&quot;hing&quot;</span> = transliteration; <span className="font-medium text-foreground">&quot;dnd&quot;</span> = preserve text & font.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        className="text-[11px] text-muted-foreground hover:text-foreground underline"
                        onClick={() => parent.postMessage({ pluginMessage: { type: 'hard-reset' } }, '*')}
                      >
                        Hard reset
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Card className="rounded-lg border border-border bg-card shadow-sm">
                      <CardContent className="p-4 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Convert to font</Label>
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

                    <label className="flex cursor-pointer items-center gap-2.5">
                      <Checkbox checked={applyFontStyles} onCheckedChange={(c) => setApplyFontStyles(c === true)} />
                      <span className="text-sm text-foreground select-none">Auto-apply font styles (Non-Telugu)</span>
                    </label>

                    <Button className="w-full h-9 rounded-md text-sm font-medium shadow-sm" disabled={isSwapping} onClick={handleFontSwap}>
                      {isSwapping ? <><Loader2 className="h-4 w-4 animate-spin" /> Converting…</> : `Convert selection to ${targetFont}`}
                    </Button>

                    {swapStatus && <StatusMessage message={swapStatus} />}

                    <div className="flex gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                      <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Select text layers, choose a font, and convert. All selected text gets the new font; weights are preserved when possible.
                      </p>
                    </div>
                  </>
                )}
              </>
            ) : page === 'fontPrefs' ? (
              <>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPage('translate')}
                    className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                  <button
                    type="button"
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setPage('translate')}
                    aria-label="Close font preferences"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-foreground">Font preferences</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Choose a preferred font per language. If a font is unavailable, the plugin falls back to its default.
                  </p>
                </div>

                <Card className="rounded-lg border border-border bg-card shadow-sm">
                  <CardContent className="p-4">
                    <div className="space-y-2 max-h-[360px] overflow-y-auto scrollbar-none fade-scroll-y pr-1">
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
                                ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/15'
                                : 'border-input text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                            onClick={() => setStyleMappingModalLang(o.value)}
                            title={hasMappings ? `Style mappings applied for ${o.label}` : `Style mappings for ${o.label}`}
                          >
                            {hasMappings && (
                              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
                            )}
                            <Link2 className="h-3.5 w-3.5" />
                          </button>
                              </>
                            )
                          })()}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full h-9 rounded-md text-sm"
                    onClick={() => {
                      setFontPrefs({})
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
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPage('translate')}
                    className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground underline"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                  <button
                    type="button"
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setPage('translate')}
                    aria-label="Close bulk translate preferences"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-foreground">Bulk translate preferences</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Choose the languages used by bulk translate. These are saved for later runs.
                  </p>
                </div>

                <Card className="rounded-lg border border-border bg-card shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto scrollbar-none fade-scroll-y pr-1">
                      {bulkLanguageOptions.map(o => (
                        <label
                          key={o.value}
                          className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40"
                        >
                          <Checkbox
                            checked={bulkSetupSelection.includes(o.value)}
                            onCheckedChange={() => toggleBulkLang(o.value)}
                          />
                          <span className="truncate text-xs">{o.label}</span>
                        </label>
                      ))}
                    </div>
                    <Button
                      className="w-full h-9 rounded-md text-sm"
                      disabled={bulkSetupSelection.length === 0}
                      onClick={handleBulkSetupSave}
                    >
                      Save {bulkSetupSelection.length} language{bulkSetupSelection.length !== 1 ? 's' : ''}
                    </Button>
                  </CardContent>
                </Card>
              </>
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

            <BrandingStrip />
          </div>
        </div>
      </div>

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

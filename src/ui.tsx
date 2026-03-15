import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import '!./output.css'

import { Button } from './components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  ChevronDown,
  ChevronUp,
  Settings2,
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
          : 'bg-[#f5f5f5]'
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
        className="w-[min(340px,95vw)] max-h-[85vh] flex flex-col rounded-lg border border-border bg-card shadow-xl"
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
        <div className="flex-1 min-h-0 overflow-y-auto p-2 max-h-[280px]">
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-[min(360px,95vw)] max-h-[85vh] flex flex-col rounded-lg border border-border bg-card shadow-xl"
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
        <div className="p-4 space-y-3 flex-1 min-h-0 overflow-y-auto">
          <p className="text-[11px] text-muted-foreground">
            Map styles in your selection to {fontForLang} styles. Fetch loads target styles, Scan finds sources. Use Auto apply to pre-fill matches by size and weight. Decorative text is always skipped.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 text-xs flex-1 min-w-[100px]"
              onClick={() => parent.postMessage({ pluginMessage: { type: 'get-styles-for-font', fontFamily: fontForLang } }, '*')}
              title={`Load ${fontForLang} styles from this file (runs automatically when opened)`}
            >
              Fetch styles
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 text-xs flex-1 min-w-[100px]"
              onClick={() => parent.postMessage({ pluginMessage: { type: 'scan-selection' } }, '*')}
              title="Find source styles in your selection"
            >
              Scan selection
            </Button>
            {canAutoApply && (
              <Button
                size="sm"
                className="h-8 text-xs flex-1 min-w-[100px]"
                onClick={handleAutoApply}
                title="Auto-match source styles to target by size and weight"
              >
                Auto apply
              </Button>
            )}
          </div>
          {sourceStyles.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {sourceStyles.map((src) => {
                const current = langMap[src.key] ?? ''
                return (
                  <div key={src.key} className="flex items-center gap-2">
                    <span className="text-[11px] truncate flex-1 min-w-0" title={src.key}>
                      {src.font} {src.size}px {src.weight}
                      {src.decoration ? ` (${src.decoration.toLowerCase()})` : ''}
                      {src.segmentCount && src.segmentCount > 1 ? ` (${src.segmentCount})` : ''}
                    </span>
                    <Select
                      value={current || '__none__'}
                      onValueChange={(v) => onMappingChange(lang, src.key, v === '__none__' ? '' : v === 'skip' ? 'skip' : v)}
                    >
                      <SelectTrigger className="h-7 text-[11px] w-36"><SelectValue /></SelectTrigger>
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
          ) : (
            <p className="text-[11px] text-muted-foreground">Click &quot;Scan selection&quot; to find styles in your selection.</p>
          )}
        </div>
        <div className="p-4 border-t border-border flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-8" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1 h-8" onClick={() => { onSave(); onClose(); }}>Save mappings</Button>
        </div>
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

function Plugin() {
  const [targetLanguage, setTargetLanguage] = React.useState('gu')
  const [isTranslating, setIsTranslating] = React.useState(false)
  const [status, setStatus] = React.useState<string | null>(null)
  const [assumeEnglish, setAssumeEnglish] = React.useState(true)
  const [weightMappingInfo, setWeightMappingInfo] = React.useState<string[]>([])
  const [showWeightMappings, setShowWeightMappings] = React.useState(false)
  const [bulkLanguages, setBulkLanguages] = React.useState<string[] | null>(null)
  const [showBulkSetup, setShowBulkSetup] = React.useState(false)
  const [bulkSetupSelection, setBulkSetupSelection] = React.useState<string[]>(['hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'pa', 'gu'])

  const [targetFont, setTargetFont] = React.useState('Noto Sans')
  const [isSwapping, setIsSwapping] = React.useState(false)
  const [swapStatus, setSwapStatus] = React.useState<string | null>(null)
  const [applyFontStyles, setApplyFontStyles] = React.useState(false)

  const [fontPrefs, setFontPrefs] = React.useState<Record<string, string>>({})
  const [availableFonts, setAvailableFonts] = React.useState<string[]>([])
  const [fontsLoading, setFontsLoading] = React.useState(false)
  const [fontPickerForLang, setFontPickerForLang] = React.useState<string | null>(null)
  const [fontSwapPicker, setFontSwapPicker] = React.useState<'target' | null>(null)
  const [page, setPage] = React.useState<'translate' | 'fontSwap' | 'fontPrefs'>('translate')
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
            setBulkLanguages(null)
            setBulkSetupSelection(bulkLanguageOptions.map(o => o.value))
          }
          break
        case 'bulk-prefs-saved':
          setBulkLanguages(msg.bulkLanguages || [])
          setShowBulkSetup(false)
          break
        case 'font-list-loaded':
          setAvailableFonts(Array.isArray(msg.fonts) ? msg.fonts : [])
          setFontsLoading(false)
          break
        case 'font-prefs-loaded':
          setFontPrefs(msg.fontPrefs && typeof msg.fontPrefs === 'object' ? msg.fontPrefs : {})
          break
        case 'font-prefs-saved':
          setFontPrefs(msg.fontPrefs && typeof msg.fontPrefs === 'object' ? msg.fontPrefs : {})
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
          setBulkLanguages(null)
          setBulkSetupSelection(bulkLanguageOptions.map(o => o.value))
          setFontPrefs({})
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
    if (!bulkLanguages || bulkLanguages.length === 0) {
      setShowBulkSetup(true)
      return
    }
    setIsTranslating(true)
    setStatus(`Starting bulk translate (${bulkLanguages.length} languages)...`)
    setWeightMappingInfo([])
    setShowWeightMappings(false)
    parent.postMessage({ pluginMessage: {
      type: 'bulk-translate-all', bulkLanguages,
    }}, '*')
  }

  const handleBulkSetupSave = () => {
    if (bulkSetupSelection.length === 0) return
    parent.postMessage({ pluginMessage: { type: 'save-bulk-prefs', bulkLanguages: bulkSetupSelection } }, '*')
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

  return (
    <div className="flex flex-col h-full min-h-0 bg-background font-sans antialiased">
      <div className="flex-1 min-h-0 overflow-y-auto">
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
                    <div className="-mx-5 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                      {isTranslating ? <><Loader2 className="h-4 w-4 animate-spin" /> Translating…</> : 'Translate Selection'}
                    </Button>

                    <Separator className="my-2" />

                    {showBulkSetup ? (
                      <Card className="rounded-lg border border-border bg-card shadow-sm">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Select bulk translate languages</span>
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => setShowBulkSetup(false)}
                            >
                              Cancel
                            </button>
                          </div>
                          <p className="text-[11px] text-muted-foreground">Choose which languages to translate into. Source: English only.</p>
                          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                            {bulkLanguageOptions.map(o => (
                              <label key={o.value} className="flex cursor-pointer items-center gap-2">
                                <Checkbox
                                  checked={bulkSetupSelection.includes(o.value)}
                                  onCheckedChange={() => toggleBulkLang(o.value)}
                                />
                                <span className="text-xs">{o.label}</span>
                              </label>
                            ))}
                          </div>
                          <Button
                            className="w-full h-9 rounded-md text-sm"
                            disabled={bulkSetupSelection.length === 0}
                            onClick={handleBulkSetupSave}
                          >
                            Save & use {bulkSetupSelection.length} language{bulkSetupSelection.length !== 1 ? 's' : ''}
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 h-9 rounded-md text-sm font-medium"
                            disabled={isTranslating}
                            onClick={handleBulkStressTest}
                          >
                            {isTranslating ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : (bulkLanguages && bulkLanguages.length > 0 ? `Bulk Translate (${bulkLanguages.length} languages)` : 'Set up bulk translate')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 rounded-md"
                            disabled={isTranslating}
                            onClick={() => {
                              setBulkSetupSelection(bulkLanguages && bulkLanguages.length > 0 ? bulkLanguages : bulkLanguageOptions.map(o => o.value))
                              setShowBulkSetup(true)
                            }}
                            title="Edit languages"
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {bulkLanguages && bulkLanguages.length > 0
                            ? `Duplicates frames and translates to: ${bulkLanguages.map(c => bulkLanguageOptions.find(o => o.value === c)?.label || c).join(', ')}. Source: English only.`
                            : 'Click to set up your preferred languages, then run. Source: English only.'}
                        </p>
                      </>
                    )}

                    {status && <StatusMessage message={status} />}

                    {showWeightMappings && weightMappingInfo.length > 0 && (
                      <Card className="rounded-lg border border-border bg-card shadow-sm">
                        <CardContent className="p-3">
                          <button className="flex w-full items-center justify-between" onClick={() => setShowWeightMappings(false)}>
                            <span className="text-xs font-medium text-foreground">Weight Mappings ({weightMappingInfo.length})</span>
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <div className="mt-2 max-h-20 overflow-y-auto space-y-1">
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
                        onClick={() => parent.postMessage({ pluginMessage: { type: 'clear-cache' } }, '*')}
                      >
                        Clear translation cache
                      </button>
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
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {languageOptions.map(o => (
                        <div key={o.value} className="flex items-center gap-2">
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
                            className="shrink-0 h-8 w-8 rounded-md border border-input bg-background flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => setStyleMappingModalLang(o.value)}
                            title={`Style mappings for ${o.label}`}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full h-9 rounded-md text-sm"
                      onClick={() => parent.postMessage({ pluginMessage: { type: 'save-font-prefs', fontPrefs } }, '*')}
                    >
                      Save font preferences
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
          }
          setFontPickerForLang(null)
          setFontSwapPicker(null)
        }}
        loading={fontsLoading}
      />
    </div>
  )
}

function loadOutfitFont() {
  if (typeof document === 'undefined') return
  if (document.querySelector('link[data-font="outfit"]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap'
  link.setAttribute('data-font', 'outfit')
  document.head.appendChild(link)
}

export default function (rootNode: HTMLElement, _data: { greeting: string }) {
  loadOutfitFont()
  const root = ReactDOM.createRoot(rootNode)
  root.render(<Plugin />)
}

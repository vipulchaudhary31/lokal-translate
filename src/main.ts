import { showUI } from '@create-figma-plugin/utilities'

export default function () {
  const options = { width: 520, height: 700 }
  const data = { greeting: 'Lokal Translate is ready!' }
  showUI(options, data)
}

// Sarvam AI API configuration
const SARVAM_API_KEY = 'sk_cwbomeig_SMQgMWeXLkfon2hEfR7bnP7Q'
const SARVAM_API_URL = 'https://api.sarvam.ai/translate'
const SARVAM_LANGUAGE_DETECT_URL = 'https://api.sarvam.ai/text-lid'
const SARVAM_TRANSLITERATE_URL = 'https://api.sarvam.ai/transliterate'

// Language mapping for Sarvam API
const LANGUAGE_CODES: Record<string, string> = {
  'en': 'en-IN',
  'hi': 'hi-IN', 
  'ta': 'ta-IN',
  'te': 'te-IN',
  'kn': 'kn-IN',
  'ml': 'ml-IN',
  'mr': 'mr-IN',
  'bn': 'bn-IN',
  'pa': 'pa-IN',
  'gu': 'gu-IN'
}

// Any node with children can contain text - support frames, groups, sections, components, instances,
// component sets, boolean ops, slides, etc. Works for whatever the user selects.
function isContainerNode(node: SceneNode): node is SceneNode & { findAll: (pred?: (n: SceneNode) => boolean) => SceneNode[] } {
  return 'children' in node
}

// Helper to get width for layout (GROUP/SECTION use absoluteBoundingBox; FRAME/COMPONENT/INSTANCE have .width)
function getNodeWidth(node: SceneNode): number {
  if ('width' in node && typeof (node as { width?: number }).width === 'number') {
    return (node as { width: number }).width
  }
  const b = node.absoluteBoundingBox
  return b ? b.width : 0
}

// Helper to describe node location for error messages (frame name + layer name)
function getNodeLocation(node: SceneNode): string {
  let frameName = ''
  let n: BaseNode | null = node.parent
  while (n) {
    if (n.type === 'FRAME' || n.type === 'COMPONENT' || n.type === 'INSTANCE') {
      frameName = n.name || ''
      break
    }
    n = n.parent
  }
  const layerName = node.name || 'text'
  if (frameName) return `"${layerName}" in frame "${frameName}"`
  return `"${layerName}"`
}

// Languages for bulk stress test (English → all Indian languages)
const BULK_LANGUAGES = ['hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'pa', 'gu'] as const
const BULK_LANGUAGE_LABELS: Record<string, string> = {
  'hi': 'Hindi', 'ta': 'Tamil', 'te': 'Telugu', 'kn': 'Kannada',
  'ml': 'Malayalam', 'mr': 'Marathi', 'bn': 'Bengali', 'pa': 'Punjabi', 'gu': 'Gujarati'
}

// Cost optimization: cache TTL 24h, max 800 entries (leave headroom for clientStorage 5MB)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 800
const CACHE_PREFIX = 'ai-translate-v2'
const TRIM_CACHE_EVERY_N_WRITES = 25

function normalizeTextForCache(text: string): string {
  return text
    .replace(/\u00A0/g, ' ')           // non-breaking space → space
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars → remove
    .trim()
    .replace(/\s+/g, ' ')              // collapse whitespace
}

function cacheKey(prefix: string, ...parts: string[]): string {
  return `${CACHE_PREFIX}:${prefix}:${parts.join(':')}`
}

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await figma.clientStorage.getAsync(key)
    if (!raw || typeof raw !== 'object') return null
    const entry = raw as { v: T; t: number }
    if (Date.now() - entry.t > CACHE_TTL_MS) return null
    return entry.v
  } catch { return null }
}

async function setCached(key: string, value: unknown): Promise<void> {
  try {
    await figma.clientStorage.setAsync(key, { v: value, t: Date.now() })
  } catch { /* ignore */ }
}

let _cacheWriteCount = 0
async function trimCacheIfNeeded(): Promise<void> {
  _cacheWriteCount++
  if (_cacheWriteCount % TRIM_CACHE_EVERY_N_WRITES !== 0) return
  try {
    const keys = await figma.clientStorage.keysAsync()
    const ourKeys = keys.filter(k => k.startsWith(CACHE_PREFIX + ':'))
    if (ourKeys.length <= CACHE_MAX_ENTRIES) return
    ourKeys.sort()
    const toDelete = ourKeys.slice(0, ourKeys.length - CACHE_MAX_ENTRIES)
    for (const k of toDelete) await figma.clientStorage.deleteAsync(k)
  } catch { /* ignore */ }
}



// Font mapping for different languages - using UI variants for regional scripts
const LANGUAGE_FONTS = {
  'hi': 'Noto Sans Devanagari UI', // Hindi
  'mr': 'Noto Sans Devanagari UI', // Marathi  
  'bn': 'Noto Sans Bengali UI',    // Bengali
  'gu': 'Noto Sans Gujarati UI',   // Gujarati
  'pa': 'Noto Sans Gurmukhi UI',   // Punjabi
  'ta': 'Noto Sans Tamil UI',      // Tamil
  'te': 'Kohinoor Telugu',         // Telugu (special case)
  'kn': 'Noto Sans Kannada UI',    // Kannada
  'ml': 'Noto Sans Malayalam UI',  // Malayalam
  'en': 'Inter'                    // English/Latin
}

// Font prefs cache (loaded at start of translate, updated on save)
let fontPrefsCache: Record<string, string> | null = null
const FONT_PREFS_KEY = 'ai-translate-font-prefs'

async function loadFontPrefs(): Promise<Record<string, string>> {
  try {
    const saved = await figma.clientStorage.getAsync(FONT_PREFS_KEY)
    const prefs = saved && typeof saved === 'object' ? (saved as Record<string, string>) : {}
    fontPrefsCache = prefs
    return prefs
  } catch {
    fontPrefsCache = {}
    return {}
  }
}

function getFontForLanguage(languageCode: string): string {
  if (fontPrefsCache && fontPrefsCache[languageCode]) return fontPrefsCache[languageCode]
  return LANGUAGE_FONTS[languageCode as keyof typeof LANGUAGE_FONTS] || 'Noto Sans'
}

const STYLE_MAPPINGS_KEY = 'ai-translate-style-mappings'

type StyleMappingsByLang = Record<string, Record<string, string>> // lang -> { sourceKey: styleId | 'skip' }
let styleMappingsCache: StyleMappingsByLang | null = null

function sourceStyleKey(font: string, size: number, lineHeight: number | null, weight: string): string {
  return `${font}|${size}|${lineHeight ?? 'auto'}|${weight}`
}

function getSourceStyleFromNode(node: TextNode): { font: string; size: number; lh: number | null; weight: string } | null {
  const fn = node.fontName
  if (fn === figma.mixed || !fn || typeof fn !== 'object') return null
  const font = (fn as FontName).family
  const weight = (fn as FontName).style || 'Regular'
  const fs = node.fontSize
  if (fs === figma.mixed || typeof fs !== 'number') return null
  let lh: number | null = null
  const lhVal = node.lineHeight
  if (lhVal !== figma.mixed && lhVal && typeof lhVal === 'object' && 'value' in lhVal && lhVal.unit === 'PIXELS') {
    lh = (lhVal as { value: number }).value
  }
  return { font, size: fs, lh, weight }
}

/** Get source styles from a node – uses segments when node has mixed styling. Key excludes decoration (used for mapping). */
function getSourceStylesFromNode(
  node: TextNode
): Array<{ key: string; font: string; size: number; lh: number | null; weight: string; decoration?: string; segmentCount?: number }> {
  const fn = node.fontName
  const fs = node.fontSize
  const hasMixed = fn === figma.mixed || fs === figma.mixed
  if (hasMixed) {
    const segs = node.getStyledTextSegments(['fontName', 'fontSize', 'lineHeight', 'textDecoration'])
    const byKey = new Map<string, { font: string; size: number; lh: number | null; weight: string; decoration?: string; count: number }>()
    for (const seg of segs) {
      const sfn = seg.fontName
      if (!sfn || typeof sfn !== 'object' || !('family' in sfn)) continue
      const font = (sfn as FontName).family
      const weight = (sfn as FontName).style || 'Regular'
      const segFs = seg.fontSize
      const size = typeof segFs === 'number' ? segFs : 0
      let lh: number | null = null
      const lhVal = seg.lineHeight
      if (lhVal && typeof lhVal === 'object' && 'value' in lhVal && (lhVal as { unit?: string }).unit === 'PIXELS') {
        lh = (lhVal as { value: number }).value
      }
      const deco = typeof seg.textDecoration === 'string' && seg.textDecoration !== 'NONE' ? seg.textDecoration : undefined
      const key = sourceStyleKey(font, size, lh, weight)
      const existing = byKey.get(key)
      if (existing) {
        existing.count++
        if (deco && !existing.decoration) existing.decoration = deco
      } else byKey.set(key, { font, size, lh, weight, decoration: deco, count: 1 })
    }
    return Array.from(byKey.entries()).map(([, v]) => ({
      key: sourceStyleKey(v.font, v.size, v.lh, v.weight),
      font: v.font,
      size: v.size,
      lh: v.lh,
      weight: v.weight,
      decoration: v.decoration,
      segmentCount: v.count
    }))
  }
  const single = getSourceStyleFromNode(node)
  return single ? [{ key: sourceStyleKey(single.font, single.size, single.lh, single.weight), ...single }] : []
}

function hasTextDecoration(node: TextNode): boolean {
  const len = node.characters.length
  if (len === 0) return false
  const segs = node.getStyledTextSegments(['textDecoration'])
  return segs.some(s => s.textDecoration !== 'NONE')
}

async function loadStyleMappings(): Promise<StyleMappingsByLang> {
  if (styleMappingsCache) return styleMappingsCache
  try {
    const saved = await figma.clientStorage.getAsync(STYLE_MAPPINGS_KEY)
    styleMappingsCache = (saved && typeof saved === 'object') ? (saved as StyleMappingsByLang) : {}
    return styleMappingsCache!
  } catch {
    styleMappingsCache = {}
    return {}
  }
}

// Force reload from storage (e.g. before translate to ensure latest mappings)
async function reloadStyleMappings(): Promise<StyleMappingsByLang> {
  styleMappingsCache = null
  return loadStyleMappings()
}

type SourceStyle = { font: string; size: number; lh: number | null; weight: string }

// Decoration to re-apply after setting style (setTextStyleIdAsync clears it)
type DecorationRange = { start: number; end: number; decoration: 'UNDERLINE' | 'STRIKETHROUGH'; style?: unknown; offset?: unknown; thickness?: unknown; color?: unknown }

function getDecorationRanges(node: TextNode): DecorationRange[] {
  const DECO_FIELDS = ['textDecoration', 'textDecorationStyle', 'textDecorationOffset', 'textDecorationThickness', 'textDecorationColor'] as const
  const segs = node.getStyledTextSegments([...DECO_FIELDS])
  const out: DecorationRange[] = []
  let runStart = 0
  for (const seg of segs) {
    const runEnd = runStart + seg.characters.length
    const deco = seg.textDecoration
    if (typeof deco === 'string' && deco !== 'NONE') {
      out.push({
        start: runStart,
        end: runEnd,
        decoration: deco as 'UNDERLINE' | 'STRIKETHROUGH',
        style: seg.textDecorationStyle,
        offset: seg.textDecorationOffset,
        thickness: seg.textDecorationThickness,
        color: seg.textDecorationColor
      })
    }
    runStart = runEnd
  }
  return out
}

function reapplyDecorations(node: TextNode, ranges: DecorationRange[]): void {
  for (const r of ranges) {
    if (r.end <= r.start) continue
    try {
      node.setRangeTextDecoration(r.start, r.end, r.decoration)
      if (r.style != null && typeof r.style === 'string') {
        node.setRangeTextDecorationStyle(r.start, r.end, r.style as 'SOLID' | 'WAVY' | 'DOTTED')
      }
      if (r.offset != null && typeof r.offset === 'object') {
        node.setRangeTextDecorationOffset(r.start, r.end, r.offset as Parameters<TextNode['setRangeTextDecorationOffset']>[2])
      }
      if (r.thickness != null && typeof r.thickness === 'object') {
        node.setRangeTextDecorationThickness(r.start, r.end, r.thickness as Parameters<TextNode['setRangeTextDecorationThickness']>[2])
      }
      if (r.color != null && typeof r.color === 'object') {
        node.setRangeTextDecorationColor(r.start, r.end, r.color as Parameters<TextNode['setRangeTextDecorationColor']>[2])
      }
    } catch (e) {
      console.warn('[Apply styles] Failed to re-apply decoration', r, e)
    }
  }
}

// Apply style using user-defined mappings. For underlined/strikethrough text, apply style then re-apply decoration on top.
// sourceOverride: use this for mapping lookup when the node was already modified (e.g. by translateWithStyledSegments)
async function applyUserDefinedStyleMapping(
  textNode: TextNode,
  targetLanguage: string,
  sourceOverride?: SourceStyle | null
): Promise<boolean> {
  try {
    const decorationRanges = getDecorationRanges(textNode)
    const src = sourceOverride ?? getSourceStyleFromNode(textNode)
    if (!src) {
      console.log('[Apply styles] Skip: could not get source style from node')
      return false
    }
    const mappings = await loadStyleMappings()
    const langMap = mappings[targetLanguage]
    if (!langMap) {
      console.log('[Apply styles] No mappings for language:', targetLanguage)
      return false
    }
    const key = sourceStyleKey(src.font, src.size, src.lh, src.weight)
    let target = langMap[key]
    // Fallback 1: try with 'auto' line height (handles pixel vs auto mismatch)
    if (!target && src.lh != null) {
      target = langMap[sourceStyleKey(src.font, src.size, null, src.weight)]
    }
    // Fallback 2: match by font+weight only; prefer closest fontSize (target style supplies its own size/lineHeight)
    if (!target) {
      let bestKey: string | null = null
      let bestSizeDiff = Infinity
      for (const storedKey of Object.keys(langMap)) {
        const parts = storedKey.split('|')
        if (parts.length >= 4 && parts[0] === src.font && parts[3] === src.weight) {
          const storedSize = parseInt(parts[1], 10)
          const sizeDiff = isNaN(storedSize) ? 0 : Math.abs(storedSize - src.size)
          if (sizeDiff < bestSizeDiff) {
            bestSizeDiff = sizeDiff
            bestKey = storedKey
          }
        }
      }
      if (bestKey) target = langMap[bestKey]
      if (target) console.log('[Apply styles] Using font+weight match:', bestKey, '→', target)
    }
    if (!target) {
      console.log('[Apply styles] No mapping for key:', key, 'available keys:', Object.keys(langMap))
      return false
    }
    if (target === 'skip') {
      console.log('[Apply styles] Mapping is skip for:', key)
      return false
    }
    // Try local styles first, then getStyleByIdAsync (works for library styles in doc)
    let style: TextStyle | null = null
    const localStyles = figma.getLocalTextStyles()
    style = localStyles.find(s => s.id === target) ?? null
    if (!style) {
      try {
        const byId = await figma.getStyleByIdAsync(target)
        if (byId && byId.type === 'TEXT') style = byId as TextStyle
      } catch { /* library styles may not be resolvable by ID in some contexts */ }
    }
    if (!style) {
      console.warn('[Apply styles] Style not found (local or library):', target)
      return false
    }
    try {
      const fn = style.fontName as FontName
      await figma.loadFontAsync(fn)
      await textNode.setTextStyleIdAsync(style.id)
      if (decorationRanges.length > 0) reapplyDecorations(textNode, decorationRanges)
      console.log('[Apply styles] Applied user mapping:', style.name)
      return true
    } catch (e) {
      console.warn('[Apply styles] Failed to apply', style.name, e)
      return false
    }
  } catch (e) {
    console.warn('applyUserDefinedStyleMapping error:', e)
    return false
  }
}

// Load all fonts used in a text node (required before modifying – supports mixed fonts/styles)
async function loadAllFontsForTextNode(node: TextNode): Promise<void> {
  const len = node.characters.length
  if (len === 0) {
    const fn = node.fontName
    if (fn !== figma.mixed && fn && typeof fn === 'object' && 'family' in fn) {
      await figma.loadFontAsync(fn as FontName)
    }
    return
  }
  const fonts = node.getRangeAllFontNames(0, len)
  await Promise.all(fonts.map(f => figma.loadFontAsync(f)))
}

// Function to load font before using it
async function loadFont(fontName: string, textNode: TextNode): Promise<void> {
  try {
    console.log(`Loading font: ${fontName}`)
    
    // Get current font properties to preserve weight and style
    const currentFont = textNode.fontName as FontName
    
    const weightVariants = getWeightStyleNamesToTry(currentFont.style)
    for (const weight of weightVariants) {
      try {
        const fontToLoad: FontName = { 
          family: fontName, 
          style: weight || 'Regular'
        }
        await figma.loadFontAsync(fontToLoad)
        console.log(`Successfully loaded: ${fontName} ${weight}`)
        return // Success, exit function
      } catch (weightError) {
        console.log(`Font weight ${weight} not available for ${fontName}`)
        continue
      }
    }
    
    // If all weights failed, fall back to Noto Sans with weight mapping
    console.warn(`Could not load any variant of ${fontName}, using Noto Sans`)
    const weightOpts = getWeightStyleNamesToTry(currentFont.style)
    for (const w of weightOpts) {
      try {
        await figma.loadFontAsync({ family: 'Noto Sans', style: w || 'Regular' })
        return
      } catch { continue }
    }
    await figma.loadFontAsync({ family: 'Noto Sans', style: 'Regular' })
    
  } catch (error) {
    console.error(`Error loading font ${fontName}:`, error)
    const wOpts = getWeightStyleNamesToTry((textNode.fontName as FontName).style)
    for (const w of wOpts) {
      try {
        await figma.loadFontAsync({ family: 'Noto Sans', style: w || 'Regular' })
        return
      } catch { continue }
    }
    await figma.loadFontAsync({ family: 'Noto Sans', style: 'Regular' })
  }
}

// Numeric weight (100-900) mapping. Same weight, different names (Semi Bold vs SemiBold) = no user message.
const WEIGHT_STYLE_VARIANTS: Record<number, string[]> = {
  100: ['Thin', 'Hairline', '100'],
  200: ['ExtraLight', 'UltraLight', 'Extra Light', 'Ultra Light', '200'],
  300: ['Light', '300'],
  400: ['Regular', 'Normal', '400', ''],
  500: ['Medium', '500'],
  600: ['SemiBold', 'Semibold', 'Semi Bold', 'Semi-Bold', 'DemiBold', 'Demi Bold', 'Demi-Bold', '600'],
  700: ['Bold', '700'],
  800: ['ExtraBold', 'Extra Bold', 'UltraBold', 'Ultra Bold', '800'],
  900: ['Black', 'Heavy', '900'],
}

function styleNameToWeight(style: string): number {
  const s = (style || '').toLowerCase()
  if (s.includes('thin') || s.includes('hairline') || s.includes('100')) return 100
  if (s.includes('extralight') || s.includes('ultralight') || s.includes('200')) return 200
  if (s.includes('light') || s.includes('300')) return 300
  if (s.includes('regular') || s.includes('normal') || s.includes('400') || !s) return 400
  if (s.includes('medium') || s.includes('500')) return 500
  if (s.includes('semibold') || s.includes('semi-bold') || s.includes('semi bold') || s.includes('demibold') || s.includes('600')) return 600
  if (s.includes('bold') || s.includes('700')) return 700
  if (s.includes('extrabold') || s.includes('ultrabold') || s.includes('800')) return 800
  if (s.includes('heavy') || s.includes('black') || s.includes('900')) return 900
  return 400
}

/** Weights to try in order of distance from target (closest first). When equidistant, prefer higher weight (e.g. 700 over 500 for target 600). */
function getWeightsByProximity(approx: number): number[] {
  const all = [100, 200, 300, 400, 500, 600, 700, 800, 900]
  return all.sort((a, b) => {
    const dA = Math.abs(a - approx)
    const dB = Math.abs(b - approx)
    if (dA !== dB) return dA - dB
    return b - a
  })
}

/** Style names to try: exact match first, then by numeric weight with closest fallbacks */
function getWeightStyleNamesToTry(originalStyle: string): string[] {
  const approx = styleNameToWeight(originalStyle)
  const variants = WEIGHT_STYLE_VARIANTS[approx] ?? WEIGHT_STYLE_VARIANTS[400]
  const exactFirst = [originalStyle, originalStyle.trim()].filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of [...exactFirst, ...variants]) {
    if (name && !seen.has(name)) { seen.add(name); out.push(name) }
  }
  for (const w of getWeightsByProximity(approx)) {
    if (w === approx) continue
    for (const name of (WEIGHT_STYLE_VARIANTS[w] ?? [])) {
      if (name && !seen.has(name)) { seen.add(name); out.push(name) }
    }
  }
  return out
}

// Get target FontName for a range (language + weight), or null if failed
async function getTargetFontForRange(
  targetLanguage: string,
  originalWeight: string
): Promise<FontName | null> {
  const newFontFamily = getFontForLanguage(targetLanguage)
  const styleNames = getWeightStyleNamesToTry(originalWeight)
  for (const style of styleNames) {
    try {
      const fn: FontName = { family: newFontFamily, style: style || 'Regular' }
      await figma.loadFontAsync(fn)
      return fn
    } catch { continue }
  }
  const defaultFamily = LANGUAGE_FONTS[targetLanguage as keyof typeof LANGUAGE_FONTS] || 'Noto Sans'
  const fallbackStyles = getWeightStyleNamesToTry(originalWeight)
  for (const s of fallbackStyles) {
    try {
      const fn: FontName = { family: defaultFamily !== newFontFamily ? defaultFamily : 'Noto Sans', style: s || 'Regular' }
      await figma.loadFontAsync(fn)
      return fn
    } catch { continue }
  }
  try {
    const fn: FontName = { family: 'Noto Sans', style: 'Regular' }
    await figma.loadFontAsync(fn)
    return fn
  } catch {
    return null
  }
}

// Style fields to preserve during translation – all Figma text properties that have setRange* setters
const STYLE_FIELDS = [
  'fontName', 'textDecoration', 'textDecorationStyle', 'textDecorationOffset', 'textDecorationThickness',
  'textDecorationColor', 'textDecorationSkipInk', 'fills', 'fillStyleId', 'fontSize', 'lineHeight',
  'letterSpacing', 'textCase', 'listOptions', 'listSpacing', 'indentation', 'paragraphIndent',
  'paragraphSpacing', 'hyperlink'
] as const

type SegmentStyle = {
  fontName?: unknown
  textDecoration?: unknown
  textDecorationStyle?: unknown
  textDecorationOffset?: unknown
  textDecorationThickness?: unknown
  textDecorationColor?: unknown
  textDecorationSkipInk?: unknown
  fills?: unknown
  fillStyleId?: unknown
  fontSize?: unknown
  lineHeight?: unknown
  letterSpacing?: unknown
  textCase?: unknown
  listOptions?: unknown
  listSpacing?: unknown
  indentation?: unknown
  paragraphIndent?: unknown
  paragraphSpacing?: unknown
  hyperlink?: unknown
}

async function applySegmentStylesToRange(
  node: TextNode,
  start: number,
  end: number,
  seg: SegmentStyle,
  targetFont: FontName | null
): Promise<void> {
  if (end <= start) return
  try {
    if (targetFont) node.setRangeFontName(start, end, targetFont)
    if (seg.textDecoration && seg.textDecoration !== figma.mixed && typeof seg.textDecoration === 'string') {
      node.setRangeTextDecoration(start, end, seg.textDecoration as 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH')
    }
    if (seg.textDecorationStyle != null && seg.textDecorationStyle !== figma.mixed) {
      node.setRangeTextDecorationStyle(start, end, seg.textDecorationStyle as 'SOLID' | 'WAVY' | 'DOTTED')
    }
    if (seg.textDecorationOffset != null && seg.textDecorationOffset !== figma.mixed && typeof seg.textDecorationOffset === 'object') {
      node.setRangeTextDecorationOffset(start, end, seg.textDecorationOffset as Parameters<TextNode['setRangeTextDecorationOffset']>[2])
    }
    if (seg.textDecorationThickness != null && seg.textDecorationThickness !== figma.mixed && typeof seg.textDecorationThickness === 'object') {
      node.setRangeTextDecorationThickness(start, end, seg.textDecorationThickness as Parameters<TextNode['setRangeTextDecorationThickness']>[2])
    }
    if (seg.textDecorationColor != null && seg.textDecorationColor !== figma.mixed && typeof seg.textDecorationColor === 'object') {
      node.setRangeTextDecorationColor(start, end, seg.textDecorationColor as Parameters<TextNode['setRangeTextDecorationColor']>[2])
    }
    if (seg.textDecorationSkipInk != null && seg.textDecorationSkipInk !== figma.mixed && typeof seg.textDecorationSkipInk === 'boolean') {
      node.setRangeTextDecorationSkipInk(start, end, seg.textDecorationSkipInk)
    }
    // Use fillStyleId when linked to a style, otherwise use raw fills
    if (seg.fillStyleId != null && seg.fillStyleId !== figma.mixed && typeof seg.fillStyleId === 'string' && seg.fillStyleId.length > 0) {
      await node.setRangeFillStyleIdAsync(start, end, seg.fillStyleId)
    } else if (seg.fills != null && seg.fills !== figma.mixed && Array.isArray(seg.fills) && seg.fills.length > 0) {
      node.setRangeFills(start, end, seg.fills as Paint[])
    }
    if (seg.fontSize != null && seg.fontSize !== figma.mixed && typeof seg.fontSize === 'number') {
      node.setRangeFontSize(start, end, seg.fontSize)
    }
    if (seg.lineHeight != null && seg.lineHeight !== figma.mixed && typeof seg.lineHeight === 'object') {
      node.setRangeLineHeight(start, end, seg.lineHeight as Parameters<TextNode['setRangeLineHeight']>[2])
    }
    if (seg.letterSpacing != null && seg.letterSpacing !== figma.mixed && typeof seg.letterSpacing === 'object') {
      node.setRangeLetterSpacing(start, end, seg.letterSpacing as Parameters<TextNode['setRangeLetterSpacing']>[2])
    }
    if (seg.textCase != null && seg.textCase !== figma.mixed && typeof seg.textCase === 'string') {
      node.setRangeTextCase(start, end, seg.textCase as 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS' | 'SMALL_CAPS_FORCED')
    }
    if (seg.listOptions != null && seg.listOptions !== figma.mixed && typeof seg.listOptions === 'object') {
      const lo = seg.listOptions as { type?: string }
      if (lo.type === 'ORDERED' || lo.type === 'UNORDERED' || lo.type === 'NONE') {
        node.setRangeListOptions(start, end, seg.listOptions as Parameters<TextNode['setRangeListOptions']>[2])
      }
    }
    if (seg.listSpacing != null && seg.listSpacing !== figma.mixed && typeof seg.listSpacing === 'number') {
      node.setRangeListSpacing(start, end, seg.listSpacing)
    }
    if (seg.indentation != null && seg.indentation !== figma.mixed && typeof seg.indentation === 'number') {
      node.setRangeIndentation(start, end, seg.indentation)
    }
    if (seg.paragraphIndent != null && seg.paragraphIndent !== figma.mixed && typeof seg.paragraphIndent === 'number') {
      node.setRangeParagraphIndent(start, end, seg.paragraphIndent)
    }
    if (seg.paragraphSpacing != null && seg.paragraphSpacing !== figma.mixed && typeof seg.paragraphSpacing === 'number') {
      node.setRangeParagraphSpacing(start, end, seg.paragraphSpacing)
    }
    if (seg.hyperlink !== undefined && seg.hyperlink !== figma.mixed) {
      node.setRangeHyperlink(start, end, seg.hyperlink as { type: 'URL' | 'NODE'; value: string } | null)
    }
  } catch (e) {
    console.warn('applySegmentStylesToRange failed', start, end, e)
  }
}

// Translate text node with mixed styles – preserves all original properties (font weight, strikethrough, fills, etc.)
async function translateWithStyledSegments(
  node: TextNode,
  targetLanguage: string,
  sourceLanguage: string | undefined,
  session: SessionCache
): Promise<{ success: boolean; weightMappings: string[] }> {
  const segments = node.getStyledTextSegments([...STYLE_FIELDS])
  if (segments.length === 0) return { success: false, weightMappings: [] }
  const targetLang = targetLanguage
  const translatedParts: string[] = []
  for (const seg of segments) {
    const t = seg.characters.trim().length > 0
      ? await translateText(seg.characters, targetLang, sourceLanguage, session)
      : seg.characters
    if (!t) return { success: false, weightMappings: [] }
    translatedParts.push(t)
  }
  const fullText = translatedParts.join('')
  // If segment-wise translation results in exactly the same text, treat this as a
  // non-success so that callers can fall back to whole-text translation and surface
  // a clear message instead of silently doing nothing.
  if (fullText === node.characters) {
    console.log('translateWithStyledSegments: no text change after segment translation, will fall back to whole-text translate.')
    return { success: false, weightMappings: [] }
  }
  const weightMappings: string[] = []
  const firstWeight = (segments[0].fontName as FontName)?.style || 'Regular'
  const firstTarget = await getTargetFontForRange(targetLang, firstWeight)
  if (firstTarget) {
    await figma.loadFontAsync(firstTarget)
    node.fontName = firstTarget
  }
  node.characters = fullText
  let runStart = 0
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const part = translatedParts[i]
    const runEnd = runStart + part.length
    if (part.length > 0) {
      const originalWeight = (seg.fontName as FontName)?.style || 'Regular'
      const targetFont = await getTargetFontForRange(targetLang, originalWeight)
      await applySegmentStylesToRange(node, runStart, runEnd, seg as SegmentStyle, targetFont)
      if (targetFont && styleNameToWeight(originalWeight) !== styleNameToWeight(targetFont.style)) {
        weightMappings.push(`"${seg.characters.substring(0, 20)}...": ${originalWeight} → ${targetFont.style}`)
      }
    }
    runStart = runEnd
  }
  return { success: true, weightMappings }
}

// Function to apply font to text node while preserving original weight
async function applyFontToTextNode(textNode: TextNode, targetLanguage: string): Promise<{success: boolean, mappingUsed?: string, originalWeight?: string}> {
  const newFontFamily = getFontForLanguage(targetLanguage)
  // Handle mixed fonts (strikethrough, underline, etc.) – use first char's font for weight
  let currentFont: FontName
  if (textNode.fontName === figma.mixed || !textNode.fontName) {
    const len = textNode.characters.length
    if (len > 0) {
      const rangeFont = textNode.getRangeFontName(0, 1)
      currentFont = rangeFont !== figma.mixed && rangeFont ? (rangeFont as FontName) : { family: 'Noto Sans', style: 'Regular' }
    } else {
      currentFont = { family: 'Noto Sans', style: 'Regular' }
    }
  } else {
    currentFont = textNode.fontName as FontName
  }
  
  // Only change font if it's different
  if (currentFont.family === newFontFamily) {
    console.log(`Font already correct: ${newFontFamily}`)
    return {success: true}
  }
  
  console.log(`Changing font from "${currentFont.family} ${currentFont.style}" to "${newFontFamily}"`)
  
  const originalWeight = currentFont.style
  const originalNumeric = styleNameToWeight(originalWeight)
  
  try {
    const styleNames = getWeightStyleNamesToTry(originalWeight)
    let fontApplied = false
    let appliedStyle = ''
    
    for (const style of styleNames) {
      try {
        const targetFont: FontName = { family: newFontFamily, style: style || 'Regular' }
        await figma.loadFontAsync(targetFont)
        textNode.fontName = targetFont
        appliedStyle = style || 'Regular'
        fontApplied = true
        break
      } catch { continue }
    }
    
    if (!fontApplied) {
      const defaultForLang = LANGUAGE_FONTS[targetLanguage as keyof typeof LANGUAGE_FONTS] || 'Noto Sans'
      const fallbackFamilies = defaultForLang !== newFontFamily ? [defaultForLang, 'Noto Sans'] : ['Noto Sans']
      for (const family of fallbackFamilies) {
        for (const style of styleNames) {
          try {
            const fallbackFont: FontName = { family, style: style || 'Regular' }
            await figma.loadFontAsync(fallbackFont)
            textNode.fontName = fallbackFont
            return {
              success: true,
              mappingUsed: `${originalWeight} → ${family} ${style || 'Regular'} (fallback)`,
              originalWeight
            }
          } catch { continue }
        }
      }
      const lastResort: FontName = { family: 'Noto Sans', style: 'Regular' }
      await figma.loadFontAsync(lastResort)
      textNode.fontName = lastResort
      return {
        success: true,
        mappingUsed: `${originalWeight} → Noto Sans Regular (fallback)`,
        originalWeight
      }
    }
    
    // Only report mapping when numeric weight changed (e.g. Bold→SemiBold), not when just name variant (Semi Bold→SemiBold)
    const appliedNumeric = styleNameToWeight(appliedStyle)
    const mappingUsed = originalNumeric !== appliedNumeric ? `${originalWeight} → ${appliedStyle}` : undefined
    
    return {
      success: true,
      mappingUsed,
      originalWeight
    }
    
  } catch (error) {
    console.error(`Failed to apply font for ${targetLanguage}:`, error)
    return {success: false, originalWeight}
  }
}

// Clean up translation responses. Formal mode returns clean text; handle rare wrapper responses.
function cleanupTranslation(translation: string): string {
  const cleaned = translation.trim()
  if (!cleaned) return cleaned
  // Extract from wrapper if present: "The translation of X is: 'Y'" or "The translation is: Y"
  const match = cleaned.match(/The translation of.*?is:\s*[""']?([^""'\n]+)[""']?/i)
    || cleaned.match(/The translation.*?is:\s*[""']?([^""'\n.]+)[""']?/i)
  return match ? match[1].trim() : cleaned
}

// Session cache for current run (avoids redundant API/storage calls for repeated texts)
const RATE_LIMIT_MS = 50
type SessionCache = {
  lid: Map<string, string>; tr: Map<string, string>; tl: Map<string, string>;
  lastApiTime?: number;
}
function createSessionCache(): SessionCache {
  return { lid: new Map(), tr: new Map(), tl: new Map(), lastApiTime: 0 }
}
async function rateLimitBeforeApiCall(session?: SessionCache): Promise<void> {
  if (!session) return
  const now = Date.now()
  const elapsed = now - (session.lastApiTime ?? 0)
  if (elapsed < RATE_LIMIT_MS) await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed))
  session.lastApiTime = Date.now()
}

// Check if text is predominantly in an Indic script (Telugu, Hindi, etc.). Latin/ASCII text returns false.
const INDIC_SCRIPT_RANGES = [
  [0x0900, 0x097F],  // Devanagari (Hindi, Marathi)
  [0x0980, 0x09FF],  // Bengali
  [0x0A00, 0x0A7F],  // Gurmukhi (Punjabi)
  [0x0A80, 0x0AFF],  // Gujarati
  [0x0B00, 0x0B7F],  // Oriya
  [0x0B80, 0x0BFF],  // Tamil
  [0x0C00, 0x0C7F],  // Telugu
  [0x0C80, 0x0CFF],  // Kannada
  [0x0D00, 0x0D7F],  // Malayalam
]
function isInIndicScript(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    for (const [lo, hi] of INDIC_SCRIPT_RANGES) {
      if (c >= lo && c <= hi) return true
    }
  }
  return false
}

// Function to detect language using Sarvam AI Language Detection API
async function detectLanguage(text: string, session?: SessionCache): Promise<string> {
  try {
    const cleanText = text.trim()
    if (!cleanText || cleanText.length === 0) return 'en'
    const norm = normalizeTextForCache(cleanText.substring(0, 500))
    if (session?.lid) {
      const hit = session.lid.get(norm)
      if (hit != null) return hit
    }
    const key = cacheKey('lid', norm)
    const cached = await getCached<string>(key)
    if (cached != null) {
      session?.lid?.set(norm, cached)
      console.log(`LID cache hit: "${norm.substring(0, 30)}..." → ${cached}`)
      return cached
    }

    const requestBody = { input: cleanText.substring(0, 500) }
    console.log('Language detection request:', cleanText.substring(0, 50) + '...')
    await rateLimitBeforeApiCall(session)

    const response = await fetchWithTimeout(SARVAM_LANGUAGE_DETECT_URL, {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      console.error('Language detection API error:', response.status)
      return 'en' // Default to English on error
    }

    const data = await response.json()
    const detectedLanguage = data.language_code || 'en'
    
    // Map Sarvam language codes to our internal codes
    const languageMapping: Record<string, string> = {
      'en-IN': 'en',
      'hi-IN': 'hi',
      'ta-IN': 'ta',
      'te-IN': 'te',
      'kn-IN': 'kn',
      'ml-IN': 'ml',
      'mr-IN': 'mr',
      'bn-IN': 'bn',
      'pa-IN': 'pa',
      'gu-IN': 'gu'
    }
    
    const mappedLanguage = languageMapping[detectedLanguage] || 'en'
    console.log(`Language detected: ${detectedLanguage} → ${mappedLanguage}`)
    session?.lid?.set(norm, mappedLanguage)
    await setCached(key, mappedLanguage)
    await trimCacheIfNeeded()
    return mappedLanguage
  } catch (error) {
    console.error('Language detection error:', error)
    return 'en' // Default to English on error
  }
}

// Function to check if a node or any of its parents should be excluded from translation (DND)
// Only checks ancestors within the selection boundary (up to root). External "dnd" containers
// above the selected frame should NOT mark internal content as DND - user explicitly selected it.
function isDndNode(node: SceneNode, root?: SceneNode | null): boolean {
  let currentNode: BaseNode | null = node

  while (currentNode && currentNode.type !== 'PAGE') {
    if (root != null && currentNode === root) break // Stop at selection boundary
    if ('name' in currentNode && currentNode.name.toLowerCase() === 'dnd') {
      console.log(`DND detected: "${node.name}" is inside DND container "${currentNode.name}"`)
      return true
    }
    currentNode = currentNode.parent
  }
  if (currentNode === root && root && 'name' in root && root.name.toLowerCase() === 'dnd') return true
  return false
}

// Function to check if a node is inside a "hing" container (transliteration case)
// Only checks ancestors within the selection boundary (up to root). External "hing" containers
// above the selected frame should NOT affect internal content when user explicitly selected it.
function isHingNode(node: SceneNode, root?: SceneNode | null): boolean {
  let currentNode: BaseNode | null = node

  while (currentNode && currentNode.type !== 'PAGE') {
    if (root != null && currentNode === root) break // Stop at selection boundary
    if ('name' in currentNode && currentNode.name.toLowerCase() === 'hing') {
      console.log(`Hing detected: "${node.name}" is inside hing container "${currentNode.name}"`)
      return true
    }
    currentNode = currentNode.parent
  }
  if (currentNode === root && root && 'name' in root && root.name.toLowerCase() === 'hing') return true
  return false
}

// Function to check if a node is inside an "lma" container (hard opt-out)
// This intentionally ignores selection boundaries: if any ancestor is named "lma",
// nothing should happen to nested text, even when explicitly selected.
function isLmaNode(node: SceneNode): boolean {
  let currentNode: BaseNode | null = node

  while (currentNode && currentNode.type !== 'PAGE') {
    if ('name' in currentNode && currentNode.name.toLowerCase() === 'lma') {
      console.log(`LMA detected: "${node.name}" is inside LMA container "${currentNode.name}"`)
      return true
    }
    currentNode = currentNode.parent
  }
  return false
}

// Function to check if a frame should be excluded from translation (DND)
function isDndFrame(frame: FrameNode): boolean {
  return isDndNode(frame)
}

// Collect text nodes with path from root (child indices) for deterministic matching across clones
function collectTextNodesWithPath(root: SceneNode, path: number[]): Array<{path: number[], text: string, node: TextNode}> {
  const out: Array<{path: number[], text: string, node: TextNode}> = []
  if (root.type === 'TEXT') {
    const t = (root as TextNode).characters.trim()
    if (t.length > 0) out.push({ path: [...path], text: (root as TextNode).characters, node: root as TextNode })
    return out
  }
  if ('children' in root) {
    (root.children as SceneNode[]).forEach((child, i) => {
      out.push(...collectTextNodesWithPath(child, [...path, i]))
    })
  }
  return out
}

const API_TIMEOUT_MS = 30000

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timed out. The API took too long to respond. Try again.')), API_TIMEOUT_MS)
  })
  return Promise.race([fetch(url, options), timeoutPromise])
}

// Parse Sarvam API error response body
function parseSarvamErrorBody(responseText: string, status: number): string {
  try {
    const data = JSON.parse(responseText)
    const msg = data?.error?.message || data?.message
    if (msg && typeof msg === 'string') return msg
  } catch { /* ignore parse */ }
  if (status === 400) return 'Bad request. Check input text and language settings.'
  if (status === 403) return 'API key invalid or expired. Check your Sarvam API key.'
  if (status === 422) return 'Text too long or unsupported language. Check API limits.'
  if (status === 429) return 'Rate limit exceeded. Wait a minute and try again.'
  if (status >= 500) return 'Sarvam API server error. Try again later.'
  return `API error (${status}).`
}

// Parse API errors into user-friendly messages
function getApiErrorMessage(error: unknown, apiName: string): string {
  if (error instanceof Error) {
    const msg = error.message
    if (msg.includes('timed out')) return msg
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed') || msg.includes('Network request failed')) {
      return 'Network error: Cannot reach Sarvam API. Check your internet connection and firewall.'
    }
    if (msg.includes('invalid_api_key') || msg.includes('403') || msg.includes('Forbidden')) {
      return 'API key invalid or expired. Check your Sarvam API key in the plugin.'
    }
    if (msg.includes('insufficient_quota') || msg.includes('429') || msg.includes('rate limit')) {
      return 'Rate limit or quota exceeded. Wait a minute and try again.'
    }
    if (msg.includes('422') || msg.includes('unprocessable')) {
      return 'Request invalid: Text may be too long or language not supported. Check API limits.'
    }
    if (msg.includes('500') || msg.includes('Internal Server')) {
      return 'Sarvam API server error. Try again in a few moments.'
    }
    if (msg.includes('400') || msg.includes('Bad Request')) {
      return `Bad request to ${apiName} API. Check input text and language settings.`
    }
    if (msg.includes('Unexpected token') || msg.includes('JSON')) {
      return `Invalid response from ${apiName} API. The service may be temporarily unavailable.`
    }
    return msg
  }
  return `Unknown error during ${apiName}.`
}

// Function to call Sarvam AI transliteration API
async function transliterateText(text: string, sourceLanguage: string, targetLanguage: string, session?: SessionCache): Promise<string> {
  try {
    const cleanText = text.trim()
    if (!cleanText || cleanText.length === 0) return text
    const truncatedText = cleanText.length > 1000 ? cleanText.substring(0, 1000) : cleanText
    const norm = normalizeTextForCache(truncatedText)
    // Skip only if text is already in target script. LID can misclassify Latin names (e.g. "Srinivasalu Reddy")
    // as Telugu; if text is in Latin script we must call the API so it can transliterate to target script.
    const detected = await detectLanguage(truncatedText, session)
    if (detected === targetLanguage && isInIndicScript(truncatedText)) {
      console.log(`Skipping transliterate: text already in ${targetLanguage} script ("${truncatedText.substring(0, 30)}...")`)
      return text
    }
    const sk = `${sourceLanguage}|${targetLanguage}|${norm}`
    if (session?.tl) {
      const hit = session.tl.get(sk)
      if (hit != null) return hit
    }
    const key = cacheKey('tl', sourceLanguage, targetLanguage, norm)
    const cached = await getCached<string>(key)
    if (cached != null) {
      session?.tl?.set(sk, cached)
      console.log(`Transliterate cache hit: "${norm.substring(0, 30)}..." → ${targetLanguage}`)
      return cached
    }
    
    const requestBody = {
      input: truncatedText,
      source_language_code: LANGUAGE_CODES[sourceLanguage] || sourceLanguage,
      target_language_code: LANGUAGE_CODES[targetLanguage] || targetLanguage,
      numerals_format: 'international',
      spoken_form: false
    }
    
    console.log('Transliteration request:', {
      input: truncatedText.substring(0, 50) + '...',
      source_language_code: LANGUAGE_CODES[sourceLanguage],
      target_language_code: LANGUAGE_CODES[targetLanguage],
      url: SARVAM_TRANSLITERATE_URL
    })
    
    console.log('Full transliteration request body:', JSON.stringify(requestBody, null, 2))
    await rateLimitBeforeApiCall(session)

    const response = await fetchWithTimeout(SARVAM_TRANSLITERATE_URL, {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log('Transliteration response status:', response.status)
    console.log('Transliteration response OK:', response.ok)
    
    const responseText = await response.text()
    console.log('Transliteration response text:', responseText.substring(0, 200) + '...')

    if (!response.ok) {
      const errMsg = parseSarvamErrorBody(responseText, response.status)
      console.error('Transliteration API Error:', response.status, errMsg)
      throw new Error(errMsg)
    }

    const data = JSON.parse(responseText)
    const transliteratedText = data.transliterated_text || text
    session?.tl?.set(sk, transliteratedText)
    await setCached(key, transliteratedText)
    await trimCacheIfNeeded()
    console.log('Transliteration result:', transliteratedText)
    
    return transliteratedText
  } catch (error) {
    const msg = getApiErrorMessage(error, 'Transliteration')
    console.error('Transliteration API error:', msg, error)
    throw new Error(msg)
  }
}

// Function to call Sarvam AI translation API
async function translateText(text: string, targetLanguage: string, sourceLanguage?: string, session?: SessionCache): Promise<string> {
  try {
    const cleanText = text.trim()
    if (!cleanText || cleanText.length === 0) return text
    const truncatedText = cleanText.length > 2000 ? cleanText.substring(0, 2000) : cleanText
    const norm = normalizeTextForCache(truncatedText)
    
    // Skip only if text is already in target script. LID can misclassify Latin names (e.g. "Srinivasalu Reddy")
    // as Telugu; if text is in Latin script we must call the API so it can translate/transliterate.
    const detected = await detectLanguage(truncatedText, session)
    if (detected === targetLanguage && isInIndicScript(truncatedText)) {
      console.log(`Skipping translate: text already in ${targetLanguage} script ("${truncatedText.substring(0, 30)}...")`)
      return text
    }
    
    let sourceCode: string
    if (sourceLanguage === 'en') {
      sourceCode = 'en-IN'
    } else {
      sourceCode = LANGUAGE_CODES[detected] || 'en-IN'
    }
    const targetCode = LANGUAGE_CODES[targetLanguage] || targetLanguage
    const cacheKeyStr = cacheKey('tr', sourceCode, targetCode, norm)
    
    const sk = `${sourceCode}|${targetCode}|${norm}`
    if (session?.tr) {
      const hit = session.tr.get(sk)
      if (hit != null) return hit
    }
    const cached = await getCached<string>(cacheKeyStr)
    if (cached != null) {
      session?.tr?.set(sk, cached)
      console.log(`Translate cache hit: "${norm.substring(0, 30)}..." → ${targetLanguage}`)
      return cached
    }
    
    const requestBody = {
      input: truncatedText,
      source_language_code: sourceCode,
      target_language_code: targetCode,
      model: 'sarvam-translate:v1',
      mode: 'formal',
      numerals_format: 'international'
    }
    
    console.log('Translation request:', {
      input: truncatedText.substring(0, 50) + '...',
      source_language_code: sourceCode,
      target_language_code: LANGUAGE_CODES[targetLanguage],
      url: SARVAM_API_URL
    })
    
    console.log('Full request body:', JSON.stringify(requestBody, null, 2))
    await rateLimitBeforeApiCall(session)

    const response = await fetchWithTimeout(SARVAM_API_URL, {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log('Response status:', response.status)
    console.log('Response OK:', response.ok)
    
    const responseText = await response.text()
    console.log('Response text:', responseText.substring(0, 200) + '...')

    if (!response.ok) {
      const errMsg = parseSarvamErrorBody(responseText, response.status)
      console.error('Translation API Error:', response.status, errMsg)
      throw new Error(errMsg)
    }

    const data = JSON.parse(responseText)
    const rawTranslation = data.translated_text || text
    const cleanTranslation = cleanupTranslation(rawTranslation)
    session?.tr?.set(sk, cleanTranslation)
    await setCached(cacheKeyStr, cleanTranslation)
    await trimCacheIfNeeded()
    console.log('Translation result:', rawTranslation.substring(0, 50) + '...')
    return cleanTranslation
  } catch (error) {
    const msg = getApiErrorMessage(error, 'Translation')
    console.error('Translation API error:', msg, error)
    throw new Error(msg)
  }
}

// Define our standard text styles
interface TextStyleDefinition {
  size: number
  lineHeight: number
  weight: 'Regular' | 'SemiBold'
  styleName: string
  teluguSize?: number
  teluguLineHeight?: number
}

const TEXT_STYLE_DEFINITIONS: TextStyleDefinition[] = [
  // Heading styles
  { 
    size: 18, 
    lineHeight: 27, 
    weight: 'Regular', 
    styleName: 'Heading/Small',
    teluguSize: 17,
    teluguLineHeight: 27
  },
  { 
    size: 22, 
    lineHeight: 30, 
    weight: 'Regular', 
    styleName: 'Heading/Medium',
    teluguSize: 21,
    teluguLineHeight: 30
  },
  { 
    size: 28, 
    lineHeight: 39, 
    weight: 'Regular', 
    styleName: 'Heading/Large',
    teluguSize: 26,
    teluguLineHeight: 39
  },
  
  // Primary Text styles (16/24)
  { 
    size: 16, 
    lineHeight: 24, 
    weight: 'Regular', 
    styleName: 'Primary/Text/Regular',
    teluguSize: 15,
    teluguLineHeight: 24
  },
  { 
    size: 16, 
    lineHeight: 24, 
    weight: 'SemiBold', 
    styleName: 'Primary/Text/Prominent',
    teluguSize: 15,
    teluguLineHeight: 24
  },
  
  // Label styles
  { 
    size: 11, 
    lineHeight: 16, 
    weight: 'Regular', 
    styleName: 'Label/Small',
    teluguSize: 11,
    teluguLineHeight: 16
  },
  // Label Medium now has Regular and Prominent variants
  { 
    size: 12, 
    lineHeight: 18, 
    weight: 'Regular', 
    styleName: 'Label/Medium/Regular',
    teluguSize: 12,
    teluguLineHeight: 18
  },
  { 
    size: 12, 
    lineHeight: 18, 
    weight: 'SemiBold', 
    styleName: 'Label/Medium/Prominent',
    teluguSize: 12,
    teluguLineHeight: 18
  },
  { 
    size: 14, 
    lineHeight: 20, 
    weight: 'Regular', 
    styleName: 'Label/Large/Regular',
    teluguSize: 13,
    teluguLineHeight: 20
  },
  { 
    size: 14, 
    lineHeight: 20, 
    weight: 'SemiBold', 
    styleName: 'Label/Large/Prominent',
    teluguSize: 13,
    teluguLineHeight: 20
  }
]

// Function to get or create text style. When createIfMissing is false (translation), never create new styles.
async function getOrCreateTextStyle(fontFamily: string, definition: TextStyleDefinition, createIfMissing: boolean = true): Promise<TextStyle | null> {
  // First try to find the style by its properties
  const allStyles = figma.getLocalTextStyles()
  
  console.log('\n=== GET OR CREATE TEXT STYLE ===')
  console.log('Looking for text style:', {
    fontFamily,
    definition,
    totalStyles: allStyles.length
  })
  
  // Check if we're looking for Telugu or non-Telugu styles
  const isTeluguFont = fontFamily === 'Kohinoor Telugu'
  
  // First find all styles that match the size and line height
  const matchingStyles = allStyles.filter(s => {
    // For Telugu styles, match against Telugu size
    const isTeluguStyle = s.name.startsWith('Telugu/')
    const targetSize = isTeluguStyle ? (definition.teluguSize || definition.size) : definition.size
    const targetLineHeight = isTeluguStyle ? (definition.teluguLineHeight || definition.lineHeight) : definition.lineHeight
    
    // Size should match exactly
    const sizeMatches = Math.abs(s.fontSize - targetSize) < 0.1
    
    // Line height should match exactly
    const lineHeightMatches = 'value' in s.lineHeight && Math.abs(s.lineHeight.value - targetLineHeight) < 0.1
    
    const matches = sizeMatches && lineHeightMatches
    if (matches) {
      console.log('Found size/lineHeight match:', {
        name: s.name,
        size: s.fontSize,
        lineHeight: s.lineHeight,
        isTeluguStyle,
        targetSize,
        targetLineHeight
      })
    }
    return matches
  })
  
  console.log('Found matching styles:', matchingStyles.map(s => s.name))
  
  if (matchingStyles.length > 0) {
    if (isTeluguFont) {
      // Looking for Telugu styles
      const teluguStyles = matchingStyles.filter(s => s.name.startsWith('Telugu/'))
      console.log('Found Telugu styles:', teluguStyles.map(s => s.name))
      
      if (teluguStyles.length > 0) {
        // Look for matching weight in Telugu styles
        const teluguStyle = teluguStyles.find(s => {
          const isRegular = !s.name.includes('Prominent') && !s.name.toLowerCase().includes('semibold')
          const isProminent = s.name.includes('Prominent') || s.name.toLowerCase().includes('semibold')
          
          // For SemiBold definition, look for Prominent or SemiBold in the name
          if (definition.weight === 'SemiBold') {
            console.log('Checking Telugu style for SemiBold:', {
              name: s.name,
              isProminent
            })
            return isProminent
          }
          
          // For Regular definition, look for Regular in the name or absence of Prominent/SemiBold
          console.log('Checking Telugu style for Regular:', {
            name: s.name,
            isRegular
          })
          return isRegular
        })
        
        if (teluguStyle) {
          console.log('Found matching Telugu style:', {
            name: teluguStyle.name,
            weight: definition.weight
          })
          return teluguStyle
        }
        
        // If no exact weight match, use first Telugu style
        console.log('No exact Telugu weight match, using first Telugu style')
        return teluguStyles[0]
      }
    } else {
      // Looking for non-Telugu styles
      const nonTeluguStyles = matchingStyles.filter(s => s.name.startsWith('Non Telugu/'))
      console.log('Found non-Telugu styles:', nonTeluguStyles.map(s => s.name))
      
      if (nonTeluguStyles.length > 0) {
        // Look for matching weight in non-Telugu styles
        const nonTeluguStyle = nonTeluguStyles.find(s => {
          const isRegular = !s.name.includes('Prominent') && !s.name.toLowerCase().includes('semibold')
          const isProminent = s.name.includes('Prominent') || s.name.toLowerCase().includes('semibold')
          
          // For SemiBold definition, look for Prominent or SemiBold in the name
          if (definition.weight === 'SemiBold') {
            console.log('Checking non-Telugu style for SemiBold:', {
              name: s.name,
              isProminent
            })
            return isProminent
          }
          
          // For Regular definition, look for Regular in the name or absence of Prominent/SemiBold
          console.log('Checking non-Telugu style for Regular:', {
            name: s.name,
            isRegular
          })
          return isRegular
        })
        
        if (nonTeluguStyle) {
          console.log('Found matching non-Telugu style:', {
            name: nonTeluguStyle.name,
            weight: definition.weight
          })
          return nonTeluguStyle
        }
        
        // If no exact weight match, use first non-Telugu style
        console.log('No exact non-Telugu weight match, using first non-Telugu style')
        return nonTeluguStyles[0]
      }
    }
    
    // If no style found in preferred category, use first matching style
    console.log('No style found in preferred category, using first matching style')
    return matchingStyles[0]
  }
  
  // If no matching style found
  if (!createIfMissing) {
    console.log('No matching style found, not creating (translation mode)')
    return null
  }
  const styleName = isTeluguFont ? `Telugu/${definition.styleName}` : `Non Telugu/${definition.styleName}`
  console.log(`Creating new ${isTeluguFont ? 'Telugu' : 'non-Telugu'} text style:`, styleName)
  
  const newStyle = figma.createTextStyle()
  newStyle.name = styleName
  
  // Use Telugu-specific size and line height for Telugu styles
  if (isTeluguFont) {
    newStyle.fontSize = definition.teluguSize || definition.size
    newStyle.lineHeight = { value: definition.teluguLineHeight || definition.lineHeight, unit: 'PIXELS' }
  } else {
    newStyle.fontSize = definition.size
    newStyle.lineHeight = { value: definition.lineHeight, unit: 'PIXELS' }
  }
  
  // Set font name
  const fontName: FontName = {
    family: fontFamily,
    style: definition.weight
  }
  
  try {
    console.log('Loading font for new style:', fontName)
    await figma.loadFontAsync(fontName)
    newStyle.fontName = fontName
    console.log('✅ Successfully created new style:', {
      name: newStyle.name,
      size: newStyle.fontSize,
      lineHeight: newStyle.lineHeight,
      fontName: newStyle.fontName
    })
    return newStyle
  } catch (error) {
    console.error(`❌ Failed to create style ${definition.styleName}:`, error)
    return null
  }
}

// Function to find matching text style definition
function findMatchingStyleDefinition(textNode: TextNode, isTeluguStyle: boolean = false): TextStyleDefinition | null {
  const fontSize = textNode.fontSize
  const lineHeight = textNode.lineHeight
  const fontName = textNode.fontName as FontName
  
  // Skip if not a number or mixed
  if (fontSize === figma.mixed || typeof fontSize !== 'number') {
    return null
  }
  
  // Get line height in pixels
  let lineHeightPx: number | null = null
  if (lineHeight !== figma.mixed) {
    if ('value' in lineHeight && lineHeight.unit === 'PIXELS') {
      lineHeightPx = lineHeight.value
      console.log('Found line height in pixels:', lineHeightPx)
    }
  }
  
  // Get current weight
  const currentWeight = fontName.style.toLowerCase()
  console.log('Current font weight:', currentWeight)
  
  // Check if weight is heavier than Regular
  const isHeavier = currentWeight.includes('medium') || 
                   currentWeight.includes('semibold') ||
                   currentWeight.includes('semi-bold') ||
                   currentWeight.includes('semi bold') ||
                   currentWeight.includes('demi-bold') ||
                   currentWeight.includes('demibold') ||
                   currentWeight.includes('demi bold') ||
                   currentWeight.includes('bold') ||
                   currentWeight.includes('heavy') ||
                   currentWeight.includes('black')
  
  console.log('Weight analysis:', {
    currentWeight,
    isHeavier,
    fontSize,
    lineHeightPx,
    isTeluguStyle
  })
  
  // Find all matching styles by size and line height
  const matchingDefs = TEXT_STYLE_DEFINITIONS.filter(def => {
    // For Telugu styles, match against both standard and Telugu sizes
    const sizeMatches = isTeluguStyle
      ? (Math.abs(def.size - fontSize) < 0.1 || (def.teluguSize && Math.abs(def.teluguSize - fontSize) < 0.1))
      : Math.abs(def.size - fontSize) < 0.1
    
    // For Telugu styles, match against both standard and Telugu line heights
    const lineHeightMatches = !lineHeightPx || isTeluguStyle
      ? (!lineHeightPx || Math.abs(def.lineHeight - lineHeightPx) < 0.1 || (def.teluguLineHeight && Math.abs(def.teluguLineHeight - lineHeightPx) < 0.1))
      : (!lineHeightPx || Math.abs(def.lineHeight - lineHeightPx) < 0.1)
    
    const matches = sizeMatches && lineHeightMatches
    if (matches) {
      console.log('Found potential style match:', {
        styleName: def.styleName,
        size: def.size,
        teluguSize: def.teluguSize,
        lineHeight: def.lineHeight,
        teluguLineHeight: def.teluguLineHeight,
        weight: def.weight,
        isHeavier,
        sizeMatches,
        lineHeightMatches,
        isTeluguStyle
      })
    }
    return matches
  })
  
  console.log('Found matching style definitions:', matchingDefs)
  
  // If we have exactly one match, return it regardless of weight
  // This ensures Heading styles are applied even with different weights
  if (matchingDefs.length === 1 && matchingDefs[0].styleName.startsWith('Heading/')) {
    console.log('Using Heading style regardless of weight:', matchingDefs[0])
    return matchingDefs[0]
  }
  
  // For non-Heading styles, find the right weight variant
  const matchingStyle = matchingDefs.find(def => {
    // For heavier weights, look for SemiBold or Prominent styles
    if (isHeavier) {
      return def.weight === 'SemiBold' || def.styleName.includes('Prominent')
    }
    // For regular weights, look for Regular styles
    return def.weight === 'Regular' && !def.styleName.includes('Prominent')
  })
  
  if (matchingStyle) {
    console.log('Selected style definition:', matchingStyle)
  } else {
    console.log('No matching style found for weight')
  }
  
  return matchingStyle || null
}

// Function to automatically apply text style based on properties
async function autoApplyTextStyle(textNode: TextNode, targetFont: string): Promise<boolean> {
  try {
    console.log('\n=== AUTO APPLY TEXT STYLE START ===')
    console.log('Initial text node state:', {
      text: textNode.characters.substring(0, 50),
      font: textNode.fontName,
      size: textNode.fontSize,
      lineHeight: textNode.lineHeight,
      currentStyleId: textNode.textStyleId,
      targetFont
    })
    
    // Check if this is Telugu style
    const isTeluguStyle = targetFont === 'Kohinoor Telugu'
    console.log('Style type:', isTeluguStyle ? 'Telugu' : 'Standard')
    
    // Find matching style definition
    console.log('\n=== Finding Style Definition ===')
    console.log('Text node properties:', {
      text: textNode.characters.substring(0, 50),
      fontSize: textNode.fontSize,
      lineHeight: textNode.lineHeight,
      fontName: textNode.fontName,
      style: (textNode.fontName as FontName).style,
      isTeluguStyle
    })
    
    const matchingDef = findMatchingStyleDefinition(textNode, isTeluguStyle)
    if (!matchingDef) {
      console.log('❌ No matching style definition found')
      return false
    }
    
    console.log('✅ Found matching style:', {
      styleName: matchingDef.styleName,
      size: isTeluguStyle ? matchingDef.teluguSize : matchingDef.size,
      lineHeight: isTeluguStyle ? matchingDef.teluguLineHeight : matchingDef.lineHeight,
      weight: matchingDef.weight
    })
    
    // Get existing style
    console.log('\n=== Getting/Creating Text Style ===')
    const style = await getOrCreateTextStyle(targetFont, matchingDef)
    if (!style) {
      console.log('❌ Failed to get/create text style')
      return false
    }
    
    console.log('✅ Got text style:', {
      name: style.name,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      fontName: style.fontName
    })
    
    // Load font and apply style
    console.log('\n=== Applying Style ===')
    console.log('Loading font:', style.fontName)
    await figma.loadFontAsync(style.fontName)
    
    // For Telugu, we need to set the size and line height explicitly
    if (isTeluguStyle && matchingDef.teluguSize && matchingDef.teluguLineHeight) {
      console.log('Applying Telugu-specific size and line height:', {
        size: matchingDef.teluguSize,
        lineHeight: matchingDef.teluguLineHeight
      })
      textNode.fontSize = matchingDef.teluguSize
      textNode.lineHeight = { value: matchingDef.teluguLineHeight, unit: 'PIXELS' }
    }
    
    console.log('Applying text style ID:', style.id)
    await textNode.setTextStyleIdAsync(style.id)
    
    const styleName = typeof style.name === 'symbol' ? String(style.name) : style.name
    console.log(`✅ Successfully applied text style: ${styleName}`)
    
    console.log('Final text node state:', {
      text: textNode.characters.substring(0, 50),
      font: textNode.fontName,
      size: textNode.fontSize,
      lineHeight: textNode.lineHeight,
      styleId: textNode.textStyleId
    })
    
    return true
    
  } catch (error) {
    console.error('❌ Error auto-applying text style:', error)
    return false
  }
}

// Function to apply Telugu font and style with proper sequencing
async function applyTeluguFontAndStyle(textNode: TextNode): Promise<'success' | 'skipped' | 'error'> {
  try {
    const currentFont = textNode.fontName as FontName

    console.log('\n=== TELUGU FONT STYLE APPLICATION START ===')
    console.log('Initial text node state:', {
      text: textNode.characters.substring(0, 50),
      currentFont: textNode.fontName,
      fontSize: textNode.fontSize,
      lineHeight: textNode.lineHeight,
      textStyleId: textNode.textStyleId
    })

    // Step 1: Find matching style definition first - IMPORTANT: Pass true for isTeluguStyle
    const matchingDef = findMatchingStyleDefinition(textNode, true)
    if (!matchingDef) {
      console.log('❌ No matching style definition found')
      return 'skipped'
    }

    console.log('Found matching style definition:', matchingDef)

    // Step 2: Get existing Telugu style (never create during translation)
    const style = await getOrCreateTextStyle('Kohinoor Telugu', {
      ...matchingDef,
      size: matchingDef.teluguSize || matchingDef.size,
      lineHeight: matchingDef.teluguLineHeight || matchingDef.lineHeight
    }, false)

    // Step 3: Load the font with correct weight
    const currentWeight = currentFont.style.toLowerCase()
    const isHeavier = currentWeight.includes('medium') || 
                     currentWeight.includes('semibold') ||
                     currentWeight.includes('bold') ||
                     currentWeight.includes('heavy') ||
                     currentWeight.includes('black')

    // Try to load SemiBold first for heavier weights
    if (isHeavier) {
      try {
        await figma.loadFontAsync({ family: 'Kohinoor Telugu', style: 'SemiBold' })
        textNode.fontName = { family: 'Kohinoor Telugu', style: 'SemiBold' }
      } catch (error) {
        console.log('⚠️ SemiBold not available, falling back to Regular')
        await figma.loadFontAsync({ family: 'Kohinoor Telugu', style: 'Regular' })
        textNode.fontName = { family: 'Kohinoor Telugu', style: 'Regular' }
      }
    } else {
      await figma.loadFontAsync({ family: 'Kohinoor Telugu', style: 'Regular' })
      textNode.fontName = { family: 'Kohinoor Telugu', style: 'Regular' }
    }

    // Step 4: Apply Telugu-specific size and line height
    if (matchingDef.teluguSize && matchingDef.teluguLineHeight) {
      textNode.fontSize = matchingDef.teluguSize
      textNode.lineHeight = { value: matchingDef.teluguLineHeight, unit: 'PIXELS' }
    }

    // Step 5: Apply the style if one exists (we never create during translation)
    if (style) {
      await textNode.setTextStyleIdAsync(style.id)
    } else {
      console.log('No matching Telugu style in file; applied font and size/lineHeight only')
    }

    console.log('=== FINAL TEXT NODE STATE ===')
    console.log({
      text: textNode.characters.substring(0, 50),
      font: textNode.fontName,
      size: textNode.fontSize,
      lineHeight: textNode.lineHeight,
      textStyleId: textNode.textStyleId
    })

    return 'success'

  } catch (error) {
    console.error('❌ Error in Telugu font application:', error)
    return 'error'
  }
}

// Function to swap font family while preserving style (converts current font to target)
async function swapFontFamily(textNode: TextNode, targetFont: string, applyFontStyles: boolean = false): Promise<'success' | 'skipped' | 'error'> {
  const currentFont = textNode.fontName as FontName

  try {
    console.log('\n--- Starting font swap ---')
    console.log('Text node:', {
      text: textNode.characters.substring(0, 50),
      currentFont: currentFont,
      targetFont,
      applyFontStyles,
      currentStyleId: textNode.textStyleId
    })
    
    // First try to apply text style if enabled
    if (applyFontStyles) {
      console.log('Attempting to apply font styles...')
      const styleApplied = await autoApplyTextStyle(textNode, targetFont)
      if (styleApplied) {
        console.log('✅ Successfully applied text style')
        return 'success'
      }
      console.log('⚠️ Text style application failed, falling back to weight mapping')
    }
    
    // Use same weight matching as translation: try exact match, then variants, then proximity fallbacks
    const originalWeight = currentFont.style || 'Regular'
    const styleNames = getWeightStyleNamesToTry(originalWeight)
    
    for (const style of styleNames) {
      try {
        const fontToApply: FontName = { family: targetFont, style: style || 'Regular' }
        await figma.loadFontAsync(fontToApply)
        textNode.fontName = fontToApply
        console.log('✅ Successfully applied', targetFont, style || 'Regular')
        return 'success'
      } catch {
        continue
      }
    }
    
    // Fallback: try Regular if nothing else worked
    await figma.loadFontAsync({ family: targetFont, style: 'Regular' })
    textNode.fontName = { family: targetFont, style: 'Regular' }
    console.log('✅ Successfully applied', targetFont, 'Regular (fallback)')
    return 'success'
    
  } catch (error) {
    console.error('❌ Error swapping font family:', error)
    return 'error'
  }
}

// Message handler for translation requests
figma.ui.onmessage = async (msg) => {
  console.log('\n=== MESSAGE RECEIVED ===')
  console.log('Message type:', msg.type)
  console.log('Message data:', {
    targetLanguage: msg.targetLanguage,
    applyFontStyles: msg.applyFontStyles,
    type: msg.type
  })
  
  if (msg.type === 'translate') {
    try {
      await loadFontPrefs()
      await reloadStyleMappings()
      const selection = figma.currentPage.selection
      
      // Filter selection: containers (frames, groups, sections, components, instances) and text layers
      const containers = selection.filter(node => isContainerNode(node))
      const textLayers = selection.filter(node => node.type === 'TEXT') as TextNode[]
      
      console.log('\n=== SELECTION ANALYSIS ===')
      console.log('Selected items:', {
        containers: containers.length,
        textLayers: textLayers.length
      })

      if (containers.length === 0 && textLayers.length === 0) {
        figma.ui.postMessage({ 
          type: 'error', 
          message: 'Please select one or more layers or text to translate' 
        })
        return
      }
      
      // Find all text nodes and check their processing type
      const textNodes: Array<{node: TextNode, originalText: string, type: 'translate' | 'dnd' | 'hing' | 'lma'}> = []
      
      // Process text nodes from containers (frame, group, section, component, instance)
      // Only check dnd/hing within the selected container - not in external ancestors
      containers.forEach(container => {
        container.findAll(node => node.type === 'TEXT').forEach(textNode => {
          const textElement = textNode as TextNode
          const text = textElement.characters.trim()
          if (text.length > 0) {
            const isLma = isLmaNode(textElement)
            const isHing = !isLma && isHingNode(textElement, container)
            const isDnd = !isLma && !isHing && isDndNode(textElement, container)
            
            let nodeType: 'translate' | 'dnd' | 'hing' | 'lma' = 'translate'
            if (isLma) {
              nodeType = 'lma'
              console.log('Found LMA text node for full skip:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))
            } else if (isHing) {
              nodeType = 'hing'
              console.log('Found Hing text node for transliteration:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))
            } else if (isDnd) {
              nodeType = 'dnd'
              console.log('Found DND text node for font update:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))
            } else {
              console.log('Found text node for translation:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))
            }
            
            textNodes.push({
              node: textElement,
              originalText: textElement.characters,
              type: nodeType
            })
          }
        })
      })
      
      // Process directly selected text layers
      // User explicitly selected these - only check dnd/hing within the node itself (not external ancestors)
      textLayers.forEach(textLayer => {
        const text = textLayer.characters.trim()
        if (text.length > 0) {
          const isLma = isLmaNode(textLayer)
          const isHing = !isLma && isHingNode(textLayer, textLayer)
          const isDnd = !isLma && !isHing && isDndNode(textLayer, textLayer)
          
          let nodeType: 'translate' | 'dnd' | 'hing' | 'lma' = 'translate'
          if (isLma) {
            nodeType = 'lma'
            console.log('Found selected LMA text layer for full skip:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))
          } else if (isHing) {
            nodeType = 'hing'
            console.log('Found selected Hing text layer for transliteration:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))
          } else if (isDnd) {
            nodeType = 'dnd'
            console.log('Found selected DND text layer for font update:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))
          } else {
            console.log('Found selected text layer for translation:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))
          }
          
          textNodes.push({
            node: textLayer,
            originalText: textLayer.characters,
            type: nodeType
          })
        }
      })
      
      console.log(`Total text nodes found: ${textNodes.length}`)
      
      if (textNodes.length === 0) {
        figma.ui.postMessage({ 
          type: 'error', 
          message: 'No text found in selected items' 
        })
        return
      }
      
      figma.ui.postMessage({ 
        type: 'translation-started', 
        count: textNodes.length 
      })
      
      console.log('[TRANSLATE] Starting translation of', textNodes.length, 'text(s) to', msg.targetLanguage, '— open Plugins → Development → Open Console for details')
      
      const session = createSessionCache()
      const sourceLanguage = msg.assumeEnglish !== false ? 'en' : undefined
      let translatedCount = 0
      let errors = 0
      let lastErrorMessage = ''
      const errorMessages: string[] = []
      let weightMappings: string[] = []
      
      // Process translations with progress updates
      for (let i = 0; i < textNodes.length; i++) {
        const { node, originalText, type } = textNodes[i]
        let sourceStyleBeforeTranslate: SourceStyle | null = null
        if (type === 'translate' || type === 'dnd') sourceStyleBeforeTranslate = getSourceStyleFromNode(node)
        
        try {
          // Load ALL fonts in the node (required for mixed-style text: strikethrough, underline, multiple fonts)
          await loadAllFontsForTextNode(node)
          
          // Update progress
          let action = 'Processing'
          if (type === 'translate') action = 'Translating'
          else if (type === 'hing') action = 'Transliterating'
          else if (type === 'dnd') action = 'Preserving text + applying font/style (DND)'
          else if (type === 'lma') action = 'Skipping (LMA)'
          
          figma.ui.postMessage({
            type: 'translation-progress',
            current: i + 1,
            total: textNodes.length,
            message: `${action} text ${i + 1} of ${textNodes.length}...`
          })
          
          if (type === 'hing') {
            const transliteratedText = await transliterateText(originalText, 'en', msg.targetLanguage, session)
            
            if (transliteratedText && transliteratedText.trim().length > 0) {
              const actuallyChanged = transliteratedText !== originalText
              if (actuallyChanged) {
                // Apply font BEFORE setting characters (Figma requires font to support the script)
                const applied = await applyUserDefinedStyleMapping(node, msg.targetLanguage)
                if (!applied) {
                  const fontResult = await applyFontToTextNode(node, msg.targetLanguage)
                  if (fontResult.mappingUsed) weightMappings.push(`"${originalText.substring(0, 30)}...": ${fontResult.mappingUsed}`)
                }
                node.characters = transliteratedText
                translatedCount++
                console.log(`✅ Transliterated and font updated: "${originalText.substring(0, 30)}..." → "${transliteratedText.substring(0, 30)}..."`)
              } else {
                // Text unchanged but still apply font/style per preference (e.g. number-only text)
                const applied = await applyUserDefinedStyleMapping(node, msg.targetLanguage)
                if (!applied) {
                  const fontResult = await applyFontToTextNode(node, msg.targetLanguage)
                  if (fontResult.mappingUsed) weightMappings.push(`"${originalText.substring(0, 30)}...": ${fontResult.mappingUsed}`)
                }
                translatedCount++
                console.log(`⏭️ No transliteration change; applied font/style: "${originalText.substring(0, 30)}..."`)
              }
            } else {
              const applied = await applyUserDefinedStyleMapping(node, msg.targetLanguage)
              if (!applied) await applyFontToTextNode(node, msg.targetLanguage)
              translatedCount++
              console.log(`⏭️ Empty transliteration; font applied for "${originalText.substring(0, 30)}..."`)
            }
          } else if (type === 'dnd') {
            // DND = Do Not Disturb: preserve text, but still apply target font/style mappings
            const applied = await applyUserDefinedStyleMapping(node, msg.targetLanguage, sourceStyleBeforeTranslate)
            if (!applied) {
              const fontResult = await applyFontToTextNode(node, msg.targetLanguage)
              if (fontResult.mappingUsed) weightMappings.push(`"${originalText.substring(0, 30)}...": ${fontResult.mappingUsed}`)
            }
            translatedCount++
            console.log(`✅ DND: preserved text and applied font/style: "${originalText.substring(0, 30)}..."`)
            
          } else if (type === 'lma') {
            translatedCount++
            console.log(`✅ LMA: skipped translation and font/style changes: "${originalText.substring(0, 30)}..."`)
          } else {
            const segmentResult = await translateWithStyledSegments(
              node, msg.targetLanguage, sourceLanguage, session
            )
            if (segmentResult.success) {
              const applied = await applyUserDefinedStyleMapping(node, msg.targetLanguage, sourceStyleBeforeTranslate)
              if (applied) console.log(`✅ Applied matching style from file`)
              weightMappings.push(...segmentResult.weightMappings)
              translatedCount++
              console.log(`✅ Translated with preserved styles: "${originalText.substring(0, 30)}..."`)
            } else {
              const translatedText = await translateText(originalText, msg.targetLanguage, sourceLanguage, session)
              if (translatedText && translatedText.trim().length > 0) {
                const actuallyChanged = translatedText !== originalText
                if (actuallyChanged) {
                  const applied = await applyUserDefinedStyleMapping(node, msg.targetLanguage)
                  if (!applied) {
                    const fontResult = await applyFontToTextNode(node, msg.targetLanguage)
                    if (fontResult.mappingUsed) weightMappings.push(`"${originalText.substring(0, 30)}...": ${fontResult.mappingUsed}`)
                  }
                  node.characters = translatedText
                  translatedCount++
                  console.log(`✅ Translated and font updated: "${originalText.substring(0, 30)}..." → "${translatedText.substring(0, 30)}..."`)
                } else {
                  // Text unchanged (e.g. number) but still apply font/style per preference
                  const applied = await applyUserDefinedStyleMapping(node, msg.targetLanguage)
                  if (!applied) {
                    const fontResult = await applyFontToTextNode(node, msg.targetLanguage)
                    if (fontResult.mappingUsed) weightMappings.push(`"${originalText.substring(0, 30)}...": ${fontResult.mappingUsed}`)
                  }
                  translatedCount++
                  console.log(`⏭️ No translation change; applied font/style: "${originalText.substring(0, 30)}..." in ${msg.targetLanguage}`)
                }
              } else {
                // Empty result – apply font/style, count as success (text unchanged, font changed)
                const applied = await applyUserDefinedStyleMapping(node, msg.targetLanguage)
                if (!applied) {
                  const fontResult = await applyFontToTextNode(node, msg.targetLanguage)
                  if (fontResult.mappingUsed) weightMappings.push(`"${originalText.substring(0, 30)}...": ${fontResult.mappingUsed}`)
                }
                translatedCount++
                console.log(`⏭️ Empty translation; font applied for "${originalText.substring(0, 30)}..."`)
              }
            }
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error'
          const loc = getNodeLocation(node)
          // Apply font/style even when API fails (e.g. "Source and target same" for numbers)
          let fontApplied = false
          if (type !== 'lma') {
            try {
              const srcOverride = (type === 'translate' || type === 'dnd') ? sourceStyleBeforeTranslate ?? undefined : undefined
              const applied = await applyUserDefinedStyleMapping(node, msg.targetLanguage, srcOverride)
              if (!applied) await applyFontToTextNode(node, msg.targetLanguage)
              fontApplied = true
            } catch (fontErr) {
              console.warn('[Apply styles] Failed after translation error:', fontErr)
            }
          }
          // Only report as error if font wasn't applied; otherwise it's success (text unchanged, font changed)
          if (!fontApplied) {
            const msgText = `#${i + 1} ${loc} "${originalText.substring(0, 30)}...": ${errMsg}`
            console.error(`[TRANSLATE FAIL #${i + 1}] ❌`, msgText, error)
            errors++
            lastErrorMessage = msgText
            errorMessages.push(`#${i + 1}: ${msgText}`)
            figma.ui.postMessage({ type: 'translation-error', message: msgText })
          } else {
            translatedCount++
            console.log(`⏭️ API failed (${errMsg}) but font applied for ${loc}`)
          }
        }
      }
      
      if (errors > 0) {
        console.log('[TRANSLATE] === FAILURE SUMMARY ===', errorMessages)
      }
      
      figma.ui.postMessage({ 
        type: 'translation-complete', 
        count: translatedCount,
        errors: errors,
        total: textNodes.length,
        weightMappings: weightMappings,
        errorMessages: errorMessages
      })
      
      if (translatedCount > 0) {
        figma.notify(`✅ Translated ${translatedCount}/${textNodes.length} text elements!`)
      } else if (lastErrorMessage) {
        figma.notify(`❌ ${lastErrorMessage}`, { error: true })
      } else {
        figma.notify(`No changes made. Text may already be in the target language.`, { timeout: 2000 })
      }
      
    } catch (error) {
      console.error('Translation error:', error)
      const errMsg = getApiErrorMessage(error, 'Translation')
      figma.ui.postMessage({ type: 'error', message: errMsg })
      figma.notify(`❌ ${errMsg}`, { error: true })
    }
  } else if (msg.type === 'bulk-translate-all') {
    try {
      await loadFontPrefs()
      const validLangs = ['hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'pa', 'gu']
      const bulkLangs = Array.isArray(msg.bulkLanguages) && msg.bulkLanguages.length > 0
        ? (msg.bulkLanguages as string[]).filter((l: string) => validLangs.includes(l))
        : [...BULK_LANGUAGES]
      if (bulkLangs.length === 0) {
        figma.ui.postMessage({ type: 'error', message: 'Please set up at least one language for bulk translate' })
        return
      }
      const selection = figma.currentPage.selection
      const containers = selection.filter(node => isContainerNode(node))
      const textLayers = selection.filter(node => node.type === 'TEXT') as TextNode[]
      const itemsToBulk = [...containers, ...textLayers]
      
      if (itemsToBulk.length === 0) {
        figma.ui.postMessage({ type: 'error', message: 'Please select one or more layers or text to run bulk translate' })
        return
      }
      
      await reloadStyleMappings()
      figma.ui.postMessage({ type: 'bulk-started', total: bulkLangs.length })
      
      const GAP = 64
      const selectionBounds = itemsToBulk.reduce(
        (acc, f) => {
          const b = f.absoluteBoundingBox
          if (!b) return acc
          return {
            x: Math.min(acc.x, b.x),
            y: Math.min(acc.y, b.y),
            right: Math.max(acc.right, b.x + b.width),
            bottom: Math.max(acc.bottom, b.y + b.height)
          }
        },
        { x: Infinity, y: Infinity, right: -Infinity, bottom: -Infinity } as { x: number; y: number; right: number; bottom: number }
      )
      let xOffset = selectionBounds.right === -Infinity ? 0 : selectionBounds.right + GAP
      const startY = selectionBounds.y === Infinity ? 0 : selectionBounds.y
      const allCreatedFrames: SceneNode[] = []
      
      // Pre-compute text types from ORIGINAL items (containers + text layers) before cloning
      const typesByFrame: Array<Array<{path: number[], originalText: string, type: 'translate' | 'dnd' | 'hing' | 'lma'}>> = []
      for (const item of itemsToBulk) {
        const root = item
        const textWithPath = item.type === 'TEXT'
          ? (item as TextNode).characters.trim().length > 0
            ? [{ path: [] as number[], text: (item as TextNode).characters, node: item as TextNode }]
            : []
          : collectTextNodesWithPath(root, [])
        const items = textWithPath.map(({ path, text, node }) => {
          const isLma = isLmaNode(node)
          const isHing = !isLma && isHingNode(node, root)
          const isDnd = !isLma && !isHing && isDndNode(node, root)
          let nodeType: 'translate' | 'dnd' | 'hing' | 'lma' = 'translate'
          if (isLma) nodeType = 'lma'
          else if (isHing) nodeType = 'hing'
          else if (isDnd) nodeType = 'dnd'
          return { path, originalText: text, type: nodeType }
        })
        typesByFrame.push(items)
      }
      
      for (let langIdx = 0; langIdx < bulkLangs.length; langIdx++) {
        const targetLang = bulkLangs[langIdx]
        const langLabel = BULK_LANGUAGE_LABELS[targetLang]
        
        figma.ui.postMessage({
          type: 'bulk-progress',
          current: langIdx + 1,
          total: bulkLangs.length,
          message: `Language ${langIdx + 1}/${bulkLangs.length}: ${langLabel} — Translating…`
        })
        
        // Place clones directly on page (no wrapper frame) to avoid extra bounding box and layout-induced cropping
        const clonedContainers: SceneNode[] = []
        let langX = xOffset
        for (const item of itemsToBulk) {
          const clone = item.clone()
          clone.name = `${langLabel} — ${item.name}`
          if ('x' in clone) (clone as SceneNode & { x: number; y: number }).x = langX
          if ('y' in clone) (clone as SceneNode & { x: number; y: number }).y = startY
          figma.currentPage.appendChild(clone)
          clonedContainers.push(clone)
          langX += getNodeWidth(clone) + GAP
        }
        
        // Build text nodes from clones, matched by path to pre-computed types
        const textNodes: Array<{node: TextNode, originalText: string, type: 'translate' | 'dnd' | 'hing' | 'lma'}> = []
        for (let fIdx = 0; fIdx < clonedContainers.length; fIdx++) {
          const cloned = clonedContainers[fIdx]
          const typeItems = typesByFrame[fIdx] || []
          const typeByPath = new Map<string, 'translate' | 'dnd' | 'hing' | 'lma'>()
          typeItems.forEach(t => typeByPath.set(JSON.stringify(t.path), t.type))
          const cloneTextWithPath = collectTextNodesWithPath(cloned, [])
          for (const { path, text, node } of cloneTextWithPath) {
            const pathKey = JSON.stringify(path)
            textNodes.push({
              node,
              originalText: text,
              type: typeByPath.get(pathKey) ?? 'translate'
            })
          }
        }
        
        const bulkSession = createSessionCache()
        for (let i = 0; i < textNodes.length; i++) {
          const { node, originalText, type } = textNodes[i]
          const bulkSourceStyleBefore = (type === 'translate' || type === 'dnd') ? getSourceStyleFromNode(node) : null
          try {
            await loadAllFontsForTextNode(node)
            if (type === 'hing') {
              const transliterated = await transliterateText(originalText, 'en', targetLang, bulkSession)
              if (transliterated?.trim() && transliterated !== originalText) {
                const applied = await applyUserDefinedStyleMapping(node, targetLang)
                if (!applied) await applyFontToTextNode(node, targetLang)
                node.characters = transliterated
              } else if (transliterated?.trim()) {
                const applied = await applyUserDefinedStyleMapping(node, targetLang)
                if (!applied) await applyFontToTextNode(node, targetLang)
              }
            } else if (type === 'dnd') {
              // DND = Do Not Disturb: preserve text, but still apply target font/style mappings
              const applied = await applyUserDefinedStyleMapping(node, targetLang, bulkSourceStyleBefore)
              if (!applied) await applyFontToTextNode(node, targetLang)
            } else if (type === 'lma') {
              // LMA = Leave Me Alone: preserve text and font/style exactly as-is (clone already has original; no-op)
            } else {
              const segmentResult = await translateWithStyledSegments(node, targetLang, 'en', bulkSession)
              if (!segmentResult.success) {
                const translated = await translateText(originalText, targetLang, 'en', bulkSession)
                if (translated?.trim() && translated !== originalText) {
                  const applied = await applyUserDefinedStyleMapping(node, targetLang)
                  if (!applied) await applyFontToTextNode(node, targetLang)
                  node.characters = translated
                } else if (translated?.trim()) {
                  const applied = await applyUserDefinedStyleMapping(node, targetLang)
                  if (!applied) await applyFontToTextNode(node, targetLang)
                } else {
                  const applied = await applyUserDefinedStyleMapping(node, targetLang)
                  if (!applied) await applyFontToTextNode(node, targetLang)
                }
              } else {
                await applyUserDefinedStyleMapping(node, targetLang, bulkSourceStyleBefore)
              }
            }
          } catch (err) {
            const errMsg = getApiErrorMessage(err, 'Translation')
            console.error(`Bulk translate error (${langLabel}):`, errMsg, err)
            figma.ui.postMessage({ type: 'translation-error', message: `${langLabel}: ${errMsg}` })
            if (type !== 'lma') {
              try {
                const srcOverride = (type === 'translate' || type === 'dnd') ? bulkSourceStyleBefore ?? undefined : undefined
                const applied = await applyUserDefinedStyleMapping(node, targetLang, srcOverride)
                if (!applied) await applyFontToTextNode(node, targetLang)
              } catch (fontErr) {
                console.warn('[Bulk] Apply font after error:', fontErr)
              }
            }
          }
        }
        
        allCreatedFrames.push(...clonedContainers)
        xOffset = langX
        figma.viewport.scrollAndZoomIntoView(clonedContainers)
      }
      
      figma.currentPage.selection = allCreatedFrames
      figma.viewport.scrollAndZoomIntoView(allCreatedFrames)
      
      figma.ui.postMessage({
        type: 'bulk-complete',
        count: bulkLangs.length,
        message: `Bulk translate complete: ${bulkLangs.length} language versions created!`
      })
      figma.notify(`✅ Bulk translate complete: ${bulkLangs.length} language versions created!`)
    } catch (error) {
      console.error('Bulk translate error:', error)
      const errMsg = getApiErrorMessage(error, 'Bulk Translation')
      figma.ui.postMessage({ type: 'error', message: errMsg })
    }
  } else if (msg.type === 'get-styles-for-font') {
    try {
      const fontFamily = typeof msg.fontFamily === 'string' ? msg.fontFamily : ''
      const all = figma.getLocalTextStyles()
      const matching = all.filter(s => {
        try {
          if (typeof s.fontName !== 'object' || !s.fontName) return false
          return (s.fontName as FontName).family === fontFamily
        } catch { return false }
      })
      const styles = matching.map(s => {
        const fs = typeof s.fontSize === 'number' ? s.fontSize : null
        let lh: number | null = null
        if (s.lineHeight && typeof s.lineHeight === 'object' && 'value' in s.lineHeight && s.lineHeight.unit === 'PIXELS') {
          lh = (s.lineHeight as { value: number }).value
        }
        let weight = 'Regular'
        try {
          const fn = s.fontName as FontName | symbol
          if (fn && typeof fn === 'object' && 'style' in fn && typeof (fn as FontName).style === 'string') {
            weight = (fn as FontName).style
          }
        } catch { /* ignore */ }
        const sizeStr = fs != null && lh != null ? `${fs}px / ${lh}px` : fs != null ? `${fs}px` : ''
        return { id: s.id, name: s.name, fontSize: fs, lineHeight: lh, weight, sizeStr }
      })
      figma.ui.postMessage({ type: 'styles-for-font-loaded', fontFamily, styles })
    } catch (e) {
      figma.ui.postMessage({ type: 'styles-for-font-loaded', fontFamily: '', styles: [] })
    }
    return
  } else if (msg.type === 'scan-selection') {
    try {
      const selection = figma.currentPage.selection
      if (selection.length === 0) {
        figma.ui.postMessage({ type: 'error', message: 'Please select a frame or text layer to scan styles' })
        figma.notify('Please select a frame or text layer to scan styles', { error: true })
        return
      }
      const containers = selection.filter((n: SceneNode) => 'children' in n)
      const textLayers = selection.filter((n: SceneNode) => n.type === 'TEXT') as TextNode[]
      const seen = new Map<string, { font: string; size: number; lh: number | null; weight: string; decoration?: string; segmentCount: number }>()
      const collect = (node: SceneNode) => {
        if (node.type === 'TEXT') {
          const styles = getSourceStylesFromNode(node as TextNode)
          for (const s of styles) {
            const existing = seen.get(s.key)
            if (existing) {
              existing.segmentCount += s.segmentCount ?? 1
            } else {
              seen.set(s.key, {
                font: s.font,
                size: s.size,
                lh: s.lh,
                weight: s.weight,
                decoration: s.decoration,
                segmentCount: s.segmentCount ?? 1
              })
            }
          }
        }
        if ('children' in node) (node.children as SceneNode[]).forEach(collect)
      }
      containers.forEach(collect)
      textLayers.forEach(collect)
      const sourceStyles = Array.from(seen.entries()).map(([k, v]) => ({
        key: k,
        font: v.font,
        size: v.size,
        lh: v.lh,
        weight: v.weight,
        decoration: v.decoration,
        segmentCount: v.segmentCount
      }))
      figma.ui.postMessage({ type: 'scan-selection-loaded', sourceStyles })
    } catch (e) {
      figma.ui.postMessage({ type: 'scan-selection-loaded', sourceStyles: [] })
    }
    return
  } else if (msg.type === 'get-style-mappings') {
    try {
      const mappings = await loadStyleMappings()
      figma.ui.postMessage({ type: 'style-mappings-loaded', mappings })
    } catch {
      figma.ui.postMessage({ type: 'style-mappings-loaded', mappings: {} })
    }
    return
  } else if (msg.type === 'save-style-mappings') {
    try {
      const raw = msg.mappings && typeof msg.mappings === 'object' ? (msg.mappings as StyleMappingsByLang) : {}
      const mappings: StyleMappingsByLang = {}
      for (const lang of Object.keys(raw)) {
        const m = raw[lang]
        if (m && typeof m === 'object') {
          const filtered: Record<string, string> = {}
          for (const k of Object.keys(m)) {
            const v = m[k]
            if (v === 'skip' || (typeof v === 'string' && v.length > 0)) filtered[k] = v
          }
          if (Object.keys(filtered).length > 0) mappings[lang] = filtered
        }
      }
      styleMappingsCache = mappings
      await figma.clientStorage.setAsync(STYLE_MAPPINGS_KEY, mappings)
      figma.ui.postMessage({ type: 'style-mappings-saved', mappings })
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: 'Failed to save style mappings' })
    }
    return
  } else if (msg.type === 'get-bulk-prefs') {
    try {
      const saved = await figma.clientStorage.getAsync('ai-translate-bulk-languages')
      const langs = Array.isArray(saved) && saved.length > 0 ? saved as string[] : null
      figma.ui.postMessage({ type: 'bulk-prefs-loaded', bulkLanguages: langs })
    } catch {
      figma.ui.postMessage({ type: 'bulk-prefs-loaded', bulkLanguages: null })
    }
    return
  } else if (msg.type === 'save-bulk-prefs') {
    try {
      const langs = Array.isArray(msg.bulkLanguages) ? msg.bulkLanguages as string[] : []
      const valid = ['hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'pa', 'gu']
      const filtered = langs.filter((l: string) => valid.includes(l))
      await figma.clientStorage.setAsync('ai-translate-bulk-languages', filtered)
      figma.ui.postMessage({ type: 'bulk-prefs-saved', bulkLanguages: filtered })
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: 'Failed to save preferences' })
    }
    return
  } else if (msg.type === 'get-fonts') {
    try {
      const fonts = await figma.listAvailableFontsAsync()
      const families = Array.from(new Set(
        fonts
          .map(f => (f.fontName && f.fontName.family) || '')
          .filter(name => {
            const t = (name || '').trim()
            if (!t) return false
            // Exclude names that are only replacement chars, ? or non-printables
            if (/^[\s?\uFFFD]+$/.test(t)) return false
            if (!/[a-zA-Z0-9\u00C0-\u024F]/.test(t)) return false
            return true
          })
      )).sort((a, b) => a.localeCompare(b))
      figma.ui.postMessage({ type: 'font-list-loaded', fonts: families })
    } catch (e) {
      figma.ui.postMessage({ type: 'font-list-loaded', fonts: [] })
    }
    return
  } else if (msg.type === 'get-font-prefs') {
    try {
      const saved = await figma.clientStorage.getAsync(FONT_PREFS_KEY)
      const prefs = saved && typeof saved === 'object' ? (saved as Record<string, string>) : {}
      fontPrefsCache = prefs
      figma.ui.postMessage({ type: 'font-prefs-loaded', fontPrefs: prefs })
    } catch {
      figma.ui.postMessage({ type: 'font-prefs-loaded', fontPrefs: {} })
    }
    return
  } else if (msg.type === 'save-font-prefs') {
    try {
      const prefs = msg.fontPrefs && typeof msg.fontPrefs === 'object' ? (msg.fontPrefs as Record<string, string>) : {}
      const validLangs = ['hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'pa', 'gu', 'en']
      const filtered: Record<string, string> = {}
      for (const k of Object.keys(prefs)) {
        if (validLangs.includes(k) && typeof prefs[k] === 'string' && prefs[k].trim()) {
          filtered[k] = prefs[k].trim()
        }
      }
      await figma.clientStorage.setAsync(FONT_PREFS_KEY, filtered)
      fontPrefsCache = filtered
      figma.ui.postMessage({ type: 'font-prefs-saved', fontPrefs: filtered })
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: 'Failed to save font preferences' })
    }
    return
  } else if (msg.type === 'clear-cache') {
    try {
      const keys = await figma.clientStorage.keysAsync()
      const ourKeys = keys.filter(k => k.startsWith(CACHE_PREFIX + ':'))
      for (const k of ourKeys) await figma.clientStorage.deleteAsync(k)
      figma.notify(`Cleared ${ourKeys.length} cached translations`)
    } catch (e) {
      figma.notify('Failed to clear cache', { error: true })
    }
    return
  } else if (msg.type === 'hard-reset') {
    try {
      await figma.clientStorage.deleteAsync('ai-translate-bulk-languages')
      await figma.clientStorage.deleteAsync(FONT_PREFS_KEY)
      await figma.clientStorage.deleteAsync(STYLE_MAPPINGS_KEY)
      fontPrefsCache = {}
      styleMappingsCache = null
      const keys = await figma.clientStorage.keysAsync()
      const ourKeys = keys.filter(k => k.startsWith(CACHE_PREFIX + ':'))
      for (const k of ourKeys) await figma.clientStorage.deleteAsync(k)
      figma.ui.postMessage({ type: 'hard-reset-complete' })
      figma.notify('Hard reset complete: all preferences & cache cleared')
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: 'Hard reset failed' })
    }
    return
  } else if (msg.type === 'font-swap') {
    try {
      const selection = figma.currentPage.selection
      
      // Filter selection for frames and text layers
      const frames = selection.filter(node => node.type === 'FRAME')
      const textLayers = selection.filter(node => node.type === 'TEXT') as TextNode[]
      
      if (frames.length === 0 && textLayers.length === 0) {
        figma.ui.postMessage({ 
          type: 'error', 
          message: 'Please select frames or text layers to swap fonts' 
        })
        return
      }
      
      // Find all text nodes
      const textNodes: TextNode[] = []
      
      // Process text nodes from frames
      frames.forEach(frame => {
        frame.findAll(node => node.type === 'TEXT').forEach(textNode => {
          const textElement = textNode as TextNode
          if (!isLmaNode(textElement)) textNodes.push(textElement)
        })
      })
      
      // Process directly selected text layers
      textLayers.forEach(textLayer => {
        if (!isLmaNode(textLayer)) textNodes.push(textLayer)
      })
      
      console.log(`Total text nodes found for font swap: ${textNodes.length}`)
      
      if (textNodes.length === 0) {
        figma.ui.postMessage({ 
          type: 'error', 
          message: 'No text found in selected frames or text layers' 
        })
        return
      }
      
      const relevantNodes = textNodes
      console.log(`Processing all ${relevantNodes.length} text nodes`)
      
      figma.ui.postMessage({ 
        type: 'font-swap-started', 
        count: relevantNodes.length 
      })
      
      let swappedCount = 0
      let errors = 0
      let skippedCount = 0
      
      // Process font swaps with progress updates
      for (let i = 0; i < relevantNodes.length; i++) {
        const textNode = relevantNodes[i]
        
        try {
          // Update progress
          figma.ui.postMessage({
            type: 'font-swap-progress',
            current: i + 1,
            total: relevantNodes.length,
            message: `Swapping font ${i + 1} of ${relevantNodes.length}...`
          })
          
          const result = await swapFontFamily(textNode, msg.targetFont, msg.applyFontStyles)
          
          if (result === 'success') {
            swappedCount++
            console.log(`✅ Font swapped successfully for text node ${i + 1}`)
          } else if (result === 'error') {
            errors++
            console.log(`❌ Failed to swap font for text node ${i + 1}`)
          } else {
            skippedCount++
            console.log(`⚠️ Skipped font swap for text node ${i + 1}`)
          }
          
          // Small delay to prevent any potential issues
          await new Promise(resolve => setTimeout(resolve, 50))
          
        } catch (error) {
          console.error(`Error swapping font for text ${i + 1}:`, error)
          errors++
          
          figma.ui.postMessage({
            type: 'font-swap-error',
            message: `Failed to swap font for text ${i + 1}`
          })
        }
      }
      
      // Final results - now includes skipped count
      figma.ui.postMessage({ 
        type: 'font-swap-complete', 
        count: swappedCount,
        errors: errors,
        skipped: skippedCount,
        total: relevantNodes.length
      })
      
      if (swappedCount > 0) {
        figma.notify(`✅ Swapped ${swappedCount} fonts${skippedCount > 0 ? `, skipped ${skippedCount}` : ''}!`)
      } else {
        figma.notify(`❌ Font swap failed. Check if the target font is available.`)
      }
      
    } catch (error) {
      console.error('Font swap error:', error)
      figma.ui.postMessage({ 
        type: 'error', 
        message: `Error: ${(error as Error).message}` 
      })
    }
  }
} 

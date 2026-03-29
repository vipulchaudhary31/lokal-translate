import { showUI } from '@create-figma-plugin/utilities'

export default function () {
  const options = { width: 360, height: 520 }
  const data = { greeting: 'Lokal Translate is ready!' }
  showUI(options, data)
}

const DEBUG_LOGS = false
const debugLog: (...args: unknown[]) => void = DEBUG_LOGS ? console.log.bind(console) : () => {}
const debugWarn: (...args: unknown[]) => void = DEBUG_LOGS ? console.warn.bind(console) : () => {}
const REFINE_DEBUG = true
const refineLog: (...args: unknown[]) => void = REFINE_DEBUG ? console.log.bind(console, '[REFINE DEBUG]') : () => {}
const refineWarn: (...args: unknown[]) => void = REFINE_DEBUG ? console.warn.bind(console, '[REFINE DEBUG]') : () => {}

// Sarvam AI API configuration
const SARVAM_API_KEY_STORAGE_KEY = 'ai-translate-sarvam-api-key'
const GEMINI_API_KEY_STORAGE_KEY = 'ai-translate-gemini-api-key'
const REFINE_THREADS_STORAGE_KEY = 'ai-translate-refine-threads'
const SARVAM_API_URL = 'https://api.sarvam.ai/translate'
const SARVAM_LANGUAGE_DETECT_URL = 'https://api.sarvam.ai/text-lid'
const SARVAM_TRANSLITERATE_URL = 'https://api.sarvam.ai/transliterate'
const SARVAM_CHAT_COMPLETIONS_URL = 'https://api.sarvam.ai/v1/chat/completions'
const GEMINI_GENERATE_CONTENT_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
const MAYURA_TRANSLATE_MAX_CHARS = 1000
const SARVAM_TRANSLATE_MAX_CHARS = 2000
const REFINE_MAX_CHARS = 2000
const REFINE_MODEL = 'gemini-2.5-flash'

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

type TranslationMode = 'sarvam-translate' | 'formal' | 'classic-colloquial' | 'modern-colloquial' | 'transliterate'
type ApiTranslationMode = 'formal' | 'classic-colloquial' | 'modern-colloquial'
type TranslationRequestConfig = {
  model: 'sarvam-translate:v1' | 'mayura:v1'
  mode: ApiTranslationMode
  maxChars: number
  modelLabel: string
  outputScript?: 'spoken-form-in-native' | 'fully-native'
}
const TRANSLATION_MEMORY_KEY = 'lokal-translation-memory-v1'
type StoredTranslationEntry = {
  sourceText: string
  translatedText: string
  sourceLanguage: string
  targetLanguage: string
  mode: TranslationMode
}
type StoredTranslationMemory = {
  node?: StoredTranslationEntry
  range?: StoredTranslationEntry
}
type RefineSelectionContext = {
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
type RefineSuggestion = {
  label: string
  text: string
  note?: string
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
type RefineVariant = {
  label: string
  instruction: string
  note?: string
}

const BASE_REFINE_VARIANTS: RefineVariant[] = [
  {
    label: 'Sarvam',
    instruction: 'Rewrite this text in a neutral default style. Keep the meaning intact and keep it UI-friendly.',
    note: 'Default model with broader language support',
  },
  {
    label: 'Formal',
    instruction: 'Rewrite this text in a polished, structured, formal style. Keep the meaning intact and keep it UI-friendly.',
    note: 'Polished and neutral',
  },
  {
    label: 'Classic',
    instruction: 'Rewrite this text in natural everyday phrasing. Keep the meaning intact and keep it UI-friendly.',
    note: 'Natural everyday phrasing',
  },
  {
    label: 'Modern',
    instruction: 'Rewrite this text in a current, conversational style. Keep the meaning intact and keep it UI-friendly.',
    note: 'More current and conversational',
  },
]

function sanitizeRefineThreads(value: unknown): Record<string, RefineThreadState> {
  if (!value || typeof value !== 'object') return {}

  const entries = Object.entries(value as Record<string, unknown>)
  const limitedEntries = entries.slice(-40)
  const sanitized: Record<string, RefineThreadState> = {}

  for (const [key, thread] of limitedEntries) {
    if (!thread || typeof thread !== 'object') continue
    const rawThread = thread as Partial<RefineThreadState>
    const selectionKey = typeof rawThread.selectionKey === 'string' && rawThread.selectionKey.trim()
      ? rawThread.selectionKey.trim()
      : key
    const nodeId = typeof rawThread.nodeId === 'string' ? rawThread.nodeId.trim() : ''
    if (!nodeId) continue
    const seedText = typeof rawThread.seedText === 'string' ? rawThread.seedText : ''
    const turns = Array.isArray(rawThread.turns)
      ? rawThread.turns
          .filter(turn =>
            turn &&
            typeof turn === 'object' &&
            (((turn as RefineConversationTurn).role === 'user') || ((turn as RefineConversationTurn).role === 'assistant')) &&
            typeof (turn as RefineConversationTurn).content === 'string' &&
            (turn as RefineConversationTurn).content.trim().length > 0
          )
          .slice(-20)
          .map(turn => ({
            role: (turn as RefineConversationTurn).role,
            content: (turn as RefineConversationTurn).content.trim(),
          }))
      : []

    sanitized[selectionKey] = {
      selectionKey,
      nodeId,
      seedText,
      turns,
    }
  }

  return sanitized
}

async function loadRefineThreads(): Promise<Record<string, RefineThreadState>> {
  try {
    const saved = await figma.clientStorage.getAsync(REFINE_THREADS_STORAGE_KEY)
    return sanitizeRefineThreads(saved)
  } catch {
    return {}
  }
}

async function saveRefineThreads(threads: unknown): Promise<Record<string, RefineThreadState>> {
  const sanitized = sanitizeRefineThreads(threads)
  await figma.clientStorage.setAsync(REFINE_THREADS_STORAGE_KEY, sanitized)
  return sanitized
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

class TranslationLengthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TranslationLengthError'
  }
}

class TranslationRestyleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TranslationRestyleError'
  }
}

function getTranslationConfig(mode: TranslationMode): TranslationRequestConfig {
  if (mode === 'transliterate') {
    return {
      model: 'sarvam-translate:v1',
      mode: 'formal',
      maxChars: 1000,
      modelLabel: 'Sarvam Transliterate',
    }
  }

  if (mode === 'sarvam-translate') {
    return {
      model: 'sarvam-translate:v1',
      mode: 'formal',
      maxChars: SARVAM_TRANSLATE_MAX_CHARS,
      modelLabel: 'Sarvam Translate v1',
    }
  }

  return {
    model: 'mayura:v1',
    mode,
    maxChars: MAYURA_TRANSLATE_MAX_CHARS,
    modelLabel: 'Mayura',
    outputScript: mode === 'classic-colloquial' || mode === 'modern-colloquial'
      ? 'fully-native'
      : undefined,
  }
}

function getTranslateLimitMessage(config: TranslationRequestConfig, subject: string, charCount: number): string {
  return `${config.modelLabel} supports up to ${config.maxChars} characters per translation request. ${subject} has ${charCount} characters. Please select less text and try again.`
}

function assertTranslateLength(text: string, subject: string, config: TranslationRequestConfig): string {
  const cleanText = text.trim()
  if (cleanText.length > config.maxChars) {
    throw new TranslationLengthError(getTranslateLimitMessage(config, subject, cleanText.length))
  }
  return cleanText
}

function getAlreadyTranslatedMessage(targetLanguage: string): string {
  const targetLabel = BULK_LANGUAGE_LABELS[targetLanguage] || (targetLanguage === 'en' ? 'English' : targetLanguage)
  return `Selected text is already in ${targetLabel}.`
}

function getTranslationStyleLabel(mode: TranslationMode): string {
  if (mode === 'sarvam-translate') return 'Sarvam'
  if (mode === 'formal') return 'Formal'
  if (mode === 'classic-colloquial') return 'Classic'
  if (mode === 'transliterate') return 'Transliterate'
  return 'Modern'
}

function readTranslationMemory(node: TextNode): StoredTranslationMemory {
  try {
    const raw = node.getPluginData(TRANSLATION_MEMORY_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StoredTranslationMemory
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeTranslationMemory(node: TextNode, memory: StoredTranslationMemory): void {
  try {
    node.setPluginData(TRANSLATION_MEMORY_KEY, JSON.stringify(memory))
  } catch {
    // Ignore plugin data write failures.
  }
}

function storeNodeTranslationMemory(node: TextNode, entry: StoredTranslationEntry): void {
  const memory = readTranslationMemory(node)
  memory.node = entry
  writeTranslationMemory(node, memory)
}

function storeRangeTranslationMemory(node: TextNode, entry: StoredTranslationEntry): void {
  const memory = readTranslationMemory(node)
  memory.range = entry
  writeTranslationMemory(node, memory)
}

async function resolveActualSourceLanguage(
  text: string,
  sourceLanguage: string | undefined,
  session?: SessionCache
): Promise<string> {
  if (sourceLanguage === 'en') return 'en'
  return await detectLanguage(text, session)
}

function resolveRestyleTranslation(
  node: TextNode,
  kind: 'node' | 'range',
  currentText: string,
  targetLanguage: string,
  mode: TranslationMode
): {
  status: 'restyle' | 'already' | 'missing'
  sourceText?: string
  sourceLanguage?: string
  message: string
} {
  const memory = readTranslationMemory(node)
  const entry = kind === 'range' ? memory.range : memory.node
  const targetLabel = BULK_LANGUAGE_LABELS[targetLanguage] || (targetLanguage === 'en' ? 'English' : targetLanguage)
  const styleLabel = getTranslationStyleLabel(mode)

  if (!entry || entry.targetLanguage !== targetLanguage) {
    return {
      status: 'missing',
      message: `Selected text is already in ${targetLabel}, but its original source wasn't saved. Re-translate from the original source first before swapping styles.`,
    }
  }

  if (normalizeTextForCache(entry.translatedText) !== normalizeTextForCache(currentText)) {
    return {
      status: 'missing',
      message: `Selected text changed after translation, so Lokal Translate can't safely swap styles for it. Re-translate from the original source first.`,
    }
  }

  if (entry.mode === mode) {
    return {
      status: 'already',
      message: `Selected text is already in ${targetLabel} with the ${styleLabel} style.`,
    }
  }

  return {
    status: 'restyle',
    sourceText: entry.sourceText,
    sourceLanguage: entry.sourceLanguage,
    message: '',
  }
}

function assertRefineLength(text: string, subject: string): string {
  const cleanText = text.trim()
  if (cleanText.length > REFINE_MAX_CHARS) {
    throw new Error(`Refine supports up to ${REFINE_MAX_CHARS} characters at a time. ${subject} has ${cleanText.length} characters. Please select less text and try again.`)
  }
  return cleanText
}

function sanitizeRefineText(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`]/g, ' ')
    .replace(/^(final answer|answer|rewrite|rewritten text)\s*:\s*/i, '')
    .replace(/^[-*•\d.)\s]+/, '')
    .replace(/^["“”']+|["“”']+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getRefineCandidateLines(content: string): string[] {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .split('\n')
    .map(line => sanitizeRefineText(line))
    .filter(Boolean)
    .filter(line => !/^(```|json\b)/i.test(line))
    .filter(line => !/^(here('|’)s|sure[,!]?|okay[,!]?|i('|’)ll|let('|’)s|the user|return only|instruction|selection kind|source text|text:|task:|requirements?:|reply with only|one line only|final answer only|do not )/i.test(line))
}

function readChatMessageContent(content: unknown): string {
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          if ('text' in item && typeof (item as { text?: unknown }).text === 'string') {
            return (item as { text: string }).text
          }
          if ('content' in item && typeof (item as { content?: unknown }).content === 'string') {
            return (item as { content: string }).content
          }
        }
        return ''
      })
      .join('\n')
      .trim()
  }
  if (content && typeof content === 'object') {
    if ('text' in content && typeof (content as { text?: unknown }).text === 'string') {
      return (content as { text: string }).text.trim()
    }
    if ('content' in content) {
      return readChatMessageContent((content as { content?: unknown }).content)
    }
  }
  return ''
}

function readChatMessageText(message: unknown): string {
  if (typeof message === 'string') return message.trim()
  if (!message || typeof message !== 'object') return ''
  const direct = readChatMessageContent((message as { content?: unknown }).content)
  if (direct) return direct
  const outputText = readChatMessageContent((message as { output_text?: unknown }).output_text)
  if (outputText) return outputText
  return ''
}

function extractTextCandidatesDeep(value: unknown, path: string[] = []): string[] {
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return []
    const pathKey = path.join('.').toLowerCase()
    if (/(^|\.)(id|object|model|role|finish_reason|created|index|usage|prompt_tokens|completion_tokens|total_tokens)$/.test(pathKey)) {
      return []
    }
    return [text]
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => extractTextCandidatesDeep(item, [...path, String(index)]))
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .flatMap(([key, child]) => extractTextCandidatesDeep(child, [...path, key]))
  }

  return []
}

function extractBestTextFromResponsePayload(payload: unknown): string {
  const candidates = Array.from(new Set(extractTextCandidatesDeep(payload)))
    .map(text => text.trim())
    .filter(Boolean)
    .filter(text => text.length <= 2000)
    .filter(text => !/^\{.*\}$/.test(text))

  const ranked = candidates.sort((a, b) => {
    const score = (input: string): number => {
      let value = 0
      if (input.length >= 2 && input.length <= 400) value += 8
      if (/\n/.test(input)) value += 3
      if (/[A-Za-z\u0900-\u0D7F]/.test(input)) value += 6
      if (/(selected text|instruction|analysis|reasoning|prompt_tokens|completion_tokens|finish_reason)/i.test(input)) value -= 10
      return value
    }
    return score(b) - score(a)
  })

  return ranked[0] || ''
}

function sanitizeRefineAnswer(content: string): string {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/<think>[\s\S]*$/gi, ' ')
    .replace(/```[a-z0-9_-]*\n?/gi, '')
    .replace(/```/g, '')
    .trim()
}

function readGeminiPartText(part: unknown): string {
  if (!part || typeof part !== 'object') return ''
  if ('text' in part && typeof (part as { text?: unknown }).text === 'string') {
    return (part as { text: string }).text
  }
  return ''
}

function readGeminiContentText(content: unknown): string {
  if (!content || typeof content !== 'object') return ''
  if ('parts' in content && Array.isArray((content as { parts?: unknown[] }).parts)) {
    return ((content as { parts: unknown[] }).parts || [])
      .map(readGeminiPartText)
      .join('')
      .trim()
  }
  return ''
}

function readGeminiResponseText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const candidates = (payload as { candidates?: Array<{ content?: unknown }> }).candidates
  if (!Array.isArray(candidates)) return ''
  for (const candidate of candidates) {
    const text = readGeminiContentText(candidate?.content)
    if (text) return text
  }
  return ''
}

function cleanRefineCompletion(content: string): string {
  const directFinalMatch = content.match(/<final>([\s\S]*?)<\/final>/i)?.[1]
  if (directFinalMatch) {
    return sanitizeRefineText(directFinalMatch)
  }

  const quotedMatch = content.match(/["“”']([^"“”']{2,160})["“”']/)
  if (quotedMatch) {
    const quoted = sanitizeRefineText(quotedMatch[1])
    if (quoted) return quoted
  }

  const lines = getRefineCandidateLines(content)
  if (lines.length === 0) return ''

  const nonMetaLines = lines
    .map(line => line.replace(/^(sarvam|formal|classic|modern|custom)\s*:\s*/i, '').trim())
    .filter(Boolean)

  if (nonMetaLines.length === 0) return ''

  const scoreLine = (line: string): number => {
    let score = 0
    const clean = sanitizeRefineText(line)
    if (!clean) return -1000
    if (/[\u0900-\u0D7F]/.test(clean)) score += 6
    if (/[A-Za-z]/.test(clean)) score += 3
    if (/^(do not|return only|reply with only|instruction|task|source text|selection kind)/i.test(clean)) score -= 20
    if (/(json|tags?|figma|ui copy|selection|source text|instruction|reply with only|one line only|final answer only)/i.test(clean)) score -= 12
    if (clean.length >= 2 && clean.length <= 40) score += 8
    if (clean.length > 40 && clean.length <= 90) score += 3
    if (clean.length > 120) score -= 8
    if (/^[\W_]+$/.test(clean)) score -= 25
    return score
  }

  const ranked = [...nonMetaLines].sort((a, b) => scoreLine(b) - scoreLine(a))
  return sanitizeRefineText(ranked[0])
}

function extractRefineCompletions(content: string, sourceText: string): string[] {
  const directFinalMatch = content.match(/<final>([\s\S]*?)<\/final>/i)?.[1]
  if (directFinalMatch) {
    const candidate = sanitizeRefineText(directFinalMatch)
    return isValidRefineCompletion(candidate, sourceText) ? [candidate] : []
  }

  const lines = getRefineCandidateLines(content)
    .map(line => line.replace(/^(sarvam|formal|classic|modern|custom)\s*:\s*/i, '').trim())
    .map(sanitizeRefineText)
    .filter(Boolean)

  const unique: string[] = []
  for (const line of lines) {
    if (!isValidRefineCompletion(line, sourceText)) continue
    if (unique.some(existing => normalizeTextForCache(existing) === normalizeTextForCache(line))) continue
    unique.push(line)
  }

  if (unique.length > 0) return unique

  const fallback = cleanRefineCompletion(content)
  return isValidRefineCompletion(fallback, sourceText) ? [fallback] : []
}

function isValidRefineCompletion(text: string, sourceText: string): boolean {
  const clean = sanitizeRefineText(text)
  if (!clean) return false
  if (clean.length > Math.max(sourceText.length * 8, 48)) return false
  if (/<think>|<\/think>|^\{|\}$/.test(clean)) return false
  if (/^(okay|sure|i('|’)ll|let('|’)s|the user|return only|json)/i.test(clean)) return false
  if (/generate json suggestions|source text|instruction:/i.test(clean)) return false
  return true
}

function getRequestedRefineScriptLanguage(prompt: string): string | null {
  const lower = prompt.toLowerCase()
  if (/\b(english|roman|latin)\s+script\b/.test(lower)) return 'en'
  if (/\bdevanagari\b/.test(lower) || /\bhindi\s+script\b/.test(lower)) return 'hi'
  if (/\bmarathi\s+script\b/.test(lower)) return 'mr'
  if (/\bbengali\s+script\b/.test(lower)) return 'bn'
  if (/\bpunjabi\s+script\b/.test(lower) || /\bgurmukhi\b/.test(lower)) return 'pa'
  if (/\bgujarati\s+script\b/.test(lower)) return 'gu'
  if (/\btamil\s+script\b/.test(lower)) return 'ta'
  if (/\btelugu\s+script\b/.test(lower)) return 'te'
  if (/\bkannada\s+script\b/.test(lower)) return 'kn'
  if (/\bmalayalam\s+script\b/.test(lower)) return 'ml'
  return null
}

function scoreCustomRefineCandidate(candidate: string, prompt: string): number {
  const clean = sanitizeRefineText(candidate)
  if (!clean) return -1000

  let score = 0
  const lower = clean.toLowerCase()
  const promptLower = prompt.toLowerCase()

  if (clean.length >= 2 && clean.length <= 24) score += 6
  else if (clean.length <= 48) score += 3
  else score -= 4

  if (/^(analyze|synthesize|find|the core task|the target|user('|’)s request|request|task)/i.test(clean)) score -= 30
  if (/(user('|’)s request|selected text|equivalent|language\/script|instruction|analyze|synthesize)/i.test(clean)) score -= 25
  if (/^[\W_]+$/.test(clean)) score -= 20

  const quotedTarget = prompt.match(/["“”']([^"“”']{2,40})["“”']/)?.[1]?.toLowerCase()
  if (quotedTarget && lower.includes(quotedTarget)) score += 12

  const requestedScript = getRequestedRefineScriptLanguage(prompt)
  if (requestedScript === 'en') {
    if (!isInIndicScript(clean)) score += 8
    else score -= 8
  } else if (requestedScript) {
    if (isInIndicScript(clean)) score += 6
    else score -= 4
  }

  if (/\bscript\b/.test(promptLower) && /\b(personal|private)\b/i.test(clean)) score += 4
  return score
}

async function finalizeCustomRefineText(
  candidates: string[],
  prompt: string,
  session?: SessionCache
): Promise<string> {
  const ranked = [...candidates].sort((a, b) => scoreCustomRefineCandidate(b, prompt) - scoreCustomRefineCandidate(a, prompt))
  let best = sanitizeRefineText(ranked[0] || '')
  if (!best) return ''

  const requestedScript = getRequestedRefineScriptLanguage(prompt)
  if (!requestedScript) return best

  if (requestedScript === 'en') {
    if (isInIndicScript(best)) {
      const sourceLanguage = await detectLanguage(best, session)
      best = await transliterateText(best, sourceLanguage || 'hi', 'en', session)
    }
    return sanitizeRefineText(best)
  }

  if (!isInIndicScript(best)) {
    best = await transliterateText(best, 'en', requestedScript, session)
    return sanitizeRefineText(best)
  }

  const detectedLanguage = await detectLanguage(best, session)
  if (detectedLanguage !== requestedScript) {
    best = await transliterateText(best, detectedLanguage || 'hi', requestedScript, session)
  }
  return sanitizeRefineText(best)
}

async function isTextAlreadyInTargetLanguage(
  text: string,
  targetLanguage: string,
  session?: SessionCache
): Promise<boolean> {
  const cleanText = text.trim()
  if (!cleanText) return false

  if (targetLanguage === 'en') {
    return !isInIndicScript(cleanText)
  }

  const detected = await detectLanguage(cleanText, session)
  return detected === targetLanguage && isInIndicScript(cleanText)
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
  'pa': 'Noto Sans Gurmukhi',      // Punjabi
  'ta': 'Noto Sans Tamil UI',      // Tamil
  'te': 'Kohinoor Telugu',         // Telugu (special case)
  'kn': 'Noto Sans Kannada UI',    // Kannada
  'ml': 'Noto Sans Malayalam UI',  // Malayalam
  'en': 'Inter'                    // English/Latin
}

const FONT_FAMILY_ALIASES: Record<string, string[]> = {
  'Noto Sans Gurmukhi UI': ['Noto Sans Gurmukhi'],
  'Noto Sans Gurmukhi': ['Noto Sans Gurmukhi UI'],
}

const loadedFontCache = new Set<string>()
const failedFontCache = new Set<string>()
let availableFontFamiliesCache: string[] | null = null
let availableFontFamiliesPromise: Promise<string[]> | null = null
const libraryTextStyleCache = new Map<string, Promise<TextStyle | null>>()
let sarvamApiKeyCache: string | null | undefined = undefined
let geminiApiKeyCache: string | null | undefined = undefined

function fontCacheKey(font: FontName): string {
  return `${font.family}__${font.style}`
}

function getFontFamilyCandidates(family: string): string[] {
  return Array.from(new Set([family, ...(FONT_FAMILY_ALIASES[family] || [])]))
}

async function loadFontCached(font: FontName): Promise<boolean> {
  const key = fontCacheKey(font)
  if (loadedFontCache.has(key)) return true
  if (failedFontCache.has(key)) return false
  try {
    await figma.loadFontAsync(font)
    loadedFontCache.add(key)
    return true
  } catch {
    failedFontCache.add(key)
    return false
  }
}

async function resolveAvailableFont(families: string[], styles: string[]): Promise<FontName | null> {
  for (const family of families) {
    for (const style of styles) {
      const candidate: FontName = { family, style: style || 'Regular' }
      if (await loadFontCached(candidate)) return candidate
    }
  }
  return null
}

async function getAvailableFontFamilies(): Promise<string[]> {
  if (availableFontFamiliesCache) return availableFontFamiliesCache
  if (availableFontFamiliesPromise) return availableFontFamiliesPromise

  availableFontFamiliesPromise = (async () => {
    const fonts = await figma.listAvailableFontsAsync()
    const families = Array.from(
      new Set(
        fonts
          .map(f => (f.fontName && f.fontName.family) || '')
          .filter(name => {
            const t = (name || '').trim()
            if (!t) return false
            if (/^[\s?\uFFFD]+$/.test(t)) return false
            if (!/[a-zA-Z0-9\u00C0-\u024F]/.test(t)) return false
            return true
          })
      )
    ).sort((a, b) => a.localeCompare(b))
    availableFontFamiliesCache = families
    return families
  })()

  try {
    return await availableFontFamiliesPromise
  } finally {
    availableFontFamiliesPromise = null
  }
}

async function getLibraryTextStyleById(styleId: string): Promise<TextStyle | null> {
  const cached = libraryTextStyleCache.get(styleId)
  if (cached) return cached

  const pending = (async () => {
    try {
      const style = await figma.getStyleByIdAsync(styleId)
      return style && style.type === 'TEXT' ? (style as TextStyle) : null
    } catch {
      return null
    }
  })()

  libraryTextStyleCache.set(styleId, pending)
  return pending
}

async function loadSarvamApiKey(): Promise<string> {
  if (sarvamApiKeyCache !== undefined) return sarvamApiKeyCache ?? ''
  try {
    const saved = await figma.clientStorage.getAsync(SARVAM_API_KEY_STORAGE_KEY)
    sarvamApiKeyCache = typeof saved === 'string' ? saved.trim() : ''
  } catch {
    sarvamApiKeyCache = ''
  }
  return sarvamApiKeyCache
}

async function saveSarvamApiKey(apiKey: string): Promise<string> {
  const normalized = apiKey.trim()
  await figma.clientStorage.setAsync(SARVAM_API_KEY_STORAGE_KEY, normalized)
  sarvamApiKeyCache = normalized
  return normalized
}

async function requireSarvamApiKey(): Promise<string> {
  const apiKey = await loadSarvamApiKey()
  if (!apiKey) throw new Error('Please add your Sarvam API key to use this plugin.')
  return apiKey
}

async function loadGeminiApiKey(): Promise<string> {
  if (geminiApiKeyCache !== undefined) return geminiApiKeyCache ?? ''
  try {
    const saved = await figma.clientStorage.getAsync(GEMINI_API_KEY_STORAGE_KEY)
    geminiApiKeyCache = typeof saved === 'string' ? saved.trim() : ''
  } catch {
    geminiApiKeyCache = ''
  }
  return geminiApiKeyCache
}

async function saveGeminiApiKey(apiKey: string): Promise<string> {
  const normalized = apiKey.trim()
  await figma.clientStorage.setAsync(GEMINI_API_KEY_STORAGE_KEY, normalized)
  geminiApiKeyCache = normalized
  return normalized
}

async function requireGeminiApiKey(): Promise<string> {
  const apiKey = await loadGeminiApiKey()
  if (!apiKey) throw new Error('Please add your Gemini API key to use Refine.')
  return apiKey
}

// Font prefs cache (loaded at start of translate, updated on save)
let fontPrefsCache: Record<string, string> | null = null
const FONT_PREFS_KEY = 'ai-translate-font-prefs'
const USAGE_HINT_SEEN_KEY = 'ai-translate-usage-hint-seen'

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
      debugWarn('[Apply styles] Failed to re-apply decoration', r, e)
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
      debugLog('[Apply styles] Skip: could not get source style from node')
      return false
    }
    const mappings = await loadStyleMappings()
    const langMap = mappings[targetLanguage]
    if (!langMap) {
      debugLog('[Apply styles] No mappings for language:', targetLanguage)
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
      if (target) debugLog('[Apply styles] Using font+weight match:', bestKey, '→', target)
    }
    if (!target) {
      debugLog('[Apply styles] No mapping for key:', key, 'available keys:', Object.keys(langMap))
      return false
    }
    if (target === 'skip') {
      debugLog('[Apply styles] Mapping is skip for:', key)
      return false
    }
    // Resolve style by ID — try async API first (works for local + library), then async local scan
    let style: TextStyle | null = null
    try {
      const found = await figma.getStyleByIdAsync(target)
      style = found && found.type === 'TEXT' ? (found as TextStyle) : null
    } catch { style = null }
    if (!style) {
      try {
        const locals: TextStyle[] = typeof (figma as any).getLocalTextStylesAsync === 'function'
          ? await (figma as any).getLocalTextStylesAsync()
          : figma.getLocalTextStyles()
        style = locals.find(s => s.id === target) ?? null
      } catch { style = null }
    }
    if (!style) {
      debugWarn('[Apply styles] Style not found (local or library):', target)
      return false
    }
    try {
      const fn = style.fontName as FontName
      const loaded = await loadFontCached(fn)
      if (!loaded) return false
      await textNode.setTextStyleIdAsync(style.id)
      if (decorationRanges.length > 0) reapplyDecorations(textNode, decorationRanges)
      debugLog('[Apply styles] Applied user mapping:', style.name)
      return true
    } catch (e) {
      debugWarn('[Apply styles] Failed to apply', style.name, e)
      return false
    }
  } catch (e) {
    debugWarn('applyUserDefinedStyleMapping error:', e)
    return false
  }
}

// Load all fonts used in a text node (required before modifying – supports mixed fonts/styles)
async function loadAllFontsForTextNode(node: TextNode): Promise<void> {
  const len = node.characters.length
  if (len === 0) {
    const fn = node.fontName
    if (fn !== figma.mixed && fn && typeof fn === 'object' && 'family' in fn) {
      await loadFontCached(fn as FontName)
    }
    return
  }
  const fonts = node.getRangeAllFontNames(0, len)
  const uniqueFonts = Array.from(new Map(fonts.map(f => [fontCacheKey(f), f])).values())
  await Promise.all(uniqueFonts.map(f => loadFontCached(f)))
}

// Function to load font before using it
async function loadFont(fontName: string, textNode: TextNode): Promise<void> {
  try {
    debugLog(`Loading font: ${fontName}`)
    
    // Get current font properties to preserve weight and style
    const currentFont = textNode.fontName as FontName
    
    const weightVariants = getWeightStyleNamesToTry(currentFont.style)
    const fontToLoad = await resolveAvailableFont(getFontFamilyCandidates(fontName), weightVariants)
    if (fontToLoad) {
      debugLog(`Successfully loaded: ${fontToLoad.family} ${fontToLoad.style}`)
      return
    }
    
    // If all weights failed, fall back to Noto Sans with weight mapping
    debugWarn(`Could not load any variant of ${fontName}, using Noto Sans`)
    const weightOpts = getWeightStyleNamesToTry(currentFont.style)
    const notoSans = await resolveAvailableFont(['Noto Sans'], weightOpts)
    if (notoSans) return
    await loadFontCached({ family: 'Noto Sans', style: 'Regular' })
    
  } catch (error) {
    console.error(`Error loading font ${fontName}:`, error)
    const wOpts = getWeightStyleNamesToTry((textNode.fontName as FontName).style)
    const notoSans = await resolveAvailableFont(['Noto Sans'], wOpts)
    if (notoSans) return
    await loadFontCached({ family: 'Noto Sans', style: 'Regular' })
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
  const preferredFont = await resolveAvailableFont(getFontFamilyCandidates(newFontFamily), styleNames)
  if (preferredFont) return preferredFont
  const defaultFamily = LANGUAGE_FONTS[targetLanguage as keyof typeof LANGUAGE_FONTS] || 'Noto Sans'
  const fallbackStyles = getWeightStyleNamesToTry(originalWeight)
  const fallbackFamilies = defaultFamily !== newFontFamily
    ? [...getFontFamilyCandidates(defaultFamily), 'Noto Sans']
    : ['Noto Sans']
  return await resolveAvailableFont(fallbackFamilies, fallbackStyles)
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
    debugWarn('applySegmentStylesToRange failed', start, end, e)
  }
}

// Translate text node with mixed styles – preserves all original properties (font weight, strikethrough, fills, etc.)
async function translateWithStyledSegments(
  node: TextNode,
  targetLanguage: string,
  sourceLanguage: string | undefined,
  session: SessionCache,
  mode: TranslationMode = 'sarvam-translate'
): Promise<{ success: boolean; weightMappings: string[]; wasMixed: boolean }> {
  const segments = node.getStyledTextSegments([...STYLE_FIELDS])
  if (segments.length === 0) return { success: false, weightMappings: [], wasMixed: false }

  const wasMixed = segments.length > 1
  const targetLang = targetLanguage
  const translatedParts: string[] = []
  for (const seg of segments) {
    const match = seg.characters.match(/^(\s*)([\s\S]*?)(\s*)$/)
    const leadingWhitespace = match?.[1] || ''
    const coreText = match?.[2] || ''
    const trailingWhitespace = match?.[3] || ''
    const translatedCore = coreText.trim().length > 0
      ? await transformTextForMode(coreText, targetLang, sourceLanguage, session, mode)
      : coreText
    const t = `${leadingWhitespace}${translatedCore}${trailingWhitespace}`
    if (!t) return { success: false, weightMappings: [], wasMixed }
    translatedParts.push(t)
  }
  const fullText = translatedParts.join('')
  // If segment-wise translation results in exactly the same text, treat this as a
  // non-success so that callers can fall back to whole-text translation and surface
  // a clear message instead of silently doing nothing.
  if (fullText === node.characters) {
    debugLog('translateWithStyledSegments: no text change after segment translation, will fall back to whole-text translate.')
    return { success: false, weightMappings: [], wasMixed }
  }
  const weightMappings: string[] = []
  const firstWeight = (segments[0].fontName as FontName)?.style || 'Regular'
  const firstTarget = await getTargetFontForRange(targetLang, firstWeight)
  if (firstTarget) {
    await loadFontCached(firstTarget)
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
  return { success: true, weightMappings, wasMixed }
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
    debugLog(`Font already correct: ${newFontFamily}`)
    return {success: true}
  }
  
  debugLog(`Changing font from "${currentFont.family} ${currentFont.style}" to "${newFontFamily}"`)
  
  const originalWeight = currentFont.style
  const originalNumeric = styleNameToWeight(originalWeight)
  
  try {
    const styleNames = getWeightStyleNamesToTry(originalWeight)
    let fontApplied = false
    let appliedStyle = ''
    
    const targetFont = await resolveAvailableFont(getFontFamilyCandidates(newFontFamily), styleNames)
    if (targetFont) {
      textNode.fontName = targetFont
      appliedStyle = targetFont.style || 'Regular'
      fontApplied = true
    }
    
    if (!fontApplied) {
      const defaultForLang = LANGUAGE_FONTS[targetLanguage as keyof typeof LANGUAGE_FONTS] || 'Noto Sans'
      const fallbackFamilies = defaultForLang !== newFontFamily
        ? [...getFontFamilyCandidates(defaultForLang), 'Noto Sans']
        : ['Noto Sans']
      const fallbackFont = await resolveAvailableFont(fallbackFamilies, styleNames)
      if (fallbackFont) {
        textNode.fontName = fallbackFont
        return {
          success: true,
          mappingUsed: `${originalWeight} → ${fallbackFont.family} ${fallbackFont.style || 'Regular'} (fallback)`,
          originalWeight
        }
      }
      const lastResort: FontName = { family: 'Noto Sans', style: 'Regular' }
      await loadFontCached(lastResort)
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
  lid: Map<string, string>; tr: Map<string, string>; tl: Map<string, string>; rf: Map<string, RefineSuggestion[]>;
  lastApiTime?: number;
}
function createSessionCache(): SessionCache {
  return { lid: new Map(), tr: new Map(), tl: new Map(), rf: new Map(), lastApiTime: 0 }
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
    const apiKey = await requireSarvamApiKey()
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
      debugLog(`LID cache hit: "${norm.substring(0, 30)}..." → ${cached}`)
      return cached
    }

    const requestBody = { input: cleanText.substring(0, 500) }
    debugLog('Language detection request:', cleanText.substring(0, 50) + '...')
    await rateLimitBeforeApiCall(session)

    const response = await fetchWithTimeout(SARVAM_LANGUAGE_DETECT_URL, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
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
    debugLog(`Language detected: ${detectedLanguage} → ${mappedLanguage}`)
    session?.lid?.set(norm, mappedLanguage)
    await setCached(key, mappedLanguage)
    await trimCacheIfNeeded()
    return mappedLanguage
  } catch (error) {
    console.error('Language detection error:', error)
    return 'en' // Default to English on error
  }
}

async function getRefineSelectionContext(): Promise<RefineSelectionContext> {
  const selectedRange = await getActiveSelectedTextRange()
  if (selectedRange) {
    const selectedText = selectedRange.node.characters.slice(selectedRange.start, selectedRange.end)
    const cleanText = selectedText.trim()
    if (!cleanText) {
      return {
        canRefine: false,
        kind: 'invalid',
        text: '',
        charCount: 0,
        message: 'Highlight some text to refine.',
      }
    }
    return {
      canRefine: true,
      kind: 'range',
      text: selectedText,
      layerText: selectedRange.node.characters,
      charCount: cleanText.length,
      nodeId: selectedRange.node.id,
      nodeName: selectedRange.node.name || 'Text',
      start: selectedRange.start,
      end: selectedRange.end,
    }
  }

  const selection = figma.currentPage.selection
  if (selection.length !== 1 || selection[0].type !== 'TEXT') {
    return {
      canRefine: false,
      kind: 'invalid',
      text: '',
      charCount: 0,
      message: 'Select one text layer or highlight a text range to refine.',
    }
  }

  const node = selection[0] as TextNode
  const cleanText = node.characters.trim()
  if (!cleanText) {
    return {
      canRefine: false,
      kind: 'invalid',
      text: '',
      charCount: 0,
      message: 'The selected text layer is empty.',
    }
  }

  return {
    canRefine: true,
    kind: 'node',
    text: node.characters,
    layerText: node.characters,
    charCount: cleanText.length,
    nodeId: node.id,
    nodeName: node.name || 'Text',
  }
}

async function requestRefineSuggestion(
  apiKey: string,
  text: string,
  kind: 'node' | 'range',
  variant: RefineVariant,
  preserveScript = true,
  session?: SessionCache
): Promise<RefineSuggestion | null> {
  const normalizedText = normalizeTextForCache(text)
  const normalizedInstruction = normalizeTextForCache(variant.instruction)
  const cacheId = cacheKey('rfv4', REFINE_MODEL, variant.label, preserveScript ? 'preserve' : 'flex', normalizedInstruction, normalizedText)
  const sessionKey = `${REFINE_MODEL}|${variant.label}|${preserveScript ? 'preserve' : 'flex'}|${normalizedInstruction}|${normalizedText}`

  if (session?.rf) {
    const hit = session.rf.get(sessionKey)
    if (hit?.[0]) {
      refineLog('session cache hit', {
        label: variant.label,
        kind,
        preserveScript,
        text: text.slice(0, 80),
        result: hit[0].text,
      })
      return hit[0]
    }
  }

  const cached = await getCached<RefineSuggestion[]>(cacheId)
  if (cached?.[0]) {
    session?.rf?.set(sessionKey, cached)
    refineLog('storage cache hit', {
      label: variant.label,
      kind,
      preserveScript,
      text: text.slice(0, 80),
      result: cached[0].text,
    })
    return cached[0]
  }

  const runRequest = async (extraStrict: boolean, simplifiedPrompt: boolean): Promise<string> => {
    const requestBody = {
      model: REFINE_MODEL,
      temperature: 0.2,
      top_p: 1,
      max_tokens: 120,
      n: 1,
      messages: [
        {
          role: 'system',
          content: [
            'You rewrite UX copy for Figma text layers.',
            'Return exactly one rewritten option.',
            'Do not explain.',
            'Do not add labels.',
            'Do not output JSON.',
            'Do not output <think> tags.',
            'Do not mention the instruction.',
            'Do not include quotes.',
            preserveScript
              ? 'Keep the output in the same language and script as the source text.'
              : 'Keep the output in the same language as the source text unless the instruction explicitly asks for a different language or script.',
            extraStrict ? 'One line only. Final answer only. No preamble.' : '',
          ].join(' '),
        },
        {
          role: 'user',
          content: simplifiedPrompt
            ? [
                `Selection kind: ${kind}.`,
                `Selected text: ${text}`,
                `Task: ${variant.instruction}`,
                'Reply with only the rewritten text.',
              ].join('\n')
            : [
                `Selection kind: ${kind}.`,
                `Selected text: ${text}`,
                `Task: ${variant.instruction}`,
                'Reply with only the rewritten text.',
              ].join('\n'),
        },
      ],
    }

    refineLog('request', {
      label: variant.label,
      kind,
      preserveScript,
      extraStrict,
      simplifiedPrompt,
      model: REFINE_MODEL,
      text,
      instruction: variant.instruction,
    })

    await rateLimitBeforeApiCall(session)
    const response = await fetchWithTimeout(SARVAM_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    refineLog('response', {
      label: variant.label,
      status: response.status,
      ok: response.ok,
      body: responseText,
    })
    if (!response.ok) {
      const errMsg = parseSarvamErrorBody(responseText, response.status)
      throw new Error(errMsg)
    }

    const data = JSON.parse(responseText) as {
      choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown; output_text?: unknown } }>
    }
    refineLog('parsed choice', {
      label: variant.label,
      message: data.choices?.[0]?.message,
    })
    return readChatMessageText(data.choices?.[0]?.message)
  }

  let cleaned = cleanRefineCompletion(await runRequest(false, false))
  refineLog('cleaned attempt 1', { label: variant.label, cleaned, valid: isValidRefineCompletion(cleaned, text) })
  if (!isValidRefineCompletion(cleaned, text)) {
    cleaned = cleanRefineCompletion(await runRequest(true, false))
    refineLog('cleaned attempt 2', { label: variant.label, cleaned, valid: isValidRefineCompletion(cleaned, text) })
  }
  if (!isValidRefineCompletion(cleaned, text)) {
    cleaned = cleanRefineCompletion(await runRequest(true, true))
    refineLog('cleaned attempt 3', { label: variant.label, cleaned, valid: isValidRefineCompletion(cleaned, text) })
  }
  if (!isValidRefineCompletion(cleaned, text)) {
    refineWarn('invalid refine response after all attempts', {
      label: variant.label,
      kind,
      sourceText: text,
      instruction: variant.instruction,
    })
    return null
  }

  const suggestion: RefineSuggestion = {
    label: variant.label,
    text: cleaned,
    note: variant.note,
  }
  session?.rf?.set(sessionKey, [suggestion])
  await setCached(cacheId, [suggestion])
  await trimCacheIfNeeded()
  return suggestion
}

async function generateBaseRefineSuggestions(
  text: string,
  kind: 'node' | 'range',
  session?: SessionCache
): Promise<RefineSuggestion[]> {
  const apiKey = await requireSarvamApiKey()
  const cleanText = assertRefineLength(text, 'Selected text')
  const normalizedText = normalizeTextForCache(cleanText)
  const key = cacheKey('rf-base-v4', REFINE_MODEL, normalizedText)
  const sessionKey = `${REFINE_MODEL}|base|${normalizedText}`

  if (session?.rf) {
    const hit = session.rf.get(sessionKey)
    if (hit) return hit
  }

  const cached = await getCached<RefineSuggestion[]>(key)
  if (cached != null) {
    session?.rf?.set(sessionKey, cached)
    return cached
  }

  const suggestions: RefineSuggestion[] = []
  for (const variant of BASE_REFINE_VARIANTS) {
    const suggestion = await requestRefineSuggestion(apiKey, cleanText, kind, variant, true, session)
    if (suggestion) suggestions.push(suggestion)
  }

  const deduped = suggestions.filter((item, index, list) =>
    list.findIndex(candidate => candidate.label === item.label) === index
  )
  if (deduped.length === 0) {
    throw new Error('Could not generate refine options right now. Please try again.')
  }

  session?.rf?.set(sessionKey, deduped)
  await setCached(key, deduped)
  await trimCacheIfNeeded()
  return deduped
}

async function generateCustomRefineAnswer(
  text: string,
  customPrompt: string,
  kind: 'node' | 'range',
  history: RefineConversationTurn[] = [],
  fullLayerText?: string,
  session?: SessionCache
): Promise<string> {
  const apiKey = await requireGeminiApiKey()
  const cleanText = assertRefineLength(text, 'Selected text')
  const normalizedPrompt = normalizeTextForCache(customPrompt || '')
  if (!normalizedPrompt) return ''
  const sanitizedHistory = history
    .filter(turn => turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string')
    .map(turn => ({
      role: turn.role,
      content: turn.content.trim(),
    }))
    .filter(turn => turn.content.length > 0)
    .slice(-6)

  refineLog('generate custom refine', {
    kind,
    text: cleanText,
    prompt: customPrompt,
    history: sanitizedHistory,
  })

  const requestBody = {
    system_instruction: {
      parts: [
        {
          text: [
            'You are Lokal Refine, a chatbot-style writing assistant inside a Figma plugin.',
            'Use the full parent layer text as supporting context.',
            'If the current selection is a highlighted range, give special attention to that selection while still considering the full layer.',
            'Reply like a normal helpful chatbot in English.',
            'Keep the explanation in English even when the selected text is in another language.',
            'Only the literal suggested word, phrase, or script example should appear in the requested target language or script when needed.',
            'When useful, explain your reasoning briefly and give a best recommendation.',
            'Do not output hidden reasoning tags or XML wrappers.',
          ].join(' '),
        },
      ],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: [
              `Current selection type: ${kind === 'range' ? 'highlighted text inside a layer' : 'full text layer'}.`,
              `Full parent layer text:\n${(fullLayerText || cleanText).trim()}`,
              `Current focus text:\n${cleanText}`,
            ].join('\n\n'),
          },
        ],
      },
      ...sanitizedHistory.map(turn => ({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      })),
      {
        role: 'user',
        parts: [{ text: customPrompt.trim() }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 800,
    },
  }

  refineLog('custom request', {
    kind,
    model: REFINE_MODEL,
    text: cleanText,
    prompt: customPrompt,
  })

  await rateLimitBeforeApiCall(session)
  const response = await fetchWithTimeout(`${GEMINI_GENERATE_CONTENT_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const responseText = await response.text()
  refineLog('custom response', {
    status: response.status,
    ok: response.ok,
    body: responseText,
  })
  if (!response.ok) {
    const errMsg = parseGeminiErrorBody(responseText, response.status)
    throw new Error(errMsg)
  }

  const data = JSON.parse(responseText) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const rawContent = readGeminiResponseText(data)
  const answer = sanitizeRefineAnswer(rawContent)
  refineLog('custom raw content string', JSON.stringify(rawContent))
  refineLog('custom cleaned answer string', JSON.stringify(answer))
  refineLog('custom parsed answer', { rawContent, answer })

  return answer || rawContent
}

// Function to check if a node or any of its parents should be excluded from translation (DND)
// Only checks ancestors within the selection boundary (up to root). External "dnd" containers
// above the selected frame should NOT mark internal content as DND - user explicitly selected it.
function isDndNode(node: SceneNode, root?: SceneNode | null): boolean {
  let currentNode: BaseNode | null = node

  while (currentNode && currentNode.type !== 'PAGE') {
    if (root != null && currentNode === root) break // Stop at selection boundary
    if ('name' in currentNode && currentNode.name.toLowerCase() === 'dnd') {
      debugLog(`DND detected: "${node.name}" is inside DND container "${currentNode.name}"`)
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
      debugLog(`Hing detected: "${node.name}" is inside hing container "${currentNode.name}"`)
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
      debugLog(`LMA detected: "${node.name}" is inside LMA container "${currentNode.name}"`)
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

function parseGeminiErrorBody(responseText: string, status: number): string {
  try {
    const data = JSON.parse(responseText)
    const msg = data?.error?.message || data?.message
    if (typeof msg === 'string' && msg.trim()) return msg
  } catch {
    // Ignore parse errors and fall back to status-based messages.
  }
  if (status === 400) return 'Bad request. Check the refine prompt and selected text.'
  if (status === 403) return 'Gemini API key invalid or expired. Check your Gemini API key.'
  if (status === 429) return 'Gemini rate limit reached. Wait a moment and try again.'
  if (status >= 500) return 'Gemini API server error. Try again in a few moments.'
  return `Gemini API error (${status}).`
}

// Parse API errors into user-friendly messages
function getApiErrorMessage(error: unknown, apiName: string): string {
  if (error instanceof Error) {
    const msg = error.message
    if (msg.includes('timed out')) return msg
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed') || msg.includes('Network request failed')) {
      return `Network error: Cannot reach the ${apiName} API. Check your internet connection and firewall.`
    }
    if (msg.includes('invalid_api_key') || msg.includes('403') || msg.includes('Forbidden')) {
      return `Credentials invalid or expired for ${apiName}. Update the backend environment and try again.`
    }
    if (msg.includes('insufficient_quota') || msg.includes('429') || msg.includes('rate limit')) {
      return 'Rate limit or quota exceeded. Wait a minute and try again.'
    }
    if (msg.includes('422') || msg.includes('unprocessable')) {
      return 'Request invalid: Text may be too long or language not supported. Check API limits.'
    }
    if (msg.includes('500') || msg.includes('Internal Server')) {
      return `${apiName} API server error. Try again in a few moments.`
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
    const apiKey = await requireSarvamApiKey()
    const cleanText = text.trim()
    if (!cleanText || cleanText.length === 0) return text
    const truncatedText = cleanText.length > 1000 ? cleanText.substring(0, 1000) : cleanText
    const norm = normalizeTextForCache(truncatedText)
    // Skip only if text is already purely in the target script (same rule as translateText).
    const detected = await detectLanguage(truncatedText, session)
    if (targetLanguage === 'en') {
      if (!isInIndicScript(truncatedText)) {
        debugLog(`Skipping transliterate to English: no Indic script ("${truncatedText.substring(0, 30)}...")`)
        return text
      }
    } else {
      if (detected === targetLanguage && isInIndicScript(truncatedText)) {
        debugLog(`Skipping transliterate: text already in ${targetLanguage} script ("${truncatedText.substring(0, 30)}...")`)
        return text
      }
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
      debugLog(`Transliterate cache hit: "${norm.substring(0, 30)}..." → ${targetLanguage}`)
      return cached
    }
    
    const requestBody = {
      input: truncatedText,
      source_language_code: LANGUAGE_CODES[sourceLanguage] || sourceLanguage,
      target_language_code: LANGUAGE_CODES[targetLanguage] || targetLanguage,
      numerals_format: 'international',
      spoken_form: false
    }
    
    debugLog('Transliteration request:', {
      input: truncatedText.substring(0, 50) + '...',
      source_language_code: LANGUAGE_CODES[sourceLanguage],
      target_language_code: LANGUAGE_CODES[targetLanguage],
      url: SARVAM_TRANSLITERATE_URL
    })
    
    debugLog('Full transliteration request body:', JSON.stringify(requestBody, null, 2))
    await rateLimitBeforeApiCall(session)

    const response = await fetchWithTimeout(SARVAM_TRANSLITERATE_URL, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    debugLog('Transliteration response status:', response.status)
    debugLog('Transliteration response OK:', response.ok)
    
    const responseText = await response.text()
    debugLog('Transliteration response text:', responseText.substring(0, 200) + '...')

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
    debugLog('Transliteration result:', transliteratedText)
    
    return transliteratedText
  } catch (error) {
    const msg = getApiErrorMessage(error, 'Transliteration')
    console.error('Transliteration API error:', msg, error)
    throw new Error(msg)
  }
}

// Function to call Sarvam AI translation API
async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string,
  session?: SessionCache,
  mode: TranslationMode = 'sarvam-translate'
): Promise<string> {
  try {
    const apiKey = await requireSarvamApiKey()
    const config = getTranslationConfig(mode)
    const cleanText = assertTranslateLength(text, 'Selected text', config)
    if (!cleanText || cleanText.length === 0) return text
    const norm = normalizeTextForCache(cleanText)
    
    // Skip only if the text is already purely in the target language.
    //
    // For English target: skip ONLY when there is no Indic script at all (already pure
    // English/numbers). We must NOT skip mixed segments like "करा 8 contacts." even if LID
    // returns 'en' — those still contain Indic characters that need translating.
    //
    // For Indic target: skip when the text is already in that Indic script AND LID agrees,
    // but still call the API for Latin-script text (LID can misclassify e.g. "Srinivasalu Reddy").
    const detected = await detectLanguage(cleanText, session)
    if (targetLanguage === 'en') {
      if (!isInIndicScript(cleanText)) {
        debugLog(`Skipping translate to English: no Indic script found ("${cleanText.substring(0, 30)}...")`)
        return text
      }
    } else {
      if (detected === targetLanguage && isInIndicScript(cleanText)) {
        debugLog(`Skipping translate: text already in ${targetLanguage} script ("${cleanText.substring(0, 30)}...")`)
        return text
      }
    }
    
    let sourceCode: string
    if (sourceLanguage === 'en') {
      sourceCode = 'en-IN'
    } else {
      sourceCode = LANGUAGE_CODES[detected] || 'en-IN'
    }
    const targetCode = LANGUAGE_CODES[targetLanguage] || targetLanguage
    const outputScript = config.outputScript || 'default'
    const cacheKeyStr = cacheKey('tr', config.model, sourceCode, targetCode, config.mode, outputScript, norm)
    
    const sk = `${config.model}|${sourceCode}|${targetCode}|${config.mode}|${outputScript}|${norm}`
    if (session?.tr) {
      const hit = session.tr.get(sk)
      if (hit != null) return hit
    }
    const cached = await getCached<string>(cacheKeyStr)
    if (cached != null) {
      session?.tr?.set(sk, cached)
      debugLog(`Translate cache hit: "${norm.substring(0, 30)}..." → ${targetLanguage}`)
      return cached
    }
    
    const requestBody = {
      input: cleanText,
      source_language_code: sourceCode,
      target_language_code: targetCode,
      model: config.model,
      mode: config.mode,
      numerals_format: 'international',
      ...(config.outputScript ? { output_script: config.outputScript } : {}),
    }
    
    debugLog('Translation request:', {
      input: cleanText.substring(0, 50) + '...',
      source_language_code: sourceCode,
      target_language_code: LANGUAGE_CODES[targetLanguage],
      url: SARVAM_API_URL
    })
    
    debugLog('Full request body:', JSON.stringify(requestBody, null, 2))
    await rateLimitBeforeApiCall(session)

    const response = await fetchWithTimeout(SARVAM_API_URL, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    debugLog('Response status:', response.status)
    debugLog('Response OK:', response.ok)
    
    const responseText = await response.text()
    debugLog('Response text:', responseText.substring(0, 200) + '...')

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
    debugLog('Translation result:', rawTranslation.substring(0, 50) + '...')
    return cleanTranslation
  } catch (error) {
    const msg = getApiErrorMessage(error, 'Translation')
    console.error('Translation API error:', msg, error)
    throw new Error(msg)
  }
}

async function transformTextForMode(
  text: string,
  targetLanguage: string,
  sourceLanguage: string | undefined,
  session: SessionCache,
  mode: TranslationMode
): Promise<string> {
  if (mode === 'transliterate') {
    const actualSourceLanguage = await resolveActualSourceLanguage(text, sourceLanguage, session)
    return await transliterateText(text, actualSourceLanguage, targetLanguage, session)
  }

  return await translateText(text, targetLanguage, sourceLanguage, session, mode)
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
  let allStyles: TextStyle[]
  try {
    allStyles = await (figma as any).getLocalTextStylesAsync()
  } catch {
    allStyles = figma.getLocalTextStyles()
  }
  
  debugLog('\n=== GET OR CREATE TEXT STYLE ===')
  debugLog('Looking for text style:', {
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
      debugLog('Found size/lineHeight match:', {
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
  
  debugLog('Found matching styles:', matchingStyles.map(s => s.name))
  
  if (matchingStyles.length > 0) {
    if (isTeluguFont) {
      // Looking for Telugu styles
      const teluguStyles = matchingStyles.filter(s => s.name.startsWith('Telugu/'))
      debugLog('Found Telugu styles:', teluguStyles.map(s => s.name))
      
      if (teluguStyles.length > 0) {
        // Look for matching weight in Telugu styles
        const teluguStyle = teluguStyles.find(s => {
          const isRegular = !s.name.includes('Prominent') && !s.name.toLowerCase().includes('semibold')
          const isProminent = s.name.includes('Prominent') || s.name.toLowerCase().includes('semibold')
          
          // For SemiBold definition, look for Prominent or SemiBold in the name
          if (definition.weight === 'SemiBold') {
            debugLog('Checking Telugu style for SemiBold:', {
              name: s.name,
              isProminent
            })
            return isProminent
          }
          
          // For Regular definition, look for Regular in the name or absence of Prominent/SemiBold
          debugLog('Checking Telugu style for Regular:', {
            name: s.name,
            isRegular
          })
          return isRegular
        })
        
        if (teluguStyle) {
          debugLog('Found matching Telugu style:', {
            name: teluguStyle.name,
            weight: definition.weight
          })
          return teluguStyle
        }
        
        // If no exact weight match, use first Telugu style
        debugLog('No exact Telugu weight match, using first Telugu style')
        return teluguStyles[0]
      }
    } else {
      // Looking for non-Telugu styles
      const nonTeluguStyles = matchingStyles.filter(s => s.name.startsWith('Non Telugu/'))
      debugLog('Found non-Telugu styles:', nonTeluguStyles.map(s => s.name))
      
      if (nonTeluguStyles.length > 0) {
        // Look for matching weight in non-Telugu styles
        const nonTeluguStyle = nonTeluguStyles.find(s => {
          const isRegular = !s.name.includes('Prominent') && !s.name.toLowerCase().includes('semibold')
          const isProminent = s.name.includes('Prominent') || s.name.toLowerCase().includes('semibold')
          
          // For SemiBold definition, look for Prominent or SemiBold in the name
          if (definition.weight === 'SemiBold') {
            debugLog('Checking non-Telugu style for SemiBold:', {
              name: s.name,
              isProminent
            })
            return isProminent
          }
          
          // For Regular definition, look for Regular in the name or absence of Prominent/SemiBold
          debugLog('Checking non-Telugu style for Regular:', {
            name: s.name,
            isRegular
          })
          return isRegular
        })
        
        if (nonTeluguStyle) {
          debugLog('Found matching non-Telugu style:', {
            name: nonTeluguStyle.name,
            weight: definition.weight
          })
          return nonTeluguStyle
        }
        
        // If no exact weight match, use first non-Telugu style
        debugLog('No exact non-Telugu weight match, using first non-Telugu style')
        return nonTeluguStyles[0]
      }
    }
    
    // If no style found in preferred category, use first matching style
    debugLog('No style found in preferred category, using first matching style')
    return matchingStyles[0]
  }
  
  // If no matching style found
  if (!createIfMissing) {
    debugLog('No matching style found, not creating (translation mode)')
    return null
  }
  const styleName = isTeluguFont ? `Telugu/${definition.styleName}` : `Non Telugu/${definition.styleName}`
  debugLog(`Creating new ${isTeluguFont ? 'Telugu' : 'non-Telugu'} text style:`, styleName)
  
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
    debugLog('Loading font for new style:', fontName)
    if (!(await loadFontCached(fontName))) throw new Error(`Failed to load ${fontName.family} ${fontName.style}`)
    newStyle.fontName = fontName
    debugLog('✅ Successfully created new style:', {
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
      debugLog('Found line height in pixels:', lineHeightPx)
    }
  }
  
  // Get current weight
  const currentWeight = fontName.style.toLowerCase()
  debugLog('Current font weight:', currentWeight)
  
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
  
  debugLog('Weight analysis:', {
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
      debugLog('Found potential style match:', {
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
  
  debugLog('Found matching style definitions:', matchingDefs)
  
  // If we have exactly one match, return it regardless of weight
  // This ensures Heading styles are applied even with different weights
  if (matchingDefs.length === 1 && matchingDefs[0].styleName.startsWith('Heading/')) {
    debugLog('Using Heading style regardless of weight:', matchingDefs[0])
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
    debugLog('Selected style definition:', matchingStyle)
  } else {
    debugLog('No matching style found for weight')
  }
  
  return matchingStyle || null
}

// Function to automatically apply text style based on properties
// Function to apply Telugu font and style with proper sequencing
async function applyTeluguFontAndStyle(textNode: TextNode): Promise<'success' | 'skipped' | 'error'> {
  try {
    const currentFont = textNode.fontName as FontName

    debugLog('\n=== TELUGU FONT STYLE APPLICATION START ===')
    debugLog('Initial text node state:', {
      text: textNode.characters.substring(0, 50),
      currentFont: textNode.fontName,
      fontSize: textNode.fontSize,
      lineHeight: textNode.lineHeight,
      textStyleId: textNode.textStyleId
    })

    // Step 1: Find matching style definition first - IMPORTANT: Pass true for isTeluguStyle
    const matchingDef = findMatchingStyleDefinition(textNode, true)
    if (!matchingDef) {
      debugLog('❌ No matching style definition found')
      return 'skipped'
    }

    debugLog('Found matching style definition:', matchingDef)

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
        if (!(await loadFontCached({ family: 'Kohinoor Telugu', style: 'SemiBold' }))) {
          throw new Error('SemiBold not available')
        }
        textNode.fontName = { family: 'Kohinoor Telugu', style: 'SemiBold' }
      } catch (error) {
        debugLog('⚠️ SemiBold not available, falling back to Regular')
        if (!(await loadFontCached({ family: 'Kohinoor Telugu', style: 'Regular' }))) {
          throw error
        }
        textNode.fontName = { family: 'Kohinoor Telugu', style: 'Regular' }
      }
    } else {
      if (!(await loadFontCached({ family: 'Kohinoor Telugu', style: 'Regular' }))) {
        throw new Error('Regular not available')
      }
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
      debugLog('No matching Telugu style in file; applied font and size/lineHeight only')
    }

    debugLog('=== FINAL TEXT NODE STATE ===')
    debugLog({
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

// Function to swap font family while preserving weight where possible
async function swapFontFamily(textNode: TextNode, targetFont: string): Promise<'success' | 'skipped' | 'error'> {
  const currentFont = textNode.fontName as FontName

  try {
    debugLog('\n--- Starting font swap ---')
    debugLog('Text node:', {
      text: textNode.characters.substring(0, 50),
      currentFont: currentFont,
      targetFont,
      currentStyleId: textNode.textStyleId
    })

    // Use same weight matching as translation: try exact match, then variants, then proximity fallbacks
    const originalWeight = currentFont.style || 'Regular'
    const styleNames = getWeightStyleNamesToTry(originalWeight)
    
    const fontToApply = await resolveAvailableFont(getFontFamilyCandidates(targetFont), styleNames)
    if (fontToApply) {
      textNode.fontName = fontToApply
      debugLog('✅ Successfully applied', fontToApply.family, fontToApply.style || 'Regular')
      return 'success'
    }
    
    // Fallback: try Regular if nothing else worked
    const regularFallback = await resolveAvailableFont(getFontFamilyCandidates(targetFont), ['Regular'])
    if (regularFallback) {
      textNode.fontName = regularFallback
      debugLog('✅ Successfully applied', regularFallback.family, 'Regular (fallback)')
      return 'success'
    }
    return 'error'
    
  } catch (error) {
    console.error('❌ Error swapping font family:', error)
    return 'error'
  }
}

// ─── Partial text-range selection helpers ────────────────────────────────────

type SelectedTextRangeInfo = { node: TextNode; start: number; end: number }

/**
 * Returns the active highlighted text range when the user has selected a
 * strict substring inside a text layer (not the entire layer text).
 * Returns null in all other cases so we fall through to the normal whole-layer path.
 */
async function getActiveSelectedTextRange(): Promise<SelectedTextRangeInfo | null> {
  const raw = (figma.currentPage as any)?.selectedTextRange
  if (!raw || typeof raw !== 'object') return null

  const start = Number((raw as any).start)
  const end   = Number((raw as any).end)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null

  // Resolve the node the range belongs to
  let node: BaseNode | null = null
  const nodeId = (raw as any).nodeId ?? (raw as any).id
  if (typeof nodeId === 'string') {
    node = await figma.getNodeByIdAsync(nodeId)
  } else if ((raw as any).node && typeof (raw as any).node === 'object') {
    node = (raw as any).node as BaseNode
  }
  if (!node || (node as SceneNode).type !== 'TEXT') return null

  const textNode = node as TextNode
  const len = textNode.characters?.length ?? 0
  const s = Math.max(0, Math.min(start, len))
  const e = Math.max(0, Math.min(end, len))
  if (e <= s) return null

  // Only treat as "partial" when it is a strict subset – full-text selection
  // goes through the normal whole-layer flow (preserves style-mapping behaviour).
  if (s === 0 && e === len) return null

  return { node: textNode, start: s, end: e }
}

/**
 * Translate only the highlighted portion of a text node.
 *
 * Strategy to preserve all styling:
 *  1. Snapshot every styled segment for the whole node.
 *  2. Translate the selected substring.
 *  3. Set node.characters = before + translated + after.
 *  4. Re-apply original segment styles for "before" and "after" portions.
 *  5. Apply target font (and mapped style if available) to the translated portion.
 */
async function translateSelectedRange(
  node: TextNode,
  start: number,
  end: number,
  targetLanguage: string,
  sourceLanguage: string | undefined,
  session: SessionCache,
  mode: TranslationMode = 'sarvam-translate',
  sourceTextOverride?: string
): Promise<{ success: boolean; notified: boolean; appliedText: string }> {
  const fullText    = node.characters
  const selected    = sourceTextOverride ?? fullText.substring(start, end)
  const trimmed     = selected.trim()

  if (!trimmed) {
    figma.notify('Please select some text (not just spaces) to translate.', { error: true })
    return { success: false, notified: true, appliedText: fullText.substring(start, end) }
  }

  // 1. Snapshot ALL segment styles before we touch anything
  const segments = node.getStyledTextSegments([...STYLE_FIELDS])

  // 2. Translate the selection
  const translated = await transformTextForMode(selected, targetLanguage, sourceLanguage, session, mode)
  const cleaned    = translated ? cleanupTranslation(translated) : ''
  const replacement = cleaned && cleaned.trim().length > 0 ? cleaned : selected // keep original on empty result

  // 3. Load all fonts currently in the node (required before modifying characters)
  await loadAllFontsForTextNode(node)

  // 4. Determine source style for the first character of the selected range
  //    (used for style-mapping lookup, same as whole-layer path)
  const srcFont = node.getRangeFontName(start, Math.min(start + 1, fullText.length))
  const srcFontName: FontName = srcFont !== figma.mixed && srcFont
    ? (srcFont as FontName)
    : { family: 'Noto Sans', style: 'Regular' }
  const srcFontSize = node.getRangeFontSize(start, Math.min(start + 1, fullText.length))
  const srcSize = typeof srcFontSize === 'number' ? srcFontSize : (typeof node.fontSize === 'number' ? node.fontSize : 16)
  const srcLhRaw = node.getRangeLineHeight(start, Math.min(start + 1, fullText.length))
  const srcLh = (srcLhRaw !== figma.mixed && srcLhRaw && typeof srcLhRaw === 'object' && 'value' in srcLhRaw && (srcLhRaw as any).unit === 'PIXELS')
    ? (srcLhRaw as any).value as number : null
  const sourceStyleOverride: SourceStyle = { font: srcFontName.family, size: srcSize, lh: srcLh, weight: srcFontName.style || 'Regular' }

  // 5. Pre-load the target font we'll apply to the translated range
  const targetFontName = await getTargetFontForRange(targetLanguage, srcFontName.style || 'Regular')
  if (targetFontName) await loadFontCached(targetFontName)

  // 6. Rebuild characters: before + replacement + after
  const before = fullText.substring(0, start)
  const after  = fullText.substring(end)
  const newText = before + replacement + after

  // Need a valid base font before setting characters (prevents "font not loaded" errors)
  const baseFont = targetFontName ?? srcFontName
  await loadFontCached(baseFont)
  node.fontName = baseFont
  node.characters = newText

  const replacementEnd = start + replacement.length

  // 7. Re-apply original segment styles to the BEFORE and AFTER portions
  let cursor = 0
  for (const seg of segments) {
    const segEnd = cursor + seg.characters.length
    // "before" portion: restore original style
    const bStart = Math.max(cursor, 0)
    const bEnd   = Math.min(segEnd, start)
    if (bEnd > bStart) {
      const origFont = seg.fontName && typeof (seg.fontName as FontName).family === 'string' ? (seg.fontName as FontName) : null
      await applySegmentStylesToRange(node, bStart, bEnd, seg as SegmentStyle, origFont)
    }
    // "after" portion: restore original style, offset by delta
    const delta   = replacement.length - (end - start)
    const aOrigStart = Math.max(cursor, end)
    const aOrigEnd   = Math.min(segEnd, fullText.length)
    if (aOrigEnd > aOrigStart) {
      const aStart = aOrigStart + delta
      const aEnd   = aOrigEnd  + delta
      if (aEnd > aStart && aStart >= 0 && aEnd <= newText.length) {
        const origFont = seg.fontName && typeof (seg.fontName as FontName).family === 'string' ? (seg.fontName as FontName) : null
        await applySegmentStylesToRange(node, aStart, aEnd, seg as SegmentStyle, origFont)
      }
    }
    cursor = segEnd
  }

  // 8. Apply target font to ONLY the translated range.
  //    We cannot use applyUserDefinedStyleMapping / setTextStyleIdAsync here because
  //    those apply to the whole node — which would restyle text outside the selection.
  //    Instead we apply font changes range-by-range using setRangeFontName.
  if (replacementEnd > start) {
    const fontToApply = targetFontName ?? srcFontName
    await loadFontCached(fontToApply)
    node.setRangeFontName(start, replacementEnd, fontToApply)
    node.setRangeFontSize(start, replacementEnd, srcSize)
    if (srcLh != null) {
      node.setRangeLineHeight(start, replacementEnd, { value: srcLh, unit: 'PIXELS' })
    }
  }

  return { success: true, notified: false, appliedText: replacement }
}

async function applyRefineSuggestionToNode(
  nodeId: string,
  replacementText: string,
  kind: 'node' | 'range',
  start?: number,
  end?: number
): Promise<void> {
  const node = await figma.getNodeByIdAsync(nodeId)
  if (!node || node.type !== 'TEXT') {
    throw new Error('The selected text layer is no longer available.')
  }

  const textNode = node as TextNode
  const replacement = replacementText.trim()
  if (!replacement) {
    throw new Error('Suggestion text is empty.')
  }

  await loadAllFontsForTextNode(textNode)

  if (kind === 'range' && typeof start === 'number' && typeof end === 'number' && end > start) {
    textNode.deleteCharacters(start, end)
    textNode.insertCharacters(start, replacement, start > 0 ? 'BEFORE' : 'AFTER')
  } else {
    if (!textNode.characters || textNode.characters.length === 0) {
      const fallbackFont: FontName = { family: 'Inter', style: 'Regular' }
      await loadFontCached(fallbackFont)
      textNode.fontName = fallbackFont
    }
    textNode.characters = replacement
  }

  figma.currentPage.selection = [textNode]
  figma.viewport.scrollAndZoomIntoView([textNode])
}

// ─────────────────────────────────────────────────────────────────────────────

// Message handler for translation requests
figma.on('selectionchange', () => {
  try {
    figma.ui.postMessage({ type: 'refine-selection-changed' })
  } catch {
    // Ignore if the UI is not ready yet.
  }
})

figma.ui.onmessage = async (msg) => {
  debugLog('\n=== MESSAGE RECEIVED ===')
  debugLog('Message type:', msg.type)
  debugLog('Message data:', {
    targetLanguage: msg.targetLanguage,
    type: msg.type
  })
  
  if (msg.type === 'get-refine-context') {
    try {
      const context = await getRefineSelectionContext()
      refineLog('context loaded', context)
      figma.ui.postMessage({ type: 'refine-context', context })
    } catch (error) {
      const errMsg = getApiErrorMessage(error, 'Refine')
      refineWarn('context error', error)
      figma.ui.postMessage({ type: 'refine-error', scope: 'context', message: errMsg })
      figma.notify(errMsg, { error: true })
    }
  } else if (msg.type === 'load-refine-selection') {
    try {
      const context = await getRefineSelectionContext()
      refineLog('load selection', context)
      figma.ui.postMessage({ type: 'refine-context', context })
      figma.ui.postMessage({ type: 'refine-selection-loaded', context, suggestions: [] })
    } catch (error) {
      const errMsg = getApiErrorMessage(error, 'Refine')
      refineWarn('load selection error', error)
      figma.ui.postMessage({ type: 'refine-error', scope: 'base', message: errMsg })
      figma.notify(errMsg, { error: true })
    }
  } else if (msg.type === 'refine-generate-custom') {
    try {
      const context = await getRefineSelectionContext()
      refineLog('custom refine message', {
        context,
        prompt: typeof msg.customPrompt === 'string' ? msg.customPrompt : '',
      })
      if (!context.canRefine || !context.nodeId) {
        const message = context.message || 'Select one text layer or highlight a text range to refine.'
        figma.ui.postMessage({ type: 'refine-error', scope: 'custom', message })
        figma.notify(message, { error: true })
        return
      }

      const customPrompt = typeof msg.customPrompt === 'string' ? msg.customPrompt.trim() : ''
      if (!customPrompt) {
        const message = 'Add a refine prompt to continue.'
        figma.ui.postMessage({ type: 'refine-error', scope: 'custom', message })
        figma.notify(message, { error: true })
        return
      }

      await requireGeminiApiKey()
      figma.ui.postMessage({ type: 'refine-custom-started' })
      const session = createSessionCache()
      const answer = await generateCustomRefineAnswer(
        context.text,
        customPrompt,
        context.kind === 'range' ? 'range' : 'node',
        Array.isArray(msg.history) ? msg.history : [],
        typeof msg.layerText === 'string' ? msg.layerText : context.layerText,
        session
      )
      refineLog('custom refine complete', { answer })
      if (!answer.trim()) {
        throw new Error('Gemini returned an empty reply. Please try rephrasing your prompt.')
      }
      figma.ui.postMessage({
        type: 'refine-generated',
        generatedText: answer,
        prompt: customPrompt,
        nodeId: context.nodeId,
        selectionKey: context.nodeId,
        seedText: typeof msg.layerText === 'string' ? msg.layerText : context.layerText || context.text,
      })
    } catch (error) {
      const errMsg = getApiErrorMessage(error, 'Refine')
      refineWarn('custom refine error', error)
      figma.ui.postMessage({ type: 'refine-error', scope: 'custom', message: errMsg })
      figma.notify(errMsg, { error: true })
    }
  } else if (msg.type === 'refine-apply') {
    try {
      if (typeof msg.nodeId !== 'string' || !msg.nodeId.trim()) {
        throw new Error('Missing text selection for refine apply.')
      }
      await applyRefineSuggestionToNode(
        msg.nodeId,
        typeof msg.text === 'string' ? msg.text : '',
        msg.kind === 'range' ? 'range' : 'node',
        typeof msg.start === 'number' ? msg.start : undefined,
        typeof msg.end === 'number' ? msg.end : undefined
      )
      figma.ui.postMessage({ type: 'refine-applied' })
      figma.notify('Applied refined copy.')
    } catch (error) {
      const errMsg = getApiErrorMessage(error, 'Refine apply')
      figma.ui.postMessage({ type: 'refine-error', scope: 'apply', message: errMsg })
      figma.notify(errMsg, { error: true })
    }
  } else if (msg.type === 'validate-translate-selection') {
    try {
      const selectedRange = await getActiveSelectedTextRange()
      if (selectedRange) {
        figma.ui.postMessage({ type: 'translate-selection-valid' })
        return
      }

      const selection = figma.currentPage.selection
      const containers = selection.filter(node => isContainerNode(node))
      const textLayers = selection.filter(node => node.type === 'TEXT') as TextNode[]

      if (containers.length === 0 && textLayers.length === 0) {
        const message = 'Please select one or more layers or text to translate'
        figma.ui.postMessage({ type: 'translation-error', message })
        figma.notify(message, { error: true })
        return
      }

      figma.ui.postMessage({ type: 'translate-selection-valid' })
    } catch (error) {
      const message = getApiErrorMessage(error, 'Translate validation')
      figma.ui.postMessage({ type: 'translation-error', message })
      figma.notify(message, { error: true })
    }
  } else if (msg.type === 'translate') {
    try {
      await loadFontPrefs()
      await reloadStyleMappings()
      const translationMode: TranslationMode = msg.translationMode === 'sarvam-translate'
        || msg.translationMode === 'formal'
        || msg.translationMode === 'classic-colloquial'
        || msg.translationMode === 'modern-colloquial'
        || msg.translationMode === 'transliterate'
        ? msg.translationMode
        : 'sarvam-translate'
      const translationConfig = getTranslationConfig(translationMode)

      // ── Partial text-range selection ──────────────────────────────────────
      // If the user has highlighted a strict substring inside a text layer,
      // translate only that portion and leave everything else intact.
      const selectedRange = await getActiveSelectedTextRange()
      if (selectedRange) {
        const selectedText = selectedRange.node.characters.slice(selectedRange.start, selectedRange.end)
        assertTranslateLength(selectedText, 'Selected text', translationConfig)
        figma.ui.postMessage({ type: 'translation-started', count: 1 })
        figma.ui.postMessage({
          type: 'translation-progress', current: 1, total: 1,
          message: 'Translating selected text…'
        })
        const session = createSessionCache()
        let sourceLanguage = msg.assumeEnglish === true ? 'en' : undefined
        let sourceTextForTranslation = selectedText
        if (await isTextAlreadyInTargetLanguage(selectedText, msg.targetLanguage, session)) {
          const restyle = resolveRestyleTranslation(
            selectedRange.node,
            'range',
            selectedText,
            msg.targetLanguage,
            translationMode
          )
          if (restyle.status === 'restyle') {
            sourceTextForTranslation = restyle.sourceText || selectedText
            sourceLanguage = restyle.sourceLanguage
          } else {
            figma.notify(restyle.message, { error: restyle.status === 'missing', timeout: 2400 })
            figma.ui.postMessage({
              type: 'translation-complete',
              count: 0,
              errors: restyle.status === 'missing' ? 1 : 0,
              total: 1,
              weightMappings: [],
              errorMessages: restyle.status === 'missing' ? [restyle.message] : []
            })
            return
          }
        }
        try {
          const actualSourceLanguage = await resolveActualSourceLanguage(sourceTextForTranslation, sourceLanguage, session)
          const result = await translateSelectedRange(
            selectedRange.node, selectedRange.start, selectedRange.end,
            msg.targetLanguage, sourceLanguage, session, translationMode, sourceTextForTranslation
          )
          if (!result.notified) {
            storeRangeTranslationMemory(selectedRange.node, {
              sourceText: sourceTextForTranslation,
              translatedText: result.appliedText,
              sourceLanguage: actualSourceLanguage,
              targetLanguage: msg.targetLanguage,
              mode: translationMode,
            })
            figma.ui.postMessage({
              type: 'translation-complete', count: 1, errors: 0, total: 1,
              weightMappings: [], errorMessages: []
            })
            if (result.success) figma.notify('✅ Translated selected text!')
          } else {
            figma.ui.postMessage({
              type: 'translation-complete', count: 0, errors: 1, total: 1,
              weightMappings: [], errorMessages: []
            })
          }
        } catch (rangeErr) {
          const errMsg = rangeErr instanceof Error ? rangeErr.message : 'Unknown error'
          figma.notify(errMsg, { error: true })
          figma.ui.postMessage({
            type: 'translation-complete', count: 0, errors: 1, total: 1,
            weightMappings: [], errorMessages: [errMsg]
          })
        }
        return
      }
      // ─────────────────────────────────────────────────────────────────────

      const selection = figma.currentPage.selection
      
      // Filter selection: containers (frames, groups, sections, components, instances) and text layers
      const containers = selection.filter(node => isContainerNode(node))
      const textLayers = selection.filter(node => node.type === 'TEXT') as TextNode[]
      
      debugLog('\n=== SELECTION ANALYSIS ===')
      debugLog('Selected items:', {
        containers: containers.length,
        textLayers: textLayers.length
      })

      if (containers.length === 0 && textLayers.length === 0) {
        figma.ui.postMessage({ 
          type: 'translation-error', 
          message: 'Please select one or more layers or text to translate' 
        })
        figma.notify('Please select one or more layers or text to translate', { error: true })
        return
      }
      
      // Find all text nodes and check their processing type
      const textNodes: Array<{node: TextNode, originalText: string, type: 'translate' | 'dnd' | 'lma'}> = []
      
      // Process text nodes from containers (frame, group, section, component, instance)
      // Only check dnd within the selected container - not in external ancestors
      containers.forEach(container => {
        container.findAll(node => node.type === 'TEXT').forEach(textNode => {
          const textElement = textNode as TextNode
          const text = textElement.characters.trim()
          if (text.length > 0) {
            const isLma = isLmaNode(textElement)
            const isDnd = !isLma && isDndNode(textElement, container)
            
            let nodeType: 'translate' | 'dnd' | 'lma' = 'translate'
            if (isLma) {
              nodeType = 'lma'
              debugLog('Found LMA text node for full skip:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))
            } else if (isDnd) {
              nodeType = 'dnd'
              debugLog('Found DND text node for font update:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))
            } else {
              debugLog('Found text node for translation:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))
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
      // User explicitly selected these - only check dnd within the node itself (not external ancestors)
      textLayers.forEach(textLayer => {
        const text = textLayer.characters.trim()
        if (text.length > 0) {
          const isLma = isLmaNode(textLayer)
          const isDnd = !isLma && isDndNode(textLayer, textLayer)
          
          let nodeType: 'translate' | 'dnd' | 'lma' = 'translate'
          if (isLma) {
            nodeType = 'lma'
            debugLog('Found selected LMA text layer for full skip:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))
          } else if (isDnd) {
            nodeType = 'dnd'
            debugLog('Found selected DND text layer for font update:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))
          } else {
            debugLog('Found selected text layer for translation:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))
          }
          
          textNodes.push({
            node: textLayer,
            originalText: textLayer.characters,
            type: nodeType
          })
        }
      })
      
      debugLog(`Total text nodes found: ${textNodes.length}`)
      
      if (textNodes.length === 0) {
        figma.ui.postMessage({ 
          type: 'error', 
          message: 'No text found in selected items' 
        })
        figma.notify('No text found in selected items', { error: true })
        return
      }

      const oversizedNode = textNodes.find(({ originalText, type }) => (
        type === 'translate' && originalText.trim().length > translationConfig.maxChars
      ))
      if (oversizedNode) {
        const message = getTranslateLimitMessage(translationConfig, getNodeLocation(oversizedNode.node), oversizedNode.originalText.trim().length)
        figma.ui.postMessage({ type: 'error', message })
        figma.notify(message, { error: true })
        return
      }
      
      figma.ui.postMessage({ 
        type: 'translation-started', 
        count: textNodes.length 
      })
      
      debugLog('[TRANSLATE] Starting translation of', textNodes.length, 'text(s) to', msg.targetLanguage, '— open Plugins → Development → Open Console for details')
      
      const session = createSessionCache()
      const sourceLanguage = msg.assumeEnglish === true ? 'en' : undefined
      let translatedCount = 0
      let errors = 0
      let lastErrorMessage = ''
      let alreadyTranslatedCount = 0
      let lastAlreadyTranslatedMessage = ''
      const errorMessages: string[] = []
      let weightMappings: string[] = []
      
      // Process translations with progress updates
      for (let i = 0; i < textNodes.length; i++) {
        const { node, originalText, type } = textNodes[i]
        let sourceStyleBeforeTranslate: SourceStyle | null = null
        if (type === 'translate' || type === 'dnd') sourceStyleBeforeTranslate = getSourceStyleFromNode(node)
        
        try {
          // Update progress
          let action = 'Processing'
          if (type === 'translate') action = 'Translating'
          else if (type === 'dnd') action = 'Preserving text + applying font/style (DND)'
          else if (type === 'lma') action = 'Skipping (LMA)'
          
          figma.ui.postMessage({
            type: 'translation-progress',
            current: i + 1,
            total: textNodes.length,
            message: `${action} text ${i + 1} of ${textNodes.length}...`
          })

          if (type !== 'lma') {
            // Load ALL fonts in the node (required for mixed-style text: strikethrough, underline, multiple fonts)
            await loadAllFontsForTextNode(node)
          }
          
          if (type === 'dnd') {
            // DND = Do Not Disturb: preserve text, but still apply target font/style mappings
            const applied = await applyUserDefinedStyleMapping(node, msg.targetLanguage, sourceStyleBeforeTranslate)
            if (!applied) {
              const fontResult = await applyFontToTextNode(node, msg.targetLanguage)
              if (fontResult.mappingUsed) weightMappings.push(`"${originalText.substring(0, 30)}...": ${fontResult.mappingUsed}`)
            }
            translatedCount++
            debugLog(`✅ DND: preserved text and applied font/style: "${originalText.substring(0, 30)}..."`)
            
          } else if (type === 'lma') {
            translatedCount++
            debugLog(`✅ LMA: skipped translation and font/style changes: "${originalText.substring(0, 30)}..."`)
          } else {
            let sourceTextForTranslation = originalText
            let sourceLanguageForTranslation = sourceLanguage
            let isStyleRestyle = false

            if (await isTextAlreadyInTargetLanguage(originalText, msg.targetLanguage, session)) {
              const restyle = resolveRestyleTranslation(
                node,
                'node',
                originalText,
                msg.targetLanguage,
                translationMode
              )
              if (restyle.status === 'restyle') {
                sourceTextForTranslation = restyle.sourceText || originalText
                sourceLanguageForTranslation = restyle.sourceLanguage
                isStyleRestyle = true
              } else if (restyle.status === 'already') {
                alreadyTranslatedCount++
                lastAlreadyTranslatedMessage = restyle.message
                debugLog(`⏭️ Already in target language with same style: "${originalText.substring(0, 30)}..."`)
                continue
              } else {
                throw new TranslationRestyleError(restyle.message)
              }
            }

            const actualSourceLanguage = await resolveActualSourceLanguage(
              sourceTextForTranslation,
              sourceLanguageForTranslation,
              session
            )

            if (isStyleRestyle && node.getStyledTextSegments([...STYLE_FIELDS]).length > 1) {
              throw new TranslationRestyleError(
                'Style swapping after translation is currently supported only for single-style text layers. Re-translate from the original source if you need a fresh variant here.'
              )
            }

            const segmentResult = !isStyleRestyle
              ? await translateWithStyledSegments(
                  node,
                  msg.targetLanguage,
                  sourceLanguageForTranslation,
                  session,
                  translationMode
                )
              : { success: false, weightMappings: [], wasMixed: false }

            if (segmentResult.success) {
              // Only apply whole-node style mapping for uniform (single-style) nodes.
              // For mixed-style nodes, translateWithStyledSegments already applied per-segment
              // fonts/weights — calling setTextStyleIdAsync here would overwrite them.
              if (!segmentResult.wasMixed) {
                const applied = await applyUserDefinedStyleMapping(node, msg.targetLanguage, sourceStyleBeforeTranslate)
                if (applied) debugLog(`✅ Applied matching style from file`)
              }
              weightMappings.push(...segmentResult.weightMappings)
              storeNodeTranslationMemory(node, {
                sourceText: sourceTextForTranslation,
                translatedText: node.characters,
                sourceLanguage: actualSourceLanguage,
                targetLanguage: msg.targetLanguage,
                mode: translationMode,
              })
              translatedCount++
              debugLog(`✅ Translated with preserved styles: "${originalText.substring(0, 30)}..."`)
            } else {
              const translatedText = await transformTextForMode(
                sourceTextForTranslation,
                msg.targetLanguage,
                sourceLanguageForTranslation,
                session,
                translationMode
              )
              if (translatedText && translatedText.trim().length > 0) {
                const actuallyChanged = translatedText !== originalText
                if (actuallyChanged || isStyleRestyle) {
                  const applied = await applyUserDefinedStyleMapping(node, msg.targetLanguage)
                  if (!applied) {
                    const fontResult = await applyFontToTextNode(node, msg.targetLanguage)
                    if (fontResult.mappingUsed) weightMappings.push(`"${originalText.substring(0, 30)}...": ${fontResult.mappingUsed}`)
                  }
                  node.characters = translatedText
                  storeNodeTranslationMemory(node, {
                    sourceText: sourceTextForTranslation,
                    translatedText,
                    sourceLanguage: actualSourceLanguage,
                    targetLanguage: msg.targetLanguage,
                    mode: translationMode,
                  })
                  translatedCount++
                  debugLog(`✅ Translated and font updated: "${originalText.substring(0, 30)}..." → "${translatedText.substring(0, 30)}..."`)
                } else {
                  // Text unchanged (e.g. number) but still apply font/style per preference
                  const applied = await applyUserDefinedStyleMapping(node, msg.targetLanguage)
                  if (!applied) {
                    const fontResult = await applyFontToTextNode(node, msg.targetLanguage)
                    if (fontResult.mappingUsed) weightMappings.push(`"${originalText.substring(0, 30)}...": ${fontResult.mappingUsed}`)
                  }
                  translatedCount++
                  debugLog(`⏭️ No translation change; applied font/style: "${originalText.substring(0, 30)}..." in ${msg.targetLanguage}`)
                }
              } else {
                // Empty result – apply font/style, count as success (text unchanged, font changed)
                const applied = await applyUserDefinedStyleMapping(node, msg.targetLanguage)
                if (!applied) {
                  const fontResult = await applyFontToTextNode(node, msg.targetLanguage)
                  if (fontResult.mappingUsed) weightMappings.push(`"${originalText.substring(0, 30)}...": ${fontResult.mappingUsed}`)
                }
                translatedCount++
                debugLog(`⏭️ Empty translation; font applied for "${originalText.substring(0, 30)}..."`)
              }
            }
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error'
          const loc = getNodeLocation(node)
          // Apply font/style even when API fails (e.g. "Source and target same" for numbers)
          let fontApplied = false
          if (type !== 'lma' && !(error instanceof TranslationRestyleError)) {
            try {
              const srcOverride = (type === 'translate' || type === 'dnd') ? sourceStyleBeforeTranslate ?? undefined : undefined
              const applied = await applyUserDefinedStyleMapping(node, msg.targetLanguage, srcOverride)
              if (!applied) await applyFontToTextNode(node, msg.targetLanguage)
              fontApplied = true
            } catch (fontErr) {
              debugWarn('[Apply styles] Failed after translation error:', fontErr)
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
            debugLog(`⏭️ API failed (${errMsg}) but font applied for ${loc}`)
          }
        }
      }
      
      if (errors > 0) {
        debugLog('[TRANSLATE] === FAILURE SUMMARY ===', errorMessages)
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
      } else if (alreadyTranslatedCount > 0 && !lastErrorMessage) {
        figma.notify(lastAlreadyTranslatedMessage || 'Selected text is already translated in the chosen style.', { timeout: 2200 })
      } else if (lastErrorMessage) {
        figma.notify(lastErrorMessage, { error: true })
      } else {
        figma.notify(`No changes made. Text may already be in the target language.`, { timeout: 2000 })
      }
    } catch (error) {
      console.error('Translation error:', error)
      const errMsg = getApiErrorMessage(error, 'Translation')
      figma.ui.postMessage({ type: 'error', message: errMsg })
      figma.notify(errMsg, { error: true })
    }
  } else if (msg.type === 'bulk-translate-all') {
    try {
      await loadFontPrefs()
      const translationMode: TranslationMode = msg.translationMode === 'sarvam-translate'
        || msg.translationMode === 'formal'
        || msg.translationMode === 'classic-colloquial'
        || msg.translationMode === 'modern-colloquial'
        || msg.translationMode === 'transliterate'
        ? msg.translationMode
        : 'sarvam-translate'
      const translationConfig = getTranslationConfig(translationMode)
      const validLangs = ['hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'pa', 'gu']
      const bulkLangs = Array.isArray(msg.bulkLanguages) && msg.bulkLanguages.length > 0
        ? (msg.bulkLanguages as string[]).filter((l: string) => validLangs.includes(l))
        : [...BULK_LANGUAGES]
      if (bulkLangs.length === 0) {
        figma.ui.postMessage({ type: 'error', message: 'Please set up at least one language for bulk translate' })
        figma.notify('Please set up at least one language for bulk translate', { error: true })
        return
      }
      const selection = figma.currentPage.selection
      const containers = selection.filter(node => isContainerNode(node))
      const textLayers = selection.filter(node => node.type === 'TEXT') as TextNode[]
      const itemsToBulk = [...containers, ...textLayers]
      
      if (itemsToBulk.length === 0) {
        figma.ui.postMessage({ type: 'error', message: 'Please select one or more layers or text to run bulk translate' })
        figma.notify('Please select one or more layers or text to run bulk translate', { error: true })
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
      const typesByFrame: Array<Array<{path: number[], originalText: string, type: 'translate' | 'dnd' | 'lma'}>> = []
      for (const item of itemsToBulk) {
        const root = item
        const textWithPath = item.type === 'TEXT'
          ? (item as TextNode).characters.trim().length > 0
            ? [{ path: [] as number[], text: (item as TextNode).characters, node: item as TextNode }]
            : []
          : collectTextNodesWithPath(root, [])
        const items = textWithPath.map(({ path, text, node }) => {
          const isLma = isLmaNode(node)
          const isDnd = !isLma && isDndNode(node, root)
          let nodeType: 'translate' | 'dnd' | 'lma' = 'translate'
          if (isLma) nodeType = 'lma'
          else if (isDnd) nodeType = 'dnd'
          return { path, originalText: text, type: nodeType }
        })
        const oversizedItem = textWithPath.find(({ text, node }) => {
          const isLma = isLmaNode(node)
          const isDnd = !isLma && isDndNode(node, root)
          return !isLma && !isDnd && text.trim().length > translationConfig.maxChars
        })
        if (oversizedItem) {
          const message = getTranslateLimitMessage(translationConfig, getNodeLocation(oversizedItem.node), oversizedItem.text.trim().length)
          figma.ui.postMessage({ type: 'error', message })
          figma.notify(message, { error: true })
          return
        }
        typesByFrame.push(items)
      }
      
      for (let langIdx = 0; langIdx < bulkLangs.length; langIdx++) {
        const targetLang = bulkLangs[langIdx]
        const langLabel = BULK_LANGUAGE_LABELS[targetLang]
        const sourceLanguage = msg.assumeEnglish === true && targetLang !== 'en' ? 'en' : undefined
        
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
        const textNodes: Array<{node: TextNode, originalText: string, type: 'translate' | 'dnd' | 'lma'}> = []
        for (let fIdx = 0; fIdx < clonedContainers.length; fIdx++) {
          const cloned = clonedContainers[fIdx]
          const typeItems = typesByFrame[fIdx] || []
          const typeByPath = new Map<string, 'translate' | 'dnd' | 'lma'>()
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
            if (type === 'dnd') {
              await loadAllFontsForTextNode(node)
              // DND = Do Not Disturb: preserve text, but still apply target font/style mappings
              const applied = await applyUserDefinedStyleMapping(node, targetLang, bulkSourceStyleBefore)
              if (!applied) await applyFontToTextNode(node, targetLang)
            } else if (type === 'lma') {
              // LMA = Leave Me Alone: preserve text and font/style exactly as-is (clone already has original; no-op)
            } else {
              await loadAllFontsForTextNode(node)
              const actualSourceLanguage = await resolveActualSourceLanguage(originalText, sourceLanguage, bulkSession)
              const segmentResult = await translateWithStyledSegments(node, targetLang, sourceLanguage, bulkSession, translationMode)
              if (!segmentResult.success) {
                const translated = await transformTextForMode(originalText, targetLang, sourceLanguage, bulkSession, translationMode)
                if (translated?.trim() && translated !== originalText) {
                  const applied = await applyUserDefinedStyleMapping(node, targetLang)
                  if (!applied) await applyFontToTextNode(node, targetLang)
                  node.characters = translated
                  storeNodeTranslationMemory(node, {
                    sourceText: originalText,
                    translatedText: translated,
                    sourceLanguage: actualSourceLanguage,
                    targetLanguage: targetLang,
                    mode: translationMode,
                  })
                } else if (translated?.trim()) {
                  const applied = await applyUserDefinedStyleMapping(node, targetLang)
                  if (!applied) await applyFontToTextNode(node, targetLang)
                } else {
                  const applied = await applyUserDefinedStyleMapping(node, targetLang)
                  if (!applied) await applyFontToTextNode(node, targetLang)
                }
              } else {
                // Only apply whole-node style mapping for uniform nodes — mixed nodes already
                // have per-segment styles applied by translateWithStyledSegments.
                if (!segmentResult.wasMixed) {
                  await applyUserDefinedStyleMapping(node, targetLang, bulkSourceStyleBefore)
                }
                storeNodeTranslationMemory(node, {
                  sourceText: originalText,
                  translatedText: node.characters,
                  sourceLanguage: actualSourceLanguage,
                  targetLanguage: targetLang,
                  mode: translationMode,
                })
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
                debugWarn('[Bulk] Apply font after error:', fontErr)
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
      figma.notify(errMsg, { error: true })
    }
  } else if (msg.type === 'get-styles-for-font') {
    try {
      const fontFamily = typeof msg.fontFamily === 'string' ? msg.fontFamily : ''
      // Use async API (synchronous getLocalTextStyles is deprecated in newer Figma runtime)
      let all: TextStyle[]
      try {
        all = await (figma as any).getLocalTextStylesAsync()
      } catch {
        all = figma.getLocalTextStyles()
      }
      // Return ALL local text styles (not filtered by font family), sorted: requested font first, then alphabetical
      const styles = all.map(s => {
        const fs = typeof s.fontSize === 'number' ? s.fontSize : null
        let lh: number | null = null
        if (s.lineHeight && typeof s.lineHeight === 'object' && 'value' in s.lineHeight && s.lineHeight.unit === 'PIXELS') {
          lh = (s.lineHeight as { value: number }).value
        }
        let weight = 'Regular'
        let family = ''
        try {
          const fn = s.fontName as FontName | symbol
          if (fn && typeof fn === 'object' && 'family' in fn) {
            family = (fn as FontName).family || ''
            weight = (fn as FontName).style || 'Regular'
          }
        } catch { /* ignore */ }
        const sizeStr = fs != null && lh != null ? `${fs}px / ${lh}px` : fs != null ? `${fs}px` : ''
        return { id: s.id, name: s.name, fontSize: fs, lineHeight: lh, weight, sizeStr, family }
      }).sort((a, b) => {
        // Styles matching the requested font family sort first
        const aMatch = fontFamily && a.family === fontFamily ? 0 : 1
        const bMatch = fontFamily && b.family === fontFamily ? 0 : 1
        if (aMatch !== bMatch) return aMatch - bMatch
        return a.name.localeCompare(b.name)
      })
      figma.ui.postMessage({ type: 'styles-for-font-loaded', fontFamily, styles })
    } catch (e) {
      const details = e instanceof Error ? e.message : String(e)
      console.error('[get-styles-for-font] Failed:', details, e)
      figma.notify(`Could not load target styles right now.`, { error: true })
      figma.ui.postMessage({ type: 'styles-for-font-loaded', fontFamily: '', styles: [] })
      figma.ui.postMessage({
        type: 'style-mapping-feedback',
        kind: 'error',
        message: 'Could not load target styles right now.'
      })
    }
    return
  } else if (msg.type === 'scan-selection') {
    try {
      const selection = figma.currentPage.selection
      if (selection.length === 0) {
        figma.notify('Please select a frame or text layer to scan styles.', { error: true })
        figma.ui.postMessage({
          type: 'style-mapping-feedback',
          kind: 'error',
          message: 'Please select a frame or text layer to scan styles.'
        })
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
      figma.notify('Could not scan the current selection.', { error: true })
      figma.ui.postMessage({
        type: 'style-mapping-feedback',
        kind: 'error',
        message: 'Could not scan the current selection.'
      })
    }
    return
  } else if (msg.type === 'style-mapping-notify') {
    const message = typeof msg.message === 'string' ? msg.message : ''
    if (message) {
      figma.notify(message, msg.error ? { error: true } : undefined)
    }
    return
  } else if (msg.type === 'ui-notify') {
    const message = typeof msg.message === 'string' ? msg.message : ''
    if (message) {
      figma.notify(message, msg.error ? { error: true } : undefined)
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
  } else if (msg.type === 'get-api-key') {
    try {
      const apiKey = await loadSarvamApiKey()
      const geminiApiKey = await loadGeminiApiKey()
      figma.ui.postMessage({ type: 'api-key-loaded', apiKey, geminiApiKey })
    } catch {
      figma.ui.postMessage({ type: 'api-key-loaded', apiKey: '', geminiApiKey: '' })
    }
    return
  } else if (msg.type === 'save-api-key') {
    try {
      const apiKey = typeof msg.apiKey === 'string' ? msg.apiKey : ''
      const geminiApiKey = typeof msg.geminiApiKey === 'string' ? msg.geminiApiKey : ''
      const savedKey = await saveSarvamApiKey(apiKey)
      const savedGeminiKey = await saveGeminiApiKey(geminiApiKey)
      figma.ui.postMessage({ type: 'api-key-saved', apiKey: savedKey, geminiApiKey: savedGeminiKey })
      figma.notify('API keys saved')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save API key'
      figma.ui.postMessage({ type: 'error', message })
      figma.notify(message, { error: true })
    }
    return
  } else if (msg.type === 'get-refine-threads') {
    try {
      const threads = await loadRefineThreads()
      figma.ui.postMessage({ type: 'refine-threads-loaded', threads })
    } catch {
      figma.ui.postMessage({ type: 'refine-threads-loaded', threads: {} })
    }
    return
  } else if (msg.type === 'save-refine-threads') {
    try {
      await saveRefineThreads(msg.threads)
    } catch {
      figma.ui.postMessage({ type: 'error', message: 'Failed to save refine history' })
    }
    return
  } else if (msg.type === 'clear-api-key-test') {
    try {
      await figma.clientStorage.deleteAsync(SARVAM_API_KEY_STORAGE_KEY)
      await figma.clientStorage.deleteAsync(GEMINI_API_KEY_STORAGE_KEY)
      sarvamApiKeyCache = ''
      geminiApiKeyCache = ''
      figma.ui.postMessage({ type: 'api-key-cleared' })
      figma.notify('API key cleared for testing')
    } catch {
      figma.ui.postMessage({ type: 'error', message: 'Failed to clear API key' })
      figma.notify('Failed to clear API key', { error: true })
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
      const families = await getAvailableFontFamilies()
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
  } else if (msg.type === 'get-usage-hint-state') {
    try {
      const seen = await figma.clientStorage.getAsync(USAGE_HINT_SEEN_KEY)
      figma.ui.postMessage({ type: 'usage-hint-state-loaded', seen: Boolean(seen) })
    } catch {
      figma.ui.postMessage({ type: 'usage-hint-state-loaded', seen: false })
    }
    return
  } else if (msg.type === 'dismiss-usage-hint') {
    try {
      await figma.clientStorage.setAsync(USAGE_HINT_SEEN_KEY, true)
      figma.ui.postMessage({ type: 'usage-hint-state-loaded', seen: true })
    } catch {
      figma.ui.postMessage({ type: 'usage-hint-state-loaded', seen: true })
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
      const keys = await figma.clientStorage.keysAsync()
      const ourKeys = keys.filter(k => k.startsWith(CACHE_PREFIX + ':') || k === REFINE_THREADS_STORAGE_KEY)
      for (const k of ourKeys) await figma.clientStorage.deleteAsync(k)
      figma.ui.postMessage({ type: 'hard-reset-complete' })
      figma.notify(`Cleared ${ourKeys.length} cached translation entries`)
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: 'Hard reset failed' })
    }
    return
  } else if (msg.type === 'ftux-reset') {
    try {
      const keys = await figma.clientStorage.keysAsync()
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX + ':'))
      const resetKeys = [
        ...cacheKeys,
        REFINE_THREADS_STORAGE_KEY,
        SARVAM_API_KEY_STORAGE_KEY,
        GEMINI_API_KEY_STORAGE_KEY,
        'ai-translate-bulk-languages',
        FONT_PREFS_KEY,
        STYLE_MAPPINGS_KEY,
        USAGE_HINT_SEEN_KEY,
      ]

      for (const key of Array.from(new Set(resetKeys))) {
        await figma.clientStorage.deleteAsync(key)
      }

      sarvamApiKeyCache = ''
      geminiApiKeyCache = ''
      fontPrefsCache = {}
      styleMappingsCache = null

      figma.ui.postMessage({ type: 'ftux-reset-complete' })
      figma.notify('FTUX reset complete: preferences, API keys, history, and cache cleared')
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: 'FTUX reset failed' })
      figma.notify('FTUX reset failed', { error: true })
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
        figma.notify('Please select frames or text layers to swap fonts', { error: true })
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
      
      debugLog(`Total text nodes found for font swap: ${textNodes.length}`)
      
      if (textNodes.length === 0) {
        figma.ui.postMessage({ 
          type: 'error', 
          message: 'No text found in selected frames or text layers' 
        })
        figma.notify('No text found in selected frames or text layers', { error: true })
        return
      }
      
      const relevantNodes = textNodes
      debugLog(`Processing all ${relevantNodes.length} text nodes`)
      
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
          
          const result = await swapFontFamily(textNode, msg.targetFont)
          
          if (result === 'success') {
            swappedCount++
            debugLog(`✅ Font swapped successfully for text node ${i + 1}`)
          } else if (result === 'error') {
            errors++
            debugLog(`❌ Failed to swap font for text node ${i + 1}`)
          } else {
            skippedCount++
            debugLog(`⚠️ Skipped font swap for text node ${i + 1}`)
          }
          
          // Yield occasionally so long swaps stay responsive without forcing a per-node delay.
          if ((i + 1) % 20 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0))
          }
          
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
      const errMsg = `Error: ${(error as Error).message}`
      figma.ui.postMessage({ 
        type: 'error', 
        message: errMsg
      })
      figma.notify(`❌ ${errMsg}`, { error: true })
    }
  }
} 

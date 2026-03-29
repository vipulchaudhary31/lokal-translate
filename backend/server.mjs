import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

loadEnvFile(join(__dirname, '.env'))

const PORT = Number(process.env.PORT || 8787)
const SARVAM_API_KEY = process.env.SARVAM_API_KEY || ''
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

const SARVAM_TRANSLATE_URL = 'https://api.sarvam.ai/translate'
const SARVAM_LANGUAGE_DETECT_URL = 'https://api.sarvam.ai/text-lid'
const SARVAM_TRANSLITERATE_URL = 'https://api.sarvam.ai/transliterate'
const SARVAM_CHAT_COMPLETIONS_URL = 'https://api.sarvam.ai/v1/chat/completions'
const GEMINI_GENERATE_CONTENT_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) continue
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!(key in process.env)) process.env[key] = value
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
  })
  res.end(JSON.stringify(payload))
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message })
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  return raw ? JSON.parse(raw) : {}
}

async function proxyJson({ url, body, headers = {} }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })

  const responseText = await response.text()
  let json = null
  try {
    json = responseText ? JSON.parse(responseText) : null
  } catch {
    json = null
  }

  return {
    ok: response.ok,
    status: response.status,
    responseText,
    json,
  }
}

function requireKeys(res, required) {
  const missing = required.filter(item => !item.value)
  if (missing.length === 0) return true
  sendError(res, 503, `Missing backend env: ${missing.map(item => item.name).join(', ')}`)
  return false
}

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      sendError(res, 404, 'Not found')
      return
    }

    if (req.method === 'GET' && req.url === '/health') {
      if (!GEMINI_API_KEY) {
        sendError(res, 503, 'Backend is missing GEMINI_API_KEY.')
        return
      }
      sendJson(res, 200, { ok: true, message: 'Secure backend connected.' })
      return
    }

    if (req.method !== 'POST') {
      sendError(res, 405, 'Method not allowed')
      return
    }

    const body = await readJsonBody(req)

    if (req.url === '/translate') {
      if (!requireKeys(res, [{ name: 'SARVAM_API_KEY', value: SARVAM_API_KEY }])) return
      const upstream = await proxyJson({
        url: SARVAM_TRANSLATE_URL,
        body,
        headers: {
          'api-subscription-key': SARVAM_API_KEY,
        },
      })
      sendJson(res, upstream.status, upstream.json ?? { error: upstream.responseText || 'Translate request failed.' })
      return
    }

    if (req.url === '/detect-language') {
      if (!requireKeys(res, [{ name: 'SARVAM_API_KEY', value: SARVAM_API_KEY }])) return
      const upstream = await proxyJson({
        url: SARVAM_LANGUAGE_DETECT_URL,
        body,
        headers: {
          'api-subscription-key': SARVAM_API_KEY,
        },
      })
      sendJson(res, upstream.status, upstream.json ?? { error: upstream.responseText || 'Language detection failed.' })
      return
    }

    if (req.url === '/transliterate') {
      if (!requireKeys(res, [{ name: 'SARVAM_API_KEY', value: SARVAM_API_KEY }])) return
      const upstream = await proxyJson({
        url: SARVAM_TRANSLITERATE_URL,
        body,
        headers: {
          'api-subscription-key': SARVAM_API_KEY,
        },
      })
      sendJson(res, upstream.status, upstream.json ?? { error: upstream.responseText || 'Transliteration failed.' })
      return
    }

    if (req.url === '/refine-options') {
      if (!requireKeys(res, [{ name: 'SARVAM_API_KEY', value: SARVAM_API_KEY }])) return
      const upstream = await proxyJson({
        url: SARVAM_CHAT_COMPLETIONS_URL,
        body,
        headers: {
          'api-subscription-key': SARVAM_API_KEY,
        },
      })
      sendJson(res, upstream.status, upstream.json ?? { error: upstream.responseText || 'Refine options failed.' })
      return
    }

    if (req.url === '/refine-chat') {
      if (!requireKeys(res, [{ name: 'GEMINI_API_KEY', value: GEMINI_API_KEY }])) return
      const upstream = await proxyJson({
        url: `${GEMINI_GENERATE_CONTENT_URL}?key=${encodeURIComponent(GEMINI_API_KEY)}`,
        body,
      })
      sendJson(res, upstream.status, upstream.json ?? { error: upstream.responseText || 'Refine chat failed.' })
      return
    }

    sendError(res, 404, 'Not found')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected backend error.'
    sendError(res, 500, message)
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Lokal Translate backend listening on http://127.0.0.1:${PORT}`)
})

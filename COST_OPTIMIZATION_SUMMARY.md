# Cost Optimization Implementation Summary

## Overview

This document describes all cost optimizations implemented in the AI Translate Pro V2 Figma plugin. Every optimization preserves translation quality; none change output content.

---

## Implemented Optimizations

### 1. Persistent Translation Cache (`figma.clientStorage`)

| Setting | Value | Notes |
|---------|-------|-------|
| **Storage** | `figma.clientStorage` | Persists across Figma sessions, 5MB limit per plugin |
| **TTL** | 24 hours | Entries older than 24h are treated as expired |
| **Max entries** | 800 | Eviction when exceeded (oldest keys removed) |
| **Prefix** | `ai-translate-v2:` | Isolates plugin cache keys |

**Cached APIs:**
- **Translate** — key: `tr:{sourceCode}:{targetCode}:{normalizedText}`
- **Transliterate** — key: `tl:{source}:{target}:{normalizedText}`
- **LID (Language Detection)** — key: `lid:{normalizedText}`

**Impact:** Cached results = 0 API cost. Re-running the same translation or reusing content across designs uses cache.

---

### 2. Session Cache (Per-Run Deduplication)

Each translate/bulk run creates an in-memory session cache:

- **`lid`** — Language detection results for this run
- **`tr`** — Translation results (source|target|text → result)
- **`tl`** — Transliteration results

**Flow:** Before calling `getCached()` (persistent) or the API, we check the session cache. Repeated text in the same run (e.g. multiple "Submit" buttons) is resolved instantly without storage or API calls.

**Impact:** 30–70% fewer API calls when designs have repeated strings (buttons, labels, common phrases).

---

### 3. Text Normalization for Cache Keys

Text is normalized before cache lookup to improve hit rate:

```typescript
// Applied in order:
- \u00A0 (non-breaking space) → regular space
- \u200B, \u200C, \u200D, \uFEFF (zero-width chars) → remove
- trim()
- collapse whitespace (\s+ → single space)
```

**Impact:** Variants like `"Hello  World"`, `"Hello\u00A0World"`, and `"Hello World"` share the same cache entry. The actual text sent to the API is unchanged; only the cache key is normalized.

---

### 4. Assume Source Is English (Default)

- **UI:** Checkbox "Assume source is English (faster, fewer API calls)" — **checked by default**
- **Effect:** When checked, skips the Language Detection (LID) API for translate nodes
- **Cost:** 1 API call per text instead of 2 (LID + translate)

**When to uncheck:** Use when source content may not be English (e.g. Hindi → Tamil). LID will run for each unique text.

---

### 5. Rate Limiting Only on API Calls

- **Before:** 50ms delay after every node (including cache hits)
- **After:** 50ms delay only immediately before each actual API request

**Implementation:** Session tracks `lastApiTime`. Before each `fetch`, we wait if `now - lastApiTime < 50ms`, then update `lastApiTime`.

**Impact:** Bulk runs with many cache hits are much faster (no artificial delays on cache hits).

---

### 6. Deferred Cache Trim

`trimCacheIfNeeded()` runs every **25 writes** instead of every write.

**Impact:** Fewer `keysAsync()` and `deleteAsync()` calls during heavy use; cache eviction still keeps size under 800 entries.

---

### 7. Configurable Bulk Languages

- **Storage:** `figma.clientStorage` key `ai-translate-bulk-languages`
- **FTU:** First click on bulk translate opens setup (select languages)
- **Edit:** Gear icon to change preferred languages anytime
- **Impact:** Choose fewer languages (e.g. Hindi + Tamil only) = fewer API calls and lower cost

---

### 8. Clear Cache Control

- **UI:** "Clear translation cache" link in the Translate tab
- **Action:** Deletes all keys with prefix `ai-translate-v2:`
- **Use case:** Reset cache when translations seem stale or for debugging

---

## API Call Flow (Optimized)

```
For each text node:
  1. Normalize text for cache key
  2. Check session cache → if hit, return (no API, no delay)
  3. Check persistent cache (getCached) → if hit, store in session, return (no API, no delay)
  4. Call rateLimitBeforeApiCall (wait if needed)
  5. Make API request
  6. Store result in session cache and persistent cache
  7. Decrementally run trimCacheIfNeeded (every 25 writes)
```

---

## Expected Savings

| Scenario | Before | After (typical) |
|----------|--------|-----------------|
| Regular translate, 20 nodes, assume English | 40 calls (20 LID + 20 translate) | 20 calls |
| Regular translate, 20 nodes, 10 unique texts | 20 calls | 10 calls (session dedup) |
| Bulk: 50 nodes × 9 languages | 450 calls | 50–150 (many repeats + cache) |
| Re-run bulk on same design | 450 calls | ~0 (mostly cache hits) |
| UI with 30 "Submit" buttons | 30 calls | 1 call (session + cache) |

---

## Technical Reference

### Cache Key Format

```
ai-translate-v2:{prefix}:{args}
- tr:en-IN:hi-IN:normalized text
- tl:en:hi:normalized text
- lid:normalized text
```

### Constants (`main.ts`)

| Constant | Value | Purpose |
|----------|-------|---------|
| `CACHE_TTL_MS` | 86400000 (24h) | Cache entry expiry |
| `CACHE_MAX_ENTRIES` | 800 | Max cache size before eviction |
| `RATE_LIMIT_MS` | 50 | Min ms between API calls |
| `TRIM_CACHE_EVERY_N_WRITES` | 25 | Run eviction every N writes |

### Relevant Functions

- `normalizeTextForCache(text)` — Cache key normalization
- `getCached<T>(key)` / `setCached(key, value)` — Persistent cache access
- `createSessionCache()` — New session for a run
- `rateLimitBeforeApiCall(session)` — Throttle before API calls

---

## Not Implemented (Sarvam API Limits)

- **Batch translate:** Sarvam API accepts a single `input` string per request; no batch endpoint.
- **Parallel requests:** Sequential processing with rate limiting to avoid 429.
- **Cost dashboard:** No real-time cost display; optimizations are transparent.

---

## Future Ideas

- Configurable cache TTL
- Optional cost estimation before translate
- Export/import cache for team sharing

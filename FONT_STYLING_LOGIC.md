# Font Styling Logic — Translation Service

This document describes all hardcoded logic for font names, weights, line heights, and related styling in the translation plugin.

---

## 1. Language → Font Family Mapping

**Location:** `LANGUAGE_FONTS` constant, `getFontForLanguage()`

| Language | Font Family | Notes |
|----------|-------------|-------|
| Hindi (hi) | Noto Sans Devanagari UI | |
| Marathi (mr) | Noto Sans Devanagari UI | Same as Hindi |
| Bengali (bn) | Noto Sans Bengali UI | |
| Gujarati (gu) | Noto Sans Gujarati UI | |
| Punjabi (pa) | Noto Sans Gurmukhi UI | |
| Tamil (ta) | Noto Sans Tamil UI | |
| Telugu (te) | **Kohinoor Telugu** | Special case — different from other languages |
| Kannada (kn) | Noto Sans Kannada UI | |
| Malayalam (ml) | Noto Sans Malayalam UI | |
| English (en) | Noto Sans | Latin/fallback |
| *Other/unknown* | Noto Sans | Fallback |

---

## 2. Weight Mapping (createWeightMappingOrder)

**Location:** `createWeightMappingOrder(originalStyle)`

Maps the original font style to an ordered list of target weights to try. Based on a hierarchy:

| Original style keywords | Target weights tried (in order) |
|-------------------------|--------------------------------|
| thin, ultralight, 100 | Thin, UltraLight, ExtraLight, Light, Regular |
| extralight, 200 | ExtraLight, UltraLight, Thin, Light, Regular |
| light, 300 | Light, ExtraLight, Thin, Regular, Medium |
| regular, normal, 400, empty | Regular, Medium, Light, SemiBold |
| medium, 500 | Medium, Regular, SemiBold, Bold |
| semibold, demi-bold, 600 | SemiBold, Semi-Bold, Semi Bold, DemiBold, etc., Medium, Bold, Regular |
| bold, 700 | Bold, SemiBold, Medium, ExtraBold, Heavy, Regular |
| extrabold, 800 | ExtraBold, Extra Bold, UltraBold, Bold, Heavy, SemiBold |
| heavy, black, 900 | Heavy, Black, ExtraBold, Bold, SemiBold |
| *unknown* | Regular, Medium, SemiBold, Bold |

**Exact match priority:** The original style and capitalization variants are tried first before the hierarchy.

---

## 2b. Style Preservation (Mixed-Formatting Text)

**Location:** `translateWithStyledSegments()`, `applySegmentStylesToRange()`

When text has mixed formatting (bold/regular, strikethrough, different colors, etc.), translation preserves all original properties per segment. Only the text content is translated; styling is carried over unchanged.

**Preserved properties per segment (all Figma text properties with setRange* setters):**
- `fontName` (with weight mapping to target language font)
- `textDecoration` (NONE, UNDERLINE, STRIKETHROUGH)
- `textDecorationStyle`, `textDecorationOffset`, `textDecorationThickness`, `textDecorationColor`, `textDecorationSkipInk`
- `fills` or `fillStyleId` (text color; prefers style link when present)
- `fontSize`, `lineHeight`, `letterSpacing`, `textCase`
- `listOptions`, `listSpacing`, `indentation`, `paragraphIndent`, `paragraphSpacing`
- `hyperlink`

*Note: `textStyleId` is not applied so we can set the target language font. `openTypeFeatures` has no setter. `boundVariables` requires a different API and is not yet supported.*

**Flow:** `getStyledTextSegments()` → translate each segment → set full text → `setRangeFontName` / `setRangeTextDecoration` / `setRangeFills` / etc. per range.

---

## 3. Telugu-Specific Weight Options (applyFontToTextNode)

**Location:** `applyFontToTextNode()`, when `targetLanguage === 'te'`

When the target language is Telugu and the original weight is heavier than Regular (medium, semibold, bold, etc.):

**Telugu weight variants tried first:**
- SemiBold, Semibold, Semi Bold, Semi-Bold
- DemiBold, Demi Bold, Demi-Bold, 600

If none load, falls back to standard `createWeightMappingOrder`.

---

## 4. Text Style Definitions (TEXT_STYLE_DEFINITIONS)

**Location:** `TEXT_STYLE_DEFINITIONS` constant

Used for **Telugu styles** (when "Apply Telugu font styles" is checked) and for **font swap** with "Auto-apply font styles" (Inter → Noto Sans).

Each definition has:
- `size` — standard font size (px)
- `lineHeight` — standard line height (px)
- `weight` — Regular or SemiBold
- `styleName` — label for matching
- `teluguSize` — Telugu-specific size (usually 1px smaller)
- `teluguLineHeight` — Telugu-specific line height (often same as standard)

| styleName | size | lineHeight | teluguSize | teluguLineHeight |
|-----------|------|------------|------------|------------------|
| Heading/Small | 18 | 27 | 17 | 27 |
| Heading/Medium | 22 | 30 | 21 | 30 |
| Heading/Large | 28 | 39 | 26 | 39 |
| Primary/Text/Regular | 16 | 24 | 15 | 24 |
| Primary/Text/Prominent | 16 | 24 | 15 | 24 |
| Label/Small | 11 | 16 | 11 | 16 |
| Label/Medium/Regular | 12 | 18 | 12 | 18 |
| Label/Medium/Prominent | 12 | 18 | 12 | 18 |
| Label/Large/Regular | 14 | 20 | 13 | 20 |
| Label/Large/Prominent | 14 | 20 | 13 | 20 |

**Matching logic (`findMatchingStyleDefinition`):**
- Matches by `fontSize` and `lineHeight` (within 0.1px tolerance)
- For Telugu: also matches against `teluguSize` and `teluguLineHeight`
- Heavier weights → SemiBold or Prominent variants
- Lighter weights → Regular variants (non-Prominent)
- Single Heading match → used regardless of weight

---

## 5. Telugu Style Application (applyTeluguFontAndStyle)

**Location:** `applyTeluguFontAndStyle()` — runs when target is Telugu and "Apply Telugu font styles" is checked (translation feature)

1. Find matching style definition (by size/lineHeight)
2. Look up existing Figma text style for `Kohinoor Telugu` — **never create** during translation
3. Weight: if original is heavier than Regular → try SemiBold first, else Regular
4. Apply `teluguSize` and `teluguLineHeight` from the definition
5. If a matching style exists, apply its ID to the node; otherwise apply font and size/lineHeight only

---

## 6. Load Font Fallback (loadFont)

**Location:** `loadFont()` — used when applying fonts

**Weight variants tried (in order):**
1. Current font style (original)
2. Regular
3. Medium
4. Bold
5. Light

**Final fallback:** Noto Sans Regular (if all fail)

---

## 7. applyFontToTextNode Fallback

**Location:** `applyFontToTextNode()`

**Fallback when user font fails:** Language default from `LANGUAGE_FONTS`, then Noto Sans (universal). Weight uses same mapping as primary font, not hardcoded Regular.

---

## 8. Font Swap Exclusions

**Location:** `swapFontFamily()`

- **applyFontStyles:** When false, only swaps if current font matches source font

---

## 9. Font Swap Weight Logic (manual, no applyFontStyles)

**Location:** `swapFontFamily()`, when `applyFontStyles` is false or style apply fails

- **Heavier weight** (medium, semibold, bold, heavy, black): try SemiBold first, else Regular
- **Otherwise:** Regular

---

## 10. When Each Path Is Used

| Flow | Font source | Size/lineHeight |
|------|-------------|-----------------|
| **Translate** (non-Telugu) | `getFontForLanguage(targetLang)` | Preserved from original |
| **Translate** (Telugu, applyTeluguStyles) | Kohinoor Telugu + `TEXT_STYLE_DEFINITIONS` | Telugu sizes from definitions |
| **Translate** (Telugu, no applyTeluguStyles) | Kohinoor Telugu | Preserved from original |
| **Hing** (transliterate) | Same as translate | Same as translate |
| **Bulk translate** | Same as translate | Same as translate |
| **Font swap** (applyFontStyles) | From UI source/target | From `TEXT_STYLE_DEFINITIONS` if Inter→Noto Sans |
| **Font swap** (no applyFontStyles) | From UI | Preserved |

---

## 11. Summary of Hardcoded Values

- **Font families:** 10 language→font mappings, all Noto Sans UI variants except Telugu (Kohinoor Telugu)
- **Fallback font:** Noto Sans Regular (language default first, then universal)
- **Weights:** Thin → Black hierarchy, plus Telugu-specific SemiBold variants
- **Sizes:** 11–28px from `TEXT_STYLE_DEFINITIONS`
- **Line heights:** 16–39px from `TEXT_STYLE_DEFINITIONS`
- **Telugu size offset:** Usually −1px vs standard (e.g. 18→17, 16→15)
- **Match tolerance:** 0.1px for size/lineHeight

# `ad.json` reference

The whole ad: brand, scenes, copy. Everything else is derived.

## Top level

| Key | Type | Notes |
|---|---|---|
| `brandName` | string | Shown in the persistent corner mark and on the CTA scene. Defaults to `brand.json`'s `name`. |
| `logo` | string | Path under `public/`, e.g. `assets/logo.png`. Defaults to the icon found by research. SVGs are not used for the corner mark. |
| `scenes` | array | 3–6. Order is playback order. |
| `palette` | object | Optional override, merged over the extracted palette. See [customising](customising.md). |
| `font` | string | Optional CSS font stack. |

Total runtime is the sum of scene `seconds`. **15–22 seconds is the useful range.** Under 12
and there is no room for proof; over 25 and completion collapses on feed placements.

## Scenes

Every scene takes `seconds` (number, required).

### `hook`

The first two seconds are the only ones most viewers see.

| Field | Type | Notes |
|---|---|---|
| `kicker` | string | 2–4 words, uppercased in render. Category, not a sentence. |
| `headline` | string | **The whole ad.** Lead with the viewer's problem in their words. |
| `sub` | string | One line making it concrete. |
| `shot` | string | Image path under `public/`. |

Lead with the problem, never with the product name or a greeting. "Job lost? Relationship
over?" works because it is the sentence already in the viewer's head.

### `feature`

| Field | Type | Notes |
|---|---|---|
| `kicker` | string | |
| `headline` | string | One reason to care, not a feature list. |
| `bullets` | string[] | **Maximum 3.** Phrases, not sentences. |
| `shot` | string | |

Bullets carry the specifics. "₹49 a question, flat" beats "affordable pricing" — a number is
concrete, and concrete is what gets remembered.

### `proof`

Evidence someone other than you believed it.

| Field | Type | Notes |
|---|---|---|
| `stat` | string | Counts up on screen. `"₹49"`, `"300+"`, `"9.6M"` all keep their shape. |
| `statLabel` | string | What the number counts. |
| `quote` | string | A real quote or result. |
| `attrib` | string | Who said it. An unattributed quote is not proof. |

`stat` animates from zero to its value — the numeric part is detected and any prefix or
suffix is preserved, so a currency symbol or a `+` survives intact.

### `cta`

| Field | Type | Notes |
|---|---|---|
| `headline` | string | The offer. |
| `action` | string | A verb. "Roast my resume →", not "Learn more". |
| `url` | string | Bare domain. No `https://`, no tracking parameters. |

One action only. A second choice halves the first.

## Writing rules that beat the template

- **Headlines under ~8 words.** The measure is capped in characters, so a long headline
  shrinks and wraps badly at 16:9.
- **Say the number.** Take real figures from the product's page.
- **Claim only what the site claims.** Never invent a statistic, a review, or a price.
- **One CTA.**
- **Read the page before writing.** `brand.json` gives you identity, not judgement.

## Minimal valid file

```json
{
  "brandName": "Thing",
  "scenes": [
    { "type": "hook", "seconds": 4, "headline": "The problem." },
    { "type": "cta", "seconds": 4, "headline": "The offer.", "action": "Go →", "url": "thing.com" }
  ]
}
```

Every field except `type` and `seconds` is optional; scenes render what they are given.

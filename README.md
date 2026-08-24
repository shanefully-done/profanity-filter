# profanity-ko-en

Zero-dependency Korean+English profanity filter — check, detect, and censor text with Korean obfuscation handling.

## Why

Korean profanity filtering is harder than English because obfuscation is pervasive: jamo separation (ㅅㅏ발), leet and homoglyph substitution ($→s, ㅣ↔l↔1), and emoji substitution (🐦→새). A naive word-list approach catches almost nothing. This library normalizes those tricks before matching, and ships curated false-positive lists so legitimate Korean text (시발점, 보지도 못 했다, 개미) isn't censored. False-positive curation is what makes Korean filtering actually usable.

## Install

```sh
npm install profanity-ko-en
```

## Usage

```ts
import { check, detect, censor } from "profanity-ko-en"

check("씨발") // true

detect("이 새끼야")
// [{ match: "새끼", category: "general", index: 2 }]

censor("이 새끼야") // "이 **야" (length-preserving)

censor("damn sh1t", { mask: "🤐" }) // "damn 🤐🤐🤐🤐"
```

Filter specific categories:

```ts
check("씨발", { categories: ["general", "sexual"] }) // true
```

## API

```ts
type Category =
	| "general"
	| "minor"
	| "sexual"
	| "belittle"
	| "race"
	| "parent"
	| "politics"
	| "special"
	| "english"

check(text: string, opts?: { categories?: readonly Category[] }): boolean

detect(
	text: string,
	opts?: { categories?: readonly Category[] }
): Array<{ match: string; category: Category; index: number }>

censor(
	text: string,
	opts?: { mask?: string; categories?: readonly Category[] }
): string
```

- `index` in `detect` results is the index into the **original** string.
- `censor` is length-preserving: each character of the matched span is replaced with `mask` (default `*`).

### Categories

| Category   | Origin                                        |
| ---------- | --------------------------------------------- |
| `general`  | korcen (Korean)                               |
| `minor`    | korcen (Korean)                               |
| `sexual`   | korcen (Korean)                               |
| `belittle` | korcen (Korean)                               |
| `race`     | korcen (Korean)                               |
| `parent`   | korcen (Korean)                               |
| `politics` | korcen (Korean)                               |
| `special`  | korcen (Korean)                               |
| `english`  | LDNOOBW List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words |

## How it works

1. **Normalize** — apply single-char and multi-char replacement maps (Korean jamo, leet, homoglyphs, emoji).
2. **De-obfuscate** — further normalize the cleaned string for pattern matching.
3. **Pattern-match** — run compiled regexes for each enabled category against the normalized text.
4. **False-positive exclusion** — remove matches that fall on known false-positive patterns.
5. **Mask** — replace matched spans in the original string.

URLs are skipped during matching. All patterns and regexes are compiled once at module init for fast per-call performance.

### English semantics

English words are matched at word boundaries after leet normalization (`sh1t`, `b@lls` caught; substrings like `class` are not matched).

## Data sources & licenses

| Source  | License |
| ------- | ------- |
| [korcen](https://github.com/Tanat05/korcen) by Tanat05 | MIT |
| [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words) `en` list | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Our additions (normalization-closure variants, extra patterns, English leet map, engine) | MIT |

See [NOTICE](./NOTICE) for full attribution details.

## Limitations

- English spaced-out evasion (`f u c k`) is not caught.
- Masking is length-preserving; multi-byte mask characters may visually exceed the matched span.

## Development

```sh
bun install
bun test
bun run build
```

## License

MIT

import type { Category } from "./scanner.js"
import {
	validateCategories,
	buildUrlSpans,
	scanKorean,
	scanEnglish,
} from "./scanner.js"

export type { Category }

const DEFAULT_CATEGORIES: readonly Category[] = [
	"general",
	"minor",
	"sexual",
	"belittle",
	"race",
	"parent",
	"politics",
	"special",
	"english",
]

export function check(
	text: string,
	opts?: { categories?: readonly Category[] }
): boolean {
	const categories = opts?.categories ?? DEFAULT_CATEGORIES
	validateCategories(categories)
	if (text.length === 0) return false
	const urlSpans = buildUrlSpans(text)
	for (const cat of categories) {
		const matches =
			cat === "english"
				? scanEnglish(text, urlSpans)
				: scanKorean(text, urlSpans, cat)
		if (matches.length > 0) return true
	}
	return false
}

export function detect(
	text: string,
	opts?: { categories?: readonly Category[] }
): Array<{ match: string; category: Category; index: number }> {
	const categories = opts?.categories ?? DEFAULT_CATEGORIES
	validateCategories(categories)
	if (text.length === 0) return []
	const urlSpans = buildUrlSpans(text)
	const results: Array<{
		match: string
		category: Category
		index: number
	}> = []
	for (const cat of categories) {
		const matches =
			cat === "english"
				? scanEnglish(text, urlSpans)
				: scanKorean(text, urlSpans, cat)
		for (const m of matches) {
			results.push(m as { match: string; category: Category; index: number })
		}
	}
	return results
}

function mergeSpans(
	spans: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }> {
	if (spans.length === 0) return []
	const sorted = [...spans].sort((a, b) => a.start - b.start || a.end - b.end)
	const merged = [{ start: sorted[0]!.start, end: sorted[0]!.end }]
	for (let i = 1; i < sorted.length; i++) {
		const last = merged[merged.length - 1]!
		const curr = sorted[i]!
		if (curr.start < last.end) {
			if (curr.end > last.end) last.end = curr.end
		} else {
			merged.push({ start: curr.start, end: curr.end })
		}
	}
	return merged
}

export function censor(
	text: string,
	opts?: { mask?: string; categories?: readonly Category[] }
): string {
	const categories = opts?.categories ?? DEFAULT_CATEGORIES
	validateCategories(categories)
	if (text.length === 0) return ""
	const mask = opts?.mask ?? "*"
	const urlSpans = buildUrlSpans(text)
	const spans: Array<{ start: number; end: number }> = []
	for (const cat of categories) {
		const matches =
			cat === "english"
				? scanEnglish(text, urlSpans)
				: scanKorean(text, urlSpans, cat)
		for (const m of matches) {
			spans.push({ start: m.index, end: m.index + m.match.length })
		}
	}
	const merged = mergeSpans(spans)
	let result = ""
	let pos = 0
	for (const span of merged) {
		result += text.slice(pos, span.start)
		result += mask.repeat(span.end - span.start)
		pos = span.end
	}
	result += text.slice(pos)
	return result
}

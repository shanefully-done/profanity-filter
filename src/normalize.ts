export interface Entry {
	text: string
	start: number
	end: number
}

export function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function joinEntries(entries: Entry[]): string {
	let s = ""
	for (const e of entries) s += e.text
	return s
}

export function findCoveringEntries(
	entries: Entry[],
	matchStart: number,
	matchEnd: number
): [number, number] | null {
	let first = -1
	let last = -1
	let offset = 0
	for (let i = 0; i < entries.length; i++) {
		const e = entries[i]!
		const eEnd = offset + e.text.length
		if (offset < matchEnd && eEnd > matchStart) {
			if (first === -1) first = i
			last = i
		}
		offset = eEnd
	}
	return first === -1 ? null : [first, last]
}

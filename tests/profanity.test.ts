import { describe, it, expect } from "bun:test"
import { check, detect, censor } from "../src/index.ts"
import type { Category } from "../src/index.ts"

describe("check — Korean obfuscation detection", () => {
	it("detects 씨발 (additional)", () => {
		expect(check("씨발")).toBe(true)
	})
	it("detects ㅅㅂ", () => {
		expect(check("ㅅㅂ")).toBe(true)
	})
	it("detects ㅆㅣ발 (closure ㅆㅏ발)", () => {
		expect(check("ㅆㅣ발")).toBe(true)
	})
	it("detects s1bal (closure slbal)", () => {
		expect(check("s1bal")).toBe(true)
	})
	it("detects 시ㅣ발 (additional 시ㅏ발)", () => {
		expect(check("시ㅣ발")).toBe(true)
	})
	it("detects $1발 (additional sl발)", () => {
		expect(check("$1발")).toBe(true)
	})
	it("detects /＼발 (multiChar → ㅅ발)", () => {
		expect(check("/＼발")).toBe(true)
	})
	it("detects ㅇl=스 (multiChar → 섹스)", () => {
		expect(check("ㅇl=스")).toBe(true)
	})
	it("detects 🐦끼 (emoji map → 새끼)", () => {
		expect(check("🐦끼")).toBe(true)
	})
	it("detects 씨 바 (space-stripped → 씨바)", () => {
		expect(check("씨 바")).toBe(true)
	})
	it("detects tlqkf", () => {
		expect(check("tlqkf")).toBe(true)
	})
	it("detects 병신", () => {
		expect(check("병신")).toBe(true)
	})
	it("detects 꺼져", () => {
		expect(check("꺼져")).toBe(true)
	})
})

describe("check — English detection", () => {
	it("detects sh1t (leet)", () => {
		expect(check("sh1t")).toBe(true)
	})
	it("detects SH1T (case insensitive + leet)", () => {
		expect(check("SH1T")).toBe(true)
	})
	it("detects 2 girls 1 cup (multi-word)", () => {
		expect(check("2 girls 1 cup")).toBe(true)
	})
	it("detects b@lls (leet)", () => {
		expect(check("b@lls")).toBe(true)
	})
})

describe("check — English word-boundary false positives", () => {
	it("does not detect class", () => {
		expect(check("class")).toBe(false)
	})
	it("does not detect assess", () => {
		expect(check("assess")).toBe(false)
	})
	it("does not detect bass", () => {
		expect(check("bass")).toBe(false)
	})
})

describe("check — Korean false positives", () => {
	const fpVectors = [
		"시발점",
		"시발역",
		"보지도 못 했다",
		"자지 마",
		"개미",
		"1등신",
		"오리발",
		"미친증",
		"새끼손",
		"잠자지",
		"혼자",
	]
	for (const v of fpVectors) {
		it(`does not detect '${v}'`, () => {
			expect(check(v)).toBe(false)
		})
	}
})

describe("check — URL skipping", () => {
	it("does not detect profanity inside URLs", () => {
		expect(check("www.naver.com/shit")).toBe(false)
	})
	it("does not detect profanity inside https URLs", () => {
		expect(check("visit https://a.b/wtf now")).toBe(false)
	})
	it("censor preserves URL content", () => {
		const input = "씨발 https://example.com/씨발"
		const masked = "*".repeat("씨발".length)
		const expected = masked + " https://example.com/씨발"
		expect(censor(input)).toBe(expected)
	})
})

describe("check — empty string", () => {
	it("returns false for empty string", () => {
		expect(check("")).toBe(false)
	})
	it("detect returns [] for empty string", () => {
		expect(detect("")).toEqual([])
	})
	it("censor returns '' for empty string", () => {
		expect(censor("")).toBe("")
	})
})

describe("check — exactMatch", () => {
	it("detects tq as exactMatch", () => {
		expect(check("tq")).toBe(true)
	})
})

describe("check — options", () => {
	it("filters by categories", () => {
		expect(check("보지", { categories: ["general"] })).toBe(false)
		expect(check("보지", { categories: ["sexual"] })).toBe(true)
		expect(check("병신", { categories: ["sexual"] })).toBe(false)
	})
	it("throws RangeError for unknown category", () => {
		expect(() =>
			check("test", { categories: ["unknown" as Category] })
		).toThrow(RangeError)
	})
})

describe("detect contract", () => {
	it("detects 새끼 with correct metadata", () => {
		expect(detect("이 새끼야")).toEqual([
			{ match: "새끼", category: "general", index: 2 },
		])
	})
	it("returns multiple hits in order", () => {
		const results = detect("씨발 보지")
		expect(results).toHaveLength(2)
		expect(results[0]!.category).toBe("general")
		expect(results[0]!.match).toBe("씨발")
		expect(results[1]!.category).toBe("sexual")
		expect(results[1]!.match).toBe("보지")
		expect(results[0]!.index).toBeLessThan(results[1]!.index)
	})
})

describe("censor — Korean masking", () => {
	it("masks 씨발 fully", () => {
		expect(censor("씨발")).toBe("*".repeat("씨발".length))
	})
	it("masks /＼발 fully", () => {
		expect(censor("/＼발")).toBe("*".repeat("/＼발".length))
	})
	it("masks ㅇl=스 fully", () => {
		expect(censor("ㅇl=스")).toBe("*".repeat("ㅇl=스".length))
	})
	it("masks 🐦끼 with correct length", () => {
		expect(censor("이 🐦끼야")).toBe(
			"이 " + "*".repeat("🐦끼".length) + "야"
		)
	})
	it("masks 씨 바 (space-stripped) covering full span", () => {
		expect(censor("씨 바")).toBe("*".repeat("씨 바".length))
	})
	it("masks tlqkf fully", () => {
		expect(censor("tlqkf")).toBe("*".repeat("tlqkf".length))
	})
	it("masks 병신 fully", () => {
		expect(censor("병신")).toBe("*".repeat("병신".length))
	})
	it("masks 꺼져 fully", () => {
		expect(censor("꺼져")).toBe("*".repeat("꺼져".length))
	})
})

describe("censor — English masking", () => {
	it("masks damn sh1t", () => {
		expect(censor("damn sh1t")).toBe("damn " + "*".repeat("sh1t".length))
	})
	it("masks b@lls", () => {
		expect(censor("nice b@lls")).toBe("nice " + "*".repeat("b@lls".length))
	})
})

describe("censor — false positives unchanged", () => {
	const fpVectors = [
		"시발점",
		"시발역",
		"보지도 못 했다",
		"자지 마",
		"개미",
		"1등신",
		"오리발",
		"미친증",
		"새끼손",
		"잠자지",
		"혼자",
	]
	for (const v of fpVectors) {
		it(`censor('${v}') returns input unchanged`, () => {
			expect(censor(v)).toBe(v)
		})
	}
})

describe("censor — FP entries must not mask across token boundaries", () => {
	it("masks 씨발 followed by a token starting with 끝", () => {
		expect(censor("씨발 끝")).toBe("** 끝")
	})
	it("masks 씨발 in 씨발 끝났다 (common phrasing)", () => {
		expect(censor("씨발 끝났다")).toBe("** 끝났다")
	})
	it("leaves the innocent word 발끝 unchanged", () => {
		expect(censor("발끝")).toBe("발끝")
	})
	it("leaves 발끝 까지 unchanged", () => {
		expect(censor("발끝 까지")).toBe("발끝 까지")
	})
})

describe("censor — custom mask", () => {
	it("supports single-char mask", () => {
		expect(censor("shit", { mask: "x" })).toBe("xxxx")
	})
	it("supports emoji mask", () => {
		expect(censor("shit", { mask: "🤐" })).toBe("🤐".repeat(4))
	})
})

describe("stability", () => {
	it("censor is idempotent", () => {
		const samples = [
			"씨발",
			"이 새끼야",
			"damn shit",
			"tlqkf",
			"병신 꺼져",
			"ㅇl=스",
		]
		for (const s of samples) {
			expect(censor(censor(s))).toBe(censor(s))
		}
	})
	it("produces identical results over 500 iterations", () => {
		const samples = [
			"씨발 새끼",
			"fuck shit",
			"보지 자지",
			"tlqkf ㅅㅂ",
		]
		for (let i = 0; i < 500; i++) {
			for (const s of samples) {
				const c = check(s)
				const d = censor(s)
				expect(check(s)).toBe(c)
				expect(censor(s)).toBe(d)
			}
		}
	})
})

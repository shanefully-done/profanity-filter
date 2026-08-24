import { escapeRegex, joinEntries, findCoveringEntries } from "./normalize.js";
import replacements from "./data/replacements.json" with { type: "json" };
import koData from "./data/ko.json" with { type: "json" };
import enData from "./data/en.json" with { type: "json" };
import fpData from "./data/falsePositives.json" with { type: "json" };
const VALID_CATEGORIES = {
    general: true,
    minor: true,
    sexual: true,
    belittle: true,
    race: true,
    parent: true,
    politics: true,
    special: true,
    english: true,
};
export function validateCategories(categories) {
    for (const c of categories) {
        if (!VALID_CATEGORIES[c])
            throw new RangeError(`Unknown category: ${c}`);
    }
}
const URL_REGEX = /https?:\/\/\S+|www\.\S+/g;
export function buildUrlSpans(text) {
    const spans = [];
    URL_REGEX.lastIndex = 0;
    for (const m of text.matchAll(URL_REGEX)) {
        spans.push({ start: m.index, end: m.index + m[0].length });
    }
    return spans;
}
export function buildEntries(text, urlSpans) {
    const entries = [];
    let urlIdx = 0;
    for (let i = 0; i < text.length;) {
        if (urlIdx < urlSpans.length && i >= urlSpans[urlIdx].start) {
            i = urlSpans[urlIdx].end;
            urlIdx++;
            continue;
        }
        const cp = text.codePointAt(i);
        const ch = String.fromCodePoint(cp);
        entries.push({ text: ch.toLowerCase(), start: i, end: i + ch.length });
        i += ch.length;
    }
    return entries;
}
const multiCharRaw = replacements.multiChar;
const multiCharEntries = multiCharRaw.map((e) => ({ from: e.from.toLowerCase(), to: e.to }));
const multiCharMap = new Map(multiCharEntries.map((e) => [e.from, e.to]));
const multiCharRegex = new RegExp(multiCharEntries
    .sort((a, b) => b.from.length - a.from.length)
    .map((e) => escapeRegex(e.from))
    .join("|"), "g");
function runMultiCharPass(entries) {
    const joined = joinEntries(entries);
    multiCharRegex.lastIndex = 0;
    const matches = [...joined.matchAll(multiCharRegex)];
    if (matches.length === 0)
        return entries;
    let result = entries;
    for (let m = matches.length - 1; m >= 0; m--) {
        const match = matches[m];
        const covering = findCoveringEntries(result, match.index, match.index + match[0].length);
        if (!covering)
            continue;
        const [first, last] = covering;
        const newEntry = {
            text: multiCharMap.get(match[0]) ?? match[0],
            start: result[first].start,
            end: result[last].end,
        };
        result = [...result.slice(0, first), newEntry, ...result.slice(last + 1)];
    }
    return result;
}
const singleCharMap = replacements.singleChar;
function runSingleCharPass(entries) {
    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        let newText = "";
        for (const c of e.text) {
            newText += singleCharMap[c] ?? c;
        }
        if (newText !== e.text)
            entries[i] = { ...e, text: newText };
    }
    return entries;
}
const englishSingleCharMap = replacements.englishSingleChar;
function runEnglishSingleCharPass(entries) {
    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        let newText = "";
        for (const c of e.text) {
            newText += englishSingleCharMap[c] ?? c;
        }
        if (newText !== e.text)
            entries[i] = { ...e, text: newText };
    }
    return entries;
}
function runWhitespaceCollapsePass(entries) {
    const result = [];
    let i = 0;
    while (i < entries.length) {
        if (/\s/.test(entries[i].text)) {
            const start = entries[i].start;
            let end = entries[i].end;
            i++;
            while (i < entries.length && /\s/.test(entries[i].text)) {
                end = entries[i].end;
                i++;
            }
            result.push({ text: " ", start, end });
        }
        else {
            result.push(entries[i]);
            i++;
        }
    }
    return result;
}
const categoryRewrites = replacements.categoryRewrites;
function runRewritePass(entries, category) {
    const rewrites = categoryRewrites[category];
    if (!rewrites)
        return entries;
    for (const { from, to } of rewrites) {
        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            const newText = e.text.split(from).join(to);
            if (newText !== e.text)
                entries[i] = { ...e, text: newText };
        }
    }
    return entries;
}
const koFPData = fpData.ko;
const fpRegexes = new Map();
for (const [cat, list] of Object.entries(koFPData)) {
    if (list.length === 0) {
        fpRegexes.set(cat, null);
    }
    else {
        const sorted = [...list].sort((a, b) => b.length - a.length);
        const pattern = sorted.map(escapeRegex).join("|");
        fpRegexes.set(cat, new RegExp(pattern, "g"));
    }
}
function runFPPass(entries, category) {
    const regex = fpRegexes.get(category);
    if (!regex)
        return entries;
    const joined = joinEntries(entries);
    regex.lastIndex = 0;
    const matches = [...joined.matchAll(regex)];
    if (matches.length === 0)
        return entries;
    let result = entries;
    for (let m = matches.length - 1; m >= 0; m--) {
        const match = matches[m];
        const covering = findCoveringEntries(result, match.index, match.index + match[0].length);
        if (!covering)
            continue;
        const [first, last] = covering;
        result = [...result.slice(0, first), ...result.slice(last + 1)];
    }
    return result;
}
const finalFilterRanges = replacements.finalFilterRanges;
const finalFilterRegexes = new Map();
for (const [cat, ranges] of Object.entries(finalFilterRanges)) {
    finalFilterRegexes.set(cat, new RegExp(`[^${ranges}]`, "gu"));
}
function runFinalFilterPass(entries, category) {
    const regex = finalFilterRegexes.get(category);
    if (!regex)
        return entries;
    const result = [];
    for (const e of entries) {
        const filtered = e.text.replace(regex, "");
        if (filtered.length > 0)
            result.push({ ...e, text: filtered });
    }
    return result;
}
const koJson = koData;
function getCategoryPatterns(category) {
    const base = koJson[category] ?? [];
    const additional = koJson.additional[category] ?? [];
    return [...base, ...additional];
}
const KOREAN_CATEGORIES = [
    "general",
    "minor",
    "sexual",
    "belittle",
    "race",
    "parent",
    "politics",
    "special",
];
const koreanPatternRegexes = new Map();
for (const cat of KOREAN_CATEGORIES) {
    const patterns = getCategoryPatterns(cat);
    const sorted = [...patterns].sort((a, b) => b.length - a.length);
    const pattern = sorted.map(escapeRegex).join("|");
    koreanPatternRegexes.set(cat, new RegExp(pattern, "g"));
}
const exactMatchSet = new Set(koJson.exactMatch);
const englishPatterns = enData;
function buildEnglishPattern(entry) {
    let mapped = "";
    for (const c of entry) {
        mapped += englishSingleCharMap[c] ?? c;
    }
    const escaped = escapeRegex(mapped).replace(/ /g, "\\s+");
    const startsAlphanum = /^[a-z0-9]/.test(mapped);
    const endsAlphanum = /[a-z0-9]$/.test(mapped);
    let pattern = escaped;
    if (startsAlphanum)
        pattern = `(?<![a-z0-9])${pattern}`;
    if (endsAlphanum)
        pattern = `${pattern}(?![a-z0-9])`;
    return pattern;
}
const englishPatternRegex = new RegExp([...englishPatterns]
    .sort((a, b) => b.length - a.length)
    .map(buildEnglishPattern)
    .join("|"), "g");
function runPatternSearch(entries, patternRegex, text, category) {
    const joined = joinEntries(entries);
    if (joined.length === 0)
        return [];
    patternRegex.lastIndex = 0;
    const results = [];
    for (const m of joined.matchAll(patternRegex)) {
        const covering = findCoveringEntries(entries, m.index, m.index + m[0].length);
        if (!covering)
            continue;
        const [first, last] = covering;
        const origStart = entries[first].start;
        const origEnd = entries[last].end;
        results.push({
            match: text.slice(origStart, origEnd),
            category,
            index: origStart,
        });
    }
    return results;
}
export function scanKorean(text, urlSpans, category) {
    if (text.length === 0)
        return [];
    let entries = buildEntries(text, urlSpans);
    entries = runMultiCharPass(entries);
    entries = runSingleCharPass(entries);
    entries = entries.filter((e) => !/\s/.test(e.text));
    entries = runRewritePass(entries, category);
    entries = runFPPass(entries, category);
    if (category !== "special") {
        entries = runFinalFilterPass(entries, category);
    }
    const patternRegex = koreanPatternRegexes.get(category);
    if (!patternRegex)
        return [];
    const results = runPatternSearch(entries, patternRegex, text, category);
    if (category === "general" && results.length === 0 && entries.length > 0) {
        const joined = joinEntries(entries);
        if (exactMatchSet.has(joined)) {
            results.push({
                match: text.slice(entries[0].start, entries[entries.length - 1].end),
                category,
                index: entries[0].start,
            });
        }
    }
    return results;
}
export function scanEnglish(text, urlSpans) {
    if (text.length === 0)
        return [];
    let entries = buildEntries(text, urlSpans);
    entries = runEnglishSingleCharPass(entries);
    entries = runWhitespaceCollapsePass(entries);
    return runPatternSearch(entries, englishPatternRegex, text, "english");
}

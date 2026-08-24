import type { Entry } from "./normalize.js";
export type Category = "general" | "minor" | "sexual" | "belittle" | "race" | "parent" | "politics" | "special" | "english";
export declare function validateCategories(categories: readonly string[]): void;
export declare function buildUrlSpans(text: string): Array<{
    start: number;
    end: number;
}>;
export declare function buildEntries(text: string, urlSpans: Array<{
    start: number;
    end: number;
}>): Entry[];
interface MatchResult {
    match: string;
    category: string;
    index: number;
}
export declare function scanKorean(text: string, urlSpans: Array<{
    start: number;
    end: number;
}>, category: string): MatchResult[];
export declare function scanEnglish(text: string, urlSpans: Array<{
    start: number;
    end: number;
}>): MatchResult[];
export {};

import type { Category } from "./scanner.js";
export type { Category };
export declare function check(text: string, opts?: {
    categories?: readonly Category[];
}): boolean;
export declare function detect(text: string, opts?: {
    categories?: readonly Category[];
}): Array<{
    match: string;
    category: Category;
    index: number;
}>;
export declare function censor(text: string, opts?: {
    mask?: string;
    categories?: readonly Category[];
}): string;

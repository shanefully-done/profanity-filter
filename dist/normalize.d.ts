export interface Entry {
    text: string;
    start: number;
    end: number;
}
export declare function escapeRegex(str: string): string;
export declare function joinEntries(entries: Entry[]): string;
export declare function findCoveringEntries(entries: Entry[], matchStart: number, matchEnd: number): [number, number] | null;

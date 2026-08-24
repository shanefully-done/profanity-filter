export function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function joinEntries(entries) {
    let s = "";
    for (const e of entries)
        s += e.text;
    return s;
}
export function findCoveringEntries(entries, matchStart, matchEnd) {
    let first = -1;
    let last = -1;
    let offset = 0;
    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const eEnd = offset + e.text.length;
        if (offset < matchEnd && eEnd > matchStart) {
            if (first === -1)
                first = i;
            last = i;
        }
        offset = eEnd;
    }
    return first === -1 ? null : [first, last];
}

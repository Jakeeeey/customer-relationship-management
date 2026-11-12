/** Label aliases only; never converts quantities or combines inventory pools. */
export function canonicalUnit(value: string): string {
    const unit = value.trim().toUpperCase();
    if (["BOX", "BOXES"].includes(unit)) return "BOX";
    if (["PC", "PCS", "PIECE", "PIECES"].includes(unit)) return "PCS";
    return unit;
}

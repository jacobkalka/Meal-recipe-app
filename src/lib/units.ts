import type { Units } from "./schemas";

/**
 * Quantity scaling, US <-> metric conversion and friendly formatting.
 * Units we don't recognise (clove, can, pinch, "") are scaled but never converted.
 */

type Dimension = "volume" | "weight";
interface UnitInfo {
  dim: Dimension;
  /** Size in ml (volume) or g (weight). */
  base: number;
  system: Units;
}

const UNITS: Record<string, UnitInfo> = {
  tsp: { dim: "volume", base: 4.92892, system: "us" },
  tbsp: { dim: "volume", base: 14.7868, system: "us" },
  cup: { dim: "volume", base: 236.588, system: "us" },
  "fl oz": { dim: "volume", base: 29.5735, system: "us" },
  pint: { dim: "volume", base: 473.176, system: "us" },
  quart: { dim: "volume", base: 946.353, system: "us" },
  gallon: { dim: "volume", base: 3785.41, system: "us" },
  oz: { dim: "weight", base: 28.3495, system: "us" },
  lb: { dim: "weight", base: 453.592, system: "us" },
  ml: { dim: "volume", base: 1, system: "metric" },
  cl: { dim: "volume", base: 10, system: "metric" },
  dl: { dim: "volume", base: 100, system: "metric" },
  l: { dim: "volume", base: 1000, system: "metric" },
  mg: { dim: "weight", base: 0.001, system: "metric" },
  g: { dim: "weight", base: 1, system: "metric" },
  kg: { dim: "weight", base: 1000, system: "metric" },
};

const ALIASES: Record<string, string> = {
  teaspoon: "tsp", teaspoons: "tsp", tsps: "tsp", "tsp.": "tsp",
  tablespoon: "tbsp", tablespoons: "tbsp", tbs: "tbsp", tbsps: "tbsp", "tbsp.": "tbsp", tbl: "tbsp",
  cups: "cup", c: "cup",
  "fluid ounce": "fl oz", "fluid ounces": "fl oz", floz: "fl oz", "fl. oz": "fl oz", "fl. oz.": "fl oz",
  pints: "pint", pt: "pint", quarts: "quart", qt: "quart", gallons: "gallon", gal: "gallon",
  ounce: "oz", ounces: "oz", "oz.": "oz",
  pound: "lb", pounds: "lb", lbs: "lb", "lb.": "lb",
  milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml", mls: "ml",
  liter: "l", liters: "l", litre: "l", litres: "l",
  gram: "g", grams: "g", gr: "g", gs: "g",
  kilogram: "kg", kilograms: "kg", kgs: "kg",
  milligram: "mg", milligrams: "mg",
};

export function canonicalUnit(unit: string): string {
  const u = unit.trim();
  const lower = u.toLowerCase();
  if (UNITS[lower]) return lower;
  if (ALIASES[lower]) return ALIASES[lower];
  return u;
}

export function unitInfo(unit: string): UnitInfo | null {
  return UNITS[canonicalUnit(unit)] ?? null;
}

export interface Amount {
  quantity: number | null;
  unit: string;
}

/** Converts a base amount (ml or g) into the most readable unit of a system. */
export function fromBase(base: number, dim: Dimension, system: Units): Amount {
  if (system === "metric") {
    if (dim === "volume") return base >= 1000 ? { quantity: base / 1000, unit: "l" } : { quantity: base, unit: "ml" };
    return base >= 1000 ? { quantity: base / 1000, unit: "kg" } : { quantity: base, unit: "g" };
  }
  if (dim === "volume") {
    if (base < UNITS.tbsp.base * 0.99) return { quantity: base / UNITS.tsp.base, unit: "tsp" };
    if (base < UNITS.cup.base / 4 - 0.5) return { quantity: base / UNITS.tbsp.base, unit: "tbsp" };
    return { quantity: base / UNITS.cup.base, unit: "cup" };
  }
  return base >= UNITS.lb.base * 0.99 ? { quantity: base / UNITS.lb.base, unit: "lb" } : { quantity: base / UNITS.oz.base, unit: "oz" };
}

/**
 * Scales an amount and expresses it in the requested unit system. When nothing
 * changes (factor 1, same system) the original unit is kept exactly as written.
 */
export function convertAmount(amount: Amount, factor: number, system: Units): Amount {
  if (amount.quantity == null) return amount;
  const scaled = amount.quantity * factor;
  const info = unitInfo(amount.unit);
  if (!info) return { quantity: scaled, unit: amount.unit };
  if (info.system === system && Math.abs(factor - 1) < 1e-9) {
    return { quantity: scaled, unit: canonicalUnit(amount.unit) };
  }
  // Keep small spoon measures as spoons in metric, too (1 tsp is 1 tsp everywhere).
  const canon = canonicalUnit(amount.unit);
  if (system === "metric" && (canon === "tsp" || canon === "tbsp")) {
    const base = scaled * info.base;
    if (base < UNITS.tbsp.base * 4) return fromBase(base, "volume", "us");
  }
  return fromBase(scaled * info.base, info.dim, system);
}

const FRACTIONS: [number, string][] = [
  [0, ""],
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [7 / 8, "⅞"],
  [1, ""],
];

function fraction(value: number): string {
  let whole = Math.floor(value);
  const rest = value - whole;
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f;
  if (best[0] === 1) {
    whole += 1;
    best = FRACTIONS[0];
  }
  if (whole === 0 && !best[1]) return value > 0 ? "⅛" : "0";
  if (whole === 0) return best[1];
  return best[1] ? `${whole} ${best[1]}` : String(whole);
}

function trimDecimal(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)));
}

function metricNumber(value: number, unit: string): string {
  if (unit === "g" || unit === "ml") {
    if (value >= 100) return String(Math.round(value / 10) * 10);
    if (value >= 20) return String(Math.round(value / 5) * 5);
    if (value >= 10) return String(Math.round(value));
    return trimDecimal(value, 1);
  }
  return trimDecimal(value, value >= 10 ? 0 : 2);
}

/** Formats a number for display: fractions for US/count units, tidy decimals for metric. */
export function formatQuantity(quantity: number, unit: string): string {
  const info = unitInfo(unit);
  if (info?.system === "metric") return metricNumber(quantity, canonicalUnit(unit));
  if (quantity >= 20) return String(Math.round(quantity));
  return fraction(quantity);
}

/** Count-style units we pluralize/singularize to match the (scaled) quantity. */
const COUNT_UNITS: Record<string, string> = {
  clove: "cloves", can: "cans", slice: "slices", sprig: "sprigs", stalk: "stalks", bunch: "bunches",
  head: "heads", piece: "pieces", pinch: "pinches", handful: "handfuls", sheet: "sheets", fillet: "fillets",
  strip: "strips", leaf: "leaves", package: "packages", packet: "packets", jar: "jars", bottle: "bottles",
  stick: "sticks", dash: "dashes", rib: "ribs", ear: "ears", block: "blocks", bag: "bags", box: "boxes",
};
const SINGULAR = Object.fromEntries(Object.entries(COUNT_UNITS).map(([one, many]) => [many, one]));

export function formatUnit(unit: string, quantity: number | null): string {
  const canon = canonicalUnit(unit);
  const plural = quantity != null && quantity > 1.01;
  if (canon === "cup") return plural ? "cups" : "cup";
  const lower = canon.toLowerCase();
  const singular = COUNT_UNITS[lower] ? lower : SINGULAR[lower];
  if (singular) return plural ? COUNT_UNITS[singular] : singular;
  return canon;
}

/** "1 ½ cups", "200 g", "2", "to taste". */
export function formatAmount(amount: Amount): string {
  if (amount.quantity == null) return amount.unit || "to taste";
  const qty = formatQuantity(amount.quantity, amount.unit);
  const unit = formatUnit(amount.unit, amount.quantity);
  return unit ? `${qty} ${unit}` : qty;
}

/** Oven temperatures snap to the steps ovens actually use (25°F / 10°C); others to 5°. */
function roundTemp(value: number, ovenFrom: number, ovenStep: number): number {
  const step = value >= ovenFrom ? ovenStep : 5;
  return Math.round(value / step) * step;
}

/** Turns "°F"-style temperatures inside free text into the preferred system when only one is given. */
export function localizeTemperatures(text: string, system: Units): string {
  // Leave text alone if it already lists both scales.
  if (/°\s*F[^.]*°\s*C|°\s*C[^.]*°\s*F/i.test(text)) return text;
  if (system === "metric") {
    return text.replace(/(\d{2,3})\s*°\s*F\b/g, (_, f) => `${roundTemp(((Number(f) - 32) * 5) / 9, 100, 10)}°C`);
  }
  return text.replace(/(\d{2,3})\s*°\s*C\b/g, (_, c) => `${roundTemp((Number(c) * 9) / 5 + 32, 200, 25)}°F`);
}

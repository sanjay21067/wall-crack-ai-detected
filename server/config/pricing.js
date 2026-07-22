/**
 * Central pricing reference for repair cost estimates.
 * Figures are typical India market ranges as of July 2026 (IndiaMART,
 * Amazon.in, Flipkart, Asian Paints listings). Update PRICE_PER_KG and
 * PRICE_PER_SQFT here as prices change -- every estimate reads from this
 * single source.
 */

export const PRICING = {
  // Acrylic/elastomeric crack filler paste
  fillerPricePerKg: 200, // midpoint of ₹150-250/kg (Dr. Fixit Crack-X Paste style product)
  fillerPackSizeKg: 1, // sold in 1kg tubs/pouches
  // Coverage assumption: how many running metres of a widened 5mm x 5mm
  // crack groove one kg of filler paste typically covers. This is an
  // approximation for planning purposes -- always check your product's
  // actual coverage on the label.
  metersCoveredPerKgFiller: 3.5,

  // Finishing putty coat (applied over the filled crack for a seamless look)
  puttyPricePerSqFt: 10, // midpoint of ₹8-13/sq ft (material + labour)

  // One-time tools: putty blade, sandpaper, chisel/scraper
  toolsFlatCost: 100, // midpoint of ₹50-150

  currency: "₹",
};

export function estimateRepairCost({ crackLengthM = 0, wallAreaSqFt = 0, alreadyHaveTools = false }) {
  const fillerKgNeeded = crackLengthM > 0 ? crackLengthM / PRICING.metersCoveredPerKgFiller : 0;
  const fillerPacksNeeded = fillerKgNeeded > 0 ? Math.ceil(fillerKgNeeded / PRICING.fillerPackSizeKg) : 0;
  const fillerCost = fillerPacksNeeded * PRICING.fillerPackSizeKg * PRICING.fillerPricePerKg;

  const puttyCost = wallAreaSqFt > 0 ? wallAreaSqFt * PRICING.puttyPricePerSqFt : 0;

  const toolsCost = alreadyHaveTools ? 0 : PRICING.toolsFlatCost;

  const total = fillerCost + puttyCost + toolsCost;

  return {
    fillerKgNeeded: Number(fillerKgNeeded.toFixed(2)),
    fillerPacksNeeded,
    fillerCost,
    puttyCost,
    toolsCost,
    total,
    currency: PRICING.currency,
    assumptions: {
      metersCoveredPerKgFiller: PRICING.metersCoveredPerKgFiller,
      fillerPricePerKg: PRICING.fillerPricePerKg,
      puttyPricePerSqFt: PRICING.puttyPricePerSqFt,
    },
  };
}

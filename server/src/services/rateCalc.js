/**
 * Pure calculation helpers for the rate engine.
 * No DB dependencies — safe to import in tests without env vars.
 */

/**
 * Volumetric weight formula: (L × B × H) ÷ 5000
 * Returns value rounded to 3 decimal places.
 */
function calcVolumetricWeight(length_cm, breadth_cm, height_cm) {
  return parseFloat(((length_cm * breadth_cm * height_cm) / 5000).toFixed(3));
}

/**
 * Chargeable weight = max(actual, volumetric).
 */
function calcChargeableWeight(actual_weight_kg, volumetric_weight_kg) {
  return parseFloat(Math.max(Number(actual_weight_kg), Number(volumetric_weight_kg)).toFixed(3));
}

/**
 * Base charge = base_price + (max(chargeable_weight, min_chargeable_kg) × rate_per_kg)
 */
function calcBaseCharge(base_price, chargeable_weight_kg, rate_per_kg, min_chargeable_kg = 0) {
  const billable = Math.max(chargeable_weight_kg, Number(min_chargeable_kg));
  return parseFloat((Number(base_price) + billable * Number(rate_per_kg)).toFixed(2));
}

/**
 * COD surcharge — only call when payment_type === 'COD'.
 * @param {number} base_charge
 * @param {'FIXED'|'PERCENTAGE'} surcharge_type
 * @param {number} surcharge_value
 */
function calcCodSurcharge(base_charge, surcharge_type, surcharge_value) {
  if (surcharge_type === 'FIXED') {
    return parseFloat(Number(surcharge_value).toFixed(2));
  }
  // PERCENTAGE
  return parseFloat(((Number(base_charge) * Number(surcharge_value)) / 100).toFixed(2));
}

module.exports = { calcVolumetricWeight, calcChargeableWeight, calcBaseCharge, calcCodSurcharge };

const supabase = require('../db/supabase');
const { calcVolumetricWeight, calcChargeableWeight, calcBaseCharge, calcCodSurcharge } = require('./rateCalc');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve a pincode to its zone record.
 * Throws a user-facing error if the pincode is not mapped.
 */
async function resolveZone(pincode) {
  const { data, error } = await supabase
    .from('zone_pincodes')
    .select('zone_id, zones(id, name, code)')
    .eq('pincode', pincode)
    .single();

  if (error || !data) {
    const err = new Error(`Pincode "${pincode}" is not mapped to any delivery zone`);
    err.status = 422;
    throw err;
  }

  return data.zones; // { id, name, code }
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Calculate the full delivery charge for a prospective order.
 * Pure in the sense that it never writes to the DB — only reads.
 *
 * @returns {Object} {
 *   pickup_zone, drop_zone,
 *   volumetric_weight_kg, chargeable_weight_kg,
 *   rate_card_id, base_charge, cod_surcharge, total_charge
 * }
 */
async function calculateCharge({
  pickup_pincode,
  drop_pincode,
  length_cm,
  breadth_cm,
  height_cm,
  actual_weight_kg,
  order_type,
  payment_type,
}) {
  // 1. Resolve zones in parallel
  const [pickup_zone, drop_zone] = await Promise.all([
    resolveZone(pickup_pincode),
    resolveZone(drop_pincode),
  ]);

  // 2. Weight calculation
  const volumetric_weight_kg = calcVolumetricWeight(
    Number(length_cm), Number(breadth_cm), Number(height_cm)
  );
  const chargeable_weight_kg = calcChargeableWeight(Number(actual_weight_kg), volumetric_weight_kg);

  // 3. Rate card lookup
  const now = new Date().toISOString();
  const { data: rateCard, error: rcError } = await supabase
    .from('rate_cards')
    .select('*')
    .eq('from_zone_id', pickup_zone.id)
    .eq('to_zone_id', drop_zone.id)
    .eq('order_type', order_type)
    .eq('is_active', true)
    .lte('effective_from', now)
    .or(`effective_to.is.null,effective_to.gte.${now}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  if (rcError || !rateCard) {
    const err = new Error(
      `No active rate card for ${order_type} orders from "${pickup_zone.code}" to "${drop_zone.code}"`
    );
    err.status = 422;
    throw err;
  }

  // 4. Base charge
  const base_charge = calcBaseCharge(rateCard.base_price, chargeable_weight_kg, rateCard.rate_per_kg, rateCard.min_chargeable_kg);

  // 5. COD surcharge (only when payment_type === 'COD')
  let cod_surcharge = 0;
  if (payment_type === 'COD') {
    const { data: codConfig } = await supabase
      .from('cod_surcharge_configs')
      .select('*')
      .eq('order_type', order_type)
      .eq('is_active', true)
      .lte('effective_from', now)
      .or(`effective_to.is.null,effective_to.gte.${now}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (codConfig) {
      cod_surcharge = calcCodSurcharge(base_charge, codConfig.surcharge_type, codConfig.surcharge_value);
    }
  }

  const total_charge = parseFloat((base_charge + cod_surcharge).toFixed(2));

  return {
    pickup_zone,
    drop_zone,
    volumetric_weight_kg,
    chargeable_weight_kg,
    rate_card_id: rateCard.id,
    base_charge,
    cod_surcharge,
    total_charge,
  };
}

module.exports = { calculateCharge, resolveZone, calcVolumetricWeight };

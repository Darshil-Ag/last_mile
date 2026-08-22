const supabase = require('../db/supabase');

// ─── Haversine distance ───────────────────────────────────────────────────────

/**
 * Great-circle distance between two lat/lng points (in km).
 */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Find the best available agent for an order.
 *
 * Algorithm:
 *   1. Fetch all AVAILABLE + active agents.
 *   2. Split into in-zone (pickup_zone_id) and out-of-zone candidates.
 *   3. Sort each group by Haversine distance to pickup coordinates
 *      (Infinity if either side has no GPS — they sort to the end).
 *   4. Return best in-zone agent if any; otherwise best out-of-zone with
 *      a fallback reason logged in the assignment record.
 *   5. Return null if no agent available at all.
 *
 * @param {Object} params
 * @param {string} params.pickup_zone_id
 * @param {number|null} params.pickup_latitude
 * @param {number|null} params.pickup_longitude
 * @returns {{ agent: Object|null, reason: string|null }}
 */
async function findBestAgent({ pickup_zone_id, pickup_latitude, pickup_longitude }) {
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, user_id, current_zone_id, latitude, longitude, availability_status')
    .eq('availability_status', 'AVAILABLE')
    .eq('is_active', true);

  if (error || !agents?.length) {
    return { agent: null, reason: null };
  }

  const hasPickupCoords =
    pickup_latitude != null && pickup_longitude != null;

  // Annotate each agent with distance to the pickup point
  const withDistance = agents.map((a) => {
    const hasAgentCoords = a.latitude != null && a.longitude != null;
    const distance =
      hasPickupCoords && hasAgentCoords
        ? haversine(
            Number(pickup_latitude),
            Number(pickup_longitude),
            Number(a.latitude),
            Number(a.longitude)
          )
        : Infinity;
    return { ...a, distance };
  });

  const inZone = withDistance
    .filter((a) => a.current_zone_id === pickup_zone_id)
    .sort((a, b) => a.distance - b.distance);

  if (inZone.length > 0) {
    return { agent: inZone[0], reason: null };
  }

  // Cross-zone fallback
  const outOfZone = withDistance
    .filter((a) => a.current_zone_id !== pickup_zone_id)
    .sort((a, b) => a.distance - b.distance);

  if (outOfZone.length > 0) {
    return {
      agent: outOfZone[0],
      reason: 'cross-zone fallback — no agent available in pickup zone',
    };
  }

  return { agent: null, reason: null };
}

module.exports = { findBestAgent };

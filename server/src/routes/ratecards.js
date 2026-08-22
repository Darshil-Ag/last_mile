const router = require('express').Router();
const supabase = require('../db/supabase');
const { verifyJWT, requireRole } = require('../middleware/auth');

router.use(verifyJWT);

// ─── GET /api/rate-cards ──────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { order_type, from_zone_id, to_zone_id, active_only } = req.query;

    let query = supabase
      .from('rate_cards')
      .select(`
        *,
        from_zone:from_zone_id(id, name, code),
        to_zone:to_zone_id(id, name, code)
      `)
      .order('created_at', { ascending: false });

    if (order_type) query = query.eq('order_type', order_type);
    if (from_zone_id) query = query.eq('from_zone_id', from_zone_id);
    if (to_zone_id) query = query.eq('to_zone_id', to_zone_id);
    if (active_only === 'true') query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/rate-cards ─────────────────────────────────────────────────────
router.post('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const {
      from_zone_id, to_zone_id, order_type,
      base_price, rate_per_kg, min_chargeable_kg,
      effective_from, effective_to,
    } = req.body;

    if (!from_zone_id || !to_zone_id || !order_type || base_price == null || rate_per_kg == null) {
      return res.status(400).json({
        error: 'from_zone_id, to_zone_id, order_type, base_price, and rate_per_kg are required',
      });
    }

    const { data, error } = await supabase
      .from('rate_cards')
      .insert({
        from_zone_id, to_zone_id, order_type,
        base_price, rate_per_kg,
        min_chargeable_kg: min_chargeable_kg ?? 0,
        effective_from: effective_from ?? new Date().toISOString(),
        effective_to: effective_to ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/rate-cards/:id ──────────────────────────────────────────────────
// Deactivates the existing card and creates a new version (preserves history)
router.put('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const {
      base_price, rate_per_kg, min_chargeable_kg,
      effective_from, effective_to,
    } = req.body;

    // Fetch existing card
    const { data: existing, error: fetchErr } = await supabase
      .from('rate_cards')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: 'Rate card not found' });

    // Deactivate old card
    await supabase
      .from('rate_cards')
      .update({ is_active: false, effective_to: new Date().toISOString() })
      .eq('id', req.params.id);

    // Create new version
    const { data: newCard, error: createErr } = await supabase
      .from('rate_cards')
      .insert({
        from_zone_id: existing.from_zone_id,
        to_zone_id: existing.to_zone_id,
        order_type: existing.order_type,
        base_price: base_price ?? existing.base_price,
        rate_per_kg: rate_per_kg ?? existing.rate_per_kg,
        min_chargeable_kg: min_chargeable_kg ?? existing.min_chargeable_kg,
        effective_from: effective_from ?? new Date().toISOString(),
        effective_to: effective_to ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (createErr) throw createErr;
    res.status(201).json(newCard);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

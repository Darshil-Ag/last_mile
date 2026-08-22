const router = require('express').Router();
const supabase = require('../db/supabase');
const { verifyJWT, requireRole } = require('../middleware/auth');

router.use(verifyJWT);

// ─── GET /api/cod-configs ─────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { active_only } = req.query;
    let query = supabase
      .from('cod_surcharge_configs')
      .select('*')
      .order('created_at', { ascending: false });

    if (active_only === 'true') query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/cod-configs ────────────────────────────────────────────────────
router.post('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { order_type, surcharge_type, surcharge_value, effective_from, effective_to } = req.body;

    if (!order_type || !surcharge_type || surcharge_value == null) {
      return res.status(400).json({
        error: 'order_type, surcharge_type, and surcharge_value are required',
      });
    }

    const { data, error } = await supabase
      .from('cod_surcharge_configs')
      .insert({
        order_type, surcharge_type, surcharge_value,
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

// ─── PUT /api/cod-configs/:id ─────────────────────────────────────────────────
// Deactivates old config and creates a new version (same as rate cards pattern)
router.put('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { surcharge_type, surcharge_value, effective_from, effective_to } = req.body;

    const { data: existing, error: fetchErr } = await supabase
      .from('cod_surcharge_configs')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: 'COD config not found' });

    // Deactivate existing
    await supabase
      .from('cod_surcharge_configs')
      .update({ is_active: false, effective_to: new Date().toISOString() })
      .eq('id', req.params.id);

    // Create new version
    const { data: newConfig, error: createErr } = await supabase
      .from('cod_surcharge_configs')
      .insert({
        order_type: existing.order_type,
        surcharge_type: surcharge_type ?? existing.surcharge_type,
        surcharge_value: surcharge_value ?? existing.surcharge_value,
        effective_from: effective_from ?? new Date().toISOString(),
        effective_to: effective_to ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (createErr) throw createErr;
    res.status(201).json(newConfig);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

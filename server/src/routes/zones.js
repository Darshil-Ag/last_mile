const router = require('express').Router();
const supabase = require('../db/supabase');
const { verifyJWT, requireRole } = require('../middleware/auth');

// All zone routes require authentication
router.use(verifyJWT);

// ─── GET /api/zones ───────────────────────────────────────────────────────────
// Returns all zones (active only unless admin requests all)
router.get('/', async (req, res, next) => {
  try {
    let query = supabase.from('zones').select('*').order('name');
    if (req.user.role !== 'ADMIN') query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/zones/lookup?pincode= ──────────────────────────────────────────
// Resolve a single pincode to its zone (used by order creation form)
router.get('/lookup', async (req, res, next) => {
  try {
    const { pincode } = req.query;
    if (!pincode) return res.status(400).json({ error: 'pincode query param is required' });

    const { data, error } = await supabase
      .from('zone_pincodes')
      .select('pincode, zones(id, name, code)')
      .eq('pincode', pincode)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: `Pincode "${pincode}" not mapped to any zone` });
    }
    res.json({ pincode: data.pincode, zone: data.zones });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/zones/:id ───────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('*, zone_pincodes(id, pincode)')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Zone not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/zones ─────────────────────────────────────────────────────────
router.post('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'name and code are required' });

    const { data, error } = await supabase
      .from('zones')
      .insert({ name, code: code.toUpperCase(), description })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Zone code already exists' });
      throw error;
    }
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/zones/:id ───────────────────────────────────────────────────────
router.put('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { name, description, is_active } = req.body;

    const { data, error } = await supabase
      .from('zones')
      .update({ name, description, is_active })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Zone not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/zones/:id/pincodes ─────────────────────────────────────────────
router.post('/:id/pincodes', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { pincodes } = req.body; // array of pincode strings
    if (!Array.isArray(pincodes) || pincodes.length === 0) {
      return res.status(400).json({ error: 'pincodes must be a non-empty array' });
    }

    const rows = pincodes.map((p) => ({ zone_id: req.params.id, pincode: String(p).trim() }));

    const { data, error } = await supabase
      .from('zone_pincodes')
      .insert(rows)
      .select();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'One or more pincodes already assigned to a zone' });
      throw error;
    }
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/zones/:zoneId/pincodes/:pincodeId ───────────────────────────
router.delete('/:zoneId/pincodes/:pincodeId', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('zone_pincodes')
      .delete()
      .eq('id', req.params.pincodeId)
      .eq('zone_id', req.params.zoneId);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;

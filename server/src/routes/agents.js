const router = require('express').Router();
const supabase = require('../db/supabase');
const { verifyJWT, requireRole } = require('../middleware/auth');

router.use(verifyJWT);

// ─── GET /api/agents ──────────────────────────────────────────────────────────
// Admin: list all agents with their user info + current zone
router.get('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { availability_status, zone_id } = req.query;

    let query = supabase
      .from('agents')
      .select(`
        id, availability_status, is_active,
        latitude, longitude, last_location_at, created_at,
        user:user_id(id, full_name, email, phone),
        current_zone:current_zone_id(id, name, code)
      `)
      .order('created_at', { ascending: false });

    if (availability_status) query = query.eq('availability_status', availability_status);
    if (zone_id) query = query.eq('current_zone_id', zone_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/agents ─────────────────────────────────────────────────────────
// Admin: create an agent profile for an existing user (who must have role=AGENT)
router.post('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { user_id, current_zone_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    // Verify the user exists and has AGENT role
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user_id)
      .single();

    if (userErr || !user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'AGENT') {
      return res.status(400).json({ error: 'User must have role AGENT to create an agent profile' });
    }

    const { data, error } = await supabase
      .from('agents')
      .insert({ user_id, current_zone_id: current_zone_id ?? null })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Agent profile already exists for this user' });
      throw error;
    }
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/agents/me ───────────────────────────────────────────────────────
// Agent: get own profile
router.get('/me', requireRole('AGENT'), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select(`
        id, availability_status, is_active, latitude, longitude, last_location_at,
        user:user_id(id, full_name, email, phone),
        current_zone:current_zone_id(id, name, code)
      `)
      .eq('user_id', req.user.userId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Agent profile not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/agents/me/location ──────────────────────────────────────────────
// Agent: update own GPS location + zone
router.put('/me/location', requireRole('AGENT'), async (req, res, next) => {
  try {
    const { latitude, longitude, current_zone_id } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const { data, error } = await supabase
      .from('agents')
      .update({
        latitude, longitude,
        current_zone_id: current_zone_id ?? undefined,
        last_location_at: new Date().toISOString(),
      })
      .eq('user_id', req.user.userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Agent profile not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/agents/me/availability ─────────────────────────────────────────
// Agent: toggle availability status (AVAILABLE / OFFLINE — not BUSY; system sets BUSY)
router.put('/me/availability', requireRole('AGENT'), async (req, res, next) => {
  try {
    const { availability_status } = req.body;

    if (!['AVAILABLE', 'OFFLINE'].includes(availability_status)) {
      return res.status(400).json({ error: 'availability_status must be AVAILABLE or OFFLINE' });
    }

    const { data, error } = await supabase
      .from('agents')
      .update({ availability_status })
      .eq('user_id', req.user.userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Agent profile not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/agents/me/orders ────────────────────────────────────────────────
// Agent: orders currently assigned to them
router.get('/me/orders', requireRole('AGENT'), async (req, res, next) => {
  try {
    // Get agent record for this user
    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    if (agentErr || !agent) return res.status(404).json({ error: 'Agent profile not found' });

    // Active assignments for this agent
    const { data: assignments, error: aErr } = await supabase
      .from('order_assignments')
      .select('order_id')
      .eq('agent_id', agent.id)
      .is('unassigned_at', null);

    if (aErr) throw aErr;
    const orderIds = (assignments ?? []).map((a) => a.order_id);

    if (!orderIds.length) return res.json([]);

    const { data: orders, error: oErr } = await supabase
      .from('orders')
      .select(`
        id, order_number, current_status, order_type, payment_type,
        pickup_address, pickup_pincode, drop_address, drop_pincode,
        total_charge, confirmed_at,
        customer:customer_id(full_name, phone),
        pickup_zone:pickup_zone_id(name, code),
        drop_zone:drop_zone_id(name, code),
        delivery_attempts(attempt_number, status, scheduled_date, failure_reason)
      `)
      .in('id', orderIds)
      .not('current_status', 'in', '("DELIVERED","FAILED")')
      .order('created_at', { ascending: false });

    if (oErr) throw oErr;
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/agents/:id/status ───────────────────────────────────────────────
// Admin: update any agent's availability or active status
router.put('/:id/status', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { availability_status, is_active } = req.body;

    const updates = {};
    if (availability_status) updates.availability_status = availability_status;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Agent not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

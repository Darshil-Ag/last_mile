const router = require('express').Router();
const bcrypt = require('bcrypt');
const supabase = require('../db/supabase');
const { verifyJWT, requireRole } = require('../middleware/auth');

router.use(verifyJWT);

// ─── GET /api/agents ──────────────────────────────────────────────────────────
// Admin: list all agents (including inactive ones) with user info + zone
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
// Admin: create an agent. Accepts new user details (full_name, email, phone, password)
// OR existing user_id.
router.post('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { full_name, email, phone, password, current_zone_id, user_id } = req.body;

    let targetUserId = user_id;

    if (!targetUserId) {
      if (!full_name || !email || !password) {
        return res.status(400).json({ error: 'full_name, email, and password are required to create a new agent' });
      }

      // Check if email already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (existing) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      const password_hash = await bcrypt.hash(password, 10);

      // Insert new AGENT user
      const { data: newUser, error: userErr } = await supabase
        .from('users')
        .insert({
          full_name: full_name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : null,
          password_hash,
          role: 'AGENT',
        })
        .select()
        .single();

      if (userErr) throw userErr;
      targetUserId = newUser.id;
    } else {
      // Verify existing user has role AGENT
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', targetUserId)
        .single();

      if (userErr || !user) return res.status(404).json({ error: 'User not found' });
      if (user.role !== 'AGENT') {
        return res.status(400).json({ error: 'User must have role AGENT to create an agent profile' });
      }
    }

    // Create agent profile
    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .insert({ user_id: targetUserId, current_zone_id: current_zone_id || null })
      .select(`
        id, availability_status, is_active,
        latitude, longitude, last_location_at, created_at,
        user:user_id(id, full_name, email, phone),
        current_zone:current_zone_id(id, name, code)
      `)
      .single();

    if (agentErr) {
      if (agentErr.code === '23505') return res.status(409).json({ error: 'Agent profile already exists for this user' });
      throw agentErr;
    }

    res.status(201).json(agent);
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
// Agent: toggle availability status
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
    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    if (agentErr || !agent) return res.status(404).json({ error: 'Agent profile not found' });

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

// ─── PUT /api/agents/:id ──────────────────────────────────────────────────────
// Admin: update agent profile and user info (full_name, phone, current_zone_id, availability_status, is_active)
router.put('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { full_name, phone, current_zone_id, availability_status, is_active } = req.body;

    // Fetch agent profile
    const { data: agent, error: fetchErr } = await supabase
      .from('agents')
      .select('id, user_id')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !agent) return res.status(404).json({ error: 'Agent profile not found' });

    // Update user info if full_name or phone provided
    if (full_name !== undefined || phone !== undefined) {
      const userUpdates = {};
      if (full_name !== undefined) userUpdates.full_name = full_name.trim();
      if (phone !== undefined) userUpdates.phone = phone ? phone.trim() : null;

      const { error: uErr } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', agent.user_id);

      if (uErr) throw uErr;
    }

    // Update agent profile
    const agentUpdates = {};
    if (current_zone_id !== undefined) agentUpdates.current_zone_id = current_zone_id || null;
    if (availability_status !== undefined) agentUpdates.availability_status = availability_status;
    if (is_active !== undefined) {
      agentUpdates.is_active = is_active;
      // If deactivating, force availability to OFFLINE
      if (!is_active) agentUpdates.availability_status = 'OFFLINE';
    }

    const { data, error } = await supabase
      .from('agents')
      .update(agentUpdates)
      .eq('id', req.params.id)
      .select(`
        id, availability_status, is_active,
        latitude, longitude, last_location_at, created_at,
        user:user_id(id, full_name, email, phone),
        current_zone:current_zone_id(id, name, code)
      `)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/agents/:id/deactivate ─────────────────────────────────────────
// Admin: deactivate agent (is_active = false, availability_status = 'OFFLINE')
router.patch('/:id/deactivate', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .update({
        is_active: false,
        availability_status: 'OFFLINE',
      })
      .eq('id', req.params.id)
      .select(`
        id, availability_status, is_active,
        user:user_id(id, full_name, email, phone),
        current_zone:current_zone_id(id, name, code)
      `)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Agent not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/agents/:id/reactivate ─────────────────────────────────────────
// Admin: reactivate agent (is_active = true)
router.patch('/:id/reactivate', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .update({
        is_active: true,
      })
      .eq('id', req.params.id)
      .select(`
        id, availability_status, is_active,
        user:user_id(id, full_name, email, phone),
        current_zone:current_zone_id(id, name, code)
      `)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Agent not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Legacy endpoint alias for status update
router.put('/:id/status', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { availability_status, is_active } = req.body;
    const updates = {};
    if (availability_status) updates.availability_status = availability_status;
    if (is_active !== undefined) {
      updates.is_active = is_active;
      if (!is_active) updates.availability_status = 'OFFLINE';
    }

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

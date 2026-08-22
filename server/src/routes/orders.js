const router = require('express').Router();
const supabase = require('../db/supabase');
const { verifyJWT, requireRole } = require('../middleware/auth');
const { calculateCharge } = require('../services/rateEngine');
const { findBestAgent } = require('../services/autoAssign');
const { sendStatusEmail } = require('../services/emailService');

router.use(verifyJWT);

// ─── Shared helper: fetch the customer user record ────────────────────────────
async function getUser(userId) {
  const { data } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('id', userId)
    .single();
  return data;
}

// ─── Shared helper: execute an agent assignment ───────────────────────────────
// Closes any active assignment, creates new assignment + delivery_attempt records.
// Returns { assignment, attempt } or throws.
async function executeAssignment({ order_id, agent_id, assignment_type, assigned_by, reason, scheduled_date }) {
  // Close the active assignment (if any)
  await supabase
    .from('order_assignments')
    .update({ unassigned_at: new Date().toISOString() })
    .eq('order_id', order_id)
    .is('unassigned_at', null);

  // Create new assignment record
  const { data: assignment, error: aErr } = await supabase
    .from('order_assignments')
    .insert({ order_id, agent_id, assigned_by, assignment_type, reason })
    .select()
    .single();

  if (aErr) throw aErr;

  // Determine attempt_number (max existing + 1)
  const { data: attempts } = await supabase
    .from('delivery_attempts')
    .select('attempt_number')
    .eq('order_id', order_id)
    .order('attempt_number', { ascending: false })
    .limit(1);

  const attempt_number = attempts?.length ? attempts[0].attempt_number + 1 : 1;

  // Create delivery_attempt record
  const { data: attempt, error: atErr } = await supabase
    .from('delivery_attempts')
    .insert({
      order_id, agent_id,
      assignment_id: assignment.id,
      attempt_number,
      scheduled_date: scheduled_date ?? new Date().toISOString().split('T')[0],
      status: 'SCHEDULED',
    })
    .select()
    .single();

  if (atErr) throw atErr;

  // Mark agent as BUSY
  await supabase
    .from('agents')
    .update({ availability_status: 'BUSY' })
    .eq('id', agent_id);

  return { assignment, attempt };
}

// ─── Valid status transitions ─────────────────────────────────────────────────
const VALID_TRANSITIONS = {
  CREATED: ['ASSIGNED'],
  ASSIGNED: ['PICKED_UP', 'FAILED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: ['RESCHEDULED'],
  RESCHEDULED: ['ASSIGNED'],
};

// ─── POST /api/orders/calculate ──────────────────────────────────────────────
// Preview charge — no order created, no writes
router.post('/calculate', async (req, res, next) => {
  try {
    const {
      pickup_pincode, drop_pincode,
      length_cm, breadth_cm, height_cm,
      actual_weight_kg, order_type, payment_type,
    } = req.body;

    if (!pickup_pincode || !drop_pincode || !length_cm || !breadth_cm || !height_cm
        || !actual_weight_kg || !order_type || !payment_type) {
      return res.status(400).json({ error: 'All fields are required for charge calculation' });
    }

    const result = await calculateCharge({
      pickup_pincode, drop_pincode,
      length_cm, breadth_cm, height_cm,
      actual_weight_kg, order_type, payment_type,
    });

    res.json(result);
  } catch (err) {
    err.status = err.status || 422;
    next(err);
  }
});

// ─── POST /api/orders ─────────────────────────────────────────────────────────
// Create + confirm an order (charge is calculated and stored)
router.post('/', async (req, res, next) => {
  try {
    const {
      pickup_address, pickup_pincode, pickup_latitude, pickup_longitude,
      drop_address, drop_pincode, drop_latitude, drop_longitude,
      length_cm, breadth_cm, height_cm, actual_weight_kg,
      order_type, payment_type,
      customer_id, // Admin can specify; customers always use their own id
    } = req.body;

    // Determine the customer
    const effectiveCustomerId =
      req.user.role === 'ADMIN' && customer_id ? customer_id : req.user.userId;

    // Calculate charge (reads zones, rate card, COD config)
    const charge = await calculateCharge({
      pickup_pincode, drop_pincode,
      length_cm, breadth_cm, height_cm,
      actual_weight_kg, order_type, payment_type,
    });

    // Create order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        customer_id: effectiveCustomerId,
        created_by: req.user.userId,
        pickup_address, pickup_pincode,
        pickup_latitude: pickup_latitude ?? null,
        pickup_longitude: pickup_longitude ?? null,
        pickup_zone_id: charge.pickup_zone.id,
        drop_address, drop_pincode,
        drop_latitude: drop_latitude ?? null,
        drop_longitude: drop_longitude ?? null,
        drop_zone_id: charge.drop_zone.id,
        length_cm, breadth_cm, height_cm,
        actual_weight_kg,
        volumetric_weight_kg: charge.volumetric_weight_kg,
        chargeable_weight_kg: charge.chargeable_weight_kg,
        order_type, payment_type,
        rate_card_id: charge.rate_card_id,
        base_charge: charge.base_charge,
        cod_surcharge: charge.cod_surcharge,
        total_charge: charge.total_charge,
        current_status: 'CREATED',
        confirmed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // Insert initial tracking event (trigger auto-syncs current_status)
    await supabase.from('tracking_events').insert({
      order_id: order.id,
      status: 'CREATED',
      actor_id: req.user.userId,
      actor_role: req.user.role,
      remarks: 'Order created and confirmed',
    });

    // Send confirmation email
    const customer = await getUser(effectiveCustomerId);
    if (customer) {
      await sendStatusEmail({
        order_id: order.id,
        order_number: order.order_number,
        recipient_id: customer.id,
        recipient_email: customer.email,
        recipient_name: customer.full_name,
        status: 'CREATED',
        metadata: { total_charge: String(order.total_charge) },
      });
    }

    res.status(201).json({ ...order, charge_breakdown: charge });
  } catch (err) {
    err.status = err.status || 500;
    next(err);
  }
});

// ─── GET /api/orders ──────────────────────────────────────────────────────────
// Admin: all orders with optional filters
router.get('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { status, pickup_zone_id, drop_zone_id, agent_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('orders')
      .select(`
        *,
        customer:customer_id(id, full_name, email, phone),
        creator:created_by(id, full_name, role),
        pickup_zone:pickup_zone_id(id, name, code),
        drop_zone:drop_zone_id(id, name, code),
        current_assignment:order_assignments!inner(
          id, agent_id, assignment_type, assigned_at,
          agents!inner(id, user_id, users!inner(full_name))
        )
      `, { count: 'exact' })
      .is('order_assignments.unassigned_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status) query = query.eq('current_status', status);
    if (pickup_zone_id) query = query.eq('pickup_zone_id', pickup_zone_id);
    if (drop_zone_id) query = query.eq('drop_zone_id', drop_zone_id);

    // Filter by agent (via order_assignments join)
    if (agent_id) {
      // Subquery: get order IDs assigned to this agent currently
      const { data: agentOrders } = await supabase
        .from('order_assignments')
        .select('order_id')
        .eq('agent_id', agent_id)
        .is('unassigned_at', null);

      const orderIds = (agentOrders ?? []).map((o) => o.order_id);
      if (orderIds.length === 0) return res.json({ data: [], total: 0, page: Number(page), limit: Number(limit) });
      query = query.in('id', orderIds);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ data, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/orders/mine ─────────────────────────────────────────────────────
// Customer: their own orders
router.get('/mine', requireRole('CUSTOMER'), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_number, current_status, order_type, payment_type,
        total_charge, confirmed_at, created_at,
        pickup_address, pickup_pincode, drop_address, drop_pincode,
        pickup_zone:pickup_zone_id(name, code),
        drop_zone:drop_zone_id(name, code)
      `)
      .eq('customer_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
// Full order detail + tracking timeline
router.get('/:id', async (req, res, next) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customer_id(id, full_name, email, phone),
        creator:created_by(id, full_name, role),
        pickup_zone:pickup_zone_id(id, name, code),
        drop_zone:drop_zone_id(id, name, code),
        rate_card:rate_card_id(base_price, rate_per_kg, order_type),
        tracking_events(id, status, actor_role, latitude, longitude, remarks, created_at,
          actor:actor_id(id, full_name, role)
        ),
        order_assignments(
          id, assignment_type, reason, assigned_at, unassigned_at,
          agent:agent_id(id, user_id, users!inner(full_name, phone))
        ),
        delivery_attempts(id, attempt_number, status, failure_reason, scheduled_date, started_at, completed_at)
      `)
      .eq('id', req.params.id)
      .order('created_at', { foreignTable: 'tracking_events', ascending: true })
      .single();

    if (error || !order) return res.status(404).json({ error: 'Order not found' });

    // Access control: customers can only see their own orders
    if (req.user.role === 'CUSTOMER' && order.customer_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/orders/:id/assign ─────────────────────────────────────────────
// Admin: manually assign or auto-assign an agent
router.post('/:id/assign', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { type = 'AUTO', agent_id: manualAgentId, scheduled_date } = req.body;

    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, current_status, pickup_zone_id, pickup_latitude, pickup_longitude, order_number, customer_id')
      .eq('id', req.params.id)
      .single();

    if (orderErr || !order) return res.status(404).json({ error: 'Order not found' });
    if (!['CREATED', 'RESCHEDULED'].includes(order.current_status)) {
      return res.status(400).json({ error: `Cannot assign agent to an order with status "${order.current_status}"` });
    }

    let agent_id = manualAgentId;
    let reason = null;
    let assignment_type = type === 'MANUAL' ? 'MANUAL' : 'AUTO';

    if (type === 'AUTO') {
      const { agent, reason: fallbackReason } = await findBestAgent({
        pickup_zone_id: order.pickup_zone_id,
        pickup_latitude: order.pickup_latitude,
        pickup_longitude: order.pickup_longitude,
      });

      if (!agent) {
        return res.status(409).json({
          error: 'No available agent found. Please assign manually.',
        });
      }
      agent_id = agent.id;
      reason = fallbackReason;
    }

    if (!agent_id) return res.status(400).json({ error: 'agent_id is required for MANUAL assignment' });

    // Execute the assignment
    const { assignment, attempt } = await executeAssignment({
      order_id: order.id,
      agent_id,
      assignment_type,
      assigned_by: req.user.userId,
      reason,
      scheduled_date,
    });

    // Log tracking event → trigger updates orders.current_status
    await supabase.from('tracking_events').insert({
      order_id: order.id,
      status: 'ASSIGNED',
      actor_id: req.user.userId,
      actor_role: req.user.role,
      remarks: reason ?? `${assignment_type} assignment`,
    });

    // Send email to customer
    const customer = await getUser(order.customer_id);
    if (customer) {
      await sendStatusEmail({
        order_id: order.id,
        order_number: order.order_number,
        recipient_id: customer.id,
        recipient_email: customer.email,
        recipient_name: customer.full_name,
        status: 'ASSIGNED',
        metadata: { scheduled_date: attempt.scheduled_date },
      });
    }

    res.status(201).json({ assignment, attempt });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/orders/:id/status ───────────────────────────────────────────────
// Agent or Admin: update order status + log tracking event
router.put('/:id/status', requireRole('AGENT', 'ADMIN'), async (req, res, next) => {
  try {
    const { status, remarks, latitude, longitude, failure_reason } = req.body;

    if (!status) return res.status(400).json({ error: 'status is required' });

    // Fetch current order state
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_number, current_status, customer_id')
      .eq('id', req.params.id)
      .single();

    if (orderErr || !order) return res.status(404).json({ error: 'Order not found' });

    // Validate transition
    const allowed = VALID_TRANSITIONS[order.current_status] ?? [];
    // Admin can override to any status
    if (req.user.role !== 'ADMIN' && !allowed.includes(status)) {
      return res.status(400).json({
        error: `Invalid status transition: "${order.current_status}" → "${status}"`,
        allowed,
      });
    }

    // Insert tracking event (DB trigger syncs orders.current_status automatically)
    await supabase.from('tracking_events').insert({
      order_id: order.id,
      status,
      actor_id: req.user.userId,
      actor_role: req.user.role,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      remarks: remarks ?? null,
    });

    // If terminal status, update delivery_attempt + free agent
    if (status === 'DELIVERED' || status === 'FAILED') {
      // Update active delivery attempt
      const { data: activeAttempts } = await supabase
        .from('delivery_attempts')
        .select('id, agent_id')
        .eq('order_id', order.id)
        .eq('status', 'SCHEDULED')
        .order('attempt_number', { ascending: false })
        .limit(1);

      if (activeAttempts?.length) {
        const attempt = activeAttempts[0];
        await supabase
          .from('delivery_attempts')
          .update({
            status: status === 'DELIVERED' ? 'DELIVERED' : 'FAILED',
            failure_reason: failure_reason ?? null,
            completed_at: new Date().toISOString(),
          })
          .eq('id', attempt.id);

        // Free agent back to AVAILABLE
        await supabase
          .from('agents')
          .update({ availability_status: 'AVAILABLE' })
          .eq('id', attempt.agent_id);
      }
    }

    // Send email notification
    const customer = await getUser(order.customer_id);
    if (customer) {
      await sendStatusEmail({
        order_id: order.id,
        order_number: order.order_number,
        recipient_id: customer.id,
        recipient_email: customer.email,
        recipient_name: customer.full_name,
        status,
        metadata: { failure_reason: failure_reason ?? 'Not specified' },
      });
    }

    res.json({ success: true, new_status: status });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/orders/:id/reschedule ─────────────────────────────────────────
// Customer: reschedule a FAILED order for a new delivery date
router.post('/:id/reschedule', requireRole('CUSTOMER', 'ADMIN'), async (req, res, next) => {
  try {
    const { scheduled_date } = req.body;
    if (!scheduled_date) return res.status(400).json({ error: 'scheduled_date is required' });

    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_number, current_status, customer_id, pickup_zone_id, pickup_latitude, pickup_longitude')
      .eq('id', req.params.id)
      .single();

    if (orderErr || !order) return res.status(404).json({ error: 'Order not found' });

    // Customers can only reschedule their own orders
    if (req.user.role === 'CUSTOMER' && order.customer_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (order.current_status !== 'FAILED') {
      return res.status(400).json({ error: 'Only FAILED orders can be rescheduled' });
    }

    // Auto-assign a new agent
    const { agent, reason } = await findBestAgent({
      pickup_zone_id: order.pickup_zone_id,
      pickup_latitude: order.pickup_latitude,
      pickup_longitude: order.pickup_longitude,
    });

    if (!agent) {
      return res.status(409).json({ error: 'No available agent for rescheduled delivery. Please try again later.' });
    }

    // Create new assignment + delivery attempt
    const { assignment, attempt } = await executeAssignment({
      order_id: order.id,
      agent_id: agent.id,
      assignment_type: 'RESCHEDULE',
      assigned_by: req.user.userId,
      reason: reason ?? 'Customer rescheduled delivery',
      scheduled_date,
    });

    // Insert tracking event → RESCHEDULED (trigger syncs current_status)
    await supabase.from('tracking_events').insert({
      order_id: order.id,
      status: 'RESCHEDULED',
      actor_id: req.user.userId,
      actor_role: req.user.role,
      remarks: `Rescheduled for ${scheduled_date}`,
    });

    // Email customer
    const customer = await getUser(order.customer_id);
    if (customer) {
      await sendStatusEmail({
        order_id: order.id,
        order_number: order.order_number,
        recipient_id: customer.id,
        recipient_email: customer.email,
        recipient_name: customer.full_name,
        status: 'RESCHEDULED',
        metadata: { scheduled_date },
      });
    }

    res.status(201).json({ assignment, attempt });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

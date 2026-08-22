/**
 * PUBLIC ROUTES (no auth required)
 *
 * GET  /api/orders/track      — order tracking (order_number + phone verification)
 * POST /api/orders/calculate  — shipping cost estimate (read-only, no order created)
 *
 * Both share the same in-memory IP rate limiter (10 req/min).
 * Mounted in app.js BEFORE the auth-walled orders router.
 */

const router = require('express').Router();
const supabase = require('../db/supabase');
const { calculateCharge } = require('../services/rateEngine');

// ─── Inline IP rate limiter ────────────────────────────────────────────────────
const RATE_LIMIT_MAX      = 10;   // requests
const RATE_LIMIT_WINDOW   = 60_000; // ms (1 minute)

const ipCounters = new Map(); // ip → { count, resetAt }

function rateLimiter(req, res, next) {
  const ip  = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
  const now = Date.now();
  const rec = ipCounters.get(ip);

  if (!rec || now > rec.resetAt) {
    // First request in this window (or window has expired)
    ipCounters.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (rec.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((rec.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      error: `Too many lookup attempts. Try again in ${retryAfter} seconds.`,
    });
  }

  rec.count += 1;
  return next();
}

// Periodically clear expired entries to avoid memory growth (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of ipCounters) {
    if (now > rec.resetAt) ipCounters.delete(ip);
  }
}, 5 * 60_000);

// ─── GET /api/orders/track ─────────────────────────────────────────────────────
router.get('/track', rateLimiter, async (req, res, next) => {
  try {
    const { order_number, phone } = req.query;

    if (!order_number || !phone) {
      return res.status(400).json({ error: 'order_number and phone are required' });
    }

    // 1. Look up the order by order_number + customer phone — both must match.
    //    We join to the customer's user record to verify the phone number.
    //    We do this in ONE query so there is no timing difference between
    //    "order not found" and "phone mismatch" — both return 404.
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        current_status,
        order_type,
        payment_type,
        pickup_address,
        pickup_pincode,
        drop_address,
        drop_pincode,
        actual_weight_kg,
        chargeable_weight_kg,
        base_charge,
        cod_surcharge,
        total_charge,
        confirmed_at,
        created_at,
        pickup_zone:pickup_zone_id(id, name, code),
        drop_zone:drop_zone_id(id, name, code),
        customer:customer_id(id, phone),
        tracking_events(
          id, status, actor_role, remarks, created_at,
          actor:actor_id(id, full_name, role)
        ),
        delivery_attempts(
          id, attempt_number, status, failure_reason, scheduled_date, completed_at
        )
      `)
      .eq('order_number', order_number.trim().toUpperCase())
      .order('created_at', { foreignTable: 'tracking_events', ascending: true })
      .maybeSingle();

    // 2. Always return 404 for any failure — never distinguish which field was wrong.
    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 3. Verify the phone number matches the customer's registered phone.
    //    Normalise both to digits-only for comparison (handles spaces, dashes, +91 prefix).
    const normalize  = (p) => String(p ?? '').replace(/\D/g, '').slice(-10);
    const storedPhone = normalize(order.customer?.phone ?? '');
    const inputPhone  = normalize(phone);

    if (!storedPhone || storedPhone !== inputPhone) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 4. Strip the customer record (including phone) before returning — no PII leak.
    const latest_attempt = (order.delivery_attempts ?? [])
      .slice()
      .sort((a, b) => b.attempt_number - a.attempt_number)[0] ?? null;

    const { customer: _customer, delivery_attempts: _da, ...safeOrder } = order;

    res.json({
      ...safeOrder,
      latest_attempt: latest_attempt
        ? {
            attempt_number: latest_attempt.attempt_number,
            status:         latest_attempt.status,
            scheduled_date: latest_attempt.scheduled_date,
            failure_reason: latest_attempt.failure_reason,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/orders/calculate (PUBLIC) ──────────────────────────────────────
// Pure rate calculation — reads zones/rate-cards/COD-configs, writes nothing.
// Identical inputs to the authenticated /orders/calculate; same rateEngine call.
// Rate-limited by the shared rateLimiter above (10 req/60s per IP).
router.post('/calculate', rateLimiter, async (req, res, next) => {
  try {
    const {
      pickup_pincode, drop_pincode,
      length_cm, breadth_cm, height_cm,
      actual_weight_kg, order_type, payment_type,
    } = req.body;

    if (
      !pickup_pincode || !drop_pincode ||
      !length_cm || !breadth_cm || !height_cm ||
      !actual_weight_kg || !order_type || !payment_type
    ) {
      return res.status(400).json({ error: 'All fields are required for charge calculation' });
    }

    // Reuse the exact same service function used by the authenticated order flow.
    const result = await calculateCharge({
      pickup_pincode,
      drop_pincode,
      length_cm:        Number(length_cm),
      breadth_cm:       Number(breadth_cm),
      height_cm:        Number(height_cm),
      actual_weight_kg: Number(actual_weight_kg),
      order_type,
      payment_type,
    });

    res.json(result);
  } catch (err) {
    // Pass through rateEngine's user-facing 422 errors (pincode not mapped, no rate card)
    err.status = err.status || 422;
    next(err);
  }
});

module.exports = router;


const { Resend } = require('resend');
const supabase = require('../db/supabase');

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Email templates ──────────────────────────────────────────────────────────

const TEMPLATES = {
  CREATED: {
    subject: 'Order Confirmed — {order_number}',
    html: `
      <h2>Your order is confirmed!</h2>
      <p>Hi {customer_name},</p>
      <p>Your order <strong>{order_number}</strong> has been placed successfully.</p>
      <p><strong>Total charge: ₹{total_charge}</strong></p>
      <p>We will notify you as soon as a delivery agent is assigned.</p>
    `,
  },
  ASSIGNED: {
    subject: 'Agent Assigned — {order_number}',
    html: `
      <h2>A delivery agent has been assigned</h2>
      <p>Hi {customer_name},</p>
      <p>Your order <strong>{order_number}</strong> has been assigned to a delivery agent.</p>
      <p>Scheduled delivery date: <strong>{scheduled_date}</strong></p>
    `,
  },
  PICKED_UP: {
    subject: 'Order Picked Up — {order_number}',
    html: `
      <h2>Your order has been picked up</h2>
      <p>Hi {customer_name},</p>
      <p>Your order <strong>{order_number}</strong> has been picked up and is on its way.</p>
    `,
  },
  IN_TRANSIT: {
    subject: 'Order In Transit — {order_number}',
    html: `
      <h2>Your order is in transit</h2>
      <p>Hi {customer_name},</p>
      <p>Your order <strong>{order_number}</strong> is in transit to the delivery area.</p>
    `,
  },
  OUT_FOR_DELIVERY: {
    subject: 'Out for Delivery — {order_number}',
    html: `
      <h2>Out for delivery today!</h2>
      <p>Hi {customer_name},</p>
      <p>Your order <strong>{order_number}</strong> is out for delivery. Please be available to receive it.</p>
    `,
  },
  DELIVERED: {
    subject: 'Delivered Successfully — {order_number}',
    html: `
      <h2>Your order has been delivered!</h2>
      <p>Hi {customer_name},</p>
      <p>Your order <strong>{order_number}</strong> has been successfully delivered. Thank you for using Last-Mile!</p>
    `,
  },
  FAILED: {
    subject: 'Delivery Attempt Failed — {order_number}',
    html: `
      <h2>We were unable to deliver your order</h2>
      <p>Hi {customer_name},</p>
      <p>Unfortunately, delivery of your order <strong>{order_number}</strong> was unsuccessful.</p>
      <p><strong>Reason:</strong> {failure_reason}</p>
      <p>You can reschedule the delivery from your dashboard. We apologise for the inconvenience.</p>
    `,
  },
  RESCHEDULED: {
    subject: 'Delivery Rescheduled — {order_number}',
    html: `
      <h2>Your delivery has been rescheduled</h2>
      <p>Hi {customer_name},</p>
      <p>Your order <strong>{order_number}</strong> has been rescheduled for <strong>{scheduled_date}</strong>.</p>
      <p>A new delivery agent will be assigned shortly.</p>
    `,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Send a status-change email and log the result in the notifications table.
 * Never throws — a failed send is logged as status='FAILED' in the DB.
 *
 * @param {Object} params
 * @param {string} params.order_id
 * @param {string} params.order_number
 * @param {string} params.recipient_id     - users.id
 * @param {string} params.recipient_email
 * @param {string} params.recipient_name
 * @param {string} params.status           - order_status enum value
 * @param {Object} [params.metadata]       - template interpolation vars
 */
async function sendStatusEmail({
  order_id,
  order_number,
  recipient_id,
  recipient_email,
  recipient_name,
  status,
  metadata = {},
}) {
  const template = TEMPLATES[status];
  if (!template) return; // No template for this status — skip silently

  const vars = { order_number, customer_name: recipient_name, ...metadata };
  const subject = interpolate(template.subject, vars);
  const html = interpolate(template.html, vars);

  let notifStatus = 'SENT';
  let sent_at = new Date().toISOString();
  let sendError = null;

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: recipient_email,
      subject,
      html,
    });
  } catch (err) {
    notifStatus = 'FAILED';
    sent_at = null;
    sendError = err.message;
    console.error(`[emailService] Failed to send "${status}" email to ${recipient_email}:`, err.message);
  }

  // Always log to DB, even on failure (for audit / retry visibility)
  const { error: dbError } = await supabase.from('notifications').insert({
    order_id,
    recipient_id,
    channel: 'EMAIL',
    event_type: status,
    message: subject,
    metadata: { ...metadata, ...(sendError ? { send_error: sendError } : {}) },
    status: notifStatus,
    sent_at,
  });

  if (dbError) {
    console.error('[emailService] Failed to log notification to DB:', dbError.message);
  }
}

module.exports = { sendStatusEmail };

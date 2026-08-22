/** Format a number as Indian Rupees — ₹1,234.56 */
export const formatCurrency = (value) =>
  `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Format ISO date string as "22 Aug 2026, 4:10 PM" */
export const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

/** Format ISO date string as "22 Aug 2026" */
export const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

/** Format weight — "1.200 kg" */
export const formatWeight = (kg) => `${Number(kg).toFixed(3)} kg`;

/** Initials from full name */
export const getInitials = (name = '') =>
  name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Map order_status → badge variant */
export const statusVariant = (status) => ({
  CREATED:          'info',
  ASSIGNED:         'purple',
  PICKED_UP:        'warning',
  IN_TRANSIT:       'warning',
  OUT_FOR_DELIVERY: 'warning',
  DELIVERED:        'success',
  FAILED:           'danger',
  RESCHEDULED:      'default',
}[status] ?? 'default');

/** Map agent_availability → badge variant */
export const availabilityVariant = (status) => ({
  AVAILABLE: 'success',
  BUSY:      'warning',
  OFFLINE:   'default',
}[status] ?? 'default');

/** Human-readable order status labels */
export const statusLabel = (status) =>
  (status ?? '').replace(/_/g, ' ');

/** Timeline icon per status */
export const statusIcon = (status) => ({
  CREATED:          '📋',
  ASSIGNED:         '👤',
  PICKED_UP:        '📦',
  IN_TRANSIT:       '🚚',
  OUT_FOR_DELIVERY: '🏠',
  DELIVERED:        '✅',
  FAILED:           '❌',
  RESCHEDULED:      '🔄',
}[status] ?? '•');

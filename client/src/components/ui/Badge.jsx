import React from 'react';
import { statusVariant, availabilityVariant, statusLabel } from '../../utils/formatters';

const VARIANT_MAP = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger:  'badge-danger',
  info:    'badge-info',
  purple:  'badge-purple',
  default: 'badge-default',
};

export function StatusBadge({ status }) {
  const variant = statusVariant(status);
  return (
    <span className={`badge ${VARIANT_MAP[variant]}`}>
      <span className="badge-dot" />
      {statusLabel(status)}
    </span>
  );
}

export function AvailabilityBadge({ status }) {
  const variant = availabilityVariant(status);
  return (
    <span className={`badge ${VARIANT_MAP[variant]}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}

export function Badge({ variant = 'default', children }) {
  return (
    <span className={`badge ${VARIANT_MAP[variant] ?? 'badge-default'}`}>
      {children}
    </span>
  );
}

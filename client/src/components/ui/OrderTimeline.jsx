import React from 'react';
import { StatusBadge } from '../ui/Badge';
import { formatDateTime, statusIcon } from '../../utils/formatters';

/**
 * Pure presentational timeline — no data fetching, no auth dependency.
 * Accepts the `tracking_events` array from any order object.
 * Used by both the authenticated TrackOrder page and the public /track page.
 */
export default function OrderTimeline({ events = [] }) {
  if (events.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No tracking events yet</div>
        <div className="empty-state-desc">Events will appear here once the order is picked up.</div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {events.map((ev, i) => {
        const isLast = i === events.length - 1;
        const dotClass =
          ev.status === 'DELIVERED' ? 'done' :
          ev.status === 'FAILED'    ? 'failed' :
          isLast                    ? 'active' : '';

        return (
          <div key={ev.id} className="timeline-item">
            <div className="timeline-left">
              <div className={`timeline-dot ${dotClass}`}>{statusIcon(ev.status)}</div>
              {!isLast && <div className="timeline-line" />}
            </div>
            <div className="timeline-content">
              <div className="timeline-status">{ev.status.replace(/_/g, ' ')}</div>
              <div className="timeline-meta">
                <span>{formatDateTime(ev.created_at)}</span>
                {ev.actor?.full_name && (
                  <span>· {ev.actor.full_name} ({ev.actor_role})</span>
                )}
              </div>
              {ev.remarks && (
                <div className="timeline-remarks">{ev.remarks}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

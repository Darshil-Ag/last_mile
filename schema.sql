-- ============================================================
-- LAST-MILE DELIVERY TRACKER
-- FINAL DATABASE SCHEMA — PostgreSQL / Supabase
-- ============================================================
-- Run this entire file in Supabase → SQL Editor
-- ============================================================


-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'CUSTOMER',
  'AGENT',
  'ADMIN'
);

CREATE TYPE order_type AS ENUM (
  'B2B',
  'B2C'
);

CREATE TYPE payment_type AS ENUM (
  'PREPAID',
  'COD'
);

CREATE TYPE order_status AS ENUM (
  'CREATED',
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED',
  'RESCHEDULED'
);

CREATE TYPE agent_availability AS ENUM (
  'AVAILABLE',
  'BUSY',
  'OFFLINE'
);

CREATE TYPE assignment_type AS ENUM (
  'AUTO',
  'MANUAL',
  'RESCHEDULE'
);

CREATE TYPE attempt_status AS ENUM (
  'SCHEDULED',
  'IN_PROGRESS',
  'DELIVERED',
  'FAILED'
);

CREATE TYPE surcharge_type AS ENUM (
  'FIXED',
  'PERCENTAGE'
);

CREATE TYPE notification_channel AS ENUM (
  'EMAIL',
  'SMS'
);

CREATE TYPE notification_status AS ENUM (
  'PENDING',
  'SENT',
  'FAILED'
);


-- ============================================================
-- 2. ORDER NUMBER SEQUENCE + GENERATOR
-- Produces: ORD-YYYYMMDD-00001 (global counter, no race condition)
-- ============================================================

CREATE SEQUENCE order_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ORD-'
    || TO_CHAR(NOW(), 'YYYYMMDD')
    || '-'
    || LPAD(nextval('order_number_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 3. USERS
-- Authentication + application roles
-- ============================================================

CREATE TABLE users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    TEXT        NOT NULL,
  email        TEXT        NOT NULL UNIQUE,
  -- Custom authentication. Can be set NULL if Supabase Auth is adopted later.
  password_hash TEXT,
  phone        TEXT,
  role         user_role   NOT NULL DEFAULT 'CUSTOMER',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 4. ZONES
-- Admin-configurable delivery zones
-- ============================================================

CREATE TABLE zones (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  code        TEXT        NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 5. ZONE PINCODES
-- Maps pincodes to zones — one pincode belongs to exactly one zone
-- ============================================================

CREATE TABLE zone_pincodes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id    UUID        NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  pincode    VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_zone_pincodes_zone_id ON zone_pincodes(zone_id);
CREATE INDEX idx_zone_pincodes_pincode ON zone_pincodes(pincode);


-- ============================================================
-- 6. RATE CARDS
-- B2B/B2C pricing per from_zone × to_zone pair
-- Intra-zone: from_zone_id = to_zone_id
-- No pricing logic hardcoded in application code
-- ============================================================

CREATE TABLE rate_cards (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  from_zone_id        UUID         NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
  to_zone_id          UUID         NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
  order_type          order_type   NOT NULL,
  base_price          NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
  rate_per_kg         NUMERIC(12,2) NOT NULL CHECK (rate_per_kg >= 0),
  min_chargeable_kg   NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (min_chargeable_kg >= 0),
  effective_from      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  effective_to        TIMESTAMPTZ,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE INDEX idx_rate_cards_lookup ON rate_cards (from_zone_id, to_zone_id, order_type, is_active);


-- ============================================================
-- 7. COD SURCHARGE CONFIGURATION
-- Admin-configurable, FIXED or PERCENTAGE per order type
-- ============================================================

CREATE TABLE cod_surcharge_configs (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type       order_type    NOT NULL,
  surcharge_type   surcharge_type NOT NULL,
  surcharge_value  NUMERIC(12,2) NOT NULL CHECK (surcharge_value >= 0),
  effective_from   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  effective_to     TIMESTAMPTZ,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE INDEX idx_cod_config_lookup ON cod_surcharge_configs (order_type, is_active);


-- ============================================================
-- 8. DELIVERY AGENTS
-- Extends users with location and availability state
-- ============================================================

CREATE TABLE agents (
  id                  UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID               NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_zone_id     UUID               REFERENCES zones(id) ON DELETE SET NULL,
  latitude            NUMERIC(10,7),
  longitude           NUMERIC(10,7),
  availability_status agent_availability NOT NULL DEFAULT 'OFFLINE',
  is_active           BOOLEAN            NOT NULL DEFAULT TRUE,
  last_location_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

  CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

CREATE INDEX idx_agents_assignment ON agents (availability_status, is_active, current_zone_id);


-- ============================================================
-- 9. ORDERS
-- Core transaction table — full pricing audit baked in
-- current_status is a denormalized fast-read field;
-- tracking_events is the immutable source of truth.
-- ============================================================

CREATE TABLE orders (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT         NOT NULL UNIQUE DEFAULT generate_order_number(),

  -- Customer receiving the delivery
  customer_id     UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- Customer or Admin who initiated the order
  created_by      UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Pickup details
  pickup_address   TEXT        NOT NULL,
  pickup_pincode   VARCHAR(10) NOT NULL,
  pickup_latitude  NUMERIC(10,7),
  pickup_longitude NUMERIC(10,7),
  pickup_zone_id   UUID        NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,

  -- Drop details
  drop_address    TEXT        NOT NULL,
  drop_pincode    VARCHAR(10) NOT NULL,
  drop_latitude   NUMERIC(10,7),
  drop_longitude  NUMERIC(10,7),
  drop_zone_id    UUID        NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,

  -- Package dimensions (cm)
  length_cm       NUMERIC(10,2) NOT NULL CHECK (length_cm > 0),
  breadth_cm      NUMERIC(10,2) NOT NULL CHECK (breadth_cm > 0),
  height_cm       NUMERIC(10,2) NOT NULL CHECK (height_cm > 0),

  -- Weight (kg)
  actual_weight_kg      NUMERIC(10,3) NOT NULL CHECK (actual_weight_kg > 0),
  volumetric_weight_kg  NUMERIC(10,3) NOT NULL CHECK (volumetric_weight_kg >= 0),
  -- chargeable = max(actual, volumetric), enforced at application layer
  chargeable_weight_kg  NUMERIC(10,3) NOT NULL CHECK (chargeable_weight_kg > 0),

  -- Classification
  order_type    order_type  NOT NULL,
  payment_type  payment_type NOT NULL,

  -- Pricing audit — stored at time of order confirmation, never recalculated
  rate_card_id  UUID        REFERENCES rate_cards(id) ON DELETE RESTRICT,
  base_charge   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (base_charge >= 0),
  cod_surcharge NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cod_surcharge >= 0),
  total_charge  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_charge >= 0),

  -- Current denormalized status (kept in sync by trigger)
  current_status order_status NOT NULL DEFAULT 'CREATED',

  -- Timestamps
  confirmed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- COD surcharge must be 0 for PREPAID orders
  CONSTRAINT check_cod_charge CHECK (
    payment_type = 'COD' OR cod_surcharge = 0
  ),

  CONSTRAINT check_pickup_coordinates CHECK (
    (pickup_latitude IS NULL AND pickup_longitude IS NULL)
    OR (pickup_latitude BETWEEN -90 AND 90 AND pickup_longitude BETWEEN -180 AND 180)
  ),

  CONSTRAINT check_drop_coordinates CHECK (
    (drop_latitude IS NULL AND drop_longitude IS NULL)
    OR (drop_latitude BETWEEN -90 AND 90 AND drop_longitude BETWEEN -180 AND 180)
  )
);

CREATE INDEX idx_orders_customer    ON orders(customer_id);
CREATE INDEX idx_orders_status      ON orders(current_status);
CREATE INDEX idx_orders_pickup_zone ON orders(pickup_zone_id);
CREATE INDEX idx_orders_drop_zone   ON orders(drop_zone_id);
CREATE INDEX idx_orders_rate_card   ON orders(rate_card_id);


-- ============================================================
-- 10. ORDER ASSIGNMENTS
-- Complete assignment and reassignment history — never overwrite
-- ============================================================

CREATE TABLE order_assignments (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  agent_id        UUID            NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  -- Admin/system user who triggered the assignment (NULL for fully automated)
  assigned_by     UUID            REFERENCES users(id) ON DELETE SET NULL,
  assignment_type assignment_type NOT NULL,
  -- For cross-zone fallback: "cross-zone fallback — no agent in pickup zone"
  reason          TEXT,
  assigned_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  -- Set when this assignment is superseded (reassignment or completion)
  unassigned_at   TIMESTAMPTZ
);

CREATE INDEX idx_assignments_order ON order_assignments(order_id);
CREATE INDEX idx_assignments_agent ON order_assignments(agent_id);


-- ============================================================
-- 11. DELIVERY ATTEMPTS
-- Supports multi-attempt delivery and reschedule tracking
-- ============================================================

CREATE TABLE delivery_attempts (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  agent_id       UUID           NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  -- Which assignment record corresponds to this attempt
  assignment_id  UUID           REFERENCES order_assignments(id) ON DELETE SET NULL,
  attempt_number INTEGER        NOT NULL CHECK (attempt_number > 0),
  status         attempt_status NOT NULL DEFAULT 'SCHEDULED',
  failure_reason TEXT,
  scheduled_date DATE           NOT NULL,
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  UNIQUE(order_id, attempt_number)
);

CREATE INDEX idx_delivery_attempts_order ON delivery_attempts(order_id);


-- ============================================================
-- 12. TRACKING EVENTS
-- Immutable append-only status history
-- Every status change INSERTS a new row — never UPDATE or DELETE
-- ============================================================

CREATE TABLE tracking_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     order_status NOT NULL,
  actor_id   UUID        REFERENCES users(id) ON DELETE SET NULL,
  actor_role user_role,
  latitude   NUMERIC(10,7),
  longitude  NUMERIC(10,7),
  remarks    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_events_order ON tracking_events(order_id, created_at);


-- ============================================================
-- 13. NOTIFICATIONS
-- Email / SMS delivery log — includes metadata for templates
-- ============================================================

CREATE TABLE notifications (
  id           UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID                 NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  recipient_id UUID                 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel      notification_channel NOT NULL,
  event_type   TEXT                 NOT NULL,
  message      TEXT                 NOT NULL,
  -- Template variables: agent name, scheduled date, etc.
  metadata     JSONB,
  status       notification_status  NOT NULL DEFAULT 'PENDING',
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_order  ON notifications(order_id);
CREATE INDEX idx_notifications_status ON notifications(status);


-- ============================================================
-- 14. TRIGGERS — updated_at auto-maintenance
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER rate_cards_updated_at
  BEFORE UPDATE ON rate_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER cod_configs_updated_at
  BEFORE UPDATE ON cod_surcharge_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 15. TRIGGER — Immutable tracking_events
-- Blocks any UPDATE or DELETE on tracking_events at the DB level
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_tracking_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Tracking events are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tracking_events_immutable_update
  BEFORE UPDATE ON tracking_events
  FOR EACH ROW EXECUTE FUNCTION prevent_tracking_event_mutation();

CREATE TRIGGER tracking_events_immutable_delete
  BEFORE DELETE ON tracking_events
  FOR EACH ROW EXECUTE FUNCTION prevent_tracking_event_mutation();


-- ============================================================
-- 16. TRIGGER — Sync orders.current_status from tracking_events
-- Every INSERT on tracking_events auto-updates the fast-read field
-- ============================================================

CREATE OR REPLACE FUNCTION sync_order_status_from_event()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders
  SET current_status = NEW.status,
      updated_at     = NOW()
  WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tracking_events_sync_order_status
  AFTER INSERT ON tracking_events
  FOR EACH ROW EXECUTE FUNCTION sync_order_status_from_event();


-- ============================================================
-- END OF SCHEMA
-- ============================================================

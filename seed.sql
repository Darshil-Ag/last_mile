-- ============================================================
-- LAST-MILE DELIVERY TRACKER — SEED DATA
-- Run AFTER schema.sql in Supabase → SQL Editor
-- ============================================================
-- Passwords below are bcrypt hashes of "Password@123"
-- Change before any production use.
-- ============================================================


-- ============================================================
-- USERS (1 Admin, 3 Agents, 3 Customers)
-- bcrypt hash of "Password@123"
-- ============================================================

INSERT INTO users (id, full_name, email, password_hash, phone, role) VALUES
  -- Admin
  ('a0000000-0000-0000-0000-000000000001',
   'Admin User',
   'admin@lastmile.dev',
   '$2b$10$aNl8hJSTYrlQSSwTaIm8V.wNZLaMq/QCQkJOqW1eK5gZ7W5upHvcG',
   '9000000001',
   'ADMIN'),

  -- Agents
  ('a0000000-0000-0000-0000-000000000002',
   'Ravi Sharma',
   'ravi.agent@lastmile.dev',
   '$2b$10$aNl8hJSTYrlQSSwTaIm8V.wNZLaMq/QCQkJOqW1eK5gZ7W5upHvcG',
   '9000000002',
   'AGENT'),

  ('a0000000-0000-0000-0000-000000000003',
   'Priya Nair',
   'priya.agent@lastmile.dev',
   '$2b$10$aNl8hJSTYrlQSSwTaIm8V.wNZLaMq/QCQkJOqW1eK5gZ7W5upHvcG',
   '9000000003',
   'AGENT'),

  ('a0000000-0000-0000-0000-000000000004',
   'Arjun Mehta',
   'arjun.agent@lastmile.dev',
   '$2b$10$aNl8hJSTYrlQSSwTaIm8V.wNZLaMq/QCQkJOqW1eK5gZ7W5upHvcG',
   '9000000004',
   'AGENT'),

  -- Customers
  ('a0000000-0000-0000-0000-000000000005',
   'Sneha Kapoor',
   'sneha@example.com',
   '$2b$10$aNl8hJSTYrlQSSwTaIm8V.wNZLaMq/QCQkJOqW1eK5gZ7W5upHvcG',
   '9000000005',
   'CUSTOMER'),

  ('a0000000-0000-0000-0000-000000000006',
   'Vikram Joshi',
   'vikram@example.com',
   '$2b$10$aNl8hJSTYrlQSSwTaIm8V.wNZLaMq/QCQkJOqW1eK5gZ7W5upHvcG',
   '9000000006',
   'CUSTOMER'),

  ('a0000000-0000-0000-0000-000000000007',
   'Ananya Reddy',
   'ananya@example.com',
   '$2b$10$aNl8hJSTYrlQSSwTaIm8V.wNZLaMq/QCQkJOqW1eK5gZ7W5upHvcG',
   '9000000007',
   'CUSTOMER');


-- ============================================================
-- ZONES (3 zones covering Mumbai metro areas)
-- ============================================================

INSERT INTO zones (id, name, code, description, is_active) VALUES
  ('b0000000-0000-0000-0000-000000000001',
   'South Mumbai',
   'ZONE-S-MUM',
   'Covers Colaba, Fort, Churchgate, Nariman Point, Worli',
   true),

  ('b0000000-0000-0000-0000-000000000002',
   'Central Mumbai',
   'ZONE-C-MUM',
   'Covers Dadar, Kurla, Andheri, Bandra, Ghatkopar',
   true),

  ('b0000000-0000-0000-0000-000000000003',
   'Navi Mumbai',
   'ZONE-N-MUM',
   'Covers Vashi, Belapur, Kharghar, Panvel, Airoli',
   true);


-- ============================================================
-- ZONE PINCODES
-- ============================================================

INSERT INTO zone_pincodes (zone_id, pincode) VALUES
  -- South Mumbai
  ('b0000000-0000-0000-0000-000000000001', '400001'),  -- Fort
  ('b0000000-0000-0000-0000-000000000001', '400005'),  -- Colaba
  ('b0000000-0000-0000-0000-000000000001', '400018'),  -- Worli

  -- Central Mumbai
  ('b0000000-0000-0000-0000-000000000002', '400014'),  -- Dadar
  ('b0000000-0000-0000-0000-000000000002', '400051'),  -- Bandra
  ('b0000000-0000-0000-0000-000000000002', '400059'),  -- Andheri

  -- Navi Mumbai
  ('b0000000-0000-0000-0000-000000000003', '400703'),  -- Vashi
  ('b0000000-0000-0000-0000-000000000003', '410218');  -- Kharghar


-- ============================================================
-- RATE CARDS
-- 4 required combinations per zone pair (B2B/B2C):
--   Intra-zone: from_zone = to_zone
--   Inter-zone: from_zone ≠ to_zone (using S→C and C→N as examples)
--
-- Full set seeded: all 3×3 zone pairs × 2 order types = 18 cards
-- Only key ones shown for brevity — add more as needed
-- ============================================================

-- South Mumbai → South Mumbai (INTRA)
INSERT INTO rate_cards (from_zone_id, to_zone_id, order_type, base_price, rate_per_kg, min_chargeable_kg) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'B2C', 40.00, 12.00, 0.500),
  ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'B2B', 30.00, 9.00,  0.500),

-- Central Mumbai → Central Mumbai (INTRA)
  ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'B2C', 40.00, 12.00, 0.500),
  ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'B2B', 30.00, 9.00,  0.500),

-- Navi Mumbai → Navi Mumbai (INTRA)
  ('b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'B2C', 45.00, 13.00, 0.500),
  ('b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'B2B', 35.00, 10.00, 0.500),

-- South Mumbai → Central Mumbai (INTER)
  ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'B2C', 60.00, 15.00, 0.500),
  ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'B2B', 50.00, 12.00, 0.500),

-- Central Mumbai → South Mumbai (INTER)
  ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'B2C', 60.00, 15.00, 0.500),
  ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'B2B', 50.00, 12.00, 0.500),

-- Central Mumbai → Navi Mumbai (INTER)
  ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'B2C', 70.00, 16.00, 0.500),
  ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'B2B', 55.00, 13.00, 0.500),

-- Navi Mumbai → Central Mumbai (INTER)
  ('b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'B2C', 70.00, 16.00, 0.500),
  ('b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'B2B', 55.00, 13.00, 0.500),

-- South Mumbai → Navi Mumbai (INTER)
  ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'B2C', 80.00, 18.00, 0.500),
  ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'B2B', 65.00, 14.00, 0.500),

-- Navi Mumbai → South Mumbai (INTER)
  ('b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'B2C', 80.00, 18.00, 0.500),
  ('b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'B2B', 65.00, 14.00, 0.500);


-- ============================================================
-- COD SURCHARGE CONFIGS
-- One FIXED and one PERCENTAGE per order type
-- Only one should be active at a time per order_type in production
-- Both seeded; B2C uses PERCENTAGE, B2B uses FIXED
-- ============================================================

INSERT INTO cod_surcharge_configs (order_type, surcharge_type, surcharge_value, is_active) VALUES
  ('B2C', 'PERCENTAGE', 2.00,  true),  -- 2% of total for B2C COD orders
  ('B2B', 'FIXED',      25.00, true);  -- Flat ₹25 for B2B COD orders


-- ============================================================
-- AGENTS (3 agent profiles linked to agent users)
-- ============================================================

INSERT INTO agents (user_id, current_zone_id, latitude, longitude, availability_status, is_active, last_location_at) VALUES
  -- Ravi Sharma — South Mumbai, AVAILABLE
  ('a0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000001',
   18.9388, 72.8354,
   'AVAILABLE', true, NOW()),

  -- Priya Nair — Central Mumbai, AVAILABLE
  ('a0000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000002',
   19.0760, 72.8777,
   'AVAILABLE', true, NOW()),

  -- Arjun Mehta — Navi Mumbai, OFFLINE
  ('a0000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000003',
   19.0330, 73.0297,
   'OFFLINE', true, NOW() - INTERVAL '2 hours');


-- ============================================================
-- SEED COMPLETE
-- ============================================================
-- Credentials for testing (all passwords: Password@123):
--   admin@lastmile.dev     → ADMIN
--   ravi.agent@lastmile.dev  → AGENT (South Mumbai, AVAILABLE)
--   priya.agent@lastmile.dev → AGENT (Central Mumbai, AVAILABLE)
--   arjun.agent@lastmile.dev → AGENT (Navi Mumbai, OFFLINE)
--   sneha@example.com      → CUSTOMER
--   vikram@example.com     → CUSTOMER
--   ananya@example.com     → CUSTOMER
-- ============================================================

# Last-Mile Delivery Tracker — System Design Document

## 1. Architecture Overview

The Last-Mile Delivery Tracker is designed as a decoupled, multi-tier web application built on modern web standards:
- **Frontend**: Single Page Application (SPA) built with React 18 + Vite, deployed on **Vercel**.
- **Backend API**: Node.js + Express REST API, deployed on **Render / Railway**.
- **Database Layer**: Hosted **Supabase PostgreSQL** instance enforcing relational integrity, automated timestamp updates, and immutability rules via database triggers.

Communication between the client and Express API occurs over HTTPS with JSON payloads, authenticated via standard Bearer JWT tokens. All database access from the Express server uses Supabase's `service_role` key, ensuring high performance while table-level Row Level Security (RLS) is kept on a strict default-deny policy for anonymous and standard key access.

```
React (Vite) [Vercel]
       │ (REST / JWT)
       ▼
Node.js + Express [Render / Railway]
       │ (service_role)
       ▼
Supabase PostgreSQL
```

---

## 2. Configurable Rate Calculation Engine

Pricing is dynamically computed without hardcoded values using database-driven rate cards and surcharge configurations.

### 2.1 Formula & Logic
1. **Zone Resolution**: Pickup and drop pincodes map directly to operational zones (`zone_pincodes` → `zones`).
2. **Volumetric Weight Calculation**:
   $$\text{Volumetric Weight (kg)} = \frac{\text{Length (cm)} \times \text{Breadth (cm)} \times \text{Height (cm)}}{5000}$$
3. **Chargeable Weight**:
   $$\text{Chargeable Weight} = \max(\text{Actual Weight}, \text{Volumetric Weight})$$
4. **Base Charge Calculation**: The system queries active `rate_cards` matching `(from_zone_id, to_zone_id, order_type)`. If `chargeable_weight` is less than `min_chargeable_kg`, `min_chargeable_kg` is billed:
   $$\text{Base Charge} = \text{base\_price} + (\max(\text{Chargeable Weight}, \text{min\_chargeable\_kg}) \times \text{rate\_per\_kg})$$
5. **COD Surcharge**: When `payment_type = 'COD'`, active `cod_surcharge_configs` for the order type are evaluated:
   - **FIXED**: Flat monetary surcharge ($\text{surcharge\_value}$).
   - **PERCENTAGE**: Calculated as $\frac{\text{Base Charge} \times \text{surcharge\_value}}{100}$.

### 2.2 Pricing Auditability
When an order is created, `rate_card_id`, `base_charge`, `cod_surcharge`, and `total_charge` are frozen into the `orders` row. Subsequent rate card changes by administrators do not affect historical orders.

---

## 3. Zone Detection & Geographic Boundaries

Zones represent operational territories rather than simple administrative names:
- Each pincode is constrained by a `UNIQUE` foreign key constraint in `zone_pincodes`, guaranteeing that no pincode spans multiple zones.
- Intra-zone deliveries occur when `pickup_zone_id = drop_zone_id`.
- Inter-zone deliveries occur when `pickup_zone_id \neq drop_zone_id`.

---

## 4. Intelligent Auto-Assignment Logic

The auto-assignment algorithm prioritizes zone operational boundaries before resorting to global spatial proximity:

1. **In-Zone Filter**: The system queries all active agents whose `availability_status = 'AVAILABLE'` and `current_zone_id = pickup_zone_id`.
2. **GPS Proximity Tiebreaker**: Candidate agents in the pickup zone are sorted by Great-Circle distance (Haversine formula) to the order's pickup latitude/longitude:
   $$d = 2R \arcsin \left( \sqrt{ \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right) } \right)$$
   The nearest candidate is assigned.
3. **Cross-Zone Fallback**: If no available agent exists within the pickup zone, the search expands system-wide to all available agents, picking the nearest by Haversine distance. The assignment audit log explicitly records the reason as `"cross-zone fallback — no agent in pickup zone"`.
4. **Capacity & State Lock**: Upon assignment, the agent's availability is atomically flipped to `'BUSY'` to prevent double-dispatch.

---

## 5. Status Lifecycle & Failed Delivery Recovery

### 5.1 Immutable Audit Trail
Order state progresses through defined stages:
$$\text{CREATED} \rightarrow \text{ASSIGNED} \rightarrow \text{PICKED\_UP} \rightarrow \text{IN\_TRANSIT} \rightarrow \text{OUT\_FOR_DELIVERY} \rightarrow \text{DELIVERED / FAILED}$$

Every transition generates an insert into `tracking_events`. Database triggers (`prevent_tracking_event_mutation`) raise exceptions on any `UPDATE` or `DELETE` attempt on `tracking_events`, ensuring a tamper-proof event log. A secondary trigger (`sync_order_status_from_event`) automatically updates `orders.current_status`.

### 5.2 Failed Delivery & Reschedule Flow
1. Marking an attempt as `FAILED` frees the agent back to `'AVAILABLE'` and logs a failure reason.
2. The customer receives an email notification containing the reason and a reschedule call-to-action.
3. Upon customer date selection, a new `delivery_attempts` row is created, transitioning status to `RESCHEDULED`.
4. The auto-assignment algorithm automatically re-dispatches a new agent for the rescheduled attempt.

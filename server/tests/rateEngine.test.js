/**
 * Rate engine unit tests.
 * Imports only from rateCalc.js (pure functions, zero DB/env dependencies).
 */
const {
  calcVolumetricWeight,
  calcChargeableWeight,
  calcBaseCharge,
  calcCodSurcharge,
} = require('../src/services/rateCalc');

// ─── Volumetric weight ────────────────────────────────────────────────────────

describe('calcVolumetricWeight', () => {
  test('standard box: 30×20×10 cm = 1.200 kg', () => {
    expect(calcVolumetricWeight(30, 20, 10)).toBe(1.2);
  });

  test('large box: 50×40×30 cm = 12.000 kg', () => {
    expect(calcVolumetricWeight(50, 40, 30)).toBe(12);
  });

  test('flat envelope: 30×25×1 cm = 0.150 kg', () => {
    expect(calcVolumetricWeight(30, 25, 1)).toBe(0.15);
  });

  test('rounds to 3 decimal places', () => {
    // 11×11×11 = 1331 / 5000 = 0.2662
    expect(calcVolumetricWeight(11, 11, 11)).toBe(0.266);
  });
});

// ─── Chargeable weight ────────────────────────────────────────────────────────

describe('calcChargeableWeight', () => {
  test('volumetric > actual → volumetric wins', () => {
    const vol = calcVolumetricWeight(30, 20, 10); // 1.2
    expect(calcChargeableWeight(0.5, vol)).toBe(1.2);
  });

  test('actual > volumetric → actual wins', () => {
    const vol = calcVolumetricWeight(10, 10, 10); // 0.2
    expect(calcChargeableWeight(5.0, vol)).toBe(5.0);
  });

  test('actual === volumetric → either, returns that value', () => {
    const vol = calcVolumetricWeight(10, 10, 50); // 1.0
    expect(calcChargeableWeight(1.0, vol)).toBe(1.0);
  });
});

// ─── Base charge ──────────────────────────────────────────────────────────────

describe('calcBaseCharge', () => {
  test('base_price=40, rate=12, weight=1.2, min=0.5 → 40 + 1.2×12 = 54.40', () => {
    expect(calcBaseCharge(40, 1.2, 12, 0.5)).toBe(54.4);
  });

  test('min_chargeable_kg enforced: weight=0.1 < min=0.5 → bills at 0.5', () => {
    // 40 + 0.5 × 12 = 46.00
    expect(calcBaseCharge(40, 0.1, 12, 0.5)).toBe(46.0);
  });

  test('rounds to 2 decimal places', () => {
    // 40 + 1.123 × 12.5 = 40 + 14.0375 = 54.04 (rounded)
    expect(calcBaseCharge(40, 1.123, 12.5)).toBe(54.04);
  });
});

// ─── COD surcharge ────────────────────────────────────────────────────────────

describe('calcCodSurcharge', () => {
  test('FIXED ₹25 surcharge', () => {
    expect(calcCodSurcharge(200, 'FIXED', 25)).toBe(25);
  });

  test('PERCENTAGE 2% of ₹200 = ₹4.00', () => {
    expect(calcCodSurcharge(200, 'PERCENTAGE', 2)).toBe(4);
  });

  test('PERCENTAGE 2% of ₹155.75 = ₹3.12', () => {
    expect(calcCodSurcharge(155.75, 'PERCENTAGE', 2)).toBe(3.12);
  });

  test('PREPAID: surcharge is 0 (caller responsibility — not called for PREPAID)', () => {
    // System only calls calcCodSurcharge when payment_type === 'COD'
    const payment_type = 'PREPAID';
    const cod_surcharge = payment_type === 'COD' ? calcCodSurcharge(200, 'FIXED', 25) : 0;
    expect(cod_surcharge).toBe(0);
  });
});

// ─── End-to-end charge composition ───────────────────────────────────────────

describe('Full charge composition', () => {
  test('B2C inter-zone: 30×20×10cm, actual=0.5kg, COD PERCENTAGE 2%', () => {
    const vol = calcVolumetricWeight(30, 20, 10); // 1.2
    const chargeable = calcChargeableWeight(0.5, vol); // 1.2 (vol wins)
    const base = calcBaseCharge(60, chargeable, 15, 0.5); // 60 + 1.2×15 = 78.00
    const cod = calcCodSurcharge(base, 'PERCENTAGE', 2); // 78 × 0.02 = 1.56
    const total = parseFloat((base + cod).toFixed(2)); // 79.56

    expect(vol).toBe(1.2);
    expect(chargeable).toBe(1.2);
    expect(base).toBe(78);
    expect(cod).toBe(1.56);
    expect(total).toBe(79.56);
  });

  test('B2B intra-zone: 10×10×10cm, actual=5kg (actual wins), PREPAID', () => {
    const vol = calcVolumetricWeight(10, 10, 10); // 0.2
    const chargeable = calcChargeableWeight(5.0, vol); // 5.0 (actual wins)
    const base = calcBaseCharge(30, chargeable, 9, 0.5); // 30 + 5×9 = 75.00
    const cod = 0; // PREPAID
    const total = parseFloat((base + cod).toFixed(2)); // 75.00

    expect(chargeable).toBe(5.0);
    expect(base).toBe(75);
    expect(total).toBe(75);
  });
});

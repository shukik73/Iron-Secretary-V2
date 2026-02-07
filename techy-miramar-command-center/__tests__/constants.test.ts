import { describe, it, expect } from 'vitest';
import {
  MIDAS_BUY_RULES,
  MIDAS_RULES,
  REVENUE_TARGETS,
  KILL_CRITERIA,
} from '../constants';

describe('MIDAS_BUY_RULES', () => {
  it('has entries for all tracked device categories', () => {
    const expectedDevices = [
      'macbook_pro_15_2015',
      'macbook_pro_13_2017',
      'macbook_pro_16_2019',
      'macbook_air_m1_2020',
      'imac_27_2017_2019',
      'imac_21_2017_plus',
    ];
    expect(Object.keys(MIDAS_BUY_RULES)).toEqual(expectedDevices);
  });

  it('every device has positive margins (minYield > maxBuy)', () => {
    for (const [device, rule] of Object.entries(MIDAS_BUY_RULES)) {
      expect(rule.minYield).toBeGreaterThan(rule.maxBuy);
    }
  });

  it('minYield is less than or equal to maxYield for every device', () => {
    for (const [device, rule] of Object.entries(MIDAS_BUY_RULES)) {
      expect(rule.minYield).toBeLessThanOrEqual(rule.maxYield);
    }
  });

  it('minMargin matches minYield minus maxBuy', () => {
    for (const [device, rule] of Object.entries(MIDAS_BUY_RULES)) {
      expect(rule.minMargin).toBe(rule.minYield - rule.maxBuy);
    }
  });
});

describe('MIDAS_RULES', () => {
  it('limits open purchases to 3', () => {
    expect(MIDAS_RULES.maxOpenPurchases).toBe(3);
  });

  it('never buys water damage', () => {
    expect(MIDAS_RULES.neverBuyWaterDamage).toBe(true);
  });

  it('no-power max price is 40%', () => {
    expect(MIDAS_RULES.noPowerMaxPricePercent).toBe(0.4);
  });
});

describe('REVENUE_TARGETS', () => {
  it('current totals match the sum of streams', () => {
    const c = REVENUE_TARGETS.current;
    expect(c.total).toBe(c.repair + c.refurb + c.rg + c.midas);
  });

  it('target totals match the sum of streams', () => {
    const t = REVENUE_TARGETS.target;
    expect(t.total).toBe(t.repair + t.refurb + t.rg + t.midas);
  });

  it('milestones increase over time', () => {
    const m = REVENUE_TARGETS.milestones;
    expect(m.month4).toBeGreaterThan(m.month2);
    expect(m.month6).toBeGreaterThan(m.month4);
    expect(m.month9).toBeGreaterThan(m.month6);
    expect(m.month12).toBeGreaterThanOrEqual(m.month9);
  });
});

describe('KILL_CRITERIA', () => {
  it('has entries for all tracked projects', () => {
    const projects = KILL_CRITERIA.map((k) => k.project);
    expect(projects).toContain('Emilio');
    expect(projects).toContain('ReviewGuard');
    expect(projects).toContain('Midas');
    expect(projects).toContain('Hamoriko');
  });

  it('every entry has required fields', () => {
    for (const entry of KILL_CRITERIA) {
      expect(entry.signal).toBeTruthy();
      expect(entry.timeframe).toBeTruthy();
      expect(entry.alternative).toBeTruthy();
      expect(['active', 'pending']).toContain(entry.status);
    }
  });
});

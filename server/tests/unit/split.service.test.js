import {
  calculateEqualSplit,
  calculateUnequalSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateSplits,
} from '../../src/services/split.service.js';

describe('Split Service — Unit Tests', () => {

  // ── EQUAL ──────────────────────────────────────────────────────────────────
  describe('calculateEqualSplit', () => {
    it('splits equally among 4 users', () => {
      const result = calculateEqualSplit(1200, ['u1', 'u2', 'u3', 'u4']);
      expect(result).toHaveLength(4);
      result.forEach((r) => expect(r.amountOwed).toBeCloseTo(300, 1));
    });

    it('handles rounding correctly (₹1000 ÷ 3)', () => {
      const result = calculateEqualSplit(1000, ['u1', 'u2', 'u3']);
      const total = result.reduce((s, r) => s + r.amountOwed, 0);
      expect(total).toBeCloseTo(1000, 1);
    });

    it('throws if no participants', () => {
      expect(() => calculateEqualSplit(1000, [])).toThrow();
    });
  });

  // ── UNEQUAL ────────────────────────────────────────────────────────────────
  describe('calculateUnequalSplit', () => {
    it('stores manual amounts correctly', () => {
      const splits = [
        { userId: 'u1', amount: 500 },
        { userId: 'u2', amount: 300 },
        { userId: 'u3', amount: 200 },
      ];
      const result = calculateUnequalSplit(1000, splits);
      expect(result[0].amountOwed).toBe(500);
      expect(result[1].amountOwed).toBe(300);
      expect(result[2].amountOwed).toBe(200);
    });

    it('throws if amounts do not sum to total', () => {
      const splits = [
        { userId: 'u1', amount: 400 },
        { userId: 'u2', amount: 300 },
      ];
      expect(() => calculateUnequalSplit(1000, splits)).toThrow(
        /must equal total expense amount/
      );
    });
  });

  // ── PERCENTAGE ─────────────────────────────────────────────────────────────
  describe('calculatePercentageSplit', () => {
    it('calculates amounts from percentages', () => {
      const splits = [
        { userId: 'u1', percentage: 50 },
        { userId: 'u2', percentage: 30 },
        { userId: 'u3', percentage: 20 },
      ];
      const result = calculatePercentageSplit(1000, splits);
      expect(result[0].amountOwed).toBeCloseTo(500, 1);
      expect(result[1].amountOwed).toBeCloseTo(300, 1);
      expect(result[2].amountOwed).toBeCloseTo(200, 1);
    });

    it('stores percentage values', () => {
      const splits = [{ userId: 'u1', percentage: 100 }];
      const result = calculatePercentageSplit(1000, splits);
      expect(result[0].percentage).toBe(100);
    });

    it('throws if percentages do not sum to 100', () => {
      const splits = [
        { userId: 'u1', percentage: 50 },
        { userId: 'u2', percentage: 40 },
        { userId: 'u3', percentage: 30 },
      ];
      expect(() => calculatePercentageSplit(1000, splits)).toThrow(/100%/);
    });
  });

  // ── SHARES ─────────────────────────────────────────────────────────────────
  describe('calculateSharesSplit', () => {
    it('calculates amounts from shares (3:2 ratio)', () => {
      const splits = [
        { userId: 'u1', shares: 3 },
        { userId: 'u2', shares: 2 },
      ];
      const result = calculateSharesSplit(1000, splits);
      expect(result[0].amountOwed).toBeCloseTo(600, 1);
      expect(result[1].amountOwed).toBeCloseTo(400, 1);
    });

    it('stores share values', () => {
      const splits = [{ userId: 'u1', shares: 5 }];
      const result = calculateSharesSplit(1000, splits);
      expect(result[0].shares).toBe(5);
    });

    it('throws if total shares is 0', () => {
      const splits = [
        { userId: 'u1', shares: 0 },
        { userId: 'u2', shares: 0 },
      ];
      expect(() => calculateSharesSplit(1000, splits)).toThrow(
        /Total shares must be greater than zero/
      );
    });
  });

  // ── DISPATCHER ─────────────────────────────────────────────────────────────
  describe('calculateSplits dispatcher', () => {
    it('routes EQUAL correctly', () => {
      const result = calculateSplits(800, 'EQUAL', { userIds: ['u1', 'u2'] });
      expect(result).toHaveLength(2);
      result.forEach((r) => expect(r.amountOwed).toBeCloseTo(400, 1));
    });

    it('throws for unknown split type', () => {
      expect(() => calculateSplits(1000, 'UNKNOWN', {})).toThrow(/Unknown split type/);
    });
  });
});

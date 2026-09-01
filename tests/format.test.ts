import { describe, expect, it } from 'vitest';
import { formatMass, formatNumber, formatRate, formatTime, KOREAN_UNITS } from '@/util/format';

describe('formatNumber (korean units)', () => {
  it('plain integers below 1e4', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(0.7)).toBe('0');
    expect(formatNumber(1234)).toBe('1234');
    expect(formatNumber(9999)).toBe('9999');
    expect(formatNumber(9999.9)).toBe('9999');
  });
  it('three significant digits with units', () => {
    expect(formatNumber(12345)).toBe('1.23만');
    expect(formatNumber(123456)).toBe('12.3만');
    expect(formatNumber(1234567)).toBe('123만');
    expect(formatNumber(1.5e8)).toBe('1.50억');
    expect(formatNumber(1e12)).toBe('1.00조');
    expect(formatNumber(1e16)).toBe('1.00경');
  });
  it('rounding carry', () => {
    expect(formatNumber(99995)).toBe('10.0만');
    expect(formatNumber(9999.5e4)).toBe('1.00억');
  });
  it('unit boundaries', () => {
    for (let k = 1; k < KOREAN_UNITS.length; k++) {
      expect(formatNumber(Math.pow(10, 4 * k))).toBe(`1.00${KOREAN_UNITS[k]}`);
    }
    expect(formatNumber(1e48)).toBe('1.00극');
    expect(formatNumber(9.9e51)).toBe('9900극');
  });
  it('scientific beyond 극', () => {
    expect(formatNumber(1e52)).toBe('1e52');
    expect(formatNumber(1.2e52)).toBe('1.2e52');
    expect(formatNumber(1.234e60)).toBe('1.23e60');
  });
  it('scientific mode switches at 1e6', () => {
    expect(formatNumber(123456, 'scientific')).toBe('12.3만');
    expect(formatNumber(1.5e8, 'scientific')).toBe('1.5e8');
  });
  it('negatives and non-finite', () => {
    expect(formatNumber(-12345)).toBe('-1.23만');
    expect(formatNumber(Infinity)).toBe('∞');
    expect(formatNumber(NaN)).toBe('0');
  });
});

describe('formatMass', () => {
  it('formats measurements', () => {
    expect(formatMass(0.01)).toBe('0.01 M☉');
    expect(formatMass(0.083)).toBe('0.083 M☉');
    expect(formatMass(1.23)).toBe('1.23 M☉');
    expect(formatMass(20.5)).toBe('20.5 M☉');
    expect(formatMass(100)).toBe('100 M☉');
    expect(formatMass(12345)).toBe('1.23만 M☉');
  });
});

describe('formatRate / formatTime', () => {
  it('rates', () => {
    expect(formatRate(2)).toBe('2.00/s');
    expect(formatRate(12345)).toBe('1.23만/s');
  });
  it('times', () => {
    expect(formatTime(45)).toBe('45초');
    expect(formatTime(192)).toBe('3분 12초');
    expect(formatTime(3 * 3600 + 12 * 60)).toBe('3시간 12분');
    expect(formatTime(2 * 86400 + 4 * 3600)).toBe('2일 4시간');
    expect(formatTime(-5)).toBe('0초');
  });
});

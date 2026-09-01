export const KOREAN_UNITS = ['', '만', '억', '조', '경', '해', '자', '양', '구', '간', '정', '재', '극'] as const;

export type NumberFormatMode = 'korean' | 'scientific';

function scientific(x: number): string {
  if (x === 0) return '0';
  const e = Math.floor(Math.log10(x));
  let m = x / Math.pow(10, e);
  let ee = e;
  if (m >= 9.995) {
    m /= 10;
    ee += 1;
  }
  const ms = m.toFixed(2).replace(/\.?0+$/, '');
  return `${ms}e${ee}`;
}

/**
 * Korean-unit number formatting: 1234 -> "1234", 12345 -> "1.23만", 1.5e8 -> "1.50억", beyond 극 -> "1.2e52".
 */
export function formatNumber(value: number, mode: NumberFormatMode = 'korean'): string {
  if (!Number.isFinite(value)) return value > 0 ? '∞' : value < 0 ? '-∞' : '0';
  const neg = value < 0;
  const x = Math.abs(value);
  let out: string;
  if (x < 1e4) {
    out = Math.floor(x).toString();
  } else if (mode === 'scientific' && x >= 1e6) {
    out = scientific(x);
  } else {
    let k = Math.floor(Math.log10(x) / 4);
    if (k > 12) {
      out = scientific(x);
    } else {
      let m = x / Math.pow(10, 4 * k);
      if (m >= 9999.5) {
        k += 1;
        m /= 1e4;
      }
      if (k > 12) {
        out = scientific(x);
      } else {
        let digits = m < 10 ? 2 : m < 100 ? 1 : 0;
        let val = parseFloat(m.toFixed(digits));
        if (val >= 1e4) {
          k += 1;
          val /= 1e4;
          digits = 2;
        }
        if (k > 12) {
          out = scientific(x);
        } else {
          if (val >= 100) digits = 0;
          else if (val >= 10 && digits > 1) digits = 1;
          out = val.toFixed(digits) + KOREAN_UNITS[k];
        }
      }
    }
  }
  return neg ? `-${out}` : out;
}

export function formatMass(m: number): string {
  if (!Number.isFinite(m)) return '∞ M☉';
  if (m < 1000) {
    let s = m.toPrecision(3);
    if (s.includes('e')) s = m.toFixed(3);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (!s.includes('.') && m < 100) s = m.toFixed(1);
    return `${s} M☉`;
  }
  return `${formatNumber(m)} M☉`;
}

export function formatRate(x: number, mode: NumberFormatMode = 'korean'): string {
  if (!Number.isFinite(x)) return '∞/s';
  if (Math.abs(x) < 10) return `${x.toFixed(2)}/s`;
  return `${formatNumber(x, mode)}/s`;
}

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 ${s % 60}초`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 ${m % 60}분`;
  const d = Math.floor(h / 24);
  return `${d}일 ${h % 24}시간`;
}

export function formatPercent(bonus: number): string {
  const p = Math.round(bonus * 100);
  return `${p >= 0 ? '+' : ''}${p}%`;
}

export function formatMult(mult: number): string {
  return `×${mult >= 100 ? formatNumber(mult) : mult.toFixed(2).replace(/\.?0+$/, '')}`;
}

export function formatInt(x: number): string {
  return formatNumber(Math.floor(x));
}

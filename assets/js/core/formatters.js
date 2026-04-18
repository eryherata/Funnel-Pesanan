export const formatRp = (num) => "Rp " + new Intl.NumberFormat('id-ID').format(Math.round(Number(num) || 0));
export const parseRp = (value) => parseInt(String(value || '0').replace(/\D/g, ''), 10) || 0;
export const formatPct = (num, digits = 2) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(Number(num) || 0) + '%';
export const clampNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};
export const ceilTo = (value, step = 1) => {
  const safeStep = Math.max(1, parseInt(step, 10) || 1);
  return Math.ceil((Number(value) || 0) / safeStep) * safeStep;
};

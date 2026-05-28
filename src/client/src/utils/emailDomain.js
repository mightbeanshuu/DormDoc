export const BIT_DOMAIN = 'bitmesra.ac.in';

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const isBitEmail = (email) =>
  normalizeEmail(email).endsWith(`@${BIT_DOMAIN}`);

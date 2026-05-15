import { isStrongEnoughPassword, isValidEmail } from '@/utils/validation';

describe('validation utils', () => {
  it('validates email format', () => {
    expect(isValidEmail('cashier@example.com')).toBe(true);
    expect(isValidEmail('ops.team+alerts@shop.co')).toBe(true);

    expect(isValidEmail('missing-at-sign')).toBe(false);
    expect(isValidEmail('missing.domain@')).toBe(false);
    expect(isValidEmail('with space@example.com')).toBe(false);
  });

  it('enforces minimum password length', () => {
    expect(isStrongEnoughPassword('1234567')).toBe(false);
    expect(isStrongEnoughPassword('12345678')).toBe(true);
    expect(isStrongEnoughPassword('very-strong-pass')).toBe(true);
  });
});

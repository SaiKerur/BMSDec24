import { describe, expect, it } from 'vitest';
import { formatMoney } from '../lib/i18n';

describe('formatMoney', () => {
  it('formats INR by default', () => {
    const result = formatMoney(500, 'INR', 'en');
    expect(result).toContain('500');
  });

  it('formats USD', () => {
    const result = formatMoney(12.5, 'USD', 'en');
    expect(result).toMatch(/\$|USD/);
  });
});

describe('api retry logic', () => {
  it('exports ApiError with authFailed flag', async () => {
    const { ApiError } = await import('../lib/api');
    const err = new ApiError('Unauthorized', 403, true);
    expect(err.authFailed).toBe(true);
  });
});

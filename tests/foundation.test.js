import { describe, expect, it } from 'vitest';
import { API_VERSION, PRODUCT_NAME } from '@tomazelli/shared';

describe('shared foundation', () => {
  it('exports the product identity and API version', () => {
    expect(PRODUCT_NAME).toBe('Tomazelli ERP');
    expect(API_VERSION).toBe('v1');
  });
});

import { describe, expect, it } from 'vitest';
import { parseConfig } from '../../config/index.js';
import { formatConvertedAmount } from './rates.js';

const config = parseConfig({
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://127.0.0.1:27017',
  MONGODB_DB_NAME: 't_world_test',
  JWT_SECRET: 'a-test-secret-that-is-definitely-long-enough',
  AI_PROVIDER: 'mock',
});

describe('exchange rates', () => {
  it('formats the documented mock conversions', () => {
    expect(formatConvertedAmount(100, 'MOCK_USDT', config)).toBe('1.0 MOCK_USDT');
    expect(formatConvertedAmount(200, 'MOCK_ETH', config)).toBe('0.01 MOCK_ETH');
  });
});

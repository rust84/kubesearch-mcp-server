import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { searchDeploymentsInput } from './tool-inputs.js';

describe('tool-inputs', () => {
  describe('searchDeploymentsInput', () => {
    it('defaults limit to 10 when absent', () => {
      const result = searchDeploymentsInput.parse({ query: 'plex' });
      expect(result.limit).toBe(10);
    });

    it('passes through a valid in-range limit', () => {
      const result = searchDeploymentsInput.parse({ query: 'plex', limit: 50 });
      expect(result.limit).toBe(50);
    });

    it('falls back to the default for a negative limit', () => {
      const result = searchDeploymentsInput.parse({ query: 'plex', limit: -5 });
      expect(result.limit).toBe(10);
    });

    it('falls back to the default for a limit above the max', () => {
      const result = searchDeploymentsInput.parse({ query: 'plex', limit: 2000 });
      expect(result.limit).toBe(10);
    });

    it('falls back to the default for a non-numeric limit', () => {
      const result = searchDeploymentsInput.parse({ query: 'plex', limit: '10' });
      expect(result.limit).toBe(10);
    });

    it('throws a ZodError when query is missing', () => {
      expect(() => searchDeploymentsInput.parse({})).toThrow(ZodError);
    });

    it('throws a ZodError when query is an empty string', () => {
      expect(() => searchDeploymentsInput.parse({ query: '' })).toThrow(ZodError);
    });
  });
});

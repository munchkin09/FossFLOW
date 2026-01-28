/**
 * Tests for FormatConverter
 */

import {
  detectFormat,
  toFull,
  toCompact,
  normalize,
  validate,
  validateCompact,
  validateFull
} from '../src/utils/formatConverter';
import { CompactDiagram, Model } from '../src/types';

describe('FormatConverter', () => {
  // Sample diagrams
  const validCompact: CompactDiagram = {
    t: 'Test Diagram',
    i: [
      ['Frontend', 'web', 'React app'],
      ['Backend', 'api', 'Node.js server'],
      ['Database', 'storage', 'PostgreSQL']
    ],
    v: [
      [
        [[0, -6, 0], [1, 0, 0], [2, 6, 0]],
        [[0, 1], [1, 2]]
      ]
    ],
    _: { f: 'compact', v: '1.0' }
  };

  const validFull: Model = {
    title: 'Test Diagram',
    version: '1.0',
    items: [
      { id: 'item-0', name: 'Frontend', icon: 'web', description: 'React app' },
      { id: 'item-1', name: 'Backend', icon: 'api', description: 'Node.js server' },
      { id: 'item-2', name: 'Database', icon: 'storage', description: 'PostgreSQL' }
    ],
    views: [
      {
        id: 'view-0',
        name: 'Main View',
        items: [
          { id: 'item-0', tile: { x: -6, y: 0 }, labelHeight: 80 },
          { id: 'item-1', tile: { x: 0, y: 0 }, labelHeight: 80 },
          { id: 'item-2', tile: { x: 6, y: 0 }, labelHeight: 80 }
        ],
        connectors: [],
        rectangles: [],
        textBoxes: []
      }
    ],
    icons: [],
    colors: [{ id: '__DEFAULT__', value: '#6366f1' }]
  };

  describe('detectFormat', () => {
    it('should detect compact format', () => {
      expect(detectFormat(validCompact)).toBe('compact');
    });

    it('should detect full format', () => {
      expect(detectFormat(validFull)).toBe('full');
    });

    it('should return unknown for invalid input', () => {
      expect(detectFormat(null)).toBe('unknown');
      expect(detectFormat(undefined)).toBe('unknown');
      expect(detectFormat({})).toBe('unknown');
      expect(detectFormat({ foo: 'bar' })).toBe('unknown');
    });

    it('should detect compact format by metadata marker', () => {
      const withMarker = {
        t: 'Test',
        i: [],
        v: [],
        _: { f: 'compact', v: '1.0' }
      };
      expect(detectFormat(withMarker)).toBe('compact');
    });
  });

  describe('toFull', () => {
    it('should convert compact to full format', () => {
      const full = toFull(validCompact);

      expect(full.title).toBe('Test Diagram');
      expect(full.items).toHaveLength(3);
      expect(full.views).toHaveLength(1);
      expect(full.items[0].name).toBe('Frontend');
      expect(full.items[0].icon).toBe('web');
    });

    it('should create view items with correct positions', () => {
      const full = toFull(validCompact);
      const view = full.views[0];

      expect(view.items[0].tile).toEqual({ x: -6, y: 0 });
      expect(view.items[1].tile).toEqual({ x: 0, y: 0 });
      expect(view.items[2].tile).toEqual({ x: 6, y: 0 });
    });

    it('should create connectors from connections', () => {
      const full = toFull(validCompact);
      const connectors = full.views[0].connectors || [];

      expect(connectors).toHaveLength(2);
      expect(connectors[0].anchors[0].ref.item).toBe('item-0');
      expect(connectors[0].anchors[1].ref.item).toBe('item-1');
    });

    it('should handle empty diagrams', () => {
      const empty: CompactDiagram = {
        t: 'Empty',
        i: [],
        v: [[[], []]],
        _: { f: 'compact', v: '1.0' }
      };

      const full = toFull(empty);
      expect(full.title).toBe('Empty');
      expect(full.items).toHaveLength(0);
    });
  });

  describe('toCompact', () => {
    it('should convert full to compact format', () => {
      const compact = toCompact(validFull);

      expect(compact.t).toBe('Test Diagram');
      expect(compact.i).toHaveLength(3);
      expect(compact.v).toHaveLength(1);
      expect(compact._).toEqual({ f: 'compact', v: '1.0' });
    });

    it('should preserve item data', () => {
      const compact = toCompact(validFull);

      expect(compact.i[0]).toEqual(['Frontend', 'web', 'React app']);
      expect(compact.i[1]).toEqual(['Backend', 'api', 'Node.js server']);
    });

    it('should create positions array', () => {
      const compact = toCompact(validFull);
      const positions = compact.v[0][0];

      expect(positions).toContainEqual([0, -6, 0]);
      expect(positions).toContainEqual([1, 0, 0]);
      expect(positions).toContainEqual([2, 6, 0]);
    });

    it('should truncate long strings', () => {
      const longName: Model = {
        ...validFull,
        title: 'A'.repeat(100),
        items: [
          { id: 'item-0', name: 'B'.repeat(100), description: 'C'.repeat(500) }
        ]
      };

      const compact = toCompact(longName);

      expect(compact.t.length).toBeLessThanOrEqual(40);
      expect(compact.i[0][0].length).toBeLessThanOrEqual(30);
      expect(compact.i[0][2].length).toBeLessThanOrEqual(100);
    });
  });

  describe('normalize', () => {
    it('should return full format from compact', () => {
      const result = normalize(validCompact);
      expect(result.title).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.views).toBeDefined();
    });

    it('should return full format unchanged', () => {
      const result = normalize(validFull);
      expect(result).toEqual(validFull);
    });
  });

  describe('validateCompact', () => {
    it('should validate correct compact format', () => {
      const result = validateCompact(validCompact);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing title', () => {
      const invalid = { ...validCompact, t: undefined } as unknown;
      const result = validateCompact(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid title (t)');
    });

    it('should reject title exceeding max length', () => {
      const invalid = { ...validCompact, t: 'A'.repeat(50) };
      const result = validateCompact(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('40 characters'))).toBe(true);
    });

    it('should reject invalid items array', () => {
      const invalid = { ...validCompact, i: 'not an array' } as unknown;
      const result = validateCompact(invalid);
      expect(result.valid).toBe(false);
    });

    it('should reject items with wrong structure', () => {
      const invalid = {
        ...validCompact,
        i: [['Name', 'icon']] // Missing description
      };
      const result = validateCompact(invalid);
      expect(result.valid).toBe(false);
    });

    it('should reject missing metadata', () => {
      const invalid = { ...validCompact, _: undefined } as unknown;
      const result = validateCompact(invalid);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateFull', () => {
    it('should validate correct full format', () => {
      const result = validateFull(validFull);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing required fields', () => {
      const invalid = { title: 'Test' } as unknown;
      const result = validateFull(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validate', () => {
    it('should detect format and validate compact', () => {
      const result = validate(validCompact);
      expect(result.valid).toBe(true);
      expect(result.format).toBe('compact');
    });

    it('should detect format and validate full', () => {
      const result = validate(validFull);
      expect(result.valid).toBe(true);
      expect(result.format).toBe('full');
    });

    it('should return unknown for unrecognized format', () => {
      const result = validate({ random: 'data' });
      expect(result.valid).toBe(false);
      expect(result.format).toBe('unknown');
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve data through compact -> full -> compact', () => {
      const full = toFull(validCompact);
      const compact = toCompact(full);

      expect(compact.t).toBe(validCompact.t);
      expect(compact.i.length).toBe(validCompact.i.length);
      expect(compact._.f).toBe('compact');
    });
  });
});

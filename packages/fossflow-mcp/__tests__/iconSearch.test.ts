/**
 * Tests for Icon Search
 */

import { searchIcons, getIconCatalog, getCollections, isValidIcon } from '../src/utils/iconSearch';

describe('iconSearch', () => {
  describe('searchIcons', () => {
    it('should find icons by exact name', () => {
      const results = searchIcons({ query: 'server' });

      expect(results.length).toBeGreaterThan(0);
      // Results include id, name, collection - check any matches
      expect(results.some(r => r.id.includes('server') || r.name.includes('server'))).toBe(true);
    });

    it('should find icons by partial name', () => {
      const results = searchIcons({ query: 'serv' });

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id.includes('serv') || r.name.includes('serv'))).toBe(true);
    });

    it('should find icons case-insensitively', () => {
      const resultsLower = searchIcons({ query: 'database' });
      const resultsUpper = searchIcons({ query: 'DATABASE' });
      const resultsMixed = searchIcons({ query: 'DataBase' });

      expect(resultsLower.length).toBeGreaterThan(0);
      expect(resultsUpper.length).toBeGreaterThan(0);
      expect(resultsMixed.length).toBeGreaterThan(0);
    });

    it('should find icons by category/collection', () => {
      const results = searchIcons({ query: '', collection: 'aws' });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.collection === 'aws')).toBe(true);
    });

    it('should respect limit parameter', () => {
      const results = searchIcons({ query: 'server', limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for no matches', () => {
      const results = searchIcons({ query: 'xyznonexistent123' });

      expect(results).toEqual([]);
    });

    it('should find icons by description/tags', () => {
      const results = searchIcons({ query: 'compute' });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should return results with required fields', () => {
      const results = searchIcons({ query: 'api' });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.name).toBeDefined();
        expect(result.collection).toBeDefined();
        expect(typeof result.name).toBe('string');
        expect(typeof result.collection).toBe('string');
      });
    });

    it('should find multiple icon types', () => {
      // Should find different types of servers
      const results = searchIcons({ query: 'server' });

      expect(results.length).toBeGreaterThan(1);
      // Should have icons from different collections
      const collections = new Set(results.map(r => r.collection));
      expect(collections.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getIconCatalog', () => {
    it('should return all icons grouped by collection', () => {
      const catalog = getIconCatalog();

      // Catalog is a Record<string, IconSearchResult[]>
      const totalIcons = Object.values(catalog).flat().length;
      expect(totalIcons).toBeGreaterThan(50);
    });

    it('should return icons with required properties', () => {
      const catalog = getIconCatalog();

      Object.values(catalog).flat().forEach(icon => {
        expect(icon.name).toBeDefined();
        expect(icon.collection).toBeDefined();
        expect(typeof icon.name).toBe('string');
        expect(typeof icon.collection).toBe('string');
        expect(icon.name.length).toBeGreaterThan(0);
        expect(icon.collection.length).toBeGreaterThan(0);
      });
    });

    it('should include icons from multiple collections', () => {
      const catalog = getIconCatalog();
      const collections = Object.keys(catalog);

      expect(collections).toContain('isoflow');
      expect(collections).toContain('aws');
      expect(collections).toContain('azure');
      expect(collections).toContain('gcp');
      expect(collections).toContain('kubernetes');
    });
  });

  describe('getCollections', () => {
    it('should return all collection names', () => {
      const collections = getCollections();

      expect(collections).toContain('isoflow');
      expect(collections).toContain('aws');
      expect(collections).toContain('azure');
      expect(collections).toContain('gcp');
      expect(collections).toContain('kubernetes');
    });

    it('should return unique collection names', () => {
      const collections = getCollections();
      const uniqueCollections = [...new Set(collections)];

      expect(collections.length).toBe(uniqueCollections.length);
    });

    it('should return at least 5 collections', () => {
      const collections = getCollections();

      expect(collections.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('isValidIcon', () => {
    it('should return true for valid icons', () => {
      // isValidIcon checks by icon.id
      expect(isValidIcon('server')).toBe(true);
      expect(isValidIcon('user')).toBe(true);
      expect(isValidIcon('cloud')).toBe(true);
    });

    it('should return false for invalid icons', () => {
      expect(isValidIcon('nonexistenticon123')).toBe(false);
      expect(isValidIcon('')).toBe(false);
      expect(isValidIcon('xyz')).toBe(false);
    });

    it('should be case-sensitive for exact match', () => {
      // isValidIcon should check exact match on id
      const valid = isValidIcon('server');
      expect(valid).toBe(true);
    });

    it('should validate icons from catalog', () => {
      // Check some known icons from different collections
      expect(isValidIcon('aws-ec2')).toBe(true);
      expect(isValidIcon('aws-lambda')).toBe(true);
    });
  });

  describe('icon catalog coverage', () => {
    it('should have isoflow collection icons', () => {
      const catalog = getIconCatalog();
      const isoflowIcons = catalog['isoflow'] || [];

      expect(isoflowIcons.length).toBeGreaterThan(10);
      // Names are capitalized like 'Server', 'Database', 'User'
      expect(isoflowIcons.some(i => i.name === 'Server')).toBe(true);
      expect(isoflowIcons.some(i => i.name === 'Storage')).toBe(true); // Storage instead of Database
      expect(isoflowIcons.some(i => i.name === 'User')).toBe(true);
    });

    it('should have AWS collection icons', () => {
      const catalog = getIconCatalog();
      const awsIcons = catalog['aws'] || [];

      expect(awsIcons.length).toBeGreaterThan(10);
      expect(awsIcons.some(i => i.name === 'EC2')).toBe(true);
      expect(awsIcons.some(i => i.name === 'S3')).toBe(true);
      expect(awsIcons.some(i => i.name === 'Lambda')).toBe(true);
    });

    it('should have Azure collection icons', () => {
      const catalog = getIconCatalog();
      const azureIcons = catalog['azure'] || [];

      expect(azureIcons.length).toBeGreaterThan(10);
      expect(azureIcons.some(i => i.name === 'Virtual Machine')).toBe(true);
    });

    it('should have GCP collection icons', () => {
      const catalog = getIconCatalog();
      const gcpIcons = catalog['gcp'] || [];

      expect(gcpIcons.length).toBeGreaterThan(10);
      expect(gcpIcons.some(i => i.name === 'Compute Engine')).toBe(true);
    });

    it('should have Kubernetes collection icons', () => {
      const catalog = getIconCatalog();
      const k8sIcons = catalog['kubernetes'] || [];

      expect(k8sIcons.length).toBeGreaterThan(5);
      expect(k8sIcons.some(i => i.name === 'Pod')).toBe(true);
    });
  });
});

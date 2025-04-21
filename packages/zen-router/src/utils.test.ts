import { describe, expect, it, vi } from 'vitest';
import type { Search } from './index'; // Import Search type if needed for clarity
import { getPathFromUrl, parseQuery } from './utils';

describe('utils', () => {
  describe('parseQuery', () => {
    it('should return empty object for empty or query string starting only with ?', () => {
      expect(parseQuery('')).toEqual({});
      expect(parseQuery('?')).toEqual({});
    });

    it('should parse single key-value pair', () => {
      expect(parseQuery('?id=1')).toEqual({ id: '1' });
      expect(parseQuery('id=1')).toEqual({ id: '1' }); // Without leading '?'
    });

    it('should parse multiple key-value pairs', () => {
      expect(parseQuery('?id=1&name=test&flag=true')).toEqual({
        id: '1',
        name: 'test',
        flag: 'true',
      });
    });

    it('should handle keys without values', () => {
      expect(parseQuery('?id=1&name&flag=true')).toEqual({ id: '1', name: '', flag: 'true' });
      expect(parseQuery('?name')).toEqual({ name: '' });
    });

    it('should handle encoded characters', () => {
      expect(parseQuery('?name=test%20user&data=%7B%22a%22%3A1%7D')).toEqual({
        name: 'test user',
        data: '{"a":1}',
      });
    });

    it('should handle multiple values for the same key (takes last)', () => {
      // Based on the implementation provided (simple assignment)
      expect(parseQuery('?id=1&id=2&name=test')).toEqual({ id: '2', name: 'test' });
    });

    it('should handle query strings from partial paths', () => {
      // The function only expects the query string part
      expect(parseQuery('id=1&name=test')).toEqual({ id: '1', name: 'test' });
    });

    it('should handle empty values', () => {
      expect(parseQuery('?id=&name=test')).toEqual({ id: '', name: 'test' });
      expect(parseQuery('?id=1&name=')).toEqual({ id: '1', name: '' });
    });

    it('should ignore pairs with empty keys', () => {
      expect(parseQuery('?=1&name=test')).toEqual({ name: 'test' });
      expect(parseQuery('id=1&=test')).toEqual({ id: '1' });
      expect(parseQuery('&=test')).toEqual({});
    });
  });

  describe('getPathFromUrl', () => {
    it('should return path, search, and hash from a full URL', () => {
      expect(getPathFromUrl('http://example.com/users/1?query=test#hash')).toBe(
        '/users/1?query=test#hash',
      );
      expect(getPathFromUrl('https://domain.net/')).toBe('/');
      expect(getPathFromUrl('http://localhost:3000/page?a=b')).toBe('/page?a=b');
    });

    it('should return the input if it is already an absolute path', () => {
      expect(getPathFromUrl('/users/1')).toBe('/users/1');
      expect(getPathFromUrl('/users/1?query=test')).toBe('/users/1?query=test');
      expect(getPathFromUrl('/users/1#hash')).toBe('/users/1#hash');
      expect(getPathFromUrl('/users/1?query=test#hash')).toBe('/users/1?query=test#hash');
      expect(getPathFromUrl('/')).toBe('/');
      expect(getPathFromUrl('/?a=b#c')).toBe('/?a=b#c');
    });

    it('should return empty string for empty string input', () => {
      expect(getPathFromUrl('')).toBe('');
    });

    it('should return relative paths as is and warn (mock console.warn)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(getPathFromUrl('users/1')).toBe('users/1');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[zen-router] Invalid URL or path provided'),
      );
      expect(getPathFromUrl('page?a=b')).toBe('page?a=b');
      expect(warnSpy).toHaveBeenCalledTimes(2);
      warnSpy.mockRestore();
    });

    it('should handle URLs without path', () => {
      expect(getPathFromUrl('http://example.com')).toBe('/');
      expect(getPathFromUrl('http://example.com?query=test')).toBe('/?query=test');
      expect(getPathFromUrl('http://example.com#hash')).toBe('/#hash');
      expect(getPathFromUrl('http://example.com/?query=test#hash')).toBe('/?query=test#hash');
    });
  });
});

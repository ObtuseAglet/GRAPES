import { describe, expect, it } from 'vitest';
import { extractBaseDomain, extractDomainFromUrl } from './domain';

describe('extractBaseDomain', () => {
  it('returns localhost as-is', () => {
    expect(extractBaseDomain('localhost')).toBe('localhost');
  });

  it('returns IP addresses as-is', () => {
    expect(extractBaseDomain('192.168.1.1')).toBe('192.168.1.1');
    expect(extractBaseDomain('10.0.0.1')).toBe('10.0.0.1');
  });

  it('returns two-part domains as-is', () => {
    expect(extractBaseDomain('example.com')).toBe('example.com');
    expect(extractBaseDomain('google.com')).toBe('google.com');
  });

  it('strips subdomain from www.example.com', () => {
    expect(extractBaseDomain('www.example.com')).toBe('example.com');
  });

  it('strips deep subdomains', () => {
    expect(extractBaseDomain('a.b.c.example.com')).toBe('example.com');
  });

  it('handles second-level TLDs like co.uk', () => {
    expect(extractBaseDomain('www.example.co.uk')).toBe('example.co.uk');
    expect(extractBaseDomain('shop.amazon.co.uk')).toBe('amazon.co.uk');
  });

  it('handles com.br domains', () => {
    expect(extractBaseDomain('www.example.com.br')).toBe('example.com.br');
  });
});

describe('extractDomainFromUrl', () => {
  it('extracts domain from a full URL', () => {
    expect(extractDomainFromUrl('https://www.example.com/path?q=1')).toBe('example.com');
  });

  it('returns empty string for invalid URL', () => {
    expect(extractDomainFromUrl('not-a-url')).toBe('');
  });
});

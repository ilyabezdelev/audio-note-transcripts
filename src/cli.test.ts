import { describe, it, expect } from 'vitest';
import { homedir } from 'os';
import { expandTilde } from './cli.js';

describe('expandTilde', () => {
  it('expands ~ to home directory', () => {
    expect(expandTilde('~/Documents/audio.m4a')).toBe(`${homedir()}/Documents/audio.m4a`);
  });

  it('expands bare ~', () => {
    expect(expandTilde('~')).toBe(homedir());
  });

  it('leaves absolute paths unchanged', () => {
    expect(expandTilde('/usr/local/bin/test')).toBe('/usr/local/bin/test');
  });

  it('leaves relative paths unchanged', () => {
    expect(expandTilde('relative/path/file.m4a')).toBe('relative/path/file.m4a');
  });

  it('does not expand ~ in the middle of a path', () => {
    expect(expandTilde('/some/~/path')).toBe('/some/~/path');
  });
});

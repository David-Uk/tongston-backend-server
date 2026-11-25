import { describe, expect, it } from 'vitest';
import { buildPrompt, PROMPT_VERSION } from './prompt.js';

describe('prompt builder', () => {
  it('records the version and applies tone/length instructions', () => {
    const prompt = buildPrompt({
      title: 'A title',
      body: 'A body',
      tone: 'formal',
      length: 'long',
    });

    expect(prompt).toContain(PROMPT_VERSION);
    expect(prompt).toContain('Tone: formal');
    expect(prompt).toContain('up to 10 sentences');
    expect(prompt).toContain('Title: A title');
    expect(prompt).toContain('Content: A body');
  });
});

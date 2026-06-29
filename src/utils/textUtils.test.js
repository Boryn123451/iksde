import { describe, expect, it } from 'vitest';
import { shortenText, stripMarkup } from './textUtils.js';

describe('text helpers', () => {
  it('does not treat common Polish abbreviations as full sentence endings', () => {
    const text = 'Hotel Wiedeński, pierwotnie Hotel Warszawsko-Wiedeński, mieścił się w Warszawie przy ul. Marszałkowskiej 99 i działał do 1944 roku.';
    const result = shortenText(text, 105);

    expect(result).toContain('Marszałkowskiej');
    expect(result).not.toBe('Hotel Wiedeński, pierwotnie Hotel Warszawsko-Wiedeński, mieścił się w Warszawie przy ul.');
  });

  it('keeps complete short sentences when possible', () => {
    const text = 'Fotoplastikon Warszawski jest oddziałem Muzeum Powstania Warszawskiego. Znajduje się w centrum miasta.';

    expect(shortenText(text, 88)).toBe('Fotoplastikon Warszawski jest oddziałem Muzeum Powstania Warszawskiego.');
  });

  it('strips wiki and HTML markup before rendering source text', () => {
    expect(stripMarkup("[[Warsaw|Warszawa]] <b>centrum</b> ''miasta''")).toBe('Warszawa centrum miasta');
  });
});

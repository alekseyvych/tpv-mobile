const en = require('../../src/i18n/locales/en.json');
const es = require('../../src/i18n/locales/es.json');

type LocaleTree = Record<string, unknown>;

function flattenLocale(tree: LocaleTree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      acc[nextKey] = value;
      return acc;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flattenLocale(value as LocaleTree, nextKey));
    }

    return acc;
  }, {});
}

function extractPlaceholders(message: string): string[] {
  return Array.from(message.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g), (match) => match[1]).sort();
}

describe('locale parity', () => {
  const flatEn = flattenLocale(en);
  const flatEs = flattenLocale(es);

  it('keeps English and Spanish locale keys aligned', () => {
    expect(Object.keys(flatEn).sort()).toEqual(Object.keys(flatEs).sort());
  });

  it('keeps interpolation placeholders aligned between locales', () => {
    for (const key of Object.keys(flatEn)) {
      if (!(key in flatEs)) {
        continue;
      }
      expect(extractPlaceholders(flatEn[key])).toEqual(extractPlaceholders(flatEs[key]));
    }
  });
});

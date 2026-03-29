import { jest } from '@jest/globals'

// Mock helpers to avoid side effects
jest.mock('../helpers', () => ({
  FrequentlyUsed: { get: jest.fn().mockReturnValue([]) },
  NativeSupport: { latestVersion: jest.fn(), noCountryFlags: jest.fn() },
  SafeFlags: ['checkered_flag'],
  SearchIndex: { reset: jest.fn() },
  Store: { get: jest.fn(), set: jest.fn() },
}))

// Mock the i18n import
jest.mock(
  '@emoji-mart/data/i18n/en.json',
  () => ({
    categories: { custom: 'Custom' },
    search: 'Search',
  }),
  { virtual: true },
)

function createTestData() {
  return {
    categories: [
      { id: 'people', emojis: ['grinning', 'smiley'] },
      { id: 'nature', emojis: ['dog'] },
    ],
    emojis: {
      grinning: {
        id: 'grinning',
        name: 'Grinning Face',
        emoticons: [':D'],
        keywords: ['smile', 'happy'],
        skins: [{ unified: '1f600', native: '😀' }],
        version: 1,
      },
      smiley: {
        id: 'smiley',
        name: 'Smiley Face',
        keywords: ['happy'],
        skins: [{ unified: '1f603', native: '😃' }],
        version: 1,
      },
      dog: {
        id: 'dog',
        name: 'Dog Face',
        keywords: ['pet'],
        skins: [{ unified: '1f436', native: '🐶' }],
        version: 1,
      },
    },
    aliases: { satisfied: 'grinning' },
    sheet: { cols: 61, rows: 61 },
  }
}

let config

beforeEach(() => {
  jest.resetModules()
  config = require('../config')
})

// ─── init() ───────────────────────────────────────────────────────────────────

describe('init()', () => {
  test('sets Data when called with data option', async () => {
    const data = createTestData()
    await config.init({ data })
    expect(config.Data).not.toBeNull()
    expect(config.Data.emojis.grinning).toBeDefined()
  })

  test('creates emoticons map on Data', async () => {
    const data = createTestData()
    await config.init({ data })
    expect(config.Data.emoticons).toBeDefined()
    expect(config.Data.emoticons[':D']).toBe('grinning')
  })

  test('creates natives map on Data', async () => {
    const data = createTestData()
    await config.init({ data })
    expect(config.Data.natives).toBeDefined()
    expect(config.Data.natives['😀']).toBe('grinning')
    expect(config.Data.natives['😃']).toBe('smiley')
  })

  test('adds frequent category at front of categories (removed when empty)', async () => {
    const data = createTestData()
    await config.init({ data })
    // FrequentlyUsed.get returns [] so 'frequent' gets populated with [] and then
    // the category is encountered empty on the next pass — actually, frequent is
    // set via FrequentlyUsed.get, which returns [], so it's empty when the splice
    // check runs, meaning it gets removed from the final categories list.
    const ids = config.Data.categories.map((c) => c.id)
    expect(ids).not.toContain('frequent')
    // The originalCategories array includes 'frequent' as the first entry
    // (same reference as categories until categories gets reassigned)
    // people and nature should still be present
    expect(ids).toContain('people')
  })

  test('processes aliases into emoji.aliases arrays', async () => {
    const data = createTestData()
    await config.init({ data })
    expect(config.Data.emojis.grinning.aliases).toContain('satisfied')
  })

  test('builds emoji.search strings', async () => {
    const data = createTestData()
    await config.init({ data })
    expect(config.Data.emojis.grinning.search).toMatch(/grinning/)
    expect(config.Data.emojis.grinning.search).toMatch(/smile/)
    // emoticons are lowercased when stored in search string
    expect(config.Data.emojis.grinning.search).toMatch(/:d/)
  })

  test('builds search string including native emoji character', async () => {
    const data = createTestData()
    await config.init({ data })
    expect(config.Data.emojis.grinning.search).toContain('😀')
  })

  test('sets shortcodes on skin objects', async () => {
    const data = createTestData()
    await config.init({ data })
    expect(config.Data.emojis.grinning.skins[0].shortcodes).toBe(':grinning:')
  })

  test('sets I18n after init', async () => {
    const data = createTestData()
    await config.init({ data })
    expect(config.I18n).not.toBeNull()
    expect(config.I18n.search).toBe('Search')
  })

  test('accepts data as async function', async () => {
    const data = createTestData()
    const dataFn = jest.fn().mockResolvedValue(data)
    await config.init({ data: dataFn })
    expect(dataFn).toHaveBeenCalledTimes(1)
    expect(config.Data).not.toBeNull()
    expect(config.Data.emojis.grinning).toBeDefined()
  })

  test('resolves returned promise after init', async () => {
    const data = createTestData()
    const promise = config.init({ data })
    await expect(promise).resolves.toBeUndefined()
  })

  test('handles custom emoji categories', async () => {
    const data = createTestData()
    const customEmoji = {
      id: 'party_blob',
      name: 'Party Blob',
      keywords: ['party'],
      skins: [{ src: 'https://example.com/party.gif' }],
    }
    await config.init({
      data,
      custom: [
        {
          id: 'custom_party',
          name: 'Party',
          emojis: [customEmoji],
        },
      ],
    })
    const customCategory = config.Data.categories.find(
      (c) => c.id === 'custom_party',
    )
    expect(customCategory).toBeDefined()
    expect(config.Data.emojis.party_blob).toBeDefined()
  })

  test('assigns default custom category id when not provided', async () => {
    const data = createTestData()
    const customEmoji = {
      id: 'my_custom',
      name: 'My Custom',
      keywords: [],
      skins: [{ src: 'https://example.com/custom.gif' }],
    }
    await config.init({
      data,
      custom: [{ emojis: [customEmoji] }],
    })
    const customCategory = config.Data.categories.find((c) =>
      c.id?.startsWith('custom_'),
    )
    expect(customCategory).toBeDefined()
    expect(customCategory.id).toBe('custom_1')
  })

  test('filters categories when options.categories is provided', async () => {
    const data = createTestData()
    await config.init({ data, categories: ['nature'] })
    const ids = config.Data.categories.map((c) => c.id)
    expect(ids).toContain('nature')
    expect(ids).not.toContain('people')
  })

  test('sorts categories according to options.categories order', async () => {
    const data = createTestData()
    await config.init({ data, categories: ['nature', 'people'] })
    const ids = config.Data.categories.map((c) => c.id)
    expect(ids.indexOf('nature')).toBeLessThan(ids.indexOf('people'))
  })

  test('excludes emojis via exceptEmojis', async () => {
    const data = createTestData()
    await config.init({ data, exceptEmojis: ['grinning'] })
    const peopleCategory = config.Data.categories.find(
      (c) => c.id === 'people',
    )
    expect(peopleCategory.emojis).not.toContain('grinning')
    expect(peopleCategory.emojis).toContain('smiley')
  })

  test('removes empty categories after filtering', async () => {
    const data = createTestData()
    // Exclude all emojis in 'nature' category
    await config.init({ data, exceptEmojis: ['dog'] })
    const natureCategory = config.Data.categories.find(
      (c) => c.id === 'nature',
    )
    expect(natureCategory).toBeUndefined()
  })

  test('uses custom i18n when provided', async () => {
    const data = createTestData()
    const customI18n = { search: 'Suche', categories: { custom: 'Benutzerdefiniert' } }
    await config.init({ data, i18n: customI18n })
    expect(config.I18n.search).toBe('Suche')
  })

  test('accepts i18n as async function', async () => {
    const data = createTestData()
    const customI18n = { search: 'Chercher', categories: { custom: 'Personnalisé' } }
    const i18nFn = jest.fn().mockResolvedValue(customI18n)
    await config.init({ data, i18n: i18nFn })
    expect(i18nFn).toHaveBeenCalledTimes(1)
    expect(config.I18n.search).toBe('Chercher')
  })

  test('skips custom category if it has no emojis', async () => {
    const data = createTestData()
    const categoriesBefore = data.categories.length
    await config.init({
      data,
      custom: [{ id: 'empty_custom', name: 'Empty', emojis: [] }],
    })
    // The empty custom category should not appear
    const customCategory = config.Data.categories.find(
      (c) => c.id === 'empty_custom',
    )
    expect(customCategory).toBeUndefined()
  })
})

// ─── getProps() ───────────────────────────────────────────────────────────────

describe('getProps()', () => {
  const defaultProps = {
    theme: { value: 'light' },
    size: { value: 24 },
    open: { value: true },
  }

  test('returns defaults when no props given', () => {
    const result = config.getProps({}, defaultProps, null)
    expect(result.theme).toBe('light')
    expect(result.size).toBe(24)
    expect(result.open).toBe(true)
  })

  test('overrides defaults with provided props', () => {
    const result = config.getProps({ theme: 'dark', size: 32 }, defaultProps, null)
    expect(result.theme).toBe('dark')
    expect(result.size).toBe(32)
    expect(result.open).toBe(true)
  })

  test('returns all keys from defaultProps', () => {
    const result = config.getProps({}, defaultProps, null)
    expect(Object.keys(result).sort()).toEqual(['open', 'size', 'theme'])
  })

  test('reads props from element attributes', () => {
    const element = { getAttribute: (name) => (name === 'theme' ? 'contrast' : null) }
    const result = config.getProps({}, defaultProps, element)
    expect(result.theme).toBe('contrast')
  })
})

// ─── getProp() ────────────────────────────────────────────────────────────────

describe('getProp()', () => {
  test('returns default value when prop is not provided', () => {
    const defaults = { count: { value: 5 } }
    const result = config.getProp('count', {}, defaults, null)
    expect(result).toBe(5)
  })

  test('returns provided value when present', () => {
    const defaults = { count: { value: 5 } }
    const result = config.getProp('count', { count: 10 }, defaults, null)
    expect(result).toBe(10)
  })

  test('coerces string "false" to boolean false when default is boolean', () => {
    const defaults = { open: { value: true } }
    const result = config.getProp('open', { open: 'false' }, defaults, null)
    expect(result).toBe(false)
  })

  test('coerces string "true" to boolean true when default is boolean', () => {
    const defaults = { open: { value: false } }
    const result = config.getProp('open', { open: 'true' }, defaults, null)
    expect(result).toBe(true)
  })

  test('coerces string number to number when default is number', () => {
    const defaults = { size: { value: 24 } }
    const result = config.getProp('size', { size: '32' }, defaults, null)
    expect(result).toBe(32)
  })

  test('falls back to default when value not in choices', () => {
    const defaults = { theme: { value: 'light', choices: ['light', 'dark'] } }
    const result = config.getProp('theme', { theme: 'purple' }, defaults, null)
    expect(result).toBe('light')
  })

  test('accepts value when it is in choices', () => {
    const defaults = { theme: { value: 'light', choices: ['light', 'dark'] } }
    const result = config.getProp('theme', { theme: 'dark' }, defaults, null)
    expect(result).toBe('dark')
  })

  test('applies transform function on provided value', () => {
    const defaults = {
      tags: {
        value: [],
        transform: (v) => v.split(',').map((s) => s.trim()),
      },
    }
    const result = config.getProp('tags', { tags: 'a, b, c' }, defaults, null)
    expect(result).toEqual(['a', 'b', 'c'])
  })

  test('reads value from element attribute', () => {
    const defaults = { theme: { value: 'light' } }
    const element = { getAttribute: (name) => (name === 'theme' ? 'dark' : null) }
    const result = config.getProp('theme', {}, defaults, element)
    expect(result).toBe('dark')
  })

  test('returns null value when no defaults provided', () => {
    const result = config.getProp('unknown', {}, {}, null)
    expect(result).toBeNull()
  })

  test('element attribute takes precedence over props', () => {
    const defaults = { theme: { value: 'light' } }
    const element = { getAttribute: (name) => (name === 'theme' ? 'contrast' : null) }
    const result = config.getProp('theme', { theme: 'dark' }, defaults, element)
    expect(result).toBe('contrast')
  })
})

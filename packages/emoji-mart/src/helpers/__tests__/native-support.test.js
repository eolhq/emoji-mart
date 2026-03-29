import NativeSupport from '../native-support'

describe('NativeSupport', () => {
  describe('latestVersion()', () => {
    test('returns undefined in jsdom environment (no canvas emoji support)', () => {
      expect(NativeSupport.latestVersion()).toBeUndefined()
    })

    test('returns the same value on repeated calls (cached)', () => {
      const first = NativeSupport.latestVersion()
      const second = NativeSupport.latestVersion()
      expect(first).toBe(second)
    })
  })

  describe('noCountryFlags()', () => {
    test('returns true in jsdom environment (country flag emoji not supported)', () => {
      expect(NativeSupport.noCountryFlags()).toBe(true)
    })

    test('returns the same value on repeated calls (cached)', () => {
      const first = NativeSupport.noCountryFlags()
      const second = NativeSupport.noCountryFlags()
      expect(first).toBe(second)
    })
  })

  describe('exported interface', () => {
    test('exports latestVersion function', () => {
      expect(typeof NativeSupport.latestVersion).toBe('function')
    })

    test('exports noCountryFlags function', () => {
      expect(typeof NativeSupport.noCountryFlags).toBe('function')
    })

    test('does not export isSupported or isEmojiSupported (private helpers)', () => {
      expect(NativeSupport.isSupported).toBeUndefined()
      expect(NativeSupport.isEmojiSupported).toBeUndefined()
    })
  })
})

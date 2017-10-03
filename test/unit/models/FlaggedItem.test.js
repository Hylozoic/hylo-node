import setup from '../../setup'

describe('FlaggedItem', () => {
  const item = {
    category: 'abusive',
    reason: 'Said wombats were not cute. Just mean.',
    link: 'https://www.hylo.com/c/wombats/p/12345'
  }

  describe('create', () => {
    it('rejects an unrecognised category', () => {
      const p = FlaggedItem.create(Object.assign({}, item, { category: 'flarglearglestein' }))
      return expect(p).to.be.rejectedWith(/Unknown category/)
    })

    // These are mostly re-testing the validators, but shouldn't hurt to be thorough...
    it('rejects a non-Hylo URL', () => {
      const p = FlaggedItem.create(Object.assign({}, item, { link: 'https://google.com' }))
      return expect(p).to.be.rejectedWith(/valid Hylo URL/)
    })

    it('accepts a Hylo subdomain', () => {
      const p = FlaggedItem.create(Object.assign({}, item, { link: 'https://legacy.hylo.com' }))
      return expect(p).not.to.be.rejected
    })

    it('rejects on a missing URL', () => {
      const p = FlaggedItem.create(Object.assign({}, item, { link: undefined }))
      return expect(p).to.be.rejectedWith(/Link must be a string/)
    })

    it('rejects on a missing reason', () => {
      const p = FlaggedItem.create(Object.assign({}, item, { category: 'other', reason: undefined }))
      return expect(p).to.be.rejectedWith(/Reason must be a string/)
    })

    it('rejects on a huge reason', () => {
      const reason = new Array(6000).join('z')
      const p = FlaggedItem.create(Object.assign({}, item, { reason }))
      return expect(p).to.be.rejectedWith(/Reason must be less than/)
    })
  })
})

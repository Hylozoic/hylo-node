require('../../setup')

describe('Community', () => {
  it('can be created', function () {
    var community = new Community({slug: 'foo', name: 'foo', beta_access_code: 'foo!'})
    return community.save().then(() => {
      expect(community.id).to.exist
    })
  })

  describe('.find', () => {
    it('ignores a blank id', () => {
      return Invitation.find(null).then(i => expect(i).to.be.null)
    })
  })
})

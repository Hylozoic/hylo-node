require('../../setup')
import factories from '../../setup/factories'

describe('LinkedAccount', () => {
  describe('updateUser', () => {
    var user

    before(() => {
      user = factories.user()
      return user.save()
    })

    it('fails gracefully if no attributes are found', () => {
      return LinkedAccount.updateUser(user.id, {})
    })
    
    it('can store an access token', function () {
      return LinkedAccount.create(user.id, {
        type: 'token',
        token: '1234'
      })
      .then(linkedAccount => {
        expect(linkedAccount).to.exist
        expect(linkedAccount.get('provider_key')).to.equal('token')
        expect(linkedAccount.get('provider_user_id')).to.equal('1234')
        expect(linkedAccount.get('user_id')).to.equal(user.id)
      })
    })
    
    it('can find an access token linked account from userId', function () {
      return LinkedAccount.create(user.id, {
        type: 'token',
        token: '1234'
      })
      .then(() => LinkedAccount.tokenForUser(user.id))
      .then(linkedAccount => {
        expect(linkedAccount).to.exist
        expect(linkedAccount.get('provider_key')).to.equal('token')
        expect(linkedAccount.get('provider_user_id')).to.equal('1234')
        expect(linkedAccount.get('user_id')).to.equal(user.id)
      })
    })
  })
})

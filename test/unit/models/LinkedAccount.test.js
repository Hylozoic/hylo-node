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
  })
})

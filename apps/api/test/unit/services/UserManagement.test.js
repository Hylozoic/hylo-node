require('../../setup')
import factories from '../../setup/factories'
import UserManagement from '../../../api/services/UserManagement'

describe('UserManagement', () => {
  var user

  beforeEach(() => {
    user = factories.user()
    return user.save()
    .then(() => Device.forge({user_id: user.id}).save())
  })

  describe.skip('removeUser', () => {
    it('works', () => {
      return UserManagement.removeUser(user.id)
      .then(() => User.find(user.id))
      .then(user => expect(user).not.to.exist)
    })
  })

  describe.skip('mergeUsers', () => {
    var user2, post

    beforeEach(() => {
      user2 = factories.user({bio: 'bio'})
      return user2.save()
      .then(() => {
        post = factories.post({user_id: user2.id})
        return post.save()
      })
    })

    it('works', () => {
      return UserManagement.mergeUsers(user.id, user2.id)
      .then(() => User.find(user2.id))
      .then(user => expect(user).not.to.exist)
      .then(() => User.find(user.id, {withRelated: 'posts'}))
      .then(u => {
        expect(u.get('name')).to.equal(user.get('name'))
        expect(u.get('bio')).to.equal(user2.get('bio'))

        const p = u.relations.posts.first()
        expect(p).to.exist
        expect(p.get('name')).to.equal(post.get('name'))
      })
    })
  })
})

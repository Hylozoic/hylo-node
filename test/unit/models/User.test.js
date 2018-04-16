/* eslint-disable no-unused-expressions */

import '../../setup'
import bcrypt from 'bcrypt'
import factories from '../../setup/factories'
import { wait } from '../../setup/helpers'
import { times } from 'lodash'

describe('User', function () {
  var cat

  before(function () {
    cat = new User({name: 'Cat', email: 'Iam@cat.org', active: true})
    return cat.save()
  })

  it('can be found', function () {
    return User.find('Cat').then(function (user) {
      expect(user).to.exist
      expect(user.get('name')).to.equal('Cat')
    })
  })

  it('can be found with case-insensitive email match', function () {
    return User.find('iAm@cAt.org').then(user => {
      expect(user).to.exist
      expect(user.get('name')).to.equal('Cat')
    })
  })

  it('can be found with ID', function () {
    return User.find(cat.id).then(user => {
      expect(user).to.exist
      expect(user.get('name')).to.equal('Cat')
    })
  })

  it('cannot be found if inactive', () => {
    const dog = new User({name: 'Dog', email: 'iam@dog.org'})
    let dogId
    return dog.save()
    .tap(dog => { dogId = dog.id })
    .then(() => User.find('Dog'))
    .then(dog => expect(dog).not.to.exist)
    .then(() => User.find('iam@dog.org'))
    .then(dog => expect(dog).not.to.exist)
    .then(() => User.find(dogId))
    .then(dog => expect(dog).not.to.exist)
  })

  it('can join communities', function () {
    var community1 = new Community({name: 'House', slug: 'house'})
    var community2 = new Community({name: 'Yard', slug: 'yard'})

    return Promise.join(
      community1.save(),
      community2.save()
    )
    .then(() => Promise.join(
      cat.joinCommunity(community1),
      cat.joinCommunity(community2)
    ))
    .then(() => cat.communities().fetch())
    .then(function (communities) {
      expect(communities).to.exist
      expect(communities.models).to.exist
      expect(communities.models).not.to.be.empty
      var names = communities.models.map(c => c.get('name')).sort()
      expect(names[0]).to.equal('House')
      expect(names[1]).to.equal('Yard')
    })
    .then(() => GroupMembership.forPair(cat, community1).fetch())
    .then(membership => {
      expect(membership).to.exist
      const settings = membership.get('settings')
      expect(settings.sendEmail).to.equal(true)
      expect(settings.sendPushNotifications).to.equal(true)
    })
  })

  it('can become moderator', function () {
    var street = new Community({name: 'Street', slug: 'street'})

    return street.save()
    .then(() => cat.joinCommunity(street, GroupMembership.Role.MODERATOR))
    .then(() => GroupMembership.forPair(cat, street).fetch())
    .then(membership => {
      expect(membership).to.exist
      expect(membership.get('role')).to.equal(1)
    })
  })

  describe('#setSanely', function () {
    it("doesn't assume that any particular field is set", function () {
      new User().setSanely({})
    })

    it('sanitizes twitter usernames', function () {
      var user = new User()

      user.setSanely({twitter_name: '@user'})
      expect(user.get('twitter_name')).to.equal('user')

      user.setSanely({twitter_name: ' '})
      expect(user.get('twitter_name')).to.be.null
    })

    it('adds protocol to url, facebook_url and linkedin_url', function () {
      var user = new User()

      user.setSanely({
        url: 'myawesomesite.com',
        facebook_url: 'www.facebook.com/user/123',
        linkedin_url: 'linkedin.com/user/123'
      })

      expect(user.get('url')).to.equal('https://myawesomesite.com')
      expect(user.get('facebook_url')).to.equal('https://www.facebook.com/user/123')
      expect(user.get('linkedin_url')).to.equal('https://linkedin.com/user/123')

      user.setSanely({linkedin_url: 'http://linkedin.com/user/123'})
      expect(user.get('linkedin_url')).to.equal('http://linkedin.com/user/123')
    })

    it('preserves existing settings keys', () => {
      var user = new User({
        settings: {
          a: 'eh',
          b: 'bee',
          c: {sea: true}
        }
      })

      user.setSanely({
        settings: {
          b: 'buh',
          c: {see: true}
        }
      })
      expect(user.get('settings')).to.deep.equal({
        a: 'eh',
        b: 'buh',
        c: {
          sea: true,
          see: true
        }
      })
    })
  })

  describe('#communitiesSharedWithPost', () => {
    var user, post, c1, c2, c3, c4
    before(() => {
      user = factories.user()
      post = factories.post()
      c1 = factories.community()
      c2 = factories.community()
      c3 = factories.community()
      c4 = factories.community()
      return Promise.join(
        user.save(), post.save(), c1.save(), c2.save(), c3.save(), c4.save())
      .then(() => post.communities().attach([c1, c2, c3]))
      .then(() => user.joinCommunity(c2))
      .then(() => user.joinCommunity(c3))
      .then(() => user.joinCommunity(c4))
    })

    it('returns the shared communities', () => {
      return user.communitiesSharedWithPost(post)
      .then(cs => {
        expect(cs.length).to.equal(2)
        expect(cs.map(c => c.id).sort()).to.deep.equal([c2.id, c3.id].sort())
      })
    })
  })

  describe('.authenticate', function () {
    before(function () {
      return new LinkedAccount({
        provider_user_id: '$2a$10$UPh85nJvMSrm6gMPqYIS.OPhLjAMbZiFnlpjq1xrtoSBTyV6fMdJS',
        provider_key: 'password',
        user_id: cat.id
      }).save()
    })

    it('accepts a valid password', function () {
      return expect(User.authenticate('iam@cat.org', 'password'))
      .to.eventually.satisfy(function (user) {
        return user && user.id === cat.id && user.name === cat.name
      })
    })

    it('rejects an invalid password', function () {
      return expect(User.authenticate('iam@cat.org', 'pawsword')).to.be.rejected
    })
  })

  describe('.create', function () {
    var catPic = 'http://i.imgur.com/Kwe1K7k.jpg'
    var community

    before(function () {
      community = new Community({name: 'foo', slug: 'foo'})
      return community.save()
    })

    it('rejects an invalid email address', () => {
      return User.create({
        email: 'foo@bar@com',
        community,
        account: {type: 'password', password: 'password'},
        name: 'foo bar'
      })
      .then(user => expect.fail())
      .catch(err => expect(err.message).to.equal('invalid-email'))
    })

    it('rejects a blank email address', () => {
      return User.create({
        email: null,
        community,
        account: {type: 'password', password: 'password'}
      })
      .then(user => expect.fail())
      .catch(err => expect(err.message).to.equal('invalid-email'))
    })

    it('works with a password', function () {
      return bookshelf.transaction(function (trx) {
        return User.create({
          email: 'foo@bar.com',
          community: community,
          account: {type: 'password', password: 'password!'},
          name: 'foo bar'
        }, {transacting: trx})
      })
      .then(function (user) {
        expect(user.id).to.exist
        expect(user.get('active')).to.be.true
        expect(user.get('name')).to.equal('foo bar')
        expect(user.get('avatar_url')).to.equal(User.gravatar('foo@bar.com'))
        expect(user.get('created_at').getTime()).to.be.closeTo(new Date().getTime(), 2000)
        expect(user.get('settings').digest_frequency).to.equal('daily')
        expect(user.get('settings').dm_notifications).to.equal('both')
        expect(user.get('settings').comment_notifications).to.equal('both')

        return Promise.join(
          LinkedAccount.where({user_id: user.id}).fetch().then(function (account) {
            expect(account).to.exist
            expect(account.get('provider_key')).to.equal('password')
            expect(bcrypt.compareSync('password!', account.get('provider_user_id'))).to.be.true
          }),
          GroupMembership.forPair(user, community).fetch()
          .then(membership => expect(membership).to.exist)
        )
      })
    })

    it('works with google', function () {
      return bookshelf.transaction(function (trx) {
        return User.create({
          email: 'foo2.moo2_wow@bar.com',
          community: community,
          account: {type: 'google', profile: {id: 'foo'}}
        }, {transacting: trx})
      })
      .then(function (user) {
        expect(user.id).to.exist
        expect(user.get('active')).to.be.true
        expect(user.get('name')).to.equal('foo2 moo2 wow')
        expect(user.get('settings').digest_frequency).to.equal('daily')

        return Promise.join(
          LinkedAccount.where({user_id: user.id}).fetch().then(function (account) {
            expect(account).to.exist
            expect(account.get('provider_key')).to.equal('google')
            expect(account.get('provider_user_id')).to.equal('foo')
          }),
          GroupMembership.forPair(user, community).fetch()
          .then(membership => expect(membership).to.exist)
        )
      })
    })

    it('works with facebook', function () {
      return bookshelf.transaction(function (trx) {
        return User.create({
          email: 'foo3@bar.com',
          community: community,
          account: {
            type: 'facebook',
            profile: {
              id: 'foo',
              profileUrl: 'http://www.facebook.com/foo'
            }
          }
        }, {transacting: trx})
      })
      .then(user => User.find(user.id))
      .then(user => {
        expect(user.id).to.exist
        expect(user.get('active')).to.be.true
        expect(user.get('facebook_url')).to.equal('http://www.facebook.com/foo')
        expect(user.get('avatar_url')).to.equal('https://graph.facebook.com/foo/picture?type=large')
        expect(user.get('settings').digest_frequency).to.equal('daily')

        return Promise.join(
          LinkedAccount.where({user_id: user.id}).fetch().then(function (account) {
            expect(account).to.exist
            expect(account.get('provider_key')).to.equal('facebook')
            expect(account.get('provider_user_id')).to.equal('foo')
          }),
          GroupMembership.forPair(user, community).fetch()
          .then(membership => expect(membership).to.exist)
        )
      })
    })

    it('works with linkedin', function () {
      return bookshelf.transaction(function (trx) {
        return User.create({
          email: 'foo4@bar.com',
          community: community,
          account: {
            type: 'linkedin',
            profile: {
              id: 'foo',
              photos: [{value: catPic}],
              _json: {
                publicProfileUrl: 'https://www.linkedin.com/in/foobar'
              }
            }
          }
        }, {transacting: trx})
      })
      .then(user => User.find(user.id))
      .then(user => {
        expect(user.id).to.exist
        expect(user.get('active')).to.be.true
        expect(user.get('linkedin_url')).to.equal('https://www.linkedin.com/in/foobar')
        expect(user.get('avatar_url')).to.equal(catPic)
        expect(user.get('settings').digest_frequency).to.equal('daily')

        return Promise.join(
          LinkedAccount.where({user_id: user.id}).fetch().then(function (account) {
            expect(account).to.exist
            expect(account.get('provider_key')).to.equal('linkedin')
            expect(account.get('provider_user_id')).to.equal('foo')
          }),
          GroupMembership.forPair(user, community).fetch()
          .then(membership => expect(membership).to.exist)
        )
      })
    })
  })

  describe('#followDefaultTags', function () {
    it('creates TagFollows for the default tags of a community', () => {
      var c1 = factories.community()
      return c1.save()
      .then(() => Tag.forge({name: 'hello'}).save())
      .then(tag => CommunityTag.create({tag_id: tag.id, community_id: c1.id, is_default: true}))
      .then(() => User.followDefaultTags(cat.id, c1.id))
      .then(() => cat.load('followedTags'))
      .then(() => {
        expect(cat.relations.followedTags.length).to.equal(1)
        var tagNames = cat.relations.followedTags.map(t => t.get('name'))
        expect(tagNames[0]).to.equal('hello')
      })
    })
  })

  describe('.unseenThreadCount', () => {
    var doge, post, post2

    before(async () => {
      doge = factories.user()
      ;[ post, post2 ] = times(2, () => factories.post({type: Post.Type.THREAD}))

      await doge.save()
      return Promise.map([post, post2], p =>
        p.save().then(() => p.addFollowers([cat.id, doge.id])))
    })

    it('works as expected', async function () {
      this.timeout(5000)

      const addMessages = (p, num = 1, creator = doge) =>
        wait(100)
        .then(() => Promise.all(times(num, () =>
          Comment.forge({
            post_id: p.id,
            user_id: creator.id,
            text: 'arf',
            active: true
          }).save())))
        .then(comments => Post.updateFromNewComment({
          postId: p.id,
          commentId: comments.slice(-1)[0].id
        }))

      const n = await User.unseenThreadCount(cat.id)
      expect(n).to.equal(0)

      // four messages but two threads
      await addMessages(post, 2)
      await addMessages(post2, 2)
      await User.unseenThreadCount(cat.id).then(n => expect(n).to.equal(2))
      await User.unseenThreadCount(doge.id).then(n => expect(n).to.equal(0))

      // mark one thread as read
      await post.markAsRead(cat.id)
      await User.unseenThreadCount(cat.id).then(n => expect(n).to.equal(1))

      // another new message
      await addMessages(post)
      await User.unseenThreadCount(cat.id).then(n => expect(n).to.equal(2))

      // dropdown was opened
      await cat.addSetting({last_viewed_messages_at: new Date()}, true)
      await User.unseenThreadCount(cat.id).then(n => expect(n).to.equal(0))

      // new message after dropdown was opened
      await addMessages(post2)
      await User.unseenThreadCount(cat.id).then(n => expect(n).to.equal(1))

      // cat responds
      await addMessages(post, 2, cat)
      await addMessages(post2, 2, cat)
      await User.unseenThreadCount(cat.id).then(n => expect(n).to.equal(0))
      await User.unseenThreadCount(doge.id).then(n => expect(n).to.equal(2))
    })
  })

  describe('.comments', () => {
    beforeEach(() => {
      return factories.post({type: Post.Type.THREAD}).save()
      .then(post => factories.comment({
        post_id: post.id,
        user_id: cat.id
      }).save())
      .then(() => factories.post().save())
      .then(post => factories.comment({
        post_id: post.id,
        user_id: cat.id
      }).save())
    })

    it('does not include messages', () => {
      return cat.comments().fetch()
      .then(comments => expect(comments.length).to.equal(1))
    })
  })

  describe('.gravatar', () => {
    it('handles a blank email', () => {
      expect(User.gravatar(null)).to.equal('https://www.gravatar.com/avatar/d41d8cd98f00b204e9800998ecf8427e?d=mm&s=140')
    })
  })

  describe('#communitiesSharedWithUser', () => {
    it('returns shared', async () => {
      const user1 = await factories.user().save()
      const user2 = await factories.user().save()
      const community1 = await factories.community().save()
      await community1.createGroup()
      const community2 = await factories.community().save()
      await community2.createGroup()
      const community3 = await factories.community().save()
      await community3.createGroup()
      const community4 = await factories.community().save()
      await community4.createGroup()
      await Promise.join(
        user1.joinCommunity(community1),
        user1.joinCommunity(community2),
        user1.joinCommunity(community3),
        user2.joinCommunity(community2),
        user2.joinCommunity(community3),
        user2.joinCommunity(community4))
      const sharedCommunities = await user1.communitiesSharedWithUser(user2)
      expect(sharedCommunities.length).to.equal(2)
      expect(sharedCommunities.map(c => c.id).sort()).to.deep.equal([community2.id, community3.id].sort())
    })
  })
})

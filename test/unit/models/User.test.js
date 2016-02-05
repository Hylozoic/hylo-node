var bcrypt = require('bcrypt')
require(require('root-path')('test/setup'))

describe('User', function () {
  var cat

  before(function () {
    cat = new User({name: 'Cat', email: 'iam@cat.org'})
    return cat.save()
  })

  it('can be found', function () {
    return User.where({name: 'Cat'}).fetch().then(function (user) {
      expect(user).to.exist
      expect(user.get('name')).to.equal('Cat')
    })
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
  })

  it('can become moderator', function () {
    var street = new Community({name: 'Street', slug: 'street'})

    return street.save()
    .then(() => cat.joinCommunity(street))
    .then(() => cat.setModeratorRole(street))
    .then(() => cat.memberships().query({where: {community_id: street.id}}).fetchOne())
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

    it('preserves existing settings keys', () => {
      var user = new User({settings: {a: 'eh', b: 'bee', c: 'sea'}})

      user.setSanely({settings: {b: 'buh'}})
      expect(user.get('settings')).to.deep.equal({a: 'eh', b: 'buh', c: 'sea'})
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

    before(function (done) {
      community = new Community({name: 'foo', slug: 'foo'})
      community.save().exec(done)
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
        expect(user.get('send_email_preference')).to.be.true

        return Promise.join(
          LinkedAccount.where({user_id: user.id}).fetch().then(function (account) {
            expect(account).to.exist
            expect(account.get('provider_key')).to.equal('password')
            expect(bcrypt.compareSync('password!', account.get('provider_user_id'))).to.be.true
          }),
          Membership.find(user.id, community.id).then(function (membership) {
            expect(membership).to.exist
          })
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
        expect(user.get('send_email_preference')).to.be.true

        return Promise.join(
          LinkedAccount.where({user_id: user.id}).fetch().then(function (account) {
            expect(account).to.exist
            expect(account.get('provider_key')).to.equal('google')
            expect(account.get('provider_user_id')).to.equal('foo')
          }),
          Membership.find(user.id, community.id).then(function (membership) {
            expect(membership).to.exist
          })
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
        expect(user.get('avatar_url')).to.equal('http://graph.facebook.com/foo/picture?type=large')
        expect(user.get('settings').digest_frequency).to.equal('daily')
        expect(user.get('send_email_preference')).to.be.true

        return Promise.join(
          LinkedAccount.where({user_id: user.id}).fetch().then(function (account) {
            expect(account).to.exist
            expect(account.get('provider_key')).to.equal('facebook')
            expect(account.get('provider_user_id')).to.equal('foo')
          }),
          Membership.find(user.id, community.id).then(function (membership) {
            expect(membership).to.exist
          })
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
        expect(user.get('send_email_preference')).to.be.true

        return Promise.join(
          LinkedAccount.where({user_id: user.id}).fetch().then(function (account) {
            expect(account).to.exist
            expect(account.get('provider_key')).to.equal('linkedin')
            expect(account.get('provider_user_id')).to.equal('foo')
          }),
          Membership.find(user.id, community.id).then(function (membership) {
            expect(membership).to.exist
          })
        )
      })
    })
  })
})

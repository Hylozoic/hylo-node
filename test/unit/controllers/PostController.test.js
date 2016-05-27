const root = require('root-path')
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))
const PostController = require(root('api/controllers/PostController'))

const testImageUrl = 'https://www.hylo.com/favicon.png'
const testImageUrl2 = 'https://www.hylo.com/faviconDev.png'

describe('PostController', () => {
  var fixtures, req, res

  before(() =>
    setup.clearDb()
    .then(() => Promise.props({
      u1: new User({name: 'U1', email: 'a@b.c'}).save(),
      u2: new User({name: 'U2', email: 'b@b.c', active: true}).save(),
      u3: new User({name: 'U3', email: 'c@b.c'}).save(),
      p1: new Post({name: 'P1'}).save(),
      c1: new Community({name: 'C1', slug: 'c1'}).save()
    }))
    .then(props => fixtures = props)
    .then(() => fixtures.u2.joinCommunity(fixtures.c1)))

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
    req.login(fixtures.u1.id)
  })

  describe('#create', () => {
    it('saves mentions', () => {
      _.extend(req.params, {
        name: 'NewPost',
        description: '<p>Hey <a data-user-id="' + fixtures.u2.id + '">U2</a>, you\'re mentioned ;)</p>',
        type: 'intention',
        communities: [fixtures.c1.id]
      })
      return PostController.create(req, res)
      .then(() => {
        var data = res.body
        expect(data).to.exist
        expect(data.followers.length).to.equal(2)
        expect(data.name).to.equal('NewPost')
        expect(data.description).to.equal('<p>Hey <a data-user-id="' + fixtures.u2.id + '">U2</a>, you\'re mentioned ;)</p>')
      })
    })

    it('sanitizes the description', () => {
      _.extend(req.params, {
        name: 'NewMaliciousPost',
        description: "<script>alert('test')</script><p>Hey <a data-user-id='" + fixtures.u2.id + "' data-malicious='alert(blah)'>U2</a>, you're mentioned ;)</p>",
        type: 'intention',
        communities: [fixtures.c1.id]
      })

      return PostController.create(req, res)
      .then(() => {
        var data = res.body
        expect(data).to.exist
        expect(data.followers.length).to.equal(2)
        expect(data.name).to.equal('NewMaliciousPost')
        expect(data.description).to.equal('<p>Hey <a data-user-id="' + fixtures.u2.id + '">U2</a>, you\'re mentioned ;)</p>')
      })
    })

    it('creates an image', () => {
      _.extend(req.params, {
        name: 'NewImagePost',
        description: '',
        type: 'intention',
        imageUrl: testImageUrl,
        communities: [fixtures.c1.id]
      })

      return PostController.create(req, res)
      .then(() => {
        var data = res.body
        expect(data).to.exist
        expect(data.name).to.equal('NewImagePost')
        expect(data.media.length).to.equal(1)
        var image = data.media[0]
        expect(image).to.exist
        expect(image.type).to.equal('image')
        expect(image.url).to.equal(testImageUrl)
      })
    })

    describe('with tags', () => {
      it('creates a tag from type param', () => {
        _.extend(req.params, {
          name: 'NewPost',
          description: '<p>Post Body</p>',
          type: 'intention',
          communities: [fixtures.c1.id]
        })

        return PostController.create(req, res)
        .then(() => Tag.find('intention'))
        .then(tag => {
          expect(tag).to.exist
          expect(tag.get('name')).to.equal('intention')
          var data = res.body
          expect(data).to.exist
          expect(data.name).to.equal('NewPost')
        })
      })

      it('sets post type from tag', () => {
        _.extend(req.params, {
          name: 'NewPost',
          description: '<p>Post Body</p>',
          tag: 'intention',
          communities: [fixtures.c1.id]
        })

        return PostController.create(req, res)
        .then(() => {
          var data = res.body
          expect(data).to.exist
          expect(data.name).to.equal('NewPost')
          expect(data.type).to.equal('intention')
        })
      })

      it('sets post type to chat when custom tag', () => {
        _.extend(req.params, {
          name: 'NewPost',
          description: '<p>Post Body</p>',
          tag: 'custom',
          communities: [fixtures.c1.id]
        })

        return PostController.create(req, res)
        .then(() => {
          var data = res.body
          expect(data).to.exist
          expect(data.name).to.equal('NewPost')
          expect(data.type).to.equal('chat')
        })
      })

      it('attaches a tag to a community', () => {
        _.extend(req.params, {
          name: 'NewPost',
          description: '#tobeattached',
          communities: [fixtures.c1.id]
        })

        return PostController.create(req, res)
        .then(() => Tag.find('tobeattached', {withRelated: ['communities']}))
        .then(tag => {
          expect(tag).to.exist
          expect(tag.get('name')).to.equal('tobeattached')
          expect(tag.relations.communities.length).to.equal(1)
          expect(tag.relations.communities.models[0].id).to.equal(fixtures.c1.id)
        })
      })

      it('creates a tag from post title', () => {
        _.extend(req.params, {
          name: 'New Awesome Post #awesome',
          description: '<p>Post Body</p>',
          type: 'chat',
          communities: [fixtures.c1.id]
        })

        return PostController.create(req, res)
        .then(() => Tag.find('awesome', {withRelated: ['posts']}))
        .then(tag => {
          expect(tag).to.exist
          expect(tag.get('name')).to.equal('awesome')
          expect(tag.relations.posts.length).to.equal(1)
          expect(tag.relations.posts.models[0].get('name')).to.equal('New Awesome Post #awesome')
        })
      })

      it('creates an event with a custom tag', () => {
        _.extend(req.params, {
          name: 'New Event',
          description: '<p>Post Body</p>',
          type: 'event',
          tag: 'zounds',
          communities: [fixtures.c1.id]
        })

        return PostController.create(req, res)
        .then(() => Tag.find('zounds', {withRelated: ['posts']}))
        .then(tag => {
          expect(tag).to.exist
          const post = tag.relations.posts.first()
          expect(post).to.exist
          expect(post.get('name')).to.equal('New Event')
          expect(post.get('type')).to.equal('event')
          expect(post.pivot.get('selected')).to.be.true
        })
      })
    })
  })

  describe('#update', () => {
    var post

    beforeEach(() => {
      post = factories.post()
      req.params.communities = []
      res.locals.post = post
      return post.save().tap(() => post.load('communities'))
    })

    describe('with communities', () => {
      var cs = []

      beforeEach(() => {
        for (var i = 0; i < 5; i++) {
          cs.push(factories.community())
        }
        return Promise.all(cs.map(c => c.save()))
        .tap(() => Promise.map(cs.slice(0, 3), c => post.communities().attach(c.id)))
        .tap(() => post.load('communities'))
        .tap(() => {
          expect(post.relations.communities.map(c => c.id).sort())
          .to.deep.equal(cs.slice(0, 3).map(c => c.id).sort())
        })
      })

      it('changes communities', () => {
        req.params.communities = cs.slice(2, 5).map(c => c.id)

        return PostController.update(req, res)
        .tap(() => post.load('communities'))
        .then(() => {
          var communities = post.relations.communities
          expect(communities.length).to.equal(3)
          expect(communities.map(c => c.id).sort())
          .to.deep.equal(cs.slice(2, 5).map(c => c.id).sort())
        })
      })
    })

    describe('with docs', () => {
      var doc1Data = {url: 'http://foo.com', name: 'foo'}
      var doc2Data = {url: 'http://bar.com', name: 'bar'}

      beforeEach(() => Media.createDoc(post.id, doc1Data))

      it('adds docs', () => {
        req.params.docs = [doc1Data, doc2Data]

        return PostController.update(req, res)
        .tap(() => post.load('media'))
        .then(() => {
          var media = post.relations.media
          expect(media.length).to.equal(2)
          expect(media.map(m => m.get('type'))).to.deep.equal(['gdoc', 'gdoc'])
          expect(_.sortBy(media.models, m => m.get('name')).map(m => ({
            url: m.get('url'),
            name: m.get('name')
          }))).to.deep.equal([doc2Data, doc1Data])
        })
      })

      it('adds and removes docs', () => {
        req.params.removedDocs = [doc1Data]
        req.params.docs = [doc2Data]

        return PostController.update(req, res)
        .tap(() => post.load('media'))
        .then(() => {
          var media = post.relations.media
          expect(media.length).to.equal(1)
          expect(media.first().get('url')).to.equal(doc2Data.url)
          expect(media.first().get('name')).to.equal(doc2Data.name)
        })
      })
    })

    it('saves an image', () => {
      req.params.imageUrl = testImageUrl

      return PostController.update(req, res)
      .tap(() => post.load('media'))
      .then(() => {
        var media = post.relations.media
        expect(media.length).to.equal(1)
        var image = media.first()
        expect(image.get('url')).to.equal(testImageUrl)
        expect(image.get('type')).to.equal('image')
      })
    })

    describe('with an existing image', () => {
      var originalImageId
      beforeEach(() =>
        Media.createForPost(post.id, 'image', testImageUrl)
        .tap(image => originalImageId = image.id))

      it('removes the image', () => {
        req.params.imageRemoved = true

        return PostController.update(req, res)
        .tap(() => post.load('media'))
        .then(() => expect(post.relations.media.length).to.equal(0))
      })

      it('updates the image url', () => {
        req.params.imageUrl = testImageUrl2

        return PostController.update(req, res)
        .tap(() => post.load('media'))
        .then(() => {
          var media = post.relations.media
          expect(media.length).to.equal(1)
          var image = media.first()
          expect(image.get('url')).to.equal(testImageUrl2)
          expect(image.id).to.equal(originalImageId)
        })
      })
    })
  })

  describe('.findForTagInAllCommunities', () => {
    var p2, p3, p4, c2, c3

    before(() => {
      c2 = factories.community()
      c3 = factories.community()
      p2 = factories.post({type: 'offer', active: true, description: '#findtesttag', user_id: fixtures.u2.id})
      p3 = factories.post({type: 'chat', active: true, description: '#findtesttag', user_id: fixtures.u2.id})
      p4 = factories.post({type: 'request', active: true, description: '#somedifferenttag', user_id: fixtures.u2.id})
      return Promise.join(
        p2.save(),
        p3.save(),
        p4.save(),
        c2.save(),
        c3.save())
      .then(() => Promise.join(
        c2.posts().attach(p2),
        c3.posts().attach(p3),
        c2.posts().attach(p4),
        new Membership({
          user_id: fixtures.u1.id,
          community_id: c2.id,
          active: true
        }).save(),
        new Membership({
          user_id: fixtures.u1.id,
          community_id: c3.id,
          active: true
        }).save()
      ))
      .then(() => Promise.join(
        Tag.updateForPost(p2),
        Tag.updateForPost(p3),
        Tag.updateForPost(p4)
      ))
    })

    beforeEach(() => {
      res.locals.community = c2
    })

    it('shows tagged content to members', () => {
      req.session.userId = fixtures.u1.id

      _.extend(req.params, {
        tagName: 'findtesttag'
      })

      return PostController.findForTagInAllCommunities(req, res)
      .then(() => {
        expect(res.body.posts_total).to.equal(2)
        var ids = _.map(res.body.posts, 'id')
        expect(ids).to.contain(p2.id)
        expect(ids).to.contain(p3.id)
      })
    })
  })

  describe('.findForCommunity', () => {
    var p2, p3, c2

    before(() => {
      c2 = factories.community()
      p2 = factories.post({type: 'offer', active: true, visibility: Post.Visibility.PUBLIC_READABLE})
      p3 = factories.post({type: 'chat', active: true})
      return Promise.join(p2.save(), p3.save(), c2.save())
      .then(() => Promise.join(
        c2.posts().attach(p2),
        c2.posts().attach(p3)
      ))
    })

    beforeEach(() => {
      res.locals.community = c2
    })

    it('shows only public content to non-members', () => {
      return PostController.findForCommunity(req, res)
      .then(() => {
        expect(res.body.posts_total).to.equal(1)
        expect(res.body.posts[0].id).to.equal(p2.id)
      })
    })

    it('shows all content to members', () => {
      res.locals.membership = new Membership({
        user_id: fixtures.u1.id,
        community_id: c2.id
      })

      return PostController.findForCommunity(req, res)
      .then(() => {
        expect(res.body.posts_total).to.equal(2)
        var ids = _.map(res.body.posts, 'id')
        expect(ids).to.contain(p2.id)
        expect(ids).to.contain(p3.id)
      })
    })

    it('returns post type as tag as well', () => {
      return PostController.findForCommunity(req, res)
      .then(() => {
        expect(res.body.posts_total).to.equal(1)
        expect(res.body.posts[0].tag).to.equal(p2.get('type'))
      })
    })

    it('returns selected tag if present', () => {
      return Tag.updateForPost(p2, 'findforcommunitytag')
      .then(() => PostController.findForCommunity(req, res))
      .then(() => {
        expect(res.body.posts_total).to.equal(1)
        expect(res.body.posts[0].tag).to.equal('findforcommunitytag')
      })
    })
  })

  describe('.checkFreshnessForCommunity', () => {
    var p2, p3, c2

    before(() => {
      c2 = factories.community()
      p2 = factories.post({type: 'chat', active: true, visibility: Post.Visibility.PUBLIC_READABLE})
      p3 = factories.post({type: 'chat', active: true})
      return Promise.join(p2.save(), p3.save(), c2.save())
      .then(() => Promise.join(
        c2.posts().attach(p2),
        c2.posts().attach(p3)
      ))
    })

    beforeEach(() => {
      res.locals.community = c2
      res.locals.membership = new Membership({
        user_id: fixtures.u1.id,
        community_id: c2.id
      })
    })

    it('returns false when nothing has changed', () => {
      req.params = {
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }
      return PostController.checkFreshnessForCommunity(req, res)
      .then(() => {
        expect(res.body).to.equal(false)
      })
    })

    it('returns true when a post has been added', () => {
      req.params = {
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }

      var p4 = factories.post({type: 'chat', active: true})
      return p4.save()
      .then(() => c2.posts().attach(p4))
      .then(() => PostController.checkFreshnessForCommunity(req, res))
      .then(() => {
        expect(res.body).to.equal(true)
      })
    })
  })

  describe('.checkFreshnessForUser', () => {
    var p2, p3, c2

    before(() => {
      c2 = factories.community()
      p2 = factories.post({user_id: fixtures.u3.id, type: 'chat', active: true, visibility: Post.Visibility.PUBLIC_READABLE})
      p3 = factories.post({user_id: fixtures.u3.id, type: 'chat', active: true})
      return Promise.join(
        p2.save(),
        p3.save(),
        c2.save()
      )
      .then(() => Promise.join(
        Membership.create(fixtures.u1.id, c2.id),
        c2.posts().attach(p2),
        c2.posts().attach(p3)
      ))
    })

    beforeEach(() => {
      res.locals.user = fixtures.u3
    })

    it('returns false when nothing has changed', () => {
      req.session.userId = fixtures.u1.id
      req.params = {
        userId: fixtures.u3.id,
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }
      return PostController.checkFreshnessForUser(req, res)
      .then(() => {
        expect(res.body).to.equal(false)
      })
    })

    it('returns true when a post has been added', () => {
      req.session.userId = fixtures.u1.id
      req.params = {
        userId: fixtures.u3.id,
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }

      var p4 = factories.post({type: 'chat', active: true, user_id: fixtures.u3.id})
      return p4.save()
      .then(() => c2.posts().attach(p4))
      .then(() => PostController.checkFreshnessForUser(req, res))
      .then(() => {
        expect(res.body).to.equal(true)
      })
    })
  })

  describe('.checkFreshnessForAllForUser', () => {
    var p2, p3, c2

    before(() => {
      c2 = factories.community()
      p2 = factories.post({user_id: fixtures.u2.id, type: 'chat', active: true, visibility: Post.Visibility.PUBLIC_READABLE})
      p3 = factories.post({user_id: fixtures.u2.id, type: 'chat', active: true})
      return Promise.join(
        p2.save(),
        p3.save(),
        c2.save()
      )
      .then(() => Promise.join(
        Membership.create(fixtures.u1.id, c2.id),
        c2.posts().attach(p2),
        c2.posts().attach(p3)
      ))
    })

    beforeEach(() => {
      res.locals.user = fixtures.u2
    })

    it('returns false when nothing has changed', () => {
      req.session.userId = fixtures.u1.id
      return Post.fetchAll()
      .then(posts => {
        req.params = {
          userId: fixtures.u1.id,
          query: '',
          posts: posts.map(p => _.pick(p, ['id', 'updated_at']))
        }
      })
      .then(() => PostController.checkFreshnessForAllForUser(req, res))
      .then(() => {
        expect(res.body).to.equal(false)
      })
    })

    it('returns true when a post has been added', () => {
      req.session.userId = fixtures.u1.id

      var p4 = factories.post({type: 'chat', active: true, user_id: fixtures.u2.id})
      return Post.fetchAll()
      .then(posts => {
        req.params = {
          userId: fixtures.u1.id,
          query: '',
          posts: posts.map(p => _.pick(p, ['id', 'updated_at']))
        }
      })
      .then(() => p4.save())
      .then(() => c2.posts().attach(p4))
      .then(() => PostController.checkFreshnessForAllForUser(req, res))
      .then(() => {
        expect(res.body).to.equal(true)
      })
    })
  })

  describe('.checkFreshnessForNetwork', () => {
    var p2, p3, c2, n1

    before(() => {
      n1 = factories.network()
      c2 = factories.community()
      p2 = factories.post({user_id: fixtures.u2.id, type: 'chat', active: true, visibility: Post.Visibility.PUBLIC_READABLE})
      p3 = factories.post({user_id: fixtures.u2.id, type: 'chat', active: true})
      return Promise.join(
        n1.save(),
        p2.save(),
        p3.save(),
        c2.save()
      )
      .then(() => Promise.join(
        Membership.create(fixtures.u1.id, c2.id),
        c2.posts().attach(p2),
        c2.posts().attach(p3),
        c2.save({network_id: n1.id}, {patch: true})
      ))
    })

    beforeEach(() => {
      res.locals.user = fixtures.u2
    })

    it('returns false when nothing has changed', () => {
      req.session.userId = fixtures.u1.id
      req.params = {
        networkId: n1.id,
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }
      return PostController.checkFreshnessForNetwork(req, res)
      .then(() => {
        expect(res.body).to.equal(false)
      })
    })

    it('returns true when a post has been added', () => {
      req.session.userId = fixtures.u1.id
      req.params = {
        networkId: n1.id,
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }

      var p4 = factories.post({type: 'chat', active: true, user_id: fixtures.u2.id})
      return p4.save()
      .then(() => c2.posts().attach(p4))
      .then(() => PostController.checkFreshnessForNetwork(req, res))
      .then(() => {
        expect(res.body).to.equal(true)
      })
    })
  })

  describe('.checkFreshnessForAllForFollowed', () => {
    var p2, p3

    before(() => {
      p2 = factories.post({type: 'chat', active: true, visibility: Post.Visibility.PUBLIC_READABLE})
      p3 = factories.post({type: 'chat', active: true})
      return Promise.join(
        p2.save(),
        p3.save()
      )
      .then(() => Promise.join(
        Follow.create(fixtures.u1.id, p2.id),
        Follow.create(fixtures.u1.id, p3.id)
      ))
    })

    beforeEach(() => {
      res.locals.user = fixtures.u2
    })

    it('returns false when nothing has changed', () => {
      req.session.userId = fixtures.u1.id
      req.params = {
        userId: fixtures.u1.id,
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }
      return PostController.checkFreshnessForFollowed(req, res)
      .then(() => {
        expect(res.body).to.equal(false)
      })
    })

    it('returns true when a post has been added', () => {
      req.session.userId = fixtures.u1.id
      req.params = {
        userId: fixtures.u1.id,
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }

      var p4 = factories.post({type: 'chat', active: true, user_id: fixtures.u2.id})
      return p4.save()
      .then(() => Follow.create(fixtures.u1.id, p4.id))
      .then(() => PostController.checkFreshnessForFollowed(req, res))
      .then(() => {
        expect(res.body).to.equal(true)
      })
    })
  })
})

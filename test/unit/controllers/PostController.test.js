var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var PostController = require(root('api/controllers/PostController'))

describe('PostController', () => {
  var fixtures, req, res

  before(() =>
    setup.clearDb()
    .then(() => Promise.props({
      u1: new User({name: 'U1'}).save(),
      u2: new User({name: 'U2'}).save(),
      p1: new Post({name: 'P1'}).save(),
      c1: new Community({name: 'C1', slug: 'c1'}).save()
    }))
    .then(props => fixtures = props))

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
        imageUrl: 'https://www.hylo.com/img/smallh.png',
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
        expect(image.url).to.equal('https://www.hylo.com/img/smallh.png')
      })
    })

    describe('for a project', () => {
      var project

      beforeEach(() => {
        project = new Project({title: 'Project!', slug: 'project', community_id: fixtures.c1.id})
        return project.save()
      })

      it('connects the post and project', () => {
        _.extend(req.params, {
          name: 'i want!',
          description: '<p>woo</p>',
          type: 'request',
          projectId: project.id
        })

        return PostController.create(req, res)
        .then(() => project.load('posts'))
        .then(() => {
          var post = project.relations.posts.first()
          expect(post).to.exist
          expect(post.get('name')).to.equal('i want!')
        })
      })
    })

    describe('for a draft project', () => {
      var project

      beforeEach(() => {
        project = new Project({title: 'Project!', slug: 'project', community_id: fixtures.c1.id})
        return project.save()
      })

      it('sets visibility to DRAFT_PROJECT', () => {
        _.extend(req.params, {
          name: 'i want!',
          description: '<p>woo</p>',
          type: 'request',
          projectId: project.id
        })

        return PostController.create(req, res)
        .then(() => project.load('posts'))
        .then(() => {
          var post = project.relations.posts.first()
          expect(post).to.exist
          expect(post.get('name')).to.equal('i want!')
          expect(post.get('visibility')).to.equal(Post.Visibility.DRAFT_PROJECT)
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
      req.params.imageUrl = 'https://www.hylo.com/img/smallh.png'

      return PostController.update(req, res)
      .tap(() => post.load('media'))
      .then(() => {
        var media = post.relations.media
        expect(media.length).to.equal(1)
        var image = media.first()
        expect(image.get('url')).to.equal('https://www.hylo.com/img/smallh.png')
        expect(image.get('type')).to.equal('image')
      })
    })

    describe('with an existing image', () => {
      var originalImageId
      beforeEach(() =>
        Media.createImageForPost(post.id, 'https://www.hylo.com/img/smallh.png')
        .tap(image => originalImageId = image.id))

      it('removes the image', () => {
        req.params.imageRemoved = true

        return PostController.update(req, res)
        .tap(() => post.load('media'))
        .then(() => expect(post.relations.media.length).to.equal(0))
      })

      it('updates the image url', () => {
        req.params.imageUrl = 'https://www.hylo.com/img/largeh.png'

        return PostController.update(req, res)
        .tap(() => post.load('media'))
        .then(() => {
          var media = post.relations.media
          expect(media.length).to.equal(1)
          var image = media.first()
          expect(image.get('url')).to.equal('https://www.hylo.com/img/largeh.png')
          expect(image.id).to.equal(originalImageId)
        })
      })
    })
  })

  describe('.findForCommunity', () => {
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
    })

    it('shows only public content to non-members', () => {
      res.locals.membership = {dummy: true, save: () => {}}
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
        expect(_.map(res.body.posts, 'id')).to.deep.equal([p2.id, p3.id])
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
      req.params = {
        userId: fixtures.u2.id,
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
        userId: fixtures.u2.id,
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }

      var p4 = factories.post({type: 'chat', active: true, user_id: fixtures.u2.id})
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

  describe('.checkFreshnessForProject', () => {
    var p2, p3, proj

    before(() => {
      proj = factories.project()
      p2 = factories.post({user_id: fixtures.u2.id, type: 'chat', active: true, visibility: Post.Visibility.PUBLIC_READABLE})
      p3 = factories.post({user_id: fixtures.u2.id, type: 'chat', active: true})
      return Promise.join(
        p2.save(),
        p3.save(),
        proj.save()
      )
      .then(() => Promise.join(
        proj.posts().attach(p2),
        proj.posts().attach(p3)
      ))
    })

    beforeEach(() => {
      res.locals.user = fixtures.u2
    })

    it('returns false when nothing has changed', () => {
      req.session.userId = fixtures.u1.id
      req.params = {
        projectId: proj.id,
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }
      return PostController.checkFreshnessForProject(req, res)
      .then(() => {
        expect(res.body).to.equal(false)
      })
    })

    it('returns true when a post has been added', () => {
      req.session.userId = fixtures.u1.id
      req.params = {
        userId: proj.id,
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }

      var p4 = factories.post({type: 'chat', active: true, user_id: fixtures.u2.id})
      return p4.save()
      .then(() => proj.posts().attach(p4))
      .then(() => PostController.checkFreshnessForProject(req, res))
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

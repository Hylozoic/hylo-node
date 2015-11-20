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
        postType: 'intention',
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
        postType: 'intention',
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
        postType: 'intention',
        imageUrl: 'http://bar.com/foo.png',
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
        expect(image.url).to.equal('http://bar.com/foo.png')
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
          postType: 'request',
          projectId: project.id,
          communities: [fixtures.c1.id]
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
          postType: 'request',
          projectId: project.id,
          communities: [fixtures.c1.id]
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
      req.params.imageUrl = 'http://bar.com/foo.png'

      return PostController.update(req, res)
      .tap(() => post.load('media'))
      .then(() => {
        var media = post.relations.media
        expect(media.length).to.equal(1)
        var image = media.first()
        expect(image.get('url')).to.equal('http://bar.com/foo.png')
        expect(image.get('type')).to.equal('image')
      })
    })

    describe('with an existing image', () => {
      var originalImageId
      beforeEach(() =>
        Media.createImageForPost(post.id, 'http://foo.com/bar.png')
        .tap(image => originalImageId = image.id))

      it('removes the image', () => {
        req.params.imageRemoved = true

        return PostController.update(req, res)
        .tap(() => post.load('media'))
        .then(() => expect(post.relations.media.length).to.equal(0))
      })

      it('updates the image url', () => {
        req.params.imageUrl = 'http://foo.com/bar2.png'

        return PostController.update(req, res)
        .tap(() => post.load('media'))
        .then(() => {
          var media = post.relations.media
          expect(media.length).to.equal(1)
          var image = media.first()
          expect(image.get('url')).to.equal('http://foo.com/bar2.png')
          expect(image.id).to.equal(originalImageId)
        })
      })
    })
  })
})

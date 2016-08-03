const root = require('root-path')
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))
const PostController = require(root('api/controllers/PostController'))

const testImageUrl = 'http://cdn.hylo.com/misc/hylo-logo-teal-on-transparent.png'
const testImageUrl2 = 'http://cdn.hylo.com/misc/hylo-logo-white-on-teal-circle.png'
const testVideoUrl = 'https://www.youtube.com/watch?v=jsQ7yKwDPZk'
const testVideoUrl2 = 'https://www.youtube.com/watch?v=gC5-MoDUuRg'

describe('PostController', () => {
  var fixtures, req, res

  before(() =>
    setup.clearDb()
    .then(() => Promise.props({
      u1: new User({name: 'U1', email: 'a@b.c'}).save(),
      u2: new User({name: 'U2', email: 'b@b.c', active: true}).save(),
      u3: new User({name: 'U3', email: 'c@b.c'}).save(),
      p1: new Post({name: 'P1'}).save(),
      c1: new Community({name: 'C1', slug: 'c1', 'financial_requests_enabled': true}).save()
    }))
    .then(props => fixtures = props)
    .then(() => fixtures.u2.joinCommunity(fixtures.c1)))

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
    req.login(fixtures.u1.id)
  })

  describe('#create', () => {
    it('returns an error if the title is missing', () => {
      return PostController.create(req, res)
      .then(() => {
        expect(res.statusCode).to.equal(422)
        expect(res.body).to.eql({errors: ["title can't be blank"]})
      })
    })

    it('saves mentions', () => {
      _.extend(req.params, {
        name: 'NewPost',
        description: '<p>Hey <a data-user-id="' + fixtures.u2.id + '">U2</a>, you\'re mentioned ;)</p>',
        communities: [fixtures.c1.id]
      })
      return PostController.create(req, res)
      .then(() => {
        expect(res.ok).to.have.been.called()
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

    it('creates an image', function () {
      this.timeout(5000)

      _.extend(req.params, {
        name: 'NewImagePost',
        description: '',
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

    it('does not create a tag from the type param', () => {
      _.extend(req.params, {
        name: 'NewPost',
        description: '<p>Post Body</p>',
        communities: [fixtures.c1.id]
      })

      return PostController.create(req, res)
      .then(() => Tag.find('offer'))
      .then(tag => expect(tag).not.to.exist)
    })

    it('creates an event with a custom tag and creator EventResponse', () => {
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
        return EventResponse.where({post_id: post.id, user_id: fixtures.u1.id}).fetch()
      })
      .then(eventResponse => {
        expect(eventResponse).to.exist
        expect(eventResponse.get('response')).to.equal('yes')
      })
    })

    describe('with an existing tag', () => {
      before(() => {
        return Tag.forge({name: 'awesome'}).save()
        .then(tag => tag.communities().attach({
          community_id: fixtures.c1.id,
          user_id: fixtures.u3.id
        }))
      })

      it('does not set post type from tag', () => {
        _.extend(req.params, {
          name: 'NewPost',
          description: '<p>Post Body</p>',
          tag: 'awesome',
          communities: [fixtures.c1.id]
        })

        return PostController.create(req, res)
        .then(() => {
          var data = res.body
          expect(data).to.exist
          expect(data.name).to.equal('NewPost')
          expect(data.type).to.be.undefined
        })
      })

      it('works with no tag description', () => {
        _.extend(req.params, {
          name: 'New Awesome Post #awesome',
          communities: [fixtures.c1.id]
        })

        return PostController.create(req, res)
        .then(() => Post.find(res.body.id, {withRelated: 'tags'}))
        .then(post => {
          expect(post.get('name')).to.equal('New Awesome Post #awesome')
          expect(post.relations.tags.first().get('name')).to.equal('awesome')
        })
      })
    })

    describe('with new tags', () => {
      before(() => {
        return Tag.forge({name: 'tobeattached'}).save()
        .then(tag => tag.communities().attach({
          user_id: fixtures.u3.id,
          community_id: fixtures.c1.id,
          description: 'First description.'
        }))
      })

      it('returns an error when no descriptions are provided', () => {
        _.extend(req.params, {
          name: 'NewPostWithoutTagDescriptions1',
          description: '#tobeattached #hello',
          communities: [fixtures.c1.id]
        })

        return PostController.create(req, res)
        .then(() => {
          expect(res.status).to.have.been.called.with(422)
          expect(res.body).to.deep.equal({
            tagsMissingDescriptions: {
              hello: [fixtures.c1.id]
            }
          })

          return Post.where({name: 'NewPostWithoutTagDescriptions1'}).fetch()
        })
        .then(post => expect(post).not.to.exist)
      })

      it('returns an error when at least one description is missing or blank', () => {
        _.extend(req.params, {
          name: 'NewPostWithoutTagDescriptions2',
          description: '#tobeattached #hello #wow #ok',
          communities: [fixtures.c1.id],
          tagDescriptions: {
            wow: '',
            ok: 'everything is ok'
          }
        })

        return PostController.create(req, res)
        .then(() => {
          expect(res.status).to.have.been.called.with(422)
          expect(res.body).to.deep.equal({
            tagsMissingDescriptions: {
              hello: [fixtures.c1.id],
              wow: [fixtures.c1.id]
            }
          })

          return Post.where({name: 'NewPostWithoutTagDescriptions2'}).fetch()
        })
        .then(post => expect(post).not.to.exist)
      })

      it('attaches the tag, with description, to new communities', () => {
        var c2 = factories.community()
        return c2.save()
        .then(() => {
          _.extend(req.params, {
            name: 'NewPost',
            description: '#tobeattached #herewego',
            tagDescriptions: {
              tobeattached: 'This is a test tag.',
              herewego: 'This is another test tag.'
            },
            communities: [fixtures.c1.id, c2.id]
          })
        })
        .then(() => PostController.create(req, res))
        .then(() => Tag.find('tobeattached', {withRelated: ['communities']}))
        .then(tag => {
          expect(tag).to.exist
          const communities = tag.relations.communities
          expect(communities.length).to.equal(2)
          expect(communities.pluck('id').sort()).to.deep.equal([fixtures.c1.id, c2.id])
          expect(communities.map(c => c.pivot.get('description')).sort()).to.deep.equal([
            'First description.', 'This is a test tag.'
          ])
        })
        .then(() => Tag.find('herewego', {withRelated: ['communities']}))
        .then(tag => {
          expect(tag).to.exist
          const communities = tag.relations.communities
          expect(communities.length).to.equal(2)
          expect(communities.pluck('id').sort()).to.deep.equal([fixtures.c1.id, c2.id])
          expect(communities.map(c => c.pivot.get('description'))).to.deep.equal([
            'This is another test tag.', 'This is another test tag.'
          ])
        })
      })

      it('increments the new_post_count of tag_follows', () => {
        _.extend(req.params, {
          name: 'New Tag Followed Post',
          description: '<p>this is relevant to #ntfpone and #ntfptwo</p>',
          tag: 'zounds',
          tagDescriptions: {
            ntfpone: '1',
            ntfptwo: '1',
            zounds: 'an expression of shock (antiquated)'
          },
          communities: [fixtures.c1.id]
        })

        var t1, t2, t3

        return Promise.join(
          new Tag({name: 'ntfpone'}).save(),
          new Tag({name: 'ntfptwo'}).save(),
          new Tag({name: 'ntfpthree'}).save(),
          (nt1, nt2, nt3) => {
            t1 = nt1
            t2 = nt2
            t3 = nt3
            return Promise.join(
              new TagFollow({tag_id: t1.id, user_id: fixtures.u1.id, community_id: fixtures.c1.id}).save(),
              new TagFollow({tag_id: t2.id, user_id: fixtures.u1.id, community_id: fixtures.c1.id}).save(),
              new TagFollow({tag_id: t3.id, user_id: fixtures.u1.id, community_id: fixtures.c1.id}).save()
            )
          })
        .then(() => PostController.create(req, res))
        .then(() => Promise.join(
          TagFollow.where({tag_id: t1.id, user_id: fixtures.u1.id, community_id: fixtures.c1.id}).fetch(),
          TagFollow.where({tag_id: t2.id, user_id: fixtures.u1.id, community_id: fixtures.c1.id}).fetch(),
          TagFollow.where({tag_id: t3.id, user_id: fixtures.u1.id, community_id: fixtures.c1.id}).fetch(),
          (tf1, tf2, tf3) => {
            expect(tf1.get('new_post_count')).to.equal(1)
            expect(tf2.get('new_post_count')).to.equal(1)
            expect(tf3.get('new_post_count')).to.equal(0)
          }))
      })
    })

    it('creates a financialRequestAmount request', () => {
      _.extend(req.params, {
        name: 'NewPost',
        description: '<p>Post Body</p>',
        type: 'project',
        communities: [fixtures.c1.id],
        financialRequestsEnabled: true,
        financialRequestAmount: '1234.56',
        end_time: new Date('2017-05-02')
      })
      return PostController.create(req, res)
      .then(() => {
        var data = res.body
        expect(data).to.exist
        expect(data.financialRequestAmount).to.equal('1234.56')
      })
    })
  })

  describe('.createFromEmailForm', () => {
    const params = {
      type: 'request',
      name: 'a penguin',
      description: 'I just love the tuxedo'
    }

    before(() => {
      return Tag.forge({name: 'request'}).save()
    })

    it('works', () => {
      _.extend(req.params, params, {
        token: Email.postCreationToken(fixtures.c1.id, fixtures.u1.id)
      })

      return PostController.createFromEmailForm(req, res)
      .then(() => {
        const postId = res.redirected.match(/p\/(\d+)/)[1]
        return Post.find(postId, {withRelated: ['selectedTags', 'communities']})
      })
      .then(post => {
        expect(post.get('name')).to.equal("I'm looking for a penguin")
        expect(post.get('description')).to.equal('I just love the tuxedo')
        expect(post.get('user_id')).to.equal(fixtures.u1.id)
        expect(post.get('created_from')).to.equal('email_form')
        const tag = post.relations.selectedTags.first()
        expect(tag.get('name')).to.equal('request')
        const community = post.relations.communities.first()
        expect(community.id).to.equal(fixtures.c1.id)
      })
    })

    it('rejects an invalid token', () => {
      const token = Email.postCreationToken(fixtures.c1.id, fixtures.u1.id) + 'x'
      _.extend(req.params, params, {token})
      var error
      res.serverError = spy(err => { error = err.message })

      PostController.createFromEmailForm(req, res)
      expect(res.serverError).to.have.been.called()
      expect(error).to.equal(`Invalid token: ${token}`)
    })
  })

  describe('#update', () => {
    var post, community, postId

    beforeEach(() => {
      post = factories.post()
      community = factories.community()
      req.params.communities = []
      res.locals.post = post
      return post.save()
      .tap(post => postId = post.id)
      .tap(() => post.load('communities'))
      .then(() => community.save())
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
        req.params.name = 'a title'
        req.params.id = postId
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
        req.params.name = 'a title'
        req.params.id = postId
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
        req.params.name = 'a title'
        req.params.id = postId
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
      req.params.name = 'a title'
      req.params.id = postId
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

    it('saves a video', () => {
      req.params.name = 'a title'
      req.params.id = postId
      req.params.videoUrl = testVideoUrl

      return PostController.update(req, res)
      .tap(() => post.load('media'))
      .then(() => {
        var media = post.relations.media
        expect(media.length).to.equal(1)
        var video = media.first()
        expect(video.get('url')).to.equal(testVideoUrl)
        expect(video.get('type')).to.equal('video')
      })
    })

    describe('with an existing image', () => {
      var originalImageId
      beforeEach(() =>
        Media.createForPost(post.id, 'image', testImageUrl)
        .tap(image => originalImageId = image.id))

      it('removes the image', () => {
        req.params.name = 'a title'
        req.params.id = postId
        req.params.imageRemoved = true

        return PostController.update(req, res)
        .tap(() => post.load('media'))
        .then(() => expect(post.relations.media.length).to.equal(0))
      })

      it('updates the image url', () => {
        req.params.name = 'a title'
        req.params.id = postId
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

    describe('with an existing video', () => {
      var originalVideoId
      beforeEach(() =>
        Media.createForPost(post.id, 'video', testVideoUrl)
        .tap(video => originalVideoId = video.id))

      it('removes the video', () => {
        req.params.name = 'a title'
        req.params.id = postId
        req.params.videoRemoved = true

        return PostController.update(req, res)
        .tap(() => post.load('media'))
        .then(() => expect(post.relations.media.length).to.equal(0))
      })

      it('updates the video url', () => {
        req.params.name = 'a title'
        req.params.id = postId
        req.params.videoUrl = testVideoUrl2

        return PostController.update(req, res)
        .tap(() => post.load('media'))
        .then(() => {
          var media = post.relations.media
          expect(media.length).to.equal(1)
          var video = media.first()
          expect(video.get('url')).to.equal(testVideoUrl2)
          expect(video.id).to.equal(originalVideoId)
        })
      })
    })

    describe('with a new tag', () => {
      it('rejects the update if the tag has no description', () => {
        req.params.name = 'a title'
        req.params.id = postId
        req.params.description = 'here is a #newtag! yay'
        req.params.communities = [community.id]

        return PostController.update(req, res)
        .then(() => expect(res.body).to.deep.equal({
          tagsMissingDescriptions: {newtag: [community.id]}
        }))
      })

      it('saves the tag description to the community', () => {
        req.params.name = 'a title'
        req.params.id = postId
        req.params.description = 'here is a #newtag! yay'
        req.params.tagDescriptions = {newtag: 'i am a new tag'}
        req.params.communities = [community.id]

        return PostController.update(req, res)
        .then(() => community.load('tags'))
        .then(() => {
          const tag = community.relations.tags.first()
          expect(tag).to.exist
          expect(tag.get('name')).to.equal('newtag')
          expect(tag.pivot.get('description')).to.equal('i am a new tag')
        })
      })
    })

    it('should reject if fails validation rules', () => {
      req.params.id = postId

      return PostController.update(req, res)
      .then(() => expect(res.body).to.deep.equal({
        postValidations: ["title can't be blank"]
      }))
    })
  })

  describe('.findForTagInAllCommunities', () => {
    var p2, p3, p4, c2, c3

    before(() => {
      c2 = factories.community()
      c3 = factories.community()
      p2 = factories.post({active: true, description: '#findtesttag', user_id: fixtures.u2.id})
      p3 = factories.post({active: true, description: '#findtesttag', user_id: fixtures.u2.id})
      p4 = factories.post({active: true, description: '#somedifferenttag', user_id: fixtures.u2.id})
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
    var p2, p3, c2, n1

    before(() => {
      c2 = factories.community()
      n1 = factories.network()
      p2 = factories.post({active: true, visibility: Post.Visibility.PUBLIC_READABLE})
      p3 = factories.post({active: true})
      return Promise.join(p2.save(), p3.save(), n1.save())
      .then(() => c2.save({network_id: n1.id}))
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

    it('shows all content to network members', () => {
      var user = factories.user()
      var networkCommunity = factories.community({network_id: n1.id})

      return Promise.join(user.save(), networkCommunity.save())
      .then(() => user.joinCommunity(networkCommunity))
      .then(() => req.session.userId = user.id)
      .then(() => PostController.findForCommunity(req, res))
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

    it('returns pinned posts first', () => {
      var c3 = factories.community()
      var p4 = factories.post({visibility: Post.Visibility.PUBLIC_READABLE})
      var p5 = factories.post({visibility: Post.Visibility.PUBLIC_READABLE})
      return p4.save({updated_at: new Date(Date.now() - 10000)})
      .then(() => p5.save({updated_at: new Date()}))
      .then(() => c3.save())
      .then(() => c3.posts().attach({post_id: p4.id, pinned: true}))
      .then(() => c3.posts().attach({post_id: p5.id}))
      .then(() => {
        req.params.communityId = c3.id
        res.locals.community = c3
        res.locals.membership = new Membership({
          user_id: fixtures.u1.id,
          community_id: c3.id
        })
      })
      .then(() => PostController.findForCommunity(req, res))
      .then(() => {
        expect(res.body.posts_total).to.equal(2)
        expect(res.body.posts[0].id).to.equal(p4.id)
        expect(res.body.posts[0].memberships).to.deep.equal({[c3.id]: {pinned: true}})
      })
    })
  })

  describe('.checkFreshnessForCommunity', () => {
    var p2, p3, c2

    before(() => {
      c2 = factories.community()
      p2 = factories.post({active: true, visibility: Post.Visibility.PUBLIC_READABLE})
      p3 = factories.post({active: true})
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

    it('returns 0 when nothing has changed', () => {
      req.params = {
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }
      return PostController.checkFreshnessForCommunity(req, res)
      .then(() => {
        expect(res.body.count).to.equal(0)
      })
    })

    it('returns 1 when a post has been added', () => {
      req.params = {
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }

      var p4 = factories.post({active: true})
      return p4.save()
      .then(() => c2.posts().attach(p4))
      .then(() => PostController.checkFreshnessForCommunity(req, res))
      .then(() => {
        expect(res.body.count).to.equal(1)
      })
    })
  })

  describe('.checkFreshnessForUser', () => {
    var p2, p3, c2

    before(() => {
      c2 = factories.community()
      p2 = factories.post({user_id: fixtures.u3.id, active: true, visibility: Post.Visibility.PUBLIC_READABLE})
      p3 = factories.post({user_id: fixtures.u3.id, active: true})
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

    it('returns 0 when nothing has changed', () => {
      req.session.userId = fixtures.u1.id
      req.params = {
        userId: fixtures.u3.id,
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }
      return PostController.checkFreshnessForUser(req, res)
      .then(() => {
        expect(res.body.count).to.equal(0)
      })
    })

    it('returns 2 when two post have been added', () => {
      req.session.userId = fixtures.u1.id
      req.params = {
        userId: fixtures.u3.id,
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }

      return factories.post({active: true, user_id: fixtures.u3.id}).save()
      .then(post => c2.posts().attach(post))
      .then(() => factories.post({active: true, user_id: fixtures.u3.id}).save())
      .then(post => c2.posts().attach(post))
      .then(() => PostController.checkFreshnessForUser(req, res))
      .then(() => {
        expect(res.body.count).to.equal(2)
      })
    })
  })

  describe('.checkFreshnessForAllForUser', () => {
    var p2, p3, c2

    before(() => {
      c2 = factories.community()
      p2 = factories.post({user_id: fixtures.u2.id, active: true, visibility: Post.Visibility.PUBLIC_READABLE})
      p3 = factories.post({user_id: fixtures.u2.id, active: true})
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

    it('returns 0 when nothing has changed', () => {
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
        expect(res.body.count).to.equal(0)
      })
    })

    it('returns 1 when a post has been added', () => {
      req.session.userId = fixtures.u1.id

      var p4 = factories.post({active: true, user_id: fixtures.u2.id})
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
        expect(res.body.count).to.equal(1)
      })
    })
  })

  describe('.checkFreshnessForNetwork', () => {
    var p2, p3, c2, n1

    before(() => {
      n1 = factories.network()
      c2 = factories.community()
      p2 = factories.post({user_id: fixtures.u2.id, active: true, visibility: Post.Visibility.PUBLIC_READABLE})
      p3 = factories.post({user_id: fixtures.u2.id, active: true})
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

    it('returns 0 when nothing has changed', () => {
      req.session.userId = fixtures.u1.id
      req.params = {
        networkId: n1.id,
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }
      return PostController.checkFreshnessForNetwork(req, res)
      .then(() => {
        expect(res.body.count).to.equal(0)
      })
    })

    it('returns 1 when a post has been added', () => {
      req.session.userId = fixtures.u1.id
      req.params = {
        networkId: n1.id,
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }

      var p4 = factories.post({active: true, user_id: fixtures.u2.id})
      return p4.save()
      .then(() => c2.posts().attach(p4))
      .then(() => PostController.checkFreshnessForNetwork(req, res))
      .then(() => {
        expect(res.body.count).to.equal(1)
      })
    })
  })

  describe('.checkFreshnessForAllForFollowed', () => {
    var p2, p3

    before(() => {
      p2 = factories.post({active: true, visibility: Post.Visibility.PUBLIC_READABLE})
      p3 = factories.post({active: true})
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

    it('returns 0 when nothing has changed', () => {
      req.session.userId = fixtures.u1.id
      req.params = {
        userId: fixtures.u1.id,
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }
      return PostController.checkFreshnessForFollowed(req, res)
      .then(() => {
        expect(res.body.count).to.equal(0)
      })
    })

    it('returns 1 when a post has been added', () => {
      req.session.userId = fixtures.u1.id
      req.params = {
        userId: fixtures.u1.id,
        query: '',
        posts: [{id: p2.id, updated_at: null}, {id: p3.id, updated_at: null}]
      }

      var p4 = factories.post({active: true, user_id: fixtures.u2.id})
      return p4.save()
      .then(() => Follow.create(fixtures.u1.id, p4.id))
      .then(() => PostController.checkFreshnessForFollowed(req, res))
      .then(() => {
        expect(res.body.count).to.equal(1)
      })
    })
  })
})

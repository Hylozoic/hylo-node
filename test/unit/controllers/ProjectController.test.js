var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var ProjectController = require(root('api/controllers/ProjectController'))

describe('ProjectController', () => {
  var fixtures, req, res

  before(() =>
    setup.clearDb()
    .then(() => Promise.props({
      u1: new User({name: 'U1'}).save(),
      c1: new Community({name: 'C1', slug: 'c1'}).save()
    }))
    .then(props => fixtures = props))

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
    req.login(fixtures.u1.id)
  })

  describe('#create', () => {
    it('creates image media', () => {
      _.extend(req.params, {
        title: 'NewProject',
        community_id: fixtures.c1.id,
        image_url: 'https://www.hylo.com/img/smallh.png'
      })

      return ProjectController.create(req, res)
      .then(() => {
        var data = res.body
        expect(data).to.exist
        expect(data.slug).to.equal('newproject')
        return Project.find(data.id, {withRelated: 'media'})
        .then((project) => {
          var media = project.relations.media
          expect(media.length).to.equal(1)
          var image = media.first()
          expect(image.get('url')).to.equal('https://www.hylo.com/img/smallh.png')
          expect(image.get('type')).to.equal('image')
          expect(image.get('width')).to.equal(144)
          expect(image.get('height')).to.equal(144)
        })
      })
    })

    it('creates video media', () => {
      _.extend(req.params, {
        title: 'NewProject',
        community_id: fixtures.c1.id,
        video_url: 'https://www.youtube.com/watch?v=84de3KC137A'
      })

      return ProjectController.create(req, res)
      .then(() => {
        var data = res.body
        expect(data).to.exist
        expect(data.slug).to.equal('newproject')
        return Project.find(data.id, {withRelated: 'media'})
        .then((project) => {
          var media = project.relations.media
          expect(media.length).to.equal(1)
          var image = media.first()
          expect(image.get('url')).to.equal('https://www.youtube.com/watch?v=84de3KC137A')
          expect(image.get('thumbnail_url')).to.equal('http://img.youtube.com/vi/84de3KC137A/hqdefault.jpg')
          expect(image.get('type')).to.equal('video')
        })
      })
    })
  })

  describe('#update', () => {
    var project

    beforeEach(() => {
      project = factories.project()
      res.locals.project = project
      return project.save()
      .tap(() => {
        return Media.where('id', '>', '-1')
        .fetchAll()
        .then(media => Promise.map(media.models, medium => medium.destroy()))
      })
    })

    it('saves an image', () => {
      req.params.image_url = 'https://www.hylo.com/img/smallh.png'

      return ProjectController.update(req, res)
      .tap(() => project.load('media'))
      .then(() => {
        var media = project.relations.media
        expect(media.length).to.equal(1)
        var image = media.first()
        expect(image.get('url')).to.equal('https://www.hylo.com/img/smallh.png')
        expect(image.get('type')).to.equal('image')
      })
    })

    it('saves a video', () => {
      req.params.video_url = 'https://www.youtube.com/watch?v=84de3KC137A'

      return ProjectController.update(req, res)
      .tap(() => project.load('media'))
      .then(() => {
        var media = project.relations.media
        expect(media.length).to.equal(1)
        var video = media.first()
        expect(video.get('url')).to.equal('https://www.youtube.com/watch?v=84de3KC137A')
        expect(video.get('thumbnail_url')).to.equal('http://img.youtube.com/vi/84de3KC137A/hqdefault.jpg')
        expect(video.get('type')).to.equal('video')
      })
    })

    describe('with an existing image', () => {
      beforeEach(() => {
        var image_url = 'https://www.hylo.com/img/smallh.png'
        req.params.image_url = image_url
        return Media.createImageForProject(project.id, image_url)
      })

      it('removes the image', () => {
        req.params.image_url = null

        return ProjectController.update(req, res)
        .tap(() => project.load('media'))
        .tap(() => {
          var media = project.relations.media
          expect(media.length).to.equal(0)
        })
      })

      it('replaces the image', () => {
        req.params.image_url = 'https://www.hylo.com/img/largeh.png'

        return ProjectController.update(req, res)
        .tap(() => project.load('media'))
        .then(() => {
          var media = project.relations.media
          expect(media.length).to.equal(1)
          var image = media.first()
          expect(image.get('type')).to.equal('image')
          expect(image.get('url')).to.equal('https://www.hylo.com/img/largeh.png')
        })
      })

      it('adds a video', () => {
        req.params.video_url = 'https://www.youtube.com/watch?v=84de3KC137A'

        return ProjectController.update(req, res)
        .tap(() => project.load('media'))
        .then(() => {
          var media = project.relations.media
          expect(media.length).to.equal(2)
          var video = _.find(media.models || [], m => m.get('type') === 'video')
          expect(video).to.exist
          expect(video.get('url')).to.equal('https://www.youtube.com/watch?v=84de3KC137A')
        })
      })
    })

    describe('with an existing video', () => {
      beforeEach(() => {
        var video_url = 'https://www.youtube.com/watch?v=84de3KC137A'
        req.params.video_url = video_url
        return Media.createVideoForProject(project.id, video_url, 'http://img.youtube.com/vi/84de3KC137A/hqdefault.jpg')
      })

      it('removes the video', () => {
        req.params.video_url = null

        return ProjectController.update(req, res)
        .tap(() => project.load('media'))
        .tap(() => {
          var media = project.relations.media
          expect(media.length).to.equal(0)
        })
      })

      it('replaces the video', () => {
        req.params.video_url = 'https://www.youtube.com/watch?v=JB8sV0ugjE4'

        return ProjectController.update(req, res)
        .tap(() => project.load('media'))
        .then(() => {
          var media = project.relations.media
          expect(media.length).to.equal(1)
          var video = media.first()
          expect(video.get('type')).to.equal('video')
          expect(video.get('url')).to.equal('https://www.youtube.com/watch?v=JB8sV0ugjE4')
        })
      })

      it('adds an image', () => {
        req.params.image_url = 'https://www.hylo.com/img/smallh.png'

        return ProjectController.update(req, res)
        .tap(() => project.load('media'))
        .then(() => {
          var media = project.relations.media
          expect(media.length).to.equal(2)
          var image = _.find(media.models || [], m => m.get('type') === 'image')
          expect(image).to.exist
          expect(image.get('url')).to.equal('https://www.hylo.com/img/smallh.png')
        })
      })
    })
  })

  describe.skip('.join', () => {
    it('works', () => {

    })

    it('ignores duplicate attempts', () => {

    })
  })
})

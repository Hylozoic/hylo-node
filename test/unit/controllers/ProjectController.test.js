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
      console.log('locals', res.locals.project)
      return project.save()
    })

    it('saves an image', () => {
      req.params['image_url'] = 'https://www.hylo.com/img/smallh.png'

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
      req.params['video_url'] = 'https://www.hylo.com/img/smallh.png'

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
      var originalImageId
      beforeEach(() =>
        Media.createImageForProject(project.id, 'https://www.hylo.com/img/smallh.png')
        .tap(image => originalImageId = image.id))
    })

    describe('with an existing video', () => {
      var originalVideoId
      beforeEach(() =>
        Media.createVideoForProject(project.id, 'https://www.youtube.com/watch?v=84de3KC137A', 'http://img.youtube.com/vi/84de3KC137A/hqdefault.jpg')
        .tap(video => originalVideoId = video.id))
    })
  })

  describe.skip('.join', () => {
    it('works', () => {

    })

    it('ignores duplicate attempts', () => {

    })
  })
})

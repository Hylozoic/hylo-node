import { stubGetImageSize } from '../../setup/helpers'
import nock from 'nock'
const root = require('root-path')
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))
const PostController = require(root('api/controllers/PostController'))

const testImageUrl = 'http://cdn.hylo.com/misc/hylo-logo-teal-on-transparent.png'
const testImageUrl2 = 'http://cdn.hylo.com/misc/hylo-logo-white-on-teal-circle.png'

describe('PostController', () => {
  var fixtures, req, res

  before(() =>
    setup.clearDb()
    .then(() => Promise.props({
      u1: new User({name: 'U1', email: 'a@b.c'}).save(),
      u2: new User({name: 'U2', email: 'b@b.c', active: true}).save(),
      u3: new User({name: 'U3', email: 'c@b.c'}).save(),
      p1: new Post({name: 'P1'}).save(),
      g1: new Group({name: 'G1', slug: 'g1', group_data_type: 1}).save()
    }))
    .then(props => {
      fixtures = props
    })
    .then(() => fixtures.u2.joinGroup(fixtures.g1))
    .then(() => fixtures.u1.joinGroup(fixtures.g1)))

  beforeEach(() => {
    stubGetImageSize(testImageUrl)
    stubGetImageSize(testImageUrl2)
    req = factories.mock.request()
    res = factories.mock.response()
    req.login(fixtures.u1.id)
  })

  before(() => nock.disableNetConnect())
  after(() => nock.enableNetConnect())

  describe('.createFromEmailForm', () => {
    before(() => Tag.findOrCreate('request'))

    it('works', () => {
      Object.assign(req.params, {
        type: 'request',
        name: 'a penguin',
        description: 'I just love the tuxedo'
      })

      res.locals.tokenData = {
        groupId: fixtures.g1.id,
        userId: fixtures.u1.id
      }

      return PostController.createFromEmailForm(req, res)
        .then(() => {
          const postId = res.redirected.match(/post\/(\d+)/)[1]
          return Post.find(postId, {withRelated: ['tags', 'groups']})
        })
        .then(post => {
          expect(post.get('name')).to.equal("I'm looking for a penguin")
          expect(post.details()).to.equal('I just love the tuxedo')
          expect(post.get('user_id')).to.equal(fixtures.u1.id)
          expect(post.get('created_from')).to.equal('email_form')
          const tag = post.relations.tags.first()
          expect(tag.get('name')).to.equal('request')
          const group = post.relations.groups.first()
          expect(group.id).to.equal(fixtures.g1.id)
        })
    })

    describe('for an inactive group', () => {
      let c2

      beforeEach(() => {
        Object.assign(req.params, {
          type: 'request',
          name: 'a zebra',
          description: 'I just love the stripes'
        })
        c2 = factories.group()
        c2.set('active', false)
        return c2.save()
      })

      it('does not work', () => {
        res.locals.tokenData = {
          groupId: c2.id,
          userId: fixtures.u1.id
        }

        return PostController.createFromEmailForm(req, res)
          .then(() => {
            expect(res.redirected).to.exist
            const url = require('url').parse(res.redirected, true)
            expect(url.query).to.deep.equal({
              notification: 'Your post was not created. That group no longer exists.',
              error: '1'
            })
          })
      })
    })
  })
})

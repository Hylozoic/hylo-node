require('../../setup')
import SearchController from '../../../api/controllers/SearchController'
import factories from '../../setup/factories'
import { normalizePost } from '../../../lib/util/normalize'

describe('SearchController', () => {
  var req, res, u1, u2, u3, c1

  before(() => {
    u1 = factories.user({name: 'Foosball Healing Bug', active: true, avatar_url: 'foo'})
    u2 = factories.user({name: 'Footfall Face', bio: 'heal the world', active: true})
    u3 = factories.user({name: 'Footloose Fancy Free', active: true})
    c1 = factories.community({active: true, avatar_url: 'img'})
    return Promise.map([u1, u2, u3, c1], x => x.save())
    .then(() => u1.communities().attach({community_id: c1.id, active: true}))
    .then(() => u2.communities().attach({community_id: c1.id, active: true}))
  })

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
  })

  describe('autocomplete', () => {
    beforeEach(() => {
      req.params.q = 'foo'
      req.session.userId = u1.id
    })

    it('works', () => {
      return SearchController.autocomplete(req, res)
      .then(() => {
        expect(res.body).to.deep.equal([
          {id: u1.id, name: u1.get('name'), avatar_url: u1.get('avatar_url')},
          {id: u2.id, name: u2.get('name'), avatar_url: null}
        ])
      })
    })
  })

  describe.skip('showFullText', () => {
    var p

    beforeEach(() => {
      req.params.q = 'heal'
      req.session.userId = u1.id
      p = factories.post({
        name: 'wow', description: 'such healing!', active: true, user_id: u2.id
      })
      return p.save()
      .then(() => p.communities().attach(c1.id))
      .then(() => FullTextSearch.refreshView())
    })

    it('works', () => {
      return SearchController.showFullText(req, res)
      .then(() => Promise.join(
        p.load([
          'communities', 'contributions', 'followers', 'responders', 'media',
          'relatedUsers', 'tags', 'votes', 'user'
        ]),
        u1.load('tags'),
        u2.load('tags')
      ))
      .then(() => {
        const data = {
          items: [
            {
              rank: 1,
              type: 'person',
              data: UserPresenter.presentForList(u1)
            },
            {
              rank: 0.2,
              type: 'post',
              data: PostPresenter.present(p)
            },
            {
              rank: 0.2,
              type: 'person',
              data: UserPresenter.presentForList(u2)
            }
          ],
          total: '3'
        }
        const buckets = {people: [], communities: []}
        normalizePost(data.items[1].data, buckets, true)
        Object.assign(data, buckets)

        expect(res.body).to.deep.equal(data)
      })
    })
  })
})

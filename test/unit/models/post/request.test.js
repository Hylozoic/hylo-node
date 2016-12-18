import root from 'root-path'
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))

describe('post/request', () => {
  let author, contributor1, contributor2, post, community, fulfilledAt

  beforeEach(() => {
    fulfilledAt = new Date()
    return setup.clearDb().then(() => Promise.props({
      author: factories.user().save(),
      contributor1: factories.user().save(),
      contributor2: factories.user().save(),
      post: factories.post().save(),
      community: factories.community().save()
    }))
    .tap(fixtures =>
      fixtures.post.communities().attach(fixtures.community)
    )
    .then(fixtures => {
      return { author, contributor1, contributor2, post, community } = fixtures
    })
  })

  describe('#fulfillRequest', () => {
    beforeEach(() =>
      post.fulfillRequest({
        fulfilledAt,
        contributorIds: [contributor1.id, contributor2.id]
      })
      .then(post => post.fetch({withRelated: 'contributions'}))
    )

    it('should add fulfilled time', () => {
      expect(post.get('fulfilled_at')).to.equalDate(fulfilledAt)
    })

    it('should add contributors', () => {
      expect(post.relations.contributions).to.be.length(2)
      expect(
        post.relations.contributions.map((c) => c.get('user_id'))
      ).to.include.members([contributor1.id, contributor2.id])
    })
  })

  describe('#unfulfillRequest', () => {
    beforeEach(() =>
      post.fulfillRequest({
        fulfilledAt,
        contributorIds: [contributor1.id, contributor2.id]
      })
      .then(post => post.fetch({withRelated: 'contributions'}))
    )

    it('should remove fulfilled time', () => {
      expect(post.get('fulfilled_at')).to.equalDate(fulfilledAt)
      return post.unfulfillRequest().then(() =>
        expect(post.get('fulfilled_at')).to.not.exist
      )
    })

    it('should remove contributors', () => {
      expect(post.relations.contributions).to.be.length(2)
      return post.unfulfillRequest().then(() =>
        expect(post.relations.contributors).to.equal([])
      )
    })

    // it('should remove related activities and notifications', () => {
    //   return Promise.map([Activity, Notification], model =>
    //     model.fetch().then(() =>
    //       expect(model.length).to.be(0)
    //     )
    //   )
    // })

  })
})

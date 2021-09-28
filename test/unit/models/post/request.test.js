import root from 'root-path'
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))
import { spyify, unspyify } from '../../../setup/helpers'

describe('post/request', () => {
  let author, contributor1, contributor2, post, group, fulfilledAt

  beforeEach(() => {
    fulfilledAt = new Date()
    return setup.clearDb().then(() => Promise.props({
      author: factories.user().save(),
      group: factories.group().save(),
      post: factories.post().save(),
      contributor1: factories.user().save(),
      contributor2: factories.user().save()
    }))
    .tap(fixtures => Promise.all([
        fixtures.post.save('user_id', fixtures.author.get('id')),
        fixtures.post.groups().attach(fixtures.group)
      ])
    )
    .then(fixtures => {
      return { author, contributor1, contributor2, post, group } = fixtures
    })
  })

  describe('#fulfill', () => {
    beforeEach(() => {
      spyify(Queue, 'classMethod')
      return post.fulfill({
        fulfilledAt,
        contributorIds: [contributor1.id, contributor2.id]
      })
      .then(post => post.fetch({withRelated: 'contributions'}))
    })

    after(() => unspyify(Queue, 'classMethod'))

    it('should add fulfilled time', () => {
      expect(post.get('fulfilled_at')).to.equalDate(fulfilledAt)
    })

    it('should add contributors', () => {
      expect(post.relations.contributions).to.be.length(2)
      expect(post.relations.contributions.map((c) => c.get('user_id')))
        .to.include.members([contributor1.id, contributor2.id])
    })

    it('should add activities and notifications to contributors', () => {
      post.relations.contributions.forEach((c) =>
        expect(Queue.classMethod).to.have.been.called
          .with('Contribution', 'createActivities', {contributionId: c.id}))
    })
  })

  describe('#unfulfill', () => {
    beforeEach(() =>
      post.fulfill({
        fulfilledAt,
        contributorIds: [contributor1.id, contributor2.id]
      })
      .then(post => post.fetch({withRelated: 'contributions'}))
    )

    it('should remove fulfilled time', () => {
      expect(post.get('fulfilled_at')).to.equalDate(fulfilledAt)
      return post.unfulfill().then(() =>
        expect(post.get('fulfilled_at')).to.not.exist
      )
    })

    it('should remove contributors', () => {
      expect(post.relations.contributions).to.be.length(2)
      return post.unfulfill().then(() =>
        expect(post.relations.contributors).to.be.undefined
      )
    })
    })
})

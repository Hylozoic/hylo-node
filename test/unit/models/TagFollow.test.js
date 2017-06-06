import root from 'root-path'
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))

describe('TagFollow', () => {
  var tag, community, user, attrs

  beforeEach(function (done) {
    return setup.clearDb().then(() => {
      tag = factories.tag()
      community = factories.community()
      user = factories.user()
    })
    .then(() => Promise.join(
      tag.save(),
      community.save(),
      user.save())
    .then(() => {
      attrs = {
        tag_id: tag.id,
        user_id: user.id,
        community_id: community.id
      }
    })
    .then(() => done()))
  })

  describe('#toggle', () => {
    it("creates a TagFollow when there isn't one", () => {
      return TagFollow.toggle(tag.id, user.id, community.id)
      .then(() => TagFollow.where(attrs).fetch())
      .then(tagFollow => {
        expect(tagFollow).to.exist
      })
    })

    it('deletes a TagFollow when there is one', () => {
      return new TagFollow(attrs).save()
      .then(() => TagFollow.toggle(tag.id, user.id, community.id))
      .then(() => TagFollow.where(attrs).fetch())
      .then(tagFollow => {
        expect(tagFollow).not.to.exist
      })
    })
  })

  describe('#subscribe', () => {
    it("creates a TagFollow when there isn't one only if isSubscribing", () => {
      return TagFollow.subscribe(tag.id, user.id, community.id, false)
      .then(() => TagFollow.where(attrs).fetch())
      .then(tagFollow => {
        expect(tagFollow).not.to.exist
      })
      .then(() => TagFollow.subscribe(tag.id, user.id, community.id, true))
      .then(() => TagFollow.where(attrs).fetch())
      .then(tagFollow => {
        expect(tagFollow).to.exist
      })
    })

    it('deletes a TagFollow when there is one only if not isSubscribing', () => {
      return new TagFollow(attrs).save()
      .then(() => TagFollow.subscribe(tag.id, user.id, community.id, true))
      .then(() => TagFollow.where(attrs).fetch())
      .then(tagFollow => {
        expect(tagFollow).to.exist
      })
      .then(() => TagFollow.subscribe(tag.id, user.id, community.id, false))
      .then(() => TagFollow.where(attrs).fetch())
      .then(tagFollow => {
        expect(tagFollow).not.to.exist
      })
    })
  })

  describe('#add', () => {
    it('creates a TagFollow and updates CommunityTag followers', () => {
      return new CommunityTag({
        community_id: community.id,
        tag_id: tag.id,
        num_followers: 5
      }).save()
      .then(() => TagFollow.add({
        tagId: tag.id,
        userId: user.id,
        communityId: community.id
      }))
      .then(() => TagFollow.where({
        tag_id: tag.id,
        community_id: community.id,
        user_id: user.id
      }).fetch())
      .then(tagFollow => {
        expect(tagFollow).to.exist
      })
      .then(() => CommunityTag.where({
        community_id: community.id,
        tag_id: tag.id
      }).fetch())
      .then(communityTag => {
        expect(communityTag.get('num_followers')).to.equal(6)
      })
    })
  })

  describe('#remove', () => {
    it('destroys a TagFollow and updates CommunityTag followers', () => {
      return Promise.join(
        new CommunityTag({
          community_id: community.id,
          tag_id: tag.id,
          num_followers: 5
        }).save(),
        new TagFollow(attrs).save()
      )
      .then(() => TagFollow.remove({
        tagId: tag.id,
        userId: user.id,
        communityId: community.id
      }))
      .then(() => TagFollow.where(attrs).fetch())
      .then(tagFollow => {
        expect(tagFollow).not.to.exist
      })
      .then(() => CommunityTag.where({
        community_id: community.id,
        tag_id: tag.id
      }).fetch())
      .then(communityTag => {
        expect(communityTag.get('num_followers')).to.equal(4)
      })
    })
  })
})

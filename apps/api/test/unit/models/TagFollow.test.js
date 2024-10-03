import root from 'root-path'
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))

describe('TagFollow', () => {
  let tag, group, user, attrs

  beforeEach(async function () {
    await setup.clearDb()
    tag = await factories.tag().save()
    group = await factories.group().save()
    user = await factories.user().save()
    attrs = {
      tag_id: tag.id,
      user_id: user.id,
      group_id: group.id
    }
  })

  describe('#toggle', () => {
    it("creates a TagFollow when there isn't one", () => {
      return TagFollow.toggle(tag.id, user.id, group.id)
        .then(() => TagFollow.where(attrs).fetch())
        .then(tagFollow => {
          expect(tagFollow).to.exist
        })
    })

    it('deletes a TagFollow when there is one', () => {
      return new TagFollow(attrs).save()
        .then(() => TagFollow.toggle(tag.id, user.id, group.id))
        .then(() => TagFollow.where(attrs).fetch())
        .then(tagFollow => {
          expect(tagFollow).not.to.exist
        })
    })
  })

  describe('#subscribe', () => {
    it("creates a TagFollow when there isn't one only if isSubscribing", () => {
      return TagFollow.subscribe(tag.id, user.id, group.id, false)
        .then(() => TagFollow.where(attrs).fetch())
        .then(tagFollow => {
          expect(tagFollow).not.to.exist
        })
        .then(() => TagFollow.subscribe(tag.id, user.id, group.id, true))
        .then(() => TagFollow.where(attrs).fetch())
        .then(tagFollow => {
          expect(tagFollow).to.exist
        })
    })

    it('deletes a TagFollow when there is one only if not isSubscribing', () => {
      return new TagFollow(attrs).save()
      .then(() => TagFollow.subscribe(tag.id, user.id, group.id, true))
      .then(() => TagFollow.where(attrs).fetch())
      .then(tagFollow => {
        expect(tagFollow).to.exist
      })
      .then(() => TagFollow.subscribe(tag.id, user.id, group.id, false))
      .then(() => TagFollow.where(attrs).fetch())
      .then(tagFollow => {
        expect(tagFollow).not.to.exist
      })
    })
  })

  describe('#add', () => {
    it('creates a TagFollow and updates GroupTag followers', () => {
      return new GroupTag({
        group_id: group.id,
        tag_id: tag.id,
        num_followers: 5
      }).save()
      .then(() => TagFollow.add({
        tagId: tag.id,
        userId: user.id,
        groupId: group.id
      }))
      .then(() => TagFollow.where({
        tag_id: tag.id,
        group_id: group.id,
        user_id: user.id
      }).fetch())
      .then(tagFollow => {
        expect(tagFollow).to.exist
      })
      .then(() => GroupTag.where({
        group_id: group.id,
        tag_id: tag.id
      }).fetch())
      .then(groupTag => {
        expect(groupTag.get('num_followers')).to.equal(6)
      })
    })
  })

  describe('#remove', () => {
    it('destroys a TagFollow and updates GroupTag followers', () => {
      return Promise.join(
        new GroupTag({
          group_id: group.id,
          tag_id: tag.id,
          num_followers: 5
        }).save(),
        new TagFollow(attrs).save()
      )
      .then(() => TagFollow.remove({
        tagId: tag.id,
        userId: user.id,
        groupId: group.id
      }))
      .then(() => TagFollow.where(attrs).fetch())
      .then(tagFollow => {
        expect(tagFollow).not.to.exist
      })
      .then(() => GroupTag.where({
        group_id: group.id,
        tag_id: tag.id
      }).fetch())
      .then(groupTag => {
        expect(groupTag.get('num_followers')).to.equal(4)
      })
    })
  })
})

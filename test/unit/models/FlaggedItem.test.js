import setup from '../../setup'
import factories from '../../setup/factories'
import mockRequire from 'mock-require'

describe('FlaggedItem', () => {
  const item = {
    category: 'abusive',
    reason: 'Said wombats were not cute. Just mean.',
    link: 'https://www.hylo.com/c/wombats/post/12345'
  }

  describe('create', () => {
    it('rejects an unrecognised category', () => {
      const p = FlaggedItem.create(Object.assign({}, item, { category: 'flarglearglestein' }))
      return expect(p).to.be.rejectedWith(/Unknown category/)
    })

    // These are mostly re-testing the validators, but shouldn't hurt to be thorough...
    it('rejects a non-Hylo URL', () => {
      const p = FlaggedItem.create(Object.assign({}, item, { link: 'https://google.com' }))
      return expect(p).to.be.rejectedWith(/valid Hylo URL/)
    })

    it('accepts a Hylo subdomain', () => {
      const p = FlaggedItem.create(Object.assign({}, item, { link: 'https://legacy.hylo.com' }))
      return expect(p).not.to.be.rejected
    })

    it('rejects on a missing URL', () => {
      const p = FlaggedItem.create(Object.assign({}, item, { link: undefined }))
      return expect(p).to.be.rejectedWith(/Link must be a string/)
    })

    it('rejects on a missing reason', () => {
      const p = FlaggedItem.create(Object.assign({}, item, { category: 'other', reason: undefined }))
      return expect(p).to.be.rejectedWith(/Reason must be a string/)
    })

    it('rejects on a huge reason', () => {
      const reason = new Array(6000).join('z')
      const p = FlaggedItem.create(Object.assign({}, item, { reason }))
      return expect(p).to.be.rejectedWith(/Reason must be no more than/)
    })
  })

  describe('getObject', () => {
    var post, comment, user

    before(() => {
      post = factories.post()
      comment = factories.comment()
      user = factories.user()
      return Promise.join(
        post.save(), comment.save(), user.save()
      )
    })

    it('returns a post', async () => {
      const flaggedItem = await FlaggedItem.create({
        object_type: FlaggedItem.Type.POST,
        object_id: post.id,
        category: FlaggedItem.Category.SPAM,
        link: 'www.hylo.com/post/1'
      })
      const object = await flaggedItem.getObject()
      expect(object.id).to.equal(post.id)
      expect(object instanceof Post).to.be.true
    })

    it('returns a user', async () => {
      const flaggedItem = await FlaggedItem.create({
        object_type: FlaggedItem.Type.MEMBER,
        object_id: user.id,
        category: FlaggedItem.Category.SPAM,
        link: 'www.hylo.com/post/1'
      })
      const object = await flaggedItem.getObject()
      expect(object.id).to.equal(user.id)
      expect(object instanceof User).to.be.true
    })

    it('returns a user', async () => {
      const flaggedItem = await FlaggedItem.create({
        object_type: FlaggedItem.Type.COMMENT,
        object_id: comment.id,
        category: FlaggedItem.Category.SPAM,
        link: 'www.hylo.com/post/1'
      })
      const object = await flaggedItem.getObject()
      expect(object.id).to.equal(comment.id)
      expect(object instanceof Comment).to.be.true
    })

    it('throws an error when object_type is bad', () => {
      return FlaggedItem.forge({
        object_type: 'unsupported type',
        object_id: 1
      }).save()
      .then(flaggedItem => flaggedItem.getObject())
      .then(() => expect.fail('should reject'))
      .catch(e => expect(e.message).to.match(/Unsupported type for Flagged Item/))
    })
  })

  describe('getMessageText', () => {
    var post, user, group

    before(() => {
      post = factories.post()
      group = factories.group()
      user = factories.user()
      return Promise.join(
        post.save(), group.save(), user.save()
      )
    })

    it('creates the message', async () => {
      const reason = 'real spam'
      const flaggedItem = await FlaggedItem.create({
        object_type: FlaggedItem.Type.POST,
        object_id: post.id,
        category: FlaggedItem.Category.SPAM,
        link: 'www.hylo.com/post/1',
        reason,
        user_id: user.id
      })
      await flaggedItem.load('user')
      const expected = [
        `${user.get('name')} flagged a ${FlaggedItem.Type.POST} in ${group.get('name')} for being ${FlaggedItem.Category.SPAM}`,
        `Message: ${reason}`
      ]
      const message = await flaggedItem.getMessageText(group)
      const lines = message.split('\n')
      expect(lines[0]).to.equal(expected[0])
      expect(lines[1]).to.equal(expected[1])
    })
  })

  describe('getContentLink', () => {
    var post, comment, commentParent, user, group

    before(() => {
      post = factories.post()
      commentParent = factories.post()
      comment = factories.comment()
      user = factories.user()
      group = factories.group()
      return Promise.join(
        post.save(), comment.save(), user.save(), group.save(), commentParent.save()
      )
      .then(() => {
        commentParent.comments().create(comment)
      })
    })

    it('makes a post link', async () => {
      const flaggedItem = await FlaggedItem.create({
        object_type: FlaggedItem.Type.POST,
        object_id: post.id,
        category: FlaggedItem.Category.SPAM,
        link: 'www.hylo.com/post/1'
      })
      const link = await flaggedItem.getContentLink(group)
      expect(link).to.equal(Frontend.Route.post(post.id, group))
    })

    it('makes a user link', async () => {
      const flaggedItem = await FlaggedItem.create({
        object_type: FlaggedItem.Type.MEMBER,
        object_id: user.id,
        category: FlaggedItem.Category.SPAM,
        link: 'www.hylo.com/post/1'
      })
      const link = await flaggedItem.getContentLink(group)
      expect(link).to.equal(Frontend.Route.profile(user.id, group))
    })

    it('makes a comment link', async () => {
      const flaggedItem = await FlaggedItem.create({
        object_type: FlaggedItem.Type.COMMENT,
        object_id: comment.id,
        category: FlaggedItem.Category.SPAM,
        link: 'www.hylo.com/post/1'
      })
      const link = await flaggedItem.getContentLink(group)

      expect(link).to.equal(Frontend.Route.comment({ post: commentParent, group, comment }))
    })

    it('throws an error when object_type is bad', () => {
      return FlaggedItem.forge({
        object_type: 'unsupported type',
        object_id: 1
      }).save()
      .then(flaggedItem => flaggedItem.getContentLink(group))
      .then(() => expect.fail('should reject'))
      .catch(e => expect(e.message).to.match(/Unsupported type for Flagged Item/))
    })
  })

  describe('notifyModerators', () => {
    var notifyModeratorsPost, notifyModeratorsComment, notifyModeratorsMember, FlaggedItem

    beforeEach(() => {
      notifyModeratorsPost = spy()
      notifyModeratorsMember = spy()
      notifyModeratorsComment = spy()
      mockRequire('../../../api/models/flaggedItem/notifyUtils', {
        notifyModeratorsPost,
        notifyModeratorsMember,
        notifyModeratorsComment
      })
      FlaggedItem = mockRequire.reRequire('../../../api/models/FlaggedItem')
    })

    it('calls post function on post', async () => {
      const flaggedItem = await FlaggedItem.create({
        object_type: FlaggedItem.Type.POST,
        object_id: 1,
        category: FlaggedItem.Category.SPAM,
        link: 'www.hylo.com/post/1'
      })

      await FlaggedItem.notifyModerators({id: flaggedItem.id})
      expect(notifyModeratorsPost).to.have.been.called()
      expect(notifyModeratorsComment).not.to.have.been.called()
    })

    it('calls comment function on comment', async () => {
      const flaggedItem = await FlaggedItem.create({
        object_type: FlaggedItem.Type.COMMENT,
        object_id: 1,
        category: FlaggedItem.Category.SPAM,
        link: 'www.hylo.com/post/1'
      })

      await FlaggedItem.notifyModerators({id: flaggedItem.id})
      expect(notifyModeratorsComment).to.have.been.called()
      expect(notifyModeratorsMember).not.to.have.been.called()
    })

    it('calls member function on member', async () => {
      const flaggedItem = await FlaggedItem.create({
        object_type: FlaggedItem.Type.MEMBER,
        object_id: 1,
        category: FlaggedItem.Category.SPAM,
        link: 'www.hylo.com/post/1'
      })

      await FlaggedItem.notifyModerators({id: flaggedItem.id})
      expect(notifyModeratorsMember).to.have.been.called()
      expect(notifyModeratorsPost).not.to.have.been.called()
    })

    it('throws an error when object_type is bad', () => {
      return FlaggedItem.forge({
        object_type: 'unsupported type',
        object_id: 1
      }).save()
      .then(flaggedItem => FlaggedItem.notifyModerators({id: flaggedItem.id}))
      .then(() => expect.fail('should reject'))
      .catch(e => expect(e.message).to.match(/Unsupported type for Flagged Item/))
    })
  })
})

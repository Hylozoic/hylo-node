import { create, reinviteAll, find } from '../services/InvitationService'

const parseEmailList = emails =>
  (emails || '').split(/,|\n/).map(email => {
    var trimmed = email.trim()
    // use only the email portion of a "Joe Bloggs <joe@bloggs.org>" line
    var match = trimmed.match(/.*<(.*)>/)
    return match ? match[1] : trimmed
  })

// this should match how UserPresenter shows the user's memberships (TODO: DRY)
const present = (membership, invitation, preexisting) =>
  Promise.props(Object.assign(membership.toJSON(), {
    community: membership.relations.community.pick('id', 'slug', 'name', 'avatar_url'),
    tagName: invitation.tagName(),
    preexisting
  }))

module.exports = {
  findOne: function (req, res) {
    return Invitation.find(req.param('token'), {withRelated: 'community'})
    .then(invitation => {
      if (!invitation) {
        return res.status(422).send('bad token')
      }

      return res.ok(invitation.relations.community.pick('id', 'name', 'slug', 'avatar_url'))
    })
  },

  use: function (req, res) {
    const { userId } = req.session
    return Invitation.find(req.param('token'), {withRelated: 'tag'})
    .then(invitation => {
      if (!invitation) {
        return res.status(422).send('bad token')
      }

      if (invitation.isUsed() && userId !== invitation.get('used_by_id')) {
        return res.status(422).send('used token')
      }

      const preexisting = invitation.isUsed()
      return invitation.use(userId)
      .then(mship => mship.load('community'))
      .then(mship => present(mship, invitation, preexisting))
      .then(res.ok)
      .catch(res.serverError)
    })
  },

  find: function (req, res) {
    return find({
      communityId: req.param('communityId'),
      limit: req.param('limit'),
      offset: req.param('offset')
    })
    .then(res.ok)
  },

  create: function (req, res) {
    const tagName = req.param('tagName')
    const userIds = req.param('users')
    const rawEmails = req.param('emails')
    const communityId = req.param('communityId')
    const message = req.param('message')
    const moderator = req.param('moderator')
    const subject = req.param('subject')

    const emails = (rawEmails ? parseEmailList(rawEmails) : [])

    return create({
      sessionUserId: req.session.userId,
      communityId,
      tagName,
      userIds,
      emails,
      message,
      isModerator: moderator,
      subject})
    .then(results => res.ok({results}))
  },

  reinviteAll: function (req, res) {
    return reinviteAll({
      communityId: res.locals.community.id,
      subject: req.param('subject'),
      message: req.param('message'),
      moderator: req.param('moderator'),
      sessionUserId: req.session.userId
    })
    .then(() => res.ok({}))
    .catch(res.serverError)
  }
}

import { find, includes, merge, pick } from 'lodash'
import { map } from 'lodash/fp'

var setupReputationQuery = function (req, model) {
  const { userId, limit, start, offset } = req.allParams()

  return (req.session.userId === userId
    ? Promise.resolve()
    : Membership.activeCommunityIds(req.session.userId))
  .then(communityIds =>
    model.queryForUser(userId, communityIds).query(q => {
      q.limit(limit || 15)
      q.offset(start || offset || 0)
    }))
}

const countTaggedPosts = (userIds, tagId) =>
  bookshelf.knex('posts')
  .join('posts_tags', 'posts.id', 'posts_tags.post_id')
  .where('posts.user_id', 'in', userIds)
  .where('posts_tags.tag_id', tagId)
  .groupBy('user_id')
  .select(bookshelf.knex.raw('count(*), user_id'))

module.exports = {
  create: function (req, res) {
    const { name, email, password } = req.allParams()

    return User.create({name, email, account: {type: 'password', password}})
    .tap(user => Analytics.trackSignup(user.id, req))
    .tap(user => req.param('login') && UserSession.login(req, user, 'password'))
    .then(user => {
      if (req.param('resp') === 'user') {
        return UserPresenter.fetchAndPresentForSelf(user.id, req.session, Admin.isSignedIn(req))
        .then(res.ok)
      } else {
        return res.ok({})
      }
    })
    .catch(function (err) {
      res.status(422).send(err.detail ? err.detail : err)
    })
  },

  status: function (req, res) {
    res.ok({signedIn: UserSession.isLoggedIn(req)})
  },

  findSelf: function (req, res) {
    const { userId } = req.session
    return UserPresenter.fetchAndPresentForSelf(userId, req.session, Admin.isSignedIn(req))
    .then(res.ok)
    .catch(err => {
      if (err.message === 'User not found') return res.ok({})
      throw err
    })
    .catch(res.serverError)
  },

  findOne: function (req, res) {
    return UserPresenter.fetchForOther(req.param('userId'), req.session.userId)
    .then(UserPresenter.normalizeUser)
    .then(res.ok)
    .catch(err => {
      if (err.message === 'User not found') {
        return res.notFound()
      }
      res.serverError(err)
    })
  },

  contributions: function (req, res) {
    return setupReputationQuery(req, Contribution)
    .then(q => q.fetchAll({
      withRelated: [
        {post: q => q.column('id', 'name', 'user_id', 'type')},
        {'post.user': q => q.column('id', 'name', 'avatar_url')},
        {'post.communities': q => q.column('communities.id', 'name')}
      ]
    }))
    .then(res.ok, res.serverError)
  },

  thanks: function (req, res) {
    return setupReputationQuery(req, Thank)
    .then(q => q.fetchAll({
      withRelated: [
        {thankedBy: q => q.column('id', 'name', 'avatar_url')},
        {comment: q => q.column('id', 'text', 'post_id', 'created_at')},
        {'comment.post.user': q => q.column('id', 'name', 'avatar_url')},
        {'comment.post': q => q.column('posts.id', 'name', 'user_id', 'type')},
        {'comment.post.communities': q => q.column('communities.id', 'name')}
      ]
    }))
    .then(res.ok, res.serverError)
  },

  update: function (req, res) {
    return User.find(req.param('userId') || req.session.userId)
    .then(user => user.validateAndSave(req.allParams()))
    .then(() => res.ok({}))
    .catch(function (err) {
      if (includes(['invalid-email', 'duplicate-email'], err.message)) {
        res.statusCode = 422
        res.send(req.__(err.message))
      } else {
        res.serverError(err)
      }
    })
  },

  sendPasswordReset: function (req, res) {
    var email = req.param('email')
    User.where('email', email).fetch().then(function (user) {
      if (!user) {
        res.ok({error: 'no user'})
      } else {
        user.generateToken().then(function (token) {
          Queue.classMethod('Email', 'sendPasswordReset', {
            email: user.get('email'),
            templateData: {
              login_url: Frontend.Route.tokenLogin(user, token)
            }
          })
          res.ok({})
        })
      }
    })
    .catch(res.serverError.bind(res))
  },

  findForCommunity: function (req, res) {
    const opts = pick(req.allParams(), 'limit', 'offset', 'search')
    return fetchAndPresentForCommunityIds([res.locals.community.id], opts)
    .then(res.ok)
    .catch(res.serverError)
  },

  findForNetwork: function (req, res) {
    const opts = pick(req.allParams(), 'limit', 'offset', 'search')
    Network.find(req.param('networkId'))
    .then(network => Community.where('network_id', network.id).query().pluck('id'))
    .then(ids => fetchAndPresentForCommunityIds(ids, opts))
    .then(res.ok)
    .catch(res.serverError)
  },

  findAll: function (req, res) {
    const opts = pick(req.allParams(), 'limit', 'offset', 'search')
    Membership.activeCommunityIds(req.session.userId)
    .then(ids => fetchAndPresentForCommunityIds(ids, opts))
    .then(res.ok)
    .catch(res.serverError)
  },

  resetTooltips: function (req, res) {
    const userId = req.param('userId') || req.session.userId
    return User.resetTooltips(userId)
    .then(() => res.ok({}))
    .catch(res.serverError)
  }

}

const fetchAndPresentForCommunityIds = (communityIds, opts) =>
  Search.forUsers({
    communities: communityIds,
    limit: opts.limit || 20,
    offset: opts.offset || 0,
    term: opts.search
  }).fetchAll({withRelated: ['memberships', 'tags']})
  .then(users => {
    const total = (users.length > 0 ? users.first().get('total') : 0)
    return Promise.map(users.models, u => UserPresenter.presentForList(u, {communityIds}))
    .tap(addOfferCounts)
    .then(items => ({items, total}))
  })

const addOfferCounts = users =>
  Tag.find('offer')
  .then(tag => countTaggedPosts(map('id', users), tag.id))
  .then(counts => users.forEach(user => merge(user, {
    offerCount: (find(counts, c => c.user_id === user.id) || {}).count
  })))

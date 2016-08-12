import { get } from 'lodash/fp'
import { difference, includes, merge, omit, pick, pickBy } from 'lodash'
import {
  createPost, updateChildren, updateAllMedia, updateCommunities
} from '../models/post/util'
import {
  handleMissingTagDescriptions, throwErrorIfMissingTags,
  handleInvalidFinancialRequestsAmountError, handlePostValidations
} from '../../lib/util/controllers'
import * as PostValidator from '../services/PostValidator'

const createCheckFreshnessAction = require('../../lib/freshness').createCheckFreshnessAction
const sortColumns = {
  'fulfilled-last': 'fulfilled_at',
  'top': 'post.num_votes',
  'recent': 'post.updated_at',
  'suggested': 'suggested',
  'start_time': ['post.start_time', 'asc']
}

const queryPosts = (req, opts) =>
  // using Promise.props here allows us to pass subqueries, e.g. when looking up
  // communities in queryForUser
  Promise.props(merge(
    {
      sort: sortColumns[opts.sort || req.param('sort') || 'recent'],
      forUser: req.session.userId,
      term: req.param('search')
    },
    pick(req.allParams(),
      'type', 'limit', 'offset', 'start_time', 'end_time', 'filter', 'omit'),
    omit(opts, 'sort')
  ))
  .then(Search.forPosts)

const fetchAndPresentPosts = function (query, userId, relationsOpts) {
  return query.fetchAll({
    withRelated: PostPresenter.relationsForList(userId, relationsOpts || {})
  })
  .then(posts => ({
    posts_total: (posts.first() ? Number(posts.first().get('total')) : 0),
    posts: posts.map(p => PostPresenter.presentForList(p, userId, relationsOpts))
  }))
}

const queryForCommunity = function (req, res) {
  if (TokenAuth.isAuthenticated(res)) {
    if (!RequestValidation.requireTimeRange(req, res)) return
  }

  return Network.containsUser(res.locals.community.get('network_id'), req.session.userId)
  .then(contains => queryPosts(req, {
    communities: [res.locals.community.id],
    visibility: ((res.locals.membership || contains) ? null : Post.Visibility.PUBLIC_READABLE),
    currentUserId: req.session.userId,
    tag: req.param('tag') && Tag.find(req.param('tag')).then(t => t.id)
  }))
}

const queryForUser = function (req, res) {
  return queryPosts(req, {
    tag: req.param('tag') && Tag.find(req.param('tag')).then(t => t.id),
    users: [req.param('userId')],
    communities: Membership.activeCommunityIds(req.session.userId),
    visibility: (req.session.userId ? null : Post.Visibility.PUBLIC_READABLE)
  })
}

const queryForAllForUser = function (req, res) {
  return queryPosts(req, {
    communities: Membership.activeCommunityIds(req.session.userId),
    currentUserId: req.session.userId
  })
}

const queryForFollowed = function (req, res) {
  return Promise.resolve(Search.forPosts({
    follower: req.session.userId,
    limit: req.param('limit') || 10,
    offset: req.param('offset'),
    sort: 'post.updated_at',
    type: 'all+welcome',
    term: req.param('search')
  }))
}

const queryForNetwork = function (req, res) {
  return Network.find(req.param('networkId'))
  .then(network => Community.where({network_id: network.id}).fetchAll())
  .then(communities => queryPosts(req, {
    communities: communities.map(c => c.id),
    visibility: [Post.Visibility.DEFAULT, Post.Visibility.PUBLIC_READABLE]
  }))
}

const queryForTagInAllCommunities = function (req, res) {
  return Tag.find(req.param('tagName'))
  .then(tag => {
    if (!tag) {
      res.notFound()
      return
    }

    return queryPosts(req, {
      communities: Membership.activeCommunityIds(req.session.userId),
      tag: tag.id
    })
  })
}

const createFindAction = (queryFunction) => (req, res) => {
  return queryFunction(req, res)
  .then(query => query && fetchAndPresentPosts(query, req.session.userId,
    {
      withComments: req.param('comments') && 'recent',
      withVotes: req.param('votes'),
      forCommunity: req.param('communityId')
    }))
  .then(res.ok, res.serverError)
}

// throw an error if a tag is included in the post that does not yet exist in
// one of the specified communities, but no description is supplied
const checkPostTags = (attrs, opts) => {
  var tags = Tag.tagsInText(attrs.name + ' ' + attrs.description)
  if (opts.tag && !includes(['event', 'project'], opts.type)) tags.push(opts.tag)

  const describedTags = Object.keys(pickBy(opts.tagDescriptions, (v, k) => !!v))
  tags = difference(tags, describedTags)
  return throwErrorIfMissingTags(tags, opts.communities)
}

const checkFinancialRequestsEnabled = (communities, amount) => {
   const error = new Error('Financial Requests Amount error')

   if(amount > 0 && communities != undefined && communities.length > 1){
     error.invalidFinancialRequestsAmountError = "More than 1 communities for financial enabled project"
     throw error
   }

   return Community.find(communities[0]).then(community => {
    if(community != undefined && (!community.get('financial_requests_enabled')) && amount > 0){
      error.invalidFinancialRequestsAmountError = "Not a financial contribution enabled community"
      throw error
    }
    return
   })
}

const PostController = {
  findOne: function (req, res) {
    var opts = {
      withComments: req.param('comments') && 'all',
      withVotes: !!req.param('votes'),
      withChildren: !!req.param('children')
    }
    res.locals.post.load(PostPresenter.relations(req.session.userId, opts))
    .then(post => PostPresenter.present(post, req.session.userId, opts))
    .then(res.ok)
    .catch(res.serverError)
  },

  create: function (req, res) {
    const params = req.allParams()

    if (params.financialRequestAmount) {
      params.financialRequestAmount = parseFloat(params.financialRequestAmount)
    }

    const errors = PostValidator.validate(params)

    if (errors.length > 0) {
      res.status(422).send({errors: errors})
      return Promise.resolve()
    }

    return checkPostTags(
      pick(params, 'name', 'description'),
      pick(params, 'type', 'tag', 'communities', 'tagDescriptions')
    )
    .then(() => checkFinancialRequestsEnabled(
     params.communities,
     params.financialRequestAmount)
    )
    .then(() => createPost(req.session.userId, params))
    .then(post => post.load(PostPresenter.relations(req.session.userId)))
    .then(PostPresenter.present)
    .then(res.ok)
    .catch(err => {
      if (handleMissingTagDescriptions(err, res)) return
      if (handleInvalidFinancialRequestsAmountError(err, res)) return
      res.serverError(err)
    })
  },

  createFromEmailForm: function (req, res) {
    try {
      var tokenData = Email.decodePostCreationToken(req.param('token'))
    } catch (e) {
      return res.serverError(new Error('Invalid token: ' + req.param('token')))
    }

    const namePrefixes = {
      offer: "I'd like to share",
      request: "I'm looking for",
      intention: "I'd like to create"
    }

    const type = req.param('type')
    if (!includes(Object.keys(namePrefixes), type)) {
      return res.serverError(new Error(`invalid type: ${type}`))
    }

    const attributes = {
      created_from: 'email_form',
      name: `${namePrefixes[type]} ${req.param('name')}`,
      communities: [tokenData.communityId],
      tag: type,
      description: req.param('description')
    }

    return createPost(tokenData.userId, attributes)
    .tap(post => Community.find(tokenData.communityId)
      .then(c => Analytics.track({
        userId: tokenData.userId,
        event: 'Add Post by Email Form',
        properties: {community: c.get('name')}
      })))
    .then(post => res.redirect(Frontend.Route.post(post)), res.serverError)
  },

  follow: function (req, res) {
    var userId = req.session.userId
    var post = res.locals.post
    Follow.query().where({user_id: userId, post_id: post.id}).count()
    .then(function (rows) {
      if (Number(rows[0].count) > 0 || req.param('force') === 'unfollow') {
        return post.removeFollower(userId, {createActivity: true})
        .then(() => res.ok({}))
      }

      return post.addFollowers([userId], userId, {createActivity: true})
      .then(() => User.find(req.session.userId))
      .then(user => res.ok(pick(user.attributes, 'id', 'name', 'avatar_url')))
    })
    .catch(res.serverError)
  },

  update: function (req, res) {
    const post = res.locals.post
    const params = req.allParams()

    if (params.financialRequestAmount) {
      params.financialRequestAmount = parseFloat(params.financialRequestAmount)
    }

    const attrs = merge(
      pick(params, 'name', 'description', 'type', 'start_time', 'end_time', 'location'),
      {
        updated_at: new Date(),
        visibility: Post.Visibility[params.public ? 'PUBLIC_READABLE' : 'DEFAULT'],
        link_preview_id: get('id', params.linkPreview)
      }
    )

    return checkPostTags(
      pick(params, 'name', 'description'),
      pick(params, 'type', 'tag', 'communities', 'tagDescriptions')
    )
    .then(() => bookshelf.transaction(trx =>
      Post.find(params.id)
      .then(originalPost => originalPost.load(PostPresenter.relations(req.session.userId)))
      .then(PostPresenter.present)
      .then(originalPost => PostValidator.validate(merge(params, {originalPost})))
      .then(errors => {
        if (errors.length > 0) {
          let error = new Error()
          error.postValidations = errors
          throw error
        }
      })
      .then(() => post.save(attrs, {patch: true, transacting: trx})
      .tap(() => updateChildren(post, req.param('requests'), trx))
      .tap(() => updateCommunities(post, req.param('communities'), trx))
      .tap(() => updateAllMedia(post, params, trx))
      .tap(() => Tag.updateForPost(post, req.param('tag'), req.param('tagDescriptions'), trx)))))
    .then(() => post.load(PostPresenter.relations(req.session.userId, {withChildren: true})))
    .then(post => PostPresenter.present(post, req.session.userId, {withChildren: true}))
    .then(res.ok)
    .catch(err => {
      if (handleMissingTagDescriptions(err, res)) return
      if (handlePostValidations(err, res)) return
      res.serverError(err)
    })
  },

  fulfill: function (req, res) {
    bookshelf.transaction(function (trx) {
      return res.locals.post.save({
        fulfilled_at: new Date()
      }, {patch: true, transacting: trx})
      .tap(function () {
        return Promise.map(req.param('contributors'), function (userId) {
          return new Contribution({
            post_id: res.locals.post.id,
            user_id: userId,
            date_contributed: new Date()
          }).save(null, {transacting: trx})
        })
      })
    })
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  vote: function (req, res) {
    var post = res.locals.post

    post.votes().query({where: {user_id: req.session.userId}}).fetchOne()
    .then(vote => bookshelf.transaction(trx => {
      var inc = delta => () => Post.query().where('id', post.id).increment('num_votes', delta).transacting(trx)

      return (vote
        ? vote.destroy({transacting: trx}).then(inc(-1))
        : new Vote({
          post_id: res.locals.post.id,
          user_id: req.session.userId
        }).save().then(inc(1)))
    }))
    .then(() => res.ok({}), res.serverError)
  },

  destroy: function (req, res) {
    return Post.deactivate(res.locals.post.id)
    .then(() => res.ok({}), res.serverError)
  },

  complain: function (req, res) {
    var post = res.locals.post

    User.find(req.session.userId)
    .then(user => Email.sendRawEmail('hello@hylo.com', {
      subject: 'Objectionable content report',
      body: format(
        '%s &lt;%s&gt; has flagged %s as objectionable',
        user.get('name'), user.get('email'),
        Frontend.Route.post(post)
      )
    }))
    .then(() => res.ok({}), res.serverError)
  },

  rsvp: function (req, res) {
    var userId = req.session.userId
    var post = res.locals.post
    var response = req.param('response')

    EventResponse.query(qb => {
      qb.where({user_id: userId, post_id: post.id})
      qb.orderBy('created_at', 'desc')
    }).fetch()
    .then(eventResponse => {
      if (eventResponse) {
        if (eventResponse.get('response') === response) {
          return eventResponse.destroy()
        } else {
          return eventResponse.save({response: response}, {patch: true})
        }
      } else {
        return EventResponse.create(post.id, {responderId: userId, response: response})
      }
    })
    .then(() => res.ok({}), res.serverError)
  }
}

const queries = [
  ['Community', queryForCommunity],
  ['User', queryForUser],
  ['AllForUser', queryForAllForUser],
  ['Followed', queryForFollowed],
  ['Network', queryForNetwork],
  ['TagInAllCommunities', queryForTagInAllCommunities]
]

queries.forEach(tuple => {
  const key = tuple[0]
  const fn = tuple[1]
  PostController['checkFreshnessFor' + key] = createCheckFreshnessAction(fn, 'posts')
  PostController['findFor' + key] = createFindAction(fn)
})

module.exports = PostController

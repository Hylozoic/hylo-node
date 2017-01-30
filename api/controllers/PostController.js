/* globals LastRead */
import { get, getOr } from 'lodash/fp'
import {
  difference, includes, intersection, isEmpty, merge, omit, pick, pickBy
} from 'lodash'
import {
  createPost, createThread, updateChildren, updateAllMedia, updateCommunities
} from '../models/post/util'
import {
  handleMissingTagDescriptions, throwErrorIfMissingTags
} from '../../lib/util/controllers'
import { normalizePost, uniqize } from '../../lib/util/normalize'

const createCheckFreshnessAction = require('../../lib/freshness').createCheckFreshnessAction
const sortColumns = {
  'fulfilled-last': 'fulfilled_at',
  'top': 'posts.num_votes',
  'recent': 'posts.updated_at',
  'suggested': 'suggested',
  'starts_at': ['posts.starts_at', 'asc']
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
      'type', 'limit', 'offset', 'starts_at', 'ends_at', 'filter', 'omit'),
    omit(opts, 'sort')
  ))
  .then(Search.forPosts)

const normalize = post => {
  const data = {communities: [], people: []}
  normalizePost(post, data, true)
  return Object.assign(data, post)
}

const fetchAndPresentPosts = function (query, userId, relationsOpts) {
  return query.fetchAll({
    withRelated: PostPresenter.relationsForList(userId, relationsOpts || {})
  })
  .then(posts => {
    const data = {
      posts_total: (posts.first() ? Number(posts.first().get('total')) : 0),
      posts: posts.map(p => PostPresenter.presentForList(p, userId, relationsOpts))
    }
    const buckets = {communities: [], people: []}
    data.posts.forEach((post, i) => normalizePost(post, buckets, i === data.posts.length - 1))
    return Object.assign(data, buckets)
  })
  .tap(data =>
    Promise.map(data.posts, p => PostPresenter.presentProjectActivity(p, data, userId, relationsOpts))
    .tap(posts => {
      data.posts = posts
      uniqize(data)
    }))
}

const findTagId = req =>
  req.param('tag') && Tag.find(req.param('tag')).then(get('id'))

const queryForCommunity = function (req, res) {
  return Network.containsUser(res.locals.community.get('network_id'), req.session.userId)
  .then(contains => queryPosts(req, {
    communities: [res.locals.community.id],
    visibility: ((res.locals.membership || contains) ? null : Post.Visibility.PUBLIC_READABLE),
    currentUserId: req.session.userId,
    tag: findTagId(req)
  }))
}

const queryForUser = function (req, res) {
  return queryPosts(req, {
    tag: findTagId(req),
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
    sort: 'posts.updated_at',
    type: 'all+welcome',
    term: req.param('search')
  }))
}

const queryForPost = function (req, res) {
  return queryPosts(req, {
    parent_post_id: res.locals.post.id,
    currentUserId: req.session.userId
  })
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

const queryForThreads = function (req, res) {
  return queryPosts(req, {
    type: 'thread',
    sort: 'recent',
    follower: req.session.userId
  })
}

const createFindAction = (queryFunction) => (req, res) => {
  return queryFunction(req, res)
  .then(query => query && fetchAndPresentPosts(query, req.session.userId,
    {
      withComments: req.param('comments') && 'recent',
      withVotes: req.param('votes'),
      withReadTimes: req.param('reads'),
      forCommunity: req.param('communityId')
    }
  ))
  .then(res.ok, res.serverError)
}

// throw an error if a tag is included in the post that does not yet exist in
// one of the specified communities, but no description is supplied
const checkPostTags = (attrs, userId, opts) => {
  var tags = Tag.tagsInText(attrs.name + ' ' + attrs.description)
  if (opts.tag) tags.push(opts.tag)

  const describedTags = Object.keys(pickBy(opts.tagDescriptions, (v, k) => !!v))
  tags = difference(tags, describedTags)
  if (isEmpty(tags)) return Promise.resolve()

  return Membership.where({active: true, user_id: userId})
  .query().pluck('community_id')
  .then(communityIds =>
    throwErrorIfMissingTags(tags, intersection(communityIds, opts.community_ids)))
}

const emptyResponse = res => err => err ? res.serverError(err) : res.ok({})

const PostController = {
  findThreads: createFindAction(queryForThreads),
  findOne: function (req, res) {
    var opts = {
      withComments: req.param('comments') && 'all',
      withVotes: !!req.param('votes'),
      withChildren: !!req.param('children')
    }
    res.locals.post.load(PostPresenter.relations(req.session.userId, opts))
    .then(post => PostPresenter.present(post, req.session.userId, opts))
    .then(normalize)
    .then(res.ok)
    .catch(res.serverError)
  },

  create: function (req, res) {
    const params = req.allParams()
    if (!params.name) {
      res.status(422).send("title can't be blank")
      return Promise.resolve()
    }

    return checkPostTags(
      pick(params, 'name', 'description'),
      req.session.userId,
      pick(params, 'type', 'tag', 'community_ids', 'tagDescriptions')
    )
    .then(() => createPost(req.session.userId, params))
    .then(post => post.load(PostPresenter.relations(req.session.userId, {communities: params.community_ids})))
    .then(PostPresenter.present)
    .then(normalize)
    .then(res.ok)
    .catch(err => {
      if (handleMissingTagDescriptions(err, res)) return
      res.serverError(err)
    })
  },

  findOrCreateThread: function (req, res) {
    const params = req.allParams()
    const currentUserId = req.session.userId
    const otherUserId = params.messageTo

    if (!otherUserId) {
      res.status(422).send('messageTo must be included')
      return Promise.resolve()
    }

    params.type = Post.Type.THREAD

    return Post.query(q => {
      q.join('follows', 'follows.post_id', 'posts.id')
      q.where('posts.type', Post.Type.THREAD)
      q.where('posts.id', 'in', Follow.query().where('user_id', currentUserId).select('post_id'))
      q.where('post_id', 'in', Follow.query().where('user_id', otherUserId).select('post_id'))
      q.where('post_id', 'not in', Follow.query().where('user_id', 'not in', [currentUserId, otherUserId]).select('post_id'))
      q.groupBy('posts.id')
    }).fetch()
    .then(post => post || createThread(currentUserId, params))
    .then(post => post.load(PostPresenter.relations(currentUserId)))
    .then(PostPresenter.present)
    .then(res.ok)
    .catch(res.serverError)
  },

  createFromEmailForm: function (req, res) {
    const { tokenData: { userId, communityId } } = res.locals
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
      community_ids: [communityId],
      tag: type,
      description: req.param('description')
    }

    return Post.where({name: attributes.name, user_id: userId}).fetch()
    .then(post => {
      if (post && (new Date() - post.get('created_at') < 5 * 60000)) return res.redirect(Frontend.Route.post(post))
      return createPost(userId, attributes)
      .tap(post => Community.find(communityId)
        .then(c => Analytics.track({
          userId,
          event: 'Add Post by Email Form',
          properties: {community: c.get('name')}
        })))
      .then(post => res.redirect(Frontend.Route.post(post)), res.serverError)
    })
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

  unfollow: function (req, res) {
    return res.locals.post.removeFollower(req.session.userId)
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  update: function (req, res) {
    const post = res.locals.post
    const params = req.allParams()

    const attrs = merge(
      pick(params, 'name', 'description', 'type', 'starts_at', 'ends_at', 'location'),
      {
        updated_at: new Date(),
        visibility: Post.Visibility[params.public ? 'PUBLIC_READABLE' : 'DEFAULT'],
        link_preview_id: getOr(null, 'id', params.linkPreview)
      }
    )

    return checkPostTags(
      pick(params, 'name', 'description'),
      req.session.userId,
      pick(params, 'type', 'tag', 'community_ids', 'tagDescriptions')
    )
    .then(() => bookshelf.transaction(trx =>
      post.save(attrs, {patch: true, transacting: trx})
      .tap(() => updateChildren(post, req.param('requests'), trx))
      .tap(() => updateCommunities(post, req.param('community_ids'), trx))
      .tap(() => updateAllMedia(post, params, trx))
      .tap(() => Tag.updateForPost(post, req.param('tag'), req.param('tagDescriptions'), req.session.userId, trx))))
    .then(() => post.load(PostPresenter.relations(req.session.userId, {withChildren: true})))
    .then(post => PostPresenter.present(post, req.session.userId, {withChildren: true}))
    .then(normalize)
    .then(res.ok)
    .catch(err => {
      if (handleMissingTagDescriptions(err, res)) return
      res.serverError(err)
    })
  },

  updateLastRead: function (req, res) {
    const { post } = res.locals
    const userId = req.session.userId
    return LastRead.findOrCreate(userId, post.id)
    .tap(lastRead => lastRead.setToNow())
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  fulfill: function (req, res) {
    const { post } = res.locals
    const contributorIds = req.param('contributorIds') || []
    const fulfilledAt = post.get('fulfilled_at')
    const result = fulfilledAt
      ? post.unfulfillRequest()
      : post.fulfillRequest({contributorIds})
    result.then(() => res.ok({}))
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
  },

  subscribe: function (req, res) {
    var post = res.locals.post
    sails.sockets.join(req, `posts/${post.id}`, function (err) {
      if (err) {
        return res.serverError(err)
      }
      return res.ok({})
    })
  },

  unsubscribe: function (req, res) {
    var post = res.locals.post
    sails.sockets.leave(req, `posts/${post.id}`, emptyResponse(res))
  },

  typing: function (req, res) {
    var post = res.locals.post
    res.ok({})

    User.find(req.session.userId)
    .then(user => {
      post.pushTypingToSockets(user.id, user.get('name'), req.body.isTyping, req.socket)
    })
  },

  subscribeToThreads: function (req, res) {
    sails.sockets.join(req, `users/${req.session.userId}`, emptyResponse(res))
  },

  unsubscribeFromThreads: function (req, res) {
    sails.sockets.leave(req, `users/${req.session.userId}`, emptyResponse(res))
  }
}

const queries = [
  ['Community', queryForCommunity],
  ['User', queryForUser],
  ['AllForUser', queryForAllForUser],
  ['Followed', queryForFollowed],
  ['Post', queryForPost],
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

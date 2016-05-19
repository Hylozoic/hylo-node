import { difference, has, merge, omit, partial, pick, some } from 'lodash'
import {
  afterSavingPost, postTypeFromTag, setupNewPostAttrs, updateChildren,
  updateMedia
} from '../models/post/util'

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
    withRelated: PostPresenter.relations(userId, relationsOpts || {})
  })
  .then(posts => ({
    posts_total: (posts.first() ? Number(posts.first().get('total')) : 0),
    posts: posts.map(p => PostPresenter.present(p, userId, relationsOpts))
  }))
}

const queryForCommunity = function (req, res) {
  if (TokenAuth.isAuthenticated(res)) {
    if (!RequestValidation.requireTimeRange(req, res)) return
  }

  return queryPosts(req, {
    communities: [res.locals.community.id],
    visibility: (res.locals.membership ? null : Post.Visibility.PUBLIC_READABLE),
    currentUserId: req.session.userId
  })
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

const queryForProject = function (req, res) {
  return queryPosts(req, {
    project: req.param('projectId'),
    sort: 'fulfilled-last'
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

const queryForTag = function (req, res) {
  return Tag.find(req.param('tagName'))
  .then(tag => queryPosts(req, {
    communities: [res.locals.community.id],
    tag: tag.id,
    visibility: (res.locals.membership ? null : Post.Visibility.PUBLIC_READABLE)
  }))
}

const queryForTagInAllCommunities = function (req, res) {
  return Promise.join(
    Tag.find(req.param('tagName')),
    Membership.activeCommunityIds(req.session.userId),
    (tag, communityIds) => queryPosts(req, {
      communities: communityIds,
      tag: tag.id
    }))
}

const createFindAction = (queryFunction, relationsOpts) => (req, res) => {
  return queryFunction(req, res)
  .then(query => fetchAndPresentPosts(
    query,
    req.session.userId,
    merge(relationsOpts, {
      withComments: req.param('comments') && 'recent',
      withVotes: req.param('votes')
    })))
  .then(res.ok, res.serverError)
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
    return setupNewPostAttrs(req.session.userId, req.allParams())
    .tap(attrs => {
      if (!attrs.name) throw new Error("title can't be blank")
      if (!attrs.type && !attrs.tag) throw new Error("type and tag can't both be blank")
    })
    .then(attrs => bookshelf.transaction(trx =>
      Post.create(attrs, {transacting: trx})
      .tap(post => afterSavingPost(post, {
        communities: req.param('communities'),
        imageUrl: req.param('imageUrl'),
        videoUrl: req.param('videoUrl'),
        docs: req.param('docs'),
        projectId: req.param('projectId'),
        tag: req.param('tag'),
        children: req.param('requests'),
        transacting: trx
      }))))
    .then(post => post.load(PostPresenter.relations(req.session.userId)))
    .then(PostPresenter.present)
    .then(res.ok)
    .catch(err => {
      if (err.message === "title can't be blank") {
        res.status(422)
        res.send(err.message)
      } else {
        res.serverError(err)
      }
    })
  },

  createFromEmail: function (req, res) {
    try {
      var replyData = Email.decodePostCreationAddress(req.param('To'))
    } catch (e) {
      return res.serverError(new Error('Invalid reply address: ' + req.param('To')))
    }

    var allParams = merge(req.allParams(), {'type': replyData.type})
    allParams.name = allParams['subject']
    allParams.description = allParams['stripped-text']

    return setupNewPostAttrs(replyData.userId, allParams)
    .then(attrs => bookshelf.transaction(trx =>
      new Post(attrs).save(null, {transacting: trx})
      .tap(post => afterSavingPost(post, {
        communities: [replyData.communityId],
        imageUrl: req.param('imageUrl'),
        docs: req.param('docs'),
        transacting: trx
      }))))
    .then(() => res.ok({}), res.serverError)
  },

  createFromEmailForm: function (req, res) {
    try {
      var tokenData = Email.decodePostCreationToken(req.param('token'))
    } catch (e) {
      return res.serverError(new Error('Invalid token: ' + req.param('To')))
    }

    var attributes = merge(
      {created_from: 'email_form'},
      pick(req.allParams(), ['name', 'description', 'type']))

    var namePrefixes = {
      'offer': 'I\'d like to share',
      'request': 'I\'m looking for',
      'intention': 'I\'d like to create'
    }

    attributes.name = namePrefixes[attributes.type] + ' ' + attributes.name

    return setupNewPostAttrs(tokenData.userId, attributes)
    .then(attrs => bookshelf.transaction(trx =>
      new Post(attrs).save(null, {transacting: trx})
      .tap(post => afterSavingPost(post, {
        communities: [tokenData.communityId],
        transacting: trx
      }))))
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

    var attrs = merge(
      pick(params, 'name', 'description', 'type', 'start_time', 'end_time', 'location'),
      {
        updated_at: new Date(),
        visibility: params.public ? Post.Visibility.PUBLIC_READABLE : Post.Visibility.DEFAULT
      }
    )

    if (!attrs.type) {
      attrs.type = postTypeFromTag(params.tag)
    }

    return bookshelf.transaction(trx => {
      return post.save(attrs, {patch: true, transacting: trx})
      .tap(() => updateChildren(post, req.param('requests'), trx))
      .tap(() => {
        var newIds = req.param('communities').sort()
        var oldIds = post.relations.communities.pluck('id').sort()
        if (newIds !== oldIds) {
          return Promise.join(
            Promise.map(difference(newIds, oldIds), id =>
              post.communities().attach(id, {transacting: trx})),
            Promise.map(difference(oldIds, newIds), id =>
              post.communities().detach(id, {transacting: trx}))
          )
        }
      })
      .tap(() => {
        var mediaParams = ['docs', 'removedDocs', 'imageUrl', 'imageRemoved']
        var isSet = partial(has, params)
        if (some(mediaParams, isSet)) return post.load('media')
      })
      .tap(() => updateMedia(post, 'image', params.imageUrl, params.imageRemoved, trx))
      .tap(() => updateMedia(post, 'video', params.videoUrl, params.videoRemoved, trx))
      .tap(() => {
        if (!params.removedDocs) return
        return Promise.map(params.removedDocs, doc => {
          var media = post.relations.media.find(m => m.get('url') === doc.url)
          if (media) return media.destroy({transacting: trx})
        })
      })
      .tap(() => {
        if (!params.docs) return
        return Promise.map(params.docs, doc => {
          var media = post.relations.media.find(m => m.get('url') === doc.url)
          if (!media) return Media.createDoc(post.id, doc, trx)
        })
      })
      .tap(() => Tag.updateForPost(post, req.param('tag') || post.get('type'), trx))
    })
    .then(() => post.load(PostPresenter.relations(req.session.userId, {withChildren: true})))
    .then(post => PostPresenter.present(post, req.session.userId, {withChildren: true}))
    .then(res.ok, res.serverError)
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

  respond: function (req, res) {
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
  ['Project', queryForProject],
  ['Network', queryForNetwork],
  ['Tag', queryForTag],
  ['TagInAllCommunities', queryForTagInAllCommunities]
]

const relationsOpts = {
  Project: {fromProject: true}
}

queries.forEach(tuple => {
  const key = tuple[0]
  const fn = tuple[1]
  PostController['checkFreshnessFor' + key] = createCheckFreshnessAction(fn, 'posts')
  PostController['findFor' + key] = createFindAction(fn, relationsOpts[key])
})

module.exports = PostController

import rollbar from 'rollbar'
import { fetchAndPresentFollowed } from '../services/TagPresenter'
import { clone, isEmpty, merge, pick, sortBy } from 'lodash'
import { curry } from 'lodash/fp'
import { joinRoom, leaveRoom } from '../services/Websockets'
import CommunityService from '../services/CommunityService'

const Promise = require('bluebird')
const request = require('request')
const post = Promise.promisify(request.post)
const slackAuthAccess = 'https://slack.com/api/oauth.access'
const welcomeMessage = 'Thank you for joining us here at Hylo. ' +
  'Through our communities, we can find everything we need. If we share ' +
  'with each other the unique gifts and intentions we each have, we can ' +
  "create extraordinary things. Let's get started!"

const afterCreatingMembership = (req, res, ms, community, preexisting) => {
  const tagName = req.param('tagName')
  return Promise.resolve(ms && !ms.get('active') &&
    ms.save({active: true}, {patch: true}))
  .tap(() =>
    tagName && Tag.find(tagName)
    .then(tag => {
      if (!tag) return res.notFound()

      return TagFollow.add({
        communityId: community.id,
        tagId: tag.id,
        userId: req.session.userId
      })
    })
    .catch(err => {
      if (err.message && err.message.includes('duplicate key value')) {
        return true
      } else {
        throw err
      }
    }))
  .then(() => Object.assign(ms.toJSON(), {preexisting}, {
    community: community.pick('id', 'name', 'slug', 'avatar_url')
  }))
}

const approveJoinRequest = curry((req, res, community, joinRequest) => {
  const communityId = community.id
  const userId = joinRequest.get('user_id')
  return Membership.create(userId, communityId)
  .catch(err => {
    if (err && err.message.match(/duplicate key value/)) return
    throw err
  })
  .then(ms => ms && afterCreatingMembership(req, res, ms, community))
  .tap(() => joinRequest.destroy())
  .tap(() => Queue.classMethod('Activity', 'saveForReasonsOpts', {
    activities: [{
      reader_id: userId,
      community_id: communityId,
      actor_id: req.session.userId,
      reason: 'approvedJoinRequest'
    }]}))
})

module.exports = {
  find: function (req, res) {
    return Community
    .where('active', true)
    .fetchAll({withRelated: [
      {memberships: q => q.column('community_id')}
    ]})
    .then(communities => communities.map(c => Object.assign(c.toJSON(), {
      memberships: c.relations.memberships.length
    })))
    .then(res.ok, res.serverError)
  },

  findOne: function (req, res) {
    const { community, membership } = res.locals
    if (!community) return res.notFound()

    return community.load([
      {network: q => q.column('networks.id', 'networks.name', 'networks.slug')},
      {leader: q => q.column('users.id', 'users.name', 'users.avatar_url')}
    ])
    .then(() => Promise.join(
      community.toJSON(),
      CommunityTag.defaults(community.id),
      (data, defaultTags) => merge(pick(data,
        'id', 'name', 'slug', 'avatar_url', 'banner_url', 'description',
        'settings', 'location', 'welcome_message', 'leader', 'network'),
        {
          defaultTags: defaultTags.models.map(dt => dt.relations.tag.get('name'))
        }
      )))
    .tap(() => membership &&
      membership.save({last_viewed_at: new Date()}, {patch: true}))
    .then(res.ok)
    .catch(res.serverError)
  },

  findSettings: function (req, res) {
    var leader
    Community.find(req.param('communityId'), {withRelated: ['leader']})
    .tap(community => { leader = community.relations.leader })
    .then(community => merge(community.pick(
      'welcome_message', 'beta_access_code', 'slack_hook_url', 'slack_team', 'slack_configure_url', 'settings'
    ), {
      leader: leader ? leader.pick('id', 'name', 'avatar_url') : null
    }))
    .then(res.ok)
    .catch(res.serverError)
  },

  update: function (req, res) {
    var whitelist = [
      'banner_url', 'avatar_url', 'name', 'description', 'settings',
      'welcome_message', 'leader_id', 'beta_access_code', 'location',
      'slack_hook_url', 'slack_team', 'slack_configure_url', 'active'
    ]
    if (Admin.isSignedIn(req)) {
      whitelist.push('slug')
    }
    const attributes = pick(req.allParams(), whitelist)
    const saneAttrs = clone(attributes)

    return Community.find(req.param('communityId'))
    .then(community => {
      if (attributes.settings) {
        saneAttrs.settings = merge({}, community.get('settings'), attributes.settings)
      }
      return community.save(saneAttrs, {patch: true})
    })
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  addSlack: function (req, res) {
    const { code } = req.query
    const {
      PROTOCOL, DOMAIN, SLACK_APP_CLIENT_ID, SLACK_APP_CLIENT_SECRET
    } = process.env
    const options = {
      uri: slackAuthAccess,
      form: {
        client_id: SLACK_APP_CLIENT_ID,
        client_secret: SLACK_APP_CLIENT_SECRET,
        code,
        redirect_uri: `${PROTOCOL}://${DOMAIN}${req.path}`
      }
    }

    Community.find(req.param('communityId')).then(community => {
      if (!community) return res.notFound()

      post(options).spread((resp, body) => {
        sails.log.info('slack response:')
        sails.log.info(body)
        return JSON.parse(body)
      })
      .then(parsed => community.save({
        slack_hook_url: parsed.incoming_webhook.url,
        slack_team: parsed.team_name,
        slack_configure_url: parsed.incoming_webhook.configuration_url
      }, {patch: true}))
      .then(() => res.redirect(Frontend.Route.community(community) + '/settings?expand=advanced'))
      .catch(err => {
        rollbar.error(err, req)
        res.redirect(Frontend.Route.community(community) + '/settings?expand=advanced&slackerror=true')
      })
    })
  },

  findModerators: function (req, res) {
    Community.find(req.param('communityId')).then(function (community) {
      return community.moderators().fetch()
    }).then(function (moderators) {
      res.ok(moderators.map(function (user) {
        return {
          id: user.id,
          name: user.get('name'),
          avatar_url: user.get('avatar_url')
        }
      }))
    })
  },

  addModerator: function (req, res) {
    Membership.setModeratorRole(req.param('userId'), req.param('communityId'))
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  removeModerator: function (req, res) {
    Membership.removeModeratorRole(req.param('userId'), req.param('communityId'))
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  joinWithCode: function (req, res) {
    if (!req.param('code')) return res.badRequest()
    var community, preexisting

    return Community.query(qb => {
      qb.whereRaw('lower(beta_access_code) = lower(?)', req.param('code'))
      qb.where('active', true)
    })
    .fetch()
    .tap(c => { community = c })
    .then(() => !!community && Membership.create(req.session.userId, community.id))
    .catch(err => {
      if (err.message && err.message.includes('duplicate key value')) {
        preexisting = true
        return true
      } else {
        res.serverError(err)
        return false
      }
    })
    // we get here if the membership was created successfully, or if it already existed
    .then(ok => ok && Membership.find(req.session.userId, community.id, {includeInactive: true})
      .then(ms => afterCreatingMembership(req, res, ms, community, preexisting)))
    .then(resp => resp ? res.ok(resp) : res.status(422).send('invalid code'))
    .catch(err => res.serverError(err))
  },

  leave: function (req, res) {
    res.locals.membership.destroy()
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  removeMember: function (req, res) {
    return CommunityService.removeMember(req.param('userId'),
      req.param('communityId'),
      req.session.userId)
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  validate: function (req, res) {
    return Validation.validate(pick(req.allParams(), 'constraint', 'column', 'value'),
      Community, ['name', 'slug', 'beta_access_code'], ['exists', 'unique'])
    .then(validation => {
      if (validation.badRequest) {
        return res.badRequest(validation.badRequest)
      } else {
        return res.ok(validation)
      }
    })
    .catch(res.serverError)
  },

  create: function (req, res) {
    const { userId } = req.session
    return Community.create(userId, req.allParams())
    .then(({ community, membership }) => Promise.props(Object.assign(
      membership.toJSON(), {
        community,
        left_nav_tags: fetchAndPresentFollowed(community.id, userId)
      })))
    .then(res.ok)
    .catch(res.serverError)
  },

  findForNetwork: function (req, res) {
    var total
    var communityAttributes = ['id', 'name', 'slug', 'avatar_url', 'banner_url', 'memberCount']

    return Network.find(req.param('networkId'))
    .then(network => {
      if (req.param('paginate')) {
        return Community.query(qb => {
          qb.where('network_id', network.get('id'))
          qb.where('communities.active', true)
          qb.select(bookshelf.knex.raw('count(communities_users.user_id) as "memberCount", count(communities.id) over () as total'))
          qb.select('communities.id', 'slug', 'name', 'avatar_url', 'banner_url')
          qb.leftJoin('communities_users', function () {
            this.on('communities.id', '=', 'communities_users.community_id')
          })
          qb.groupBy('communities.id')
          qb.orderBy('memberCount', 'desc')
          qb.orderBy('slug', 'asc')
          qb.limit(req.param('limit') || 20)
          qb.offset(req.param('offset') || 0)
        }).fetchAll()
        .tap(communities => {
          total = communities.length > 0
            ? communities.first().get('total')
            : 0
        })
      } else {
        return Community.where('network_id', network.get('id'))
        .fetchAll({withRelated: ['memberships']})
        .then(communities => communities.map(c =>
          Object.assign(c.pick(communityAttributes), {
            memberCount: c.relations.memberships.length
          })))
        .then(communities => sortBy(communities, c => -c.memberCount))
      }
    })
    .then(communities => {
      if (req.param('paginate')) {
        return {communities_total: total, communities: communities.map(c => c.pick(communityAttributes))}
      } else {
        return communities
      }
    })
    .then(res.ok)
    .catch(res.serverError)
  },

  findForNetworkNav: function (req, res) {
    return Network.find(req.param('networkId'))
    .then(network =>
      Community.where({network_id: network.get('id'), active: true})
      .fetchAll({withRelated: ['memberships']})
      .then(communities => sortBy(communities.models, c => -c.relations.memberships.length))
      .then(communities => communities.map(c => c.pick(['name', 'slug']))))
    .then(res.ok)
    .catch(res.serverError)
  },

  updateMembership: function (req, res) {
    var whitelist = ['settings']
    var attributes = pick(req.allParams(), whitelist)

    return Membership.where({
      user_id: req.session.userId,
      community_id: req.param('communityId')
    })
    .fetch()
    .then(membership => {
      if (!membership) return res.notFound()

      if (attributes.settings) {
        attributes.settings = merge({}, membership.get('settings'), attributes.settings)
      }
      return membership.save(attributes, {patch: true})
    })
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  pinPost: function (req, res) {
    return PostMembership.find(req.param('postId'), req.param('communityId'))
    .then(postMembership => {
      if (!postMembership) return res.notFound()

      return postMembership.save({pinned: !postMembership.get('pinned')})
    })
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  updateChecklist: function (req, res) {
    var community = res.locals.community
    return community.updateChecklist()
    .then(community => res.ok(pick(community.get('settings'), 'checklist')))
    .catch(res.serverError)
  },

  requestToJoin: function (req, res) {
    const { community } = res.locals
    const params = {community_id: community.id, user_id: req.session.userId}
    var redundant = false
    return JoinRequest.where(params).fetch()
    .then(joinRequest => {
      const now = new Date()
      if (joinRequest) {
        redundant = now - joinRequest.get('updated_at') < 240 * 60 * 1000
        return joinRequest.save({updated_at: now})
      } else {
        return new JoinRequest(merge(params, {created_at: now})).save()
      }
    })
    .tap(joinRequest => !redundant && community.moderators().fetch()
      .then(moderators => Queue.classMethod('Activity', 'saveForReasonsOpts', {
        activities: moderators.models.map(moderator => ({
          reader_id: moderator.id,
          community_id: community.id,
          actor_id: req.session.userId,
          reason: 'joinRequest'
        }))
      })))
    .then(res.ok, res.serverError)
  },

  joinRequests: function (req, res) {
    const { community } = res.locals
    return JoinRequest.query(qb => {
      qb.limit(req.param('limit') || 20)
      qb.offset(req.param('offset') || 0)
      qb.where('community_id', community.get('id'))
      qb.select(bookshelf.knex.raw('join_requests.*, count(*) over () as total'))
      qb.orderByRaw('updated_at desc, created_at desc')
    }).fetchAll({withRelated: 'user'})
    .then(joinRequests => ({
      total: joinRequests.length > 0 ? Number(joinRequests.first().get('total')) : 0,
      items: joinRequests.map(jR => {
        var user = jR.relations.user.pick('id', 'name', 'avatar_url')
        return merge(jR.pick('id', 'created_at', 'updated_at'), {
          user: !isEmpty(user) ? user : null
        })
      })
    }))
    .then(res.ok)
  },

  approveJoinRequest: function (req, res) {
    const { community } = res.locals
    const userId = req.param('userId')
    return JoinRequest.where({
      user_id: userId,
      community_id: community.id
    }).fetch()
    .then(approveJoinRequest(req, res, community))
    .then(result => res.ok(result || {}))
  },

  approveAllJoinRequests: function (req, res) {
    const { community } = res.locals
    return JoinRequest.where({community_id: community.id}).fetchAll()
    .then(({ models }) =>
      Promise.map(models, approveJoinRequest(req, res, community)))
    .then(() => res.ok({}))
  },

  subscribe: function (req, res) {
    joinRoom(req, res, 'community', res.locals.community.id)
  },

  unsubscribe: function (req, res) {
    leaveRoom(req, res, 'community', res.locals.community.id)
  }
}

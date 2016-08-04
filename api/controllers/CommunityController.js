import { pick, sortBy } from 'lodash'
const Promise = require('bluebird')
const request = require('request')
const post = Promise.promisify(request.post)
const slackAuthAccess = 'https://slack.com/api/oauth.access'
const welcomeMessage = 'Thank you for joining us here at Hylo. ' +
  'Through our communities, we can find everything we need. If we share ' +
  'with each other the unique gifts and intentions we each have, we can ' +
  "create extraordinary things. Let's get started!"

module.exports = {
  find: function (req, res) {
    Community
    .where('active', true)
    .fetchAll({withRelated: [
      {memberships: q => q.column('community_id')}
    ]})
    .then(communities => communities.map(c => _.extend(c.toJSON(), {
      memberships: c.relations.memberships.length
    })))
    .then(res.ok, res.serverError)
  },

  findOne: function (req, res) {
    var community = res.locals.community
    var mship = res.locals.membership

    return community.load([
      {network: q => q.column('networks.id', 'networks.name', 'networks.slug')},
      {leader: q => q.column('users.id', 'users.name', 'users.avatar_url')}
    ])
    .then(() => community.toJSON())
    .then(data => pick(data,
      'id', 'name', 'slug', 'avatar_url', 'banner_url', 'description',
      'settings', 'location', 'welcome_message', 'leader', 'network',
      'financial_requests_enabled'))
    .tap(() => mship && mship.save({last_viewed_at: new Date()}, {patch: true}))
    .then(res.ok)
    .catch(res.serverError)
  },

  findSettings: function (req, res) {
    var leader
    Community.find(req.param('communityId'), {withRelated: ['leader']})
    .tap(community => leader = community.relations.leader)
    .then(community => _.merge(community.pick(
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
      'slack_hook_url', 'slack_team', 'slack_configure_url', 'active',
      'financial_requests_enabled'
    ]
    if (Admin.isSignedIn(req)) {
      whitelist.push('slug')
    }
    var attributes = _.pick(req.allParams(), whitelist)
    var saneAttrs = _.clone(attributes)
    var community = new Community({id: req.param('communityId')})

    if (attributes.settings) {
      saneAttrs.settings = _.merge({}, community.get('settings'), attributes.settings)
    }

    community.save(saneAttrs, {patch: true})
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  addSlack: function (req, res) {
    var code = req.query.code
    var redirect_uri = process.env.PROTOCOL + '://' + process.env.DOMAIN + req.path
    var options = {
      uri: slackAuthAccess,
      form: {
        client_id: process.env.SLACK_APP_CLIENT_ID,
        client_secret: process.env.SLACK_APP_CLIENT_SECRET,
        code: code,
        redirect_uri: redirect_uri
      }
    }

    Community.find(req.param('communityId')).then(community => {
      if (!community) return res.notFound()

      post(options).spread((resp, body) => JSON.parse(body))
      .then(parsed => community.save({
        slack_hook_url: parsed.incoming_webhook.url,
        slack_team: parsed.team_name,
        slack_configure_url: parsed.incoming_webhook.configuration_url
      }, {patch: true}))
      .then(() => res.redirect(Frontend.Route.community(community) + '/settings?slack=1'))
      .catch(() => res.redirect(Frontend.Route.community(community) + '/settings?slack=0'))
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
    var community, preexisting
    return Community.query(qb => {
      qb.whereRaw('lower(beta_access_code) = lower(?)', req.param('code'))
      qb.where('active', true)
    })
    .fetch()
    .tap(c => community = c)
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
      .tap(ms => ms && !ms.get('active') && ms.save({active: true}, {patch: true}))
      .tap(ms => {
        if (!req.param('tagName')) return
        return Tag.find(req.param('tagName'))
        .then(tag => {
          if (!tag) return res.notFound()
          return new TagFollow({
            community_id: community.id,
            tag_id: tag.id,
            user_id: req.session.userId
          }).save()
        })
        .catch(err => {
          if (err.message && err.message.includes('duplicate key value')) {
            return true
          } else {
            throw err
          }
        })
      })
      .then(ms => _.merge(ms.toJSON(), {preexisting}, {
        community: community.pick('id', 'name', 'slug', 'avatar_url', 'financial_requests_enabled')
      })))
    .then(resp => resp ? res.ok(resp) : res.status(422).send('invalid code'))
    .catch(err => res.serverError(err))
  },

  leave: function (req, res) {
    res.locals.membership.destroy()
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  removeMember: function (req, res) {
    Membership.query().where({
      user_id: req.param('userId'),
      community_id: req.param('communityId')
    }).update({
      active: false,
      deactivated_at: new Date(),
      deactivator_id: req.session.userId
    })
    .then(() => res.ok({}))
    .catch(res.serverError)
  },

  validate: function (req, res) {
    return Validation.validate(_.pick(req.allParams(), 'constraint', 'column', 'value'),
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
    var attrs = _.pick(req.allParams(),
      'name', 'description', 'slug', 'category',
      'beta_access_code', 'banner_url', 'avatar_url', 'location')

    var community = new Community(_.merge(attrs, {
      created_at: new Date(),
      created_by_id: req.session.userId,
      leader_id: req.session.userId,
      welcome_message: welcomeMessage,
      settings: {sends_email_prompts: true, enable_finance:false}
    }))

    return bookshelf.transaction(trx => {
      return community.save(null, {transacting: trx})
      .tap(community => community.createDefaultTags(req.session.userId, trx))
      .tap(community => community.createStarterPosts(trx))
      .then(() => Membership.create(req.session.userId, community.id, {
        role: Membership.MODERATOR_ROLE,
        transacting: trx
      }))
    })
    // Any assets were uploaded to /community/new, since we didn't have an id;
    // copy them over to /community/:id now
    .tap(() => Queue.classMethod('Community', 'copyAssets', {communityId: community.id}))
    .tap(() => Queue.classMethod('Community', 'notifyAboutCreate', {communityId: community.id}))
    .then(membership => _.extend(membership.toJSON(), {community: community}))
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
          qb.where('community.active', true)
          qb.select(bookshelf.knex.raw('count(users_community.user_id) as "memberCount", count(community.id) over () as total'))
          qb.select('community.id', 'slug', 'name', 'avatar_url', 'banner_url')
          qb.leftJoin('users_community', function () {
            this.on('community.id', '=', 'users_community.community_id')
          })
          qb.groupBy('community.id')
          qb.orderBy('memberCount', 'desc')
          qb.orderBy('slug', 'asc')
          qb.limit(req.param('limit') || 20)
          qb.offset(req.param('offset') || 0)
        }).fetchAll()
        .tap(communities => total = (communities.length > 0 ? communities.first().get('total') : 0))
      } else {
        return Community.where('network_id', network.get('id'))
        .fetchAll({withRelated: ['memberships']})
        .then(communities => communities.map(c => _.extend(c.pick(communityAttributes), {
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
    .then(network => Community.where('network_id', network.get('id'))
      .fetchAll({withRelated: ['memberships']})
      .then(communities => sortBy(communities.models, c => -c.relations.memberships.length))
      .then(communities => communities.map(c => c.pick(['name', 'slug']))))
    .then(res.ok)
    .catch(res.serverError)
  },

  updateMembership: function (req, res) {
    var whitelist = ['settings']
    var attributes = _.pick(req.allParams(), whitelist)

    return Membership.where({
      user_id: req.session.userId,
      community_id: req.param('communityId')
    })
    .fetch()
    .then(membership => {
      if (!membership) return res.notFound()

      if (attributes.settings) {
        attributes.settings = _.merge({}, membership.get('settings'), attributes.settings)
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
  }
}

import knexPostgis from 'knex-postgis'
import { clone, defaults, difference, flatten, intersection, isEmpty, mapValues, merge, sortBy, pick, omit, omitBy, isUndefined, trim, xor } from 'lodash'
import mbxGeocoder from '@mapbox/mapbox-sdk/services/geocoding'
import fetch from 'node-fetch'
import randomstring from 'randomstring'
import wkx from 'wkx'

import mixpanel from '../../lib/mixpanel'
import { AnalyticsEvents, LocationHelpers } from 'hylo-shared'
import HasSettings from './mixins/HasSettings'
import findOrCreateThread from './post/findOrCreateThread'
import { groupFilter } from '../graphql/filters'
import { inviteGroupToGroup } from '../graphql/mutations/group'
import { findOrCreateLocation } from '../graphql/mutations/location'
import { whereId } from './group/queryUtils'
import { es } from '../../lib/i18n/es'
import { en } from '../../lib/i18n/en'

const { GraphQLYogaError } = require('@graphql-yoga/node')

const locales = { es, en }

export const GROUP_ATTR_UPDATE_WHITELIST = [
  'role',
  'project_role_id',
  'following',
  'settings',
  'active'
]

const DEFAULT_BANNER = 'https://d3ngex8q79bk55.cloudfront.net/misc/default_community_banner.jpg'
const DEFAULT_AVATAR = 'https://d3ngex8q79bk55.cloudfront.net/misc/default_community_avatar.png'

module.exports = bookshelf.Model.extend(merge({
  tableName: 'groups',
  requireFetch: false,
  hasTimestamps: true,

  parse (response) {
    // Convert geometry hex values into GeoJSON before returning to the client
    if (typeof response.geo_shape === 'string') {
      const b = Buffer.from(response.geo_shape, 'hex')
      const parsedGeo = wkx.Geometry.parse(b)
      response.geo_shape = parsedGeo.toGeoJSON()
    }

    return response
  },

  // ******** Getters ******* //

  agreements: function () {
    return this.belongsToMany(Agreement).through(GroupAgreement)
      .where('groups_agreements.active', true)
      .withPivot(['order']).query(q => {
        q.orderByRaw('_pivot_order asc')
      })
  },

  // The full tree of child groups + grandchild groups, etc. includes the root group too
  allChildGroups () {
    return Group.collection().query(q => {
      q.where('groups.active', true)

      // Learned from https://persagen.com/2018/06/06/postgresql_trees_recursive_cte.html
      q.whereRaw(`groups.id in (
        WITH RECURSIVE group_nodes(id, child, all_child_ids) AS (
            SELECT id, child_group_id, ARRAY[child_group_id]
            FROM group_relationships WHERE parent_group_id = ? and active = true
        UNION ALL
            SELECT child_nodes.id, child_nodes.child_group_id, all_child_ids||child_nodes.child_group_id
            FROM group_relationships child_nodes
            JOIN group_nodes n
              ON n.child = child_nodes.parent_group_id
              AND child_nodes.active = true
              AND child_nodes.child_group_id <> ALL (all_child_ids)
        )
        select distinct unnest(all_child_ids) as child_id from group_nodes order by child_id
      )`, [this.id])
    })
  },

  childGroups () {
    return this.belongsToMany(Group)
      .through(GroupRelationship, 'parent_group_id', 'child_group_id')
      .query({ where: { 'group_relationships.active': true, 'groups.active': true } })
      .orderBy('groups.name', 'asc')
  },

  comments: function () {
    return Comment.collection().query(q => {
      q.join('groups_posts', 'groups_posts.post_id', 'comments.post_id')
      q.where({
        'groups_posts.group_id': this.id,
        'comments.active': true
      })
    })
  },

  creator: function () {
    return this.belongsTo(User, 'created_by_id')
  },

  customViews () {
    return this.hasMany(CustomView)
  },

  groupAgreements () {
    return this.hasMany(GroupAgreement)
  },

  groupRelationshipInvitesFrom () {
    return this.hasMany(GroupRelationshipInvite, 'from_group_id')
      .query({ where: { status: GroupRelationshipInvite.STATUS.Pending }})
  },

  groupRelationshipInvitesTo () {
    return this.hasMany(GroupRelationshipInvite, 'to_group_id')
      .query({ where: { status: GroupRelationshipInvite.STATUS.Pending }})
  },

  groupRoles () {
    return this.hasMany(GroupRole)
  },

  groupTags () {
    return this.hasMany(GroupTag)
  },

  groupExtensions: function () {
    return this.belongsToMany(Extension).through(GroupExtension).where('group_extensions.active', true)
      .withPivot(['data'])
  },

  groupToGroupJoinQuestions () {
    return this.hasMany(GroupToGroupJoinQuestion).query(q => {
      q.select(['questions.text', 'questions.id as questionId'])
      q.join('questions', 'group_to_group_join_questions.question_id', 'questions.id')
    })
  },

  isHidden() {
    return this.get('visibility') === Group.Visibility.HIDDEN
  },

  joinQuestions () {
    return this.hasMany(GroupJoinQuestion).query(q => {
      q.select(['questions.text', 'questions.id as questionId'])
      q.join('questions', 'group_join_questions.question_id', 'questions.id')
    })
  },

  locationObject () {
    return this.belongsTo(Location, 'location_id')
  },

  availableResponsibilities () {
    return Responsibility.collection().query(q => {
      q.whereRaw('group_id = ? or group_id is null', this.id)
    })
  },

  members (where) {
    // TODO RESP: does this need to change or should we just build a new one for it... the problem is the access to the role attribute.
    // It doesn't seem like there are any more Node calls of this that rely on the role being present
    // But I suspect that there might be graphQL queries that rely on it
    return this.belongsToMany(User).through(GroupMembership)
      .query(q => {
        q.where({
          'group_memberships.active': true,
          'users.active': true
        })
        if (where) {
          q.where(where)
        }
      })
      .withPivot(['created_at', 'role', 'settings'])
  },

  memberships (includeInactive = false) {
    // TODO: need to check if person is active too?
    return this.hasMany(GroupMembership)
      .query(q => includeInactive ? q : q.where('group_memberships.active', true))
  },

  memberCount: function () {
    return this.get('num_members')
  },

  // This returns all members with the manage_content responsbility
  moderators () {
    return this.members().query(q => {
      q.whereRaw(`(exists (
        select * from group_memberships_common_roles
        inner join common_roles_responsibilities on common_roles_responsibilities.common_role_id = group_memberships_common_roles.common_role_id
        where common_roles_responsibilities.responsibility_id = 3
          and group_memberships_common_roles.user_id = users.id
          and group_memberships_common_roles.group_id = group_memberships.group_id
      ) or exists (
        select * from group_memberships_group_roles
        inner join group_roles_responsibilities on group_roles_responsibilities.group_role_id = group_memberships_group_roles.group_role_id
        where group_roles_responsibilities.responsibility_id = 3
          and group_memberships_group_roles.user_id = users.id
          and group_memberships_group_roles.group_id = group_memberships.group_id
      ))`)
    })
  },

  stewards () {
    return this.members().query(q => {
      q.whereRaw(`(exists (
        select * from group_memberships_common_roles
        inner join common_roles_responsibilities on common_roles_responsibilities.common_role_id = group_memberships_common_roles.common_role_id
        where common_roles_responsibilities.responsibility_id IN (1, 3, 4)
          and group_memberships_common_roles.user_id = users.id
          and group_memberships_common_roles.group_id = group_memberships.group_id
      ) or exists (
        select * from group_memberships_group_roles
        inner join group_roles_responsibilities on group_roles_responsibilities.group_role_id = group_memberships_group_roles.group_role_id
        where group_roles_responsibilities.responsibility_id IN (1, 3, 4)
          and group_memberships_group_roles.user_id = users.id
          and group_memberships_group_roles.group_id = group_memberships.group_id
      ))`)
    })
  },

  // Return # of prereq groups userId is not a member of yet
  // This is used on front-end to figure out if user can see all prereqs or not
  async numPrerequisitesLeft(userId) {
    const prerequisiteGroups = await this.prerequisiteGroups().fetch()
    let num = prerequisiteGroups.models.length
    await Promise.map(prerequisiteGroups.models, async (prereq) => {
      const isMemberOfPrereq = await GroupMembership.forPair(userId, prereq.id).fetch()
      if (isMemberOfPrereq) {
        num = num - 1
      }
    })
    return num
  },

  parentGroups () {
    return this.belongsToMany(Group)
      .through(GroupRelationship, 'child_group_id', 'parent_group_id')
      .query({ where: { 'group_relationships.active': true, 'groups.active': true } })
      .withPivot(['settings'])
      .orderBy('groups.name', 'asc')
  },

  parentGroupRelationships () {
    return this.hasMany(GroupRelationship, 'child_group_id')
      .query({ where: { active: true } })
  },

  prerequisiteGroups () {
    return this.parentGroups().query({ whereRaw: "(group_relationships.settings->>'isPrerequisite')::boolean = true" })
  },

  posts (userId) {
    return this.belongsToMany(Post).through(PostMembership)
      .query({ where: { 'posts.active': true } })
  },

  postCount: function () {
    return Post.query(q => {
      q.select(bookshelf.knex.raw('count(*)'))
      q.join('groups_posts', 'posts.id', 'groups_posts.post_id')
      q.where({ 'groups_posts.group_id': this.id, active: true })
    })
      .fetch()
      .then(result => result.get('count'))
  },

  skills: function () {
    return Skill.collection().query(q => {
      q.join('skills_users', 'skills_users.skill_id', 'skills.id')
      q.join('group_memberships', 'group_memberships.user_id', 'skills_users.user_id')
      q.where({
        'group_memberships.group_id': this.id,
        'group_memberships.active': true
      })
    })
  },

  suggestedSkills: function () {
    return this.belongsToMany(Skill, 'groups_suggested_skills')
  },

  tags () {
    return this.belongsToMany(Tag).through(GroupTag).withPivot(['is_default'])
  },

  // The posts to show for a particular user viewing a group's stream or map
  // includes the direct posts to this group + posts to child groups the user is a member of
  viewPosts (userId) {
    const treeOfGroupsForMember = this.allChildGroups().query(q => {
      q.select('groups.id')
      q.join('group_memberships', 'group_memberships.group_id', 'groups.id')
      q.where('group_memberships.user_id', userId)
    })

    return Post.collection().query(q => {
      q.queryContext({ primaryGroupId: this.id }) // To help with sorting pinned posts
      q.join('users', 'posts.user_id', 'users.id')
      q.where('users.active', true)
      q.andWhere(q2 => {
        q2.where('groups_posts.group_id', this.id)
        q2.orWhere(q3 => {
          q3.whereIn('groups_posts.group_id', treeOfGroupsForMember.query())
          q3.andWhere('posts.user_id', '!=', User.AXOLOTL_ID)
        })
      })
    })
  },

  widgets: function () {
    return this.hasMany(GroupWidget).query(q => {
      q.select(['widgets.name'])
      q.join('widgets', 'widgets.id', 'group_widgets.widget_id')
    })
  },

  // ******** Setters ********** //

  async addChild (childGroup, { transacting } = {}) {
    const childGroupId = childGroup instanceof Group ? childGroup.id : childGroup
    const existingChild = await GroupRelationship.where({ child_group_id: childGroupId, parent_group_id: this.id }).fetch({ transacting })
    if (existingChild) {
      return existingChild.save({ active: true }, { transacting })
    }
    return GroupRelationship.forge({ child_group_id: childGroupId, parent_group_id: this.id }).save({}, { transacting })
  },

  async addParent (parentGroup, { transacting } = {}) {
    const parentGroupId = parentGroup instanceof Group ? parentGroup.id : parentGroup
    const existingParent = await GroupRelationship.where({ parent_group_id: parentGroupId, child_group_id: this.id }).fetch({ transacting })
    if (existingParent) {
      return existingParent.save({ active: true }, { transacting })
    }
    return GroupRelationship.forge({ parent_group_id: parentGroup.id, child_group_id: this.id }).save({}, { transacting })
  },

  // if a group membership doesn't exist for a user id, create it.
  // make sure the group memberships have the passed-in role and settings
  // (merge on top of existing settings).
  async addMembers (usersOrIds, attrs = {}, { transacting } = {}) {
    const updatedAttribs = Object.assign(
      {},
      {
        active: true,
        role: GroupMembership.Role.DEFAULT,
        settings: {
          sendEmail: true,
          sendPushNotifications: true,
          showJoinForm: true
        }
      },
      pick(omitBy(attrs, isUndefined), GROUP_ATTR_UPDATE_WHITELIST)
    )

    const userIds = usersOrIds.map(x => x instanceof User ? x.id : x)
    const existingMemberships = await this.memberships(true)
      .query(q => q.whereIn('user_id', userIds)).fetch({ transacting })
    const reactivatedUserIds = existingMemberships.filter(m => !m.get('active')).map(m => m.get('user_id'))
    const existingUserIds = existingMemberships.pluck('user_id')
    const newUserIds = difference(userIds, existingUserIds)
    const updatedMemberships = await this.updateMembers(existingUserIds, updatedAttribs, { transacting })

    const newMemberships = []
    const defaultTagIds = (await GroupTag.defaults(this.id, transacting)).models.map(t => t.get('tag_id'))

    for (const id of newUserIds) {
      const membership = await this.memberships().create(
        Object.assign({}, updatedAttribs, {
          user_id: id,
          created_at: new Date(),
          settings: {
            ...updatedAttribs.settings,
            // Show join form, and ask for agreements and join questions to be answered, unless member is the creator of the group
            agreementsAcceptedAt: id === this.get('created_by_id') ? new Date() : null,
            joinQuestionsAnsweredAt: id === this.get('created_by_id') ? new Date() : null,
            showJoinForm: id !== this.get('created_by_id')
          }
        }), { transacting })
      newMemberships.push(membership)
      // Based on the role attribute, add or remove the user to the Coordinator common role
      // TODO: RESP, change this to directly pass in and set commonRoles, instead of the role attribute
      await MemberCommonRole.updateCoordinatorRole({ userId: id, groupId: this.id, role: updatedAttribs.role, transacting })
      // Subscribe each user to the default tags in the group
      await User.followTags(id, this.id, defaultTagIds, transacting)
    }

    // Increment num_members
    // XXX: num_members is updated every 10 minutes via cron, we are doing this here too for the case that someone joins a group and moderator looks immediately at member count after that
    if (newUserIds.length > 0) {
      await this.save({ num_members: this.get('num_members') + newUserIds.length }, { transacting })
    }

    Queue.classMethod('Group', 'afterAddMembers', {
      groupId: this.id,
      newUserIds,
      reactivatedUserIds
    })

    return updatedMemberships.concat(newMemberships)
  },

  createDefaultTopics: async function (group_id, user_id, transacting) {
    return Tag.where({ name: 'general' }).fetch({ transacting })
      .then(generalTag => {
        return GroupTag.create({ updated_at: new Date(), group_id, tag_id: generalTag.get('id'), user_id, is_default: true }, { transacting })
      })
  },

  createInitialWidgets: async function (transacting) {
    // In the future this will have to look up the template of whatever group is being created and add widgets based on that
    const initialWidgets = await Widget.query(q => q.whereIn('id', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 19, 20, 21])).fetchAll({ transacting })
    Promise.map(initialWidgets.models, async (widget) => {
      await GroupWidget.create({ group_id: this.id, widget_id: widget.id, order: widget.id, context: widget.id > 10 ? 'group_profile' : 'landing' }, { transacting })
    })
  },

  createStarterPosts: function (transacting) {
    const now = new Date()
    const timeShift = { offer: 1, request: 2, resource: 3 }

    return Group.find('starter-posts', { withRelated: ['posts'] })
      .then(g => {
        if (!g) throw new Error('Starter posts group not found')
        return g
      })
      .then(g => g.relations.posts.models)
      .then(posts => Promise.map(posts, post => {
        if (post.get('type') === 'welcome') return
        const newPost = post.copy()
        const time = new Date(now - (timeShift[post.get('type')] || 0) * 1000)
        // TODO: why are we attaching Ed West as a follower to every welcome post??
        return newPost.save({created_at: time, updated_at: time}, {transacting})
          .then(() => Promise.all(flatten([
            this.posts().attach(newPost, {transacting}),
            post.followers().fetch().then(followers =>
              newPost.addFollowers(followers.map(f => f.id), {}, {transacting})
            )
          ])))
      }))
  },

  async removeMembers (usersOrIds, { transacting } = {}) {
    return this.updateMembers(usersOrIds, {active: false}, {transacting}).then(() =>
      this.save({ num_members: this.get('num_members') - usersOrIds.length }, { transacting }))
  },

  async updateMembers (usersOrIds, attrs, { transacting } = {}) {
    const userIds = usersOrIds.map(x => x instanceof User ? x.id : x)

    const existingMemberships = await this.memberships(true)
      .query(q => q.whereIn('user_id', userIds)).fetch({ transacting })

    const updatedAttribs = Object.assign(
      {},
      {settings: {}},
      pick(omitBy(attrs, isUndefined), GROUP_ATTR_UPDATE_WHITELIST)
    )

    return Promise.map(existingMemberships.models, ms => ms.updateAndSave(updatedAttribs, {transacting}))
  },

  update: async function (changes, updatedByUserId) {
    const whitelist = [
      'about_video_uri', 'active', 'access_code', 'accessibility', 'avatar_url', 'banner_url',
      'description', 'geo_shape', 'location', 'location_id', 'name', 'purpose', 'settings',
      'steward_descriptor', 'steward_descriptor_plural', 'type_descriptor', 'type_descriptor_plural', 'visibility'
    ]
    const trimAttrs = ['name', 'description', 'purpose']

    const attributes = mapValues(pick(changes, whitelist), (v, k) => trimAttrs.includes(k) ? trim(v) : v)
    const saneAttrs = clone(attributes)

    if (attributes.settings) {
      saneAttrs.settings = merge({}, this.get('settings'), attributes.settings)
    }

    // If location_id is explicitly set to something empty then set it to null
    // Otherwise leave it alone
    saneAttrs.location_id = saneAttrs.hasOwnProperty('location_id') && isEmpty(saneAttrs.location_id) ? null : saneAttrs.location_id

    // Make sure geometry column goes into the database correctly, converting from GeoJSON
    if (!isEmpty(attributes.geo_shape)) {
      const st = knexPostgis(bookshelf.knex)
      saneAttrs.geo_shape = st.geomFromGeoJSON(attributes.geo_shape)
    } else if (saneAttrs.hasOwnProperty('geo_shape')) {
      // if geo_shape is explicitly set to an empty value then unset it
      saneAttrs.geo_shape = null
    }

    this.set(saneAttrs)
    await this.validate()

    await bookshelf.transaction(async transacting => {
      if (changes.agreements) {
        const currentAgreementIds = (await this.agreements().fetch({ transacting })).pluck('id')
        const newAgreementIds = []

        // TODO: what if there are multiple agreements with the same title/description?
        const agreements = await Promise.map(changes.agreements.filter(a => trim(a.title) !== ''), async (a) => {
          let agreement = await Agreement.where({ title: trim(a.title), description: trim(a.description) }).fetch({ transacting })
          if (!agreement) {
            agreement = await Agreement.forge({ title: trim(a.title), description: trim(a.description) }).save({}, { transacting })
          }
          newAgreementIds.push(agreement.id)
          return agreement
        })

        // If there are any new/different agreements track the date of the change so we can tell group members
        // TODO: more sophisticated way to track what exactly changed in the text
        const differentIds = xor(currentAgreementIds, newAgreementIds)
        if (differentIds.length > 0) {
          this.addSetting({ agreements_last_updated_at: (new Date()).toISOString() })
          // Make sure that the user making the changes doesn't need to then accept the new agreements
          const updatedByUserMembership = await GroupMembership.forPair(updatedByUserId, this.id).fetch()
          if (updatedByUserMembership) {
            await updatedByUserMembership.save({ settings: { ...updatedByUserMembership.get('settings'), agreementsAcceptedAt: (new Date()).toISOString() } }, { transacting })
          }
        }

        await GroupAgreement.where({ group_id: this.id }).destroy({ require: false, transacting })
        let order = 1
        for (const a of agreements) {
          await GroupAgreement.forge({ group_id: this.id, agreement_id: a.id, order }).save({}, { transacting })
          order = order + 1
        }
      }

      if (changes.group_to_group_join_questions) {
        const questions = await Promise.map(changes.group_to_group_join_questions.filter(jq => trim(jq.text) !== ''), async (jq) => {
          return (await Question.where({ text: trim(jq.text) }).fetch({ transacting })) || (await Question.forge({ text: trim(jq.text) }).save({}, { transacting }))
        })
        await GroupToGroupJoinQuestion.where({ group_id: this.id }).destroy({ require: false, transacting })
        for (const q of questions) {
          await GroupToGroupJoinQuestion.forge({ group_id: this.id, question_id: q.id }).save({}, { transacting })
        }
      }

      if (changes.join_questions) {
        const questions = await Promise.map(changes.join_questions.filter(jq => trim(jq.text) !== ''), async (jq) => {
          return (await Question.where({ text: trim(jq.text) }).fetch({ transacting })) || (await Question.forge({ text: trim(jq.text) }).save({}, { transacting }))
        })
        await GroupJoinQuestion.where({ group_id: this.id }).destroy({ require: false, transacting })
        for (const q of questions) {
          await GroupJoinQuestion.forge({ group_id: this.id, question_id: q.id }).save({}, { transacting })
        }
      }

      if (changes.prerequisite_group_ids) {
        // Go through all parent groups and reset which ones are prerequisites
        const parentRelationships = await this.parentGroupRelationships().fetch({ transacting })
        await Promise.map(parentRelationships.models, async (relationship) => {
          const isNowPrereq = changes.prerequisite_group_ids.includes(relationship.get('parent_group_id'))
          if (relationship.getSetting('isPrerequisite') !== isNowPrereq) {
            await relationship.addSetting({ isPrerequisite: isNowPrereq }, true, transacting)
          }
        })
      }

      if (changes.group_extensions) {
        for (const extData of changes.group_extensions) {
          const ext = await Extension.find(extData.type)
          if (ext) {
            const ge = (await GroupExtension.find(this.id, ext.id)) || new GroupExtension({ group_id: this.id, extension_id: ext.id })
            ge.set({ data: extData.data })
            await ge.save({}, { transacting })
          } else {
            throw new GraphQLYogaError('Invalid extension type ' + extData.type)
          }
        }
      }

      if (changes.custom_views) {
        const currentViews = await this.customViews().fetch({ transacting })
        let currentView = currentViews.shift()
        // TODO: more validation?
        const newViews = changes.custom_views.filter(cv => trim(cv.name) !== '')
        let newView = newViews.shift()
        // Update current views, add new ones, delete old ones and try to be efficient about it
        while (currentView || newView) {
          if (newView) {
            const topics = newView && newView.topics
            delete newView.topics
            delete newView.id
            if (currentView) {
              await currentView.save(newView, { transacting })

              // If this custom view has a collection then update the name of the collection to match the custom view's name
              const collection = await currentView.collection().fetch()
              if (collection && collection.get('name') !== currentView.get('name')) {
                await collection.save({ name: currentView.get('name') })
              }
            } else {
              currentView = await CustomView.forge({ ...newView, group_id: this.id }).save({}, { transacting })
            }

            await currentView.updateTopics(topics, transacting)
          } else if (currentView) {
            await currentView.destroy({ transacting })
          } else {
            break
          }
          currentView = currentViews.shift()
          newView = newViews.shift()
        }
      }

      await this.save({}, { transacting })
    })

    // If a new location is being passed in but not a new location_id then we geocode on the server
    if (changes.location && changes.location !== this.get('location') && !changes.location_id) {
      await Queue.classMethod('Group', 'geocodeLocation', { groupId: this.id })
    }
    return this
  },

  validate: function () {
    if (!trim(this.get('name'))) {
      return Promise.reject(new GraphQLYogaError('Name cannot be blank'))
    }

    return Promise.resolve()
  },
}, HasSettings), {
  // ****** Class constants ****** //

  Visibility: {
    HIDDEN: 0,
    PROTECTED: 1,
    PUBLIC: 2
  },

  Accessibility: {
    CLOSED: 0,
    RESTRICTED: 1,
    OPEN: 2
  },

  // ******* Class methods ******** //

  // Background task to do additional work/tasks when new members are added to a group
  async afterAddMembers ({ groupId, newUserIds, reactivatedUserIds }) {
    const zapierTriggers = await ZapierTrigger.forTypeAndGroups('new_member', groupId).fetchAll()

    const members = await User.query(q => q.whereIn('id', newUserIds.concat(reactivatedUserIds))).fetchAll()

    if (zapierTriggers && zapierTriggers.length > 0) {
      const group = await Group.find(groupId)
      for (const trigger of zapierTriggers) {
        const response = await fetch(trigger.get('target_url'), {
          method: 'post',
          body: JSON.stringify(members.map(m => ({
            id: m.id,
            avatarUrl: m.get('avatar_url'),
            bio: m.get('bio'),
            contactEmail: m.get('contact_email'),
            contactPhone: m.get('contact_phone'),
            facebookUrl: m.get('facebook_url'),
            linkedinUrl: m.get('linkedin_url'),
            location: m.get('location'),
            name: m.get('name'),
            profileUrl: Frontend.Route.profile(m, group),
            tagline: m.get('tagline'),
            twitterName: m.get('twitter_name'),
            url: m.get('url'),
            // Whether this user was previously in the group and is being reactivated
            reactivated: reactivatedUserIds.includes(m.id),
            // Which group were they added to, since the trigger can be for multiple groups
            group: { id: group.id, name: group.get('name'), url: Frontend.Route.group(group) }
          }))),
          headers: { 'Content-Type': 'application/json' }
        })
        // TODO: what to do with the response? check if succeeded or not?
      }
    }

    for (const member of members) {
      mixpanel.track(AnalyticsEvents.GROUP_NEW_MEMBER, {
        distinct_id: member.id,
        groupId: [groupId]
      })
    }
  },

  async create (userId, data) {
    if (!data.slug) {
      throw new GraphQLYogaError('Missing required field: slug')
    }
    const existingGroup = await Group.find(data.slug)
    if (existingGroup) {
      throw new GraphQLYogaError('A group with that URL slug already exists')
    }

    const trimAttrs = ['name', 'purpose']
    const attrs = defaults(
      pick(mapValues(data, (v, k) => trimAttrs.includes(k) ? trim(v) : v),
        'about_video_uri', 'accessibility', 'access_code', 'avatar_url', 'banner_url', 'description',
        'location_id', 'location', 'group_data_type', 'name', 'purpose', 'settings', 'slug',
        'steward_descriptor', 'steward_descriptor_plural', 'type', 'type_descriptor', 'type_descriptor_plural', 'visibility'
      ),
      {
        accessibility: Group.Accessibility.RESTRICTED,
        avatar_url: DEFAULT_AVATAR,
        banner_url: DEFAULT_BANNER,
        group_data_type: 1,
        visibility: Group.Visibility.PROTECTED
      }
    )

    // XXX: for now groups by default cannot post to public on production
    attrs.allow_in_public = process.env.NODE_ENV === 'development'

    // eslint-disable-next-line camelcase
    const access_code = attrs.access_code || await Group.getNewAccessCode()
    const group = new Group(merge(attrs, {
      access_code,
      created_at: new Date(),
      created_by_id: userId,
      settings: { allow_group_invites: false, agreements_last_updated_at: null, public_member_directory: false }
    }))

    await bookshelf.transaction(async trx => {
      await group.save(null, { transacting: trx })

      if (data.group_extensions) {
        for (const extData of data.group_extensions) {
          const ext = await Extension.find(extData.type, { transacting: trx })
          if (ext) {
            const ge = new GroupExtension({ group_id: group.id, extension_id: ext.id, data: extData.data })
            await ge.save(null, { transacting: trx })
          } else {
            throw new GraphQLYogaError('Invalid extension type ' + extData.type)
          }
        }
      }

      await group.createStarterPosts(trx)

      await group.createInitialWidgets(trx)

      await group.createDefaultTopics(group.id, userId, trx)

      await group.addMembers([userId], { role: GroupMembership.Role.MODERATOR }, { transacting: trx })

      // Have to add/request add to parent group after admin has been added to the group
      if (data.parent_ids) {
        for (const parentId of data.parent_ids) {
          const parent = await Group.findActive(parentId, { transacting: trx })

          if (parent) {
            // Only allow for adding parent groups that the creator is a moderator of or that are Open
            const parentGroupMembership = await GroupMembership.forIds(userId, parentId, {
              query: q => { q.select('group_memberships.*', 'groups.accessibility as accessibility', 'groups.visibility as visibility')}
            }).fetch({ transacting: trx })

            // TODO: fix hasRole
            if (parentGroupMembership &&
                (parentGroupMembership.get('accessibility') === Group.Accessibility.OPEN || parentGroupMembership.hasRole(GroupMembership.Role.MODERATOR))) {
              await group.parentGroups().attach(parentId, { transacting: trx })
            } else {
              // If can't add directly to parent group then send a request to join
              await inviteGroupToGroup(userId, group.id, parentId, GroupRelationshipInvite.TYPE.ChildToParent, [], { transacting: trx })
            }
          }
        }
      }
    })

    if (data.location && !data.location_id) {
      await Queue.classMethod('Group', 'geocodeLocation', { groupId: group.id })
    }

    await Queue.classMethod('Group', 'notifyAboutCreate', { groupId: group.id })

    return group
  },

  async deactivate (id, opts = {}) {
    const group = await Group.find(id)
    if (group) {
      await group.save({ active: false }, opts)
      return group.removeMembers(await group.members().fetch(), opts)
    }
  },

  find (idOrSlug, opts = {}) {
    if (!idOrSlug) return Promise.resolve(null)

    const where = isNaN(Number(idOrSlug))
      ? (opts.active ? { slug: idOrSlug, active: true } : { slug: idOrSlug })
      : (opts.active ? { id: idOrSlug, active: true } : { id: idOrSlug })

    return this.where(where).fetch(opts)
  },

  findActive (key, opts = {}) {
    return this.find(key, merge({ active: true }, opts))
  },

  getNewAccessCode: function () {
    const test = code => Group.where({ access_code: code }).count().then(Number)
    const loop = () => {
      const code = randomstring.generate({ length: 10, charset: 'alphanumeric' })
      return test(code).then(count => count ? loop() : code)
    }
    return loop()
  },

  geocodeLocation: async function({ groupId }) {
    const group = await Group.find(groupId)
    if (group) {
      const geocoder = mbxGeocoder({ accessToken: process.env.MAPBOX_TOKEN })

      geocoder.forwardGeocode({
        mode: 'mapbox.places-permanent',
        query: group.get('location')
      }).send().then(async (response) => {
        const match = response.body
        if (match?.features && match?.features.length > 0) {
          const locationData = omit(LocationHelpers.convertMapboxToLocation(match.features[0]), 'mapboxId')
          const loc = await findOrCreateLocation(locationData)
          group.save({ location_id: loc.id })
        }
      })
    }
  },

  messageStewards: async function(fromUserId, groupId) {
    // Make sure they can only message a group they can see
    const group = await groupFilter(fromUserId)(Group.where({ id: groupId })).fetch()
    // TODO: ADD RESP TO THIS ONE
    if (group) {
      const stewards = await group.stewards().fetch()
      if (stewards.length > 0) {
        // HACK: add user_connection row so that the people can see each other even though they are not in the same group
        stewards.forEach(async (m) => {
          await UserConnection.create(fromUserId, m.id, UserConnection.Type.MESSAGE)
        })
        const thread = await findOrCreateThread(fromUserId, stewards.map(m => m.id))
        return thread.id
      }
    }
    return null
  },

  notifyAboutCreate: function (opts) {
    return Group.find(opts.groupId, {withRelated: ['creator']})
      .then(g => {
        const creator = g.relations.creator
        const recipient = process.env.NEW_GROUP_EMAIL
        const locale = creator.getLocale()
        return Email.sendRawEmail({
          email: recipient,
          data: {
            subject: locales[locale].groupCreatedNotifySubject(g.get('name')),
            body: `${locales[locale].Group()}
              ${locales[locale].Name()}: ${g.get('name')}
              URL: ${Frontend.Route.group(g)}
              ${locales[locale].CreatorEmail()}: ${creator.get('email')}
              ${locales[locale].CreatorName()}: ${creator.get('name')}
              ${locales[locale].CreatorURL()}: ${Frontend.Route.profile(creator)}
            `.replace(/^\s+/gm, '').replace(/\n/g, '<br/>\n')
          },
          extraOptions: {
            sender: {
              name: 'Hylobot',
              address: 'dev+bot@hylo.com'
            }
          }
        })
      })
  },

  notifySlack: function (groupId, post) {
    return Group.find(groupId)
      .then(group => {
        if (!group || !group.get('slack_hook_url')) return
        const slackMessage = Slack.textForNewPost(post, group)
        return Slack.send(slackMessage, group.get('slack_hook_url'))
      })
  },

  async pluckIdsForMember (userOrId, where) {
    return await this.selectIdsForMember(userOrId, where).pluck('groups.id')
  },

  queryByAccessCode: function (accessCode) {
    return this.query(qb => {
      qb.whereRaw('lower(access_code) = lower(?)', accessCode)
      qb.where('active', true)
    })
  },

  selectIdsForMember (userOrId, where) {
    return GroupMembership.forIds(userOrId, null, {
      query: q => {
        q.select('groups.id')
        q.join('groups', 'groups.id', 'group_memberships.group_id')
        q.where('groups.active', true)
        if (where) q.where(where)
      },
      multiple: true
    }).query()
  },

  selectIdsByResponsibilities (userOrId, responsibilities) {
    const throughCommonRole = MemberCommonRole.query(q => {
      q.select('group_id')
      whereId(q, userOrId, 'group_memberships_common_roles.user_id')
      q.join('common_roles_responsibilities', 'common_roles_responsibilities.common_role_id', 'group_memberships_common_roles.common_role_id')
      q.where('common_roles_responsibilities.responsibility_id', 'in', responsibilities)
    })

    const throughGroupRole = MemberGroupRole.collection().query(q => {
      q.select('group_id')
      whereId(q, userOrId, 'group_memberships_group_roles.user_id')
      q.join('group_roles_responsibilities', 'group_roles_responsibilities.group_role_id', 'group_memberships_group_roles.group_role_id')
      q.where('group_roles_responsibilities.responsibility_id', 'in', responsibilities)
    })

    return GroupMembership.forIds(userOrId, null, {
      query: q => {
        q.select('groups.id')
        q.join('groups', 'groups.id', 'group_memberships.group_id')
        q.where('groups.active', true)
        q.where((q2) => {
          q2.whereIn('groups.id', throughCommonRole.query())
          q2.orWhereIn('groups.id', throughGroupRole.query())
        })
      },
      multiple: true
    }).query()
  },

  async allHaveMember (groupDataIds, userOrId) {
    const memberIds = await this.pluckIdsForMember(userOrId)
    return difference(groupDataIds, memberIds).length === 0
  },

  havingExactMembers (userIds) {
    userIds = sortBy(userIds, Number)
    return this.query(q => {
      q.join('group_memberships', 'groups.id', 'group_memberships.group_id')
      q.where('group_memberships.active', true)
      q.groupBy('groups.id')
      q.having(bookshelf.knex.raw('array_agg(user_id order by user_id) = ?', [userIds]))
    })
  },

  async inSameGroup (userIds) {
    const groupIds = await Promise.all(userIds.map(id => this.pluckIdsForMember(id)))
    return intersection(groupIds).length > 0
  },

  isSlugValid: function (slug) {
    const regex = /^[0-9a-z-]{2,40}$/
    return regex.test(slug)
  },

  updateAllMemberCounts () {
    return bookshelf.knex.raw('update groups set num_members = (select count(group_memberships.*) from group_memberships inner join users on users.id = group_memberships.user_id where group_memberships.active = true and users.active = true and group_memberships.group_id = groups.id)')
  }
})

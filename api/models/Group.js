import knexPostgis from 'knex-postgis'
import { clone, defaults, difference, flatten, intersection, isEmpty, map, merge, sortBy, pick, omitBy, isUndefined, trim } from 'lodash'
import randomstring from 'randomstring'
import wkx from 'wkx'
import HasSettings from './mixins/HasSettings'
import DataType, {
  getDataTypeForInstance, getDataTypeForModel, getModelForDataType
} from './group/DataType'

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

  format(attributes) {
    const st = knexPostgis(bookshelf.knex);

    // Make sure geometry column goes into the database correctly, converting from GeoJSON
    const { geo_shape } = attributes
    if (geo_shape) {
      attributes.geo_shape = st.geomFromGeoJSON(geo_shape)
    }

    return attributes
  },

  parse(response) {
    const st = knexPostgis(bookshelf.knex)

    // Convert geometry hex values into GeoJSON before returning to the client
    if (typeof response.geo_shape === 'string') {
      const b = Buffer.from(response.geo_shape, 'hex')
      const parsedGeo = wkx.Geometry.parse(b)
      response.geo_shape = parsedGeo.toGeoJSON()
    }

    return response
  },

  // ******** Getters ******* //

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

  groupRelationshipInvitesFrom () {
    return this.hasMany(GroupRelationshipInvite, 'from_group_id')
      .query({ where: { status: GroupRelationshipInvite.STATUS.Pending }})
  },

  groupRelationshipInvitesTo () {
    return this.hasMany(GroupRelationshipInvite, 'to_group_id')
      .query({ where: { status: GroupRelationshipInvite.STATUS.Pending }})
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

  members (where) {
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
    return this.hasMany(GroupMembership)
      .query(q => includeInactive ? q : q.where('group_memberships.active', true))
  },

  memberCount: function () {
    return this.get('num_members')
  },

  moderators () {
    return this.members({ role: GroupMembership.Role.MODERATOR })
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
      .query({ where: { 'active': true } })
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
      q.where({'groups_posts.group_id': this.id, 'active': true})
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

  // The posts to show for a particular user viewing a group's stream or map
  // includes the direct posts to this group + posts to child groups the user is a member of
  viewPosts (userId) {
    const treeOfGroupsForMember = this.allChildGroups().query(q => {
      q.select('groups.id')
      q.join('group_memberships', 'group_memberships.group_id', 'groups.id')
      q.where('group_memberships.user_id', userId)
    })

    return Post.collection().query(q => {
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

  async addChild(childGroup, { transacting } = {}) {
    const childGroupId = childGroup instanceof Group ? childGroup.id : childGroup
    const existingChild = await GroupRelationship.where({ child_group_id: childGroupId, parent_group_id: this.id }).fetch({ transacting })
    if (existingChild) {
      return existingChild.save({ active: true }, { transacting })
    }
    return GroupRelationship.forge({ child_group_id: childGroupId, parent_group_id: this.id }).save({}, { transacting })
  },

  async addParent(parentGroup, { transacting } = {}) {
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
          showJoinForm: false
        }
      },
      pick(omitBy(attrs, isUndefined), GROUP_ATTR_UPDATE_WHITELIST)
    )

    const userIds = usersOrIds.map(x => x instanceof User ? x.id : x)
    const existingMemberships = await this.memberships(true)
      .query(q => q.whereIn('user_id', userIds)).fetch({ transacting })
    const existingUserIds = existingMemberships.pluck('user_id')
    const newUserIds = difference(userIds, existingUserIds)
    const updatedMemberships = await this.updateMembers(existingUserIds, updatedAttribs, { transacting })
    const newMemberships = []

    for (let id of newUserIds) {
      const membership = await this.memberships().create(
        Object.assign({}, updatedAttribs, {
          user_id: id,
          created_at: new Date()
        }), { transacting })
      newMemberships.push(membership)
    }

    // Increment num_members
    // XXX: num_members is updated every 10 minutes via cron, we are doing this here too for the case that someone joins a group and moderator looks immedaitely at member count after that
    if (newUserIds.length > 0) {
      await this.save({ num_members: this.get('num_members') + newUserIds.length }, { transacting })
    }

    return updatedMemberships.concat(newMemberships)
  },

  createInitialWidgets: async function (transacting) {
    // In the future this will have to look up the template of whatever group is being created and add widgets based on that
    const initialWidgets = await Widget.query(q => q.whereIn('id', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 19, 20, 21])).fetchAll({ transacting })
    Promise.map(initialWidgets.models, async (widget) => {
      await GroupWidget.create({ group_id: this.id, widget_id: widget.id, order: widget.id, context: widget.id > 10 ? 'group_profile' : 'landing' }, { transacting })
    })
  },

  createStarterPosts: function (transacting) {
    var now = new Date()
    var timeShift = {offer: 1, request: 2, resource: 3}

    return Group.find('starter-posts', {withRelated: ['posts']})
    .then(g => {
      if (!g) throw new Error('Starter posts group not found')
      return g
    })
    .then(g => g.relations.posts.models)
    .then(posts => Promise.map(posts, post => {
      if (post.get('type') === 'welcome') return
      var newPost = post.copy()
      var time = new Date(now - (timeShift[post.get('type')] || 0) * 1000)
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

  update: async function (changes) {
    var whitelist = [
      'active', 'access_code', 'accessibility', 'avatar_url', 'banner_url', 'description',
      'geo_shape', 'location', 'location_id', 'name', 'settings', 'visibility'
    ]

    const attributes = pick(changes, whitelist)
    const saneAttrs = clone(attributes)

    if (attributes.settings) {
      saneAttrs.settings = merge({}, this.get('settings'), attributes.settings)
    }

    saneAttrs.location_id = isEmpty(saneAttrs.location_id) ? null : saneAttrs.location_id

    if (changes.group_to_group_join_questions) {
      const questions = await Promise.map(changes.group_to_group_join_questions.filter(jq => trim(jq.text) !== ''), async (jq) => {
        return (await Question.where({ text: trim(jq.text) }).fetch()) || (await Question.forge({ text: trim(jq.text) }).save())
      })
      await GroupToGroupJoinQuestion.where({ group_id: this.id }).destroy({ require: false })
      for (let q of questions) {
        await GroupToGroupJoinQuestion.forge({ group_id: this.id, question_id: q.id }).save()
      }
    }

    if (changes.join_questions) {
      const questions = await Promise.map(changes.join_questions.filter(jq => trim(jq.text) !== ''), async (jq) => {
        return (await Question.where({ text: trim(jq.text) }).fetch()) || (await Question.forge({ text: trim(jq.text) }).save())
      })
      await GroupJoinQuestion.where({ group_id: this.id }).destroy({ require: false })
      for (let q of questions) {
        await GroupJoinQuestion.forge({ group_id: this.id, question_id: q.id }).save()
      }
    }

    if (changes.prerequisite_group_ids) {
      // Go through all parent groups and reset which ones are prerequisites
      const parentRelationships = await this.parentGroupRelationships().fetch()
      await Promise.map(parentRelationships.models, async (relationship) => {
        const isNowPrereq = changes.prerequisite_group_ids.includes(relationship.get('parent_group_id'))
        if (relationship.getSetting('isPrerequisite') !== isNowPrereq) {
          await relationship.addSetting({ isPrerequisite: isNowPrereq}, true)
        }
      })
    }

    this.set(saneAttrs)
    await this.validate().then(() => this.save())
    return this
  },

  validate: function () {
    if (!trim(this.get('name'))) {
      return Promise.reject(new Error('Name cannot be blank'))
    }

    return Promise.resolve()
  },
}, HasSettings), {
  // ****** Class constants ****** //
  //TODO: remove
  DataType,

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
  async create (userId, data) {
    var attrs = defaults(
      pick(data,
        'accessibility', 'description', 'slug', 'category', 'access_code', 'banner_url', 'avatar_url',
        'location_id', 'location', 'group_data_type', 'name', 'visibility'
      ),
      {
        'accessibility': Group.Accessibility.RESTRICTED,
        'avatar_url': DEFAULT_AVATAR,
        'banner_url': DEFAULT_BANNER,
        'group_data_type': 1,
        'visibility': Group.Visibility.PROTECTED
      }
    )

    // eslint-disable-next-line camelcase
    const access_code = attrs.access_code || await Group.getNewAccessCode()

    const group = new Group(merge(attrs, {
      access_code,
      created_at: new Date(),
      created_by_id: userId,
      settings: { allow_group_invites: false, public_member_directory: false }
    }))

    const memberships = await bookshelf.transaction(async trx => {
      await group.save(null, {transacting: trx})
      if (data.parent_ids) {
        for (const parentId of data.parent_ids) {
          // Only allow for adding parent groups that the creator is a moderator of or that are Open
          const parentGroupMembership = await GroupMembership.forIds(userId, parentId, {
            query: q => { q.select('group_memberships.*', 'groups.accessibility as accessibility', 'groups.visibility as visibility')}
          }).fetch({ transacting: trx })

          if (parentGroupMembership &&
              (parentGroupMembership.get('role') === GroupMembership.Role.MODERATOR
                || parentGroupMembership.get('accessibility') === Group.Accessibility.OPEN)) {
            await group.parentGroups().attach(parentId, { transacting: trx })
          }
        }
      }

      await group.createStarterPosts(trx)

      await group.createInitialWidgets(trx)

      return group.addMembers([userId],
        {role: GroupMembership.Role.MODERATOR}, { transacting: trx })
    })

    await Queue.classMethod('Group', 'notifyAboutCreate', { groupId: group.id })

    return memberships[0]
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

    let where = isNaN(Number(idOrSlug))
      ? (opts.active ? {slug: idOrSlug, active: true} : {slug: idOrSlug})
      : (opts.active ? {id: idOrSlug, active: true} : {id: idOrSlug})

    return this.where(where).fetch(opts)
  },

  findActive (key, opts = {}) {
    return this.find(key, merge({active: true}, opts))
  },

  getNewAccessCode: function () {
    const test = code => Group.where({access_code: code}).count().then(Number)
    const loop = () => {
      const code = randomstring.generate({length: 10, charset: 'alphanumeric'})
      return test(code).then(count => count ? loop() : code)
    }
    return loop()
  },

  notifyAboutCreate: function (opts) {
    return Group.find(opts.groupId, {withRelated: ['creator']})
    .then(g => {
      var creator = g.relations.creator
      var recipient = process.env.NEW_GROUP_EMAIL
      return Email.sendRawEmail(recipient, {
        subject: "New Hylo Group Created: " + g.get('name'),
        body: `Group
          Name: ${g.get('name')}
          URL: ${Frontend.Route.group(g)}
          Creator Email: ${creator.get('email')}
          Creator Name: ${creator.get('name')}
          Creator URL: ${Frontend.Route.profile(creator)}
        `.replace(/^\s+/gm, '').replace(/\n/g, '<br/>\n')
      }, {
        sender: {
          name: 'Hylobot',
          address: 'dev+bot@hylo.com'
        }
      })
    })
  },

  notifySlack: function (groupId, post) {
    return Group.find(groupId)
    .then(group => {
      if (!group || !group.get('slack_hook_url')) return
      var slackMessage = Slack.textForNewPost(post, group)
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
      q.having(bookshelf.knex.raw(`array_agg(user_id order by user_id) = ?`, [userIds]))
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

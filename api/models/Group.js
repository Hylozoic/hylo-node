import { clone, defaults, difference, flatten, intersection, map, merge, sortBy, pick, omitBy, isUndefined, trim } from 'lodash'
import randomstring from 'randomstring'
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

  // ******** Getters ******* //

  childGroups () {
    return this.belongsToMany(Group)
      .through(GroupConnection, 'parent_group_id', 'child_group_id')
  },

  groupTags () {
    return this.hasMany(GroupTag)
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
    // TODO: investigate why num_members is not always accurate
    // then remove memberCount and use num_members
    // return this.get('num_members')
    return this.members().fetch().then(x => x.length)
  },

  moderators () {
    return this.members({ role: GroupMembership.Role.MODERATOR })
  },

  parentGroups () {
    return this.belongsToMany(Group)
      .through(GroupConnection, 'child_group_id', 'parent_group_id')
  },

  posts () {
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

  // ******** Setters ********** //

  // if a group membership doesn't exist for a user id, create it.
  // make sure the group memberships have the passed-in role and settings
  // (merge on top of existing settings).
  async addMembers (usersOrIds, attrs = {}, { transacting } = {}) {
    const updatedAttribs = Object.assign(
      {},
      {
        role: GroupMembership.Role.DEFAULT,
        active: true
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
          created_at: new Date(),
        }), { transacting })
      newMemberships.push(membership)
    }
    return updatedMemberships.concat(newMemberships)
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
          newPost.addFollowers(followers.map(f => f.id), {}, {transacting}))
      ])))
    }))
  },

  async removeMembers (usersOrIds, { transacting } = {}) {
    return this.updateMembers(usersOrIds, {active: false}, {transacting})
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
      'location', 'location_id', 'name', 'settings', 'visibility'
    ]

    const attributes = pick(changes, whitelist)
    const saneAttrs = clone(attributes)

    if (attributes.settings) {
      saneAttrs.settings = merge({}, this.get('settings'), attributes.settings)
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
        'name', 'description', 'slug', 'category', 'access_code', 'banner_url', 'avatar_url',
        'location_id', 'location', 'group_data_type'
      ),
      {'banner_url': DEFAULT_BANNER, 'avatar_url': DEFAULT_AVATAR, 'group_data_type': 1}
    )

    // eslint-disable-next-line camelcase
    const access_code = attrs.access_code ||
      await Group.getNewAccessCode()

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
          // TODO: check if we are allowed to make these parents or not, if they are restricted then create join requests
          await group.parentGroups().attach(parentId, { transacting: trx })
        }
      }
      await group.createStarterPosts(trx)
      return group.addMembers([userId],
        {role: GroupMembership.Role.MODERATOR}, {transacting: trx})
    })

    await Queue.classMethod('Group', 'notifyAboutCreate', { groupId: group.id })

    return memberships[0]
  },

  getNewAccessCode: function () {
    const test = code => Group.where({access_code: code}).count().then(Number)
    const loop = () => {
      const code = randomstring.generate({length: 10, charset: 'alphanumeric'})
      return test(code).then(count => count ? loop() : code)
    }
    return loop()
  },

  find (idOrSlug, opts = {}) {
    if (!idOrSlug) return Promise.resolve(null)

    let where = isNaN(Number(idOrSlug))
      ? (opts.active ? {slug: idOrSlug, active: true} : {slug: idOrSlug})
      : (opts.active ? {id: idOrSlug, active: true} : {id: idOrSlug})

    return this.where(where).fetch(opts)
  },

  // TODO: do we use this?
  findActive (key, opts = {}) {
    return this.find(key, merge({active: true}, opts))
  },

  async deactivate (id, opts = {}) {
    const group = await Group.find(id).fetch()
    await group.save({ active: false }, opts)
    return group.removeMembers(await group.members().fetch(), opts)
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
        if (where) q.where(where)

        q.select('groups.id')

        q.join('groups', 'groups.id', 'group_memberships.group_id')
        q.where('groups.active', true)
      },
      multiple: true
    }).query()
  },

  async pluckIdsForMember (userOrId, where) {
    return await this.selectIdsForMember(userOrId, where).pluck('groups.id')
  },

  // TODO: this is temporary to support current idea of Networks
  // visibleNetworkGroupIds (userId, rawQuery) {
  //   const networkIds = Group.selectIdsForMember(userId, Group.DataType.NETWORK)

  //   const query = bookshelf.knex.select('child_groups.id')
  //     .from('groups as child_groups')
  //     .join('group_connections', 'child_groups.id', 'group_connections.child_group_id')
  //     .where(inner => {
  //       inner.whereIn('group_connections.parent_group_id', networkIds)
  //       inner.andWhere('child_groups.group_data_type', Group.DataType.GROUP)
  //       inner.andWhere('child_groups.visibility', '!=', Group.Visibility.HIDDEN)
  //     })

  //   return rawQuery ? query : query.pluck('child_groups.id')
  // },

  havingExactMembers (userIds) {
    userIds = sortBy(userIds, Number)
    return this.query(q => {
      q.join('group_memberships', 'groups.id', 'group_memberships.group_id')
      q.where('group_memberships.active', true)
      q.groupBy('groups.id')
      q.having(bookshelf.knex.raw(`array_agg(user_id order by user_id) = ?`, [userIds]))
    })
  },

  async allHaveMember (groupDataIds, userOrId) {
    const memberIds = await this.pluckIdsForMember(userOrId)
    return difference(groupDataIds, memberIds).length === 0
  },

  async inSameGroup (userIds) {
    const groupIds = await Promise.all(userIds.map(id => this.pluckIdsForMember(id)))
    return intersection(groupIds).length > 0
  },

  isSlugValid: function (slug) {
    const regex = /^[0-9a-z-]{2,40}$/
    return regex.test(slug)
  }
})

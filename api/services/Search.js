import forUsers from './Search/forUsers'
import forPosts from './Search/forPosts'
import forModerationActions from './Search/forModerationActions'
import { countTotal } from '../../lib/util/knex'
import { filterAndSortGroups } from './Search/util'
import { transform } from 'lodash'
import { get } from 'lodash/fp'

module.exports = {
  forPosts,

  forUsers,

  forSkills: opts => Skill.search(opts),

  forModerationActions,

  forGroups: function (opts) {
    return Group.query(qb => {
      if (opts.nearCoord) {
        qb.with('nearest_groups', bookshelf.knex.raw(`
        SELECT groups.id, ST_Distance(t.x, locations.center) AS nearest 
         FROM (SELECT ST_GeographyFromText('SRID=4326;POINT(${opts.nearCoord.lng} ${opts.nearCoord.lat})')) AS t(x), groups
         INNER JOIN locations
         ON groups.location_id = locations.id
         WHERE ST_DWithin(t.x, locations.center, 10000000)`))
        qb.join('nearest_groups', 'groups.id', '=', 'nearest_groups.id')
      }

      if (opts.groupIds) {
        qb.whereIn('groups.id', opts.groupIds)
      }

      if (opts.autocomplete) {
        qb.whereRaw('groups.name ilike ?', opts.autocomplete + '%')
      }

      if (opts.slug) {
        qb.whereIn('groups.slug', opts.slug)
      }

      if (opts.groupType) {
        qb.where('groups.type', opts.groupType)
      }

      if (opts.visibility) {
        qb.where('groups.visibility', opts.visibility)
      }

      if (opts.onlyMine) {
        const selectIdsForMember = Group.selectIdsForMember(opts.currentUserId)
        qb.whereIn('groups.id', selectIdsForMember)
      }

      if (opts.parentSlugs) {
        qb.join('group_relationships', 'groups.id', '=', 'group_relationships.child_group_id')
        qb.join('groups as parent_groups', 'parent_groups.id', '=', 'group_relationships.parent_group_id')
        qb.whereIn('parent_groups.slug', opts.parentSlugs)
      }

      if (opts.farmQuery && (opts.farmQuery.productCategories !== '' || opts.farmQuery.farmType !== '' || opts.farmQuery.certOrManagementPlan !== '')) {
        const { productCategories, farmType, certOrManagementPlan } = opts.farmQuery
        qb.join('group_extensions', 'groups.id', '=', 'group_extensions.group_id')
        qb.join('extensions', 'group_extensions.extension_id', '=', 'extensions.id')
        qb.whereRaw('extensions.type = \'farm-onboarding\'')
        qb.whereRaw('(groups.settings -> \'hideExtensionData\')::boolean IS NOT TRUE')

        if (farmType !== '') {
          qb.whereRaw(`group_extensions.data @> '{"types": ["${farmType}"]}'`)
        }

        if (productCategories !== '') {
          qb.whereRaw(`group_extensions.data @> '{"products_categories": ["${productCategories}"]}'`)
        }

        if (certOrManagementPlan !== '') {
          qb.whereRaw(`group_extensions.data @> '{"management_plans_current_detail": ["${certOrManagementPlan}"]}' OR group_extensions.data @> '{"certifications_current_detail": ["${certOrManagementPlan}"]}'`)
        }
      }

      filterAndSortGroups({
        search: opts.term,
        sortBy: opts.sort,
        boundingBox: opts.boundingBox
      }, qb)
      // this counts total rows matching the criteria, disregarding limit,
      // which is useful for pagination
      countTotal(qb, 'groups', opts.totalColumnName)
      qb.limit(opts.limit)
      qb.offset(opts.offset)
      if (!opts.nearCoord && !opts.sort === 'size') { // Because they are using CTEs and WITH statements, queries ordered by size or nearness don't like this group-by statement
        qb.groupBy('groups.id')
      }
    })
  },

  forTags: function (opts) {
    return Tag.query(q => {
      q.join('groups_tags', 'groups_tags.tag_id', '=', 'tags.id')
      q.join('groups', 'groups.id', '=', 'groups_tags.group_id')
      q.whereIn('groups.id', Group.selectIdsForMember(opts.userId))
      q.where('groups.active', true)

      if (opts.groupSlug) {
        q.where('groups.slug', '=', opts.groupSlug)
      }

      if (opts.name) {
        q.where('tags.name', opts.name)
      }

      if (opts.autocomplete) {
        q.whereRaw('tags.name ilike ?', opts.autocomplete + '%')
      }

      if (opts.isDefault) {
        q.where('groups_tags.is_default', true)
      }

      if (opts.visibility) {
        q.whereIn('groups_tags.visibility', opts.visibility)
      }

      if (opts.sort) {
        if (opts.sort === 'name') {
          q.orderByRaw('lower(tags.name) ASC')
        } else if (opts.sort === 'num_followers') {
          q.select(bookshelf.knex.raw('sum(groups_tags.num_followers) as num_followers'))
          q.orderBy('num_followers', 'desc')
        } else {
          q.orderBy(opts.sort, 'asc')
        }
      }

      countTotal(q, 'tags', opts.totalColumnName)

      q.groupBy('tags.id')
      q.limit(opts.limit)
    })
  },

  fullTextSearch: function (userId, args) {
    let items, total
    args.limit = args.first
    return fetchAllGroupIds(userId, args)
    .then(groupIds =>
      FullTextSearch.searchInGroups(groupIds, args))
      .then(items_ => {
        items = items_
        total = get('0.total', items)

        const ids = transform(items, (ids, item) => {
          const type = item.post_id ? 'posts'
            : item.comment_id ? 'comments' : 'people'

          if (!ids[type]) ids[type] = []
          const id = item.post_id || item.comment_id || item.user_id
          ids[type].push(id)
        }, {})

        return Promise.join(
          ids.posts && Post.where('id', 'in', ids.posts).fetchAll(),
          ids.comments && Comment.where('id', 'in', ids.comments).fetchAll(),
          ids.people && User.where('id', 'in', ids.people).fetchAll(),
          (posts, comments, people) =>
            items.map(presentResult(posts, comments, people))
        )
      })
      .then(models => ({models, total}))
  }
}

const fetchAllGroupIds = (userId, { groupIds }) => {
  if (groupIds) return Promise.resolve(groupIds)
  return Group.pluckIdsForMember(userId)
}

const obfuscate = text => Buffer.from(text).toString('hex')

const presentResult = (posts, comments, people) => item => {
  if (item.user_id) {
    return {
      id: obfuscate(`user_id-${item.user_id}`),
      content: people.find(p => p.id === item.user_id)
    }
  } else if (item.post_id) {
    return {
      id: obfuscate(`post_id-${item.post_id}`),
      content: posts.find(p => p.id === item.post_id)
    }
  } else if (item.comment_id) {
    return {
      id: obfuscate(`comment_id-${item.comment_id}`),
      content: comments.find(c => c.id === item.comment_id)
    }
  }
  return null
}

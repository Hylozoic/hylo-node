import forUsers from './Search/forUsers'
import forPosts from './Search/forPosts'
import addTermToQueryBuilder from './Search/addTermToQueryBuilder'

module.exports = {
  forPosts,
  forUsers,

  forCommunities: function (opts) {
    return Community.query(qb => {
      if (opts.communities) {
        qb.whereIn('communities.id', opts.communities)
      }

      if (opts.autocomplete) {
        qb.whereRaw('communities.name ilike ?', opts.autocomplete + '%')
      }

      if (opts.term) {
        addTermToQueryBuilder(opts.term, qb, {
          columns: ['communities.name']
        })
      }

      // this counts total rows matching the criteria, disregarding limit,
      // which is useful for pagination
      qb.select(bookshelf.knex.raw('communities.*, count(*) over () as total'))

      qb.limit(opts.limit)
      qb.offset(opts.offset)
      qb.groupBy('communities.id')
      qb.orderBy('communities.name', 'asc')
    })
  },

  forTags: function (opts) {
    return Tag.query(q => {
      if (opts.communities) {
        q.join('communities_tags', 'communities_tags.tag_id', '=', 'tags.id')
        q.whereIn('communities_tags.community_id', opts.communities)
      }
      if (opts.autocomplete) {
        q.whereRaw('tags.name ilike ?', opts.autocomplete + '%')
      }

      q.groupBy('tags.id')
      q.limit(opts.limit)
    })
  }
}

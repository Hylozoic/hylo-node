require('../../setup')

describe('FullTextSearch', () => {
  it('sets up, refreshes, and drops the materialied view', function () {
    this.timeout(5000)
    return FullTextSearch.dropView()
    .then(() => FullTextSearch.createView())
    .then(() => FullTextSearch.refreshView())
    .then(() => FullTextSearch.dropView())
  })

  describe('.searchInGroups', () => {
    it('produces the expected SQL', () => {
      const opts = {limit: 10, offset: 20, term: 'zounds', type: 'person'}
      const query = FullTextSearch.searchInGroups([3, 5], opts).toString()

      expect(query).to.equal(`
        select "search"."post_id", "search"."comment_id", "search"."user_id", "rank", "total"
        from (select post_id, comment_id, user_id,
            ts_rank_cd(document, to_tsquery('english', 'zounds:*')) as rank,
            count(*) over () as total
          from "search_index"
          where
            document @@ to_tsquery('english', 'zounds:*')
            and user_id is not null
          order by "rank" desc) as "search"
        left join "group_memberships" on "group_memberships"."user_id" = "search"."user_id"
        left join "comments" on "comments"."id" = "search"."comment_id"
        left join "groups_posts" on
          "groups_posts"."post_id" = "search"."post_id"
          or "groups_posts"."post_id" = "comments"."post_id"
        where ("group_memberships"."group_id" in (3, 5)
          or "groups_posts"."group_id" in (3, 5))
        group by "search"."post_id", "search"."comment_id", "search"."user_id", "rank", "total"
        order by "rank" desc
        limit 10
        offset 20
      `.replace(/(\n\s*)/g, ' ').trim())
    })
  })
})

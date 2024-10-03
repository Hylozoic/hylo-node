import { hasJoin } from './knex'

describe('hasJoin', () => {
  it('returns false for a collection', () => {
    expect(hasJoin(Post.collection(), 'groups_posts')).to.be.false
  })

  it('returns true for a collection with a manual join', () => {
    expect(hasJoin(Post.collection().query(q => {
      q.join('groups_posts', 'posts.id', 'groups_posts.id')
    }), 'groups_posts')).to.be.true
  })

  it('returns false for a relation', () => {
    expect(hasJoin(Group.forge().posts(), 'groups_users')).to.be.false
  })

  it('returns true for a relation', () => {
    expect(hasJoin(Group.forge().posts(), 'groups_posts')).to.be.true
  })

  it('returns true for a relation with a manual join', () => {
    expect(hasJoin(Group.forge().posts().query(q => {
      q.join('posts_users', 'posts_users.post_id', 'posts.id')
    }), 'posts_users')).to.be.true
  })
})

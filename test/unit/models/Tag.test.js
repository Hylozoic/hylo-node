var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
import { sortBy } from 'lodash'

describe('Tag', () => {
  var u, c1

  beforeEach(() => {
    u = factories.user()
    c1 = factories.community()
    return setup.clearDb()
    .then(() => Promise.join(u.save(), c1.save()))
    .then(() => u.joinCommunity(c1))
  })

  describe('updateForPost', () => {
    it('creates a tag from tag param', () => {
      var post = new Post({
        name: 'New Tagged Post',
        description: 'no tags in the body'
      })
      return post.save()
      .then(post => Tag.updateForPost(post, 'newtagone'))
      .then(() => Tag.find('newtagone', {withRelated: ['posts']}))
      .then(tag => {
        expect(tag).to.exist
        expect(tag.get('name')).to.equal('newtagone')
        expect(tag.relations.posts.length).to.equal(1)
        expect(tag.relations.posts.models[0].get('name')).to.equal('New Tagged Post')
        expect(tag.relations.posts.models[0].pivot.get('selected')).to.equal(true)
      })
    })

    it('attaches an existing tag from tag param', () => {
      var post = new Post({
        name: 'New Tagged Post Two',
        description: 'no tags in the body'
      })
      return new Tag({name: 'newtagtwo'}).save()
      .then(() => post.save())
      .then(post => Tag.updateForPost(post, 'newtagtwo'))
      .then(() => Tag.find('newtagtwo', {withRelated: ['posts']}))
      .then(tag => {
        expect(tag).to.exist
        expect(tag.get('name')).to.equal('newtagtwo')
        expect(tag.relations.posts.length).to.equal(1)
        expect(tag.relations.posts.models[0].get('name')).to.equal('New Tagged Post Two')
        expect(tag.relations.posts.models[0].pivot.get('selected')).to.equal(true)
      })
    })

    it('creates a tag from post description', () => {
      var post = new Post({
        name: 'New Tagged Post Three',
        description: 'contains a tag #newtagthree in the body'
      })
      return post.save()
      .then(post => Tag.updateForPost(post))
      .then(() => Tag.find('newtagthree', {withRelated: ['posts']}))
      .then(tag => {
        expect(tag).to.exist
        expect(tag.get('name')).to.equal('newtagthree')
        expect(tag.relations.posts.length).to.equal(1)
        expect(tag.relations.posts.models[0].get('name')).to.equal('New Tagged Post Three')
        expect(tag.relations.posts.models[0].pivot.get('selected')).to.equal(false)
      })
    })

    it('attaches an existing tag from post description', () => {
      var post = new Post({
        name: 'New Tagged Post Four',
        description: 'contains a tag #newtagfour in the body'
      })
      return new Tag({name: 'newtagfour'}).save()
      .then(() => post.save())
      .then(post => Tag.updateForPost(post))
      .then(() => Tag.find('newtagfour', {withRelated: ['posts']}))
      .then(tag => {
        expect(tag).to.exist
        expect(tag.get('name')).to.equal('newtagfour')
        expect(tag.relations.posts.length).to.equal(1)
        expect(tag.relations.posts.models[0].get('name')).to.equal('New Tagged Post Four')
        expect(tag.relations.posts.models[0].pivot.get('selected')).to.equal(false)
      })
    })

    it('ignores duplicate tags', () => {
      var post = new Post({
        name: 'Tagged Post With Dups',
        description: 'contains two copies of the #duplicated tag #duplicated in the body'
      })
      return new Tag({name: 'duplicated'}).save()
      .then(() => post.save())
      .then(post => Tag.updateForPost(post))
      .then(() => Tag.find('duplicated', {withRelated: ['posts']}))
      .then(tag => {
        expect(tag).to.exist
        expect(tag.get('name')).to.equal('duplicated')
        expect(tag.relations.posts.length).to.equal(1)
        expect(tag.relations.posts.models[0].get('name')).to.equal('Tagged Post With Dups')
        expect(tag.relations.posts.models[0].pivot.get('selected')).to.equal(false)
      })
    })

    it('creates a tag from post name', () => {
      var post = new Post({
        name: 'New Tagged Post #nametagone',
        description: 'no tag in the body'
      })
      return post.save()
      .then(post => Tag.updateForPost(post))
      .then(() => Tag.find('nametagone', {withRelated: ['posts']}))
      .then(tag => {
        expect(tag).to.exist
        expect(tag.get('name')).to.equal('nametagone')
        expect(tag.relations.posts.length).to.equal(1)
        expect(tag.relations.posts.models[0].get('name')).to.equal('New Tagged Post #nametagone')
        expect(tag.relations.posts.models[0].pivot.get('selected')).to.equal(false)
      })
    })

    it('attaches an existing tag from post name', () => {
      var post = new Post({
        name: 'New Tagged Post #nametagtwo',
        description: 'contains a tag in the body'
      })
      return new Tag({name: 'nametagtwo'}).save()
      .then(() => post.save())
      .then(post => Tag.updateForPost(post))
      .then(() => Tag.find('nametagtwo', {withRelated: ['posts']}))
      .then(tag => {
        expect(tag).to.exist
        expect(tag.get('name')).to.equal('nametagtwo')
        expect(tag.relations.posts.length).to.equal(1)
        expect(tag.relations.posts.models[0].get('name')).to.equal('New Tagged Post #nametagtwo')
        expect(tag.relations.posts.models[0].pivot.get('selected')).to.equal(false)
      })
    })

    it('removes a tag', () => {
      var post = new Post({
        name: 'New Tagged Post Five',
        description: 'a different tag #newtagsix in the body'
      })
      var tag = new Tag({name: 'newtagfive'})
      return Promise.join(post.save(), tag.save(), (post, tag) =>
        new PostTag({post_id: post.id, tag_id: tag.id}).save())
      .then(() => Tag.updateForPost(post))
      .then(() => Promise.join(
        Tag.find('newtagfive', {withRelated: ['posts']}),
        Tag.find('newtagsix', {withRelated: ['posts']}),
        (removed, added) => {
          expect(removed).to.exist
          expect(removed.get('name')).to.equal('newtagfive')
          expect(removed.relations.posts.length).to.equal(0)
          expect(added).to.exist
          expect(added.get('name')).to.equal('newtagsix')
          expect(added.relations.posts.length).to.equal(1)
          expect(added.relations.posts.models[0].get('name')).to.equal('New Tagged Post Five')
        }))
    })

    it('changes the selected tag', () => {
      var post = new Post({
        name: 'New Tagged Post Six',
        description: 'a different tag #newtagseven in the body'
      })
      var tag = new Tag({name: 'newtagseven'})
      return Promise.join(post.save(), tag.save(), (post, tag) =>
        new PostTag({post_id: post.id, tag_id: tag.id, selected: true}).save())
      .then(() => Tag.updateForPost(post, 'newtageight'))
      .then(() => Promise.join(
        Tag.find('newtagseven', {withRelated: ['posts']}),
        Tag.find('newtageight', {withRelated: ['posts']}),
        (unselected, selected) => {
          expect(unselected).to.exist
          expect(unselected.get('name')).to.equal('newtagseven')
          expect(unselected.relations.posts.length).to.equal(1)
          expect(unselected.relations.posts.models[0].pivot.get('selected')).to.equal(false)
          expect(selected).to.exist
          expect(selected.get('name')).to.equal('newtageight')
          expect(selected.relations.posts.length).to.equal(1)
          expect(selected.relations.posts.models[0].get('name')).to.equal('New Tagged Post Six')
          expect(selected.relations.posts.models[0].pivot.get('selected')).to.equal(true)
        }))
    })

    it('associates tags with communities of which the user is a member', () => {
      var post = new Post({
        name: 'New Tagged Post',
        description: 'no tags in the body',
        user_id: u.id
      })
      var c2 = factories.community()
      return Promise.join(post.save(), c2.save())
      .then(() => post.communities().attach(c1.id))
      .then(() => post.communities().attach(c2.id))
      .then(() => Tag.updateForPost(post, 'newtagnine', null, u.id))
      .then(() => Tag.find('newtagnine', {withRelated: ['communities']}))
      .then(tag => {
        expect(tag).to.exist
        expect(tag.get('name')).to.equal('newtagnine')
        expect(tag.relations.communities.length).to.equal(1)
        var communities = sortBy(tag.relations.communities.models, c => c.get('name'))
        expect(communities[0].get('name')).to.equal(c1.get('name'))
        expect(communities[0].pivot.get('user_id')).to.equal(u.id)
      })
    })

    it('preserves existing tag owner', () => {
      var user = factories.user()
      var owner = factories.user()
      var post = new Post({
        name: 'New Tagged Post',
        description: 'no tags in the body'
      })
      var tag = new Tag({name: 'newtagten'})
      var c2 = factories.community({name: 'Community Four'})
      return user.save()
      .then(user => post.save({user_id: user.id}))
      .then(() => Promise.join(post.save(), tag.save()))
      .then(() => c2.save())
      .then(() => owner.save())
      .then(owner => new CommunityTag({community_id: c1.id, tag_id: tag.id, user_id: owner.id}).save())
      .then(() => post.communities().attach(c1.id))
      .then(() => post.communities().attach(c2.id))
      .then(() => Tag.updateForPost(post, 'newtagten', null, user.id))
      .then(() => Tag.find('newtagten', {withRelated: ['communities']}))
      .then(tag => {
        expect(tag).to.exist
        expect(tag.get('name')).to.equal('newtagten')
        expect(tag.relations.communities.length).to.equal(1)
        var communities = sortBy(tag.relations.communities.models, 'id')
        expect(communities[0].get('name')).to.equal(c1.get('name'))
        expect(communities[0].pivot.get('user_id')).to.equal(owner.id)
      })
    })

    it('creates TagFollow for tag creator', () => {
      var post = factories.post({
        name: 'New Tagged Post',
        description: 'no tags in the body',
        user_id: u.id
      })
      return post.save()
      .then(() => post.save())
      .then(() => post.communities().attach(c1.id))
      .then(() => Tag.updateForPost(post, 'newtageleven', null, u.id))
      .then(() => Tag.find('newtageleven'))
      .then(tag => TagFollow.where({tag_id: tag.id, user_id: u.id, community_id: c1.id}).fetch())
      .then(tagFollow => expect(tagFollow).to.exist)
    })

    it('handles a selected tag that is also in the description', () => {
      var post = new Post({
        name: 'foo',
        description: 'here are #tags #yay'
      })
      var tag = new Tag({name: '#tags'})
      return Promise.join(post.save(), tag.save())
      .then(() => Tag.updateForPost(post, 'tags'))
      .then(() => post.refresh({withRelated: 'tags'}))
      .then(() => {
        const { tags } = post.relations
        expect(tags.length).to.equal(2)
        const unselected = tags.find(t => !t.pivot.get('selected'))
        expect(unselected.get('name')).to.equal('yay')
        const selected = tags.find(t => t.pivot.get('selected'))
        expect(selected.get('name')).to.equal('tags')
      })
    })
  })

  describe('updateForComment', () => {
    it('creates a tag from comment text and associates with the correct communities', () => {
      var post = new Post({
        name: 'Commented Post One',
        description: 'no tags in post'
      })
      var comment
      return post.save()
      .then(() => post.communities().attach(c1.id))
      .then(() => {
        comment = new Comment({
          text: 'here is a #commenthashtag test',
          post_id: post.id,
          user_id: u.id
        })
        return comment.save()
      })
      .then(comment => Tag.updateForComment(comment, {commenthashtag: {description: 'lol'}}, u.id))
      .then(() => Tag.find('commenthashtag', {withRelated: ['comments', 'communities']}))
      .then(tag => {
        expect(tag).to.exist
        expect(tag.get('name')).to.equal('commenthashtag')
        expect(tag.relations.comments.length).to.equal(1)
        expect(tag.relations.comments.models[0].get('text')).to.equal('here is a #commenthashtag test')
        const community = tag.relations.communities.first()
        expect(community).to.exist
        expect(community.get('name')).to.equal(c1.get('name'))
        expect(community.pivot.get('description')).to.equal('lol')
      })
    })
  })

  describe('.merge', () => {
    var t1, t2, t3, p1, p2, c

    beforeEach(() => {
      const k = bookshelf.knex
      t1 = new Tag({name: 't1'})
      t2 = new Tag({name: 't2'})
      t3 = new Tag({name: 't3'})
      p1 = factories.post()
      p2 = factories.post()
      c = factories.community()

      return Promise.all([t1, t2, t3, p1, p2, c].map(x => x.save()))
      .then(() => Promise.all([
        k('posts_tags').insert({tag_id: t1.id, post_id: p1.id}),
        k('posts_tags').insert({tag_id: t2.id, post_id: p1.id}),
        k('posts_tags').insert({tag_id: t2.id, post_id: p2.id}),
        k('posts_tags').insert({tag_id: t3.id, post_id: p2.id}),
        k('communities_tags').insert({tag_id: t2.id, community_id: c.id}),
        k('communities_tags').insert({tag_id: t3.id, community_id: c.id}),
        k('tag_follows').insert({tag_id: t1.id, community_id: c.id, user_id: u.id}),
        k('tag_follows').insert({tag_id: t2.id, community_id: c.id, user_id: u.id}),
        k('tags_users').insert({tag_id: t1.id, user_id: u.id}),
        k('tags_users').insert({tag_id: t2.id, user_id: u.id})
      ]))
    })

    it('removes rows that would cause duplicates and updates the rest', function () {
      return Tag.merge(t1.id, t2.id)
      .then(() => t1.load(['posts', 'communities', 'follows', 'users']))
      .then(() => {
        expect(t1.relations.posts.map('id')).to.deep.equal([p1.id, p2.id])
        expect(t1.relations.communities.map('id')).to.deep.equal([c.id])
        expect(t1.relations.users.map('id')).to.deep.equal([u.id])

        const follows = t1.relations.follows
        expect(follows.length).to.equal(1)
        expect(follows.first().pick('community_id', 'user_id')).to.deep.equal({
          community_id: c.id, user_id: u.id
        })
      })
      .then(() => Tag.find(t2.id))
      .then(tag => expect(tag).not.to.exist)
      .then(() => p2.load('tags'))
      .then(() => {
        expect(p2.relations.tags.map('id').sort()).to.deep.equal([t1.id, t3.id].sort())
      })
    })
  })

  describe('.nonexistent', () => {
    var cx, cy, t1, t2, t3
    beforeEach(() => {
      cx = factories.community()
      cy = factories.community()
      t1 = Tag.forge({name: 'tag1'})
      t2 = Tag.forge({name: 'tag2'})
      t3 = Tag.forge({name: 'tag3'})
      return Promise.join(cx.save(), cy.save(), t1.save(), t2.save(), t3.save())
      .then(() => Promise.join(
        t1.communities().attach({user_id: u.id, community_id: cy.id}),
        t2.communities().attach({user_id: u.id, community_id: cx.id}),
        t3.communities().attach([
          {user_id: u.id, community_id: cx.id},
          {user_id: u.id, community_id: cy.id}
        ])
      ))
    })

    it("returns a map of names to the communities they are missing from, filtered by a user's memberships", () => {
      return Tag.nonexistent(['tag1', 'tag2', 'tag3'], [cx.id, cy.id])
      .then(results => {
        expect(results).to.deep.equal({
          tag1: [cx.id],
          tag2: [cy.id]
        })
      })
    })
  })

  describe('.tagsInText', () => {
    it('finds hashtags', () => {
      const text = '#foo #bar #baz'
      expect(Tag.tagsInText(text)).to.deep.equal(['foo', 'bar', 'baz'])
    })

    it('does not interpret a hash fragment in a URL as a tag', () => {
      expect(Tag.tagsInText('hey http://foo.com/bar#bam ok')).to.be.empty
    })

    it('finds a hashtag inside an anchor tag', () => {
      const text = 'hey <a>#whoa</a> <a>#nah</a>'
      expect(Tag.tagsInText(text)).to.deep.equal(['whoa', 'nah'])
    })
  })

  describe('.updateUser', () => {
    var t1, t2, t3

    beforeEach(() => {
      t1 = factories.tag()
      t2 = factories.tag()
      t3 = factories.tag()
      return Promise.join(t1.save(), t2.save(), t3.save())
      .then(() => u.tags().attach([t1.id, t2.id]))
    })

    it('works', () => {
      return Tag.updateUser(u, [t2.get('name'), t3.get('name')])
      .then(() => u.load('tags'))
      .then(() => {
        expect(u.relations.tags.map(t => t.get('name'))).to.deep.equal([
          t2.get('name'), t3.get('name')
        ])
      })
    })
  })
})

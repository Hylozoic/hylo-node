var setup = require(require('root-path')('test/setup'))

describe('Tag', () => {
  before(() => {
    return setup.clearDb()
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
  })
})

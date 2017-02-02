var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))
import { omit } from 'lodash/fp'

describe('CommentPresenter', () => {
  var comment, userAttrs, mediaAttrs

  before(() => {
    const { model, collection } = factories.mock
    userAttrs = {
      id: 1,
      name: 'jon',
      avatar_url: 'avatar.png'
    }
    mediaAttrs = {
      type: 'image',
      url: 'image.png',
      thumbnail_url: 'thumbimage.png'
    }
    comment = model({
      text: 'the comment text',
      relations: {
        user: model(userAttrs),
        media: collection([
          model(mediaAttrs)
        ])
      }
    })
  })

  it('returns media', () => {
    expect(CommentPresenter.present(comment)).to.deep.equal({
      text: comment.get('text'),
      thanks: [],
      user: userAttrs,
      image: omit('type', mediaAttrs)
    })
  })
})

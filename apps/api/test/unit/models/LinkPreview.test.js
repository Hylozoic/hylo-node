/* globals LinkPreview */
import nock from 'nock'
import { spyify, unspyify } from '../../setup/helpers'
require('../../setup')

const mockDoc = `<html><head>
  <meta property="og:title" content="wow!">
  <meta property="og:image" content="http://fake.host/wow.png">
  <meta property="og:description" content="it's amazing">
</head></html>`

describe('LinkPreview', () => {
  describe('populate', () => {
    const url = 'http://foo.com/bar'
    var preview

    beforeEach(() => {
      nock('http://foo.com').get('/bar').reply(200, mockDoc)
      preview = LinkPreview.forge({url})
      return preview.save()
    })

    it('works', () => {
      return LinkPreview.populate({id: preview.id})
      .then(preview => {
        expect(preview.get('title')).to.equal('wow!')
      })
    })
  })

  describe('queue', () => {
    const url = 'http://foo.com/bar2'

    beforeEach(() => spyify(Queue, 'classMethod'))
    afterEach(() => unspyify(Queue, 'classMethod'))

    it('works for a new url', () => {
      return LinkPreview.queue(url)
      .then(() => LinkPreview.find(url))
      .then(preview => {
        expect(preview).to.exist

        expect(Queue.classMethod).to.have.been.called
        .with('LinkPreview', 'populate', {id: preview.id}, 0)
      })
    })

    it('does nothing for an existing url', () => {
      const url3 = 'http://foo.com/bar3'
      return LinkPreview.forge({url: url3}).save()
      .then(() => LinkPreview.queue(url3))
      .then(() => expect(Queue.classMethod).not.to.have.been.called())
    })
  })
})

import { createRequestHandler } from '../../../api/graphql'
import '../../setup'
import factories from '../../setup/factories'

describe('graphql request handler', () => {
  var handler, req, res, user

  before(() => {
    handler = createRequestHandler()
    req = factories.mock.request()
    res = factories.mock.response()

    Object.assign(req, {
      method: 'POST',
      body: {
        query: `{
          me {
            name
          }
        }`
      }
    })

    user = factories.user()
    return user.save()
    .then(() => { req.session = {userId: user.id} })
  })

  it('can handle a simple query', () => {
    return handler(req, res).then(() => {
      expect(res.body).to.exist
      expect(JSON.parse(res.body)).to.deep.equal({
        data: {
          me: {
            name: user.get('name')
          }
        }
      })
    })
  })
})

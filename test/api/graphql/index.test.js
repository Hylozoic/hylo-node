import { createRequestHandler } from '../../../api/graphql'
import '../../setup'
import factories from '../../setup/factories'

describe('graphql request handler', () => {
  var handler, req, res, user, community, post

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
            memberships {
              community {
                name
              }
            }
            posts {
              title
              communities {
                name
              }
            }
          }
        }`
      }
    })

    user = factories.user()
    community = factories.community()
    post = factories.post()
    return Promise.all([user.save(), community.save()])
    .then(() => {
      req.session = {userId: user.id}
      return post.save({user_id: user.id})
    })
    .then(() => Promise.all([
      community.posts().attach(post.id),
      community.users().attach({user_id: user.id, active: true})
    ]))
  })

  it('can handle a simple query', () => {
    return handler(req, res).then(() => {
      expect(res.body).to.exist
      expect(JSON.parse(res.body)).to.deep.equal({
        data: {
          me: {
            name: user.get('name'),
            memberships: [
              {
                community: {
                  name: community.get('name')
                }
              }
            ],
            posts: [
              {
                title: post.get('name'),
                communities: [
                  {
                    name: community.get('name')
                  }
                ]
              }
            ]
          }
        }
      })
    })
  })
})

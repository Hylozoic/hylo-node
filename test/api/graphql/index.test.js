import { createRequestHandler } from '../../../api/graphql'
import '../../setup'
import factories from '../../setup/factories'

describe('graphql request handler', () => {
  var handler, req, res, user, community, post

  before(() => {
    handler = createRequestHandler()

    user = factories.user()
    community = factories.community()
    post = factories.post()
    return Promise.all([user.save(), community.save()])
    .then(() => post.save({user_id: user.id}))
    .then(() => Promise.all([
      community.posts().attach(post),
      community.users().attach({user_id: user.id, active: true})
    ]))
  })

  beforeEach(() => {
    req = factories.mock.request()
    req.method = 'POST'
    req.session = {userId: user.id}
    res = factories.mock.response()
  })

  describe('with a simple query', () => {
    beforeEach(() => {
      req.body = {
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

    it('responds as expected', () => {
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

  describe('with a complex query', () => {
    var user2, thread, comment, message

    before(() => {
      user2 = factories.user()
      thread = factories.post({type: Post.Type.THREAD})

      return Promise.all([user2.save(), thread.save()])
      .then(() => {
        comment = factories.comment({post_id: post.id, user_id: user2.id})
        message = factories.comment({post_id: thread.id, user_id: user2.id})
        return Promise.all([
          comment.save(),
          message.save(),
          community.users().attach({user_id: user2.id, active: true}),
          post.followers().attach(user2),
          thread.followers().attach(user),
          thread.followers().attach(user2)
        ])
      })
    })

    beforeEach(() => {
      req.body = {
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
              comments {
                items {
                  text
                  creator {
                    name
                  }
                }
              }
              followers {
                name
              }
              followersTotal
            }
            messageThreads {
              id
              messages {
                text
                creator {
                  name
                }
              }
              messagesTotal
              participants {
                name
              }
              participantsTotal
            }
          }
        }`
      }
    })

    it('responds as expected', () => {
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
                  ],
                  comments: {
                    items: [
                      {
                        text: comment.get('text'),
                        creator: {
                          name: user2.get('name')
                        }
                      }
                    ]
                  },
                  followers: [
                    {
                      name: user2.get('name')
                    }
                  ],
                  followersTotal: 1
                }
              ],
              messageThreads: [
                {
                  id: thread.id,
                  messages: [
                    {
                      text: message.get('text'),
                      creator: {
                        name: user2.get('name')
                      }
                    }
                  ],
                  messagesTotal: 1,
                  participants: [
                    {
                      name: user.get('name')
                    },
                    {
                      name: user2.get('name')
                    }
                  ],
                  participantsTotal: 2
                }
              ]
            }
          }
        })
      })
    })
  })
})

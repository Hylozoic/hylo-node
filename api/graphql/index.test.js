/* eslint-disable no-unused-expressions */
import jwt from 'jsonwebtoken'
import { createRequestHandler, makeMutations, makeAuthenticatedQueries } from './index'
import '../../test/setup'
import factories from '../../test/setup/factories'
import { mockify, spyify, unspyify } from '../../test/setup/helpers'
import { some, sortBy } from 'lodash/fp'
import { updateFollowers } from '../models/post/util'

describe('graphql request handler', () => {
  var handler,
    req, res,
    user, user2,
    group,
    post, post2, comment, media, groupExtension, extension

  before(async () => {
    handler = createRequestHandler()

    user = factories.user()
    user2 = factories.user()
    group = factories.group()
    post = factories.post({ type: Post.Type.DISCUSSION})
    post2 = factories.post({ type: Post.Type.REQUEST })
    comment = factories.comment()
    media = factories.media()
    const earlier = new Date(new Date().getTime() - 86400000)
    extension = factories.extension({ type: 'test', created_at: earlier, updated_at: earlier })

    await group.save()
    await user.save()
    await user2.save()
    await post.save({ user_id: user.id })
    await post2.save()
    await comment.save({ post_id: post.id })
    await media.save({ comment_id: comment.id })
    await extension.save()

    groupExtension = factories.groupExtension({ group_id: group.id, extension_id: extension.id, active: true, data: { 'key-test': 'value-test' } })
    await groupExtension.save()
    return Promise.all([
      group.posts().attach(post),
      group.posts().attach(post2),
      group.addMembers([user.id, user2.id]).then((memberships) => {
        const earlier = new Date(new Date().getTime() - 86400000)
        return memberships[0].save({ created_at: earlier }, {patch: true})
      })
    ])
    .then(() => Promise.all([
      updateFollowers(post),
      updateFollowers(post2)
    ]))
  })

  after(async function() {
    await groupExtension.destroy()
    await extension.destroy()
  })

  beforeEach(() => {
    req = factories.mock.request()
    req.url = '/noo/graphql'
    req.method = 'POST'
    req.session = {
      userId: user.id,
      destroy: () => {}
    }
    res = factories.mock.response()
  })

  describe('with a simple query', () => {
    beforeEach(() => {
      req.body = {
        query: `{
          me {
            name
            memberships {
              group {
                name
              }
            }
            posts {
              title
              groups {
                name
              }
            }
          }
        }`
      }
    })

    it('responds as expected', () => {
      return handler(req, res).then(() => {
        expectJSON(res, {
          data: {
            me: {
              name: user.get('name'),
              memberships: [
                {
                  group: {
                    name: group.get('name')
                  }
                }
              ],
              posts: [
                {
                  title: post.get('name'),
                  groups: [
                    {
                      name: group.get('name')
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
    var thread, message

    before(async () => {
      thread = factories.post({type: Post.Type.THREAD})
      await thread.save()
      await comment.save({user_id: user2.id})

      message = await factories.comment({
        post_id: thread.id,
        user_id: user2.id
      }).save()

      await post.addFollowers([user2.id])
      await thread.addFollowers([user.id, user2.id])
    })

    beforeEach(() => {
      req.body = {
        query: `{
          me {
            name
            memberships {
              group {
                name
              }
            }
            posts {
              title
              groups {
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
              total
              hasMore
              items {
                id
                messages {
                  items {
                    text
                    creator {
                      name
                    }
                  }
                }
                participants {
                  name
                }
                participantsTotal
              }
            }
          }
        }`
      }
    })

    it('responds as expected', () => {
      return handler(req, res).then(() => {
        expectJSON(res, {
          data: {
            me: {
              name: user.get('name'),
              memberships: [
                {
                  group: {
                    name: group.get('name')
                  }
                }
              ],
              posts: [
                {
                  title: post.get('name'),
                  groups: [
                    {
                      name: group.get('name')
                    }
                  ],
                  comments: {
                    items: [
                      {
                        text: comment.text(),
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
              messageThreads: {
                hasMore: false,
                total: 1,
                items: [
                  {
                    id: thread.id,
                    messages: {
                      items: [
                        {
                          text: message.get('text'),
                          creator: {
                            name: user2.get('name')
                          }
                        }
                      ]
                    },
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
          }
        })
      })
    })
  })

  describe('querying Comment attachments', () => {
    beforeEach(() => {
      req.body = {
        query: `{
          post (id: ${post.id}) {
            comments {
              items {
                text
                attachments {
                  id
                  type
                  position
                  url
                }
              }
            }
          }
        }`
      }
    })

    it('responds as expected', () => {
      return handler(req, res).then(() => {
        expectJSON(res, {
          data: {
            post: {
              comments: {
                items: [
                  {
                    text: comment.text(),
                    attachments: [
                      {
                        id: media.id,
                        type: media.get('type'),
                        position: media.get('position'),
                        url: media.get('url')
                      }
                    ]
                  }
                ]
              }
            }
          }
        })
      })
    })
  })

  describe('without a logged-in user', () => {
    beforeEach(() => {
      req.session = {}
    })

    it('shows "not logged in" errors for most queries', () => {
      req.body = {
        query: `{
          me {
            name
          }
          group(id: 9) {
            name
          }
        }`
      }

      return handler(req, res).then(() => {
        expectJSON(res, {
          data: {
            me: null,
            group: null
          }
        })
      })
    })

    it('allows checkInvitation', () => {
      req.body = {
        query: `{
          checkInvitation(invitationToken: "foo") {
            valid
          }
        }`
      }
      return handler(req, res).then(() => {
        expectJSON(res, {
          data: {
            checkInvitation: {
              valid: false
            }
          }
        })
      })
    })
  })

  describe('querying group data', () => {
    it('works as expected', () => {
      req.body = {
        query: `{
          group(id: "${group.id}") {
            slug
            members(first: 2, sortBy: "join") {
              items {
                name
              }
            }
            posts(first: 1, filter: "${Post.Type.REQUEST}") {
              items {
                title
              }
            }
            groupExtensions{
              items{
                id
                type
                data
              }
            }
          }
        }`
      }

      return handler(req, res).then(() => {
        expectJSON(res, {
          data: {
            group: {
              slug: group.get('slug'),
              members: {
                items: [
                  {name: user2.get('name')},
                  {name: user.get('name')}
                ]
              },
              posts: {
                items: [
                  {title: post2.get('name')}
                ]
              },
              groupExtensions: {
                items: [
                  {
                    type:'test', 
                    data: {
                      "key-test": "value-test"
                      }, 
                    id: groupExtension.id.toString()}
                ]
              }
            }
          }
        })
      })
    })

    describe('with an invalid sort option', () => {
      it('shows an error', () => {
        req.body = {
          query: `{
            group(id: "${group.id}") {
              members(first: 2, sortBy: "height") {
                items {
                  name
                }
              }
            }
          }`
        }

        return handler(req, res).then(() => {
          expectJSON(res, {
            'errors[0].message': 'Cannot sort by "height"',
            data: {
              group: {
                members: null
              }
            }
          })
        })
      })
    })
  })

  describe('search', () => {
    beforeEach(async () => {
      await FullTextSearch.dropView()
      await FullTextSearch.createView()
    })

    it('works', () => {
      req.body = {
        query: `{
          search(term: "${post.get('name').substring(0, 4)}") {
            items {
              content {
                __typename
                ... on Post {
                  title
                }
              }
            }
          }
        }`
      }

      return handler(req, res).then(() => {
        expectJSON(res, {
          data: {
            search: {
              items: [
                {
                  content: {
                    __typename: 'Post',
                    title: post.get('name')
                  }
                }
              ]
            }
          }
        })
      })
    })
  })

  describe('removeSkill', () => {
    var skill1, skill2

    before(() => {
      skill1 = factories.skill()
      skill2 = factories.skill()
      return Promise.join(skill1.save(), skill2.save())
    })

    beforeEach(() => {
      return Promise.join(
        user.skills().detach(skill1),
        user.skills().detach(skill2)
      ).then(() => Promise.join(
        user.skills().attach(skill1),
        user.skills().attach(skill2)
      ))
    })

    it('removes a skill with an id', () => {
      req.body = {
        query: `mutation {
          removeSkill(id: ${skill1.id}) {
            success
          }
        }`
      }
      return handler(req, res)
      .then(() => user.load('skills'))
      .then(() => {
        expectJSON(res, {
          data: {
            removeSkill: {
              success: true
            }
          }
        })
        expect(user.relations.skills.length).to.equal(1)
        expect(user.relations.skills.first().id).to.equal(skill2.id)
      })
    })

    it('removes a skill with a name', () => {
      req.body = {
        query: `mutation {
          removeSkill(name: "${skill2.get('name')}") {
            success
          }
        }`
      }
      return handler(req, res)
      .then(() => user.load('skills'))
      .then(() => {
        expectJSON(res, {
          data: {
            removeSkill: {
              success: true
            }
          }
        })
        expect(user.relations.skills.length).to.equal(1)
        expect(user.relations.skills.first().id).to.equal(skill1.id)
      })
    })
  })

  describe('sendEmailVerification', function () {
    it('returns `success: true` if new user', async () => {
      req.body = {
        query: `
          mutation {
            sendEmailVerification(email: "person@blah.com") {
              success
            }
          }
        `
      }
      await handler(req, res)
      
      expectJSON(res, {
        data: {
          sendEmailVerification: {
            success: true
          }
        }
      })
    })

    it('returns `success: true` if existing user with an unverified email', async () => {
      const testUser = await factories.user().save()
      req.body = {
        query: `
          mutation {
            sendEmailVerification(email: "${testUser.get('email')}") {
              success
            }
          }
        `
      }
      await handler(req, res)
      
      expectJSON(res, {
        data: {
          sendEmailVerification: {
            success: true
          }
        }
      })
    })

    it('returns `success: false` if existing user with and already verified email', async () => {
      const testUser = await factories.user({
        'email_validated': true
      }).save()
      req.body = {
        query: `
          mutation {
            sendEmailVerification(email: "${testUser.get('email')}") {
              success
            }
          }
        `
      }
      await handler(req, res)
      
      expectJSON(res, {
        data: {
          sendEmailVerification: {
            success: false
          }
        }
      })
    })
  })

  describe('verifyEmail', function () {
    let code, token

    beforeEach(async () => {
      const userVerificationCode = await UserVerificationCode.create(user.get('email'))
      code = userVerificationCode.code
      token = userVerificationCode.token
    })

    it('works', () => {
      req.body = {
        query: `
          mutation {
            verifyEmail(code: "${code}", email: "${user.get('email')}") {
              me {
                id
                emailValidated
              }
              error
            }
          }
        `
      }
      return handler(req, res)
        .then(() => {
          expectJSON(res, {
            data: {
              verifyEmail: {
                me: {
                  id: user.id,
                  emailValidated: true
                },
                error: null
              }
            }
          })
          // expect(user.get('email_validated')).to.be.true
          expect(req.session.userId).to.equal(user.id)
       })
     })

     it('returns an error on invalid code', () => {
       req.body = {
        query: `
          mutation {
            verifyEmail(code: "booop", email: "${user.get('email')}") {
              me {
                id
                emailValidated
              }
              error
            }
          }
        `
      }
      return handler(req, res)
        .then(() => {
          expectJSON(res, {
            data: {
              verifyEmail: {
                me: null,
                error: 'Invalid code, please try again'
              }
            }
          })
        })
    })

    it('returns error on invalid token', () => {
      const testToken = jwt.sign({
        iss: 'https://hylo.com/moo', // Bad iss here makes bad token
        aud: 'https://hylo.com',
        sub: code,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 4), // 4 hour expiration
        code
      }, Buffer.from(process.env.OIDC_KEYS.split(',')[0], 'base64'), { algorithm: 'RS256' })

      req.body = {
        query: `
          mutation {
            verifyEmail(token: "${testToken}", email: "${user.get('email')}") {
              me {
                id
                emailValidated
              }
              error
            }
          }
        `
      }
      return handler(req, res)
        .then(() => {
          expectJSON(res, {
            data: {
              verifyEmail: {
                me: null,
                error: 'Link expired, please start over'
              }
            }
          })
        })
    })

    it('validates email and creates user session on valid token', async () => {
      req.body = {
        query: `
          mutation {
            verifyEmail(token: "${token}", email: "${user.get('email')}") {
              me {
                id
                emailValidated
              }
            }
          }
        `
      }

      await handler(req, res)

      expectJSON(res, {
        data: {
          verifyEmail: {
            me: {
              id: user.id,
              emailValidated: true
            }
          }
        }
      })
      expect(req.session.userId).to.equal(user.id)
    })
  })

  describe('makeMutations', () => {
    it('imports mutation functions correctly', () => {
      // this test does not check the correctness of the functions used in
      // mutations; it only checks that they are actually functions (i.e. it fails
      // if there are any broken imports)

      const mutations = makeMutations({ req, res }, 11, false, () => {})
      const root = {}
      const args = {}

      return Promise.each(Object.keys(mutations), key => {
        const fn = mutations[key]
        return Promise.resolve()
        .then(() => fn(root, args))
        .catch(err => {
          if (some(pattern => err.message.match(pattern), [
            /is not a function/,
            /is not defined/
          ])) {
            expect.fail(null, null, `Mutation "${key}" is not imported correctly: ${err.message}`)
          }

          // FIXME: the console.log below shows a number of places where we need
          // more validation and/or are exposing SQL errors to the end-user
          // console.log(`${key}: ${err.message}`)
        })
      })
    })
  })
})

describe('makeAuthenticatedQueries', () => {
  let queries, user

  before(async () => {
    user = await factories.user().save()
    const fetchOne = spy(() => Promise.resolve({}))
    const fetchMany = spy(() => Promise.resolve([]))
    queries = makeAuthenticatedQueries(user.id, fetchOne, fetchMany)
  })

  describe('groupExists', () => {
    it('throws an error if slug is invalid', () => {
      expect(() => {
        queries.groupExists(null, {slug: 'a b'})
      }).to.throw()
    })

    it('returns true if the slug is in use', () => {
      const group = factories.group()
      return group.save()
      .then(() => queries.groupExists(null, {slug: group.get('slug')}))
      .then(result => expect(result.exists).to.be.true)
    })

    it('returns false if the slug is not in use', () => {
      return queries.groupExists(null, {slug: 'sofadogtotherescue'})
      .then(result => expect(result.exists).to.be.false)
    })
  })

  describe('notifications', () => {
    beforeEach(() => spyify(User, 'resetNewNotificationCount'))
    afterEach(() => unspyify(User, 'query'))

    it('resets new notification count if requested', () => {
      return queries.notifications(null, {resetCount: true})
      .then(() => {
        expect(User.resetNewNotificationCount).to.have.been.called.with(user.id)
      })
    })

    it('does not reset new notification count if not requested', () => {
      return queries.notifications(null, {})
      .then(() => {
        expect(User.resetNewNotificationCount).not.to.have.been.called()
      })
    })
  })

  describe('group', () => {
    let group

    beforeEach(async () => {
      group = await factories.group().save()
      await group.addMembers([user])
    })

    it('updates last viewed time', async () => {
      mockify(GroupMembership, 'updateLastViewedAt', (user, group) => {
         return true
      })
      await queries.group(null, {
        id: group.id,
        updateLastViewed: true
      })
      expect(GroupMembership.updateLastViewedAt).to.have.been.called()
      unspyify(GroupMembership, 'updateLastViewedAt')
    })
  })
})

function expectJSON (res, expected) {
  expect(res.body).to.exist
  return expect(res.body).to.deep.nested.include(expected)
}

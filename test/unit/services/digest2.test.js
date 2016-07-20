require('../../setup')
import moment from 'moment-timezone'
import formatData from '../../../lib/community/digest2/formatData'
import personalizeData from '../../../lib/community/digest2/personalizeData'
import { defaultTimezone, shouldSendData } from '../../../lib/community/digest2/util'
import { sendAllDigests } from '../../../lib/community/digest2'
import factories from '../../setup/factories'
import { spyify, unspyify } from '../../setup/helpers'
import { merge } from 'lodash'
const model = factories.mock.model
const collection = factories.mock.collection

const u1 = model({
  id: 1,
  name: 'Foo',
  avatar_url: 'http://google.com/foo.png'
})

const u2 = model({
  id: 2,
  name: 'Bar',
  avatar_url: 'http://facebook.com/bar.png'
})

const u3 = model({
  id: 3,
  name: 'Baz',
  avatar_url: 'http://apple.com/baz.png'
})

const u4 = model({
  id: 4,
  name: 'Mr. Man',
  avatar_url: 'http://cnn.com/man.png'
})

const community = model({slug: 'foo'})

describe('community digest v2', () => {
  describe('formatData', () => {
    it('organizes new posts and comments', () => {
      const data = {
        comments: [
          model({
            id: 12,
            text: 'I have two!',
            post_id: 5,
            relations: {user: u3}
          }),
          model({
            id: 13,
            text: 'No, you are wrong',
            post_id: 8,
            relations: {
              user: u3,
              post: model({id: 8, name: 'I am right', relations: {user: u4}})
            }
          })
        ],
        posts: [
          model({
            id: 5,
            name: 'Do you have a dollar?',
            relations: {
              selectedTags: collection([
                model({name: 'request'})
              ]),
              user: u1
            }
          }),
          model({
            id: 7,
            name: 'Kapow!',
            relations: {
              selectedTags: collection([]),
              user: u2
            }
          }),
          model({
            id: 6,
            name: 'I have cookies!',
            relations: {
              selectedTags: collection([
                model({name: 'offer'})
              ]),
              user: u2
            }
          })
        ]
      }

      expect(formatData(community, data)).to.deep.equal({
        requests: [
          {
            id: 5,
            title: 'Do you have a dollar?',
            user: u1.attributes,
            url: Frontend.Route.post({id: 5}),
            comments: [
              {id: 12, text: 'I have two!', user: u3.attributes}
            ]
          }
        ],
        offers: [
          {
            id: 6,
            title: 'I have cookies!',
            user: u2.attributes,
            url: Frontend.Route.post({id: 6}),
            comments: []
          }
        ],
        conversations: [
          {
            id: 8,
            title: 'I am right',
            user: u4.attributes,
            url: Frontend.Route.post({id: 8}),
            comments: [
              {id: 13, text: 'No, you are wrong', user: u3.attributes}
            ]
          },
          {
            id: 7,
            title: 'Kapow!',
            user: u2.attributes,
            url: Frontend.Route.post({id: 7}),
            comments: []
          }
        ]
      })
    })

    it('makes sure links are fully qualified', () => {
      const data = {
        comments: [
          model({
            id: 11,
            post_id: 1,
            text: '<p><a href="/u/42">Lawrence Wang</a> & ' +
              '<a href="/u/5942">Minda Myers</a> <a>#berkeley</a></p>',
            relations: {
              user: u1,
              post: model({
                id: 1,
                name: 'Foo!',
                description: '<p><a href="/u/21">Edward West</a> & ' +
                  '<a href="/u/16325">Julia Pope</a> <a>#oakland</a></p>',
                relations: {user: u1}
              })
            }
          })
        ]
      }

      const prefix = Frontend.Route.prefix

      expect(formatData(community, data)).to.deep.equal({
        offers: [],
        requests: [],
        conversations: [
          {
            id: 1,
            title: 'Foo!',
            details: `<p><a href="${prefix}/u/21">Edward West</a> &amp; ` +
              `<a href="${prefix}/u/16325">Julia Pope</a> ` +
              `<a href="${prefix}/c/foo/tag/oakland">#oakland</a></p>`,
            user: u1.attributes,
            url: Frontend.Route.post({id: 1}),
            comments: [
              {
                id: 11,
                text: `<p><a href="${prefix}/u/42">Lawrence Wang</a> &amp; ` +
                `<a href="${prefix}/u/5942">Minda Myers</a> ` +
                `<a href="${prefix}/c/foo/tag/berkeley">#berkeley</a></p>`,
                user: u1.attributes
              }
            ]
          }
        ]
      })
    })
  })

  describe('personalizeData', () => {
    var user

    before(() => {
      user = factories.user({avatar_url: 'http://google.com/logo.png'})
      return user.save()
    })

    it('adds expected user-specific attributes', () => {
      const data = {
        community_id: '77',
        community_name: 'foo',
        requests: [],
        offers: [
          {id: 1, title: 'Hi', user: u4.attributes, comments: []}
        ],
        conversations: [
          {
            id: 2, title: 'Ya', user: u3.attributes,
            comments: [
              {id: 3, user: user.pick('id', 'avatar_url'), text: 'Na'},
              {id: 4, user: u2.attributes, text: 'Woa'}
            ]
          }
        ]
      }

      return personalizeData(user, data).then(newData =>
        expect(newData).to.deep.equal(merge({}, data, {
          offers: [
            {
              id: 1, title: 'Hi', user: u4.attributes,
              reply_url: Email.postReplyAddress(1, user.id)
            }
          ],
          conversations: [
            {
              id: 2, title: 'Ya', user: u3.attributes,
              reply_url: Email.postReplyAddress(2, user.id),
              comments: [
                {id: 3, user: user.pick('id', 'avatar_url'), text: 'Na'},
                {id: 4, user: u2.attributes, text: 'Woa'}
              ]
            }
          ],
          recipient: {
            name: user.get('name'),
            avatar_url: user.get('avatar_url')
          },
          email_settings_url: Frontend.Route.userSettings() + '?expand=account',
          form_action_url: Frontend.Route.emailPostForm(),
          form_token: Email.postCreationToken(77, user.id),
          tracking_pixel_url: Analytics.pixelUrl('Digest', {userId: user.id, community: 'foo'}),
          subject: `New activity from ${u4.name}, ${u3.name}, and 2 others`
        })))
    })
  })

  describe('shouldSendData', () => {
    it('is false if the data is empty', () => {
      const data = {requests: [], offers: [], conversations: []}
      expect(shouldSendData(data)).to.be.false
    })

    it('is true if there is some data', () => {
      const data = {conversations: [{id: 'foo'}]}
      expect(shouldSendData(data)).to.be.true
    })
  })

  describe('sendAllDigests', () => {
    var args, u1, u2, community, post

    before(() => {
      spyify(Email, 'sendSimpleEmail', function () { args = arguments })
      const six = moment.tz(defaultTimezone).startOf('day').add(6, 'hours')

      u1 = factories.user({
        active: true,
        settings: {digest_frequency: 'daily'},
        avatar_url: 'av1'
      })
      u2 = factories.user({avatar_url: 'av2'})
      community = factories.community({daily_digest: true, avatar_url: 'foo'})

      return community.save()
      .tap(c => u2.save()
        .then(u => {
          post = factories.post({created_at: six, user_id: u2.id})
          return post.save()
        })
        .then(p => p.communities().attach(c.id)))
      .tap(c => u1.save()
        .then(u => u.communities().attach({community_id: c.id, active: true})))
    })

    after(() => unspyify(Email, 'sendSimpleEmail'))

    it('calls SendWithUs with expected data', function () {
      this.timeout(10000)

      return sendAllDigests('daily').then(result => {
        expect(result).to.deep.equal([[community.id, 1]])
        expect(Email.sendSimpleEmail).to.have.been.called()
        expect(args[0]).to.equal(u1.get('email'))
        expect(args[2]).to.deep.equal({
          community_id: community.id,
          community_name: community.get('name'),
          community_avatar_url: community.get('avatar_url'),
          community_url: Frontend.Route.community(community) + '?ctt=digest_email',
          time_period: 'yesterday',
          subject: `New activity from ${u2.get('name')}`,
          requests: [],
          offers: [],
          conversations: [
            {
              id: post.id,
              title: post.get('name'),
              reply_url: Email.postReplyAddress(post.id, u1.id),
              url: Frontend.Route.post(post),
              user: u2.pick('id', 'avatar_url', 'name'),
              comments: []
            }
          ],
          recipient: u1.pick('avatar_url', 'name'),
          form_action_url: Frontend.Route.emailPostForm(),
          form_token: Email.postCreationToken(community.id, u1.id),
          tracking_pixel_url: Analytics.pixelUrl('Digest', {
            userId: u1.id,
            community: community.get('name')
          }),
          email_settings_url: Frontend.Route.userSettings() + '?expand=account'
        })
      })
    })
  })
})

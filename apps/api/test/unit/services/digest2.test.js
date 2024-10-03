import moment from 'moment-timezone'
import formatData from '../../../lib/group/digest2/formatData'
import personalizeData from '../../../lib/group/digest2/personalizeData'
import { defaultTimezone, shouldSendData, getRecipients } from '../../../lib/group/digest2/util'
import { sendDigest, sendAllDigests } from '../../../lib/group/digest2'
import factories from '../../setup/factories'
import { spyify, unspyify } from '../../setup/helpers'
import { merge, omit } from 'lodash'
require('../../setup')

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

const group = model({ slug: 'foo' })

const linkPreview = model({
  id: '1',
  title: 'Funny explosion video',
  url: 'http://youtube.com/kapow',
  image_url: 'http://img.youtube.com/vi/kapow/hqdefault.jpg',
  description: "You'll never guess what happens next."
})

describe('group digest v2', () => {
  describe('formatData', () => {
    it('organizes new posts and comments', () => {
      const eventStart = moment.tz(new Date(), moment.tz.guess())

      const data = {
        comments: [
          model({
            id: 12,
            text: () => 'I have two!',
            post_id: 5,
            relations: {
              user: u3,
              post: model({id: 5, name: 'Old Post, New Comments', summary: () => 'Old Post, New Comments', details: () => {}, relations: {user: u4}})
            }
          }),
          model({
            id: 13,
            text: () => 'No, you are wrong',
            post_id: 8,
            relations: {
              user: u3,
              post: model({id: 8, name: 'Old Post, New Comments', summary: () => 'Old Post, New Comments', details: () => {}, relations: {user: u4}})
            }
          }),
          model({
            id: 13,
            text: () => 'No, you are still wrong',
            post_id: 8,
            relations: {
              user: u3,
              post: model({id: 8, name: 'Old Post, New Comments', summary: () => 'Old Post, New Comments', details: () => {}, relations: {user: u4}})
            }
          })

        ],
        posts: [
          model({
            id: 5,
            name: 'Do you have a dollar?',
            summary: () => 'Do you have a dollar?',
            details: () => {},
            type: 'request',
            relations: {
              user: u1
            }
          }),
          model({
            id: 7,
            name: 'Kapow!',
            details: () => {},
            summary: () => 'Kapow!',
            type: 'discussion',
            relations: {
              tags: collection([]),
              linkPreview,
              user: u2
            }
          }),
          model({
            id: 6,
            name: 'I have cookies!',
            summary: () => 'I have cookies!',
            details: () => {},
            type: 'offer',
            relations: {
              user: u2
            }
          }),
          model({
            id: 76,
            name: 'An event',
            summary: () => 'An event',
            details: () => {},
            type: 'event',
            location: 'Home',
            start_time: eventStart,
            relations: {
              user: u2
            }
          }),
          model({
            id: 77,
            name: 'A project with requests',
            summary: () => 'A project with requests',
            details: () => {},
            type: 'project',
            relations: {
              user: u2,
              children: collection([
                model({name: 'I need things'}),
                model({name: 'and love'}),
                model({name: 'and more things'})
              ])
            }
          }),
          model({
            id: 78,
            name: '',
            details: () => "A chat!",
            summary: () => 'A chat!',
            type: 'chat',
            relations: {
              user: u2,
              tags: collection([
                model({ name: 'bayarea' })
              ])
            }
          })
        ]
      }

      const expected = {
        topicsWithChats: [
          {
            name: 'bayarea',
            num_new_chats: 1,
            url: Frontend.Route.topic('foo', { name: 'bayarea' })
          }
        ],
        requests: [
          {
            id: 5,
            title: 'Do you have a dollar?',
            user: u1.attributes,
            url: Frontend.Route.post({id: 5}, group),
            comments: [
              {
                id: 12,
                text: 'I have two!',
                user: {
                  avatar_url: 'http://apple.com/baz.png',
                  id: 3,
                  name: 'Baz'
                }
              }
            ]
          }
        ],
        offers: [
          {
            id: 6,
            title: 'I have cookies!',
            user: u2.attributes,
            url: Frontend.Route.post({id: 6}, group),
            comments: []
          }
        ],
        resources: [],
        proposals: [],
        discussions: [
          {
            id: 7,
            title: 'Kapow!',
            user: u2.attributes,
            url: Frontend.Route.post({id: 7}, group),
            comments: [],
            link_preview: omit(linkPreview.attributes, 'id')
          }
        ],
        events: [
          {
            id: 76,
            title: 'An event',
            location: 'Home',
            when: eventStart.format('ddd, MMM D [at] h:mmA z'),
            user: u2.attributes,
            url: Frontend.Route.post({id: 76}, group),
            comments: []
          }
        ],
        projects: [
          {
            id: 77,
            title: 'A project with requests',
            user: u2.attributes,
            url: Frontend.Route.post({id: 77}, group),
            comments: []
          }
        ],
        postsWithNewComments: [
          {
            id: 8,
            title: 'Old Post, New Comments',
            url: Frontend.Route.post({id: 8}, group),
            comments: [
              {
                id: 13,
                text: 'No, you are wrong',
                user: {
                  avatar_url: 'http://apple.com/baz.png',
                  id: 3,
                  name: 'Baz'
                }
              },
              {
                id: 13,
                text: 'No, you are still wrong',
                user: {
                  avatar_url: 'http://apple.com/baz.png',
                  id: 3,
                  name: 'Baz'
                }
              }
            ],
            comment_count: 2,
            user: {
              avatar_url: 'http://cnn.com/man.png',
              id: 4,
              name: 'Mr. Man'
            }
          }
        ]
      }

      expect(formatData(group, data)).to.deep.equal(expected)
    })

    it('makes sure links are fully qualified', () => {
      const data = {
        posts: [
          model({
            id: 1,
            name: 'Foo!',
            summary: () => `Foo!`,
            details: () => `<p><a href="/groups/foo/members/21" data-id="21" class="mention" target="_blank">Edward West</a> &amp; ` +
            `<a href="/groups/foo/members/16325" data-id="16325" class="mention" target="_blank">Julia Pope</a> ` +
            `<a href="/groups/foo/topics/oakland" data-label="#oakland" class="topic" target="_blank">#oakland</a></p>`,
            type: 'request',
            relations: {
              user: u1
            }
          })
        ],
        comments: []
      }

      const prefix = Frontend.Route.prefix
      expect(formatData(group, data)).to.deep.equal({
        offers: [],
        discussions: [],
        proposals: [],
        requests: [
          {
            id: 1,
            title: 'Foo!',
            details: `<p><a href="${prefix}/groups/foo/members/21" data-id="21" class="mention" target="_blank">Edward West</a> &amp; ` +
              `<a href="${prefix}/groups/foo/members/16325" data-id="16325" class="mention" target="_blank">Julia Pope</a> ` +
              `<a href="${prefix}/groups/foo/topics/oakland" data-label="#oakland" class="topic" target="_blank">#oakland</a></p>`,
            user: u1.attributes,
            url: Frontend.Route.post({id: 1}, group),
            comments: []
          }
        ],
        postsWithNewComments: [],
        topicsWithChats: [],
        projects: [],
        events: [],
        resources: []
      })
    })

    it('sets the no_new_activity key if there is no data', () => {
      const data = {posts: [], comments: []}

      expect(formatData(group, data)).to.deep.equal({
        topicsWithChats: [],
        offers: [],
        requests: [],
        discussions: [],
        proposals: [],
        postsWithNewComments: [],
        projects: [],
        events: [],
        resources: [],
        no_new_activity: true
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
      const { prefix } = Frontend.Route
      const data = {
        group_id: '77',
        group_name: 'foo',
        group_url: 'https://www.hylo.com/groups/foo',
        requests: [],
        events: [],
        projects: [],
        resources: [],
        offers: [
          {
            id: 1,
            title: 'Hi',
            user: u4.attributes,
            comments: [],
            url: 'https://www.hylo.com/all/post/1'
          }
        ],
        discussions: [
          {
            id: 2,
            title: 'Ya',
            user: u3.attributes,
            details: '<p><a href="mailto:foo@bar.com">foo@bar.com</a> and ' +
              `<a href="${prefix}/members/2?ya=1">Person</a></p>`,
            comments: [
              {id: 3, user: user.pick('id', 'avatar_url'), text: 'Na'},
              {id: 4, user: u2.attributes, text: `Woa <a href="${prefix}/members/4">Bob</a>`}
            ],
            url: 'https://www.hylo.com/all/post/2'
          }
        ]
      }

      return personalizeData(user, 'daily', data).then(newData => {
        const ctParams = `ctt=digest_email&cti=${user.id}&ctcn=foo`
        expect(newData).to.deep.equal(merge({}, data, {
          offers: [
            {
              id: 1,
              title: 'Hi',
              user: u4.attributes,
              reply_url: Email.postReplyAddress(1, user.id),
              url: 'https://www.hylo.com/all/post/1?' + ctParams
            }
          ],
          discussions: [
            {
              id: 2,
              title: 'Ya',
              user: u3.attributes,
              details: '<p><a href="mailto:foo@bar.com">foo@bar.com</a> and ' +
                `<a href="${prefix}/members/2?ya=1&amp;${ctParams.replace(/&/g, '&amp;')}">Person</a></p>`,
              reply_url: Email.postReplyAddress(2, user.id),
              url: 'https://www.hylo.com/all/post/2?' + ctParams,
              comments: [
                { id: 3, user: user.pick('id', 'avatar_url'), text: 'Na' },
                { id: 4, user: u2.attributes, text: `Woa <a href="${prefix}/members/4?${ctParams.replace(/\&/g, '&amp;')}">Bob</a>` }
              ]
            }
          ],
          recipient: {
            name: user.get('name'),
            avatar_url: user.get('avatar_url')
          },
          loginToken: newData.loginToken,
          email_settings_url: Frontend.Route.notificationsSettings() + '?' + ctParams + '&expand=account' + '&token=' + newData.loginToken + '&name=' + encodeURIComponent(user.get('name')) + '&u=' + user.id,
          post_creation_action_url: Frontend.Route.emailPostForm(),
          reply_action_url: Frontend.Route.emailBatchCommentForm(),
          form_token: Email.formToken(77, user.id),
          tracking_pixel_url: Analytics.pixelUrl('Digest', { userId: user.id, group: 'foo' }),
          subject: `Hi | ${u4.name}`,
          group_url: 'https://www.hylo.com/groups/foo?' + ctParams
        }))
      })
    })
  })

  describe('shouldSendData', () => {
    it('is false if the data is empty', () => {
      const data = {requests: [], offers: [], discussions: []}
      return shouldSendData(data).then(val => expect(val).to.be.false)
    })

    it('is true if there is some data', () => {
      const data = {discussions: [{id: 'foo'}]}
      return shouldSendData(data).then(val => expect(val).to.be.true)
    })
  })

  describe('sendAllDigests', () => {
    let args, u1, u2, group, post

    before(async () => {
      spyify(Email, 'sendSimpleEmail', function () { args = arguments })
      const six = moment.tz(defaultTimezone).startOf('day').add(6, 'hours')

      u1 = await factories.user({
        active: true,
        settings: { digest_frequency: 'daily' },
        avatar_url: 'av1'
      }).save()
      u2 = await factories.user({ avatar_url: 'av2' }).save()
      group = await factories.group({ avatar_url: 'foo' }).save()

      post = await factories.post({ created_at: six, user_id: u2.id, type: 'discussion' }).save()
      await post.groups().attach(group.id)
      await group.addMembers([u1.id], {
        settings: { sendEmail: true }
      })
    })

    after(() => unspyify(Email, 'sendSimpleEmail'))

    it('calls SendWithUs with expected data', function () {
      this.timeout(10000)
      const params = new URLSearchParams({
        ctt: 'digest_email',
        cti: u1.id,
        ctcn: group.get('name')
      })
      const clickthroughParams = `?${params.toString()}`
      console.log(clickthroughParams, 'meeps')
      return sendAllDigests('daily').then(result => {
        expect(result).to.deep.equal([[group.id, 1]])
        expect(Email.sendSimpleEmail).to.have.been.called()
        expect(args[0]).to.equal(u1.get('email'))
        expect(args[2]).to.deep.equal({
          group_id: group.id,
          group_name: group.get('name'),
          group_avatar_url: group.get('avatar_url'),
          group_url: Frontend.Route.group(group) + clickthroughParams,
          time_period: 'yesterday',
          subject: `${post.get('name')} | ${u2.get('name')}`,
          requests: [],
          offers: [],
          postsWithNewComments: [],
          topicsWithChats: [],
          events: [],
          projects: [],
          proposals: [],
          resources: [],
          discussions: [
            {
              id: post.id,
              title: post.get('name'),
              reply_url: Email.postReplyAddress(post.id, u1.id),
              url: Frontend.Route.post(post, group) + clickthroughParams,
              user: u2.pick('id', 'avatar_url', 'name'),
              comments: []
            }
          ],
          recipient: u1.pick('avatar_url', 'name'),
          post_creation_action_url: Frontend.Route.emailPostForm(),
          reply_action_url: Frontend.Route.emailBatchCommentForm(),
          form_token: Email.formToken(group.id, u1.id),
          tracking_pixel_url: Analytics.pixelUrl('Digest', {
            userId: u1.id,
            group: group.get('name'),
            'Email Version': 'Dec 2022 - With topic chats'
          }),
          loginToken: args[2].loginToken,
          email_settings_url: Frontend.Route.notificationsSettings() + clickthroughParams + '&expand=account' + '&token=' + args[2].loginToken + '&name=' + encodeURIComponent(u1.get('name')) + '&u=' + u1.id
        })
      })
    })
  })

  describe('sendDigest', () => {
    var group

    beforeEach(() => {
      group = factories.group()
      return group.save()
    })

    describe('when there is no data', () => {
      it('does not send -- feature disabled', () => {
        return sendDigest(group.id, 'daily')
        .then(result => expect(result).to.equal(false))
      })
    })
  })
})

describe('getRecipients', () => {
  var g, uIn1, uOut1, uOut2, uOut3, uOut4, uOut5, uIn2

  before(async () => {
    const settings = {digest_frequency: 'daily'}
    uIn1 = factories.user({settings})
    uOut1 = factories.user({active: false, settings})                // inactive user
    uOut2 = factories.user({settings})                               // inactive membership
    uOut3 = factories.user({settings})                               // send_email = false
    uOut4 = factories.user({settings: {digest_frequency: 'weekly'}}) // digest_frequency = 'weekly'
    uOut5 = factories.user({settings})                               // not in the group
    uIn2 = factories.user({settings})
    g = factories.group()
    await Promise.join(
      uIn1.save(),
      uOut1.save(),
      uOut2.save(),
      uOut3.save(),
      uOut4.save(),
      uOut5.save(),
      uIn2.save(),
      g.save()
    )

    await g.addMembers([uIn1, uOut1, uOut2, uOut4, uIn2], {
      settings: {sendEmail: true}
    })

    await g.addMembers([uOut3], {settings: {sendEmail: false}})
    await g.removeMembers([uOut2])
  })

  it('only returns active members with email turned on and the right digest type', () => {
    return getRecipients(g.id, 'daily')
    .then(models => {
      expect(models.length).to.equal(2)
      expect(models.map(m => m.id).sort())
      .to.deep.equal([uIn1.id, uIn2.id].sort())
    })
  })
})

require('../../setup')
import moment from 'moment-timezone'
import formatData from '../../../lib/community/digest2/formatData'
import personalizeData from '../../../lib/community/digest2/personalizeData'
import { defaultTimezone, shouldSendData } from '../../../lib/community/digest2/util'
import { sendDigest, sendAllDigests } from '../../../lib/community/digest2'
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

    it('sets the no_new_activity key if there is no data', () => {
      const data = {posts: [], comments: []}

      expect(formatData(community, data)).to.deep.equal({
        offers: [],
        requests: [],
        conversations: [],
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
        community_id: '77',
        community_name: 'foo',
        community_url: 'https://www.hylo.com/c/foo',
        requests: [],
        offers: [
          {
            id: 1, title: 'Hi', user: u4.attributes, comments: [],
            url: 'https://www.hylo.com/p/1'
          }
        ],
        conversations: [
          {
            id: 2, title: 'Ya', user: u3.attributes,
            details: '<p><a href="mailto:foo@bar.com">foo@bar.com</a> and ' +
              `<a href="${prefix}/u/2?ya=1">Person</a></p>`,
            comments: [
              {id: 3, user: user.pick('id', 'avatar_url'), text: 'Na'},
              {id: 4, user: u2.attributes, text: `Woa <a href="${prefix}/u/4">Bob</a>`}
            ],
            url: 'https://www.hylo.com/p/2'
          }
        ]
      }

      return personalizeData(user, data).then(newData => {
        const ctParams = `?ctt=digest_email&cti=${user.id}&ctcn=foo`
        expect(newData).to.deep.equal(merge({}, data, {
          offers: [
            {
              id: 1, title: 'Hi', user: u4.attributes,
              reply_url: Email.postReplyAddress(1, user.id),
              url: 'https://www.hylo.com/p/1' + ctParams
            }
          ],
          conversations: [
            {
              id: 2, title: 'Ya', user: u3.attributes,
              details: '<p><a href="mailto:foo@bar.com">foo@bar.com</a> and ' +
                `<a href="${prefix}/u/2?ya=1${ctParams.replace('?', '&')}">Person</a></p>`,
              reply_url: Email.postReplyAddress(2, user.id),
              url: 'https://www.hylo.com/p/2' + ctParams,
              comments: [
                {id: 3, user: user.pick('id', 'avatar_url'), text: 'Na'},
                {id: 4, user: u2.attributes, text: `Woa <a href="${prefix}/u/4${ctParams}">Bob</a>`}
              ]
            }
          ],
          recipient: {
            name: user.get('name'),
            avatar_url: user.get('avatar_url')
          },
          email_settings_url: Frontend.Route.userSettings() + ctParams + '&expand=account',
          post_creation_action_url: Frontend.Route.emailPostForm(),
          reply_action_url: Frontend.Route.emailBatchCommentForm(),
          form_token: Email.formToken(77, user.id),
          tracking_pixel_url: Analytics.pixelUrl('Digest', {userId: user.id, community: 'foo'}),
          subject: `New activity from ${u4.name}, ${u3.name}, and 2 others`,
          community_url: 'https://www.hylo.com/c/foo' + ctParams
        }))
      })
    })
  })

  describe('shouldSendData', () => {
    it('is false if the data is empty', () => {
      const data = {requests: [], offers: [], conversations: []}
      return shouldSendData(data).then(val => expect(val).to.be.false)
    })

    it('is true if there is some data', () => {
      const data = {conversations: [{id: 'foo'}]}
      return shouldSendData(data).then(val => expect(val).to.be.true)
    })

    describe("when the community's post_prompt_day is today", () => {
      var community

      beforeEach(() => {
        community = factories.community()
        community.addSetting({post_prompt_day: moment.tz(defaultTimezone).day()})
        return community.save()
      })

      it('is true', () =>
        shouldSendData({}, community.id).then(val => expect(val).to.be.true))
    })

    describe("when the community's post_prompt_day is not today", () => {
      var community

      beforeEach(() => {
        community = factories.community()
        community.addSetting({post_prompt_day: moment.tz(defaultTimezone).day() + 1})
        return community.save()
      })

      it('is false', () =>
        shouldSendData({}, community.id).then(val => expect(val).to.be.false))
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
      const clickthroughParams = `?ctt=digest_email&cti=${u1.id}&ctcn=${community.get('name')}`

      return sendAllDigests('daily').then(result => {
        expect(result).to.deep.equal([[community.id, 1]])
        expect(Email.sendSimpleEmail).to.have.been.called()
        expect(args[0]).to.equal(u1.get('email'))
        expect(args[2]).to.deep.equal({
          community_id: community.id,
          community_name: community.get('name'),
          community_avatar_url: community.get('avatar_url'),
          community_url: Frontend.Route.community(community) + clickthroughParams,
          time_period: 'yesterday',
          subject: `New activity from ${u2.get('name')}`,
          requests: [],
          offers: [],
          conversations: [
            {
              id: post.id,
              title: post.get('name'),
              reply_url: Email.postReplyAddress(post.id, u1.id),
              url: Frontend.Route.post(post) + clickthroughParams,
              user: u2.pick('id', 'avatar_url', 'name'),
              comments: []
            }
          ],
          recipient: u1.pick('avatar_url', 'name'),
          post_creation_action_url: Frontend.Route.emailPostForm(),
          reply_action_url: Frontend.Route.emailBatchCommentForm(),
          form_token: Email.formToken(community.id, u1.id),
          tracking_pixel_url: Analytics.pixelUrl('Digest', {
            userId: u1.id,
            community: community.get('name'),
            'Email Version': u1.id % 2 === 0 ? 'multi-reply-form' : 'default'
          }),
          email_settings_url: Frontend.Route.userSettings() + clickthroughParams + '&expand=account'
        })
      })
    })
  })

  describe('sendDigest', () => {
    var community

    beforeEach(() => {
      community = factories.community()
      return community.save()
    })

    describe('when there is no data and post_prompt_day matches', () => {
      beforeEach(() => {
        community.addSetting({post_prompt_day: moment.tz(defaultTimezone).day()})
        return community.save()
      })

      it('sends', () => {
        return sendDigest(community.id, 'daily')
        .then(result => expect(result).to.equal(0))
      })
    })

    describe('when there is no data and post_prompt_day does not match', () => {
      it('does not send', () => {
        return sendDigest(community.id, 'daily')
        .then(result => expect(result).to.be.false)
      })
    })
  })
})

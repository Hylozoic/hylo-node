import findOrCreateThread from '../models/post/findOrCreateThread'
import createComment from '../models/comment/createComment'

const MessagingService = {
  async sendMessageFromAxolotl (userIds, text) {
    const thread = await findOrCreateThread(User.AXOLOTL_ID, userIds)
    const message = await createComment(User.AXOLOTL_ID, {text, post: thread})
    return message
  }
}

module.exports = MessagingService

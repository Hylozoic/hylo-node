import { filter } from 'lodash/fp'
import { flatten } from 'lodash'

module.exports = bookshelf.Model.extend({
  tableName: 'pending_post_status'
},{
  addNew: function(transaction_id){
    return new PendingPostStatus({
      created_at: new Date(),
      transaction_id,
      status: 'pending'
    }).save()
  },
  updateStatus: function(transaction_id, status){
    return PendingPostStatus.query().where({transaction_id: transaction_id})
     .update({status: status, updated_at: new Date()})
  },
  find: function(transactionId, options){
    return PendingPostStatus.where({transaction_id: transactionId}).fetch(options).catch(() => null)
  }
})

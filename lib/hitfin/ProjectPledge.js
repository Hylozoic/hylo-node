import Offer from './Offer'
import Issue from './Issue'
import Syndicate from './Syndicate'
import TransactionLog from './TransactionLog'

module.exports = {
  create: function(financialRequestAmount, endTime, accessTokenProjectOwner, accessTokenSyndicateManager, emailSyndicateManager){
      var projectPledgeState = new Object()
      return Issue.create(accessTokenProjectOwner, financialRequestAmount, endTime)
          .then((hash) => TransactionLog.getLogByTransactionHash(accessTokenProjectOwner, hash, 0))
          .then((logEntry) => Issue.getIssueIdFromLog(logEntry))

          .then((projectOwnerIssueId) => {
            projectPledgeState.projectOwnerIssueId = projectOwnerIssueId
            return Offer.createSellOffer(accessTokenProjectOwner, projectOwnerIssueId, financialRequestAmount, endTime, emailSyndicateManager)
          })
          .then((hash) => TransactionLog.getLogByTransactionHash(accessTokenProjectOwner, hash, 0))
          .then((logEntry) => Offer.getOfferIdFromLog(logEntry))

          .then((projectOwnerOfferId) => {
            projectPledgeState.projectOwnerOfferId = projectOwnerOfferId
            return Issue.create(accessTokenSyndicateManager, financialRequestAmount, endTime)
          })
          .then((hash) => TransactionLog.getLogByTransactionHash(accessTokenSyndicateManager, hash, 0))
          .then((logEntry) => Issue.getIssueIdFromLog(logEntry))

          .then((syndicateManagerIssueId) => {
            projectPledgeState.syndicateManagerIssueId = syndicateManagerIssueId
            return Offer.createSellOffer(accessTokenSyndicateManager, syndicateManagerIssueId, financialRequestAmount, endTime, null)
          })
          .then((hash) => TransactionLog.getLogByTransactionHash(accessTokenSyndicateManager, hash, 0))
          .then((logEntry) => Offer.getOfferIdFromLog(logEntry))

          .then((syndicateManagerOfferId) => {
              projectPledgeState.syndicateManagerOfferId = syndicateManagerOfferId
              return Syndicate.create(accessTokenSyndicateManager, projectPledgeState.syndicateManagerIssueId, projectPledgeState.projectOwnerOfferId)
          })
          .then((hash) => TransactionLog.getLogByTransactionHash(accessTokenSyndicateManager, hash, 0)) // This is to ensure the syndicate is created successfully
          .then(() => {return projectPledgeState})
  },

  contribute: function(syndicateOfferId, contributedAmount, accessTokenSyndicateManager){
    return Offer.acceptPartially(accessTokenSyndicateManager, syndicateOfferId, contributedAmount)
    .then((hash) => TransactionLog.getLogByTransactionHash(accessTokenSyndicateManager, hash, 0))
  },

  getProgress: function(accessToken, issueId){
    return Issue.get(accessToken, issueId)
    .then((issue) => {
        if(issue.issue){
           issue = issue.issue //backward suport to Hitfin where there is issue node under issue
        }
        var numHolding = 0

        if(issue.all_holdings){
          issue.all_holdings.forEach(function(holding){
            if(holding.holder != issue.issuer){
              numHolding += parseFloat(holding.numShares)
            }
          })
        }
        return numHolding / 100
    })
  },

  cancel: function(accessTokenSyndicateManager, syndicateOfferId){
    return Offer.cancel(accessTokenSyndicateManager, syndicateOfferId)
    .then((hash) => TransactionLog.getLogByTransactionHash(accessTokenSyndicateManager, hash, 0))
  }
}

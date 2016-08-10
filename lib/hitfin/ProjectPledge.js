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
        .then((hash) => TransactionLog.getLogByTransactionHash(accessTokenSyndicateManager, hash, 0)) //This is to ensure that the
        .then(() => console.log(projectPledgeState))
        .then(console.log, console.error)
    }
}

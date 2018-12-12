import { createPost } from './post'
import { uniq } from 'lodash/fp'
var stripe = require("stripe")(process.env.STRIPE_API_KEY);

export function createProject (userId, data) {
  // add creator as a member of project on creation
  const memberIds = data.memberIds
    ? uniq(data.memberIds.concat([userId])) 
    : []
  const projectData = Object.assign({}, data, {type: Post.Type.PROJECT, memberIds})
  return createPost(userId, projectData)
}

async function getModeratedProject (userId, projectId) {
  const project = await Post.find(projectId, {withRelated: 'user'})
  if (!project) {
    throw new Error('Project not found')
  }

  if (!project.isProject()) {
    throw new Error('Post with supplied id is not a project')
  }

  if (project.relations.user.id !== userId) {
    throw new Error("You don't have permission to moderate this project")
  }
  return project
}

export async function createProjectRole (userId, projectId, roleName) {
  await getModeratedProject(userId, projectId)

  const existing = await ProjectRole.where({
    post_id: projectId,
    name: roleName
  }).fetch()

  if (existing) {
    throw new Error('A role with that name already exists in this project')
  }

  return ProjectRole.forge({
    post_id: projectId,
    name: roleName
  })
  .save()
  .then(() => ({success: true}))
}

export async function deleteProjectRole (userId, id) {
  const projectRole = await ProjectRole.find(id, {withRelated: 'project'})

  if (!projectRole) {
    throw new Error('Project Role not found')
  }

  await getModeratedProject(userId, projectRole.relations.project.id)
  return projectRole.destroy()
  .then()
  .then(() => ({success: true}))
}

export async function addPeopleToProjectRole (userId, peopleIds, projectRoleId) {
  const projectRole = await ProjectRole.find(projectRoleId, {withRelated: 'project'})

  if (!projectRole) {
    throw new Error('Project Role not found')
  }

  const project = await getModeratedProject(userId, projectRole.relations.project.id)

  if (!project) {
    throw new Error('No associated project')
  }

  const checkForSharedCommunity = id =>
    Group.inSameGroup([userId, id], Community)
    .then(doesShare => {
      if (!doesShare) throw new Error(`no shared communities with user ${id}`)
    })

  return Promise.map(peopleIds, async id => {
    await checkForSharedCommunity(id)
    var gm = await GroupMembership.forPair(id, project).fetch()
    if (!gm) {
      await project.addGroupMembers([id])
      gm = await GroupMembership.forPair(id, project).fetch()
    }
    await gm.save({
      project_role_id: projectRoleId
    })
  })
  .then(() => ({success: true}))
}

export async function joinProject (projectId, userId) {
  const project = await Post.find(projectId)
  return project.addProjectMembers([userId])
  .then(() => ({success: true}))
}

export async function leaveProject (projectId, userId) {
  const project = await Post.find(projectId)
  return project.removeProjectMembers([userId])
  .then(() => ({success: true}))
}

export async function createStripePaymentNotifications (contribution, creatorId) {
  const userId = contribution.get('user_id')
  const postId = contribution.get('post_id')

  const activities = [
    {
      reader_id: userId,
      post_id: postId,
      actor_id: userId,
      project_contribution_id: contribution.id,
      reason: `donation from`
    },
    {
      reader_id: creatorId,
      post_id: postId,
      actor_id: userId,
      project_contribution_id: contribution.id,
      reason: `donation to`
    },
  ]
  return Activity.saveForReasons(activities)
}

export async function processStripeToken (userId, projectId, token, amount) {
  const applicationFeeFraction = 0.01
  const project = await Post.find(projectId)  
  if (!project) {
    throw new Error (`Can't find project with that id`)
  }
  const contributor = await User.find(userId)
  const projectCreator = await User.find(project.get('user_id'), {withRelated: 'stripeAccount'})
  if (!projectCreator.relations.stripeAccount) {
    throw new Error (`This user does not have a connected Stripe account`)
  }

  // amount is in dollars, chargeAmount is in cents
  const chargeAmount = Number(amount) * 100
  const applicationFee = chargeAmount * applicationFeeFraction
  await stripe.charges.create({
    amount: chargeAmount,
    currency: 'usd',
    description: `${contributor.get('name')} contributing to project ${project.get('name')} - project id: ${projectId}`,
    source: token,
    application_fee: applicationFee
  }, {
    stripe_account: projectCreator.relations.stripeAccount.get('stripe_account_external_id')
  })

  const contribution = await ProjectContribution.forge({
    user_id: contributor.id,
    post_id: projectId,
    amount: chargeAmount
  }).save()

  await createStripePaymentNotifications(contribution, project.get('user_id'))

  const newTotal = Number(project.get('total_contributions')) + Number(amount)

  return project.save({
    total_contributions: newTotal
  })
  .then(() => ({success: true}))
}

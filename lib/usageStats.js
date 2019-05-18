var moment = require('moment')
var papaparse = require('papaparse')

export async function getActiveUsers (startTime, endTime) {
  const startTimeISOString = new Date(startTime).toISOString()
  const endTimeISOString = new Date(endTime).toISOString()  

  return bookshelf.knex.raw(`
    -- Post created
    SELECT posts.user_id
    FROM posts
    WHERE posts.type NOT IN('welcome', 'thread')
    AND posts.created_at > '${startTimeISOString}'
    AND posts.created_at <= '${endTimeISOString}'
    
    UNION
    
    -- Comment created
    SELECT comments.user_id
    FROM comments
    JOIN posts ON posts.id = comments.post_id
    WHERE comments.created_at > '${startTimeISOString}'
    AND comments.created_at <= '${endTimeISOString}'    
    AND posts.type NOT IN('welcome', 'thread')
    
    UNION
    
    -- Direct Message created
    SELECT comments.user_id
    FROM comments
    JOIN posts ON posts.id = comments.post_id
    WHERE comments.created_at > '${startTimeISOString}'
    AND comments.created_at <= '${endTimeISOString}'
    AND posts.type = 'thread'
    
    UNION
    
    -- Community created
    SELECT communities.created_by_id
    FROM communities
    WHERE communities.created_at > '${startTimeISOString}'
    AND communities.created_at <= '${endTimeISOString}'    
    
    UNION
    
    -- Tags created:
    SELECT user_id
    FROM communities_tags
    WHERE communities_tags.created_at > '${startTimeISOString}'
    AND communities_tags.created_at <= '${endTimeISOString}'    
    
    UNION
    
    -- Tag followed
    SELECT tag_follows.user_id
    FROM tag_follows
    WHERE tag_follows.created_at > '${startTimeISOString}'
    AND tag_follows.created_at <= '${endTimeISOString}'
    
    UNION

    -- Community Invites created
    SELECT community_invites.invited_by_id
    FROM community_invites
    WHERE community_invites.created_at > '${startTimeISOString}'
    AND community_invites.created_at <= '${endTimeISOString}'
    
    UNION
    
    -- Community Invites accepted
    SELECT community_invites.used_by_id
    FROM community_invites
    WHERE community_invites.used_at > '${startTimeISOString}'
    AND community_invites.used_at <= '${endTimeISOString}'    
    
    UNION
        
    -- Upvote created (~ base on post.created_at date...)
    SELECT votes.user_id
    FROM votes
    JOIN posts ON posts.id = votes.post_id
    WHERE posts.created_at > '${startTimeISOString}'
    AND posts.created_at <= '${endTimeISOString}'
  `)
}

export async function getActiveCommunities (startTime, endTime) {
  const startTimeISOString = new Date(startTime).toISOString()
  const endTimeISOString = new Date(endTime).toISOString()  

  return bookshelf.knex.raw(`
    -- Post created
    -- Post created
    SELECT communities_posts.community_id
    FROM posts
    JOIN communities_posts ON communities_posts.post_id = posts.id
    WHERE posts.type NOT IN('welcome', 'thread')
    AND posts.created_at > '${startTimeISOString}'
    AND posts.created_at <= '${endTimeISOString}'    
    
    UNION
    
    -- Comment created
    SELECT communities_posts.community_id
    FROM comments
    JOIN posts ON posts.id = comments.post_id
    JOIN communities_posts ON communities_posts.post_id = posts.id
    WHERE comments.created_at > '${startTimeISOString}'
    AND comments.created_at <= '${endTimeISOString}'    
    AND posts.type NOT IN('welcome', 'thread')
    
    UNION
    
    -- Direct Message created
    SELECT communities_posts.community_id
    FROM comments
    JOIN posts ON posts.id = comments.post_id
    JOIN communities_posts ON communities_posts.post_id = posts.id
    WHERE comments.created_at > '${startTimeISOString}'
    AND comments.created_at <= '${endTimeISOString}'    
    AND posts.type = 'thread'
    
    UNION
    
    -- Community created
    SELECT communities.id
    FROM communities
    WHERE communities.created_at > '${startTimeISOString}'
    AND communities.created_at <= '${endTimeISOString}'    
    
    UNION
    
    -- Tags created
    SELECT communities_tags.community_id
    FROM communities_tags
    WHERE communities_tags.created_at > '${startTimeISOString}'
    AND communities_tags.created_at <= '${endTimeISOString}'    
    
    UNION
    
    -- Tag followed
    SELECT tag_follows.community_id
    FROM tag_follows
    WHERE tag_follows.created_at > '${startTimeISOString}'
    AND tag_follows.created_at <= '${endTimeISOString}'    
    
    UNION
    
    -- Community Invites created
    SELECT community_invites.community_id
    FROM community_invites
    WHERE community_invites.created_at > '${startTimeISOString}'
    AND community_invites.created_at <= '${endTimeISOString}'    
    
    UNION
    
    -- Community Invites accepted
    SELECT community_invites.community_id
    FROM community_invites
    WHERE community_invites.used_at > '${startTimeISOString}'
    AND community_invites.used_at <= '${endTimeISOString}'    
    
    UNION
    
    -- Upvote created (~ base on post.created_at date...)
    SELECT communities_posts.community_id
    FROM votes
    JOIN posts ON posts.id = votes.post_id
    JOIN communities_posts ON communities_posts.post_id = posts.id
    WHERE posts.created_at > '${startTimeISOString}'
    AND posts.created_at <= '${endTimeISOString}'    
  `)
}

export async function getCreatedUsers (startTime, endTime) {
  const startTimeISOString = new Date(startTime).toISOString()
  const endTimeISOString = new Date(endTime).toISOString()  

  return bookshelf.knex.raw(`
    SELECT id 
    FROM users
    WHERE users.created_at > '${startTimeISOString}'
    AND users.created_at <= '${endTimeISOString}'
  `)
}

export async function getCreatedCommunities (startTime, endTime) {
  const startTimeISOString = new Date(startTime).toISOString()
  const endTimeISOString = new Date(endTime).toISOString()  

  return bookshelf.knex.raw(`
    SELECT id 
    FROM communities
    WHERE communities.created_at > '${startTimeISOString}'
    AND communities.created_at <= '${endTimeISOString}'
  `)
}

export async function generateMonthlyData (startTime = '2015-1-1') {
  var time = moment(startTime)
  const now = moment()
  const months = []
  while (time < now) {
    const nextMonth = time.clone().add(1, 'month')
    const active_users = (await getActiveUsers(time, nextMonth)).rows.length
    const created_users = (await getCreatedUsers(time, nextMonth)).rows.length
    const active_communities = (await getActiveCommunities(time, nextMonth)).rows.length
    const created_communities = (await getCreatedCommunities(time, nextMonth)).rows.length

    months.push(
      {
        date: time.format('YYYY-M-D'),
        active_users,
        created_users,
        active_communities,
        created_communities
      }
    )
    time.add(1, 'month')
  }

  return months
}

export async function monthlyDataCSV () {
  const data = await generateMonthlyData()
  return papaparse.unparse(data)
}
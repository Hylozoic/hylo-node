exports.up = knex => knex.raw(`
  DELETE FROM networks_posts
  WHERE id IN (
    SELECT id
    FROM (
      SELECT
        id,
        ROW_NUMBER() OVER(PARTITION BY network_id, post_id ORDER BY id ) AS row_num
      FROM networks_posts
    ) t
    WHERE t.row_num > 1
  )
`)

exports.down = knex => {}

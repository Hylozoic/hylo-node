require("@babel/register")

exports.up = async function (knex, Promise) {
  await knex.raw('UPDATE communities SET banner_url = \'https://d3ngex8q79bk55.cloudfront.net/misc/default_community_banner.jpg\' WHERE banner_url IS NULL')
  await knex.raw('UPDATE communities SET avatar_url = \'https://d3ngex8q79bk55.cloudfront.net/misc/default_community_avatar.png\' WHERE avatar_url IS NULL')
}

exports.down = function (knex, Promise) {

}

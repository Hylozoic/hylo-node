
exports.up = function (knex) {
  return knex('widgets').insert([
    {id: 11, name: 'nearby_relevant_groups' },
    {id: 12, name: 'nearby_relevant_events' },
    {id: 13, name: 'nearby_relevant_requests_offers' },
    {id: 14, name: 'farm_comparison' }]
  )
}

exports.down = function (knex) {
  return knex('widgets').whereIn('name', [
    'nearby_relevant_groups',
    'nearby_relevant_events',
    'nearby_relevant_requests_offers',
    'farm_comparison'
  ]
  ).del()
}

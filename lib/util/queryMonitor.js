// Adapted from:
// https://spin.atomicobject.com/2017/03/27/timing-queries-knexjs-nodejs/

import now from 'performance-now'
import util from 'util'
import chalk from 'chalk'
import { pd } from 'pretty-data'

export default function queryMonitor (knex) {
  // The map used to store the query times, where the query unique
  // identifier is the key.
  const times = {}
  // Used for keeping track of the order queries are executed.
  let count = 0

  knex.on('query', query => {
    const uid = query.__knexQueryUid
    times[uid] = {
      position: count,
      query,
      startTime: now()
    }
    count = count + 1
  })
  .on('query-response', (response, query) => {
    const uid = query.__knexQueryUid
    times[uid].endTime = now()
    const position = times[uid].position

    // Print the current query, if I'm able
    printIfPossible(uid)

    // Check to see if queries further down the queue can be executed, in case
    // they weren't able to be printed when they first responded.
    printQueriesAfterGivenPosition(position)
  })

  function printIfPossible (uid) {
    const { position } = times[uid]

    // Look for a query with a position one less than the current query
    const previousTimeUid = Object.keys(times).find(key =>
      times[key].position === position - 1)

    // If we didn't find it, it must have been printed already and we can safely
    // print ourselves.
    if (!previousTimeUid) {
      printQueryWithTime(uid)
    }
  }

  function printQueriesAfterGivenPosition (position) {
    // Look for the next query in the queue
    const nextTimeUid = Object.keys(times).find(key =>
      times[key].position === position + 1)

    // If we find one and it is marked as finished, we can go ahead and print it
    if (nextTimeUid && !!times[nextTimeUid].endTime) {
      const nextPosition = times[nextTimeUid].position
      printQueryWithTime(nextTimeUid)

      // There might be more queries that need to printed, so we should keep
      // looking...
      printQueriesAfterGivenPosition(nextPosition)
    }
  }

  function printQueryWithTime (uid) {
    const { startTime, endTime, query } = times[uid]
    const elapsedTime = endTime - startTime

    sails.log.info(presentTime(elapsedTime) + ' ' + pd.sql(presentQuery(query)))

    // After I print out the query, I have no more use for it, so I delete it
    // from my map so it doesn't grow out of control.
    delete times[uid]
  }
}

function presentQuery ({ bindings, sql }) {
  const { blue, cyan, green, red, yellow } = chalk
  var args = (bindings || []).map(s => {
    if (s === null) return blue('null')
    if (s === undefined) return red('undefined')
    if (typeof (s) === 'object') return blue(JSON.stringify(s))
    return blue(s.toString())
  })
  args.unshift(sql.replace(/\?/g, '%s'))

  // TODO fix missing limit and boolean values
  return util.format.apply(util, args)
  .replace(/^(select)/i, cyan('$1'))
  .replace(/^(insert)/i, green('$1'))
  .replace(/^(update)/i, yellow('$1'))
  .replace(/^(delete)/i, red('$1'))
}

function presentTime (time) {
  let color
  if (time < 10) color = 'gray'
  else if (time < 40) color = 'yellow'
  else color = 'red'
  return chalk[color](time.toFixed(3) + 'ms')
}

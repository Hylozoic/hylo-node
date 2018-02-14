
const odataToKnex = {
    'eq': '=',
    'ne': '!=',
    'gt': '>',
    'ge': '>=',
    'lt': '<',
    'le': '<='
}

function odataValueToKnex (odataVal) {
	// string literal, integer, or float (float catches int)
	// TODO: anything else?
	if (odataVal.startsWith("'") && odataVal.endsWith("'")) {
		return odataVal.substring(1, odataVal.length-1)
	} else if (parseFloat(odataVal, 10)) {
		return parseFloat(odataVal, 10)
	}
}

function getClauseForQuery (query, filterString) {
	const indexOfQuery = filterString.indexOf(query)
	const testAndIndex = indexOfQuery - 4
	const testOrIndex = indexOfQuery - 3
	let clause
	if (filterString.substring(testAndIndex, indexOfQuery) === 'and ') {
		clause = 'and'
	} else if (filterString.substring(testOrIndex, indexOfQuery) === 'or ') {
		clause = 'or'
	} else {
		clause = 'initial'
	}
	return clause
}

function parseQuerySegment (query, filterString) {
    const segments = query.split(' ')
    const operator = odataToKnex[segments[1]]
    if (!operator) {
        throw new Error(`${operator} is not a valid operator`)
    }
	return {
		clause: getClauseForQuery(query, filterString),
		column: segments[0],
		operator,
		value: odataValueToKnex(segments[2])
	}
}

module.exports = function filterStringToQueryBuilder(filterString) {
	return function (qb) {
		filterString
			.split(/ and | or /g)
			.map(q => parseQuerySegment(q, filterString))
			.forEach(q => {
				switch (q.clause) {
					case 'initial':
						qb.where(q.column, q.operator, q.value)
						break
					case 'and':
						qb.andWhere(q.column, q.operator, q.value)
						break
					case 'or':
						qb.orWhere(q.column, q.operator, q.value)
						break
				}
			})
	}
}
export default function searchQuerySet (searchName, options) {
  return Search[searchName](options).fetchAll()
  .then(({ length, models }) => {
    const items = models

    const total = models.length > 0
      ? Number(models[0].get('total'))
      : 0
    return {
      total,
      items,
      hasMore: options.offset + options.limit < total
    }
  })
}

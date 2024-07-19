import HasSettings from './mixins/HasSettings'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_widgets',

  name: async function () {
    if (this.get('name')) {
      return this.get('name')
    }
    if (this.relations.widget) {
      return this.relations.widget.name
    }
    const w = await this.widget().fetch()
    return w ? w.get('name') : null
  },

  group: function () {
    return this.belongsTo(Group)
  },

  widget: function () {
    return this.belongsTo(Widget)
  }
}, HasSettings), {

  createDefaultWidgetsForGroup: async function(group_id) {
    const widgets = await Widget.fetchAll()
    for (let i = 0; i < this.widgets.length; i++) {
      const widget_id = widgets[i].id
      await this.create({ group_id, widget_id, order: widget_id })
    }
  },

  create: async function (params, opts) {
    const { group_id, widget_id, order, context } = params

    const attributes = {
      group_id,
      widget_id,
      order,
      context,
      created_at: new Date()
    }

    const groupWidget = await this.forge(attributes).save({}, opts)
    return groupWidget
  },

  update: async function (id, changes = {}) {
    const gw = await GroupWidget.where({ id }).fetch()
    return gw.save(changes)
  }
})

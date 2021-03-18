import HasSettings from './mixins/HasSettings'

module.exports = bookshelf.Model.extend(Object.assign({
  tableName: 'group_widgets',

  group: function () {
    return this.belongsTo(Group)
  },

  widget: function () {
    return this.belongsTo(Widget)
  }
}, HasSettings), {

  getVisibility: function(id) {
    return GroupWidget.query().where({ id }).then((gw = []) => gw[0].is_visible)
  },

  getOrder: function(id) {
    return GroupWidget.query().where({ id }).then((gw = []) => gw[0].order)
  },

  getSettings: async function(id) {
    const widget = await GroupWidget.query().where({ id })
    return widget[0].settings
  },

  createDefaultWidgetsForGroup: async function(group_id) {
    const widgets = await Widget.fetchAll()
    for (let i = 0; i < this.widgets.length; i++) {
      const widget_id = widgets[i].id
      await this.create({ group_id, widget_id, order: widget_id })
    }
  },

  create: async function (params) {
    const { group_id, widget_id, order } = params

    const attributes = {
      group_id,
      widget_id,
      order,
      created_at: new Date()
    }

    const groupWidget = await this.forge(attributes).save()

    return groupWidget
  },

  updateSettings: async function (id, settings = {}) {
    return await GroupWidget.where({ id }).query().update({ settings })
  },
  
  toggleVisibility: async function(id, is_visible = true) {
    return await GroupWidget.where({ id }).query().update({ is_visible: !is_visible })
  }
})

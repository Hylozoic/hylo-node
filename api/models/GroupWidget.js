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

  createDefaultWidgetsForGroup: async function(group_id) {
    const widgets = await Widget.fetchAll()
    for (let i = 0; i < this.widgets.length; i++) {
      const widget_id = widgets[i].id
      await this.create({ group_id, widget_id, order: widget_id })
    }
  },

  create: async function (params) {
    // Will need to account for when people try to add a widget that already exists 
    // in that case, just mark is_active as true
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

  update: async function () {
    //TODO: fill in this function
  },
  
  toggleVisibility: async function(id, is_visible = true) {
    return await GroupWidget.where({ id }).query().update({ is_visible: !is_visible })
  }
})

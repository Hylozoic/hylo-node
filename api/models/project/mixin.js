export default {
  isProject () {
    return this.get('type') === Post.Type.PROJECT
  }
}

// just load models if they're not already loaded
import { init } from '../../api/models'
before(() => global.bookshelf || init())

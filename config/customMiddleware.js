import { createRequestHandler } from '../api/graphql'
import bodyParser from 'body-parser'
import kue from 'kue'
import kueUI from 'kue-ui'
import isAdmin from '../api/policies/isAdmin'
import accessTokenAuth from '../api/policies/accessTokenAuth'
import cors from 'cors'
import { cors as corsConfig } from './cors'

export default function (app) {
  app.use(bodyParser.urlencoded({extended: true}))
  app.use(bodyParser.json())

  kueUI.setup({
    apiURL: '/admin/kue/api',
    baseURL: '/admin/kue'
  })

  app.use('/admin/kue', isAdmin)
  app.use('/admin/kue/api', kue.app)
  app.use('/admin/kue', kueUI.app)

  app.use('/noo/graphql', cors({
    origin: '*',
    methods: 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
    credentials: true
  }))
  app.use('/noo/graphql', accessTokenAuth)
  app.use('/noo/graphql', createRequestHandler())
}

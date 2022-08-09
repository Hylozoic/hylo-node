import uuid from 'node-uuid'
import { Client } from 'peekalink'
import { createClient } from 'redis'

const peekalinkClient = new Client({ apiKey: process.env.PEEKALINK_API_KEY })
const redisClient = createClient({ database: 1 })

/* 
  type LinkPreview {
    id: ID
    url: String
    imageUrl: String
    title: String
    description: String
    imageWidth: String
    imageHeight: String
    status: String
  }
*/

export default async function findOrCreateByUrl (url) {
  await redisClient.connect().catch(error => {})

  let preview

  const cachedResultRaw = await redisClient.get(url)

  if (cachedResultRaw) {
    preview = JSON.parse(cachedResultRaw)
  } else {
    // const isAvailable = await peekalinkClient.isAvailable(url)

    // console.log('!!! isAvailable', isAvailable)

    // if (!isAvailable) return {}

    preview = await peekalinkClient.preview(url)
  
    if (preview) {
      const now = new Date()
      const nextUpdate = new Date(preview.nextUpdate)
      const expiry = Math.round((nextUpdate.getTime() - now.getTime()) / 1000)

      await redisClient.set(url, JSON.stringify(preview), { EX: expiry })
    }
  }

  if (!preview) return {}

  return {
    id: uuid.v4(),
    url: preview.url,
    image_url: preview.image && preview.image.url,
    title: preview.title,
    description: preview.description,
    image_width: preview.image && preview.image.width,
    image_height: preview.image && preview.image.height,
  }
}

// Original function
// export default function findOrCreateByUrl (url) {
//   return LinkPreview.find(url).then(preview => {
//     if (!preview) return LinkPreview.queue(url)
//     if (!preview.get('done')) return
//     return preview
//   })
// }
  // redisClient.flushDb('ASYNC')

  // const isAvailable = await peekalinkClient.isAvailable(url)
  // console.log('!!! isAvailable', isAvailable)
  // if (!isAvailable) return {}

// Peekalink sample `preview` response
// {
//   "url": "https://bit.ly/3frD2OP",
//   "domain": "bit.ly",
//   "lastUpdated": "2020-11-23T16:55:51.648662Z",
//   "nextUpdate": "2020-11-24T16:55:51.615769Z",
//   "contentType": "html",
//   "mimeType": "text/html",
//   "redirected": true,
//   "redirectionUrl": "https://www.youtube.com/watch?feature=youtu.be&v=dQw4w9WgXcQ",
//   "redirectionCount": 2,
//   "redirectionTrail": [
//     "https://youtu.be/dQw4w9WgXcQ",
//     "https://www.youtube.com/watch?feature=youtu.be&v=dQw4w9WgXcQ"
//   ],
//   "title": "Rick Astley - Never Gonna Give You Up (Video)",
//   "description": "Rick Astley's official music video for “Never Gonna Give You Up” \nListen to Rick Astley: https://RickAstley.lnk.to/_listenYD\n\nSubscribe to the official Rick Astley YouTube channel: https://RickAstley.lnk.to/subscribeYD\n\nFollow Rick Astley:\nFacebook: ht..",
//   "name": "RickAstleyVEVO in YouTube",
//   "trackersDetected": true,
//   "icon": {
//     "url": "https://cdn.peekalink.io/public/images/e54bc7cf-047a-413a-b707-14626e9094e0/19f0e08e-d03b-4edf-9bf1-9c2ea72b7536.jpg",
//     "width": 144,
//     "height": 144
//   },
//   "image": {
//     "url": "https://cdn.peekalink.io/public/images/7b4c43dd-05ee-47b7-937f-a4b65c9bf7ea/44a88bb2-8990-4530-836a-4c746f00e4e9.jpe",
//     "width": 640,
//     "height": 480
//   },
//   "details": {
//     "type": "youtube",
//     "videoId": "dQw4w9WgXcQ",
//     "duration": "213.0",
//     "viewCount": 787905032,
//     "likeCount": 7200677,
//     "dislikeCount": 228169,
//     "commentCount": 1162359,
//     "publishedAt": "2009-10-25T06:57:33Z"
//   }
// }
import { createClient } from 'redis'

module.exports = {
  create: async function () {
    const client = createClient(process.env.REDIS_URL)
    client.on('error', (err) => console.log('Redis Client Error', err));
    await client.connect();
    return client
  }
}

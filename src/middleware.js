// const { request, response } = require('express')
const redisClient = require('./redis')

const limit = {
  ip: {
    time: 60,
    count: 10
  },
  user: {
    time: 60,
    count: 5
  }
}

const rateLimiter = async (request, response, next) => {
  const redisKeyIP = `data/${request.ip}`
  const redisKeyUser = `data/${request.query.user}`

  const redisReqIp = await redisClient.incr(redisKeyIP)
  if (redisReqIp === 1) {
    await redisClient.expire(redisKeyIP, limit.ip.time)
  }

  const redisReqUser = await redisClient.incr(redisKeyUser)
  if (redisReqUser === 1) {
    await redisClient.expire(redisKeyUser, limit.user.time)
  }

  if (redisReqIp > limit.ip.count || redisReqUser > limit.user.count) {
    return response.status(429).send({
      ip: redisReqIp,
      id: redisReqUser
    })
  }

  next()
}

module.exports = rateLimiter
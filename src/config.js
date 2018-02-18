
'use strict'

const dotenv = require('dotenv')
const ENV = process.env.NODE_ENV || 'development'

if (ENV === 'development') dotenv.load()

const config = {
  ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  PROXY_URI: process.env.PROXY_URI,
  WEBHOOK_URL: process.env.WEBHOOK_URL,
  NEXMO_API_KEY: process.env.NEXMO_API_KEY,
  NEXMO_API_SECRET: process.env.NEXMO_API_SECRET,
  MONGODB_URL: process.env.MONGODB_URI,
  MONGODB_NAME: process.env.MONGODB_NAME,
  SMS_SENDER_NUMBER: process.env.SMS_SENDER_NUMBER
}

module.exports = (key) => {
  if (!key) return config

  return config[key]
}

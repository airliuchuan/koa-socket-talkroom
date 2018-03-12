const path = require('path')
const env = process.env.NODE_ENV || 'production'

let filepath = path.join(__dirname, env)
try {
  module.exports = require(filepath)
  console.log('加载的是[%s]配置', env)
} catch (err) {
  console.error(err)
}
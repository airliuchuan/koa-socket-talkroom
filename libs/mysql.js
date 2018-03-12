const mysql = require('mysql')
const configDB = require('../config').database
const pool = mysql.createPool({
  host: configDB.HOST,
  user: configDB.USER,
  password: configDB.PASSWORD,
  database: configDB.DATABASE
})

let query = (sql, values) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((error, connect) => {
      connect.query(sql, values, (err, data) => {
        if(err) reject(err)
        else resolve(data)
        connect.release()
      })
    })
  })
}

let user_table = `create table if not exists user_table(
  id INT NOT NULL AUTO_INCREMENT,
  user VARCHAR(40) NOT NULL,
  pass VARCHAR(40) NOT NULL,
  socketid VARCHAR(100) NOT NULL,
  online INT NOT NULL DEFAULT '0',
  PRIMARY KEY(id)
);`

let createTable = sql => {
  return query(sql, [])
}

createTable(user_table)

// 封装操作数据库函数
// 添加用户
let insertUser = values => {
  let _sql = 'insert into user_table set user=?,pass=?,socketid=?'
  return query(_sql, values)
}
// 根据名字查找用户
let findUserByUser = user => {
  let _sql = `select * from user_table where user='${user}'`
  return query(_sql)
}
// 根据在线状态查找用户
let findUserByOnline = online => {
  let _sql = `select * from user_table where online=${online}`
  return query(_sql)
}
// 更新在线状态
let updateOnline = values => {
  let _sql = 'update user_table set online=? where user=?'
  return query(_sql, values)
}
module.exports = {
  query,
  insertUser,
  findUserByUser,
  updateOnline,
  findUserByOnline
}
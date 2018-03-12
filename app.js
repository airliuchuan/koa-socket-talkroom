const koa = require('koa')
const path = require('path')
const static = require('koa-static')
const session = require('koa-session-minimal')
const MysqlStore = require('koa-mysql-session')
const socketio = require('socket.io')
const config = require('./config')
const mysqlModel = require('./libs/mysql')

const app = new koa()

const mysqlStore = new MysqlStore({
  host: config.database.HOST,
  user: config.database.USER,
  password: config.database.PASSWORD,
  database: config.database.DATABASE
})
app.use(session({
  key: 'USER_ID',
  store: mysqlStore,
  cookie: {
     maxAge: 60*60*1000
  }
}))
app.use(static(path.join(__dirname, './static')))


const server = require('http').Server(app.callback())
const io = socketio(server)
server.listen(config.port)

let aSocket = []
io.on('connection', socket => {
  // 储存socketid
  const socketId = socket.id

  // 注册
  socket.on('signup',async data => {
    let {user, pass, rePass} = data
    let socketid = socketId
    // console.log(socketId)
    if(!user || !pass || !rePass) {
      socket.emit('signup_re', {code:1, msg: '内容不能为空'})
    } else if(!/^([A-Za-z]|[\u4E00-\u9FA5])+$/.test(user)) {
      socket.emit('signup_re', {code:1, msg: '用户名只能是字母和汉子'})
    } else if(!/(?!^\d+$)(?!^[a-zA-Z]+$)[0-9a-zA-Z]{5,12}/.test(pass)) {
      socket.emit('signup_re', {code:1, msg: '密码为6-12位的数字和字母'})
    } else if (pass !== rePass) {
      socket.emit('signup_re', {code:1, msg: '两次输入的密码不一致'})
    } else {
      await mysqlModel.findUserByUser(user)
        .then(async (data, err) => {
          if(err) {
            console.error(err)
            socket.emit('signup_re', {code:1, msg: '查询用户失败'})
            return
          }
          if(data.length) {
            socket.emit('signup_re', {code:1, msg: '用户已存在'})
            return
          }
          await mysqlModel.insertUser([user, pass, socketid])
            .then((data, err) => {
              if(err) {
                console.error(err)
                socket.emit('signup_re', {code:1, msg: '添加用户失败'})
                return
              }
              socket.emit('signup_re', {code:0, msg: '注册成功'})
            })
        })
    }
  })
  // 登录
  socket.on('login', async data => {
    // console.log(data)
    let {user, pass} = data
    if(!user || !pass) {
      socket.emit('login_re', {code: 1, msg: '用户名和密码不存在'})
      return
    } 
    await mysqlModel.findUserByUser(user)
      .then(async (data, err) => {
        if(err) {
          console.error(err)
          socket.emit('login_re', {code: 1, msg: '查询用户报错'})
          return
        }
        if(!data.length) {
          socket.emit('login_re', {code: 1, msg: '用户名或密码输入错误'})
          return
        } 
        if(pass !== data[0].pass) {
          socket.emit('login_re', {code: 1, msg: '密码输入错误'})
          return
        }
       
        await mysqlModel.updateOnline([1, data[0].user])
          .then((data, err) => {
            if(err) {
              socket.emit('login_re', {code: 1, msg: '更改在线状态失败'})
            }
            
          })
        socket.username = user
        socket.emit('login_re', {code: 0, msg: '登录成功', user: data[0]})
      })
      aSocket.push(socket)
  })
 
  // 发送群体消息
  socket.on('msgAll', msg => {
    if(!msg) socket.emit('msg_re', {code: 1, msg: '发送的内容不能为空'})
    socket.broadcast.emit('msgAll', {
      user: socket.username,
      msg
    })
    socket.emit('msg_re', {code: 0, msg: '发送成功'})
  })
  socket.on('disconnect', () => {
    mysqlModel.updateOnline([0, socket.username])
      .then((data, err) => {
        if(err) {
          console.error(err)
          return 
        }
        socket.broadcast.emit('userLeft', {username: socket.username})
        aSocket.filter(item => item !== socket)
      })
   
  })
})
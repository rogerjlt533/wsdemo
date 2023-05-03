const WebSocket = require('ws')

const server = new WebSocket.Server({host: 'localhost', port: 8080}, () => {
    console.log('server start!')
})

server.on('connection', (client) => {
    console.log('连接成功！')
    client.send('PING')
    console.log('PING')
    // 接收用户数据
    client.on('message', (msg) => {
        console.log(msg.data)
        // 服务端发送数据
        client.send("ping")
    })
    client.on('close', () => {
        console.log('closed!')
    })
})


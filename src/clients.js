const client = require('./client')

const url = 'ws://81.70.219.124:4379'

function receiveMessage(event) {
    console.log("Client received a message:" + event.data)
    const {type} = JSON.parse(event.data)
    if (type === 'ping') {
        event.target.getClient().send(JSON.stringify({type:"pong"}))
    }
    // console.log(event.target.getClient())
    // event.target.getClient().send("hello")
}

const socket = new client.Socket(url, receiveMessage)
// setInterval(function () {
//     console.log("heart")
//     socket.send("10000")
// }, 3000)
// console.log(socket.getContainer())

// client.init(url, receiveMessage)
// client.connect()
//
// setInterval(function () {
//     if (client.need_reconnect) {
//         console.log(new Date())
//         client.need_reconnect = false
//         client.connect()
//     }
// }, 1000)
// client.send("ping")
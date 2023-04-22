const client = require('./client')

const url = 'ws://localhost:8080'

function receiveMessage(event) {
    console.log("Client received a message:" + event.data)
    // console.log(event.target.getClient())
    event.target.getClient().send("hello")
}

const socket = new client.Socket(url, receiveMessage)
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
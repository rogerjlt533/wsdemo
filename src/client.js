const WebSocket = require('ws')

class Socket {
    constructor(url, msgFunc) {
        this.url = url
        this.msgFunc = msgFunc
        this.client = this
        this.connection = null
        this.connect()
    }
    connect() {
        this.connection = new WebSocket(this.url)
        this.connection.getClient = () => {
            return this.client
        }
        this.connection.onopen = () => {
            console.log("Connection to server opened")
        }
        this.connection.onmessage = (event) => {
            this.msgFunc(event)
        }
        this.connection.onclose = (event) => {
            console.log("ready to reconnect!")
            setTimeout(function () {
                event.target.getClient().connect()
            }, 2000)
        }
        this.connection.onerror = (event) => {
            console.log(event.message)
        }
    }
    send(message) {
        this.connection.send(message)
    }
}

module.exports={Socket};
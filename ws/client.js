const WebSocket = require('ws')
const md5 = require('blueimp-md5')
const common = require('../tool/common')

class Socket {
    init(url, hk, msgFunc, lastFunc) {
        this.url = url
        this.msgFunc = msgFunc
        this.lastFunc = lastFunc
        this.client_id = ''
        this.client = this
        this.connection = null
        this.connect_state = false
        this.remove_collection_processing = false
        this.pull_collection_processing = false
        this.note_log_processing = false
        this.push_collection_processing = false
        this.push_note_processing = false
        this.hk = hk
        this.user_id = common.decodeDesktop(hk)
        this.request_state = true
        this.init_collection_list = []
        this.connect()
    }
    bind() {
        this.send(JSON.stringify({type: 'bind', hk: this.hk, last: this.lastFunc(this.hk)}))
    }
    connect() {
        this.connection = new WebSocket(this.url)
        this.connection.getClient = () => {
            return this.client
        }
        this.connection.getConnectState = () => {
            return this.connect_state
        }
        this.connection.onopen = () => {
            this.connect_state = true
            console.log("Connection to server opened")
            this.bind()
        }
        this.connection.onmessage = (event) => {
            this.msgFunc(event)
        }
        this.connection.onclose = (event) => {
            this.connect_state = false
            this.remove_collection_processing = false
            this.pull_collection_processing = false
            this.note_log_processing = false
            this.push_collection_processing = false
            this.push_note_processing = false
            this.client_id = ''
            this.init_collection_list = []
            if (this.request_state) {
                console.log("ready to reconnect!")
                setTimeout(function () {
                    event.target.getClient().connect()
                }, 2000)
            }
        }
        this.connection.onerror = (event) => {
            console.log(event.message)
        }
    }
    close() {
        socket.connection.close()
        this.connect_state = false
        this.remove_collection_processing = false
        this.pull_collection_processing = false
        this.note_log_processing = false
        this.push_collection_processing = false
        this.push_note_processing = false
        this.client_id = ''
        this.request_state = false
        this.init_collection_list = []
    }
    verifySign(time, sign) {
        const hash = md5(this.client_id + this.hk + time)
        if (hash !== sign) {
            return false
        }
        return true
    }
    send(message) {
        console.log("send:" + message)
        this.connection.send(message)
    }
}

module.exports={Socket};
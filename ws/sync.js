const client = require('./client')
const common = require('../tool/common')
const service = require('./service')
const collectionComponent = require('./component/collection')

const sync_socket = new client.Socket

exports.initConnect = function (url, hk) {
    if (sync_socket.connect_state) {
        sync_socket.close()
    }
    sync_socket.init(url, hk, receiveMessage, service.getLastLog)
}

function processBind(socket, message) {
    // console.log(JSON.stringify(message))
    if (message.data.code === 200) {
        socket.send(JSON.stringify({type: "request", act: "all", version: 'v1'}))
        socket.send(JSON.stringify({type: "request", act: "all_collection", version: 'v1'}))
    }
}

function processRemotePushEvent(socket, message) {
    // 服务器主动推送笔记log
    // {
    //     "log_id": 1,
    //     "note_id": 279,
    //     "action": 2,
    //     "collection_id": 3,
    //     "collection_hash": "183ff848b55e1076214eb373f530b4b9"
    // }
    const list = message.data.data
    if (message.data?.cond === 'note_changes') {
        const collection_list = {}
        list.forEach(item => {
            if (!collection_list.hasOwnProperty(item.id)) {
                console.log("processRemotePushEvent:" + JSON.stringify(item))
                collection_list[item.id] = item
                service.addDownloadCollectionTask(socket.user_id, item)
            }
            service.processDownloadNoteLogItem(socket, item)
        })
    } else if (message.data?.cond === 'default_collection') {
        // 添加标记默认笔记本任务
        service.syncComponent.createDefaultCollectionTask(socket.user_id, message.data.data.default)
    }
    // console.log(list)
}

function processAllNoteLogEvent(socket, message) {
    // 主动获取全部笔记最新线上log
    // {
    //     "log_id": 1,
    //     "note_id": 279,
    //     "action": 2,
    //     "collection_id": 3,
    //     "collection_hash": "183ff848b55e1076214eb373f530b4b9"
    // }
    const list = message.data.data
    const collection_list = {}
    list.forEach(item => {
        if (!collection_list.hasOwnProperty(item.id)) {
            console.log("processAllNoteLogEvent:" + JSON.stringify(item))
            collection_list[item.id] = item
            service.addDownloadCollectionTask(socket.user_id, item)
        }
        service.processDownloadNoteLogItem(socket, item)
    })

}

function processCollection(socket, item) {
    // 处理笔记本
    // {
    //     "id": 3,
    //     "name": "我的目标",
    //     "owner": {
    //     "owner_id": 3,
    //         "owner_name": "fallen",
    //         "owner_image": "https://stor.fang-cun.net/storage/upload/users/6d86/1629963677CjguH5PChI.png"
    //      },
    //     "member_list": [],
    //     "note_limit": 300,
    //     "color": "#AA2116",
    //     "share_state": 0,
    //     "created_time": "2021-08-26 15:41:21",
    //     "deleted_time": "",
    //     "is_delete": "0"
    // }
    if (socket.init_collection_list.indexOf(item.id) === -1) {
        socket.send(JSON.stringify({type: "request", act: "collection_note_ids", version: 'v1', param: {collection_id: item.id}}))
        socket.init_collection_list.push(item.id)
    }
    // console.log(item)
    let hash_code = item?.hash
    if (common.empty(hash_code)) {
        const user_id = common.list_column(item.member_list, 'user_id').sort((a,b)=>{return parseInt(a)-parseInt(b)})
        user_id.forEach(user_item => {
            user_item = user_item.toString()
        })
        hash_code = collectionComponent.createCollectionHash(item.name, item.owner.owner_id, user_id, item.note_limit, item.color, item.share_state, item.is_delete, item.sort, item.remark)
    }
    service.syncComponent.createDownloadCollectionTask(item.id, socket.user_id, JSON.stringify(item), hash_code)
}

function processAllCollectionEvent(socket, message) {
    // 主动拉取全部Collection
    if (message?.version !== 'v1') {
        return false;
    }
    let mine_collections = collectionComponent.userJoinList(socket.user_id)
    console.log(mine_collections)
    message.data.data.forEach(item => {
        processCollection(socket, item)
        mine_collections = mine_collections.filter(my_item => my_item !== item.id)
    })
    mine_collections.forEach(remote_id => {
        // service.removeCollection(socket.user_id, remote_id)
        service.syncComponent.createRemoveCollectionTask(remote_id, socket.user_id, null, null)
    })
}

function processCollectionNoteIdsEvent(socket, message) {
    // 主动拉取Collection对应全部笔记ids（包含非正常状态笔记）
    if (message?.version !== 'v1') {
        return false;
    }
    const collection_id = message.data.data?.collection_id
    const collection_hash = message.data.data?.collection_hash
    const logs = message.data.data?.logs
    logs.forEach(log => {
        log.collection_id = collection_id
        log.collection_hash = collection_hash
        service.processDownloadNoteLogItem(socket, log)
    })
}

function processCollectionInfoEvent(socket, message) {
    // 主动拉取Collection Info
    if (message?.version !== 'v1') {
        return false;
    }
    // {
    //     "id": 3,
    //     "name": "我的目标",
    //     "owner": {
    //     "owner_id": 3,
    //         "owner_name": "fallen",
    //         "owner_image": "https://stor.fang-cun.net/storage/upload/users/6d86/1629963677CjguH5PChI.png"
    //      },
    //     "member_list": [],
    //     "note_limit": 300,
    //     "color": "#AA2116",
    //     "share_state": 0,
    //     "created_time": "2021-08-26 15:41:21",
    //     "deleted_time": "",
    //     "hash": "43b715f8977562500cb2a9b95616d677",
    //     "is_delete": "0"
    // }
    processCollection(socket, message.data?.data)
}

function receiveMessage(event) {
    try {
        const socket = event.target.getClient()
        const message = JSON.parse(event.data)
        if (message?.type === 'init') {
            socket.client_id = message.client_id
        } else if (message?.type === 'ping') {
            socket.send(JSON.stringify({type:"pong"}))
        } else if (message?.type === 'bind') {
            processBind(socket, message)
        } else if (message?.type === 'response') {
            const timestamp = message.timestamp
            const sign = message.sign
            if (!socket.verifySign(timestamp, sign)) {
                console.log('签名验证失败')
            } else if (message.data.code === 200) {
                if (message.data.act === 'push') {
                    // 服务器主动推送笔记log
                    processRemotePushEvent(socket, message)
                } else if (message.data.act === 'all') {
                    // 主动获取全部笔记最新线上log
                    processAllNoteLogEvent(socket, message)
                } else if (message.data.act === 'all_collection') {
                    // 主动拉取全部Collection
                    processAllCollectionEvent(socket, message)
                } else if (message.data.act === 'collection_note_ids') {
                    // 主动拉取Collection对应全部笔记ids（包含非正常状态笔记）
                    processCollectionNoteIdsEvent(socket, message)
                } else if (message.data.act === 'collection_info') {
                    // 主动拉取Collection Info
                    processCollectionInfoEvent(socket, message)
                }
            } else {
                console.log(JSON.stringify(message))
            }
        }
    } catch (e) {
        console.log(e.message)
        console.log(e)
    }
}

// 自动定时更新
setInterval(function () {
    // 自动更新下行collection
    if (!sync_socket.pull_collection_processing && sync_socket.connect_state) {
        service.processDownloadCollection(sync_socket)
    }
}, 500)
// setInterval(function () {
//     // 自动执行上行collection
//     if (!sync_socket.push_collection_processing && sync_socket.connect_state) {
//         service.processUploadCollection(sync_socket)
//     }
// }, 500)
setInterval(function () {
    // 自动执行删除collection
    if (!sync_socket.remove_collection_processing && sync_socket.connect_state) {
        service.processDeleteCollection(sync_socket)
    }
}, 500)
setInterval(function () {
    // 自动更新下行note
    if (!sync_socket.note_log_processing && sync_socket.connect_state) {
        service.processDownloadNoteQueue(sync_socket)
    }
}, 500)
// setInterval(function () {
//     // 自动执行上行note
//     if (!sync_socket.push_note_processing && sync_socket.connect_state) {
//         service.processUploadNote(sync_socket)
//     }
// }, 500)

this.initConnect('ws://81.70.219.124:4379', 'W9BL')




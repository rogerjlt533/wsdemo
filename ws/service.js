const common = require('../tool/common')
const logSqliteTool = require('../tool/logsqlitetool')
const transformComponent = require('./component/transform')
const collectionComponent = require('./component/collection')
const syncComponent = require('./component/sync')
const userComponent = require('./component/user')
const noteComponent = require('./component/note')
const noteLogComponent = require('./component/notelog')
const downloadNoteProvider = require('../sync/downloadnote')
const syncService = require('../service/sync')

exports.syncComponent = syncComponent
exports.collectionComponent = collectionComponent
exports.transformComponent = transformComponent
exports.userComponent = userComponent
exports.noteComponent = noteComponent
exports.noteLogComponent = noteLogComponent

/**
 * 初始化笔记本
 * @param user_id
 * @param collection_info
 * @param collection_hash
 */
exports.initCollection = function (user_id, collection_info, collection_hash) {
    const collection_id = collection_info.id
    const name = collection_info.name
    console.log(JSON.stringify({name, collection_id, collection_hash}))
    transformComponent.initCollection(user_id, collection_info.id, collection_info, collection_hash)
}

/**
 * 删除笔记本
 * @param user_id
 * @param collection_id
 */
exports.removeCollection = function (user_id, collection_id) {
    const collection = collectionComponent.getRemote(collection_id)
    if (!common.empty(collection)) {
        collectionComponent.removeCollection(collection.id)
        collectionComponent.unjoin(collection.id, [user_id])
    }
}

/**
 * 匹配笔记本
 * @param collection_id
 * @param collection_hash
 */
exports.matchCollection = function (collection_id, collection_hash) {
    let match_status = false
    const collection_record = collectionComponent.getRemote(collection_id)
    if (common.empty(collection_record)) {
        return {collection_record, match_status}
    }
    if (collection_record.collection_hash === collection_hash) {
        match_status = true
    }
    return {collection_record, match_status}
}

/**
 * 推入日志队列
 * @param socket
 * @param collection_id
 * @param collection_hash
 * @param log_info
 */
exports.pushNoteLogQueue = function (socket, collection_id, collection_hash, log_info) {
    const {collection_record, match_status} = this.matchCollection(collection_id, collection_hash)
    if (!match_status) {
        socket.send(JSON.stringify({type: "request", act: "collection_info", version: 'v1', param: {collection_id}}))
    }
    // TODO: 推入日志队列
}

exports.processDownloadCollection = function (socket) {
    console.log("processing pull collection!")
    try {
        socket.pull_collection_processing = true
        const default_sync = syncComponent.getUserCollectionTask(socket.user_id, 1, 99)
        if (!common.empty(default_sync)) {
            const collection = collectionComponent.getRemote(default_sync.collection_id)
            if (!common.empty(collection)) {
                userComponent.setUserDefault(socket.user_id, collection.id)
            }
            syncComponent.removeCollectionTask(default_sync.id)
        }
        const pull_list = syncComponent.getCollectionTaskList(socket.user_id, 1, 1)
        pull_list.forEach(item => {
            if (!common.empty(item.pull_info)) {
                const collection_info = JSON.parse(item.pull_info)
                if (parseInt(collection_info.is_delete) === 1) {
                    this.removeCollection(socket.user_id, collection_info.id)
                    // syncComponent.createRemoveCollectionTask(item.collection_id, item.user_id, item.pull_info, item.hash_code)
                } else {
                    this.initCollection(socket.user_id, collection_info, item.hash_code)
                }
                syncComponent.removeCollectionTask(item.id)
            } else {
                socket.send(JSON.stringify({type: "request", act: "collection_info", version: 'v1', param: {collection_id: item.collection_id}}))
            }
        })
        socket.pull_collection_processing = false
    } catch (e) {
        socket.pull_collection_processing = false
    }
}

exports.processUploadCollection = function (socket) {
    // 获取待上传笔记队列
    console.log("processing collection upload!")
    try {
        socket.push_collection_processing = true
        // 获取本地同步日志，有collection上传队列，
        setTimeout(function () {
            socket.push_collection_processing = false
        }, 4000)
    } catch (e) {
        socket.push_collection_processing = false
    }
}

exports.processDeleteCollection = function (socket) {
    console.log("processing collection delete!")
    try {
        socket.remove_collection_processing = true
        const list = syncComponent.getCollectionTaskList(socket.user_id, 1, 3)
        list.forEach(item => {
            const collection = collectionComponent.getRemote(item.collection_id)
            if (!common.empty(collection)) {
                syncService.processRemoteDeleted(collection.id)
            }
            syncComponent.removeCollectionTask(item.id)
        })
        socket.remove_collection_processing = false
    } catch (e) {
        socket.remove_collection_processing = false
    }
}

/**
 * 处理笔记下行队列
 * @param socket
 */
exports.processDownloadNoteQueue = function (socket) {
    console.log("processing note download queue!")
    try {
        socket.note_log_processing = true
        downloadNoteProvider.run(socket)
    } catch (e) {
        socket.note_log_processing = false
    }
}

exports.processUploadNote = function (socket) {
    // 获取待上传笔记队列
    console.log("processing note upload queue!")
    try {
        socket.push_note_processing = true
        // 1、获取本地collection,collectionTool.getNoStatus方法，
        // 如果collection无remote_id调用插入到collection同步队列，暂不进行该note的同步
        setTimeout(function () {
            socket.push_note_processing = false
        }, 4000)
    } catch (e) {
        socket.push_note_processing = false
    }
}

/**
 * 获取最后的log_id
 * @param hk
 * @returns {number}
 */
exports.getLastLog = function (hk) {
    const user_id = common.decodeDesktop(hk)
    const sql = 'select MAX(remote_id) as last_id from speed_note_log where user_id=? and sync_at is not null'
    const record = logSqliteTool.get(sql, [user_id])
    if (common.empty(record)) {
        return 0
    }
    return common.empty(record.last_id) ? 0 : record.last_id
}

exports.processDownloadNoteLogItem = function (socket, item) {
    // {
    //     "log_id": 1,
    //     "note_id": 279,
    //     "action": 2,
    //     "collection_id": 3,
    //     "collection_hash": "183ff848b55e1076214eb373f530b4b9"
    // }
    let need_sync_note = false
    const remote_id = item.log_id
    const user_id = socket.user_id
    const collection_id = item?.collection_id
    const note_id = item.note_id
    const action = item.action
    const collection_code = item?.collection_hash
    const record = noteLogComponent.getRemote(remote_id, user_id)
    if (common.empty(record)) {
        noteLogComponent.create(remote_id, user_id, collection_id, note_id, action, collection_code)
        need_sync_note = true
    } else if (common.empty(record.sync_at)) {
        if (parseInt(record.user_id) !== parseInt(user_id)) {
            noteLogComponent.updateUser(remote_id, user_id)
        }
        need_sync_note = true
    }
    if (need_sync_note) {
        syncComponent.createDownloadNoteTask(user_id, collection_id, note_id, 0, null, collection_code)
    }
}

exports.addDownloadCollectionTask = function (user_id, item) {
    const {collection_record, match_status} = this.matchCollection(item.collection_id, item.collection_hash)
    if (!match_status) {
        if (common.empty(collection_record)) {
            syncComponent.createDownloadCollectionTask(item.collection_id, user_id, '', item.collection_hash)
        }
    }
}


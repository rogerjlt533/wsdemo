const common = require('../tool/common')
const httpTool = require('../tool/http');
const syncComponent = require('../ws/component/sync')
const fingerService = require('../service/finger')
const noteService = require('../ws/service/note')
const noteComponent = require('../ws/component/note')
const collectionComponent = require('../ws/component/collection')
const tagComponent = require('../ws/component/tag')
const oplogComponent = require('../ws/component/oplog')
const notelogComponent = require('../ws/component/notelog')

exports.run = async function (socket) {
    try {
        const sync_list = syncComponent.getNoteTaskList(socket.user_id, 21, 1, 100)
        const note_set = {}, note_ids = []
        if (!common.empty(sync_list)) {
            sync_list.forEach(item => {
                note_ids.push(common.encode(item.note_id))
                note_set[item.note_id] = {sync: item, detail: {}}
            })
        }
        if (note_ids.length > 0) {
            const info_result = await httpTool.post(httpTool.sync_host + 'api/desktop/down_flow/note', {notes: JSON.stringify(note_ids)}, {hk: socket.hk})
            // console.log(JSON.stringify(info_result))
            if (info_result.code === 200) {
                info_result.data.forEach(item => {
                    const remote_id = common.decode(item.note.id)
                    note_set[remote_id]['detail'] = item
                })
            }
        }
        await this.processSyncList(socket, note_set)
    } catch (e) {
        console.log("下行笔记过程异常:")
        console.log(e)
    }
    // 启动下一轮遍历开关
    socket.note_log_processing = false
}

exports.processSyncList = async function (socket, note_set) {
    // console.log(JSON.stringify(note_set))
    for (const note_id in note_set) {
        try {
            const {sync, detail} = note_set[note_id]
            const local_id = await this.processSyncItem(socket, note_id, sync, detail)
            if (local_id > 0 && !common.empty(sync.postil_id)) {
                this.processDownQuotes(socket.user_id, sync.postil_id, [note_id])
            }
            if (local_id >= 0) {
                syncComponent.removeNoteTask(sync.id)
                notelogComponent.updateSyncAt(note_id, socket.user_id)
            }
        } catch (e) {
            console.log("下行笔记单条异常:")
            console.log(e)
        }
    }
}

exports.processSyncItem = async function (socket, note_id, sync, detail) {
    const collection = detail.collection
    if (common.empty(collection?.id)) {
        return 0
    }
    const collection_record = collectionComponent.getRemote(common.decode(collection?.id))
    if (common.empty(collection_record)) {
        // 本地collection未同步，同步之后再执行
        syncComponent.createDownloadCollectionTask(common.decode(collection?.id), socket.user_id, null, null)
        return -1
    }
    const info = detail.note
    if (common.empty(info?.id)) {
        return 0
    }
    info.id = common.decode(info.id)
    info.user_id = common.decode(info.user_id)
    info.last_update = common.empty(info.last_update) ? info.created_at : info.last_update
    let tag_json = detail.properties.tag_json
    const latest_log = detail.latest_log
    // if (!common.empty(latest_log)) {
    //     const last_log_id = common.decode(latest_log.log_id)
    //     const last_note_id = common.decode(latest_log.note_id)
    //     await noteLogTool.updateRemote(last_log_id, info.user_id, last_note_id, latest_log.action, latest_log.created_at, latest_log.created_at, latest_log.created_at)
    // }
    tag_json = common.empty(tag_json) ? '[]' : tag_json
    let struct_tag_json = detail.properties.struct_tag_json
    struct_tag_json = common.empty(struct_tag_json) ? '[]' : struct_tag_json
    const quotes = detail.quotes.map(item => common.decode(item.note_id))
    let record = noteComponent.remote(note_id)
    const pics = detail.pics
    for (const image of pics) {
        // 处理图片资源
        await fingerService.storeNoteRemote(info.user_id, !common.empty(record) ? record.id : 0, image.finger, image.finger.remote_create_time)
    }
    const record_id = !common.empty(record?.id) ? record?.id : 0
    const info_id = !common.empty(info?.id) ? info?.id : 0
    const params = {obj_type: 'note', obj_id: record_id, remote_id: info_id, download_value: JSON.stringify(detail), sync_urgent: 0}
    params.result_value = 1
    if (common.empty(record) && !common.empty(info.deleted_at)) {
        params.response_value = '本地不存在，远程已删除'
        oplogComponent.create(socket.user_id, 'process_note_download', 1, params)
        return 0
    }
    const save_time = common.sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    if (common.empty(record)) {
        // 本地已删除
        const trashed = noteComponent.remoteDestroyed(info.id)
        if (!common.empty(trashed) && common.empty(info.deleted_at)) {
            let exists = syncComponent.note(info.user_id, trashed.id, 21, 2)
            if (common.empty(exists)) {
                const sync_params = {note_id: trashed.id, collection_id: trashed.collection_id, note_status: trashed.status, hash_code: trashed.hash_code, deleted_time: trashed.deleted_at, sync_urgent: 0}
                syncComponent.create(info.user_id, 21, 2, sync_params)
                params.response_value = '云端未删除、本地已删除、通知云端删除'
                oplogComponent.create(socket.user_id, 'process_note_download', 1, params)
            }
            return -2
        }
        // 直接创建
        let local_id = noteComponent.storeRemote(info.id, info.user_id, collection_record.id, info.note_type, info.source, info.note, info.weight, info.url, tag_json, info.hash_md5, struct_tag_json, info.status, info.created_at, info.last_update, info.last_update)
        noteService.bindTags(info.user_id, local_id, JSON.parse(tag_json))
        if (info.note_type === 2) {
            noteService.bindStructTags(info.user_id, local_id, JSON.parse(struct_tag_json))
        }
        // 同步引用
        if (quotes.length > 0) {
            this.processDownQuotes(socket.user_id, note_id, quotes)
        }
        params.obj_id = local_id
        params.response_value = '直接创建'
        oplogComponent.create(socket.user_id, 'process_note_download', 1, params)
        return local_id
    } else if (info.hash_md5 === record.hash_code) {
        // 本地未删除、hash一致
        const cmp_status = common.compareTime(info.last_update, record.last_update)
        if (!common.empty(info.deleted_at)) {
            noteComponent.delete(record.id)
            noteComponent.removePostil(record.id)
            params.response_value = '本地未删除、hash一致、本地删除'
            oplogComponent.create(socket.user_id, 'process_note_download', 1, params)
            return 0
        } else if (cmp_status >= 0) {
            // 远程最新装进废纸篓
            if (info.status === 0) {
                noteComponent.remove(record.id, save_time)
                params.response_value = '远程最新装进废纸篓'
                oplogComponent.create(socket.user_id, 'process_note_download', 1, params)
            }
            // 更改笔记权重内容
            noteComponent.updateNoteWeightValue(record.id, info?.weight)
            let relations = tagComponent.noteTagRelations(record.id, 'id').map(item => item.id)
            const edit_relations = noteService.bindTags(info.user_id, record.id, JSON.parse(tag_json))
            // 删除失效的标签关联
            relations = relations.filter(item => {return edit_relations.indexOf(item) === -1})
            for (const item of relations) {
                tagComponent.unbindNote(item)
            }
            if (info.note_type === 2) {
                tagComponent.clearNoteTagNode(record.id)
                noteService.bindStructTags(info.user_id, record.id, JSON.parse(struct_tag_json))
            }
            if (quotes.length > 0) {
                this.processDownQuotes(socket.user_id, note_id, quotes)
            }
            params.response_value = '本地未删除、hash一致，正常更新'
            oplogComponent.create(socket.user_id, 'process_note_download', 1, params)
            return info.status > 0 ? record.id : 0
        }
        return 0
    } else {
        // 本地未删除、hash不一致
        const cmp_status = common.compareTime(info.last_update, record.last_update)
        if (cmp_status >= 0) {
            if (!common.empty(info.deleted_at)) {
                // 远程删除最新
                noteComponent.delete(record.id)
                noteComponent.removePostil(record.id)
                params.response_value = '远程删除最新'
                oplogComponent.create(socket.user_id, 'process_note_download', 1, params)
                return 0
            } else {
                //直接覆盖
                noteComponent.storeRemote(info.id, info.user_id, collection_record.id, info.note_type, info.source, info.note, info.weight, info.url, tag_json, info.hash_md5, struct_tag_json, info.status, info.created_at, info.last_update, info.last_update)
                let relations = tagComponent.noteTagRelations(record.id, 'id')
                relations = common.list_column(relations, 'id')
                const edit_relations = await noteService.bindTags(info.user_id, record.id, JSON.parse(tag_json))
                // 删除失效的标签关联
                relations = relations.filter(item => {return edit_relations.indexOf(item) === -1})
                for (const item of relations) {
                    tagComponent.unbindNote(item)
                }
                if (info.note_type === 2) {
                    tagComponent.clearNoteTagNode(record.id)
                    noteService.bindStructTags(info.user_id, record.id, JSON.parse(struct_tag_json))
                }
                if (quotes.length > 0) {
                    this.processDownQuotes(socket.user_id, note_id, quotes)
                }
                params.response_value = '直接覆盖'
                oplogComponent.create(socket.user_id, 'process_note_download', 1, params)
                return record.id
            }
        } else {
            // 本地为新的
            if (!common.empty(info.deleted_at)) {
                noteComponent.delete(record.id)
                noteComponent.removePostil(record.id)
                params.response_value = '本地为新的、删除本地'
                oplogComponent.create(socket.user_id, 'process_note_download', 1, params)
                return 0
            } else {
                // 以本地为准向上同步
                let exists = syncComponent.note(info.user_id, record.id, 21, 2)
                if (common.empty(exists)) {
                    const sync_params = {note_id: record.id, collection_id: record.collection_id, note_status: record.status, hash_code: record.hash_code, deleted_time: record.deleted_at, sync_urgent: 0}
                    syncComponent.create(info.user_id, 21, 2, sync_params)
                    params.response_value = '本地为新的、以本地为准向上同步'
                    oplogComponent.create(socket.user_id, 'process_note_download', 1, params)
                }
                return -2
            }
        }
    }
}

exports.processDownQuotes = function (user_id, postil_id, quotes) {
    const postil = noteComponent.remote(postil_id)
    if (common.empty(postil)) {
        return
    }
    quotes.forEach(note_id => {
        const record = noteComponent.remote(note_id)
        if (!common.empty(record)) {
            noteComponent.postil(record.id, postil.id)
        } else {
            syncComponent.createDownloadNoteTask(user_id, 0, note_id, postil_id, null, null)
        }
    })
}

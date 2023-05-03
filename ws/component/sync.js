const common = require('../../tool/common')
const sqlite = require('../../tool/syncsqlitetool')
const sd = require('silly-datetime');

exports.removeCollectionTask = function (id) {
    return sqlite.delete('speed_collection_sync', 'id=' + id)
}

exports.getUserCollectionTask = function(user_id, sync_type, sync_direct) {
    const sql = 'SELECT * FROM speed_collection_sync WHERE user_id=? and sync_type=? and sync_direct=?'
    return sqlite.get(sql, [user_id, sync_type, sync_direct])
}

exports.getCollectionTask = function(user_id, sync_type, sync_direct, collection_id) {
    const sql = 'SELECT * FROM speed_collection_sync WHERE user_id=? and sync_type=? and sync_direct=? and collection_id=?'
    return sqlite.get(sql, [user_id, sync_type, sync_direct, collection_id])
}

exports.createDownloadCollectionTask = function (collection_id, user_id, pull_info, hash_code = null) {
    if (common.empty(collection_id)) {
        return 0
    }
    hash_code = !common.empty(hash_code) ? hash_code : ''
    const sync_record = this.getCollectionTask(user_id, 1, 1, collection_id)
    const save_time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    if (common.empty(sync_record)) {
        const sql = "INSERT INTO speed_collection_sync(user_id, sync_type, sync_direct, collection_id, pull_info, `hash_code`, status, sync_err, created_at, updated_at) VALUES (?,1,1,?,?,?,0,0,?,?)"
        return sqlite.insert(sql, [user_id, collection_id, pull_info, hash_code, save_time, save_time])
    } else if (sync_record.hash_code !== hash_code || pull_info !== sync_record.pull_info) {
        const sql = "UPDATE speed_collection_sync SET hash_code=?, pull_info=? WHERE id=?"
        return sqlite.update(sql, [hash_code, pull_info, sync_record.id])
    }
}

exports.createRemoveCollectionTask = function (collection_id, user_id, pull_info, hash_code = null) {
    if (common.empty(collection_id)) {
        return 0
    }
    hash_code = !common.empty(hash_code) ? hash_code : ''
    const sync_record = this.getCollectionTask(user_id, 1, 3, collection_id)
    const save_time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    if (common.empty(sync_record)) {
        const sql = "INSERT INTO speed_collection_sync(user_id, sync_type, sync_direct, collection_id, pull_info, `hash_code`, status, sync_err, created_at, updated_at) VALUES (?,1,3,?,?,?,0,0,?,?)"
        return sqlite.insert(sql, [user_id, collection_id, pull_info, hash_code, save_time, save_time])
    } else if (sync_record.hash_code !== hash_code || pull_info !== sync_record.pull_info) {
        const sql = "UPDATE speed_collection_sync SET hash_code=?, pull_info=? WHERE id=?"
        return sqlite.update(sql, [hash_code, pull_info, sync_record.id])
    }
}

exports.createDefaultCollectionTask = function (user_id, collection_id) {
    if (common.empty(collection_id)) {
        return 0
    }
    const sync_record = this.getUserCollectionTask(user_id, 1, 99)
    const save_time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    if (common.empty(sync_record)) {
        const sql = "INSERT INTO speed_collection_sync(user_id, sync_type, sync_direct, collection_id, created_at, updated_at) VALUES (?,1,99,?,?,?)"
        return sqlite.insert(sql, [user_id, collection_id, save_time, save_time])
    } else if (sync_record.collection_id !== collection_id) {
        const sql = "UPDATE speed_collection_sync SET collection_id=? WHERE id=?"
        return sqlite.update(sql, [collection_id, sync_record.id])
    }
}

exports.getCollectionTaskList = function (user_id, sync_type, sync_direct) {
    const sql = 'SELECT * FROM speed_collection_sync WHERE user_id=? and sync_type=? and sync_direct=?'
    return sqlite.all(sql, [user_id, sync_type, sync_direct])
}

//======================================================================================

exports.removeNoteTask = function (id) {
    return sqlite.delete('speed_note_sync', 'id=' + id)
}

exports.getNoteTask = function(user_id, sync_type, sync_direct, note_id) {
    const sql = 'SELECT * FROM speed_note_sync WHERE user_id=? and sync_type=? and sync_direct=? and note_id=?'
    return sqlite.get(sql, [user_id, sync_type, sync_direct, note_id])
}

exports.createDownloadNoteTask = function (user_id, collection_id, note_id, postil_id = 0, hash_code = null, collection_code = null) {
    if (common.empty(note_id)) {
        return 0
    }
    hash_code = !common.empty(hash_code) ? hash_code : ''
    collection_id = !common.empty(collection_id) ? collection_id : 0
    collection_code = !common.empty(collection_code) ? collection_code : ''
    const sync_record = this.getNoteTask(user_id, 21, 1, note_id)
    const save_time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    if (common.empty(sync_record)) {
        const sql = "INSERT INTO speed_note_sync(user_id, sync_type, sync_direct, note_id, postil_id, collection_id, collection_code, `hash_code`, status, sync_err, created_at, updated_at) VALUES (?,21,1,?,?,?,?,?,0,0,?,?)"
        return sqlite.insert(sql, [user_id, note_id, postil_id, collection_id, collection_code, hash_code, save_time, save_time])
    } else if (sync_record.hash_code !== hash_code) {
        const sql = "UPDATE speed_note_sync SET hash_code=? WHERE id=?"
        return sqlite.update(sql, [hash_code, sync_record.id])
    }
}

exports.getNoteTaskList = function (user_id, sync_type, sync_direct, size = 200) {
    const sql = 'SELECT * FROM speed_note_sync WHERE user_id=? and sync_type=? and sync_direct=? ORDER BY created_at desc limit ' + size
    return sqlite.all(sql, [user_id, sync_type, sync_direct])
}

/**
 * 创建同步记录
 * @param user_id
 * @param type
 * @param direct
 * @param params
 */
exports.create = function (user_id, type, direct, params = {}) {
    const save_time = common.sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    let sql = "INSERT INTO syncs(#COLUMNS#) VALUES (#VALUES#)"
    const columns = ['user_id', 'sync_type', 'sync_direct', 'status']
    const values = ['?', '?', '?', 0], list = [user_id, type, direct]
    if (!common.empty(params.collection_id)) {
        columns.push('collection_id')
        values.push('?')
        list.push(params.collection_id)
    }
    if (!common.empty(params.member_id)) {
        columns.push('member_id')
        values.push('?')
        list.push(params.member_id)
    }
    if (!common.empty(params.member_name)) {
        columns.push('member_name')
        values.push('?')
        list.push(params.member_name)
    }
    if (!common.empty(params.member_avatar)) {
        columns.push('member_avatar')
        values.push('?')
        list.push(params.member_avatar)
    }
    if (!common.empty(params.note_id)) {
        columns.push('note_id')
        values.push('?')
        list.push(params.note_id)
    }
    if (!common.empty(params.hash_code)) {
        columns.push('hash_code')
        values.push('?')
        list.push(params.hash_code)
    }
    if (!common.empty(params.tag_id)) {
        columns.push('tag_id')
        values.push('?')
        list.push(params.tag_id)
    }
    if (!common.empty(params.image_id)) {
        columns.push('image_id')
        values.push('?')
        list.push(params.image_id)
    }
    if (!common.empty(params.postil_id)) {
        columns.push('postil_id')
        values.push('?')
        list.push(params.postil_id)
    }
    if (!common.empty(params.note_status)) {
        columns.push('note_status')
        values.push('?')
        list.push(params.note_status)
    }
    if (!common.empty(params.sync_urgent)) {
        columns.push('sync_urgent')
        values.push('?')
        list.push(1)
    }
    if (!common.empty(params.deleted_time)) {
        columns.push('deleted_time')
        values.push('?')
        list.push(params.deleted_time)
    }
    columns.push('created_at', 'updated_at')
    values.push('?', '?')
    list.push(save_time, save_time)
    sql = sql.replace('#COLUMNS#', columns.join(',')).replace('#VALUES#', values.join(','))
    return sqlite.insert(sql, list);
}

/**
 * 获取note同步记录
 * @param user_id
 * @param note_id
 * @param type
 * @param direct
 */
exports.note = function (user_id, note_id, type, direct) {
    const sql = 'select * from syncs where user_id=? and note_id=? and sync_type=? and sync_direct=?'
    return sqlite.get(sql, [user_id, note_id, type, direct]);
}
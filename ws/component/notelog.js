const common = require('../../tool/common')
const sqlite = require('../../tool/logsqlitetool')
const sd = require('silly-datetime');

/**
 * 创建更新日志
 * @param remote_id
 * @param user_id
 * @param collection_id
 * @param note_id
 * @param action
 * @param collection_code
 * @returns {*|*|number}
 */
exports.create = function (remote_id, user_id, collection_id, note_id, action, collection_code = null) {
    collection_id = !common.empty(collection_id) ? collection_id : 0
    collection_code = !common.empty(collection_code) ? collection_code : ''
    const save_time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const sql = "REPLACE INTO speed_note_log(remote_id, user_id, collection_id, collection_code, note_id, `action`, created_at, updated_at, sync_at) VALUES (?,?,?,?,?,?,?,?,null)"
    return sqlite.insert(sql, [remote_id, user_id, collection_id, collection_code, note_id, action, save_time, save_time]);
}

/**
 * @param remote_id
 * @param user_id
 * @returns {*}
 */
exports.getRemote = function (remote_id, user_id) {
    const sql = "SELECT * FROM speed_note_log WHERE remote_id=? and user_id=?"
    return sqlite.get(sql, [remote_id, user_id])
}

exports.updateUser = function (remote_id, user_id) {
    const sql = "UPDATE speed_note_log SET user_id=? WHERE remote_id=?"
    return sqlite.update(sql, [user_id, remote_id])
}

exports.updateSyncAt = function (note_id, user_id) {
    const save_time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const sql = "UPDATE speed_note_log SET sync_at=? WHERE note_id=? AND user_id=?"
    return sqlite.update(sql, [save_time, note_id, user_id])
}


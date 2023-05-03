const common = require('../../tool/common')
const sqlite = require('../../tool/sqlitetool')
const sd = require('silly-datetime');

/**
 * 生成笔记本hash
 * @param name
 * @param owner
 * @param user_id
 * @param note_limit
 * @param color
 * @param share_state
 * @param is_delete
 * @param sort
 * @param remark
 * @returns {*}
 */
exports.createCollectionHash = function (name, owner, user_id, note_limit, color, share_state, is_delete, sort, remark) {
    owner = owner.toString()
    note_limit = note_limit.toString()
    share_state = share_state.toString()
    is_delete = is_delete.toString()
    sort = sort.toString()
    remark = remark.toString()
    return common.md5(JSON.stringify({name, owner, user_id, note_limit, color, share_state, is_delete, sort, remark}))
}

/**
 * 获取云端id对应的本地记录
 * @param remote_id
 * @param columns
 * @returns {*}
 */
exports.getRemote = function (remote_id, columns = '*') {
    let sql = 'select #COLUMN# from collections where remote_id=?'
    sql = sql.replace('#COLUMN#', columns)
    return sqlite.get(sql, [remote_id])
}

exports.getNormalRemote = function (remote_id, columns = '*') {
    let sql = 'select #COLUMN# from collections where remote_id=? and deleted_at is null'
    sql = sql.replace('#COLUMN#', columns)
    return sqlite.get(sql, [remote_id])
}

exports.createCollection = function (remote_id, user_id, collection, color, max_num, remark, share_state, created_at, updated_at) {
    let sql = "INSERT INTO collections(user_id, remote_id, collection, color, max_num, remark, share_state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    return sqlite.insert(sql, [user_id, remote_id, collection, color, max_num, remark, share_state, created_at, updated_at]);
}

exports.updateCollection = function (local_id, collection, color, max_num, remark, share_state) {
    const columns = ["collection=?" , "color=?", "max_num=?", "remark=?", "share_state=?"]
    const params = [collection, color, max_num, remark, share_state]
    const sql = "UPDATE collections SET " + columns.join(',') + " WHERE id=" + local_id
    return sqlite.update(sql, params)
}

exports.removeCollection = function (collection_id) {
    if (!common.empty(collection_id)) {
        const save_time = common.sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
        let sql = "update collections set deleted_at=? where id=? and deleted_at is null"
        return sqlite.update(sql, [save_time, collection_id]);
    }
    return 0
}

exports.updateCollectionHash = function (local_id, collection_hash) {
    const sql = "UPDATE collections SET collection_hash=? WHERE id=?"
    return sqlite.update(sql, [collection_hash, local_id])
}

exports.changeCollectionSort = function (local_id, user_id, sort, created_at, updated_at) {
    let sql = "select MAX(sort_index) as max_sort from user_collection_indexes where user_id=?"
    const count_row = sqlite.get(sql, [user_id])
    let max_sort = 1
    if (!common.empty(count_row) && count_row.max_sort !== null) {
        max_sort = count_row.max_sort + 1
    }
    sort = common.empty(sort) ? max_sort : sort
    sql = "REPLACE INTO user_collection_indexes(user_id, collection_id, sort_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    return sqlite.run(sql, [user_id, local_id, sort, created_at, updated_at])
}

exports.userJoinList = function (user_id) {
    let sql = "select user_id, collection_id from user_join_collections where status=1 and user_id=?"
    const join_list = sqlite.all(sql, [user_id])
    if (common.empty(join_list)) {
        return []
    }
    const local_id_list = join_list.map(item => item.collection_id)
    sql = 'select id, remote_id, assign_user_id from collections where id in (' + local_id_list.join(',') + ') and remote_id>0'
    const collection_list = sqlite.all(sql)
    const list = []
    collection_list.forEach(item => {
        if (item.remote_id > 0) {
            list.push(item.remote_id)
        }
    })
    return list
}

exports.joinList = function (collection_id, columns = '*') {
    let sql = "select #COLUMNS# from user_join_collections where status=1 and collection_id=?"
    sql = sql.replace('#COLUMNS#', columns);
    return sqlite.all(sql, [collection_id])
}

exports.join = function (user_id, collection_id, save_time) {
    if (common.empty(user_id) || common.empty(collection_id)) {
        return 0
    }
    const sql = "REPLACE INTO user_join_collections(user_id, collection_id, status, created_at, updated_at) VALUES (?, ?, 1, ?, ?)"
    return sqlite.run(sql, [user_id, collection_id, save_time, save_time])
}

exports.unjoin = function (collection_id, users) {
    const sql = "UPDATE user_join_collections SET status=0 where user_id not in (" + users.join(',') + ") and collection_id=" + collection_id
    sqlite.update(sql)
    sqlite.delete('user_collection_indexes', 'collection_id=' + collection_id + " and user_id in (" + users.join(',') + ")")
}
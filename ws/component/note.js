const common = require('../../tool/common')
const sqlite = require('../../tool/sqlitetool');

/**
 * 获取note记录
 * @param note_id
 * @param columns
 * @returns {*}
 */
exports.remote = function (note_id, columns = '*') {
    let sql = 'select #COLUMN# from notes where remote_id=? and deleted_at is null';
    sql = sql.replace('#COLUMN#', columns)
    return sqlite.get(sql, [note_id]);
}

/**
 * 获取已删除的note记录
 * @param note_id
 * @param columns
 * @returns {*}
 */
exports.remoteDestroyed = function (note_id, columns = '*') {
    let sql = 'select #COLUMN# from notes where remote_id=? and deleted_at is not null';
    sql = sql.replace('#COLUMN#', columns)
    return sqlite.get(sql, [note_id]);
}

/**
 * note关联的批注列表
 * postil_id使用引用的note记录ID
 * @param note_id
 * @param columns
 */
exports.postils = function (note_id, columns = '*') {
    let sql = 'select #COLUMN# from note_postil where postil_id=? and deleted_at is null'.replace('#COLUMN#', columns)
    const rows = sqlite.all(sql, [note_id]);
    if (common.empty(rows)) {
        return []
    }
    return rows
}

/**
 * note引用 note_id 为原笔记的ID，postil_id 为新笔记的ID
 * @param note_id
 * @param postil_id
 */
exports.postil = function (note_id, postil_id) {
    const list = this.postils(postil_id, 'note_id')
    const quotes = list.map((item) => {return item.note_id})
    if (quotes.indexOf(note_id) === -1) {
        const save_time = common.sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
        const sql = "INSERT INTO note_postil(note_id, postil_id, created_at, updated_at) VALUES (?, ?, ?, ?)"
        return sqlite.insert(sql, [note_id, postil_id, save_time, save_time])
    }
    return 0
}

exports.storeRemote = function (remote_id, user_id, collection_id, note_type, source, content, weight, url, tag_json, hash, struct_tag_json, status, create_time, update_time, last_update) {
    if (common.empty(collection_id)) {
        return 0;
    }
    url = !common.empty(url) ? url : ''
    weight = !common.empty(weight) ? weight : 0
    tag_json = !common.empty(tag_json) ? tag_json : ''
    struct_tag_json = !common.empty(struct_tag_json) ? struct_tag_json : ''
    const record = this.remote(remote_id)
    const notag_content = common.strip(content)
    if (common.empty(record)) {
        const sql = "INSERT INTO notes(user_id, remote_id, collection_id, note, content, weight, note_type, source, status, url, tag_json, struct_tag_json, hash_code, created_at, updated_at, last_update)" +
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        return sqlite.insert(sql, [user_id, remote_id, collection_id, content, notag_content, weight, note_type, source, status, url, tag_json, struct_tag_json, hash, create_time, update_time, last_update]);
    }
    const sql = "UPDATE notes SET collection_id=?, note=?, content=?, weight=?, note_type=?, source=?, status=?, url=?, tag_json=?, struct_tag_json=?, hash_code=?, updated_at=?, last_update=? WHERE remote_id=?"
    return sqlite.update(sql, [collection_id, content, notag_content, weight, note_type, source, status, url, tag_json, struct_tag_json, hash, update_time, last_update, remote_id])
}

/**
 * note置为无效
 * @param note_id
 * @param save_time
 */
exports.remove = function (note_id, save_time) {
    const sql = "UPDATE notes SET status=0, updated_at=?, last_update=? where id=?"
    return sqlite.run(sql, [save_time, save_time, note_id])
}

/**
 * 删除note
 * @param note_id
 */
exports.delete = function (note_id) {
    const save_time = common.sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const sql = "UPDATE notes SET deleted_at=? where id=?"
    return sqlite.update(sql, [save_time, note_id]);
}

/**
 * 删除引用
 * @param note_id
 * @param postil_id
 */
exports.removePostil = function (note_id, postil_id = 0) {
    const save_time = common.sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const where = ["note_id=?"]
    const options = [save_time, note_id]
    if (!common.empty(postil_id)) {
        where.push("postil_id=?")
        options.push(postil_id)
    }
    const sql = "update note_postil set deleted_at=? where #WHERE#".replace('#DELETE_TIME#', save_time).replace('#WHERE#', where.join(' and '))
    return sqlite.update(sql, options)
}

/**
 * 更改笔记权重内容
 * @param note_id
 * @param weight
 */
exports.updateNoteWeightValue = function (note_id, weight) {
    weight = weight > 0 ? weight : 0
    const sql = "update notes set weight=" + weight + " where id=?"
    return sqlite.update(sql, [note_id]);
}

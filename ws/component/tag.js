const common = require('../../tool/common')
const sqlite = require('../../tool/sqlitetool')

/**
 * 创建标签
 * @param user_id
 * @param tag_name
 */
exports.create = async function (user_id, tag_name) {
    const save_time = common.sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const initial = common.initial(tag_name)
    const sql = "INSERT INTO tags(user_id, tag, initial, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    return sqlite.insert(sql, [user_id, tag_name, initial, save_time, save_time])
}

/**
 * 笔记关联
 * @param note_id
 * @param columns
 */
exports.noteTagRelations = function (note_id, columns = 'id,note_id,tag_id,group_id') {
    const sql = "SELECT #COLUMNS# FROM note_tag_relation WHERE note_id=? and deleted_at is null".replace('#COLUMNS#', columns)
    const list = sqlite.all(sql, [note_id])
    if (common.empty(list)) {
        return []
    }
    return list
}

/**
 * 根据标签名获取对应标签记录
 * @param user_id
 * @param tag
 */
exports.findByTag = function (user_id, tag) {
    const sql = "SELECT * FROM tags WHERE tag=? and user_id=? and deleted_at is null"
    return sqlite.get(sql, [tag, user_id])
}

/**
 * 获取笔记标签关联
 * @param note_id
 * @param tag_id
 * @param group_id
 */
exports.findNoteRelation = function (note_id, tag_id, group_id) {
    const sql = "SELECT * FROM note_tag_relation WHERE note_id=? and tag_id=? and group_id=? and deleted_at is null"
    return sqlite.get(sql, [note_id, tag_id, group_id])
}

/**
 * 标签绑定笔记
 * @param note_id
 * @param tag_id
 * @param group_id
 */
exports.bindNote = function (note_id, tag_id, group_id) {
    group_id = common.empty(group_id) ? 0 : group_id
    const relate = this.findNoteRelation(note_id, tag_id, group_id)
    if (!common.empty(relate)) {
        return relate.id
    }
    const save_time = common.sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const insertSql = "INSERT INTO note_tag_relation(note_id, tag_id, group_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    return sqlite.insert(insertSql, [note_id, tag_id, group_id, save_time, save_time])
}

/**
 * 依据标签获取标签分组记录
 * @param user_id
 * @param tag_id
 */
exports.findGroupByTag = function (user_id, tag_id) {
    const sql = "SELECT * FROM tag_group WHERE tag_id=? and  user_id=? and deleted_at is null"
    return sqlite.get(sql, [tag_id, user_id])
}

/**
 * 创建分组
 * @param user_id
 * @param group_name
 */
exports.createGroup = function (user_id, group_name) {
    let tag_id = 0
    const tag = this.findByTag(user_id, group_name)
    if (!common.empty(tag)) {
        tag_id = tag.id
    } else {
        tag_id = this.create(user_id, group_name)
    }
    if (common.empty(tag_id)) {
        return {group_id: 0, tag_id: 0}
    }
    const tag_group = this.findGroupByTag(user_id, tag_id)
    if (!common.empty(tag_group)) {
        return {group_id: tag_group.id, tag_id: tag_group.tag_id}
    }
    const save_time = common.sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const sql = "INSERT INTO tag_group(user_id, group_name, tag_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    const group_id = sqlite.insert(sql, [user_id, group_name, tag_id, save_time, save_time]);
    return {group_id: group_id, tag_id: tag_id}
}

/**
 * 获取分组明细
 * @param user_id
 * @param group_id
 * @param tag_id
 */
exports.findGroupItem = function (user_id, group_id, tag_id) {
    const sql = "SELECT * FROM tag_group_items WHERE user_id=? and group_id=? and tag_id=? and deleted_at is null"
    return sqlite.get(sql, [user_id, group_id, tag_id])
}

/**
 * 添加分组明细
 * @param user_id
 * @param group_id
 * @param tag_i
 */
exports.initGroupItem = function (user_id, group_id, tag_id) {
    if (common.empty(group_id) || common.empty(tag_id)) {
        return 0
    }
    const item = this.findGroupItem(user_id, group_id, tag_id)
    if (!common.empty(item)) {
        return item.id
    }
    const save_time = common.sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const sql = "INSERT INTO tag_group_items(user_id, group_id, tag_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    return sqlite.insert(sql, [user_id, group_id, tag_id, save_time, save_time]);
}

/**
 * 标签解除绑定
 * @param relation_id
 */
exports.unbindNote = function (relation_id) {
    return sqlite.delete("note_tag_relation", "id=" + relation_id)
}

/**
 * 清空笔记相关结构化标签
 * @param note_id
 */
exports.clearNoteTagNode = function (note_id) {
    sqlite.delete('note_tag_nodes', 'note_id=' + note_id)
    sqlite.delete('note_tag_node_items', 'note_id=' + note_id)
}

/**
 * 创建笔记相关结构化标签节点
 * @param note_id
 * @param tag
 * @param is_header
 * @param parent_node
 * @param sort_index
 * @param save_time
 * @param remote_id
 */
exports.addNoteTagNode = async function (note_id, tag, is_header, parent_node, sort_index, save_time, remote_id = 0) {
    const sql = "INSERT INTO note_tag_nodes(note_id, tag, is_header, parent_node, sort_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    return sqlite.insert(sql, [note_id, tag, is_header, parent_node, sort_index, save_time, save_time]);
}

/**
 * 创建笔记相关结构化标签节点明细
 * @param note_id
 * @param node_id
 * @param tag_id
 * @param sort_index
 * @param save_time
 * @param remote_id
 */
exports.addNoteTagNodeItem = async function (note_id, node_id, tag_id, sort_index, save_time, remote_id = 0) {
    const sql = "INSERT INTO note_tag_node_items(note_id, node_id, tag_id, sort_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    return sqlite.insert(sql, [note_id, node_id, tag_id, sort_index, save_time, save_time]);
}
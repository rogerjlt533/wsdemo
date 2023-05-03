const common = require('../../tool/common');
const collectionTool = require('../component/collection')
const noteTool = require('../component/note')
const tagTool = require('../component/tag')
const userTool = require('../component/user')
const httpTool = require('../../tool/http')

/**
 * 绑定note标签
 * @param user_id
 * @param note_id
 * @param tag_list
 */
exports.bindTags = function (user_id, note_id, tag_list = []) {
    tag_list = common.empty(tag_list) ? [] : tag_list
    const list = []
    for (let tag of tag_list) {
        if (common.empty(tag) || tag === '') {
            continue
        }
        tag = tag.replace("-", '/')
        const items = tag.split('/')
        if (items.length === 1) {
            // 非分组标签绑定
            const record = tagTool.findByTag(user_id, tag)
            if (!common.empty(record)) {
                const relate_id = tagTool.bindNote(note_id, record.id, 0)
                if (relate_id > 0) {
                    list.push(relate_id)
                } else {
                    const relate = tagTool.findNoteRelation(note_id, record.id, 0)
                    if (!common.empty(relate)) {
                        list.push(relate.id)
                    }
                }
                continue
            }
            const tag_id = tagTool.create(user_id, tag)
            if (common.empty(tag_id)) {
                continue
            }
            const relate_id = tagTool.bindNote(note_id, tag_id, 0)
            if (relate_id > 0) {
                list.push(relate_id)
            } else {
                const relate = tagTool.findNoteRelation(note_id, tag_id, 0)
                if (!common.empty(relate)) {
                    list.push(relate.id)
                }
            }
        } else if (items.length > 1) {
            const group_name = items[0]
            const {group_id, tag_id} = tagTool.createGroup(user_id, group_name)
            for (const index in items) {
                const value = items[index]
                const item_tag = tagTool.findByTag(user_id, value)
                let item_id = 0
                if (common.empty(item_tag)) {
                    item_id = tagTool.create(user_id, value)
                } else {
                    item_id = item_tag.id
                }
                if (common.empty(item_id)) {
                    continue
                }
                tagTool.initGroupItem(user_id, group_id, item_id)
                const relate_id = tagTool.bindNote(note_id, item_id, common.empty(group_id) ? 0 : tag_id)
                if (relate_id > 0) {
                    list.push(relate_id)
                } else {
                    const relate = tagTool.findNoteRelation(note_id, item_id, common.empty(group_id) ? 0 : tag_id)
                    if (!common.empty(relate)) {
                        list.push(relate.id)
                    }
                }
            }
        }
    }
    return list
}

/**
 * 绑定结构化标签
 * @param user_id
 * @param note_id
 * @param struct_list
 */
exports.bindStructTags = function (user_id, note_id, struct_list = []) {
    struct_list = common.empty(struct_list) ? [] : struct_list
    let list = [], list_item = []
    for (const index in struct_list) {
        const circle_res = this.circleStructTree(user_id, note_id, index, struct_list[index], 0, list, list_item)
        list = circle_res.list
        list_item = circle_res.list_item
    }
    return {list, list_item}
}

/**
 * 递归处理结构化标签组
 * @param user_id
 * @param note_id
 * @param sort_index
 * @param item
 * @param parent_node
 * @param list
 * @param list_item
 */
exports.circleStructTree = function (user_id, note_id, sort_index, item, parent_node, list = [], list_item = []) {
    const save_time = common.sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const tag_list = []
    list = common.empty(list) ? [] : list
    list_item = common.empty(list_item) ? [] : list_item
    const is_header = item.level > 0 ? 1 : 0
    const node_id = tagTool.addNoteTagNode(note_id, item.tag, is_header, parent_node, sort_index, save_time)
    list.push(node_id)
    let needItemNode = 0
    if (is_header > 0) {
        if(item.tag){
            common.list_column(item.tag.concat(" ").matchAll(/\#(\S+?)?\s{1}/g), 1).forEach(function (value) {
                if (!common.empty(value)) {
                    tag_list.push(value)
                }
            })
        }
        for (const index in item.data) {
            const unit = item.data[index]
            if (unit.level > 0) {
                const circle_res = this.circleStructTree(user_id, note_id, index, unit, node_id, list, list_item)
                list = circle_res.list
                list_item = circle_res.list_item
            } else {
                needItemNode = 1
                tag_list.push(unit.tag)
            }
        }
    } else {
        needItemNode = 1
        tag_list.push(item.tag)
    }
    for (const index in tag_list) {
        const tag = tag_list[index].replace("-", '/')
        const items = tag.split('/')
        if (items.length === 1) {
            if (common.empty(tag) || tag === '') {
                continue
            }
            list_item = this.addNoteTagNodeItem(user_id, note_id, node_id, tag, index, index, needItemNode, save_time, list_item)
        } else {
            for (const vindex in items) {
                if (common.empty(items[vindex]) || items[vindex] === '') {
                    continue
                }
                list_item = this.addNoteTagNodeItem(user_id, note_id, node_id, items[vindex], index, vindex, needItemNode, save_time, list_item)
            }
        }
    }
    return {list, list_item}
}

/**
 * 添加节点明细
 * @param user_id
 * @param note_id
 * @param node_id
 * @param tag
 * @param index
 * @param item_index
 * @param needItemNode
 * @param save_time
 * @param list_item
 */
exports.addNoteTagNodeItem = function (user_id, note_id, node_id, tag, index, item_index, needItemNode, save_time, list_item) {
    const item_tag = tagTool.findByTag(user_id, tag)
    let item_id = 0
    if (common.empty(item_tag)) {
        item_id = tagTool.create(user_id, tag)
    } else {
        item_id = item_tag.id
    }
    if (common.empty(item_id)) {
        return list_item
    }
    if (needItemNode === 1) {
        const item_node = tagTool.addNoteTagNode(note_id, tag, 0, node_id, index, save_time)
        const node_itemid = tagTool.addNoteTagNodeItem(note_id, item_node, item_id, item_index, save_time)
        list_item.push(node_itemid)
    } else {
        const node_itemid = tagTool.addNoteTagNodeItem(note_id, node_id, item_id, item_index, save_time)
        list_item.push(node_itemid)
    }
    return list_item
}
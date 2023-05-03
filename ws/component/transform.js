const common = require('../../tool/common')
const sd = require('silly-datetime');
const collectionComponent = require('./collection')
const userComponent = require('./user')

exports.initCollection = function (current_user, remote_id, collection_info, collection_hash) {
    let record = collectionComponent.getRemote(remote_id)
    let local_id = 0
    const user_id = collection_info.owner.owner_id
    const collection = collection_info.name
    const color = collection_info.color
    const max_num = collection_info.note_limit
    const remark = collection_info.remark
    const share_state = collection_info.share_state
    const created_at = collection_info.created_time
    const updated_at = collection_info.updated_time
    if (common.empty(record)) {
        const updated_at = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
        local_id = collectionComponent.createCollection(remote_id, user_id, collection, color, max_num, remark, share_state, created_at, updated_at)
    } else {
        local_id = record.id
        if (common.empty(record.collection_hash)) {

        } else if (record.collection_hash === collection_hash) {
            return {local_id, remote_id}
        } else if (common.compareTime(updated_at, record?.updated_at) < 0) {
            return {local_id, remote_id}
        }
    }
    const save_time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    this.bindCollectionMember(local_id, collection_info.member_list)
    collectionComponent.changeCollectionSort(local_id, current_user, collection_info.sort, save_time, save_time)
    collectionComponent.updateCollectionHash(local_id, collection_hash)
    return {local_id, remote_id}
}

exports.bindCollectionMember = function (local_id, users) {
    const save_time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const user_list = []
    users.forEach(user => {
        userComponent.initUserInfo(user.user_id, user.user_name, user.user_image)
        collectionComponent.join(user.user_id, local_id, save_time)
        user_list.push(user.user_id)
    })
    collectionComponent.unjoin(local_id, user_list)
}
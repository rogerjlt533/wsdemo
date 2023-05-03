const common = require('../../tool/common');
const sqlite = require('../../tool/oplogsqlitetool')

/**
 * 创建日志记录
 * @param user_id
 * @param behavior
 * @param opr_direct
 * @param params
 */
exports.create = function (user_id, behavior, opr_direct, params = {}) {
    const save_time = common.sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    let sql = "INSERT INTO user_operate_log(#COLUMNS#) VALUES (#VALUES#)"
    const columns = ['user_id', 'behavior', 'opr_direct', 'is_upload']
    const values = ['?', '?', '?', 0], list = [user_id, behavior, opr_direct]
    if (!common.empty(params.obj_type)) {
        columns.push('obj_type')
        values.push('?')
        list.push(params.obj_type)
    }
    if (!common.empty(params.obj_id)) {
        columns.push('obj_id')
        values.push('?')
        list.push(params.obj_id)
    }
    if (!common.empty(params.remote_id)) {
        columns.push('remote_id')
        values.push('?')
        list.push(params.remote_id)
    }
    if (!common.empty(params.download_value)) {
        columns.push('download_value')
        values.push('?')
        list.push(params.download_value)
    }
    if (!common.empty(params.upload_value)) {
        columns.push('upload_value')
        values.push('?')
        list.push(params.upload_value)
    }
    if (!common.empty(params.result_value)) {
        columns.push('result_value')
        values.push('?')
        list.push(params.result_value)
    }
    if (!common.empty(params.response_value)) {
        columns.push('response_value')
        values.push('?')
        list.push(params.response_value)
    }
    if (!common.empty(params.sync_urgent)) {
        columns.push('sync_urgent')
        values.push('?')
        list.push(1)
    }
    columns.push('created_at', 'updated_at')
    values.push('?', '?')
    list.push(save_time, save_time)
    sql = sql.replace('#COLUMNS#', columns.join(',')).replace('#VALUES#', values.join(','))
    return sqlite.insert(sql, list);
}
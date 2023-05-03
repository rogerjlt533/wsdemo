const sqlite = require('../../tool/sqlitetool');
const common = require('../../tool/common');
const sd = require('silly-datetime');

exports.get = function (user_id, columns = '*') {
    const sql = "select #COLUMNS# from users where remote_id=?".replace('#COLUMNS#', columns)
    return sqlite.get(sql, [user_id]);
}

exports.create = function (remote_id, name, avatar, save_time) {
    const sql = "INSERT INTO users(`remote_id`, `name`, `avatar`, `created_at`, `updated_at`) VALUES (?,?,?,?,?)"
    return sqlite.insert(sql, [remote_id, name, avatar, save_time, save_time]);
}

exports.update = function (remote_id, name, avatar, save_time) {
    const sql = "UPDATE users SET `name`=?, `avatar`=?, `updated_at`=? WHERE remote_id=?"
    return sqlite.update(sql, [name, avatar, save_time, remote_id]);
}

exports.setting = function (user_id) {
    const sql = "select * from user_setting where user_id=?"
    return sqlite.get(sql, [user_id])
}

exports.initUserSetting = function(user_id) {
    if (common.empty(user_id)) {
        return false
    }
    const setting = this.setting(user_id)
    const save_time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    if (common.empty(setting)) {
        const columns = ['user_id', 'created_at', 'updated_at'], values = ['?', '?', '?'], sql_params = [user_id, save_time, save_time]
        for (const index in params) {
            if (['statistic_notify', 'statistic_wx_notify', 'statistic_email_notify', 'note_public', 'default', 'fold_note'].indexOf(index) === -1) {
                continue
            }
            const column = index === 'default' ? '`default`' : index
            columns.push(column)
            values.push('?')
            sql_params.push(params[index])
        }
        const sql = "INSERT INTO user_setting(#COLUMNS#) VALUES (#VALUES#)"
            .replace('#COLUMNS#', columns.join(',')).replace('#VALUES#', values.join(','))
        sqlite.insert(sql, sql_params)
    }
}

exports.initUserInfo = function (remote_id, name, avatar) {
    const save_time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const user = this.get(remote_id)
    if (common.empty(user)) {
        this.create(remote_id, name, avatar, save_time)
    } else {
        this.update(remote_id, name, avatar, save_time)
    }
    this.initUserSetting(remote_id)
}

exports.setUserDefault = function (user_id, default_collection) {
    const save_time = sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
    const sql = "UPDATE user_setting SET `default`=?, `updated_at`=? WHERE user_id=?"
    return sqlite.update(sql, [default_collection, save_time, user_id]);
}


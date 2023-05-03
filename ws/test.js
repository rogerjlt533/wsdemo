const md5 = require('blueimp-md5')
const logSqliteTool = require('../tool/logsqlitetool')
const common = require('../tool/common')
const service = require('./service')


const data = {
    name: "我的目标",
    owner: '3',
    user_id: ['3'],
    note_limit: '300',
    color: "#AA2116",
    share_state: '0',
    is_delete: '0',
    sort: "0"
}
console.log(JSON.stringify(data))
console.log("本地hash：" + md5(JSON.stringify(data)))
console.log("线上hash：" + "183ff848b55e1076214eb373f530b4b9")

function getLastLog() {
    const sql = 'select MAX(remote_id) as last_id from note_log'
    const record = logSqliteTool.get(sql)
    console.log(record)
}

service.getLastLog("W9BL")
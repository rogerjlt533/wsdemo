const Database = require('better-sqlite3')

exports.empty = function (value) {
    if (value === undefined || value === null || value === '' || value === 0) {
        return true
    }
    return false
}

/**
 * 创建链接
 * @returns {sqlite3.cached.Database|*|*}
 */
exports.connect = function () {
    return new Database(__dirname + '/../bin/tsync.db', { verbose: null })
}

exports.insert = function (query, params = [], retries = 0) {
    const db = this.connect()
    try {
        const stmt = db.prepare(query)
        const last_id = stmt.run(params).lastInsertRowid
        db.close()
        return last_id
    } catch (e) {
        db.close()
        if (retries > 0) {
            return this.insert(query, params, retries - 1)
        }
    }
    return 0
}

exports.update = function (query, params = [], retries = 0) {
    const db = this.connect()
    try {
        const stmt = db.prepare(query)
        const changes = stmt.run(params).changes
        db.close()
        return changes
    } catch (e) {
        db.close()
        if (retries > 0) {
            return this.update(query, params, retries - 1)
        }
    }
    return 0
}

exports.delete = function (table, where) {
    let query = "DELETE FROM " + table
    if (!this.empty(where) && where.length > 0) {
        query = query + " where " + where
    }
    const db = this.connect()
    let changes = 0
    try {
        const stmt = db.prepare(query)
        changes = stmt.run([]).changes
    } catch (e) {
        console.log(e.message)
    }
    db.close()
    return changes
}

exports.run = function (query, params, retries) {
    const db = this.connect()
    try {
        const stmt = db.prepare(query)
        const result = stmt.run(params)
        db.close()
        return result
    } catch (e) {
        db.close()
        if (retries > 0) {
            return this.run(query, params, retries - 1)
        }
    }
    return {}
}

exports.get = function (query, params = []) {
    const db = this.connect()
    if (this.empty(params)) params = []
    try {
        const stmt = db.prepare(query)
        const result = stmt.get(params)
        db.close()
        return result
    } catch (e) {
        console.log(e.message)
        db.close()
    }
    return null
}

exports.all = function (query, params = []) {
    const db = this.connect()
    if (this.empty(params)) params = []
    try {
        const stmt = db.prepare(query)
        const result = stmt.all(params)
        db.close()
        return result
    } catch (e) {
        console.log(e.message)
        db.close()
    }
    return null
}
const Hashids = require('hashids/cjs')
const md5 = require('blueimp-md5')
const pinyin = require('tiny-pinyin')
const sd = require('silly-datetime')
const striptags = require('striptags')

exports.sd = sd

exports.empty = function (value) {
    if (value === undefined || value === null || value === '' || value === 0) {
        return true
    }
    return false
}

exports.md5 = function (value) {
    return md5(value)
}

exports.list_column = function (arr, key) {
    const list = []
    for (const item of arr) {
        list.push(item[key])
    }
    return list
}

exports.encode = function (...values) {
    if (this.empty(this.hashids)) {
        const salt = 'base64:EbLMdFqxjFFfcPtxk/Qb0p/vOaN0fhK3gzthH6AZsS0=';
        this.hashids = new Hashids(salt, 4);
    }
    return this.hashids.encode(values);
}

exports.decode = function (code) {
    if (this.empty(this.hashids)) {
        const salt = 'base64:EbLMdFqxjFFfcPtxk/Qb0p/vOaN0fhK3gzthH6AZsS0=';
        this.hashids = new Hashids(salt, 4);
    }
    return this.hashids.decode(code)[0];
}

exports.encodeDesktop = function (...values) {
    if (this.empty(this.hashidDesktop)) {
        const salt = 'Thought_Note_Desktop';
        this.hashidDesktop = new Hashids(salt, 4);
    }
    return this.hashidDesktop.encode(values);
}

exports.decodeDesktop = function (code) {
    if (this.empty(this.hashidDesktop)) {
        const salt = 'Thought_Note_Desktop';
        this.hashidDesktop = new Hashids(salt, 4);
    }
    return this.hashidDesktop.decode(code)[0];
}

exports.list_remove = function (list, value) {
    return list.filter(item => {return value !== item})
}

/**
 * 比较时间大小
 * @param source
 * @param compare
 * @returns {number}
 */
exports.compareTime = function (source, compare) {
    const sourceTime = new Date(source), compareTime = new Date(compare)
    if (sourceTime.getTime() > compareTime.getTime()) {
        return 1
    } else if (sourceTime.getTime() < compareTime.getTime()) {
        return -1
    }
    return 0
}

/**
 * 获取拼音
 * @param value
 * @param space
 * @returns {*}
 */
exports.tinypinyin = function (value, space = '/') {
    if (pinyin.isSupported()) {
        return pinyin.convertToPinyin(value, space, true)
    }
    return ''
}

/**
 * 获取声母
 * @param value
 * @param space
 * @returns {string}
 */
exports.initial = function (value, space = '/') {
    const words = this.tinypinyin(value, space).split('')
    if (words.length > 0) {
        return words[0].toLocaleUpperCase()
    }
    return ''
}

/**
 * 过滤tags
 * @param content
 * @returns {string | never}
 */
exports.strip = function (content) {
    if (this.empty(content)) {
        return ''
    }
    return striptags(content)
}

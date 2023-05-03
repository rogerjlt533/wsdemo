const fs = require('fs');
const common = require('./common');
const rp = require('request-promise');
const needle = require('needle');
const internetAvailable = require("internet-available")

exports.domain_name = 'api.fang-cun.net'
exports.host = 'https://api.fang-cun.net/'
exports.sync_host = 'https://steam.fang-cun.net/'

exports.is_online = 0

/**
 * get请求
 * @param route
 * @param query
 * @param headers
 * @returns {Promise<void>}
 */
exports.get = async function (route, query = {}, headers = {}) {
    query = common.empty(query) ? {} : query
    headers = common.empty(headers) ? {} : headers
    let data = {}
    if (!headers.hasOwnProperty('User-Agent')) {
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0'
    }
    const query_params = []
    if (Object.keys(query).length > 0) {
        for (const key in query) {
            query_params.push(key + "=" + query[key])
        }
        route += '?' + query_params.join('&')
    }
    await rp({url: route, headers, resolveWithFullResponse: true}).then(function (response) {
        if (parseInt(response.statusCode / 200) === 1 || parseInt(response.statusCode / 200) === 2) {
            if (parseInt(response.statusCode / 200) === 1) {
                data = JSON.parse(response.body)
                data.status_code = response.statusCode
                data.response = response.body
            } else {
                data = {
                    code: '409',
                    message: '系统错误',
                    status_code: response.statusCode,
                    response: response.body
                }
            }
        } else {
            data = {
                code: '409',
                message: '系统错误',
                status_code: response.statusCode,
                response: response.statusCode
            }
        }
    }).catch(function (err) {
        data = {message: '请求失败'}
    })
    return data
}

/**
 * post form 请求
 * @param route
 * @param body
 * @param headers
 * @returns {Promise<void>}
 */
exports.post = async function (route, body = {}, headers = {}) {
    headers = common.empty(headers) ? {} : headers
    let data = {}
    if (!headers.hasOwnProperty('User-Agent')) {
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0'
    }
    if (!headers.hasOwnProperty('content-Type')) {
        headers['content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
    }
    await rp({url: route, method: 'POST', form: body, headers, resolveWithFullResponse: true}).then(function (response) {
        if (parseInt(response.statusCode / 200) === 1 || parseInt(response.statusCode / 200) === 2) {
            if (parseInt(response.statusCode / 200) === 1) {
                data = JSON.parse(response.body)
                data.status_code = response.statusCode
                data.response = response.body
            } else {
                data = {
                    code: '409',
                    message: '系统错误',
                    status_code: response.statusCode,
                    response: response.body
                }
            }
        } else {
            data = {
                code: '409',
                message: '系统错误',
                status_code: response.statusCode,
                response: response.statusCode
            }
        }
    }).catch(function (err) {
        data = {message: '请求失败'}
        console.log(err)
    })
    return data
}

exports.upload = async function (route, path, headers = {}) {
    headers = common.empty(headers) ? {} : headers
    let data = {}
    await needle('post', route, {file: { file: path, content_type: 'text/plain' }}, { multipart : true, headers } )
        .then(function (response) {
            data = JSON.parse(response.body)
        }).catch(function (err) {
            data = {message: '请求失败'}
            console.log(err)
        })
    return data
}

exports.initOnlineStatus = async function () {
    // return 1
    await internetAvailable({
        domainName: this.domain_name,
        // port: 53,
        host: '223.6.6.6' // 默认，国内请改成114.114.114.114
    }).then(() => {
        this.is_online = 1
    }).catch(() => {
        this.is_online = 0
    });
    console.log("is_online:" + this.is_online)
    return this.is_online
}


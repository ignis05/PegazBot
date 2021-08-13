const { exit } = require('process')
const fs = require('fs')

/**
 * @typedef {Object} AuthObject
 * @property {string} token - discord bot token
 * @property {string} botOwnerId - discord user id of the bot owner
 * @property {string} login - pegaz login
 * @property {string} password - pegaz password
 */

/**
 * @typedef {Object} ChannelsObject
 * @property {Array<string>} alert - array of channel Ids where the bot will send notifications
 * @property {Array<string>} log - array of channel Ids where the bot will send logs
 */

/**
 * @typedef {Object} Config
 * @property {AuthObject} auth - auth data
 * @property {ChannelsObject} channels - channels data
 * @property {DownloadObject} download - downloaded data
 * @method updateDownload - updates pegaz download
 * @property {string} moodleToken - auth token used to scrape pegaz
 * @method updateMoodleToken - updates moodle token
 */

const authPlaceholder = {
	token: 'discord bot token',
	botOwnerId: 'discord user id of the bot owner',
	login: 'pegaz login (email address)',
	password: 'pegaz password',
}

const channelsPlaceholder = { alert: [], log: [] }

/** @type {Config} */
const result = {}

// auth - token and pegaz login info
try {
	let auth = require('../data/auth.json')
	if (auth == authPlaceholder) {
		console.log('data/auth.json file is a placeholder.')
		exit(0)
	}
	result.auth = auth
} catch (err) {
	if (!fs.existsSync('./data')) {
		fs.mkdirSync('./data')
	}
	fs.writeFileSync('./data/auth.json', JSON.stringify(authPlaceholder, null, 2))
	console.log('Created data/auth.json placeholder. Fill it before next start.')
	exit(0)
}

// channel lists
let channels
try {
	channels = require('../data/channels.json')
	result.channels = channels
} catch (err) {
	if (!fs.existsSync('./data')) {
		fs.mkdirSync('./data')
	}
	fs.writeFileSync('./data/channels.json', JSON.stringify(channelsPlaceholder, null, 2))
	result.channels = channelsPlaceholder
}

// pegaz download
let download
try {
	download = require('../data/pegazdownload.json')
} catch (err) {
	download = false
}
result.download = download
/**
 * Updates pegazdownload in config and writes it to json
 * @param {String} newDownload
 */
result.updateDownload = function (newDownload) {
	result.download = newDownload
	fs.writeFileSync('./data/pegazdownload.json', JSON.stringify(newDownload, null, 2))
}

// moodle token
let moodleToken
try {
	moodleToken = require('../data/moodleToken.json').moodleToken
	if (!moodleToken) throw 'invalid token'
} catch (err) {
	moodleToken = false
	fs.writeFileSync('./data/moodleToken.json', JSON.stringify({ moodleToken }, null, 2))
}
result.moodleToken = moodleToken
/**
 * Updates moodleToken in config and writes it to json
 * @param {String} newToken
 */
result.updateMoodleToken = function (newToken) {
	result.moodleToken = newToken
	fs.writeFileSync('./data/moodleToken.json', JSON.stringify({ moodleToken: newToken }, null, 2))
}

module.exports = result

const path = require('path')
const Discord = require('discord.js')
const fs = require('fs')
const _ = require('lodash')
const { Scraper, Root, CollectContent, OpenLinks } = require('nodejs-web-scraper')
const { resolve } = require('path')
const { isEmpty } = require('lodash')
const { exit } = require('process')

// #region load config

var auth
var COURSES

let authPlaceholder = {
	token: 'Discord bot token',
	MoodleSession: 'MoodleSession cookie copied from browser',
}
try {
	auth = require('./data/auth.json')
	if (auth == authPlaceholder) {
		console.error('Auth is a placeholder: You need to add auth info to ./data/auth.json')
		return
	}
} catch (err) {
	if (!fs.existsSync('./data')) {
		fs.mkdirSync('./data')
	}
	fs.writeFileSync('./data/auth.json', JSON.stringify(authPlaceholder, null, 2))
	console.error('Auth not found: You need to paste bot auth to ./data/auth.json')
	exit(0)
}
try {
	COURSES = require('./data/pegazdownload.json')
} catch (err) {
	COURSES = false
}

var { botOwnerID, channelID, logChannelID } = require('./data/config.json')
// #endregion load config

// #region scraper
var scraper
function createScraper(moodle_cookie) {
	return new Scraper({
		baseSiteUrl: 'https://pegaz.uj.edu.pl', //Mandatory.If your site sits in a subfolder, provide the path WITHOUT it.
		startUrl: 'https://pegaz.uj.edu.pl/my', //Mandatory. The page from which the process begins.
		logPath: './logs', //Highly recommended.Will create a log for each scraping operation(object).
		cloneImages: true, //If an image with the same name exists, a new file with a number appended to it is created. Otherwise. it's overwritten.
		showConsoleLogs: false, //Whether to show or hide messages.
		removeStyleAndScriptTags: true, // Removes any <style> and <script> tags found on the page, in order to serve Cheerio with a light-weight string. change this ONLY if you have to.
		concurrency: 3, //Maximum concurrent requests.Highly recommended to keep it at 10 at most.
		maxRetries: 1, //Maximum number of retries of a failed request.
		delay: 200,
		timeout: 6000,
		filePath: null, //Needs to be provided only if a "downloadContent" operation is created.
		auth: null, //Can provide basic auth credentials(no clue what sites actually use it).
		headers: {
			Cookie: 'MoodleSession=' + moodle_cookie,
		}, //Provide custom headers for the requests.
		proxy: null, //Use a proxy. Pass a full proxy URL, including the protocol and the port.
	})
}
var scraper = createScraper(auth.MoodleSession)
/**
 * Runs webscraper to get courses data
 * @returns {Promise<Array>} Promise object with an array of courses
 */
async function scrapePegaz() {
	return new Promise((resolve, reject) => {
		var courses = []

		function getPageObject(element) {
			courses.push(element)
		}

		const root = new Root()

		const course = new OpenLinks('a.list-group-item.list-group-item-action[data-parent-key="mycourses"]', { name: 'course', getPageObject })
		const title = new CollectContent('header#page-header h1', { name: 'title' })
		const tematy = new CollectContent('ul.topics div.content .sectionname', { name: 'topics' })
		const pliki = new CollectContent('ul.topics div.content .instancename', { name: 'files' })
		const ogloszenia = new OpenLinks('div.activityinstance a.aalink', { name: 'announcements', slice: [0, 1] })
		const ogl_titles = new CollectContent('tr.discussion th.topic a', { name: 'title' })

		root.addOperation(course)
		course.addOperation(title)
		course.addOperation(tematy)
		course.addOperation(pliki)
		course.addOperation(ogloszenia)
		ogloszenia.addOperation(ogl_titles)

		// console.log('started scraping')

		scraper
			.scrape(root)
			.then(() => {
				for (let course of courses) {
					/* console.log(course.title)
					console.log(course.address)
					console.log('------------------------') */
					course.announcements = course.announcements.data[0].data
				}
				// console.log('downloaded data')
				courses.sort((a, b) => a.title.localeCompare(b.title))
				// console.log('download successfull')
				resolve(courses)
			})
			.catch(err => {
				console.log(`error running check at ${new Date()}`)
				console.error(err)
				reject(err)
			})
	})
}
// #endregion scraper

// #region discord
/**
 * Saves COURSES to pegazdownload.json
 */
function saveCourses() {
	fs.writeFile('./data/pegazdownload.json', JSON.stringify(COURSES, null, 2), err => {
		if (err) console.error(err)
	})
}

function compareChanges(newCourses) {
	if (!newCourses || _.isEmpty(newCourses)) {
		return {}
	} else {
		changes = {}
		COURSES.forEach((course, i) => {
			newCourse = newCourses.find(c => c.title == course.title)
			if (!newCourse) return
			// console.log('---------------------------')
			// console.log(course)
			// console.log(newCourse)
			for (let key of ['topics', 'files', 'announcements']) {
				let diff = new Array(..._.clone(newCourse[key]))
				// console.log(diff)
				for (let el of course[key]) {
					let ind = diff.indexOf(el)
					if (ind !== -1) diff.splice(ind, 1)
				}
				if (diff.length == 0) continue
				if (!changes[course.title]) changes[course.title] = {}
				changes[course.title][key] = diff
			}
		})
		if (_.isEmpty(changes)) return {}
		return changes
	}
}

/**
 *
 * @param {Object} output Object returned from "reportChanges" function
 * @returns {Discord.MessageEmbed}
 */
function createEmbed(output) {
	let { diff, added, deleted } = output

	let fields = []
	for (let [key, item] of Object.entries(diff)) {
		fields.push({ name: key.split('[')[0], value: formatVal(item) })
	}

	// console.log(fields)

	const embed = new Discord.MessageEmbed().setColor('#0099ff').setTitle('New Pegaz Content').setURL('https://pegaz.uj.edu.pl/').addFields(fields).setTimestamp()

	if (added) embed.addField('---New Courses Found---', added)

	if (deleted) embed.addField('---New Courses Found---', deleted)

	return embed
}

/**
 * Creates string from changed files object
 * @param {Object} obj Object with changes groupped by keys
 * @returns {String} String with formatted information
 */
function formatVal(obj) {
	let prettyKeys = {
		topics: 'Tematy',
		files: 'Pliki',
		announcements: 'Ogłoszenia',
	}
	let outStr = ''
	for (let [key, value] of Object.entries(obj)) {
		if (!prettyKeys[key]) continue
		outStr += `**= ${prettyKeys[key]}:**\n`
		for (let item of value) {
			outStr += `- ${item}\n`
		}
	}

	return outStr
}

/**
 *	Runs webscraper and returns differences as object
 * @returns {Promise} Promise with object containing detected differences
 */
function reportChanges() {
	return new Promise(async (res, rej) => {
		var output = { added: null, deleted: null, diff: null, msg: null }
		if (!COURSES) {
			COURSES = await scrapePegaz().catch(err => {
				output.msg = 'failed to fetch data'
				res(output)
			})
			saveCourses()
			console.log('downloaded data first time')
			output.msg = 'no previous data - saved current download'
			return
		}

		var newCourses
		try {
			newCourses = await scrapePegaz()
		} catch (err) {
			output.msg = 'failed to fetch data'
			res(output)
			return
		}
		if (!newCourses || _.isEmpty(newCourses)) {
			output.msg = 'failed to fetch data'
			res(output)
			return
		}

		// check if all courses are there
		// console.log('new courses check')
		let newNames = newCourses.map(c => c.title)
		let names = COURSES.map(c => c.title)
		// console.log(names)
		// console.log(newNames)
		let added = _.difference(newNames, names)
		let deleted = _.difference(names, newNames)
		// console.log(added)
		// console.log(deleted)
		var addedOrDeleted = false
		if (!_.isEmpty(added)) {
			output.added = added.join('\n').slice(0, 1900)
			addedOrDeleted = true
		}
		if (!_.isEmpty(deleted)) {
			output.deleted = deleted.join('\n').slice(0, 1900)
			addedOrDeleted = true
		}

		// diff compare
		let diff = compareChanges(newCourses)
		if (!diff || _.isEmpty(diff)) {
			if (addedOrDeleted) {
				COURSES = newCourses
				console.log('added or deleted')
				saveCourses()
				res(output)
				return
			} else {
				output.msg = 'no differences'
				res(output)
				return
			}
		}
		output.diff = diff

		COURSES = newCourses
		saveCourses()
		res(output)
	})
}

const intents = new Discord.Intents()
const client = new Discord.Client({ intents })

client.on('ready', () => {
	client.users.fetch(botOwnerID).then(owner => {
		owner.send('Ready!')
	})
	console.log('Ready!')
	intervalChanges()
})

const interactions = [
	{
		name: 'ping',
		description: 'Replies with pong',
		options: [],
	},
	{
		name: 'check-now',
		description: 'Immediately runs webscraper and reports changes',
		options: [],
	},
	{
		name: 'update-token',
		description: "Updates token used for moodle authentication. (Ephemeral reply - command won't appear in channel)",
		options: [
			{
				name: 'token',
				type: 'STRING',
				description: 'value of MoodleSession cookie',
				required: true,
			},
		],
	},
	{
		name: 'set-channel',
		description: 'Changes channel where bot sends notifications',
		options: [
			{
				name: 'channel',
				type: 'CHANNEL',
				description: 'Text channel where notificatins will be sent',
				required: true,
			},
		],
	},
	{
		name: 'set-log-channel',
		description: 'Changes channel where bot sends notifications',
		options: [
			{
				name: 'channel',
				type: 'CHANNEL',
				description: 'Text channel where logs will be sent',
				required: true,
			},
		],
	},
]
// one time lauch - register interactions
client.once('ready', async () => {
	let testGuild = await client.guilds.fetch('467313439413501983')
	for (let interaction of interactions) {
		testGuild.commands.create(interaction)
		client.application.commands.create(interaction)
	}
})

client.on('interaction', async inter => {
	if (!inter.isCommand()) return

	switch (inter.commandName) {
		case 'ping':
			console.log('pong!')
			inter.reply(`Pong! (${Date.now() - inter.createdTimestamp}ms)`)
			break

		case 'check-now':
			inter.defer()
			let changes = await reportChanges()

			if (changes.msg) {
				inter.editReply(changes.msg)
				return
			}

			var embed = createEmbed(changes)

			if (inter.channel.guild) {
				if (!inter.channel.permissionsFor(inter.channel.guild.me).has('SEND_MESSAGES')) {
				} else if (inter.channel.permissionsFor(inter.channel.guild.me).has('EMBED_LINKS')) {
					inter.editReply(embed)
				} else {
					inter.editReply('failed to send message - make sure embed permissions are enabled for the bot')
				}
			} else {
				inter.editReply(embed)
			}
			break
		case 'update-token':
			inter.defer()

			auth.MoodleSession = inter.options[0].value

			fs.writeFile('./data/auth.json', JSON.stringify(auth, null, 2), err => {
				if (err) console.error(err)
			})
			scraper = createScraper(auth.MoodleSession)

			inter.editReply('Updated moodle authentication token succesfully.', { ephemeral: true })
			break
		case 'set-channel':
			inter.defer()

			let newChannelID = inter.options[0].value
			let ch = await client.channels.fetch(newChannelID)
			if (!ch.isText()) return inter.editReply('Specified channel is not a text channel', { ephemeral: true })

			if (channelID == newChannelID) {
				return inter.editReply('This channel is already set as notification channel', { ephemeral: true })
			}
			channelID = newChannelID
			fs.writeFile('./data/config.json', JSON.stringify({ channelID, logChannelID, botOwnerID }, null, 2), err => {
				if (err) console.error(err)
			})
			inter.editReply('Updated notification channel.')
			break
		case 'set-log-channel':
			inter.defer()

			let newLogChannelID = inter.options[0].value
			let lch = await client.channels.fetch(newLogChannelID)
			if (!lch.isText()) return inter.editReply('Specified channel is not a text channel', { ephemeral: true })

			if (logChannelID == newLogChannelID) {
				return inter.editReply('This channel is already set as log channel', { ephemeral: true })
			}
			logChannelID = newLogChannelID
			fs.writeFile('./data/config.json', JSON.stringify({ channelID, logChannelID, botOwnerID }, null, 2), err => {
				if (err) console.error(err)
			})
			inter.editReply('Updated log channel.')
			break
	}
})

/**
 * Runs reportChanges and sends notification to channels. Made for being an argiment for setInterval
 */
async function intervalChanges() {
	let channel = await client.channels.fetch(channelID)
	let logChannel = await client.channels.fetch(logChannelID)

	logChannel.send(`running check at ${new Date()}`)

	let changes = await reportChanges()

	if (changes.msg) {
		logChannel.send(changes.msg)
		if (changes.msg != 'no differences') channel.send(changes.msg)
		return
	}

	var embed = createEmbed(changes)

	if (channel.guild) {
		if (!channel.permissionsFor(channel.guild.me).has('SEND_MESSAGES')) {
		} else if (channel.permissionsFor(channel.guild.me).has('EMBED_LINKS')) {
			channel.send(embed)
		} else {
			channel.send('failed to send message - make sure embed permissions are enabled for the bot')
		}
	} else {
		channel.send(embed)
	}
}

client.setInterval(intervalChanges, 900000)

client.on('error', console.error)
client.login(auth.token)
// #endregion discord

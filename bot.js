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

var { botOwnerID, channelID } = require('./data/config.json')
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
async function scrapePegaz() {
	return new Promise((resolve, reject) => {
		var courses = []

		function getPageObject(element) {
			courses.push(element)
		}

		const root = new Root()

		const course = new OpenLinks('a.list-group-item.list-group-item-action[data-parent-key="mycourses"]', { name: 'course', getPageObject })
		const title = new CollectContent('h1', { name: 'title' })
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

		console.log('started scraping')

		scraper
			.scrape(root)
			.then(() => {
				for (let course of courses) {
					course.announcements = course.announcements.data[0].data
				}
				console.log('downloaded data')
				courses.sort((a, b) => a.title.localeCompare(b.title))
				console.log('download successfull')
				resolve(courses)
			})
			.catch(err => {
				console.error(err)
				reject(err)
			})
	})
}
// #endregion scraper

// #region discord
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

async function reportChanges(channel, verbose = false) {
	if (!COURSES) {
		COURSES = await scrapePegaz().catch(err => {
			channel.send('failed to fetch data')
		})
		saveCourses()
		console.log('downloaded data first time')
		return channel.send('downloaded data for the first time')
	}

	var newCourses
	try {
		newCourses = await scrapePegaz()
	} catch (err) {
		return channel.send('failed to fetch data')
	}
	if (!newCourses) return

	// diff compare
	let diff = compareChanges(newCourses)
	// console.log(diff)
	if (!diff || _.isEmpty(diff)) {
		if (verbose) channel.send('no differences')
		return console.log('no differences')
	}

	// #region embed
	var formatVal = obj => {
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

	let fields = []
	for (let [key, item] of Object.entries(diff)) {
		fields.push({ name: key.split('[')[0], value: formatVal(item) })
	}

	// console.log(fields)

	const embed = new Discord.MessageEmbed().setColor('#0099ff').setTitle('New Pegaz Content').setURL('https://pegaz.uj.edu.pl/').addFields(fields).setTimestamp()
	// #endregion embed

	if (channel.guild) {
		if (!channel.permissionsFor(channel.guild.me).has('SEND_MESSAGES')) {
			// remove channel from list
		} else if (channel.permissionsFor(channel.guild.me).has('EMBED_LINKS')) {
			channel.send(embed)
		} else {
			channel.send(JSON.stringify(diff, null, 4))
		}
	} else {
		channel.send(embed)
	}

	// check if all courses are there
	let newNames = newCourses.map(c => c.title)
	let names = COURSES.map(c => c.title)
	let added = _.difference(newNames, names)
	let deleted = _.difference(names, newNames)
	if (!_.isEmpty(added)) {
		channel.send(`New course(s) found:\n${added}`)
	}
	if (!_.isEmpty(deleted)) {
		channel.send(`Some courses were not accessible and were removed:\n${deleted}`)
	}

	COURSES = newCourses
	saveCourses()
}

const client = new Discord.Client()

client.on('ready', () => {
	client.users.fetch(botOwnerID).then(owner => {
		owner.send('Ready!')
	})
	console.log('Ready!')
})

client.on('message', async msg => {
	// only me
	if (msg.author.id != botOwnerID) return

	// mentioned
	if (msg.mentions.users.find(user => user.id == client.user.id)) {
		console.log('its me')
		var cmd = msg.content.trim().split(' ')[1].toLowerCase()
		var arg = msg.content.trim().split(' ')
		arg.shift()
		arg.shift()
		arg = arg.join(' ')
		console.log(cmd)
		console.log(arg)
		switch (cmd) {
			case 'ping':
				console.log('pong!')
				msg.reply(`Pong! (${Date.now() - msg.createdTimestamp}ms)`)
			case 'reload':
			case 'refresh':
			case 'refreshnow':
			case 'check':
			case 'checknow':
			case 'update':
				reportChanges(msg.channel, true)
				break
			case 'token':
			case 'cookie':
			case 'updatecookie':
			case 'updatetoken':
				auth.MoodleSession = arg.trim()
				fs.writeFile('./data/auth.json', JSON.stringify(auth, null, 2), err => {
					if (err) console.error(err)
				})
				scraper = createScraper(auth.MoodleSession)
				msg.channel.send('Updated moodle authentication token succesfully.')
				break
			case 'channel':
			case 'setchannel':
			case 'updatechannel':
				if (channelID == msg.channel.id) {
					return msg.channel.send('This channel is already selected')
				}
				channelID = msg.channel.id
				fs.writeFile('./data/config.json', JSON.stringify({ channelID, botOwnerID }, null, 2), err => {
					if (err) console.error(err)
				})
				msg.reply('Updated channel')
				break
		}
	}
})

async function intervalChanges() {
	console.log(`running check at ${new Date()}`)
	let channel = await client.channels.fetch(channelID)
	reportChanges(channel)
}

client.setInterval(intervalChanges, 900000)

client.on('error', console.error)
client.login(auth.token)
// #endregion discord

const path = require('path')
const Discord = require('discord.js')
const fs = require('fs')
const _ = require('lodash')
const { Scraper, Root, CollectContent, OpenLinks } = require('nodejs-web-scraper')
const { resolve } = require('path')
const { isEmpty } = require('lodash')

// #region load config

var auth
var COURSES

let authPlaceholder = {
	token: 'bot_token_here',
	username: 'pegaz_login',
	passwd: 'pegaz_password',
}
try {
	auth = require('./data/auth.json')
	if (auth == authPlaceholder) {
		console.error('Auth is a placeholder: You add auth info to ./data/auth.json')
		return
	}
} catch (err) {
	if (!fs.existsSync('./data')) {
		fs.mkdirSync('./data')
	}
	fs.writeFileSync('./data/auth.json', JSON.stringify(authPlaceholder, null, 2))
	console.error('Auth not found: You need to paste bot auth to ./data/auth.json')
	return
}
try {
	COURSES = require('./data/pegazdownload.json')
} catch (err) {
	COURSES = false
}
// #endregion load config

// #region scraper
const scraper = new Scraper({
	baseSiteUrl: 'https://pegaz.uj.edu.pl', //Mandatory.If your site sits in a subfolder, provide the path WITHOUT it.
	startUrl: 'https://pegaz.uj.edu.pl/my', //Mandatory. The page from which the process begins.
	logPath: './logs', //Highly recommended.Will create a log for each scraping operation(object).
	cloneImages: true, //If an image with the same name exists, a new file with a number appended to it is created. Otherwise. it's overwritten.
	showConsoleLogs: false, //Whether to show or hide messages.
	removeStyleAndScriptTags: true, // Removes any <style> and <script> tags found on the page, in order to serve Cheerio with a light-weight string. change this ONLY if you have to.
	concurrency: 3, //Maximum concurrent requests.Highly recommended to keep it at 10 at most.
	maxRetries: 5, //Maximum number of retries of a failed request.
	delay: 200,
	timeout: 6000,
	filePath: null, //Needs to be provided only if a "downloadContent" operation is created.
	auth: null, //Can provide basic auth credentials(no clue what sites actually use it).
	headers: {
		Cookie: 'MoodleSession=vvdk84e8hrfuj9lck0p8gmkc83',
	}, //Provide custom headers for the requests.
	proxy: null, //Use a proxy. Pass a full proxy URL, including the protocol and the port.
})
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

		scraper
			.scrape(root)
			.then(() => {
				for (let course of courses) {
					course.announcements = course.announcements.data[0].data
				}
				console.log('downloaded data')
				courses.sort((a, b) => a.title.localeCompare(b.title))
				resolve(courses)
			})
			.catch(err => {
				console.error(err)
				reject(err)
			})
	})
}
// #endregion scraper

function saveCourses() {
	fs.writeFile('./data/pegazdownload.json', JSON.stringify(COURSES, null, 2), err => {
		if (err) console.error(err)
	})
}

async function compareChanges() {
	return new Promise(async (resolve, reject) => {
		let newCourses = await scrapePegaz().catch(err => reject(err))
		if (!COURSES) {
			COURSES = newCourses
			saveCourses()
			resolve(false)
		} else {
			changes = {}
			COURSES.forEach((course, i) => {
				newCourse = newCourses[i]
				// console.log('---------------------------')
				// console.log(course)
				// console.log(newCourse)
				for (let key of ['topics', 'files', 'announcements']) {
					let diff = _.difference(newCourse[key], course[key])
					// console.log('diff')
					// console.log(diff)
					// console.log('---------------------------')
					if (diff.length == 0) continue
					if (!changes[course.title]) changes[course.title] = {}
					changes[course.title][key] = diff
				}
			})
			COURSES = newCourses
			saveCourses()
			if (_.isEmpty(changes)) return resolve(false)
			resolve(changes)
		}
	})
}

const client = new Discord.Client()
const botOwnerID = '226032144856776704'

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
		var cmd = msg.content.split(' ')[1]
		var arg = msg.content.split(' ')
		arg.shift()
		arg.shift()
		arg = arg.join(' ')
		console.log(cmd)
		console.log(arg)
		switch (cmd) {
			case 'reload':
			case 'refreshnow':
				if (!COURSES) {
					COURSES = await scrapePegaz().catch(err => {
						msg.channel.send('failed to fetch data')
					})
					saveCourses()
					console.log('downloaded data first time')
					return msg.channel.send('downloaded data for the first time')
				}
				let diff = await compareChanges().catch(err => {
					msg.channel.send('failed to fetch data')
				})
				if (!diff || _.isEmpty(diff)) {
					msg.channel.send('no differences')
					return console.log('no differences')
				}
				console.log(diff)
				msg.channel.send(JSON.stringify(diff, null, 4))
		}
	}
})

async function intervalChanges() {
	console.log(`running check at ${new Date()}`)
	let channel = await client.channels.fetch('764874817140555806')
	if (!COURSES) {
		COURSES = await scrapePegaz().catch(err => {
			channel.send('failed to fetch data')
		})
		saveCourses()
		console.log('downloaded data first time')
		return channel.send('downloaded data for the first time')
	}
	let diff = await compareChanges().catch(err => {
		channel.send('failed to fetch data')
	})
	if (!diff || _.isEmpty(diff)) {
		return console.log('no differences')
	}
	console.log(diff)
	channel.send(JSON.stringify(diff, null, 4))
}

client.setInterval(intervalChanges, 900000)

client.on('error', console.error)
client.login(auth.token)

const path = require('path')
const Discord = require('discord.js')
const fs = require('fs')
const { Scraper, Root, CollectContent, OpenLinks } = require('nodejs-web-scraper')

// #region load config
var auth
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
// #endregion load config

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
		Cookie: 'MoodleSession=rs4mb10kp6ls1p0bv7nrio1ikh',
	}, //Provide custom headers for the requests.
	proxy: null, //Use a proxy. Pass a full proxy URL, including the protocol and the port.
})

var courses = []

function getPageObject(element) {
	courses.push(element)
}

const root = new Root()
// const getcourses = new CollectContent('a.aalink.coursename', { name: 'title', getPageObject })
// root.addOperation(getcourses)

const course = new OpenLinks('a.list-group-item.list-group-item-action[data-parent-key="mycourses"]', { name: 'course', getPageObject })
const title = new CollectContent('h1', { name: 'title' })
const ogloszenia = new CollectContent('ul.topics div.content', { name: 'topics'})

root.addOperation(course)
course.addOperation(title)
course.addOperation(ogloszenia)

scraper.scrape(root).then(() => {
	console.log(courses)
})

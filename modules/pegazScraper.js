const { Scraper, Root, CollectContent, OpenLinks } = require('nodejs-web-scraper')
const delay = require('delay')
const puppeteer = require('puppeteer')
const isWindows = require('os').platform() === 'win32'

const config = require('./config')

/**
 *
 * @param {Array} courses
 * @returns {Array<Object>} formatted courses
 */
function formatCourses(courses) {
	var result = []
	for (let course of courses) {
		let url = new URL(course.address)
		let id = url.searchParams.get('id')
		let params = {}
		for (let prop of course.data) {
			switch (prop.name) {
				case 'title':
					params.name = prop.data[0]
					break
				case 'files':
					params.files = prop.data
					break
				case 'topics':
					params.sections = prop.data
					break
				case 'announcements':
					params.announcements = prop.data[0].data[0].data
					break
				case 'grades':
					let grades = []
					let names = prop.data[0].data.find(el => el.name === 'g_name').data
					let values = prop.data[0].data.find(el => el.name === 'g_value').data
					for (let i in names) {
						grades.push({
							name: names[i],
							value: values[i],
						})
					}
					params.grades = grades
					break
			}
		}
		result.push({ id, url: course.address, ...params })
	}
	return result
}

module.exports = {
	/**
	 * Scrapes pegaz and compares changes
	 */
	scrapingOperation() {
		return new Promise(async (resolve, reject) => {
			let newCourses
			try {
				newCourses = await this.scrapePegaz()
			} catch (err) {
				// rejected because moodle token was updated - try again
				if (err === 'token updated') {
					try {
						newCourses = await this.scrapePegaz()
					} catch (err2) {
						console.error(err2)
						reject(err2)
					}
				}
				// other errors
				else {
					console.error(err)
					reject(err)
				}
			}
			
			console.log(newCourses)
			resolve('xd')
		})
	},

	/**
	 * Runs webscraper to get courses data
	 * @returns {Promise<Array>} Promise object with an array of courses
	 */
	scrapePegaz() {
		return new Promise(async (resolve, reject) => {
			const scraper = new Scraper({
				baseSiteUrl: 'https://pegaz.uj.edu.pl',
				startUrl: 'https://pegaz.uj.edu.pl/my',
				logPath: './logs',
				cloneImages: true,
				showConsoleLogs: false,
				removeStyleAndScriptTags: true,
				concurrency: 3,
				maxRetries: 1,
				delay: 200,
				timeout: 6000,
				filePath: null,
				auth: null,
				headers: {
					Cookie: 'MoodleSession=' + config.moodleToken,
				},
				proxy: null,
			})

			const root = new Root()
			const courses = new OpenLinks('a.list-group-item.list-group-item-action[data-parent-key="mycourses"]')
			const title = new CollectContent('div#page-navbar a[aria-current="page"]', { name: 'title' })
			const topics = new CollectContent('ul.topics div.content .sectionname', { name: 'topics' })
			const pliki = new CollectContent('ul.topics div.content .instancename', { name: 'files' })
			const announcements = new OpenLinks('div.activityinstance a.aalink', { name: 'announcements', slice: [0, 1] })
			const ann_titles = new CollectContent('tr.discussion th.topic a', { name: 'title' })
			const grades = new OpenLinks('a.list-group-item.list-group-item-action[data-key="grades"]', { name: 'grades' })
			const grade_name = new CollectContent('a.gradeitemheader', { name: 'g_name' })
			const grade_val = new CollectContent('td.column-grade', { name: 'g_value' })

			root.addOperation(courses)
			courses.addOperation(title)
			courses.addOperation(topics)
			courses.addOperation(pliki)
			courses.addOperation(announcements)
			announcements.addOperation(ann_titles)
			courses.addOperation(grades)
			grades.addOperation(grade_name)
			grades.addOperation(grade_val)

			// console.log('started scraping')

			scraper
				.scrape(root)
				.then(async () => {
					// token expired and pegaz is redirecting to login page
					if (root.getErrors()?.[0]?.includes('Error: maximum redirect reached')) {
						console.log('redirect error - token might be expired')
						await this.getNewToken()
						return reject('token updated')
					}

					resolve(formatCourses(courses.getData()))
				})
				.catch(err => {
					console.log(`error running check at ${new Date()}`)
					console.error(err)
					reject(err)
				})
		})
	},

	/**
	 * Logs in to pegaz and saves new token
	 * @returns {Promise} Promise object when done
	 */
	getNewToken() {
		return new Promise(async (resolve, reject) => {
			console.log('getting new moodle token')
			const browser = await puppeteer.launch(isWindows ? {} : { executablePath: 'chromium-browser' })
			const page = await browser.newPage()
			await page.goto('https://pegaz.uj.edu.pl/my/')

			// sign in
			await page.focus('input[id="username"]')
			await page.keyboard.type(config.auth.login)
			await page.focus('input[id="password"]')
			await page.keyboard.type(config.auth.password)
			await page.click('input[name="submit"]')

			// get pegaz cookies
			await delay(2000)
			const cookies = await page.cookies()

			await browser.close()

			// get moodle cookie
			var moodleCookie = cookies.find(el => el.name == 'MoodleSession')
			if (!moodleCookie) {
				console.log('getting token failed')
				reject('failed')
			}
			moodleToken = moodleCookie.value
			config.updateMoodleToken(moodleToken)

			console.log('new moodle token received')
			resolve(moodleToken)
		})
	},
}

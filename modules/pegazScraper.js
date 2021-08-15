const { Scraper, Root, CollectContent, OpenLinks } = require('nodejs-web-scraper')
const delay = require('delay')
const puppeteer = require('puppeteer')
const isWindows = require('os').platform() === 'win32'
const _ = require('lodash')
const cheerio = require('cheerio')

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
					let files = []
					for (let file of prop.data) {
						let vdom = cheerio.load(file)
						let link = vdom('a').attr('href')
						vdom('span.accesshide').remove()
						let id
						let text = vdom('a').text()
						let type = vdom('span.resourcelinkdetails').text() || 'unknown'
						// fallback to text for manually created grades
						if (!link) id = text
						else {
							let url = new URL(link)
							id = url.searchParams.get('id')
						}
						files.push({
							id: id,
							text: text,
							link: link,
							type: type,
						})
					}
					params.files = files
					break
				case 'topics':
					params.sections = prop.data
					break
				case 'announcements':
					let announcements = []
					// apparently forums can be disabled
					if (!prop.data[0]?.data[0]?.data) {
						params.announcements = []
						break
					}
					for (let ann of prop.data[0]?.data[0]?.data) {
						let vdom = cheerio.load(ann)
						let link = vdom('a')
						let url = new URL(link.attr('href'))
						let id = url.searchParams.get('d')
						let title = link.attr('title')
						announcements.push({
							id: id,
							link: link.attr('href'),
							title: title,
						})
					}
					params.announcements = announcements
					break
				case 'grades':
					let grades = []
					let names = prop.data[0].data.find((el) => el.name === 'g_name').data
					let values = prop.data[0].data.find((el) => el.name === 'g_value').data
					for (let i in names) {
						let vdom = cheerio.load(names[i])
						let link = vdom('a').attr('href')
						let g_id
						let text = vdom.text()
						// fallback to text for manually created grades
						if (!link) g_id = text
						else {
							let url = new URL(link)
							g_id = url.searchParams.get('id')
						}
						grades.push({
							id: g_id,
							name: text,
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

/**
 * Runs webscraper to get courses data
 * @returns {Promise<Array>} Promise object with an array of courses
 */
function scrapePegaz() {
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
		const files = new CollectContent('li.activity.resource div.activityinstance', { name: 'files', contentType: 'html' })
		const announcements = new OpenLinks('li.activity.forum a.aalink', { name: 'announcements', slice: [0, 1] })
		const ann_titles = new CollectContent('tr.discussion th.topic', { name: 'title', contentType: 'html' })
		const grades = new OpenLinks('a.list-group-item.list-group-item-action[data-key="grades"]', { name: 'grades' })
		const grade_name = new CollectContent('th.column-itemname.level2', { name: 'g_name', contentType: 'html' })
		const grade_val = new CollectContent('td.column-grade.level2', { name: 'g_value' })

		root.addOperation(courses)
		courses.addOperation(title)
		courses.addOperation(topics)
		courses.addOperation(files)
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
					await getNewToken()
					return reject('token updated')
				}

				resolve(formatCourses(courses.getData()))
			})
			.catch((err) => {
				console.log(`error running check at ${new Date()}`)
				console.error(err)
				reject(err)
			})
	})
}

/**
 * Logs in to pegaz and saves new token
 * @returns {Promise} Promise object when done
 */
function getNewToken() {
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
		var moodleCookie = cookies.find((el) => el.name == 'MoodleSession')
		if (!moodleCookie) {
			console.log('getting token failed')
			reject('failed')
		}
		moodleToken = moodleCookie.value
		config.updateMoodleToken(moodleToken)

		console.log('new moodle token received')
		resolve(moodleToken)
	})
}

// const result = { added: addedCourses, removed: deletedCourses, changed: [] }

/**
 * @typedef {Object} Changes
 * @property {Array<Object>} added - newly added courses
 * @property {Array<Object>} removed - courses that were no longer accessible
 * @property {Array<Object>} changed - courses that were changed with additional 'changes' property
 */

/**
 * @typedef {Object} ScrapedData
 * @property {boolean} success - whether scraper was able to access the website
 * @property {('token update failed'|'token updated, scraping failed'|'scraping failed'|'first download'|'differences found'|'no differences')} msg - status message
 * @property {Error} [err] - if success=false details will be here
 * @property {Changes} [result] - if success=true any found differences will be there
 */

/**
 * Perfroms web scraping operation on pegaz.
 * Automatically refreshes token as needed.
 * Doesnt reject promise, in case of fail returns {success:false}.
 * Automatically updates pegazdownload.json for future references.
 * @return {Promise<ScrapedData>} with success and msg properties and optional result or err properties
 */
module.exports = function scrapingOperation() {
	return new Promise(async (resolve, reject) => {
		let newCourses
		// --- scrape pegaz ---
		try {
			newCourses = await scrapePegaz()
		} catch (err) {
			// rejected because moodle token was updated - try again
			if (err === 'token updated') {
				try {
					newCourses = await scrapePegaz()
				} catch (err2) {
					if (err === 'token updated') {
						return resolve({ success: false, msg: 'token update failed' })
					}
					console.error(err2)
					return resolve({ success: false, msg: 'token updated, scraping failed', err: err2 })
				}
			}
			// other errors
			else {
				console.error(err)
				return resolve({ success: false, msg: 'scraping failed', err })
			}
		}

		// --- compare with previous ---

		// no previus data
		if (!config.download) {
			config.updateDownload(newCourses)
			return resolve({ success: true, msg: 'first download' })
		}

		let oldCourses = config.download

		// detect adder or deleted courses
		let newIdMap = newCourses.map((el) => el.id)
		let oldIdMap = oldCourses.map((el) => el.id)
		let addedCourseIds = _.difference(newIdMap, oldIdMap)
		let deletedCourseIds = _.difference(oldIdMap, newIdMap)
		let addedCourses = newCourses.filter((course) => addedCourseIds.includes(course.id))
		let deletedCourses = oldCourses.filter((course) => deletedCourseIds.includes(course.id))

		/** @type {Changes} */
		const result = { added: addedCourses, removed: deletedCourses, changed: [] }

		for (let course of newCourses) {
			// skip new courses
			if (addedCourseIds.includes(course.id)) continue
			let isChanged = false

			// compare old and new
			let newCourse = _.cloneDeep(course)
			let oldCourse = oldCourses.find((el) => el.id === newCourse.id)
			for (let key of Object.keys(newCourse)) {
				// for items with ids
				if (['grades', 'files', 'announcements'].includes(key)) {
					let newIds = newCourse[key].map((el) => el.id)
					let oldIds = oldCourse[key].map((el) => el.id)

					let addedIds = _.difference(newIds, oldIds)
					let deletedIds = _.difference(oldIds, newIds)

					let addedEls = newCourse[key].filter((el) => addedIds.includes(el.id))
					let deletedEls = oldCourse[key].filter((el) => deletedIds.includes(el.id))
					// existing elements with changed value or name
					let changedEls = []
					for (let newEl of newCourse[key]) {
						if (addedIds.includes(newEl.id)) continue

						let changedEl = { id: newEl.id, orig: newEl }
						let oldEl = oldCourse[key].find((el) => el.id === newEl.id)
						for (let key of Object.keys(newEl)) {
							if (newEl[key] !== oldEl[key])
								changedEl[key] = {
									old: oldEl[key],
									new: newEl[key],
								}
						}
						if (Object.keys(changedEl).length > 2) {
							changedEls.push(changedEl)
						}
					}

					if (addedEls.length + deletedEls.length + changedEls.length > 0) {
						if (!isChanged) {
							isChanged = true
							newCourse.changes = {}
							result.changed.push(newCourse)
						}
						newCourse.changes[key] = {
							added: addedEls,
							removed: deletedEls,
							changed: changedEls,
						}
					}
				}
				// compare data arrays
				else if (Array.isArray(newCourse[key])) {
					let added = _.difference(newCourse[key], oldCourse[key])
					let removed = _.difference(oldCourse[key], newCourse[key])
					if (added.length + removed.length > 0) {
						if (!isChanged) {
							isChanged = true
							newCourse.changes = {}
							result.changed.push(newCourse)
						}
						newCourse.changes[key] = {
							added,
							removed,
						}
					}
				}
				// compare strings like course name
				else {
					if (newCourse[key] !== oldCourse[key]) {
						if (!isChanged) {
							isChanged = true
							newCourse.changes = {}
							result.changed.push(newCourse)
						}
						newCourse.changes[key] = {
							old: oldCourse[key],
							new: newCourse[key],
						}
					}
				}
			}
		}
		if (result.added.length + result.removed.length + result.changed.length > 0) {
			resolve({ success: true, msg: 'differences found', result })
			config.updateDownload(newCourses)
		} else {
			resolve({ success: true, msg: 'no differences' })
		}
	})
}

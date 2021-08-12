const Discord = require('discord.js')
const fs = require('fs')
const _ = require('lodash')

const config = require('./modules/config')



function saveCourses() {
	fs.writeFile('./data/pegazdownload.json', JSON.stringify(download, null, 2), err => {
		if (err) console.error(err)
	})
}

function compareChanges(newCourses) {
	if (!newCourses || _.isEmpty(newCourses)) {
		return {}
	} else {
		changes = {}
		download.forEach((course, i) => {
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

	const embed = new Discord.MessageEmbed()
		.setColor('#0099ff')
		.setTitle('New Pegaz Content')
		.setURL('https://pegaz.uj.edu.pl/')
		.addFields(fields)
		.setTimestamp()

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
		if (!download) {
			download = await scrapePegaz().catch(err => {
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

		let date = new Date().toLocaleString('pl-PL').split(', ')
		date.reverse()
		date = date.join(', ')
		client.user.setActivity(`Last check: ${date}`)

		// check if all courses are there
		// console.log('new courses check')
		let newNames = newCourses.map(c => c.title)
		let names = download.map(c => c.title)
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
				download = newCourses
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

		download = newCourses
		saveCourses()
		res(output)
	})
}

const intents = new Discord.Intents()
const client = new Discord.Client({ intents })

client.on('ready', () => {
	client.users.fetch(auth.botOwnerId).then(owner => {
		owner.send('Ready!')
	})
	console.log('Ready!')
	intervalChanges()
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
		case 'set-channel':
			inter.defer()

			let newChannelID = inter.options[0].value
			let ch = await client.channels.fetch(newChannelID)
			if (!ch.isText()) return inter.editReply('Specified channel is not a text channel', { ephemeral: true })

			if (channelID == newChannelID) {
				return inter.editReply('This channel is already set as notification channel', { ephemeral: true })
			}
			channelID = newChannelID
			fs.writeFile('./data/config.json', JSON.stringify({ channelID, logChannelID }, null, 2), err => {
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
			fs.writeFile('./data/config.json', JSON.stringify({ channelID, logChannelID }, null, 2), err => {
				if (err) console.error(err)
			})
			inter.editReply('Updated log channel.')
			break
	}
})

/**
 * Runs reportChanges and sends notifications to channels. Made for being an argument for setInterval
 */
async function intervalChanges() {
	let channel = await client.channels.fetch(channelID)
	let logChannel = await client.channels.fetch(logChannelID)

	if (logChannel) logChannel.send(`running check at ${new Date()}`)

	let changes = await reportChanges()

	if (changes.msg) {
		if (logChannel) logChannel.send(changes.msg)
		if (changes.msg != 'no differences') channel.send(changes.msg)
		return
	}

	var embed = createEmbed(changes)
	channel.send(embed)
}

setInterval(intervalChanges, 900000)

client.on('error', console.error)
client.login(auth.token)
// #endregion discord

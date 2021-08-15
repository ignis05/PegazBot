const scrapingOperation = require('../modules/pegazScraper')
const broadcastMsg = require('../modules/messageBroadcaster')
const createEmbeds = require('../modules/embedCreator')

/** @typedef {import("discord.js").CommandInteraction} CommandInteraction */

module.exports = {
	interaction: {
		name: 'check-now',
		description: 'Immediately runs webscraper and reports changes',
		options: [],
	},
	/** @param {CommandInteraction} inter */
	async handler(inter) {
		await inter.deferReply({ ephemeral: true })

		let response = await scrapingOperation()

		if (response.success) {
			let date = new Date().toLocaleString('pl-PL').split(', ')
			date.reverse()
			date = date.join(', ')
			inter.client.user.setActivity(`Last check: ${date}`, { type: 'WATCHING' })
			inter.client.user.setStatus('online')
		} else {
			inter.client.user.setStatus('dnd')
		}

		switch (response.msg) {
			case 'scraping failed':
			case 'token updated, scraping failed':
				console.log('scraping failed')
				await inter.editReply(`Failed to retrieve data from pegaz.`)
				break
			case 'token update failed':
				console.log('token update failed')
				await inter.editReply(`Login failed.`)
				break
			case 'first download':
				await inter.editReply(`Succesfully downloaded data for the first time.`)
				break
			case 'no differences':
				await inter.editReply(`Check complete: no differences found.`)
				break
			case 'differences found':
				await inter.editReply(`Check complete: differences found and reported.`)
				let embeds = createEmbeds(response.result)
				broadcastMsg(inter.client, { embeds })
		}
	},
}

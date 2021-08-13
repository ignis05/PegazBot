const scraper = require('../modules/pegazScraper')

/** @typedef {import("discord.js").CommandInteraction} CommandInteraction */

module.exports = {
	interaction: {
		name: 'check-now',
		description: 'Immediately runs webscraper and reports changes',
		options: [],
	},
	/** @param {CommandInteraction} inter */
	async handler(inter) {
		inter.defer()
		let changes = await scraper.scrapingOperation()

		console.log(changes)
		inter.editReply('done')
	},
}

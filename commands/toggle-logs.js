/** @typedef {import("discord.js").CommandInteraction} CommandInteraction */
const config = require('../modules/config')

module.exports = {
	interaction: {
		name: 'toggle-logs',
		description: 'Toggles web scraping logs in current channel',
		options: [],
	},
	/** @param {CommandInteraction} inter */
	async handler(inter) {
		if (config.channels.log.includes(inter.channel.id)) {
			if (config.channels.del(inter.channel.id, true)) inter.reply({ content: 'Disabled logs in this channel.', ephemeral: true })
			else inter.reply({ content: 'Error: something went wrong', ephemeral: true })
		} else {
			if (config.channels.add(inter.channel.id, true)) inter.reply({ content: 'Enabled logs in this channel.', ephemeral: true })
			else inter.reply({ content: 'Error: something went wrong', ephemeral: true })
		}
	},
}

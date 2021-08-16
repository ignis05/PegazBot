/** @typedef {import("discord.js").CommandInteraction} CommandInteraction */
const config = require('../modules/config')

module.exports = {
	interaction: {
		name: 'toggle-alerts',
		description: 'Toggles new content alerts in current channel',
		options: [],
	},
	/** @param {CommandInteraction} inter */
	async handler(inter) {
		if (config.channels.alert.includes(inter.channel.id)) {
			if (config.channels.del(inter.channel.id)) inter.reply({ content: 'Disabled alerts in this channel.', ephemeral: true })
			else inter.reply({ content: 'Error: something went wrong', ephemeral: true })
		} else {
			if (config.channels.add(inter.channel.id)) inter.reply({ content: 'Enabled alerts in this channel.', ephemeral: true })
			else inter.reply({ content: 'Error: something went wrong', ephemeral: true })
		}
	},
}

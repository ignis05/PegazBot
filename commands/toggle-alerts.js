const { CommandInteraction } = require('discord.js')

module.exports = {
	interaction: {
		name: 'toggle-alerts',
		description: 'Toggles new content alerts in current channel',
		options: [],
	},
	/** @param {CommandInteraction} inter */
	async handler(inter) {
		inter.defer()

		let newChannelID = inter.options[0].value
		let ch = await client.channels.fetch(newChannelID)
		if (!ch.isText()) return inter.editReply('Specified channel is not a text channel', { ephemeral: true })

		if (channelID == newChannelID) {
			return inter.editReply('This channel is already set as notification channel', { ephemeral: true })
		}
		channelID = newChannelID
		fs.writeFile('./data/config.json', JSON.stringify({ channelID, logChannelID }, null, 2), (err) => {
			if (err) console.error(err)
		})
		inter.editReply('Updated notification channel.')
	},
}

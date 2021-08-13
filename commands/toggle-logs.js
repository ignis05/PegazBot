/** @typedef {import("discord.js").CommandInteraction} CommandInteraction */

module.exports = {
	interaction: {
		name: 'toggle-logs',
		description: 'Toggles web scraping logs in current channel',
		options: [],
	},
	/** @param {CommandInteraction} inter */
	async handler(inter) {
		inter.defer()

		let newLogChannelID = inter.options[0].value
		let lch = await client.channels.fetch(newLogChannelID)
		if (!lch.isText()) return inter.editReply('Specified channel is not a text channel', { ephemeral: true })

		if (logChannelID == newLogChannelID) {
			return inter.editReply('This channel is already set as log channel', { ephemeral: true })
		}
		logChannelID = newLogChannelID
		fs.writeFile('./data/config.json', JSON.stringify({ channelID, logChannelID }, null, 2), (err) => {
			if (err) console.error(err)
		})
		inter.editReply('Updated log channel.')
	},
}

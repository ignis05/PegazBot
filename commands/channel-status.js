/** @typedef {import("discord.js").CommandInteraction} CommandInteraction */
const config = require('../modules/config')

module.exports = {
	interaction: {
		name: 'channel-status',
		description: 'Check if current channel is used for alerts or logs.',
		options: [],
	},
	/** @param {CommandInteraction} inter */
	async handler(inter) {
		let sArr = []
		if (config.channels.alert.includes(inter.channel.id)) sArr.push(`alets`)
		if (config.channels.log.includes(inter.channel.id)) sArr.push(`logs`)
		if (sArr.length) inter.reply({ content: `This channel is currently registered for receiving ${sArr.join(' and ')}.`, ephemeral: true })
		else inter.reply({ content: `This channel is currently not receving any updates`, ephemeral: true })
	},
}

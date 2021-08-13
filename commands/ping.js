/** @typedef {import("discord.js").CommandInteraction} CommandInteraction */

module.exports = {
	interaction: {
		name: 'ping',
		description: 'Replies with pong',
		options: [],
	},
	/** @param {CommandInteraction} inter */
	handler(inter) {
		console.log('pong!')
		inter.reply({ content: `Pong! (${Date.now() - inter.createdTimestamp}ms)`, ephemeral: true })
	},
}
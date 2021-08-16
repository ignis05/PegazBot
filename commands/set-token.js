/** @typedef {import("discord.js").CommandInteraction} CommandInteraction */
const config = require('../modules/config')

module.exports = {
	interaction: {
		name: 'set-moodle-cookie',
		description: 'Manually updates MoodleSession cookie. Can be used to keep browser session active indefinitely.',
		options: [
			{
				name: 'cookie',
				type: 3, // string
				description: 'MoodleSession cookie value copied from the browser.',
				required: true,
			},
		],
	},
	/** @param {CommandInteraction} inter */
	async handler(inter) {
		let newMoodleCookie = inter.options.getString('cookie')
		config.updateMoodleToken(newMoodleCookie)
		inter.reply({ content: 'Updated MoodleSession cookie.', ephemeral: true })
	},
}

const config = require('./config')
/** @typedef {import("discord.js").TextChannel} TextChannel */
/** @typedef {import("discord.js").Client} Client */
/** @typedef {import("discord.js").MessageOptions} Client */

/**
 *
 * @param {Client} client - client for fetching channels
 * @param {MessageOptions} messageOptions - payload to send
 * @param {boolean} log - whether to send to alerts or logs
 * @returns
 */
module.exports = function broadcastMsg(client, messageOptions, log = false) {
	return new Promise(async (res) => {
		var count = 0
		let promises = []
		const channelList = log ? config.channels.log : config.channels.alert
		for (let id of channelList) {
			/** @type {TextChannel} */
			var channel = await client.channels.fetch(id).catch(console.error)
			// fetchable guild text channel
			if (!channel || channel.type !== 'GUILD_TEXT') {
				console.log(`removing ${id} from the list - invalid type or id`)
				config.channels.del(id, log)
				continue
			}
			// can send messages
			if (!channel.permissionsFor(channel.guild.me).has('SEND_MESSAGES')) {
				console.log(`removing ${id} from the list - no send msg perms`)
				config.channels.del(id, log)
				continue
			}
			// can send embed
			if (!channel.permissionsFor(channel.guild.me).has('EMBED_LINKS')) {
				channel.send(`Failed to send embeds to this channel.\nRemoving it from the list.`)
				console.log(`removing ${id} from the list - no send embed perms`)
				config.channels.del(id, log)
				continue
			}
			promises.push(channel.send(messageOptions))
			count++
		}
		await Promise.all(promises)
		res(count)
	})
}

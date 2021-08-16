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
			// fetchable text channel
			if (!channel || !channel.isText()) {
				console.log(`removing ${id} from the list - invalid type or id`)
				config.channels.del(id, log)
				continue
			}
			// can send messages
			if (channel.guild && !channel.permissionsFor(channel.guild.me).has('SEND_MESSAGES')) {
				console.log(`removing ${id} from the list - no send msg perms`)
				config.channels.del(id, log)
				continue
			}
			// can send embed
			if (channel.guild && !channel.permissionsFor(channel.guild.me).has('EMBED_LINKS')) {
				channel.send(`Failed to send embeds to this channel.\nRemoving it from the list.`)
				console.log(`removing ${id} from the list - no send embed perms`)
				config.channels.del(id, log)
				continue
			}
			promises.push(
				channel.send(messageOptions).catch((err) => {
					// DiscordAPIError: Invalid Form Body - if message is too large
					if (err.code === 50035) {
						channel.send(`Failed to send embed message because it was too large.`)
					} else console.error(err)
				})
			)
			count++
		}
		await Promise.all(promises)
		res(count)
	})
}

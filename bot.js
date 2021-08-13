const Discord = require('discord.js')
const fs = require('fs')
const _ = require('lodash')

const config = require('./modules/config')
const commands = require('./commands')

const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILD_MESSAGES] })

client.on('ready', async () => {
	await client.application.fetch()
	client.application.owner.send('Client online and ready!')
	console.log('Client online and ready!')
})

client.once('ready', () => {
	// start interval and immediately lauch first check
})

client.on('interactionCreate', (inter) => {
	if (!inter.isCommand) return
	console.log(`received interaction ${inter.commandName} from ${inter.user.tag}`)

	// bot owner only
	if (inter.user.id !== client.application.owner.id)
		return inter.reply({ content: `You are not authorized to use this bot.`, ephemeral: true })

	if (!commands[inter.commandName]) return console.error(`interaction ${inter.commandName} not recognized`)

	commands[inter.commandName]?.handler(inter)
})

client.on('error', console.error)
client.login(config.auth.token)

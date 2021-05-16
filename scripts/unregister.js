const auth = require('../data/auth.json')
const Discord = require('discord.js')
const { exit } = require('process')

const intents = new Discord.Intents()
const client = new Discord.Client({ intents })

client.once('ready', async () => {
	console.log('starting')
	let commands = await client.application.commands.fetch()
	commands.each(cmd => {
		await cmd.delete()
	})
	console.log('done')
    exit(0)
})

client.on('error', console.error)
client.login(auth.token)

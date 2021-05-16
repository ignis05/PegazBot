const auth = require('../data/auth.json')
const Discord = require('discord.js')
const { exit } = require('process')

const interactions = require('../data/interactions.json')

const intents = new Discord.Intents()
const client = new Discord.Client({ intents })

client.once('ready', async () => {
	console.log('starting')
	for (let interaction of interactions) {
		await client.application.commands.create(interaction)
	}
	console.log('done')
	exit(0)
})

client.on('error', console.error)
client.login(auth.token)

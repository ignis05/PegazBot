const auth = require('../data/auth.json')
const Discord = require('discord.js')
const { exit } = require('process')

const interactions = require('../data/interactions.json')

const intents = new Discord.Intents()
const client = new Discord.Client({ intents })

client.once('ready', async () => {
	console.log('starting')
	let testGuild = await client.guilds.fetch('467313439413501983')
	for (let interaction of interactions) {
		await testGuild.commands.create(interaction)
	}
	console.log('done')
	exit(0)
})

client.on('error', console.error)
client.login(auth.token)

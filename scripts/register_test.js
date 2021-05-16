const auth = require('../data/auth.json')
const Discord = require('discord.js')
const { exit } = require('process')

const interactions = require('../data/interactions.json')

const intents = new Discord.Intents()
const client = new Discord.Client({ intents })

client.once('ready', async () => {
	console.log('Running TestGuild command list update')

	let testGuild = await client.guilds.fetch('467313439413501983')
	let commands = await testGuild.commands.fetch()

	for (let cmd of commands.array()) {
		if (!interactions.find(int => int.name == cmd.name)) {
			console.log(`Found registered command ${cmd.name} with no matching interaction - removing it`)
			await cmd.delete()
		}
	}

	for (let interaction of interactions) {
		console.log(`Registering command ${interaction.name}`)
		await testGuild.commands.create(interaction)
	}
	console.log('TestGuild command list update completed')
	exit(0)
})

client.on('error', console.error)
client.login(auth.token)

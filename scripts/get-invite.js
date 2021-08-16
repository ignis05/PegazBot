const { Client } = require('discord.js')
const { exit } = require('process')
const { writeFileSync } = require('fs')

const { auth } = require('../modules/config')

const client = new Client({ intents: [] })

client.once('ready', () => {
	let invite = client.generateInvite({ scopes: ['applications.commands', 'bot'], permissions: ['SEND_MESSAGES', 'EMBED_LINKS'] })
	writeFileSync('./data/invite.txt', invite)
	console.log(`Generated invite link and saved it in data/invite.txt:\n${invite}`)
  exit(0)
})

client.login(auth.token)

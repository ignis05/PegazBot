const Discord = require('discord.js')

const config = require('./modules/config')
const commands = require('./commands')
const { scrapingOperation } = require('./modules/pegazScraper')
const broadcastMsg = require('./modules/messageBroadcaster')
const createEmbeds = require('./modules/embedCreator')

const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILDS] })

client.on('ready', async () => {
	await client.application.fetch()
	client.application.owner.send('Client online and ready!')
	console.log('Client online and ready!')
})

client.once('ready', () => {
	runWebScraper()
	setInterval(runWebScraper, 900000)
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

async function runWebScraper() {
	let response = await scrapingOperation()
	if (response.success) {
		let date = new Date().toLocaleString('pl-PL').split(', ')
		date.reverse()
		date = date.join(', ')
		client.user.setActivity(`Last check: ${date}`, { type: 'WATCHING' })
		client.user.setStatus('online')
	} else {
		client.user.setStatus('dnd')
	}
	switch (response.msg) {
		case 'scraping failed':
		case 'token updated, scraping failed':
			console.log('scraping failed')
			broadcastMsg(
				client,
				{
					embeds: [
						{
							color: 0xff0000,
							title: 'Web Scraper Failed',
							fields: [
								{ name: 'info', value: 'Failed to scrape data from pegaz' },
								{ name: 'error', value: `${response.err}` },
							],
						},
					],
				},
				true
			)
			break
		case 'token update failed':
			console.log('token update failed')
			broadcastMsg(
				client,
				{
					embeds: [
						{
							color: 0xff0000,
							title: 'Login Failed',
							fields: [
								{
									name: 'info',
									value: `Failed retrieve moodle token from login.uj.edu.pl.\n
										The page might be unavailable or the credentials are incorrect.`,
								},
							],
						},
					],
				},
				true
			)
			break
		case 'first download':
			broadcastMsg(client, {
				embeds: [
					{
						color: 0x00ff00,
						title: 'Download complete',
						fields: [
							{
								name: 'info',
								value: `Correctly downloaded data for the first time and saved it.\n
										Any future differences will be reported.`,
							},
						],
					},
				],
			})
			break
		case 'no differences':
			break
		case 'differences found':
			let embeds = createEmbeds(response.result)
			broadcastMsg(client, { embeds })
	}
}

client.on('error', console.error)
client.login(config.auth.token)

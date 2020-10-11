const path = require('path')
const Discord = require('discord.js')
const fs = require('fs')
var moodle_client = require("moodle-client")

var auth
let authPlaceholder = {
    token: 'bot_token_here',
    username:'pegaz_login',
    passwd:'pegaz_password'
}
try {
	auth = require('./data/auth.json')
	if (auth == authPlaceholder) {
		console.error('Auth is a placeholder: You add auth info to ./data/auth.json')
		return
	}
} catch (err) {
	if (!fs.existsSync('./data')) {
		fs.mkdirSync('./data')
	}
	fs.writeFileSync('./data/auth.json', JSON.stringify(authPlaceholder, null, 2))
	console.error('Auth not found: You need to paste bot auth to ./data/auth.json')
	return
}
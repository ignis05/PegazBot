# PegazBot

Nodejs web scraper that reports [pegaz](https://pegaz.uj.edu.pl) updates using discord.js bot.

## Setup

Requires node.js `^16.6.1`.

1. Install dependencies `npm install`
2. Generate config files `node bot.js`
3. Set discord bot token and pegaz login credentials in _data/auth.json_
4. Generate bot invite link `npm run get-invite` and invite it to your server
5. Register slash commands `npm run register` (might take up to an hour before discord processes them)
6. Launch bot with `node bot.js` or `pm2 start ecosystem.config.js`
7. When slash commands appear in discord, use `/toggle-alerts` to register channel as alert channel. Alternatively manually put channel id in "alert" array of _data/channels.json_ and restart bot.

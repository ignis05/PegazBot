const { MessageEmbed } = require('discord.js')

/**
 * @typedef {import("./pegazScraper").Changes} Changes
 */

/**
 *
 * @param {Changes} changes
 * @return {Array<MessageEmbed>}
 */
module.exports = function createEmbeds(changes) {
	const { added, removed, changed } = changes
	const result = []
	if (added.length > 0) {
		let embed = new MessageEmbed().setColor('#00ff00').setTitle(`${added.length} new courses found!`)
		for (let course of added) {
			embed.addField(course.name, `${course.sections.length} sections\n${course.files.length} files\n[open course](${course.url})`)
		}
		result.push(embed)
	}
	if (removed.length > 0) {
		let embed = new MessageEmbed().setColor('#ff0000').setTitle(`${removed.length} courses are no longer accessible!`)

		for (let course of removed) {
			embed.addField(course.name, `${course.sections.length} sections\n${course.files.length} files`)
		}
		result.push(embed)
	}
	if (changed.length > 0) {
		let embed = new MessageEmbed().setColor('#0000ff').setTitle(`Found changes in ${changed.length} courses!`)

		for (let course of changed) {
			embed.addField(course.name, `[open course](${course.url})`)
		}
		result.push(embed)
	}
	return result
}

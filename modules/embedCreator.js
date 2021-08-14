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
		let embed = new MessageEmbed().setColor('#00ff00').setTitle(`${added.length} new course${added.length > 1 ? 's' : ''} found!`)
		for (let course of added) {
			embed.addField(course.name, `${course.sections.length} sections\n${course.files.length} files\n[open course](${course.url})`)
		}
		result.push(embed)
	}
	if (removed.length > 0) {
		let embed = new MessageEmbed()
			.setColor('#ff0000')
			.setTitle(`${removed.length} course${removed.length > 1 ? 's are' : ' is'} no longer accessible!`)

		for (let course of removed) {
			embed.addField(course.name, `${course.sections.length} sections\n${course.files.length} files`)
		}
		result.push(embed)
	}
	if (changed.length > 0) {
		// to many changes  to fit in 10 embeds
		if ((added.length && 1) + (removed.length && 1) + changed.length > 10) {
			let embed = new MessageEmbed().setColor('#0000ff').setTitle(`Found changes in ${changed.length} courses!`)

			for (let course of changed) {
				let changes = course.changes

				let changesStr = ''
				if (changes.name) changesStr += `\nRenamed ${changes.name.old} -> ${changes.name.new}`
				if (changes.sections)
					changesStr += `\nSections: ${changes.sections.added.length} added and ${changes.sections.removed.length} removed`
				if (changes.announcements)
					changesStr += `\nAnnouncements: ${changes.announcements.added.length} added, ${changes.announcements.removed.length} removed and ${changes.announcements.changed.length} changed`
				if (changes.files)
					changesStr += `\nFiles: ${changes.files.added.length} added, ${changes.files.removed.length} removed and ${changes.files.changed.length} changed`
				if (changes.grades)
					changesStr += `\nGrades: ${changes.grades.added.length} added, ${changes.grades.removed.length} removed and ${changes.grades.changed.length} changed`

				let finalString = `[open course](${course.url})${changesStr}`
				if (finalString.length > 1024) embed.addField(course.name, `[open course](${course.url})\ntoo many changes to fit into message`)
				else embed.addField(course.name, finalString)
			}
			result.push(embed)
		}
		// send each changed course in separate enbed
		else {
			for (let course of changed) {
				let embed = new MessageEmbed().setColor('#0000ff').setTitle(`"${course.name}" was updated`).setURL(course.url)

				let changes = course.changes
				if (changes.name) embed.addField('Course was renamed', `from: ${changes.name.old}\nto: ${changes.name.new}`)
				if (changes.sections) {
					let sArray = []
					if (changes.sections.added.length)
						sArray.push(
							`${changes.sections.added.length} new section${
								changes.sections.added.length > 1 ? 's' : ''
							} found:\n> ${changes.sections.added.join('\n> ')}`
						)
					if (changes.sections.removed.length)
						sArray.push(
							`${changes.sections.removed.length} section${
								changes.sections.removed.length > 1 ? 's' : ''
							} removed:\n> ${changes.sections.removed.join('\n> ')}`
						)

					embed.addField('Sections were changed', sArray.join('\n\n'))
				}
				if (changes.files) {
					let sArray = []
					if (changes.files.added.length) {
						sArray.push(
							`${changes.files.added.length} file${changes.files.added.length > 1 ? 's' : ''} added:\n> ${changes.files.added
								.map((file) => `[${file.text}](${file.link})${file.type == 'unknown' ? '' : ` (${file.type})`}`)
								.join('\n> ')}`
						)
					}
					if (changes.files.removed.length) {
						sArray.push(
							`${changes.files.removed.length} file${changes.files.removed.length > 1 ? 's' : ''} removed:\n> ${changes.files.removed
								.map((file) => `${file.text}${file.type == 'unknown' ? '' : ` (${file.type})`}`)
								.join('\n> ')}`
						)
					}
					if (changes.files.changed.length) {
						let fileStr = ''
						for (let file of changes.files.changed) {
							fileStr += `[${file.orig.text}](${file.orig.link})${file.orig.type == 'unknown' ? '' : ` (${file.orig.type})`}:`
							if (file.text) fileStr += `\n > Renamed from \`${file.text.old}\` to \`${file.text.new}\``
							if (file.type) fileStr += `\n > Chnaged type from \`${file.type.old}\` to \`${file.type.new}\``
							fileStr += '\n'
						}
						sArray.push(`${changes.files.changed.length} file${changes.files.changed.length > 1 ? 's' : ''} changed:\n${fileStr}`)
					}

					embed.addField('Files were changed', sArray.join('\n\n'))
				}
				if (changes.announcements) {
					let sArray = []
					if (changes.announcements.added.length) {
						sArray.push(
							`${changes.announcements.added.length} announcement${
								changes.announcements.added.length > 1 ? 's' : ''
							} added:\n> ${changes.announcements.added.map((ann) => `[${ann.title}](${ann.link})`).join('\n> ')}`
						)
					}
					if (changes.announcements.removed.length) {
						sArray.push(
							`${changes.announcements.removed.length} announcement${
								changes.announcements.removed.length > 1 ? 's' : ''
							} removed:\n> ${changes.announcements.removed.map((ann) => `${ann.title}`).join('\n> ')}`
						)
					}
					if (changes.announcements.changed.length) {
						let str = ''
						for (let ann of changes.announcements.changed) {
							str += `[${ann.orig.title}](${ann.orig.link}):`
							if (ann.title) str += `\n > Renamed from \`${ann.title.old}\` to \`${ann.title.new}\``
							str += '\n'
						}
						sArray.push(
							`${changes.announcements.changed.length} announcement${changes.announcements.changed.length > 1 ? 's' : ''} changed:\n${str}`
						)
					}

					embed.addField('Announcements were changed', sArray.join('\n\n'))
				}
				if (changes.grades) {
					let sArray = []
					if (changes.grades.added.length) {
						sArray.push(
							`${changes.grades.added.length} grade${changes.grades.added.length > 1 ? 's' : ''} added:\n> ${changes.grades.added
								.map((grade) => `\`${grade.name}: ${grade.value}\``)
								.join('\n> ')}`
						)
					}
					if (changes.grades.removed.length) {
						sArray.push(
							`${changes.grades.removed.length} grade${changes.grades.removed.length > 1 ? 's' : ''} removed:\n> ${changes.grades.removed
								.map((grade) => `\`${grade.name}: ${grade.value}\``)
								.join('\n> ')}`
						)
					}
					if (changes.grades.changed.length) {
						let chBoth = changes.grades.changed.filter((grade) => grade.name && grade.value)
						if (chBoth.length)
							sArray.push(
								`${chBoth.length} grade${chBoth.length > 1 ? 's' : ''} renamed and changed:\n> ${chBoth
									.map((grade) => `from: \`${grade.name.old} => ${grade.value.old}\`, to: \`${grade.name.new} => ${grade.value.new}\``)
									.join('\n> ')}`
							)
						let chName = changes.grades.changed.filter((grade) => grade.name && !grade.value)
						if (chName.length)
							sArray.push(
								`${chName.length} grade${chName.length > 1 ? 's' : ''} renamed:\n> ${chName
									.map((grade) => `from: \`${grade.name.old}\`, to: \`${grade.name.new}\``)
									.join('\n> ')}`
							)
						let chValue = changes.grades.changed.filter((grade) => grade.value && !grade.name)
						if (chValue.length)
							sArray.push(
								`${chValue.length} grade${chValue.length > 1 ? 's' : ''} changed:\n> ${chValue
									.map((grade) => `${grade.orig.name}:  \`${grade.value.old}\` => \`${grade.value.new}\``)
									.join('\n> ')}`
							)
					}

					embed.addField(
						'Grades were changed',
						`[open grades](https://pegaz.uj.edu.pl/grade/report/user/index.php?id=${course.id})\n\n` + sArray.join('\n\n')
					)
				}

				result.push(embed)
			}
		}
	}
	return result
}

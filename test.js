const scraper = require('./modules/pegazScraper')

scraper.scrapingOperation().then(data => {
	console.log(`success: `, data.success)
	console.log(data.msg)
	if (data.msg == 'differences found') {
		console.log(
			JSON.stringify(
				data.result.changed.map(el => {
					return { name: el.name, changes: el.changes }
				}),
				null,
				2
			)
		)
	}
})

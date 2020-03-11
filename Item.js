const moment = require('moment-timezone');

class Item {
	constructor(name, cost, date) {
		this.name = name;
		this.cost = cost;
		if (date) {
			this.date = moment(date, 'DD/MM/YYYY HH:mm');
		} else this.date = moment();
	}
}

module.exports = Item;
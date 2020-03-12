const moment = require('moment-timezone');

class User {
	constructor(id, history) {
		if (history) this.history = history
		else this.history = [];
		this.id = id;
	}

	add(item) {
		this.history.push(item)
	}

	remove(index) {
		if (typeof index === 'number' && index < this.history.length) {
			this.history.splice(index, 1);
			return true;
		}
		return false;
	}

	getToday() {
		let now = moment.tz('Europe/Moscow');
		let items = this.history.filter(i => i.date.year() == now.year() && i.date.month() == now.month() && i.date.date() == now.date());
		let cost = 0
		for (let i of items) cost += parseInt(i.cost);
		items.sort((a, b) => a.date > b.date);

		return {'items': items, 'cost': cost, 'date': now.locale('ru').format('Do MMMM YYYY')};
	}

	getThisMonth() {
		let now = moment.tz('Europe/Moscow');
		let items = this.history.filter(i => i.date.year() == now.year() && i.date.month() == now.month())
		let cost = 0
		for (let i of items) cost += parseInt(i.cost);
		items.sort((a, b) => a.date > b.date);
		return {'items': items, 'cost': cost, 'date': now.locale('ru').format('MMMM YYYY')};
	}

	getAll() {
		let items = []
		for (let i of [...this.history].reverse()) {
			let d = i.date.locale('ru').format('MMMM YYYY')

			if (items.findIndex(i => i.date == d) == -1) 
				items.push({'date': d, 'data': [], 'cost': 0})
			let c = items[items.findIndex(i => i.date == d)]
			c.data.push(i);
			c.cost += parseInt(i.cost)
		}
		items.sort((a, b) => moment(a.date, 'MMMM YYYY', 'ru') > moment(b.date, 'MMMM YYYY', 'ru'));
		for (let d of items) d.data.sort((a, b) => a.date > b.date);
		return {'items': items}
	}

	static timeTest() {
		return moment.tz('Europe/Moscow').locale('ru').format('DD/MM/YYYY HH:mm');
	}
}

module.exports = User;

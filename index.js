const TOKEN = process.env.token;
const DBNAME = process.env.dbname;
const PASSWORD = process.env.password;
const PORT = process.env.PORT;
const externalUrl = process.env.CUSTOM_ENV_VARIABLE

const User = require('./User');
const Item = require('./Item');

const MongoClient = require('mongodb').MongoClient;

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(TOKEN, {webHook: {port: PORT, host: '0.0.0.0'}});
bot.setWebHook(externalUrl + ':443/bot' + TOKEN);


function updateDB(user) {
	histToWrite = [];
	for (let i of user.history) histToWrite.push({'name': i.name, 'cost': i.cost, 'date': i.date.format('DD/MM/YYYY HH:mm')});
	db.updateOne({id: user.id}, {$set: {history: histToWrite}}, (er, r) => {
		if (er) return false;
		return true;
	})
}

const url = `mongodb+srv://dbUser:${PASSWORD}@cluster0-ji8lc.gcp.mongodb.net/test?retryWrites=true&w=majority`;

var dialog = []
MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, (err, client) => {
	if (err) return console.log(err);

	db = client.db(DBNAME).collection("budget");

	// Create new user
	bot.onText(/\/start$/, (msg, match) => {
		p = new User(msg.chat.id);
		db.insertOne(p, (err, r) => bot.sendMessage(msg.chat.id, "Done"));
	});

	// Get today expenses
	bot.onText(/\/today$/, (msg, match) => {
		// Get current user
		db.findOne({id: msg.chat.id}, (err, u) => {
			if (err || !u) bot.sendMessage(msg.chat.id, 'Not found')
			else {
				user = new User(u.id);
				for (i of u.history) user.add(new Item(i.name, i.cost, i.date));

				// Send message
				let data = user.getToday();
				let output = `${data.date}: ${data.cost}`;
				for (let i of data.items) output += `\n\t\t\t${i.name} ${parseInt(i.cost) > 0? '+' : ''}${i.cost}    ${i.date.format('HH:mm')}   /del${user.history.findIndex(it => it === i)}`
				bot.sendMessage(msg.chat.id, output)
			}
		});
	});

	// Get this month expenses
	bot.onText(/\/month$/, (msg, match) => {
		// Get current user
		db.findOne({id: msg.chat.id}, (err, u) => {
			if (err || !u) bot.sendMessage(msg.chat.id, 'Not found')
			else {
				user = new User(u.id);
				for (i of u.history) user.add(new Item(i.name, i.cost, i.date));

				// Send message
				let data = user.getThisMonth();
				let output = `${data.date}: ${data.cost}`;
				for (let i of data.items) output += `\n\t\t\t${i.name} ${parseInt(i.cost) > 0? '+' : ''}${i.cost}   /del${user.history.findIndex(it => it === i)}`
				bot.sendMessage(msg.chat.id, output)
			}
		});
	});

	// Get all expenses
	bot.onText(/\/all$/, (msg, match) => {
		// Get current user
		db.findOne({id: msg.chat.id}, (err, u) => {
			if (err || !u) bot.sendMessage(msg.chat.id, 'Not found')
			else {
				user = new User(u.id);
				for (i of u.history) user.add(new Item(i.name, i.cost, i.date));

				// Send message
				let data = user.getAll();
				let output = '';

				for (let i of data.items) {
					output += `\n${i.date}: ${i.cost}`;
					for (let j of i.data) output += `\n\t\t\t${j.name} ${parseInt(j.cost) > 0? '+' : ''}${j.cost}   /del${user.history.findIndex(it => it === j)}`;
				}
				bot.sendMessage(msg.chat.id, output)
			}
		});
	});

	// Add expense
	bot.onText(/\/expense$/, (msg, match) => {
		// Get current user
		db.findOne({id: msg.chat.id}, (err, u) => {
			if (err || !u) bot.sendMessage(msg.chat.id, 'Not found')
			else {
				user = new User(u.id);
				for (i of u.history) user.add(new Item(i.name, i.cost, i.date));
				dialog.push({'user': user, 'type': 'expense'});
				bot.sendMessage(msg.chat.id, 'Enter your expense in format: (name) (cost)')
			}
		});
	});

	// Add income
	bot.onText(/\/income$/, (msg, match) => {
		// Get current user
		db.findOne({id: msg.chat.id}, (err, u) => {
			if (err || !u) bot.sendMessage(msg.chat.id, 'Not found')
			else {
				user = new User(u.id);
				for (i of u.history) user.add(new Item(i.name, i.cost, i.date));
				dialog.push({'user': user, 'type': 'income'});
				bot.sendMessage(msg.chat.id, 'Enter your income in format: (name) (cost)')
			}
		});
	});

	// Dialog
	bot.onText(/(.+) (.+)$/, (msg, match) => {
		if (dialog.find(session => session.type == 'expense' && session.user.id == msg.chat.id)) {
			// Add item
			user.add(new Item(match[1], ((parseInt(match[2]) * -1)).toString()));

			// Update db
			updateDB(user);

			// Remove dialog
			dialog.splice(dialog.find(session => session.type == 'expense' && session.user.id == msg.chat.id), 1);

			// Send message
			bot.sendMessage(msg.chat.id, 'OK');
		}
		else if (dialog.find(session => session.type == 'income' && session.user.id == msg.chat.id)) {
			// Add item
			user.add(new Item(match[1], match[2]));

			// Update db
			updateDB(user);

			// Remove dialog
			dialog.splice(dialog.find(session => session.type == 'income' && session.user.id == msg.chat.id), 1);

			// Send message
			bot.sendMessage(msg.chat.id, 'OK')
		}
	});

	// Remove item
	bot.onText(/\/del(.+)$/, (msg, match) => {
		// Get current user
		db.findOne({id: msg.chat.id}, (err, u) => {
			if (err || !u) bot.sendMessage(msg.chat.id, 'Not found')
			else {
				user = new User(u.id);
				for (i of u.history) user.add(new Item(i.name, i.cost, i.date));

				// Remove item
				user.remove(parseInt(match[1]))

				// Update db
				updateDB(user);

				// Send message
				bot.sendMessage(msg.chat.id, 'OK')
			}
		});
	});

	// DEBUG
	// Time test
	bot.onText(/\/timeTest$/, msg => {
		if (msg.chat.id == 444332136) bot.sendMessage(msg.chat.id, User.timeTest())
		else bot.sendMessage(msg.chat.id, 'No access');
	});

	// Get all users
	bot.onText(/\/getUsers$/, msg => {
		if (msg.chat.id == 444332136)
			db.find().toArray((error, data) => {
				bot.sendMessage(msg.chat.id, JSON.stringify(data.map(i => i.id)));
			});
	});
});

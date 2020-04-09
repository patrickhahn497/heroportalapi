const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');


const app = express();
app.use(bodyParser.json());
app.use(cors());

app.get('/profile/:id', (req, res) => {
	console.log('WAODFS');
	const {id} = req.params;
	console.log(id);
	db.select('*').from('users').where({id})
	.then(user => {
		if (user.length){
			res.json(user[0])
		} else {
			res.status(400).json('Not found!');
		}
	})

})

app.get('/attributes/:id', (req, res) => {

	const {id} = req.params;
	db.select('*').from('attributes').where({id})
	.then(attributes => {
		if (attributes.length){
			res.json(attributes[0])
		} else {
			res.status(400).json('Not found!')
		}
	})
})

app.get('/userroles/:userid',(req, res) => {
	const {userid} = req.params;
	console.log(userid);
	db.select('name', 'description').from('roles').innerJoin('userroles', 'userroles.roleid', 'roles.id')
		.where('userroles.userid', userid)
		.then(roles => {
			if (roles.length){
				console.log("roles", roles);
				res.json(roles);
			} else {
				res.status(400).json('Roles not found')
			}
		})
})


app.get('/userabilities/:id', (req, res) => {
	const {id} = req.params;
	db.select('*').from('userabilities').where({id})
	.then(userabilities => {
		console.log("user abilities: ", userabilities);
		if (userabilities.length){
			res.json(userabilities)
		} else {
			res.status(400).json('Not found!')
		}
	})

})

app.post('/signin', (req, res) => {
	db.select('email', 'hash').from('login')
		.where('email', '=', req.body.email)
		.then(data => {
			const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
			if (isValid) {
				return db.select('*').from('users')
					.where('email', '=', req.body.email)
					.then(user => {
						res.json(user[0])
					})
					.catch(err => res.status(400).json('unable to get user'))
			} else {
				res.status(400).json('wrong credentials');
			}
		})
		.catch(err => res.status(400).json('wrong credentials'))
})


app.post('/charactersetup', (req, res) => {
	console.log("CHARACTER SETUP HAPPENING");
	const {id, firstname, lastname, strength, dexterity, constitution, intelligence, wisdom,
		charisma, abilityNames, abilityDescriptions} = req.body;

	console.log(req.body);
	const abiLen = Object.keys(abilityNames).length;
	console.log(abilityNames);
	console.log(abilityDescriptions);

	let abilityList = [];

	for (let i=0; i<abiLen; i++){
		console.log(i, abilityNames[i]);
		abilityList.push(
			{
				id: id,
				abilityName: abilityNames[i],
				abilityDescription: abilityDescriptions[i]
			}
		);

		// db('userabilities').insert(
		// 	{
		// 		id: id,
		// 		abilityName: abilityNames[i],
		// 		abilityDescriptions: abilityDescriptions[i]
		// 	}
		// ).catch(err => res.status(400).json('invalid users'))
	}

	console.log(abilityList);

	db('userabilities').insert(
		abilityList
	).catch(err => res.status(400).json('invalid users'))

	db('attributes').insert(
		{
			id: id,
			strength: parseInt(strength),
			dexterity: parseInt(dexterity),
			constitution: parseInt(constitution),
			intelligence: parseInt(intelligence),
			wisdom: parseInt(wisdom),
			charisma: parseInt(charisma)

		}
	)
	.then(attributerow => res.json(attributerow))
	.catch(err => res.status(400).json('unable to input attributes'));
	


})

app.post('/register', (req, res) => {
	const {email, name, password} = req.body;
	if (!email || !name || !password){
		return res.status(400).json('incorrect form submission');
	}
	const hash = bcrypt.hashSync(password);
	// //in here, we don't enter the user if the hash failed
	// console.log(req.body);
	//when the unique id is created, it is passed on so that it can be put into the user area
	db.transaction(trx => {
		trx.insert({
			hash: hash,
			email: email
		})
		.into('login')
		.returning('id')
		.then(loginId => {
			console.log("loginId: ", loginId);
			return trx('users')
				.returning('*')
				.insert({
					email: email,
					name: name,
					id: loginId[0]
				})
				.then(user => {
					console.log("responding with user");
					res.json(user[0]);
				})

			})
			.then(trx.commit)
			.catch(trx.rollback)
		})
		.catch(err => res.status(400).json('unable to register '));

})

app.listen(3000, () => {
	console.log('app is running on port 3000');
})

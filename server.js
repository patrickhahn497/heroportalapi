const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');


const app = express();
app.use(bodyParser.json());
app.use(cors());


const db = knex({
	client: 'pg',
	connection: {
		host: '127.0.0.1',
		user: 'postgres',
		password: 'supranite',
		database: 'heroportal'
	
	}
});

app.get('/', (req, res) => {
	console.log("wahhh");
	db.select('*').from('users')
	.then(user => {
		console.log(user);
		if (user.length){
			res.json(user[0])
		} else {
			res.status(400).json('Not found!')
		}
	})
})


app.get('/wow', (req, res) => {
	console.log("woohoo2");
	res.send(database.users);
})

app.get('/users/:id', (req, res) => {
	const {id} = req.params;
	console.log('PROFILE QUERIED AT USERID: ', id);
	console.log(id);
	db.select('*').from('users').where({id})
	.then(user => {
		if (user.length){
			console.log(user[0]);
			res.json(user[0])
		} else {
			res.status(400).json('Not found!');
		}
	})

})

app.get('/attributes/:id', (req, res) => {


	const {id} = req.params;
	console.log('ATTRIBUTES QUERIED AT USERID: ', id);
	db.select('*').from('attributes').where({id})
	.then(attributes => {
		if (attributes.length){
			res.json(attributes[0])
		} else {
			res.status(400).json('Not found!')
		}
	})
})

app.get('/roles',(req, res) => {

	db.select('*').from('roles')
		.then(roles => {
			if (roles.length){
				console.log("roles", roles);
				res.json(roles);
			} else {
				res.status(400).json('Roles not found')
			}
		})
})

app.get('/userroles/:userid',(req, res) => {
	const {userid} = req.params;
	console.log(userid);
	db.select('name', 'description').from('roles').innerJoin('userroles', 'userroles.rolename', 'roles.name')
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
	console.log(req.body);
	const {id, firstname, lastname, strength, dexterity, constitution, intelligence, wisdom,
		charisma, abilityNames, abilityDescriptions, roles} = req.body;


	console.log("this the id", id);
	console.log("THIS THE TYPE", typeof id);



	console.log(req.body);
	const abiLen = Object.keys(abilityNames).length;
	console.log(abilityNames);
	console.log(abilityDescriptions);

	let abilityList = [];

	for (let i=0; i<abiLen; i++){
		console.log(i, abilityNames[i]);
		abilityList.push(
			{
				
				abilityName: abilityNames[i],
				abilityDescription: abilityDescriptions[i],
				id: id
			}
		);
	}

	console.log(abilityList);

	db('userabilities').insert(
		abilityList
	).catch(err => res.status(400).json('invalid users'))

	db('userroles').insert(
		roles
	).catch(err => res.status(400).json('invalid roles'))

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

app.post('/jobtest', (req, res) => {
	// const {employerid, jobtitle, description, threatrank, reward} = req.body;
	// db('jobroles').select('*')
	// .then(jobs => res.json(jobs));
	db('jobroles').insert(
		{
			// roleid: 1,
			rolename: 'stealth',
			'jobid': 20,
			'spotsfilled': 1,
			'spotsneeded': 2,
			'preference': 'required'
		}
	)
	.then(jobid => {
		// tempjobid = jobid;
		console.log("jobid: ", jobid);
		res.json(jobid);
	})
	.catch(err => res.status(400).json('unable to input job'));

})


app.post('/contractsetup', (req, res) => {
	const {employerid, jobtitle, description, threatrank, reward} = req.body;
	let {rolelist} = req.body;
	let tempjobid = undefined;
	let finalrolelist = [];
	const roleLen = Object.keys(rolelist).length;
	console.log(req.body);

	db.transaction(trx => {
		trx.insert({
			employerid: parseInt(employerid),
			title: jobtitle,
			description: description,
			threatrank: threatrank,
			reward: parseInt(reward)
		})
		.into('jobs')
		.returning('jobid')
		.then(jobid => {
			console.log('looook HEEEEERE');
			console.log("job id: ", jobid);
			for (let i=0; i<roleLen; i++){
				if (rolelist[i]['preference']){
					// rolelist[i]["roleid"] = 1;
					rolelist[i]["spotsfilled"] = 0;
					rolelist[i]["spotsneeded"] = parseInt(rolelist[i]["spotsneeded"]);
					rolelist[i]["jobid"] = parseInt(jobid[0]);
					finalrolelist.push(rolelist[i]);
				}
			}
		})
		.then( () => {
			console.log(finalrolelist);
				return trx('jobroles')
					.returning('*')
					.insert(
						finalrolelist
					)
					.then(roles => {
						console.log('roles ', roles);
						res.json(roles[0]["jobid"]);
					})
					.catch(err => res.status(400).json('jobrole insertion unable to be completed'));

		})
		.then(trx.commit)
		.catch(trx.rollback)
		
	})
	.catch(err => res.status(400).json('insertion unable to be completed'));

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
					console.log("responding with user ", user[0] );
					res.json(user[0]);
				})

			})
			.then(trx.commit)
			.catch(trx.rollback)
		})
		.catch(err => res.status(400).json('unable to register '));

})



app.get('/jobs/:jobid', (req, res) => {
	const {jobid} = req.params;
	db.select('*').from('jobs').where({jobid})
	.then(job => {

		console.log("job info: ", job);

		if (job.length){
			res.json(job[0]);
		} else {
			res.status(400).json('Job not found!')
		}
	})
})

app.get('/userjobs/:userid', (req, res) => {
	const {userid} = req.params;
	//join jobtable with jobroles table on job id
	//inner join on the first one because both the user and job need to exist in order to be returned
	//using leftjoin on the second one in the case that a job has no specified roles
	db.select('users.name', 'jobs.title', 'jobs.threatrank','jobroles.rolename', 'jobs.jobid', 'jobs.employerid')
		.from('users')
		.innerJoin('jobs', 'users.id', 'jobs.employerid')
		.leftJoin('jobroles', 'jobs.jobid', 'jobroles.jobid')
		.where('users.id', userid)
		.then( results => {
			console.log(results);
			res.json(results);
		})
		.catch( err => res.status(400).json("Jobs associated with that user not found"))


})

app.post('/userjobs', (req, res) => {
	const {jobid, userid, rolename} = req.body;
	//join jobtable with jobroles table on job id
	db('userjobs').insert(
		{
			jobid: parseInt(jobid),
			userid: parseInt(userid),
			rolename: rolename
		},
		"*"
	)
	.then(jobrow => {
		res.json(jobrow);
	})
	.catch(err => res.status(400).json("Unable to insert user job"))

})

app.get('/jobroles/:jobid', (req, res) => {
	const {jobid} = req.params;
	db.select('*').from('jobroles').where({jobid})
		.then(jobroles => {
			console.log("jobroles: ", jobroles);
			if (jobroles.length){
				res.json(jobroles);
			} else {
				res.status(400).json('job roles not found')
			}
		})
})



app.listen(3000, () => {
	console.log('app is running on port 3000');
})

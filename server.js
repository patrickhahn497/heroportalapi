const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
//i uninstalled bcrypt but kept bcrypt-nodejs. this works for heroku
const cors = require('cors');
const knex = require('knex');


const app = express();
app.use(bodyParser.json());
app.use(cors());
// app.use(function(req, res, next) {
//        res.header("Access-Control-Allow-Origin", "*");
//        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//        res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
//           next();
//     });


//connection credentials removed on public github for security purposes
//FOR LOCALHOST
// const db = knex({
// 	client: 'pg',
// 	connection: {
// 	}
// });


// for HEROKU SERVER
// const db = knex({
// 	client: 'pg',
// 	connection: {
// 		connectionString: process.env.DATABASE_URL,
// 		ssl: true,
	
// 	}
// });


//app.options('/jobapplications', cors());
app.options('*', cors());


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
		charisma, abilityNames, abilityDescriptions, roles, description, profilepictureurl} = req.body;


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

	db('profiledescriptions').insert(
		{
			userid: id,
			description: description,
			profilepictureurl: profilepictureurl
		}
	).catch(err => res.status(400).json('invalid description'))

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
					console.log("job id is ", jobid);
					rolelist[i]["spotsfilled"] = 0;
					rolelist[i]["spotsneeded"] = parseInt(rolelist[i]["spotsneeded"]);
					rolelist[i]["jobid"] = jobid[0];
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
	db.select('emp.name as employername', 'jobs.title', 'jobs.threatrank', 'userjobs.rolename', 'jobs.jobid', 'jobs.employerid')
		.from('users')
		.where('users.id', userid)
		.innerJoin('userjobs', 'users.id', 'userjobs.userid')
		.leftJoin('jobs', 'jobs.jobid', 'userjobs.jobid')
		.leftJoin('users as emp', 'emp.id', 'jobs.employerid')
		.then( results => {
			console.log(results);
			res.json(results);
		})
		
		.catch( err => res.status(400).json("Jobs associated with that user not found"))
})

app.get('/employerjobs/:employerid', (req, res) => {
	const {employerid} = req.params;
	//join jobtable with jobroles table on job id
	//inner join on the first one because both the user and job need to exist in order to be returned
	//using leftjoin on the second one in the case that a job has no specified roles
	db.select('users.name as employername', 'jobs.title', 'jobs.threatrank','jobroles.rolename', 'jobs.jobid', 'jobs.employerid')
		.from('users')
		.innerJoin('jobs', 'users.id', 'jobs.employerid')
		.leftJoin('jobroles', 'jobs.jobid', 'jobroles.jobid')
		.where('users.id', employerid)
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

app.get('/jobapplications/:jobid', (req, res) => {
	const {jobid} = req.params;
	// db('jobapplications')
	// 	.select("*")
	// 	.where("jobid", parseInt(jobid))
	// 	.then(jobapps =>{
	// 			res.json(jobapps);
	// 		}
	// 	)
	// 	.catch( err => res.status(400).json("job applications for this job not found"))
	db.select("users.name", "users.id", "JA.jobappid", "JA.jobid", "JA.applicantid", "JA.rolename", "JA.status")
		.from("jobapplications as JA")
		.innerJoin('users', 'users.id', 'JA.applicantid')
		.where("jobid", parseInt(jobid))
		.where("JA.status", "pending")
		.then(jobapps =>{
			res.json(jobapps);
		})
		.catch( err => res.status(400).json("job applications for this job not found"))
})

app.get('/userjobapplications/:userid', (req, res) => {
	const {userid} = req.params;
	//used to update the status of a jobapp
	console.log("request to patch made");

	db.select("jobs.title", "JA.jobappid", "jobs.employerid","JA.jobid", "JA.applicantid", 
		"JA.rolename", "JA.status", "jobs.threatrank", "emp.name as employername")
		.from("jobapplications as JA")
		.innerJoin('jobs', 'jobs.jobid', 'JA.jobid')
		.where("JA.applicantid", parseInt(userid))
		.leftJoin('users as emp', 'emp.id', 'jobs.employerid')
		.then(jobapps =>{
			res.json(jobapps);
		})
		.catch( err => res.status(400).json("job applications for this job not found"))
})

app.post('/jobapplications', (req, res) => {
	const {applicantid, jobid, rolename} = req.body;

	db('jobapplications').insert(
		{
			applicantid: parseInt(applicantid),
			jobid: parseInt(jobid),
			rolename: rolename,
			status: "pending"
		},
		"*"
	)
	.then(jobapp => res.json(jobapp))
	.catch(err => res.status(400).json("Unable to insert job application"))
})

app.put('/jobapplications',  (req, res) => {
	//used to update the status of a jobapp
	const {status, applicantid, jobid, rolename} = req.body;
	console.log("request to patch made", req.body);

	db('jobapplications')
		.where('applicantid', applicantid)
		.where('jobid', jobid)
		.where('rolename', rolename)
		.update(
		{
			status: status
		},
		"*"
	)
	.then(jobapp => res.json(jobapp))
	.catch(err => res.status(400).json("Unable to update job application"))
})

app.post('/profiledescriptions', (req, res) => {
	const {userid, description, profilepictureurl} = req.body;
	db('profiledescriptions').insert(
		{
			userid: parseInt(userid),
			description: description,
			profilepictureurl: profilepictureurl
		},
		"*"
	)
	.then(profiledescription => res.json(profiledescription))
	.catch(err => res.status(400).json("Unable to insert profile description"))
	
})

app.get('/profiledescriptions/:userid', (req, res) => {
	const {userid} = req.params;
	db('profiledescriptions')
		.select("*")
		.where("userid", userid)
		.then(profiledescription => res.json(profiledescription[0]))
		.catch(err => res.status(400).json("Unable to retrieve profile description"))

})

app.get('/filteredjobs', (req, res) => {
	const {rolename, threatrank, employername, title} = req.body;
	let query = db.select("jobs.title", "jobs.threatrank", "jobroles.rolename", "employers.name as employername")
					.from("jobs")
					.innerJoin("jobroles", "jobroles.jobid", "jobs.jobid")
					.leftJoin("users as employers", "employers.id", "jobs.employerid");
	if (rolename){
		query.where("jobroles.rolename", rolename);
	}
	if (threatrank){
		query.where("jobs.threatrank", threatrank);
	}
	if (employername){
		query.where("employers.name", employername);
	}
	if (title){
		query.where("jobs.title", title);
	}

	query.then((results) => res.json(results)).catch(err => res.status(400).json("unable to find filtered jobs"));
})

app.get('/recommendedjobs/:userid', (req, res) => {
	const {userid} = req.params;
	let recommendedranks = [];
	//let rolenames = [];
	db('attributes')
		.select("*")
		.where("id", userid)
		.then(results => {
			console.log(results);
			let attributes = results[0];
			delete attributes["id"];
			let weightedstats = Object.values(attributes).sort((a, b) => a-b).slice(2);
			weightedstats[3]*=2;
			weightedstats[2]*=2;
			let sum = 0;
			for (let i in weightedstats){
				sum+=weightedstats[i];
			}
			//stats are weight like this
				//top 2 stats are doubled
				//mid 2 stats stay the same
				//bottom 2 stats are ignored
			console.log(weightedstats);
			console.log(sum);
			if (sum>100){
				recommendedranks.push('S');
			}
			if (sum<=105 && sum>=90){
				recommendedranks.push('A');
			}
			if (sum<=95 && sum>=80){
				recommendedranks.push('B');
			}
			if (sum<=85 && sum>=70){
				recommendedranks.push('C');
			}
			if (sum<=75 && sum>=60){
				recommendedranks.push('D');
			}
			if (sum<=60){
				recommendedranks.push('E');
			}
			console.log(recommendedranks);
		})
		.then(() => {
			db.select("rolename")
				.from("userroles")
				.where("userid", userid)
				.then(roles => {
					return roles.map(role => role.rolename);
				})
				.then((rolenames)=> {
					db.select("jobs.title", "jobs.threatrank", "jobroles.rolename", "employers.name as employername")
						.from("jobs")
						.innerJoin("jobroles", "jobroles.jobid", "jobs.jobid")
						.leftJoin("users as employers", "employers.id", "jobs.employerid")
						.where('jobs.threatrank', 'in', recommendedranks)
						.where('jobroles.rolename', 'in', rolenames)
						.where('jobroles.preference', '!=', 'banned')
						.then(results => res.json(results));
				})
		})
		
	

})


// app.listen(3000, () => {
// 	console.log('app is running on port 3000');
// })

app.listen(process.env.PORT || 3000, () => {
	console.log(`app is running on port ${process.env.PORT}`);
})
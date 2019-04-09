var express = require('express');
var router = express.Router();
const request = require('request')
const {PythonShell} =  require('python-shell');
var cors = require('cors');
var mysql = require('mysql');
const nblogic_node = '/home/ec2-user/nblogic/routes/nblogic_node.py';
var _ = require('lodash');
require('dotenv').config()

var connection = mysql.createPool({
  localAddress: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: "nblogic",
  port: 3306,
	socketPath: '/var/lib/mysql/mysql.sock',
	multipleStatements: true
});

const nestedGroup = (array, first, second) => {
	var groupedFirst = _.groupBy(array, first);
	_.forEach(groupedFirst, (val, key) => {
		groupedFirst[key] = _.groupBy(val, second)
	})
	return groupedFirst
}

const queryHandle = (resolve, reject, result, error) => {
	if(error) {console.error(error); reject(error)}
	else{resolve(result);}
}

const errorHandle = (error) => {
	console.error("ERROR "+error);
}

const sqlQuery = (query, data) => {
	return new Promise((resolve, reject) => {
		data?connection.query(query, data, (error, result) => {
			queryHandle(resolve, reject, result, error)
		}):connection.query(query, (error, result) => {
			queryHandle(resolve, reject, result, error)
		})
	})
}

const getCurrentUsers = () => {
	return sqlQuery(`SELECT COUNT(*) as Count, TRUNCATE(AVG(GPAX),2) as AVG FROM student`)
}

const getUserData = (username) => {
	return sqlQuery(`SELECT * FROM student WHERE student.Student_ID = ${username}`)
}

const getUserAttemps = (username) => {
	return sqlQuery(`SELECT attemps.Course_id, Name, Year, Semester, Grade FROM attemps INNER JOIN course 
	 ON course.Course_id = attemps.Course_id WHERE attemps.Student_ID = ${username}
	 `)
}

router.get('/db/users', cors(), (req, res, next) => {
	sqlQuery("SELECT * FROM student").catch(error => {
		res.status(500).send(error)
	}).then(data => {
		res.json(data);
	})
});

router.get('/db/totalusers', cors(), (req, res, next) => {
	getCurrentUsers().catch(error => {
		res.status(500).send(error)
	}).then(data => {
		res.send(data[0]);
	})
});

router.get('/db/user/:userId', cors(), (req, res, next) => {
	var userId = req.params.userId;
	getUserData(userId).catch(error => {
		res.status(500).send(error)
	}).then(data_result => {
		getUserAttemps(userId).catch(error => {
			res.status(500).send(error)
		}).then(attemp_result => {
			res.send({"User_Bio": data_result[0], "Attemps": nestedGroup(attemp_result, "Year", "Semester")});
		})
	})
});

router.post('/query', cors(), (req, res, next) => {
	var query = req.body;
	sqlQuery(query).catch(error => {
		res.status(500).send(error)
	}).then(data => {
		res.send(data);
	})
});

router.post('/klogic', cors(), function(req, res, next) {
	let username = req.body.username;
	let password = req.body.password;
	let api_mode = req.body.api_mode;
	let options = {
		args: [username, password, "authen"],
		pythonPath: '/usr/bin/python3.7',
	}
	console.log(req.body)
	if (username && password) {
		PythonShell.run(nblogic_node, options, function (err, results) {
			if (err) {
				res.status(500).send(err);
			}
			console.log('nblogic_node finished.');
			console.log(results)
			results_json = JSON.parse(results);
			if (results_json !== null) {
				api_mode ? res.send(results_json) : res.render('profile', { title: "NBLOGIC", data: results_json['User_Bio'] });
				let user_bio = results_json['User_Bio']
				var full_course = results_json['User_Summary'];
				sqlQuery("INSERT INTO student SET ?", user_bio).then(result => {
					console.log("INSERT STUDENT SUCCESS");
					return sqlQuery(`UPDATE student SET GPAX = ${user_bio.GPAX} WHERE Student_ID = "${user_bio.Student_ID}"`)
				}).catch(errorHandle).then(result => {
					console.log("UPDATE GPAX SUCCESS");
					return sqlQuery("INSERT IGNORE INTO course (Name, Course_id, Credit_points) VALUES ?", [full_course.all_course.map(course =>
						[course.Name, course.Course_id, course.Credit_points])])
				}).catch(errorHandle).then(result => {
					console.log("INSERT COURSE SUCCESS")
					return sqlQuery("INSERT IGNORE INTO attemps (Student_id, Course_id, Year, Semester, Grade) VALUES ?", [full_course.attemp.map(attemp =>
						[attemp.Student_id, attemp.Course_id, attemp.Year, attemp.Semester, attemp.Grade])])
				}).catch(errorHandle).then(result => {
					console.log("INSERT Attemps SUCCESS")
					return sqlQuery("INSERT IGNORE INTO contains (Program_id, Course_id) VALUES ?", [full_course.all_course.map(course_ =>
						[full_course.User_info.Program_ID, course_.Course_id])])
				}).catch(errorHandle).then(result => {
					console.log("INSERT Contains SUCCESS")
					results_json = null;
				}).catch(errorHandle)
			}
			else {
				res.status(500).send('Something broke!')
			}
		});
	} else {
		res.status(401).send("Unauthorize!")
	}
});
  
module.exports = {router, getUserData};

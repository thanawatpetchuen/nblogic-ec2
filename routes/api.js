var express = require('express');
var router = express.Router();
const request = require('request')
const {PythonShell} =  require('python-shell');
var cors = require('cors');
var mysql = require('mysql');
const nblogic_node = '/home/ec2-user/nblogic/routes/nblogic_node.py';
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


router.get('/db/users', cors(), (req, res, next) => {
    // connection.connect();
 
    connection.query('SELECT * FROM student', function (error, results, fields) {
    if (error) console.error(error);
    //console.log('The solution is: ', results);
    res.json(results);
    //res.render('table', { title: "NBLOGIC", data: results });
    });
    
    // connection.end();
});

router.get('/db/user/:userId', cors(), (req, res, next) => {
	// connection.connect();
	var userId = req.params.userId;
	// getUserAttemps(userId, (result) => {
	// 	res.send(result);
	// });

	getUserData(userId).then(data_result => {
		getUserAttemps(userId).then(attemp_result => {
			res.send({"User_Bio": data_result[0], "Attemps": attemp_result});
		})
	})
	
});


router.post('/query', cors(), (req, res, next) => {
	// connection.connect();
	var query = req.body;
	console.log(query)
	// getUserAttemps(userId, (result) => {
	connection.query(query, (error, results, fields) => {
		res.send(results);
	})
	// });


	
});

const checkUser = (student_id, callback) => {
	connection.query(`SELECT * FROM student WHERE Student_ID = ${student_id}`, function (error, results, fields) {
    if (error) console.error(error);
		//console.log('The solution is: ', results);
		
		var check = results.length == 0 ?  false : true;
		callback(check); 
    //res.render('table', { title: "NBLOGIC", data: results });
    });
}

const getUserData = (username) => {
	return new Promise((resolve, reject) => {
		connection.query(`SELECT * FROM student WHERE student.Student_ID = ${username}`, function (error, results, fields) {
			if (error) {console.error(error); reject(error)};
			//console.log('The solution is: ', results);
			resolve(results);
			//res.render('table', { title: "NBLOGIC", data: results });
		});
	})
}

const getUserAttemps = (username) => {
	return new Promise((resolve, reject) => {
		connection.query(`SELECT Course_id, Year, Semester, Grade FROM attemps WHERE attemps.Student_ID = ${username}`, function (error, results, fields) {
			if (error) {console.error(error); reject(error)};
			//console.log('The solution is: ', results);
			resolve(results);
			//res.render('table', { title: "NBLOGIC", data: results });
		});
	})
}

router.post('/klogic', cors(), function(req, res, next) {
	let username = req.body.username;
	let password = req.body.password;
	let api_mode = req.body.api_mode;
	let options = {
		args: [username, password, "authen"],
		pythonPath: '/usr/bin/python3.7',
    	
	}
	console.log(req.body)


	if(username && password){
			PythonShell.run(nblogic_node, options, function  (err, results)  {
				if  (err) {
					res.status(500).send(err);
				}
				console.log('nblogic_node finished.');
				console.log(results)
				jj = JSON.parse(results);
				if(jj !== null){
					api_mode?res.send(jj):res.render('profile', { title: "NBLOGIC", data: jj['User_Bio'] });
					var values = [];
					let user_bio = jj['User_Bio']

					// console.log(user_bio)
					// res.json(jj);
					// console.log(user_bio);
				
					console.log(user_bio);
					// "INSERT INTO student(Student_ID,Thai_Name,English_Name,Sex,Degree,Major,Student_Type,Program,Program2,Main_Course,Year_Enrolled,Campus,Account_Number,Student_Status,Year,ID_Card,Birth_Date,Home_Town,Height,Weight,Blood_Group,Is_the_son_of,From_total,Address,Address_,Telephone,Live_with,Expense,Funded_by) VALUES (5901012620088,'นายธนวัตน์ เพชรชื่น','Mr. THANAWAT PETCHUEN','ชาย','ปริญญาตรี','ภาควิชาวิศวกรรมไฟฟ้าและคอมพิวเตอร์  คณะวิศวกรรมศาสตร์ วิศวกรรมคอมพิวเตอร์ (Cpr.E)','ปกติรอบเช้า (R)  ห้อง A  รอบเช้า (R)','หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมคอมพิวเตอร์ (59010124)','โครงการปกติ 134 หน่วยกิต ระยะเวลาในการศึกษา 4-8 ปี','ไม่มี','ปีการศึกษา 2559 ภาคเรียนที่ 1','กรุงเทพมหานคร','ไม่ทราบธนาคาร','ปกติ',3,1103702482625,'23 พ.ย. 2540','กรุงเทพมหานคร','172 ซ.ม.','66 ก.ก.','O',1,'2 คน','318 ถ. ติวานนท์','ต. ท่าทราย อ. เมืองนนทบุรี จ. นนทบุรี 11000',029523875,'บิดามารดา','4,001 - 6,000 บาท','บิดาและ/หรือมารดา')"
					connection.query("INSERT INTO student SET ?", user_bio, function (error, results) {
						console.log(error?'ERROR INSERT student '+error:"SUCCESS");
						var full_course = jj['User_Summary'];
						connection.query("INSERT IGNORE INTO course (Name, Course_id, Credit_points) VALUES ?", [full_course.all_course.map(course =>
							[course.Name, course.Course_id, course.Credit_points])], function (error, results) {
								console.log(error?"ERROR INSERT Course":"SUCCESS INSERT Course");
								connection.query("INSERT IGNORE INTO attemps (Student_id, Course_id, Year, Semester, Grade) VALUES ?", [full_course.attemp.map(attemp =>
									[attemp.Student_id, attemp.Course_id, attemp.Year, attemp.Semester, attemp.Grade])], function (error, results) {
										console.log(error?`ERROR INSERT Attemp ${error}`:"SUCCESS INSERT Attemp");
										connection.query("INSERT IGNORE INTO contains (Program_id, Course_id) VALUES ?", [full_course.all_course.map(course_ =>
											[full_course.User_info.Program_ID, course_.Course_id])], function (error, results) {
												console.log(error?`ERROR INSERT Contains ${error}`:"SUCCESS INSERT Contains");
												jj = null;
										})
										
								})
						})

						
					});

					// options.args =  [username, password, "course"]
					// PythonShell.run(nblogic_node, options, (err_course, results_course) => {
					// 	if(err_course){
					// 		res.status(500).send(err_course);
					// 	}
					// 	console.log('nblogic_node (course) finished.');
					// 	var full_course = JSON.parse(results_course);
					// 	var full_course = jj["User_Summary"];
					// 	console.log(full_course);
					// 	connection.query("INSERT IGNORE INTO course (Name, Course_id, Credit_points) VALUES ?", [full_course.all_course.map(course =>
					// 		[course.Name, course.Course_id, course.Credit_points])], function (error, results) {
					// 			console.log(error?"ERROR INSERT Course":"SUCCESS INSERT Course");
					// 			connection.query("INSERT IGNORE INTO attemps (Student_id, Course_id, Year, Semester, Grade) VALUES ?", [full_course.attemp.map(attemp =>
					// 				[attemp.Student_id, attemp.Course_id, attemp.Year, attemp.Semester, attemp.Grade])], function (error, results) {
					// 					console.log(error?`ERROR INSERT Attemp ${error}`:"SUCCESS INSERT Attemp");
					// 					connection.query("INSERT IGNORE INTO contains (Program_id, Course_id) VALUES ?", [full_course.all_course.map(course_ =>
					// 						[full_course.User_info.Program_ID, course_.Course_id])], function (error, results) {
					// 							console.log(error?`ERROR INSERT Contains ${error}`:"SUCCESS INSERT Contains");
												
					// 					})
										
					// 			})
					// 	})
					// })

					// jj = null;

				}
				else{
					res.status(500).send('Something broke!')
				}

			});
		
	}else{
		res.status(401).send("Unauthorize!")
	}

  });
  



module.exports = {router, getUserData};


	// if(username && password){
	// 	checkUser(username, (result) => {
	// 		if(result){
	// 			getUserData(username, (data) => {
	// 				res.json(data);
	// 			});
	// 			return false;
	// 		}else{
	// 			PythonShell.run(nblogic_node, options, function  (err, results)  {
	// 				if  (err) {
	// 					res.status(500).send(err);
	// 				}
	// 				console.log('nblogic_node finished.');
	// 				jj = JSON.parse(results);
	// 				if(jj !== null){
	// 					api_mode?res.send(jj):res.render('profile', { title: "NBLOGIC", data: jj['User Bio'] });
	// 					var values = [];
	// 					let user_bio = jj['User Bio']
	// 					// res.json(user_bio);
	// 					// console.log(user_bio);
	// 					var re = /\(([^)]+)\)/;
	// 					var matches = re.exec(user_bio.Program);
	// 					console.log(matches);
	// 					user_bio.Program_id = matches[1];
	// 					console.log(user_bio);
	// 					// "INSERT INTO student(Student_ID,Thai_Name,English_Name,Sex,Degree,Major,Student_Type,Program,Program2,Main_Course,Year_Enrolled,Campus,Account_Number,Student_Status,Year,ID_Card,Birth_Date,Home_Town,Height,Weight,Blood_Group,Is_the_son_of,From_total,Address,Address_,Telephone,Live_with,Expense,Funded_by) VALUES (5901012620088,'นายธนวัตน์ เพชรชื่น','Mr. THANAWAT PETCHUEN','ชาย','ปริญญาตรี','ภาควิชาวิศวกรรมไฟฟ้าและคอมพิวเตอร์  คณะวิศวกรรมศาสตร์ วิศวกรรมคอมพิวเตอร์ (Cpr.E)','ปกติรอบเช้า (R)  ห้อง A  รอบเช้า (R)','หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมคอมพิวเตอร์ (59010124)','โครงการปกติ 134 หน่วยกิต ระยะเวลาในการศึกษา 4-8 ปี','ไม่มี','ปีการศึกษา 2559 ภาคเรียนที่ 1','กรุงเทพมหานคร','ไม่ทราบธนาคาร','ปกติ',3,1103702482625,'23 พ.ย. 2540','กรุงเทพมหานคร','172 ซ.ม.','66 ก.ก.','O',1,'2 คน','318 ถ. ติวานนท์','ต. ท่าทราย อ. เมืองนนทบุรี จ. นนทบุรี 11000',029523875,'บิดามารดา','4,001 - 6,000 บาท','บิดาและ/หรือมารดา')"
	// 					connection.query("INSERT INTO student SET ?", user_bio, function (error, results) {
	// 					console.log(error?"ERROR":"SUCCESS");
			
	// 					});
	
	// 					options.args =  [username, password, "course"]
	// 					PythonShell.run(nblogic_node, options, (err_course, results_course) => {
	// 						if(err_course){
	// 							res.status(500).send(err_course);
	// 						}
	// 						console.log('nblogic_node (course) finished.');
	// 						var full_course = JSON.parse(results_course);
	// 						console.log(full_course);
	// 						connection.query("INSERT IGNORE INTO course (Name, Course_id, Credit_points, Program) VALUES ?", [full_course.all_course.map(course =>
	// 							[course.Name, course.Course_id, course.Credit_points, course.Program])], function (error, results) {
	// 								console.log(error?"ERROR INSERT Course":"SUCCESS INSERT Course");
	// 								connection.query("INSERT IGNORE INTO attemps (Student_id, Course_id, Year, Semester, Grade) VALUES ?", [full_course.attemp.map(attemp =>
	// 									[attemp.Student_id, attemp.Course_id, attemp.Year, attemp.Semester, attemp.Grade])], function (error, results) {
	// 										console.log(error?`ERROR INSERT Attemp ${error}`:"SUCCESS INSERT Attemp");
											
	// 								})
	// 						})
	// 					})
	
	// 					jj = null;
	
	// 				}
	// 				else{
	// 					res.status(500).send('Something broke!')
	// 				}
	
	// 			});
	// 		}
	// 	});
		
	// }else{
	// 	res.status(401).send("Unauthorize!")
	// }
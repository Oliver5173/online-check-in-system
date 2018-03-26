var http = require('http'),
    path = require('path'),
    express = require('express'),
	MongoClient = require('mongodb').MongoClient;
	fs = require('fs');


var mongo_url = 'mongodb://weixinw:gQq8wCx1@127.0.0.1:27017/cmpt218_weixinw?authSource=admin';
//var mongo_url = 'mongodb://admin:123456@ds041643.mlab.com:41643/cmpt218';


var course_session,session = 0,courses = [];

const app = express();
var router = express.Router();

var getDateTime = () => {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    return hour + ":" + min + ":" + sec;

};

app.use(express.urlencoded({
    extended: false
}));

app.use('/ajax', router);
router.get('/*', function(req, res, next) {
	var filePath = req.url;
	if(filePath == '/admin_landing.txt' ){
		if(course_session){
			filePath = '/stopcheck.txt';
		}
	}
	fs.readFile( __dirname + '/ajax' + filePath, (err, data) => {
		if(err){
	 		res.status(404).send("Sorry can't find that!")
	 	}
	 	else{
	 		res.send(data);
	 	}
	});
});

app.get('/course_session',(req,res) =>{
	res.end(course_session);
});
app.get('/',(req,res) => {
	res.sendFile( path.join( __dirname + '/login.html' ));
});

app.post('/',(req,res,next) => {
	var username = req.body.username,
		pwd = req.body.pwd,	
		ckin_string = req.body.ckin_string;

	if(ckin_string != undefined){
		course_session = ckin_string;
	}
	else{
		if(username === "admin" && pwd === "1234"){
			fs.readFile(__dirname + '/ajax/admin_landing.html', (err, data) => {
				if(err){
	 				res.status(404).send("Sorry can't find that!")
	 			}
	 			else{
	 				res.setHeader('Content-Type', 'text/html');
	 				res.send(data);
	 			}
			});
		}
		else{
			res.end("invaild user, try admin:1234");
		}
	}
});

app.post('/checkin',(req,res) =>{
	var checkin_string = req.body.ckin_string,
		name = req.body.name,
		userid = req.body.userid,
		current_time = getDateTime();
	if(course_session == checkin_string){
		MongoClient.connect(mongo_url, function(err, db) {
		    if (err) throw err;
			var dbo = db.db("cmpt218_weixinw");
			var ckin_obj = {"checkin_string" : checkin_string, 
							"name" : name,
							"userid" : userid,
							"time":current_time,
							"course_session" : session};
			dbo.collection("a3").insertOne(ckin_obj, function(err, res) {
				if (err) throw err;
				else{
					console.log(checkin_string,name,userid,current_time,session);
					db.close();
				}	
			});
		});
		res.end("Thanks for you participation!");
	}
	else{
		res.end("ckeckin_string cannot find, or course session has been closed");
	}
});

app.get('/stop' , (req,res) =>{
	MongoClient.connect(mongo_url, function(err, db) {
	    if (err) throw err;
		var dbo = db.db("cmpt218_weixinw");
		dbo.collection("a3").find({'course_session':session}).toArray((err,result) =>{
			if (err) {throw err;}
			var table_html = '';
			table_html = `<h1>${course_session} has ${result.length} attendees</h1><table><tr><th>Name</th><th>User ID</th><th>time</th></tr>`;
			result.forEach((e) =>{
				var name = e["name"],
					id = e["userid"],
					time = e["time"];
				table_html += `<tr><td>${name}</td><td>${id}</td><td>${time}</td></tr>`;
			});
			table_html += '</table>';
			courses.push(course_session);
			course_session = undefined;
			session = session + 1;
			db.close();
			res.end(table_html);
		});
	});
});

app.get('/history', (req,res) =>{
	MongoClient.connect(mongo_url, function(err, db){
		if (err) throw err;
		var dbo = db.db("cmpt218_weixinw");
		dbo.collection("a3").find({}).toArray((err,result) =>{
			if (err) {throw err;}
			if(session > 0){
				var obj_ary = [];
				for(var s = 0; s < session; s++) obj_ary.push([]);
				result.forEach((e) =>{
					var name = e["name"],
						id = e["userid"],
						time = e["time"],
						session = e["course_session"];
					obj_ary[session].push({"name":name,"userid":id,"time":time});
				});
				var div_html = '<div>';
				var table_html = '';
				index = 0;
				obj_ary.forEach((e) =>{
					
					table_html = `<div><h1>${courses[index]} has ${e.length} attendees</h1><table><tr><th>Name</th><th>User ID</th><th>time</th></tr>`;
					e.forEach((dic) =>{
						var name = dic["name"],
							id = dic["userid"],
							time = dic["time"];
						table_html += `<tr><td>${name}</td><td>${id}</td><td>${time}</td></tr>`;
					});
					table_html += '</table></div>';
					div_html += table_html;
					index++;
				});
				
				div_html += '</div>';
				db.close();
				res.end(div_html);
			}
			else{
				db.close();
				res.end("empty");
			}
			
		});
	});
});

app.use(function (req, res, next) {
	res.status(404).send("Sorry can't find that!")
});

var server = app.listen( process.env.PORT || 18938, function(){
	console.log('Listening on port ' + server.address().port);
});

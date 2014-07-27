var http = require("http");
var url = require("url");
var qs = require("querystring");
var cp = require("child_process").exec;

var port = 8080;
var itest = "email-smtp.us-east-1.amazonaws.com";

function servRequest(req, res) {
	//§console.log("req: ");
	//console.log(req);
	//console.log("res: ");
	//console.log(res);
	
	var path = url.parse(req.url);
	
	var strings = qs.parse(path.query);
	
	//console.log(strings);
	
	var num = strings['num'];
	var msg = strings['msg'];
	
	
	//testCon(function sendit() {
	if(typeof strings['num'] != "undefined" && typeof strings['msg'] != "undefined") {
		sendMessage(num, msg, res);
	} else {
		res.write("no");
		res.end();
	}
	//});
	
}

function endRequest(res) {
	res.write("ok");
	res.end();
	
}

function sendMessage(num, msg, res) {
	var sm = cp("echo '"+msg+"' | gammu-smsd-inject TEXT "+num, function (error, stdout, stderr) {
	    console.log('stdout: ' + stdout);
	    console.log('stderr: ' + stderr);
	    if (error !== null) {
	      console.log('exec error: ' + error);
	    }
	    
	    endRequest(res);
	});		
}

function testCon(passBackFunc) {
	
}


http.createServer(servRequest).listen(port);
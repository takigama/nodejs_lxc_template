var dgram = require("dgram");
var server = dgram.createSocket("udp4");


exports.start = function(port) {
	server.on("message", function (msg, rinfo) {
		console.log("msg: ", msg);
		console.log("server got: " + msg + " from " +
		rinfo.address + ":" + rinfo.port);
		parseMsg(msg);
	});

	server.on("listening", function () {
		var address = server.address();
		console.log("server listening " + address.address + ":" + address.port);
	});

	server.bind(port);
}
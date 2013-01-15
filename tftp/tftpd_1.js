var dgram = require("dgram");

var server = dgram.createSocket("udp4");

server.on("message", function (msg, rinfo) {
	console.log("msg: ", msg);
  console.log("server got: " + msg + " from " +
    rinfo.address + ":" + rinfo.port);
  parseMsg(msg);
});

server.on("listening", function () {
  var address = server.address();
  console.log("server listening " +
      address.address + ":" + address.port);
});

function parseMsg(msg) {
	var lkb = msg.readUInt16BE(0);
	var fnamend = 0;
	
	for(i=2; i<(msg.length-1); i++) {
		if(msg[i] == 0) {
			fnamend = i;
			console.log("setname end to ", fnamend);
		}
	}
	
	switch(lkb) {
	case 1:
		console.log("read request");
		break;
	case 2:
		console.log("write request");
		break;		
	}
	
	var fname = msg.toString("utf8", 2, fnamend);
	var ftype = msg.toString("utf8", fnamend+1, msg.length-1);
	
	console.log("fun is, '%s', '%s'", fname, ftype);
	
	switch(ftype) {
	case "netascii":
		console.log("was netascii");
		break;
	case "octet":
		console.log("was octet");
		break;
	default:
		console.log("errr: '", ftype, "'");
	}
}

server.bind(41234);
var readline = require('readline');
var net = require('net');



// ---- vars

var asPaths = new Array();
var readyToSend = false;
var currentPrompt;
var rl;
var nCons = 0;
var nSent = 0;
var myAS;
var myIP;
var server;
var cState = "starting";
var currentIPa = 1;
var currentIPb = 0;
var currentIPc = 0;


// ---- vars


if(typeof process.argv[2] == "undefined") {
	usage();
}

if(typeof process.argv[3] == "undefined") {
	usage();
}

function usage() {
	console.log("Usage: "+process.argv[1]+" MyAS MyIP");
	process.exit(1);
}





// ----------- startup

myAS = process.argv[2];
myIP = process.argv[3];


startCLI();
doPrompt();
createAsPathArray(1048576);
startServer();
cState = "idle";
doPrompt();

// ----------- startup










// --------- CLI

function updatePrompt() {
	currentPrompt = "("+myAS+"/"+myIP+") "+cState+":"+nCons+"/"+nSent+" ("+currentIPa+"."+currentIPb+"."+currentIPc+") > ";
}

function startCLI() {
	currentPrompt = "("+myAS+"/"+myIP+") starting... > ";

	rl = readline.createInterface({
		  input: process.stdin,
		  output: process.stdout
		});
	
	rl.on('line', function (cmd) {
		switch(cmd) {
		
		case "?":
		case "help":
		case "h":
			printCLIUsage();
			break;
		case "s":
			printStatus();
			break;
		case "u":
			startUpdates();
			break;
		case "p":
			stopUpdates();
			break;
		case "q":
		case "quit":
		case "end":
			  rl.close();
			  process.exit(0);
			  break;
		case "":
			break;
		}
		
		rl.setPrompt(currentPrompt);
		rl.prompt();
	});
}



function doPrompt() {
	updatePrompt();
	rl.setPrompt(currentPrompt);
	rl.prompt();	
}

function printCLIUsage() {
	console.log("Help");
	console.log("\th[elp],? - this help menu");	
	console.log("\tu - start sending route updates to connected peers");
	console.log("\tp - pause sending route updates to connected peers");
	console.log("\ts - status");
	console.log("\tq[uit],exit,end - Quit");
	console.log("Prompt layout");
	console.log("\t(AS/IP) state:connections/updates sent");
}

// ------------- CLI













//------------- network

function startUpdates() {
	
}

function serverconnection(c) {

	scon = c;

	c.on("end", function() {
		//console.log("Server disconnected");
		nCons--;
		if(nCons == 0) {
			cState = "idle";
			doPrompt();
		}
	});

	c.on("data", function(buffer) {
		parseBuffer(buffer, c);
	});

	cState = "connected";
	nCons++;
	doPrompt();

	//c.write("hello\r\n");
}


function startServer() {
	server = net.createServer(serverconnection);

	server.listen(10179, function() {
		//console.log("LOG: Server bound");
		doPrompt();
	});
	
}

//------------- network










// -------------- BGP 

function getNextIP() {
	// split into octets
	//var currentIPa = 1;
	//var currentIPb = 0;
	//var currentIPc = 0;

	currentIPc++;
	if(currentIPc > 254) {
		
		currentIPb++;
		if(currentIPb == 168 && currentIPa == 192) currentIPb++;
		if(currentIPb > 254) {
			currentIPa++;
			
			// dont publish bogons or 127
			if(currentIPa == 10) currentIPa++;
			if(currentIPa == 127) currentIPa++;
			if(currentIPa == 128) currentIPa++;			
		}
	}
	
	
	//console.log("created "+a+"."+b+"."+c+" from "+i);
	return currentIPa+"."+currentIPb+"."+currentIPc;

}

function getASPath() {
	
}

function constructUpdateMessage(n_up, myas, myip) {
	var bsize = 0;

	var aspath = getASPath();
	
	// first the header components
	bsize += 16;

	// next the length component
	bsize += 2;

	// next the n unfeasible
	bsize += 2;

	// next, path attr length
	bsize += 2;


	// now we begin the path attrs
	// first origin - simple
	var aspathn = 4;

	// next as path - hard, flag + type + len + aspath segment
	aspathn += 3;

	// as path segment size = 1 (type), + 1 (len) + as's*2
	var aspathlen = ((aspath.length+1)*2)+1+1;
	aspathn += aspathlen;
	
	// now next hop attrs = flag (1) + type (1) + len (1) + octets (4);
	aspathn += 7;
	bsize += aspathn;

	// now nlri = prefix len (1) + prefix fixed in our case (3)
	bsize += 4*n_up;

	// fudge
	bsize+=1;

	//console.log("size: " + bsize + ", an: " + aspathn + " al:" + aspathlen);
	var buf = new Buffer(bsize);
	var bp = 0;

	// now lets create the buffer
	buf.fill(0xff, bp, bp+16);
	bp+=16;
	buf.writeUInt16BE(bsize, bp);
	bp+=2;
	buf.writeUInt8(2, bp);
	bp++;
	buf.writeUInt16BE(0, bp);
	bp+=2;
	buf.writeUInt16BE(aspathn, bp);
	bp+=2;

	// path attr
	// origin
	buf.writeUInt8(0x40, bp);
	bp++;
	buf.writeUInt8(1, bp);
	bp++;
	buf.writeUInt8(1, bp);
	bp++;
	buf.writeUInt8(0, bp);
	bp++;

	// as path
	buf.writeUInt8(0x40, bp);
	bp++;
	buf.writeUInt8(2, bp);
	bp++;
	buf.writeUInt8(aspathlen, bp);
	bp++;
	buf.writeUInt8(2, bp);
	bp++;
	buf.writeUInt8(aspath.length+1, bp);
	bp++;
	//console.log("writing in my aspath: "+myas);
	buf.writeUInt16BE(myas, bp);
	bp+=2;
	aspath.forEach(function (ed) {
		//console.log("writing in aspath: "+ed);
		buf.writeUInt16BE(ed, bp);
		bp+=2;
	});

	// next hop
	buf.writeUInt8(0x40, bp);
	bp++;
	buf.writeUInt8(3, bp);
	bp++;
	buf.writeUInt8(4, bp);
	bp++;
	myip.split(".").forEach(function (ed) {
		//console.log("writing in next hop info: " + ed);
		buf.writeUInt8(parseInt(ed), bp);
		bp++;
	}); 

	// last, nlri
	for(var nn=0; nn < n_up; nn++) {
		buf.writeUInt8(24, bp);
		bp++;
		var ip = getNextIP();
		ip.split(".").forEach(function(ed){
			//console.log("Writing in nlri: "+ed);
			buf.writeUInt8(parseInt(ed), bp);
			bp++;
		});
	}

	console.log("buf is:");
	console.log(buf);
	console.log(buf.length);

	return buf;
}

function createAsPathArray(size) {
	for(var i=0; i<size; i++) {
		asPaths[i] = createaspath(i);
	}
}


function createaspath(i) {
	var n=(i%5)+2;
	var as = 1024;
	var ret = new Array();

	for(var t=0; t<n; t++) {
		i = i << 1;
		as = 1024 + (i%30000);
		ret[t] = as;
	}
	return ret;
}

function parseBuffer(b, c) {
	var len = b.readUInt16BE(16);
	var type = b.readUInt8(18);

	//console.log("got input: " + len + ", type: " + type);

	if(type == 1) {
		var vers = b.readUInt8(19);
		var as = b.readUInt16BE(20);
		var ht = b.readUInt16BE(22);
		var ot1 = b.readUInt8(24);
		var ot2 = b.readUInt8(25);
		var ot3 = b.readUInt8(26);
		var ot4 = b.readUInt8(27);
		var opl = b.readUInt8(28);
		console.log("got open type, vers: "+vers+", as: " + as);
		console.log("ht: " + ht + ", id: "+ot1+"."+ot2+"."+ot3+"."+ot4+", opl: "+opl);


		console.log("sending our open type");
		var out = new Buffer(29);


		out.fill(0xff, 0, 16);
		out.writeUInt16BE(29, 16);
		out.writeUInt8(1, 18);
		out.writeUInt8(4, 19);
		out.writeUInt16BE(myas, 20);
		out.writeUInt16BE(90, 22);
		out.writeUInt8(10, 24);
		out.writeUInt8(99, 25);
		out.writeUInt8(99, 26);
		out.writeUInt8(1,27);
		out.writeUInt8(0,28);

		c.write(out);
	} else if(type == 4) {
		console.log("writing keepalive - exact as sent");
		c.write(b);
		readyToSend = true;
		//if(updateSent ==0) beginUpdateSend(c);
	} else if(type == 2) {
		console.log("got update...");
		if(updateSent ==0) beginUpdateSend(c);
	} else {
		console.log("sending end...");
		c.end();
	}

	
}

//-------------- BGP
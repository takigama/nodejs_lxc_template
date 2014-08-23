var myas=4321;
var myip="10.10.40.1";
var number_of_route_adverts = 6;
var routes_per_advert = 4;

var net = require('net');

var updateSent = 0;

var scon;


function createentry(i) {
	// split into octets
	var a = 0;
	var b = 0;
	var c = 0;
	
	var x = 45<<16;

	//console.log("var x is "+x);
	i = i+x;
	//console.log("i now: "+i+" i>>8 "+i+" i>>16 "+(i>>16));
	
	c = i&255;
	b = (i>>8)&255;
	a = (i>>16)&255;
	
	
	//console.log("created "+a+"."+b+"."+c+" from "+i);
	return a+"."+b+"."+c;
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

console.log("startup....");



var data = new Array();

console.log("start construction");
for(var t=0; t<number_of_route_adverts; t++) {
	var thisdata = new Array();
	//var retvuf = new Buffer(1);
	for(var b=0; b<routes_per_advert; b++) {
		var nvt = (t*routes_per_advert)+b;
		thisdata[0] = createentry(nvt);
		//console.log("create entry from "+thisdata[0]+" with " + t);
		if(b==0) thisdata[1] = createaspath(nvt);
		// we construct the update messages while we do this

		// ok, that was dumb
		if(b>0) thisdata[2] += constructUpdateMessage(thisdata, true, routes_per_advert);
		else thisdata[2] = constructUpdateMessage(thisdata, false, routes_per_advert);
	}
	console.log("thisdata is...");
	console.log(thisdata);
	//console.log(thisdata.toJSON());
	console.log(thisdata[2].length);
	console.log(thisdata[2].toString());
	data[t] = thisdata;
}
console.log("finish construction");


//console.log("data: " + data.toString());
//console.log(data);
//console.log("Done!: " + data.length);

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
		//if(updateSent ==0) beginUpdateSend(c);
	} else if(type == 2) {
		console.log("got update...");
		if(updateSent ==0) beginUpdateSend(c);
	} else {
		console.log("sending end...");
		c.end();
	}

	
}

// this function gets prefix t from data[] and then
// creates an update message for it
function constructUpdateMessage(localdata, onlynlri, n_up) {
	console.log("Construction update for "+t);
	var bsize = 0;

	console.log("localdata0: " + localdata[0]);
	console.log("localdata1: " + localdata[1]);
	console.log("localdata0 - : " + typeof localdata[1]);
	console.log("localdata1 - : " + typeof localdata[1]);

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
	var aspathlen = ((localdata[1].length+1)*2)+1+1;
	aspathn += aspathlen;
	
	// now next hop attrs = flag (1) + type (1) + len (1) + octets (4);
	aspathn += 7;
	bsize += aspathn;

	// now nlri = prefix len (1) + prefix fixed in our case (3)
	bsize += 4;

	// fudge
	bsize+=1;

	// now figure out t_bsize;
	var t_bsize = bsize + (4*(n_up-1));

	//console.log("size: " + bsize + ", an: " + aspathn + " al:" + aspathlen);
	var buf = new Buffer(bsize);
	var bp = 0;

	// now lets create the buffer
	buf.fill(0xff, bp, bp+16);
	bp+=16;
	buf.writeUInt16BE(t_bsize, bp);
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
	buf.writeUInt8(localdata[1].length+1, bp);
	bp++;
	//console.log("writing in my aspath: "+myas);
	buf.writeUInt16BE(myas, bp);
	bp+=2;
	localdata[1].forEach(function (ed) {
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
	if(onlynlri) {
		console.log("constructing new buffer for only nlri");
		buf = new Buffer(4);
		bp = 0;
	}
	buf.writeUInt8(24, bp);
	bp++;
	localdata[0].split(".").forEach(function(ed){
		console.log("Writing in nlri: "+ed);
		buf.writeUInt8(parseInt(ed), bp);
		bp++;
	});

	console.log("buf is:");
	console.log(buf);
	console.log(buf.length);

	return buf;
}

// start sending updates messages
function beginUpdateSend(c) {
	updateSent = 1;
	var n = 0;
	data.forEach(function(led) {
		c.write(led[2]);
		n++;
	});
	console.log("finished publishing - "+n);
}

function serverconnection(c) {

	scon = c;

	c.on("end", function() {
		console.log("Server disconnected");
	});

	c.on("data", function(buffer) {
		parseBuffer(buffer, c);
	});

	console.log("Service connected from: " + c.remoteAddress);

	//c.write("hello\r\n");
}

console.log("Prefixes created, starting server");

var server = net.createServer(serverconnection);

server.listen(179, function() {
	console.log("Server bound");
});

#!/node/bin/node

// this next line is used by the parse_dist.php bit to create its version info
// VERSION_FOR_PARSER: 0.0.1

//var uid=$user
var fs = require("fs");
var asroot = false;
var debug_output = false;
var default_loop_time = 2000;

// set the global context
global.lxcnodejs = new Object();

// and begin...
if(process.getuid() == 0) {
	asroot = true;
} else {
	console.log("Not running as root, assuming debug mode, config file should be ./config");
}

if(asroot) var mnt = require("/node_modules/mount");

// perform mount
console.log("Mounting proc");
if(asroot) {
	mnt.mount("proc", "/proc", "proc");
} else {
	//console.log("fake mount");
	console.log("(debug) pass /proc mount");
}

// get the global space setup


// read main and node config file and parse
if(asroot) {
	console.log("Reading config file /config");
	loadConfig("/config");
	loadNodeConfig("/node_base/appconfig", "/node_base");
} else {
	console.log("Reading config file ./config (debug mode)");
	loadConfig("./config");
	loadNodeConfig("./appconfig", ".");
}

// begin the main loop
if(asroot) {
	startMainLoop();
} else {
	if(debug_output) console.log("(debug) main loop now begins with process monitor");
	startMainLoop();
}

/*
 * 
 * END OF MAIN ROUTINE
 * 
 */

function loadNodeConfig(file, basedir) {
	var configFile = fs.readFileSync(file).toString();
	var lines = configFile.split("\n");
	var nodes = new Object();
	
	for(var i=0; i < lines.length; i++) {
		//console.log("line: ", lines[i].trim());
		var sks = lines[i].match(/^[^#][a-zA-Z0-9:]+/);
		var lks = null;
		if(sks != null) lks = lines[i].split(":");
		if(lks!=null) {
			stl = lines[i].split(":");
			//console.log("lks is: '%s', '%s'", stl[0], stl[1]);
			if(stl.length < 3) {
				console.log("Invalid config line '%s', should be 'appname:directory:appfilepath[:options]'", lines[i].trim());
			} else {
				var args = null;
				if(stl[3] != null) args = stl[3];
				nodes[stl[0]] = new Object();
				nodes[stl[0]].directory = stl[1];
				nodes[stl[0]].file = stl[2];
				nodes[stl[0]].args = args;
				console.log("Adding node config for '%s'", stl[0]);
			}
		}
	}
	
	// check our config against the current global
	for(key in global.lxcnodejs) {
		if(typeof nodes[key] == "undefined") {
			global.lxcnodejs[key].stop_and_kill = true;
		} else {
			if(global.lxcnodejs[key].directory != nodes[key].directory) {
				if(debug_output) console.log("(debug) marking '%s' for restart on config change (directory)", key);
				global.lxcnodejs[key].directory = nodes[key].directory;
				global.lxcnodejs[key].restart = true;
			}
			if(global.lxcnodejs[key].file != nodes[key].file) {
				if(debug_output) console.log("(debug) marking '%s' for restart on config change (file)", key);
				global.lxcnodejs[key].file = nodes[key].file;
				global.lxcnodejs[key].restart = true;
			}
			if(global.lxcnodejs[key].args != nodes[key].args) {
				if(debug_output) console.log("(debug) marking '%s' for restart on config change (options)", key);
				global.lxcnodejs[key].args = nodes[key].args;
				global.lxcnodejs[key].restart = true;
			}
		}
	}
	
	// check for new configs and load them
	for(key in nodes) {
		if(typeof global.lxcnodejs[key] == "undefined") {
			if(debug_output) console.log("(debug) application '%s' is a new config, creating", key);
			global.lxcnodejs[key] = new Object();
			global.lxcnodejs[key].directory = nodes[key].directory;
			global.lxcnodejs[key].file = nodes[key].file;
			global.lxcnodejs[key].args = nodes[key].args;
			global.lxcnodejs[key].pid = -1;
		}
	}
}

function loadConfig(file) {
	var configFile = fs.readFileSync(file).toString();
	
	var lines = configFile.split("\n");
	
	for(var i=0; i < lines.length; i++) {
		//console.log("line: ", lines[i].trim());
		var lks = lines[i].match(/^[^#][a-zA-Z0-9]+\=.*/);
		if(lks!=null) {
			stl = lines[i].split("=");
			//console.log("lks is: '%s', '%s'", stl[0], stl[1]);
			if(stl.length !=2) {
				console.log("Invalid config line '%s', should be name=value format", lines[i].trim());
			} else {
				parseConfigLine(stl[0].trim(), stl[1].trim());
			}
		}
	}
}

function parseConfigLine(key, value) {
	//console.log("parsing config '%s' = '%s'", key, value);
	switch(key) {
		case "ip4address":
			var lxon = value.split(":");
			var iface = "";
			var addrs = "";
			if(lxon.length!=2) {
				console.log("Address config isnt correct, expect 'interface:address/mask'");
			} else {
				iface = lxon[0];
				addrs = lxon[1];				
				console.log("IPv4 address for '%s' is '%s'", iface, addrs);
				if(asroot) {
						var nodespawn = require("child_process").spawn,
							nodeproc = nodespawn("/sbin/ip", ["link", "set", iface, "address", addrs, "up"], opts);					
				} else {
					if(debug_output) console.log("(debug) would run /sbin/ip link set %s address %s up", iface, addrs);
				}
			}
			break;
		case "ip6address":
			var lxon = value.split(":");
			var iface = "";
			var addrs = "";
			if(lxon.length!=2) {
				console.log("Address config isnt correct, expect 'interface:address/mask'");
			} else {
				iface = lxon[0];
				addrs = lxon[1];				
				console.log("IPv4 address for '%s' is '%s'", iface, addrs);
			}
			break;
		case "ip4gateway":
			console.log("Default IPv4 gateway is: '%s'", value);
			if(asroot) {
				var nodespawn = require("child_process").spawn,
				nodeproc = nodespawn("/sbin/ip", ["route", "add", "default", "via", value], opts);					
			} else {
				if(debug_output) console.log("(debug) would run /sbin/ip route add default via %s", value);
			}
			break;
		case "checktimer":
			console.log("Setting health check timer to %s ms", value);
			default_loop_time = parseInt(value);
			if(default_loop_time < 100) {
				console.log("(warning) health check timer must be larger then 100, setting to 100, was %s", value);
				default_loop_time = 100;
			}
			break;
		case "ip6gateway":
			console.log("Default IPv6 gateway is: '%s'", value);
			break;
		case "dnsserver":
			console.log("DNS address set to: '%s'", value);
			break;
		case "hostname":
			console.log("Hostname set to: '%s'", value);
			break;
		case "debug":
			if(value == "true") {
				debug_output = true;
				console.log("(debug) Turning debugging on");
			}
		default:
			console.log("Unknown config line: '%s' = '%s'", key, value);
	}
}

function startApp(appname, directory, file, uid) {
	
    var opts = { uid: uid, env: process.env, cwd: directory };
    var sleeplen = Math.floor(Math.random()*60);
    var nodespawn = require("child_process").spawn;
    var nodeproc = null;
    
    if(asroot) {
        nodeproc = nodespawn("/node/bin/node", ["/node_code/nc.js"], opts);
    } else {
    	if(debug_output) console.log("(debug) using sleep to emulator process '%s'", appname);
    	nodeproc = nodespawn("sleep", [sleeplen], opts);
    }
    
    nodeproc.procname = appname;
    global.lxcnodejs[appname].pid = nodeproc.pid;
    
    if(debug_output) console.log("(debug) application started with pid of %d", nodeproc.pid);
    
    nodeproc.stdout.on("data", function(data) {
            console.log("data from nodespawn: '%s', '%s'", data, nodeproc.procname);
    });
    nodeproc.stderr.on("data", function(data) {
            console.log("stderrdata from nodespawn: '%s', '%s'", data, nodeproc.procname);
    });
    nodeproc.on("exit", function(data) {
            console.log("nodespawn died for '%s'", nodeproc.procname);
            global.lxcnodejs[nodeproc.procname].pid = 0;
    });
}

// main loop does all starting/restarting of applications
function startMainLoop() {
	// this loop kicks around every 5 seconds and just checks on the health of the processes or whatever
	for(key in global.lxcnodejs) {
		if(debug_output) console.log("(debug) checking state of '%s'", key);
		if(typeof global.lxcnodejs[key].pid == "undefined") {
			// start it.
			console.log("Starting application '%s' (no pid was defined)", key);
			startApp(key, global.lxcnodejs[key].directory, global.lxcnodejs[key].file, null);
		} else if(global.lxcnodejs[key].pid == -1) {
			// start it.
			console.log("Starting application '%s' (initial start)", key);
			startApp(key, global.lxcnodejs[key].directory, global.lxcnodejs[key].file, null);
		} else if(global.lxcnodejs[key].pid == 0) {
			// start it.
			console.log("Starting application '%s' (pid 0, possible application crash?)", key);
			startApp(key, global.lxcnodejs[key].directory, global.lxcnodejs[key].file, null);
		} else if(typeof global.lxcnodejs[key].restart != "undefined") {
			// restart it
			console.log("Restarting application '%s' (restart defined)", key);
			startApp(key, global.lxcnodejs[key].directory, global.lxcnodejs[key].file, null);
		} else if(typeof global.lxcnodejs[key].stop_and_kill != "undefined") {
			// kill it
			console.log("Restarting application '%s'", key);
		} else {
			if(debug_output) console.log("(debug) state of '%s' is healthy", key);
		}
		
		// we also need to check the control directory and see
		// if theres any control files
	}

	// and restart the loop
	setTimeout(startMainLoop, default_loop_time);
}
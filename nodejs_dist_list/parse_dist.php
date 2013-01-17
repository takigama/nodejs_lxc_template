<?php

$baseurl  = "http://nodejs.org/dist";

// we scrape nodejs.org/dist site looking for versions that exist so we can construct a meta data database
// so our lxc will be able to find versions in a more appropriate way

// first, get the main site

$fver = array();
$fvern = 0;
global $fver, $baseurl, $fvern;


echo "Getting base list from $baseurl\n";
$distbase = file_get_contents($baseurl);

// get all links that are directories
preg_match_all('/<a [^>]*href="(.+)"/', $distbase, $firstlist);

$versions = array();

foreach($firstlist[1] as $chk) {
	//echo "Got: $chk\n";
	if(preg_match('/v[0-9]+.[0-9]+.[0-9]+\//', $chk)) {
		if(preg_match('/v([0-9]+.[0-9]+.[0-9]+)\//', $chk, $vlist)) {
			$versions[$vlist[1]] = $chk;
		}		
	}
}

foreach($versions as $key => $val) {
	// now we get each version and parse whats in its directory
	echo "Checking $key => $baseurl/$val\n";
	
	//if(preg_match("/0\.8\.[1].*/", $key)) {
		$urlnow = "$baseurl/$val";
		$vers_dir = file_get_contents($urlnow);
	
		preg_match_all('/<a [^>]*href="(.+)"/', $vers_dir, $fileslist);
		
		checkFilesList(rtrim($val, "/"), $key, $fileslist);
	//}
}


// done!
//echo "and fver is now\n";
//var_dump($fver);

echo "finding max versions\n";
$maxstable[0] = 0;
$maxstable[1] = 0;
$maxstable[2] = 0;
$maxdev[0] = 0;
$maxdev[1] = 0;
$maxdev[2] = 0;
foreach($versions as $key => $val) {
	$vspl = explode(".", $key);
	if(($vspl[1]%2) == 1) {
		// dev
		if($vspl[0] >= $maxdev[0]) {
			if($vspl[1] >= $maxdev[1]) {
				if($vspl[2] >= $maxdev[2]) {
					$maxdev[0] = $vspl[0];
					$maxdev[1] = $vspl[1];
					$maxdev[2] = $vspl[2];
				}
			}
		}
	} else {
		// stable
		if($vspl[0] >= $maxstable[0]) {
			if($vspl[1] >= $maxstable[1]) {
				if($vspl[2] >= $maxstable[2]) {
					$maxstable[0] = $vspl[0];
					$maxstable[1] = $vspl[1];
					$maxstable[2] = $vspl[2];
				}
			}
		}
	}
}

echo "getting init version\n";
$initvers_l = explode("\n", file_get_contents("../lxc/init.js"));
$initvers_t = preg_grep("/.*VERSION_FOR_PARSER.*/", $initvers_l);
foreach($initvers_t as $val) {
        $cpl = explode(":", $val);
        $initvers = trim($cpl[1]);
}

echo "dumping to versions file\n";
$versdate = date("Ymd");
$versfilename = "./versions/versions_file.$versdate";
$versfile = fopen("$versfilename", "w");
if($versfile !== false) {
	fwrite($versfile, "baseurl:$baseurl\n");
	foreach($fver as $line) {
		fwrite($versfile, "$line\n");
	}
	fclose($versfile);

	// compress teh file
	system("gzip -c versions/$versfilename > versions/$versfilename.gz");
	
	// create a current versions file
	$cv = fopen("versions/current_version", "w");
	if($cv !== false) {
		fwrite($cv, "version:$versdate\n");
		fwrite($cv, "stable:".$maxstable[0].".".$maxstable[1].".".$maxstable[2]."\n");
		fwrite($cv, "dev:".$maxdev[0].".".$maxdev[1].".".$maxdev[2]."\n");
		fwrite($cv, "nodejs:$initvers\n");
		fclose($cv);
	}
} else {
	echo "Failed to open vers file!\n";	
}


function checkFilesList($url, $vers, $fileslist) {
	global $fver, $baseurl, $fvern;
			
	echo "Checking $url, $vers\n";
	
	$shalist = array();
	
	foreach($fileslist[1] as $fname) {
		$is_echo = false;
		$flurl = "";
		$arch = "";
		$plat = "";
		$thissha = "";
		
		if($fname == "SHASUMS.txt") {
			//$shas = file_get_
			$shas_r = file_get_contents("$baseurl/$url/SHASUMS.txt");
			$shalist = explode("\n", $shas_r);
			foreach($shalist as $ssha) {
				$fsha = preg_split("/[ \t]+/", $ssha);
				if(isset($fsha[1])) $shalist[$fsha[1]] = $fsha[0];
			}
			//echo "Shasums file: $fname\n";
			//var_dump($shalist);
		} else if($fname == "MD5SUMS.txt") {
			// nothing yet
		} else 	if(preg_match("/.*linux.*64\.tar\.gz/", $fname)) {
			//echo "64 bit version for linux: $fname\n";
			$thissha = "-";
			if(isset($shalist[$fname])) $thissha = $shalist[$fname];
			$is_echo = true;
			$plat = "linux";
			$arch = "x86_64";
		} else if(preg_match("/.*linux.*86\.tar\.gz/", $fname)) {
			//echo "32 bit version for linux: $fname\n";
			$thissha = "-";
			if(isset($shalist[$fname])) $thissha = $shalist[$fname];
			//echo "$vers:$url/$fname:linux:i686:$thissha\n";
			$is_echo = true;
			$plat = "linux";
			$arch = "i686";
		} else 	if(preg_match("/.*darwin.*86\.tar\.gz/", $fname)) {
			//echo "32 bit version for darwin: $fname\n";
			$thissha = "-";
			if(isset($shalist[$fname])) $thissha = $shalist[$fname];
			//echo "$vers:$url/$fname:darwin:i686:$thissha\n";
			$is_echo = true;
			$plat = "darwin";
			$arch = "i686";
		} else if(preg_match("/.*darwin.*64\.tar\.gz/", $fname)) {
			//echo "64 bit version for darwin: $fname\n";
			$thissha = "-";
			if(isset($shalist[$fname])) $thissha = $shalist[$fname];
			//echo "$vers:$url/$fname:darwin:x86_64:$thissha\n";
			$is_echo = true;
			$plat = "darwin";
			$arch = "x86_64";
		} else if(preg_match("/.*sunos.*64\.tar\.gz/", $fname)) {
			// echo "64 bit version for sunos: $fname\n";
			$thissha = "-";
			if(isset($shalist[$fname])) $thissha = $shalist[$fname];
			//echo "$vers:$url/$fname:sunos:x86_64:$thissha\n";
			$is_echo = true;
			$plat = "sunos";
			$arch = "x86_64";
		} else if(preg_match("/.*sunos.*86\.tar\.gz/", $fname)) {
			//echo "32 bit version for sunos: $fname\n";
			$thissha = "-";
			if(isset($shalist[$fname])) $thissha = $shalist[$fname];
			//echo "$vers:$url/$fname:sunos:i686:$thissha\n";
			$is_echo = true;
			$plat = "sunos";
			$arch = "i686";
		} else if(preg_match("/.*linux-arm.*\.tar\.gz/", $fname)) {
			// echo "arm for linux: $fname\n";
			$thissha = "-";
			if(isset($shalist[$fname])) $thissha = $shalist[$fname];
			//echo "$vers:$url/$fname:linux:armhf:$thissha\n";
			$is_echo = true;
			$plat = "linux";
			$arch = "armhf";
		} else if(preg_match("/node-v[0-9]+\.[0-9]+\.[0-9]+\.tar\.gz/", $fname)) {
			$thissha = "-";
			if(isset($shalist[$fname])) $thissha = $shalist[$fname];
			//echo "$vers:$url/$fname:linux:armhf:$thissha\n";
			$is_echo = true;
			$plat = "src";
			$arch = "-";
		}
		
		if($is_echo) {
			$fver[$fvern++] = "$vers:$plat:$arch:$url/$fname:$thissha";
		}
	}
}
?>
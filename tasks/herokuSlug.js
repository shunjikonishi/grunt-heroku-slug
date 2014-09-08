var TASK_NAME = "herokuSlug",
	grunt = require("grunt"),
	http = require("http"),
	https = require("https"),
	fs = require("fs"),
	exec = require("child_process").exec,
	Targz = require("tar.gz"),
	URL = require("url"),
	EventEmitter = require("events").EventEmitter,
	emitter = new EventEmitter(),
	jdk_version = {
		"1.8" : "http://heroku-jdk.s3.amazonaws.com/openjdk1.8.0_b107.tar.gz",
		"1.7" : "http://heroku-jdk.s3.amazonaws.com/openjdk1.7.0_45.tar.gz"
	};

function StatusCtrl(appInfo, appDir, done) {
	function finish() {
		grunt.log.writeln("Finished: " + (new Date().getTime() - startTime) + "ms.");
		done();
	}
	var status = {
			"jdk" : null,
			"tarball" : null,
			"apikey" : null,
			"upload" : null,
			"release" : null
		},
		startTime = new Date().getTime();
	this.fireEvent = function(name, value) {
grunt.log.writeln("fireEvent: " + name + ", " + value);
		status[name] = value;
		switch (name) {
			case "jdk":
				if (value === "prepared") {
					tarball(appDir);
				} else if (value === "extract") {
					extract(appDir);
				}
				break;
			case "tarball":
				if (value === "done") {
					apikey();
				}
				break;
			case "apikey":
				var auth = new Buffer(":" + value, "ascii").toString("base64");
				appInfo.auth = auth;
				createSlug(appInfo, appDir + ".tar.gz");
				break;
			case "upload":
				if (value === "done") {
					release(appInfo, appDir + ".tar.gz");
				}
				finish();
				break;
		}
	};
	this.status = status;
}
function apikey() {
	grunt.log.writeln("Retrieve apikey...");
	exec("heroku auth:token", function(err, stdout, stderr) {
		if (err) {
			grunt.fail.warn(err);
		}
		emitter.emit(TASK_NAME, "apikey", stdout);
	});
}
function tarball(appDir) {
	grunt.log.writeln("Compressing...");
	/*
	new Targz().compress(appDir, appDir + ".tar.gz", function(err) {
		if (err) {
			grunt.fail.warn(err);
		}
		emitter.emit(TASK_NAME, "tarball", "done");
	});
	*/
	emitter.emit(TASK_NAME, "tarball", "done");
}

function extract(appDir) {
	grunt.log.writeln("Extracting JDK...");
	new Targz().extract(appDir + "/jdk.tar.gz", appDir + "/.jdk", function(err) {
		if (err) {
			grunt.fail.warn(err);
		}
		grunt.file.delete(appDir + "/jdk.tar.gz");
		emitter.emit(TASK_NAME, "jdk", "prepared");
	});
}
function install_jdk(appDir, version) {
	if (!jdk_version[version]) {
		grunt.fail.warn("Unknown jdk_version : " + version + ". Valid value is '1.8' or '1.7'.");
	}
	var releaseFile = appDir + "/.jdk/release",
		downloadFile = appDir + "/jdk.tar.gz";

	if (grunt.file.exists(releaseFile)) {
		if (grunt.file.read(releaseFile).indexOf('JAVA_VERSION="' + version) !== -1) {
			grunt.log.writeln("JDK " + version + " has already installed. Skip downloading.");
			return;
		}
	}
	grunt.log.writeln("Downloading JDK " + version + "...");
	emitter.emit(TASK_NAME, "jdk", "download");
	var os = fs.createWriteStream(downloadFile);
	os.on("finish", function() {
		emitter.emit(TASK_NAME, "jdk", "extract");
	});
	http.get(jdk_version[version], function(res) {
		res.pipe(os);
	});
}
function setup_java_env(appDir) {
	var profileDir = appDir + "/.profile.d",
		jvmSh = profileDir + "/jvm.sh";
	if (!grunt.file.exists(profileDir)) {
		grunt.file.mkdir(profileDir);
	} 
	if (grunt.file.exists(jvmSh)) {
		return;
	}
	grunt.log.writeln("Setup java env...");
	grunt.file.write(jvmSh, 'export PATH="/app/.jdk/bin:$PATH"\n');
}
function createSlug(appInfo, tarball) {
	grunt.log.writeln("Creating new slug...");
	var bodyJson = {
			"process_types" : appInfo.process_types
		},
		body = JSON.stringify(bodyJson);

	var req = https.request({
		"headers" : {
			"Content-Type" : "application/json",
			"Accept" : "application/vnd.heroku+json; version=3",
			"Authorization" : appInfo.auth,
			"Content-Length" : body.length
		},
		"method" : "POST",
		"host" : "api.heroku.com",
		"path" : "/apps/" + appInfo.appname + "/slugs"
	}, function(res) {
		var status = res.statusCode;
		res.on("data", function(data) {
			if (status === 201) {
				upload(appInfo, tarball, JSON.parse(data.toString("utf-8")));
			} else {
				grunt.fail.warn("Failure create slug: " + data.toString("utf-8"));
			}
		});
	});
	req.write(body);
	req.end();
}
function upload(appInfo, tarball, slugInfo) {
	grunt.log.writeln("Uploading...");
	var url = URL.parse(slugInfo.blob.url),
		host = url.host,
		path = url.path;
console.log("upload0: " + JSON.stringify(slugInfo));
console.log("upload1: " + slugInfo.blob.url);
console.log("upload2: " + host);
console.log("upload3: " + path);
console.log("upload4: " + fs.statSync(tarball).size);
	var req = https.request({
		"headers" : {
			"Content-Type" : "application/octet-stream",
			"Content-Length" : fs.statSync(tarball).size
		},
		"method" : "PUT",
		"host" : host,
		"path" : path
	}, function(res) {
		var status = res.statusCode;
console.log("status: " + status);
		if (status === 200) {
			release(appInfo, slugInfo);
		}
	});
	var is = fs.createReadStream(tarball), 
		cnt = 0;
	is.on("data", function(data) {
console.log("data: " + ++cnt);
		req.write(data);
	});
	is.on("end", function(data) {
console.log("end: " + cnt);
		req.end();
	});
}

function release(appInfo, slugInfo) {

}

grunt.registerMultiTask(TASK_NAME, 'Direct slug release to heroku', function () {
	var appname = this.target,
		config = grunt.config(TASK_NAME)[appname],
		dir = config.targetDir || "heroku",
		appDir = dir + "/app",
		process_types = config.process_types;

	grunt.log.writeln(TASK_NAME + ": Slug release start - " + appname);
	if (!process_types) {
		grunt.fail.warn("'process_types' key is not found.");
	}

	var statusCtrl = new StatusCtrl({
			"appname" : appname,
			"process_types" : process_types
		}, appDir, this.async());

	emitter.removeAllListeners(TASK_NAME);
	emitter.on(TASK_NAME, statusCtrl.fireEvent);

	if (!grunt.file.exists(dir)) {
		grunt.file.mkdir(dir);
	}
	if (!grunt.file.exists(appDir)) {
		grunt.file.mkdir(appDir);
	}
	if (config.env) {
		// For JVM app.
		if (config.env.jdk_version) {
			setup_java_env(appDir);
			install_jdk(appDir, config.env.jdk_version);
		}
	}
	if (!statusCtrl.status.jdk) {
		tarball(appDir);
	}
});

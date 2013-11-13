/*
    Copyright 2013 Coherent Theory LLC

    This program is free software; you can redistribute it and/or
    modify it under the terms of the GNU General Public License as
    published by the Free Software Foundation; either version 2 of
    the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>
*/

var fs = require('fs');
var sys = require('sys')
var exec = require('child_process').exec;



module.exports.stream = function(res, parsedUrl, filename, fn) {
    fs.stat(parsedUrl.path, function(err, stat) {
        if (err) {
            fn(err);
            return;
        }

        var obsDesc;

        try {
            obsDesc = JSON.parse(fs.readFileSync(parsedUrl.path), 'utf8');
        } catch (e) {
            // An error has occured, handle it, by e.g. logging it
            console.log(e);
            return;
        }

        if (obsDesc.package && obsDesc.architecture && obsDesc.repository) {
            child = exec("osc list -b kde:stable:apps " + obsDesc.package + "|grep '" + obsDesc.package + "-[0-9].*'" + obsDesc.architecture, function (error, stdout, stderr) {

                if (error !== null) {
                    console.log('exec error: ' + error);
                }

                var re = new RegExp("\ ([^-]*\)-\(.*\)\.\(" + obsDesc.architecture + "\).rpm\\n");
                obsDesc.packageId = stdout.replace(re, "$1;$2;$3;" + obsDesc.repository);
                var answer = JSON.stringify(obsDesc);

                res.header('Content-Length', answer.length);
                res.header('Content-Type', 'text/plain');
                res.attachment(filename);
                res.write(answer);
                res.end();
                fn(null)
            });
        }
    });
}

module.exports.size = function(path, fn) {

    fs.stat(path, function(err, stat) {
        if (err) {
            console.log(err);
            fn(-1);
            return;
        }

        var obsDesc;

        try {
            obsDesc = JSON.parse(fs.readFileSync(path), 'utf8');
        } catch (e) {
            // An error has occured, handle it, by e.g. logging it
            console.log(e);
            fn(-1);
            return;
        }

        if (obsDesc.package && obsDesc.architecture) {
            child = exec("osc list -bl kde:stable:apps " + obsDesc.package + "|grep '" + obsDesc.package + "-[0-9].*'" + obsDesc.architecture, function (error, stdout, stderr) {

                if (error !== null) {
                    console.log('exec error: ' + error);
                    fn(-1);
                    return;
                }

                var re = new RegExp(" *([0-9]*).*\n");
                var size = stdout.replace(re, "$1");

                fn(size)
            });
        }
    });
}

module.exports.urlToRepoInfo = function(parsedUrl) {
    var info = {'project': '', 'repository': '', 'architecture': '', 'package': ''};
    var parts = parsedUrl.path.split('/');

    console.log(parts)
    if (parts.length != 5) {
        return info;
    }

    info.project = parts[1];
    info.repository = parts[2];
    info.architecture = parts[3];
    info.package = parts[4];
    return info;
}

module.exports.resolveUrl = function(parsedUrl, fn) {
    var info = module.exports.urlToRepoInfo(parsedUrl);
    console.log(info);

    child = exec("osc list -b " + info.project + " " + info.package + "|grep '" + info.package + "-[0-9].*'" + info.architecture, function (error, stdout, stderr) {

        if (error !== null) {
            console.log('exec error: ' + error);
            fn(null);
        }

        fn('http://repo.merproject.org/obs/' + info.project.replace(':', ':/') + '/' + info.repository + '/' + info.architecture + '/' + stdout.substring(1, stdout.length-1));
    });
}


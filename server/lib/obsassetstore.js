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

var ObsAssetStore = (function() {
    
    ObsAssetStore.prototype.stream = function(res, parsedUrl, filename, fn) {
        fs.stat(parsedUrl.path, function(err, stat) {
            if (err) {
                fn(err);
                return;
            }

            var obsDesc = JSON.parse(fs.readFileSync(parsedUrl.path), 'utf8');

            if (obsDesc.package && obsDesc.architecture && obsDesc.repository) {
                child = exec("osc list -b kde:stable:apps " + obsDesc.package + "|grep '" + obsDesc.package + "-[0-9].*'" + obsDesc.architecture, function (error, stdout, stderr) {
                    console.log('stdout: ' + stdout);
                    console.log('stderr: ' + stderr);

                    if (error !== null) {
                        console.log('exec error: ' + error);
                    }

                    var re = new RegExp("s/\([^-]*\)-\(.*\)." + obsDesc.architecture + ".rpm/\\1;\\2;" + obsDesc.repository);
                    obsDesc.packageId = re.exec(stdout);
                    var answer = JSON.stringify(obsDesc);
                    

                    res.header('Content-Length', answer.size);
                    res.header('Content-Type', 'text/plain');
                    res.attachment(filename);
                    res.write(answer);
                    res.end();
                });
            }
                    
        });
    }
    
});

module.exports.ObsAssetStore = ObsAssetStore;
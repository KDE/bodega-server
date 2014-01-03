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
var url = require('url');



module.exports.size = function(parsedUrl, fn) {

    var info = module.exports.urlToRepoInfo(parsedUrl);

    if (info.package && info.architecture) {
        child = exec("osc list -bl " + info.project + " " + info.package + "|grep '" + info.package + "-[0-9].*'" + info.architecture, function (error, stdout, stderr) {

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

    child = exec("osc list -b " + info.project + " " + info.package + "|grep '" + info.package + "-[0-9].*'" + info.architecture, function (error, stdout, stderr) {

        if (error !== null) {
            console.log('exec error: ' + error);
            fn(null);
        }

        fn('http://repo.merproject.org/obs/' + info.project.replace(/:/g, ':/') + '/' + info.repository + '/' + info.architecture + '/' + stdout.substring(1, stdout.length-1));
    });
}

module.exports.publish = function(assetInfo, fn) {
    var info = module.exports.urlToRepoInfo(url.parse(assetInfo.externpath));

    //TODO: destination repo configurable
    child = exec("osc copypac " + info.project + " " + info.package + " bodega:kde", function (error, stdout, stderr) {

        if (error !== null) {
            console.log('exec error: ' + error);
            fn({'message': error}, assetInfo);
        }

        assetInfo.externpath = 'obs://build.merproject.org/bodega:kde/latest_' + info.architecture + '/' + info.architecture + '/' + info.package;
        fn(null, assetInfo);
    });
}

/* 
    Copyright 2012 Coherent Theory LLC

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

var utils = require('../utils.js');
var fs = require('fs');

module.exports = function(db, req, res) {
    var json = {
        device : req.session.user.device,
        authStatus : req.session.authorized,
        points : req.session.user.points,
        asset : 1
    };

    console.log("start ");
    console.log("path = "  + req.files.asset['path']);
    console.log("size = "  + req.files.asset['size']);
    console.log("filename = "  + req.files.asset['filename']);
    console.log("length = "  + req.files.asset['length']);
    var file = req.files.asset;


    console.log('==============================================================');
    var stream = fs.createReadStream(req.files.asset['path']);
    /*
    stream.setEncoding('utf8');
    stream.on('start', function() { console.log('==============================================================') ; })
          .on('data', function(chunk){ console.log(chunk); })
          .on('end', function() { console.log('==============================================================');});
    fs.unlink(file.path);
    */
    res.json(json);
};

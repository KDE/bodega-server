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

var errors = require('../errors.js');
var utils = require('../utils.js');
var fs = require('fs');

module.exports = function(db, req, res) {
    //console.log("start ");

    var file = req.files.asset;
    if (!file || file['size'] < 1 || file['filename'].length === 0) {
        //console.log("error due to bad file");
        errors.report('UploadFailed', req, res);
        return;
    }

    checkPartner(db, req, res);
    /*
    console.log("path = "  + req.files.asset['path']);
    console.log("size = "  + req.files.asset['size']);
    console.log("filename = "  + req.files.asset.filename);
    console.log("length = "  + req.files.asset['length']);
    */
};


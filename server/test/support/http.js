var fs = require('fs');
var http = require('http');
var paths = require('path');
var request = require('request');
var cookies = require('./cookie.js');

function getUrl(app, url, fn, cookie) {
    var options = {
        host: app.config.host,
        port: app.config.port,
        path: url,
        headers : {
            'Cookie': cookie
        }
    };
    http.get(options, function(res) {
        var buf = '';
        res.on("data", function(chunk) {
            buf += chunk;
        });
        res.on("end", function(chunk) {
            try {
                res.body = JSON.parse(buf);
                fn(res);
            } catch (e) {
                console.log("!!!! JSON Parsing failed on this return: " + buf + "\n(" + e + ")");
            }
        });
    });
}

function uploadFile(path, app, url, postData, fn, cookie) {
    var j = request.jar();
    if (cookie) {
        //var c = request.cookie(cookie);
        for (var i in cookie) {
            j.add(new cookies.Cookie(cookie[i]));
        }
    }
    var options = {
        url : 'http://' + (app.config.host ? app.config.host : 'localhost') + ':' + app.config.port + url,
        jar : j
    };

    var req = request.post(options,
            function (error, response, body) {
                var res = new Object();
                res.statusCode = response.statusCode;
                res.err = error;
                try {
                    res.body = JSON.parse(body);
                } catch (e) {
                    res.body = body;
                }
                res.headers = response.headers;
                fn(res);
            });
    var form = req.form();
    form.append('asset', fs.createReadStream(path));
    for (i in postData) {
        form.append(i, postData[i]);
    }
}

function auth(app, fn) {

    describe('needs to authorize first', function(){
        it('authorize correctly.', function(done){
    getUrl(app,
           '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_store=VIVALDI-1',
           function(res) {
               res.statusCode.should.equal(200);
               res.headers.should.have.property(
                   'content-type',
                   'application/json; charset=utf-8');
               res.headers.should.have.property('set-cookie');
               res.body.should.have.property('authStatus', true);
               fn(res, done);
           });
        });
    });
}

module.exports.uploadFile = uploadFile;
module.exports.getUrl = getUrl;
module.exports.auth = auth;

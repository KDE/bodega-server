var fs = require('fs');
var http = require('http');
var paths = require('path');
var request = require('request');

function getUrl(app, url, fn, cookie)
{
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
            var pageType = res.headers['content-type'];
            if (pageType === 'application/json; charset=utf-8') {
                try {
                    res.body = JSON.parse(buf);
                } catch (e) {
                    console.log("!!!! JSON Parsing failed on this return: " + buf + "\n(" + e + ")");
                }
            } else if (pageType === 'text/html; charset=utf-8') {
                res.body = buf;
            }
            fn(res);
        });
    });
}

function postUrl(app, path, formData, fn, cookie)
{
    var options = {
        uri: 'http://' + app.config.host + ':' + app.config.port + path,
        form: formData,
        jar: false,
        headers : {
            'Cookie': cookie
        }
    };
    request.post(options,
        function(err, res, body) {
            if (err) {
                console.log(err);
            } else {
                try {
                    res.body = JSON.parse(body);
                } catch (e) {
                    res.body = body;
                }
            }
            fn(res);
        });
}

function auth(app, fn)
{
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

module.exports.getUrl = getUrl;
module.exports.postUrl = postUrl;
module.exports.auth = auth;

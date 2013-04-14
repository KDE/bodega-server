var http = require('http');

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
            res.body = JSON.parse(buf);
            fn(res);
        });
    });
}

function auth(app, fn) {

    describe('needs to authorize first', function(){
        it('authorize correctly.', function(done){
    getUrl(app,
           '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_device=VIVALDI-1',
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
module.exports.auth = auth;

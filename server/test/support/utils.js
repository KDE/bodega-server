var fs = require('fs');
var http = require('http');
var paths = require('path');
var request = require('request');
var assert = require('assert');
var async = require('async');
var pg = require('pg');

var app = require('../../app.js');

var baseJsonPath = '/bodega/v1/json/';

var dbConnectionString = app.config.service.database.protocol + "://" +
                       app.config.service.database.user + ":" +
                       app.config.service.database.password +
                       "@" + app.config.service.database.host + "/" +
                       app.config.service.database.name;

function getUrl(path, fn, opts)
{
    if (path[0] !== '/') {
        path = baseJsonPath + path;
    }

    var options = {
        host: app.config.host,
        port: app.config.port,
        path: path,
        headers : {
            'Cookie': (opts && opts.noAuth) ? null : module.exports.cookie
        }
    };

    http.get(options, function(res) {
        var buf = '';
        res.on("data", function(chunk) {
            buf += chunk;
        });
        res.on("end", function(chunk) {
            var contentType = res.headers['content-type'];
            if (opts && opts.html) {
                assert.deepEqual(contentType, 'text/html; charset=utf-8');
                res.body = buf;
            } else {
                assert.deepEqual(contentType,
                                 'application/json');
                try {
                    res.body = JSON.parse(buf);
                } catch (e) {
                    console.log("!!!! JSON Parsing failed on this return: " + buf + "\n(" + e + ")");
                }
            }
            fn(res);
        });
    });
}

function getHtml(path, fn, opts)
{
    if (!opts) {
        opts = {};
    }
    opts.html = true;
    getUrl(path, fn, opts);
}

function postUrl(path, formData, fn, opts)
{
    if (path[0] !== '/') {
        path = baseJsonPath + path;
    }

    var options = {
        uri: 'http://' + app.config.host + ':' + app.config.port + path,
        form: formData,
        jar: false,
        headers : {
            'Cookie': (opts && opts.noAuth) ? null : module.exports.cookie
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

var defaultAuth = {
    user: 'zack@kde.org',
    password: 'zack',
    store: 'KDE-1'
};

var currentlyAuthed = {
    user: '',
    password: '',
    store: ''
};

function auth(params, cb)
{
    describe('Authorization', function() {
        it('succeeds', function(done) {
            if (!params) {
                params = defaultAuth;
            }

            if (!cb &&
                module.exports.cookie !== '' &&
                (((!params.user && currentlyAuthed.user === defaultAuth.user) ||
                   params.user === currentlyAuthed.user) &&
                 ((!params.password && currentlyAuthed.user === defaultAuth.user) ||
                   params.password === currentlyAuthed.password) &&
                 ((!params.store && currentlyAuthed.store === defaultAuth.store) ||
                   params.store === currentlyAuthed.store))) {
                // we are already authed as requested
                done();
                return;
            }

            currentlyAuthed.user = params.user ? params.user : defaultAuth.user;
            currentlyAuthed.password = params.password ? params.password : defaultAuth.password;
            currentlyAuthed.store = params.store ? params.store : defaultAuth.store;
            getUrl('/bodega/v1/json/auth?auth_user=' + currentlyAuthed.user +
                   '&auth_password=' + currentlyAuthed.password +
                   '&auth_store=' + currentlyAuthed.store,
                   function(res) {
                       res.statusCode.should.equal(200);
                       res.headers.should.have.property('content-type', 'application/json');
                       res.headers.should.have.property('set-cookie');
                       res.body.should.have.property('authStatus', true);
                       module.exports.cookie = res.headers['set-cookie'];
                       if (cb) {
                           cb(res, done);
                       } else {
                           done();
                       }
                   },
                   { noAuth: true });
        });
    });
}

function snapshotTable(db, table, res, cb)
{
    var query = 'select md5(array_to_string(array(select ' +
        table + '::text from ' + table + ' order by '+ table +
        '), \', \')) as md5, (select count(*) from ' + table +
        ') as count';
    db.query(query, [], function(err, result) {
        if (err) {
            console.log("Snapshot: database error:");
            console.log(err);
            cb(err, table, res);
            return;
        }
        if (result.rows.length !== 1) {
            console.log("Snapshot: unexpected number of rows: ");
            console.log(result.rows);
        }
        res[table] = result.rows[0];
        cb(null, table, res);
    });
}

function takeSnapshot(db, fn)
{
    var res = {};
    var tables = ['partners', 'people', 'stores', 'warehouses',
                  'tagTypes', 'tags', 'tagText', 'assets', 'assetTags',
                  'assetText', 'assetPreviews', 'assetChangelogs',
                  'channels', 'channelTags', 'channelAssets',
                  'subChannelAssets', 'purchases',
                  'downloads' ];
    async.each(tables, function(table, callback) {
        snapshotTable(db, table, res, callback);
    }, function(err) {
        fn(err, res);
    });
}

function dbSnapshot(db, fn)
{
    if (db) {
        takeSnapshot(db, fn);
        return;
    }

    pg.connect(dbConnectionString, function(err, client, finis) {
        takeSnapshot(client, function(err, res) {
            fn(err, res);
            finis();
        });
    });
}

// public variables
module.exports.app = app;
module.exports.baseJsonPath = baseJsonPath;
module.exports.dbConnectionString = dbConnectionString;
module.exports.cookie = '';

// public functions
module.exports.getUrl = getUrl;
module.exports.getHtml = getHtml;
module.exports.postUrl = postUrl;
module.exports.auth = auth;
module.exports.dbSnapshot = dbSnapshot;


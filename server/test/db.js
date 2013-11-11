var utils = require('./support/utils.js');

// support variables
var newMakerIds = [];

// start of tests

var origValue;

describe('Database: ', function() {
    before(function(done) {
        app.config.printErrors = false;
        origValue = app.db.connectionString;
        app.db.connectionString = "pg://baduser:badpassword@nosuchhost/nodb";
        done();
    });

    it('should fail web call if database not available', function(done) {
        utils.getUrl('contact',
            function(res) {
                var expected = {
                    authStatus: false,
                    device: 0,
                    store: 0,
                    points: 0,
                    success: false,
                    error: {
                            type: 'Database'
                        }
                    };

                // we don't really care what the message is
                expected.message = res.body.message;
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.eql(expected);
                done();
            },
            { noAuth: true });
    });

    it('should fail direct call if database not available', function(done) {
        app.db.dbQuery();
        done();
    });

    after(function(done) {
        app.config.printErrors = true;
        app.db.connectionString = origValue;
        done();
    });
});


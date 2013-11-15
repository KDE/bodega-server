var testutils = require('./support/utils.js');
var utils = require('../lib/utils.js');
var errors = require('../lib/errors.js');

var assert = require('assert');
describe('Errors', function() {
    it('Non-JSON routes', function(done) {
        testutils.getHtml('/',
                 function(res) {
                     res.statusCode.should.equal(200);
                     res.headers.should.have.property('content-type', 'text/html; charset=utf-8');
                     done();
                 });
    });

    it('Non-JSON routes', function(done) {
       testutils.getHtml('/does/not/exist',
                 function(res) {
                     res.statusCode.should.equal(404);
                     res.headers.should.have.property('content-type', 'text/html; charset=utf-8');
                     done();
                 });
    });
});

describe('Errors', function() {
    it('Logging', function(done) {
        var error = errors.create('MissingParameters', 'Synthetic error');
        errors.log(error);
        done();
    });
});


describe('Utils parsing', function() {
    describe('true value', function() {
        it('Bool as bool', function(done) {
            var b1 = utils.parseBool(true);
            b1.should.eql(true);
            done();
        });

        it('Lower case text as bool', function(done) {
            var b1 = utils.parseBool('true');
            b1.should.eql(true);
            done();
        });

        it('Text number as bool', function(done) {
            var b1 = utils.parseBool('1');
            b1.should.eql(true);
            done();
        });

        it('Number as bool', function(done) {
            var b1 = utils.parseBool(1);
            b1.should.eql(true);
            done();
        });
    });

    describe('false value', function() {
        it('Random text as bool', function(done) {
            var b1 = utils.parseBool('hello');
            b1.should.eql(false);
            done();
        });

        it('Bool as bool', function(done) {
            var b1 = utils.parseBool(false);
            b1.should.eql(false);
            done();
        });

        it('Bool as bool', function(done) {
            var b1 = utils.parseBool('false');
            b1.should.eql(false);
            done();
        });

        it('Text number as bool', function(done) {
            var b1 = utils.parseBool('0');
            b1.should.eql(false);
            done();
        });

        it('Number as bool', function(done) {
            var b1 = utils.parseBool(0);
            b1.should.eql(false);
            done();
        });
    });

    describe('parse number', function() {
        it('No args is zero', function(done) {
            var b1 = utils.parseNumber();
            b1.should.eql(0);
            done();
        });

        it('Null is zero', function(done) {
            var b1 = utils.parseNumber(null);
            b1.should.eql(0);
            done();
        });

        it('Null is zero with custom default', function(done) {
            var b1 = utils.parseNumber(null, 1);
            b1.should.eql(1);
            done();
        });

        it('Not a number', function(done) {
            var b1 = utils.parseNumber('lalala');
            b1.should.eql(0);
            done();
        });

        it('Not a number with custom default', function(done) {
            var b1 = utils.parseNumber('lalala', 1);
            b1.should.eql(1);
            done();
        });

        it('A text number', function(done) {
            var b1 = utils.parseNumber('10001');
            b1.should.eql(10001);
            done();
        });

        it('A bool', function(done) {
            var b1 = utils.parseNumber(true);
            b1.should.eql(0);
            done();
        });

        it('An actual number', function(done) {
            var b1 = utils.parseNumber(123456);
            b1.should.eql(123456);
            done();
        });
    });
});


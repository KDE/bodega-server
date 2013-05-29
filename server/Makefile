REPORTER = spec

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
                --reporter $(REPORTER)
test/%:
	@NODE_ENV=test ./node_modules/.bin/mocha \
                $@.js --reporter $(REPORTER)

check:
	@./node_modules/.bin/jshint .

sql:
	cd ../sql && ./do_sql ../server/config.json . setup

update_sql:
	cd ../sql && ./do_sql ../server/config.json . update

test_sql:
	cd ../sql && ./do_sql ../server/config.json . testdata

.PHONY: test check sql update_sql

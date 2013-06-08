REPORTER = spec

test:
	@NODE_ENV=testing ./node_modules/.bin/mocha --reporter $(REPORTER)
test/%:
	@NODE_ENV=testing ./node_modules/.bin/mocha $@.js --reporter $(REPORTER)

check:
	@./node_modules/.bin/jshint --extra-ext .json . ; if [ $$? -eq 0 ] ; then echo "Done. Clean!" ; fi

sql:
	cd ../sql && ../server/bodegaDbHelper ../server/config.json . setup

update_sql:
	cd ../sql && ../server/bodegaDbHelper ../server/config.json . update

test_sql:
	cd ../sql && ../server/bodegaDbHelper ../server/config.json . testdata

.PHONY: test check sql update_sql

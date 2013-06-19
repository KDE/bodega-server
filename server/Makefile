REPORTER = spec

test:
	./node_modules/.bin/mocha --reporter $(REPORTER)
test/%:
	./node_modules/.bin/mocha $@.js --reporter $(REPORTER)

check:
	@./node_modules/.bin/jshint --verbose --extra-ext .json . ; if [ $$? -eq 0 ] ; then echo "Done. Clean!" ; fi

sql:
	@cd ../sql && ../server/bodegaDbHelper ../server/config.json . setup

update_sql:
	@cd ../sql && ../server/bodegaDbHelper ../server/config.json . update

test_data:
	@cd ../sql && ../server/bodegaDbHelper ../server/config.json . testdata
	@cp -auR ../sql/test_data/* ../server/content

.PHONY: test check sql update_sql

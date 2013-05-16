REPORTER = spec

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
                --reporter $(REPORTER)

check:
	@./node_modules/.bin/jshint .

sql:
	./../sql/do_sql config.json ../sql/ setup

update_sql:
	./../sql/do_sql config.json ../sql/ update

test_sql:
	./../sql/do_sql config.json ../sql/ testdata

.PHONY: test check sql update_sql

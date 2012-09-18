REPORTER = spec

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
                --reporter $(REPORTER)

check:
	@./node_modules/.bin/jshint .

.PHONY: test check

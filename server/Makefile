REPORTER = spec

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
                --reporter $(REPORTER)
test/%:
	@NODE_ENV=test ./node_modules/.bin/mocha \
                $@.js --reporter $(REPORTER)

check:
	@./node_modules/.bin/jshint .

.PHONY: test check

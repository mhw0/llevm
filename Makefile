.PHONY: all test clean

build:
	yarn tsc

test:
	yarn tap --reporter specy --no-coverage --ts test/*.ts

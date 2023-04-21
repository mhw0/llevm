.PHONY: all test clean

build:
	yarn tsc

test:
	yarn tap --reporter tap --no-coverage --node-arg=--require=ts-node/register test/*

#!/bin/bash
set -e

npm install

grunt test:unit
grunt shell:cheapseats

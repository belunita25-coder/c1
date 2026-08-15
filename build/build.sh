#!/bin/sh
# Собирает index.html из фрагментов. Запускать из корня репозитория: sh build/build.sh
set -e
cd "$(dirname "$0")/.."
cat build/01-head.html \
    build/02-body.html \
    build/03-mechanics.js \
    build/04-blocks.js \
    build/05a-styles.js \
    build/05-fields.js \
    build/06-app.js \
    build/07-prompt.js \
    build/08-events.js > index.html
echo "index.html собран: $(wc -l < index.html) строк, $(wc -c < index.html) байт"
node build/validate.mjs && node build/validate-prompts.mjs

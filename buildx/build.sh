#!/bin/sh
# Собирает complex.html. Запускать из корня: sh buildx/build.sh
set -e
cd "$(dirname "$0")/.."
{
  cat buildx/x01-head.html
  cat buildx/x02-body.html
  printf '      const MECHANICS = '
  sed -n '/^      const MECHANICS = \[/,$p' build/03-mechanics.js | sed '1s/^      const MECHANICS = //'
  cat buildx/x03b-stage-prompts.js
  printf '\n'
  sed -n '/^      const FEEDBACK = \[/,$p' build/04-blocks.js
  cat build/05a-styles.js
  cat buildx/x05b-fields.js
  cat buildx/x06-app.js
  cat buildx/x07-prompt.js
  cat buildx/x08-events.js
} > complex.html
echo "complex.html собран: $(wc -l < complex.html) строк, $(wc -c < complex.html) байт"
node buildx/validate.mjs

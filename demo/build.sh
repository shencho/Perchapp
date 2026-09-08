#!/bin/sh
# Concatena las partes de src/ en el archivo unico que se publica.
cd "$(dirname "$0")"
cat src/01-base.css src/02-shell.css src/03-chrome.css src/04-markup.html \
    src/05-engine.js src/06-screens.js src/07-modals.js src/08-director.js \
    src/09-script.js src/10-player.js > mango-demo.html
echo "mango-demo.html  $(wc -c < mango-demo.html) bytes"

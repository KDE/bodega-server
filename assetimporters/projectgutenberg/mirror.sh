#!/bin/sh

mkdir -p ../../server/content/gutenberg
rsync -aHS -vv --delete --delete-after --include='*/' --include='*.epub' --include='*.pdf' --include='*.jpg' --exclude='*' --prune-empty-dirs ftp.ibiblio.org::gutenberg-epub ../../server/content/gutenberg
./coverProcessing.sh ../../server/content/gutenberg ../../server/public/images


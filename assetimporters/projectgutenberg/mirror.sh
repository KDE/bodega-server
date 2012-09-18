#!/bin/sh

mkdir -p ../../webv2/content/gutenberg
rsync -aHS -vv --delete --delete-after --include='*/' --include='*.epub' --include='*.pdf' --include='*.jpg' --exclude='*' --prune-empty-dirs ftp.ibiblio.org::gutenberg-epub ../../webv2/content/gutenberg
./coverProcessing.sh ../../webv2/content/gutenberg ../../webv2/public/images


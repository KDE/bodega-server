#!/bin/sh

# set up our destination
mkdir -p ../../server/content/gutenberg

# rsync the content
rsync -aHS -vv --delete --delete-after --include='*/' --include='*.epub' --include='*.pdf' --include='*.jpg' --exclude='*' --prune-empty-dirs ftp.ibiblio.org::gutenberg-epub ../../server/content/gutenberg

# now populate the database
rm catalog.rdf
wget http://www.gutenberg.org/feeds/catalog.rdf.bz2
bunzip2 catalog.rdf.bz2
gutimport catalog.rdf ../../server/content/gutenberg

# process the cover images
./coverProcessing.sh ../../server/content/gutenberg ../../server/public/images

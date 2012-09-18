#!/bin/bash

printUsage()
{
    echo "Usage: $0 <path to cover images> <path to destination>"
    exit 1
}

sources=$1;
dest=$2;

if [ $# -lt 2 ]
then
    echo "$1 $2 $#"
    printUsage;
fi

if [[ ! -e $sources ]]
then
    echo "Sources dir does not exist: $sources";
    exit 1;
fi

if [[ ! -e $dest ]]
then
    echo "Dest dir does not exist: $sources";
    exit 1;
fi

for i in 22 32 64 128 256 512
do
    mkdir -p $dest/$i/gutenberg
done

for i in `find $sources -name '*jpg'`
do
    basename=$(basename $i)
    if [ ${i/cover} != $i -a ${i/small/} == $i ]
    then
        #echo "YES ${i}"
        for j in 22 32 64 128 256 512
        do
            convert $i -quality 80 -resize ${j}x${j} $dest/$j/gutenberg/$basename
        done;
    fi
done;


#!/bin/sh

printUsage()
{
    echo "Usage: $0 <public path of the bodega server server directory (absolute)>"
    exit 1
}

dest=$1;

if [ $# -lt 1 ]
then
    printUsage;
    exit
fi

if [ -d wallpapersSvn ]; then
    cd wallpapersSvn
    svn up
    cd ..
else
    svn co svn://anonsvn.kde.org/home/kde/trunk/KDE/kdeartwork/wallpapers wallpapersSvn
fi

for i in 22 32 64 128 256 512
do
    mkdir -p $dest/public/images/$i/kdeartwork
done

mkdir -p $dest/content/wallpapers/

cd wallpapersSvn

for d in *
do
    if [ -d $d ]; then
        cd $d
        zip --exclude='*.svn*' -r $dest/content/wallpapers/$d.wallpaper *
        for i in 22 32 64 128 256 512
        do
            convert ./contents/screenshot.png -quality 80 -resize ${i}x${i} $dest/public/images/$i/kdeartwork/$d.jpg;
            convert ./contents/screenshot.jpg -quality 80 -resize ${i}x${i} $dest/public/images/$i/kdeartwork/$d.jpg;
        done
        cd ..
    fi
done

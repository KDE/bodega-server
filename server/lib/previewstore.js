/*
    Copyright 2013 Coherent Theory LLC

    This program is free software; you can redistribute it and/or
    modify it under the terms of the GNU General Public License as
    published by the Free Software Foundation; either version 2 of
    the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>
*/

var utils = require('./utils.js');
var errors = require('./errors.js');
var mime = require('mime');
var fs = require('fs');
var path = require('path');
var url = require('url');
var gm = require('gm');
var async = require('async');

var PreviewStore = (function() {
    var storageConfig;
    var previewPaths = {};
    var fullPreviewPaths = {};

    var iconSizes = {
        "tiny"   : 22,
        "small"  : 32,
        "medium" : 64,
        "big"    : 128,
        "large"  : 256,
        "huge"   : 512
    };
    var iconSizesSorted = ['huge', 'large', 'big',
                           'medium', 'small', 'tiny'];
    var coverConstraints = {
        sizes : {
            min : { w : 500, h : 500 },
            max : { w : 2560, h : 4096 }
        }
    };
    var screenshotConstraints = {
        sizes : {
            min : { w : 400, h : 300 },
            max : { w : 4096, h : 3072 }
        }
    };

    function objectIsEmpty(obj) {
        return Object.keys(obj).length === 0;
    }

    function previewName(preview) {
        var filename;

        if (preview.name) {
            filename = path.basename(preview.name);
        }

        if (!filename && preview.path) {
            filename = path.basename(preview.path);
        }

        if (!filename && preview.file) {
            filename = path.basename(preview.file);
        }

        return filename;
    }

    function isValidImageFile(preview) {
        if (!preview.mimetype) {
            preview.mimetype = mime.lookup(preview.file);
        }

        switch (preview.mimetype) {
        case 'image/jpeg':
        case 'image/png':
        case 'image/x-apple-ios-png':
            return true;
        default:
            return false;
        }
    }

    function validateIcon(previews, i, size, cb) {
        var preview = previews[i];
        var e;
        var expectedSize;

        if (!iconSizes.hasOwnProperty(preview.subtype)) {
            e = errors.create('IconInvalidType',
                              'Icon type ' + preview.subtype +
                              ' is invalid!');
            cb(e, preview, i);
            return;
        }

        expectedSize = iconSizes[preview.subtype];
        if (size.width !== expectedSize ||
            size.height !== expectedSize) {
            e = errors.create(
                'IconWrongSize',
                'Icon ' + preview.subtype  + " should be " +
                    expectedSize + "x" + expectedSize +
                    "!");
            cb(e, previews, i);
            return;
        }
        cb(null, previews, ++i);
    }

    function validateCover(previews, i, size, cb) {
        var preview = previews[i];
        var e;

        if (size.width < coverConstraints.sizes.min.w ||
            size.width > coverConstraints.sizes.max.w ||
            size.height < coverConstraints.sizes.min.h ||
            size.height > coverConstraints.sizes.max.h) {
            e = errors.create(
                'CoverWrongSize',
                'Cover ' + preview.subtype  + " size " +
                    size.width + "x" + size.height +
                    " is invalid!");
            cb(e, previews, i);
            return;
        }
        cb(null, previews, ++i);
    }

    function validateScreenshot(previews, i, size, cb) {
        var preview = previews[i];
        var e;

        if (size.width < screenshotConstraints.sizes.min.w ||
            size.width > screenshotConstraints.sizes.max.w ||
            size.height < screenshotConstraints.sizes.min.h ||
            size.height > screenshotConstraints.sizes.max.h) {
            e = errors.create(
                'ScreenshotWrongSize',
                'Cover ' + preview.subtype  + " size " +
                    size.width + "x" + size.height +
                    " is invalid!");
            cb(e, previews, i);
            return;
        }
        cb(null, previews, ++i);
    }

    function validateFile(previews, i, cb) {
        var e;
        var fileStat;
        var preview = previews[i];

        if (!preview.file) {
            e = errors.create('PreviewFileMissing');
            cb(e);
            return;
        }
        fs.stat(preview.file, function(err, stat) {
            if (err || !stat.isFile()) {
                e = errors.create('PreviewFileMissing');
                cb(e);
                return;
            }
            if (preview.type === 'icon' ||
                preview.type === 'screenshot' ||
                preview.type === 'cover') {
                if (!isValidImageFile(preview)) {
                    e = errors.create(
                        'PreviewInvalidImageFormat',
                        'Only png and jpeg images are allowed!');
                    cb(e);
                    return;
                }

                gm(preview.file).size(function(err, result) {
                    var expectedSize;
                    if (err) {
                        e = errors.create(
                            'PreviewInvalidImageFormat',
                            'Only png and jpeg images are allowed!');
                        cb(e, previews, i);
                        return;
                    }
                    if (preview.type === 'icon') {
                        validateIcon(previews, i, result, cb);
                    } else if (preview.type === 'cover') {
                        validateCover(previews, i, result, cb);
                    } else if (preview.type === 'screenshot') {
                        validateCover(previews, i, result, cb);
                    } else {
                        cb(err, previews, ++i);
                    }
                });
                return;
            }
            cb(null, previews, ++i);
        });
    }

    function validateFiles(previews, fn) {
        var i;
        var preview;
        var funcs = [function(cb) {
            cb(null, previews, 0);
        }];

        for (i = 0; i < previews.length; ++i) {
            preview = previews[i];
            funcs.push(validateFile);
        }
        async.waterfall(funcs, function(err, previews, i) {
            fn(err);
        });
    }

    function findPreviewPaths() {
        var i;
        var previewPaths = {};
        previewPaths.previews = "/previews";
        previewPaths.incoming = storageConfig.incomingBasePath;

        previewPaths.icons = {};
        for (i in iconSizes) {
            previewPaths.icons[i] =
                path.join("/icons",
                          iconSizes[i].toString());
        }
        return previewPaths;
    }

    function checkDirectory(dirpath, mode, fn) {
        fs.stat(dirpath, function(err, stat) {
            var modeInt;
            var modesMatch;
            var len;

            if (err || !stat.isDirectory()) {
                fs.mkdir(dirpath, mode, function(err) {
                    fn(err);
                    return;
                });
                return;
            }

            modeInt = utils.parseNumber(stat.mode.toString(8));
            //we use the following two lines because
            // endsWith is only available in ecmascript 6+
            // and we need to match on ends with because our
            // full mode will be something akin to 40755 with
            // the first digit meaning 'directory'
            len = modeInt.toString().length - mode.length;
            modesMatch = modeInt.toString().lastIndexOf(mode) === len;
            if (!modesMatch) {
                fs.chmod(dirpath, mode, function (err) {
                    if (err) {
                        console.log(
                            dirpath +
                                " has invalid permissions and " +
                                "the server can't change them!");
                        fn(err);
                        return;
                    }
                });
            }
            fn(null);
        });
    }

    function PreviewStore() {
        var i;

        storageConfig = app.config.storage.localStorage;

        previewPaths = findPreviewPaths();

        fullPreviewPaths.previews =
            path.join(process.cwd(), "public", previewPaths.previews);
        fullPreviewPaths.incoming =
            path.join(process.cwd(), previewPaths.incoming);

        fullPreviewPaths.icons = {};
        for (i in iconSizes) {
            fullPreviewPaths.icons[i] =
                path.join(process.cwd(), "public",
                          previewPaths.icons[i]);
        }

        checkDirectory(fullPreviewPaths.icons.tiny, "0755", function(err) {
            if (err) {
                console.log(err);
                process.exit(1);
            }
        });

        checkDirectory(fullPreviewPaths.icons.small, "0755", function(err) {
            if (err) {
                console.log(err);
                process.exit(1);
            }
        });

        checkDirectory(fullPreviewPaths.icons.medium, "0755", function(err) {
            if (err) {
                console.log(err);
                process.exit(1);
            }
        });

        checkDirectory(fullPreviewPaths.icons.large, "0755", function(err) {
            if (err) {
                console.log(err);
                process.exit(1);
            }
        });

        checkDirectory(fullPreviewPaths.icons.huge, "0755", function(err) {
            if (err) {
                console.log(err);
                process.exit(1);
            }
        });

        checkDirectory(fullPreviewPaths.previews, "0755", function(err) {
            if (err) {
                console.log(err);
                process.exit(1);
            }
        });

        checkDirectory(fullPreviewPaths.incoming, "0700", function(err) {
            if (err) {
                console.log(err);
                process.exit(1);
            }
        });
    }

    function fillPathsForAsset(assetInfo) {
        var i;
        var paths = {};
        var idStr = assetInfo.id.toString();
        if (!assetInfo.id || !idStr) {
            return null;
        }

        paths.previews =
            path.join(fullPreviewPaths.previews, idStr);
        paths.incoming =
            path.join(fullPreviewPaths.incoming, idStr);

        paths.icons = {};
        for (i in iconSizes) {
            paths.icons[i] =
                path.join(fullPreviewPaths.icons[i], idStr);
        }
        return paths;
    }

    function localMove(fromFile, toFile, fn) {
        fs.rename(fromFile, toFile, function(err) {
            if (err && err.code === 'EXDEV') {
                // we are apparently moving across partitions,
                //  so fallback to copying
                var is = fs.createReadStream(fromFile);
                var os = fs.createWriteStream(toFile);

                is.on('data', function(chunk) { os.write(chunk); })
                    .on('end', function() {
                        os.end();
                        fs.unlink(fromFile);
                        fn(null);
                    });
                return;
            }
            fn(err);
        });
    }

    function splitPreviews(rawPreviews) {
        var previews = {
            icons : [],
            splitIcons : {},
            covers : [],
            splitCovers : {},
            screenshots : [],
            others : []
        };
        var i;

        for (i = 0; i < rawPreviews.length; ++i) {
            if (rawPreviews[i].type === "icon") {
                previews.icons.push(rawPreviews[i]);
                previews.splitIcons[rawPreviews[i].subtype] = rawPreviews[i];
            } else if (rawPreviews[i].type === "cover") {
                previews.covers.push(rawPreviews[i]);
                previews.splitCovers[rawPreviews[i].subtype] = rawPreviews[i];
            } else if (rawPreviews[i].type === "screenshot") {
                previews.screenshots.push(rawPreviews[i]);
            } else {
                previews.others.push(rawPreviews[i]);
            }
        }
        return previews;
    }

    function iconRelativePath(assetInfo, icon) {
        var extension;
        var prefix = '';

        if (!assetInfo.id || !icon || (!icon.file && !icon.path)) {
            return null;
        }
        extension = path.extname(icon.file);
        if (!extension && icon.path) {
            extension = path.extname(icon.path);
        }

        return path.join(assetInfo.id.toString(),
                         'icon' + extension);
    }

    function previewRelativePath(assetInfo, preview) {
        if (preview.type === 'icon') {
            return iconRelativePath(assetInfo, preview);
        } else {
            var filename = previewName(preview);

            return path.join(assetInfo.id.toString(),
                             filename);
        }
    }

    function previewFullPath(assetInfo, preview, isIncoming) {
        var basePath;
        var relPath;
        var fullPath;
        if (preview.type === 'icon') {
            relPath = iconRelativePath(assetInfo, preview);
            if (isIncoming) {
                fullPath = path.join(fullPreviewPaths.incoming,
                                     assetInfo.id.toString(),
                                     iconSizes[preview.subtype].toString(),
                                     path.basename(relPath));
            } else {
                basePath = fullPreviewPaths.icons[preview.subtype];
                fullPath = path.join(basePath, relPath);
            }
        } else {
            relPath = previewRelativePath(assetInfo, preview);

            if (isIncoming) {
                fullPath = path.join(fullPreviewPaths.incoming,
                                     relPath);
            } else {
                fullPath = path.join(fullPreviewPaths.previews,
                                     relPath);
            }
        }

        return fullPath;
    }

    function handleIcon(assetInfo, assetPaths, icons, i, cb) {
        var icon = icons[i];
        var expectedSize = iconSizes[icon.subtype];
        var relPath = iconRelativePath(assetInfo, icon);
        var fullIncomingPath = previewFullPath(assetInfo, icon, true);
        var dirname = path.dirname(fullIncomingPath);

        checkDirectory(dirname, "0700", function(err) {
            if (err) {
                cb(err, assetInfo, assetPaths, icons, ++i);
            }
            localMove(icon.file, fullIncomingPath, function(err) {
                if (!err) {
                    icon.path = relPath;
                }
                cb(err, assetInfo, assetPaths, icons, ++i);
            });
        });
    }

    function handleIcons(assetInfo, assetPaths, previews, cb) {
        var icons = previews.icons;
        var j;
        var e;
        var funcs = [];

        if (!icons || objectIsEmpty(icons)) {
            cb(null, assetInfo, assetPaths, previews);
            return;
        }
        funcs.push(function(cb) {
            cb(null, assetInfo, assetPaths, icons, 0);
        });
        for (j = 0; j < icons.length; ++j) {
            funcs.push(handleIcon);
        }
        async.waterfall(funcs, function(err) {
            cb(err, assetInfo, assetPaths, previews);
        });
    }

    function handleCover(assetInfo, assetPaths, covers, i, cb) {
        var cover = covers[i];
        var filename = previewName(cover);
        var relPath = path.join(assetInfo.id.toString(),
                                filename);
        var fullIncomingPath = path.join(
            assetPaths.incoming, filename);

        localMove(cover.file, fullIncomingPath, function(err) {
            if (!err) {
                cover.path = relPath;
            }
            cb(err, assetInfo, assetPaths, covers, ++i);
        });
    }

    function handleCovers(assetInfo, assetPaths, previews, cb) {
        var covers = previews.covers;
        var j;
        var e;
        var funcs = [];

        if (!covers || !covers.length) {
            cb(null, assetInfo, assetPaths, previews);
            return;
        }

        funcs.push(function(cb) {
            cb(null, assetInfo, assetPaths, covers, 0);
        });
        for (j = 0; j < covers.length; ++j) {
            funcs.push(handleCover);
        }
        async.waterfall(funcs, function(err) {
            cb(err, assetInfo, assetPaths, previews);
        });
    }

    function handleScreenshot(assetInfo, assetPaths, screenshots, i, cb) {
        var screenshot = screenshots[i];
        var filename = previewName(screenshot);
        var relPath = path.join(assetInfo.id.toString(),
                                filename);
        var fullIncomingPath = path.join(
            assetPaths.incoming, filename);

        localMove(screenshot.file, fullIncomingPath, function(err) {
            if (!err) {
                screenshot.path = relPath;
            }
            cb(err, assetInfo, assetPaths, screenshots, ++i);
        });
    }

    function handleScreenshots(assetInfo, assetPaths, previews, cb) {
        var screenshots = previews.screenshots;
        var j;
        var e;
        var funcs = [];

        if (!screenshots || !screenshots.length) {
            cb(null, assetInfo, assetPaths, previews);
            return;
        }

        funcs.push(function(cb) {
            cb(null, assetInfo, assetPaths, screenshots, 0);
        });
        for (j = 0; j < screenshots.length; ++j) {
            funcs.push(handleScreenshot);
        }
        async.waterfall(funcs, function(err) {
            cb(err, assetInfo, assetPaths, previews);
        });
    }

    function handleOther(assetInfo, assetPaths, others, i, cb) {
        var other = others[i];
        var filename = previewName(other);
        var relPath = path.join(assetInfo.id.toString(),
                                filename);
        var fullIncomingPath = path.join(
            assetPaths.incoming, filename);

        localMove(other.file, fullIncomingPath, function(err) {
            if (!err) {
                other.path = relPath;
            }
            cb(err, assetInfo, assetPaths, other, ++i);
        });
    }

    function handleOthers(assetInfo, assetPaths, previews, cb) {
        var others = previews.others;
        var j;
        var e;
        var funcs = [];

        if (!others || !others.length) {
            cb(null, assetInfo, assetPaths, previews);
            return;
        }

        funcs.push(function(cb) {
            cb(null, assetInfo, assetPaths, others, 0);
        });
        for (j = 0; j < others.length; ++j) {
            funcs.push(handleOther);
        }
        async.waterfall(funcs, function(err) {
            cb(err, assetInfo, assetPaths, previews);
        });
    }

    function findAssetType(assetInfo) {
        var i;
        var tag;
        var assetType;

        if (!assetInfo || !assetInfo.tags) {
            return null;
        }
        for (i = 0; i < assetInfo.tags.length; ++i) {
            tag = assetInfo.tags[i];
            if (tag.type === 'assetType') {
                assetType = tag.title;
                break;
            }
        }
        return assetType;
    }

    function checkAppRequirements(assetInfo, fn) {
        var previews = splitPreviews(assetInfo.previews);
        var preview;
        var e;
        var i;
        var hasHugeIcon = false;

        if (!previews.icons) {
            e = errors.create('AssetMissingIcons');
            fn(e, false);
            return;
        }
        //Each app needs at least the huge icon and the others
        //  can be created by scaling that one
        for (i = 0; i < previews.icons.length; ++i) {
            preview = previews.icons[i];
            if (preview.type === 'icon' &&
                preview.subtype === 'huge') {
                hasHugeIcon = true;
                break;
            }
        }
        if (!hasHugeIcon) {
            e = errors.create('AssetMissingIcons');
            fn(e, false);
            return;
        }
        if (!previews.screenshots || previews.screenshots.length < 1) {
            e = errors.create('AssetMissingScreenshot');
            fn(e, false);
            return;
        }
        fn(null, true);
    }
    function checkBookRequirements(assetInfo, fn) {
        var previews = splitPreviews(assetInfo.previews);
        var preview;
        var e;
        var i;
        var hasFrontCover = false;

        if (!previews.covers) {
            e = errors.create('AssetMissingCover');
            fn(e, false);
            return;
        }
        //Each book needs at least the front cover image - icons
        //  can be created by scaling that one
        for (i = 0; i < previews.covers.length; ++i) {
            preview = previews.covers[i];
            if (preview.type === 'cover' &&
                preview.subtype === 'front') {
                hasFrontCover = true;
                break;
            }
        }
        if (!hasFrontCover) {
            e = errors.create('AssetMissingCover');
            fn(e, false);
            return;
        }
        fn(null, true);
    }

    function checkGenericRequirements(assetInfo, fn) {
        var previews = splitPreviews(assetInfo.previews);
        var preview;
        var e;
        var i;
        var hasHugeIcon = false;

        if (!previews.icons) {
            e = errors.create('AssetMissingIcons');
            fn(e, false);
            return;
        }
        //Each app needs at least the huge icon and the others
        //  can be created by scaling that one
        for (i = 0; i < previews.icons.length; ++i) {
            preview = previews.icons[i];
            if (preview.type === 'icon' &&
                preview.subtype === 'huge') {
                hasHugeIcon = true;
                break;
            }
        }
        if (!hasHugeIcon) {
            e = errors.create('AssetMissingIcons');
            fn(e, false);
            return;
        }
        fn(null, true);
    }

    PreviewStore.prototype.canPublish = function(assetInfo, fn) {
        var assetType = findAssetType(assetInfo);

        if (!assetType) {
            var err = errors.create('MissingParameters',
                                    'Asset is missing the assetType tag!');
            fn(err);
            return;
        }

        if (assetType === 'application') {
            checkAppRequirements(assetInfo, fn);
        } else if (assetType === 'book') {
            checkBookRequirements(assetInfo, fn);
        } else {
            checkGenericRequirements(assetInfo, fn);
        }
    };

    PreviewStore.prototype.remove = function(assetInfo, fn) {
        if (!assetInfo.id) {
            var err = errors.create('MissingParameters', '');
            fn(err);
            return;
        }

        var queue = async.queue(
                function(path, cb) {
                    fs.rmdir(path,
                             function() {
                                 cb();
                             });
                }, 2);
        queue.drain = fn;

        var assetPaths = fillPathsForAsset(assetInfo);
        var paths = assetPaths.previews + assetPaths.incoming;
        for (var index in assetPaths.icons) {
            paths += assetPaths.icons[index];
        }
        queue.push(paths);
    };

    PreviewStore.prototype.upload = function(assetInfo, fn) {
        var i;
        var assetPaths;
        var funcs = [];

        if (!assetInfo.id) {
            var err = errors.create('MissingParameters', '');
            fn(err);
            return;
        }

        if (!assetInfo.previews || !assetInfo.previews.length) {
            fn(null);
            return;
        }

        assetPaths = fillPathsForAsset(assetInfo);

        validateFiles(assetInfo.previews, function(err) {
            var previews = splitPreviews(assetInfo.previews);
            var e;

            if (err) {
                fn(err);
                return;
            }
            funcs.push(function(cb) {
                checkDirectory(assetPaths.incoming, "0700", function(err) {
                    cb(err, assetInfo, assetPaths, previews);
                });
            });
            funcs.push(handleIcons);
            funcs.push(handleCovers);
            funcs.push(handleScreenshots);
            funcs.push(handleOthers);
            async.waterfall(
                funcs,
                function(err, assetInfo, assetPaths, previews) {
                    fn(err);
                });
        });
    };

    function updateAssetInfoIcon(assetInfo, subtype, path) {
        var splitIconPreviews = splitPreviews(assetInfo.previews).splitIcons;
        var previews = assetInfo.previews;

        if (splitIconPreviews[subtype]) {
            return;
        }

        assetInfo.image = path;
        assetInfo.previews.push({
            path: path,
            type: 'icon',
            subtype: subtype,
            mimetype: mime.lookup(path),
            generated: true
        });
    }

    function generateIconFromPreview(task, cb) {
        task.type = 'icon'; // for fullIncomingPath and friends
        var w = iconSizes[task.subtype];
        var h = iconSizes[task.subtype];
        var w1, h1;
        var xoffset = 0;
        var yoffset = 0;
        var fromPath = previewFullPath(task.assetInfo, task.preview, true);
        var dirname;

        //console.log(task.preview);
        task.file = fromPath;
        task.path = iconRelativePath(task.assetInfo, task);
        //console.log("Cover file = " + icon.file);
        //console.log("Icon path = " + icon.path);
        updateAssetInfoIcon(task.assetInfo, task.subtype, task.path);
        task.file = undefined;

        var fullIncomingPath = previewFullPath(task.assetInfo, task, true);
        //console.log('Full from path = ' + fromPath);
        //console.log('Full incoming path = ' + fullIncomingPath);
        dirname = path.dirname(fullIncomingPath);

        checkDirectory(dirname, "0700", function(err) {
            gm(fromPath)
                .size(function(err, size) {
                    //console.log(size);
                    if (err) {
                        /*
                        console.log("***************************************************");
                        console.log("***************************************************");
                        console.log(dirname + ' ' + fromPath);
                        console.log("***************************************************");
                        console.log("***************************************************");
                        console.log("***************************************************");
                        */
                        cb(err);
                        return;
                    }

                    if (size.width > size.height) {
                        w1 = w;
                        h1 = Math.floor(size.height * (w/size.width));
                        if (h1 > h) {
                            w1 = Math.floor(w1 * (((h-h1)/h) + 1));
                            h1 = h;
                        }
                    } else if (size.width < size.height) {
                        h1 = h;
                        w1 = Math.floor(size.width * (h/size.height));
                        if (w1 > w) {
                            h1 = Math.floor(h1 * (((w-w1)/w) + 1));
                            w1 = w;
                        }
                    } else if (size.width === size.height) {
                        var bigger = (w<h?w:h);
                        w1 = bigger;
                        h1 = bigger;
                    }

                    if (w < w1) {
                        xoffset = (w1 - w)/2;
                    }
                    if (h < h1) {
                        yoffset = (h1-h)/2;
                    }

                    //jshint -W024
                    gm(fromPath)
                        .quality(100)
                        .in("-size", w1+"x"+h1)
                        .scale(w1, h1)
                        .noProfile()
                        .write(fullIncomingPath, function(err) {
                            cb(err);
                        });
                });
        });
    }

    PreviewStore.prototype.generateCoverIcons = function(assetInfo, fn) {
        var previews = splitPreviews(assetInfo.previews);
        var iconsToGenerate = [];
        var assetPaths = fillPathsForAsset(assetInfo);
        var cover = previews.splitCovers.front;

        if (!cover) {
            fn(null);
            return;
        }

        var count = 0;
        var size;
        for (size in iconSizes) {
            if (!previews.splitIcons[size]) {
                iconsToGenerate.push({
                    assetInfo: assetInfo,
                    assetPaths: assetPaths,
                    preview: cover,
                    subtype: size
                });
            }
        }

        if (iconsToGenerate.length === 0) {
            fn(null);
            return;
        }

        var q = async.queue(generateIconFromPreview, 2);
        q.push(iconsToGenerate);
        q.drain = function(err) {
            //console.log('++++++++++++++++++++++++++++++++++++++++++++++++=');
            //console.log(JSON.stringify(iconsToGenerate));
            fn(err);
        };
    };

    function generateScreenhotIcons (assetInfo, fn) {
        var previews = splitPreviews(assetInfo.previews);
        var iconsToGenerate = [];
        var assetPaths = fillPathsForAsset(assetInfo);
        var shot = previews.screenshots[0];

        if (!shot) {
            fn(null);
            return;
        }

        var count = 0;
        var size;
        for (size in iconSizes) {
            if (!previews.splitIcons[size]) {
                iconsToGenerate.push({
                    assetInfo: assetInfo,
                    assetPaths: assetPaths,
                    preview: shot,
                    subtype: size
                });
            }
        }

        var q = async.queue(generateIconFromPreview, 2);
        q.push(iconsToGenerate);
        q.drain = function(err) {
            fn(err);
        };
    }

    function scaleIcon(data, cb) {
        var assetInfo = data.assetInfo;
        var fromIcon = data.fromIcon;
        var toIcon = {
            type : 'icon',
            subtype : data.toSubtype
        };
        var w = iconSizes[data.toSubtype];
        var h = iconSizes[data.toSubtype];
        var w1, h1;
        var xoffset = 0;
        var yoffset = 0;
        var fullIncomingPath;
        var dirname;
        var fromPath = previewFullPath(assetInfo, fromIcon, true);
        var toPath;

        //we need a temporary 'file' attribute to figure out the path
        toIcon.file = fromPath;
        toIcon.path = iconRelativePath(assetInfo, toIcon);
        toIcon.file = undefined;

        //all icon names are the same so make sure they're set on the assetinfo
        updateAssetInfoIcon(assetInfo, toIcon.subtype, toIcon.path);

        fullIncomingPath = previewFullPath(assetInfo, toIcon, true);
        //console.log('Full from path = ' + fromPath);
        //console.log('Full incoming path = ' + fullIncomingPath);
        dirname = path.dirname(fullIncomingPath);

        checkDirectory(dirname, "0700", function(err) {
            gm(fromPath)
            .size(function(err, size) {
                //console.log(size);
                if (size.width > size.height) {
                    w1 = w;
                    h1 = Math.floor(size.height * (w/size.width));
                    if (h1 > h) {
                        w1 = Math.floor(w1 * (((h-h1)/h) + 1));
                        h1 = h;
                    }
                } else if (size.width < size.height) {
                    h1 = h;
                    w1 = Math.floor(size.width * (h/size.height));
                    if (w1 > w) {
                        h1 = Math.floor(h1 * (((w-w1)/w) + 1));
                        w1 = w;
                    }
                } else if (size.width === size.height) {
                    var bigger = (w<h?w:h);
                    w1 = bigger;
                    h1 = bigger;
                }

                if (w < w1) {
                    xoffset = (w1 - w)/2;
                }
                if (h < h1) {
                    yoffset = (h1-h)/2;
                }

                //jshint -W024
                gm(fromPath)
                    .quality(100)
                    .in("-size", w1+"x"+h1)
                    .scale(w1, h1)
                    .noProfile()
                    .write(fullIncomingPath, function(err) {
                        cb(err);
                    });
                });
        });
    }

    PreviewStore.prototype.generateScaledIcons = function(assetInfo, fn) {
        var previews = splitPreviews(assetInfo.previews);
        var iconsToGenerate = [];
        var iconType, lastIcon;
        var assetPaths = fillPathsForAsset(assetInfo);
        var i;

        if ((previews.splitIcons === undefined ||
            Object.keys(previews.splitIcons).length === 0) && previews.screenshots.length > 0) {
            generateScreenhotIcons(assetInfo, fn);
            return;
        } else if (Object.keys(previews.splitIcons).length === 0 && previews.screenshots.length === 0)  {
            var e = errors.create('AssetIconMissing',
                              'The asset needs at least one icon.');
            fn(e);
            return;
        }

        var q = async.queue(scaleIcon, 2);
        q.drain = function(err) {
            fn(err);
        };

        lastIcon = previews.splitIcons.huge;

        for (i = 1; i < iconSizesSorted.length; ++i) {
            iconType = iconSizesSorted[i];
            if (!previews.splitIcons[iconType]) {
                q.push({
                    assetInfo: assetInfo,
                    fromIcon: lastIcon,
                    toSubtype : iconType
                });
            } else {
                lastIcon = previews.splitIcons[iconType];
            }
        }
        //if there is nothing to do, the queue doesn't get execute, just call the callback
        if (q.tasks.length === 0) {
            fn(null);
        }
    };

    function publishIcon(assetInfo, assetPaths, icons, i, cb) {
        var icon = icons[i];
        var dirpath = assetPaths.icons[icon.subtype];

        checkDirectory(dirpath, "0755", function(err) {
            var incomingIconFile;
            var iconFile;
            var relPath;
            if (err) {
                cb(err, assetInfo, assetPaths, icons, i);
                return;
            }
            incomingIconFile = previewFullPath(assetInfo, icon, true);
            relPath = iconRelativePath(assetInfo, icon);
            iconFile = previewFullPath(assetInfo, icon, false);
            //console.log("      from = " + incomingIconFile);
            //console.log("        to = " + iconFile);
            localMove(incomingIconFile, iconFile, function(err) {
                if (!err) {
                    icon.path = relPath;
                    icon.image = relPath;
                }
                cb(err, assetInfo, assetPaths, icons, ++i);
            });
        });
    }

    function publishIcons(assetInfo, assetPaths, splitPreviews, cb) {
        var icons = splitPreviews.icons;
        var i;
        var preview;
        var funcs = [function(cb) {
            cb(null, assetInfo, assetPaths, icons, 0);
        }];

        for (i = 0; i < icons.length; ++i) {
            funcs.push(publishIcon);
        }
        async.waterfall(funcs, function(err, assetInfo, assetPaths) {
            cb(err, assetInfo, assetPaths, splitPreviews);
        });
    }

    function publishPreview(assetInfo, assetPaths, previews, i, cb) {
        var preview = previews[i];
        var dirpath = assetPaths.previews;

        checkDirectory(dirpath, "0755", function(err) {
            var incomingPreviewFile;
            var previewFile;
            var relPath;
            if (err) {
                cb(err, assetInfo, assetPaths, previews, i);
                return;
            }
            incomingPreviewFile = previewFullPath(assetInfo, preview, true);
            relPath = previewRelativePath(assetInfo, preview);
            previewFile = previewFullPath(assetInfo, preview, false);
            //console.log("      from = " + incomingPreviewFile);
            //console.log("        to = " + previewFile);
            localMove(incomingPreviewFile, previewFile, function(err) {
                if (!err) {
                    preview.path = relPath;
                }
                cb(err, assetInfo, assetPaths, previews, ++i);
            });
        });
    }

    function publishPreviews(assetInfo, assetPaths, splitPreviews, cb) {
        var previews = splitPreviews.others;
        var i;
        var preview;
        var funcs = [function(cb) {
            cb(null, assetInfo, assetPaths, previews, 0);
        }];

        for (i = 0; i < previews.length; ++i) {
            funcs.push(publishPreview);
        }
        async.waterfall(funcs, function(err, assetInfo, assetPaths) {
            cb(err, assetInfo, assetPaths, splitPreviews);
        });
    }

    PreviewStore.prototype.publish = function(assetInfo, fn) {
        var assetPaths= fillPathsForAsset(assetInfo);
        var funcs = [];
        var splitPreviews = {
            icons : [],
            others : []
        };
        var preview;
        var i;

        for (i = 0; i < assetInfo.previews.length; ++i) {
            preview = assetInfo.previews[i];
            if (preview.type === 'icon') {
                splitPreviews.icons.push(preview);
            } else {
                splitPreviews.others.push(preview);
            }
        }

        funcs.push(function(cb) {
            cb(null, assetInfo, assetPaths, splitPreviews);
        });
        //cp incoming/asset icons/size/asset
        funcs.push(publishIcons);
        //cp incoming/asset content/asset
        funcs.push(publishPreviews);
        async.waterfall(funcs, function(err, assetInfo, assetPaths, prevs) {
            fn(err);
        });
    };

    PreviewStore.prototype.copyPreview = function(assetInfo, preview, cb) {
        var fromPath = previewFullPath(assetInfo, preview, false);
        var toPath = previewFullPath(assetInfo, preview, true);

        utils.copyFile(fromPath, toPath, function(err) {
            var e;
            if (err) {
                e = errors.create('PreviewFileMissing', err.message);
                cb(e);
                return;
            }
            cb(null);
        });
    };


    PreviewStore.prototype.previewPaths = function() {
        return findPreviewPaths();
    };
    PreviewStore.prototype.previewRelativePath = previewRelativePath;
    PreviewStore.prototype.previewFullPath = previewFullPath;

    return PreviewStore;
})();

module.exports.PreviewStore = PreviewStore;

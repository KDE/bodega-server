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
    var storageSystem;
    var previewPaths = {};
    var fullPreviewPaths = {};

    var previewTypes = {
        "article"    : [],
        "chapter"    : [],
        "clip"       : [],
        "icon"       : ["tiny", "small", "medium", "large", "huge"],
        "cover"      : ["front", "back"],
        "excerpt"    : [],
        "screenshot" : [],
        "trailer"    : []
    };

    var iconSizes = {
        "tiny"   : 22,
        "small"  : 32,
        "medium" : 64,
        "large"  : 128,
        "huge"   : 512
    };
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

    function isValidImageFile(preview) {
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
        var mimetype;
        var fileStat;
        var preview = previews[i];

        if (!preview.file) {
            e = errors.create('PreviewMissingFile');
            cb(e);
            return;
        }
        fs.stat(preview.file, function(err, stat) {
            if (err || !stat.isFile()) {
                e = errors.create('PreviewMissingFile');
                cb(e);
                return;
            }
            mimetype = mime.lookup(preview.file);
            preview.mimetype = mimetype;
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

            modeInt = parseInt(stat.mode.toString(8), 10);
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

        storageSystem = app.config.storageSystem;
        storageConfig = app.config[storageSystem];

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
            covers : [],
            screenshots : [],
            others : []
        };
        var i;

        for (i = 0; i < rawPreviews.length; ++i) {
            if (rawPreviews[i].type === "icon") {
                previews.icons.push(rawPreviews[i]);
            } else if (rawPreviews[i].type === "cover") {
                previews.covers.push(rawPreviews[i]);
            } else if (rawPreviews[i].type === "screenshot") {
                previews.screenshot.push(rawPreviews[i]);
            } else {
                previews.others.push(rawPreviews[i]);
            }
        }
        return previews;
    }

    function handleIcon(assetInfo, icons, i, assetPaths, cb) {
        var icon = icons[i];
        var expectedSize = iconSizes[icon.subtype];
        var extension = path.extname(icon.file);
        var filename = "icon" + expectedSize + extension;
        var relPath = path.join(assetInfo.id.toString(),
                                filename);
        var fullIncomingPath = path.join(
            assetPaths.incoming, filename);

        localMove(icon.file, fullIncomingPath, function(err) {
            if (!err) {
                icon.path = relPath;
            }
            cb(err, assetInfo, icons, ++i, assetPaths);
        });
    }

    function handleIcons(assetInfo, previews, assetPaths, cb) {
        var icons = previews.icons;
        var j;
        var e;
        var funcs = [];

        if (!icons || objectIsEmpty(icons)) {
            cb(null, assetInfo, previews, assetPaths);
            return;
        }
        funcs.push(function(cb) {
            cb(null, assetInfo, icons, 0, assetPaths);
        });
        for (j = 0; j < icons.length; ++j) {
            funcs.push(handleIcon);
        }
        async.waterfall(funcs, function(err) {
            cb(err, assetInfo, previews, assetPaths);
        });
    }

    function handleCover(assetInfo, covers, i, assetPaths, cb) {
        var cover = covers[i];
        var filename = path.basename(cover.file);
        var relPath = path.join(assetInfo.id.toString(),
                                filename);
        var fullIncomingPath = path.join(
            assetPaths.incoming, filename);

        localMove(cover.file, fullIncomingPath, function(err) {
            if (!err) {
                cover.path = relPath;
            }
            cb(err, assetInfo, covers, ++i, assetPaths);
        });
    }

    function handleCovers(assetInfo, previews, assetPaths, cb) {
        var covers = previews.covers;
        var j;
        var e;
        var funcs = [];

        if (!covers || !covers.length) {
            cb(null, assetInfo, previews, assetPaths);
            return;
        }

        funcs.push(function(cb) {
            cb(null, assetInfo, covers, 0, assetPaths);
        });
        for (j = 0; j < covers.length; ++j) {
            funcs.push(handleCover);
        }
        async.waterfall(funcs, function(err) {
            cb(err, assetInfo, previews, assetPaths);
        });
    }

    function handleScreenshot(assetInfo, screenshots, i, assetPaths, cb) {
        var screenshot = screenshots[i];
        var filename = path.basename(screenshot.file);
        var relPath = path.join(assetInfo.id.toString(),
                                filename);
        var fullIncomingPath = path.join(
            assetPaths.incoming, filename);

        localMove(screenshot.file, fullIncomingPath, function(err) {
            if (!err) {
                screenshot.path = relPath;
            }
            cb(err, assetInfo, screenshots, ++i, assetPaths);
        });
    }

    function handleScreenshots(assetInfo, previews, assetPaths, cb) {
        var screenshots = previews.screenshots;
        var j;
        var e;
        var funcs = [];

        if (!screenshots || !screenshots.length) {
            cb(null, assetInfo, previews, assetPaths);
            return;
        }

        funcs.push(function(cb) {
            cb(null, assetInfo, screenshots, 0, assetPaths);
        });
        for (j = 0; j < screenshots.length; ++j) {
            funcs.push(handleScreenshot);
        }
        async.waterfall(funcs, function(err) {
            cb(err, assetInfo, previews, assetPaths);
        });
    }

    function handleOther(assetInfo, others, i, assetPaths, cb) {
        var other = others[i];
        var filename = path.basename(other.file);
        var relPath = path.join(assetInfo.id.toString(),
                                filename);
        var fullIncomingPath = path.join(
            assetPaths.incoming, filename);

        localMove(other.file, fullIncomingPath, function(err) {
            if (!err) {
                other.path = relPath;
            }
            cb(err, assetInfo, other, ++i, assetPaths);
        });
    }

    function handleOthers(assetInfo, previews, assetPaths, cb) {
        var others = previews.others;
        var j;
        var e;
        var funcs = [];

        if (!others || !others.length) {
            cb(null, assetInfo, previews, assetPaths);
            return;
        }

        funcs.push(function(cb) {
            cb(null, assetInfo, others, 0, assetPaths);
        });
        for (j = 0; j < others.length; ++j) {
            funcs.push(handleOther);
        }
        async.waterfall(funcs, function(err) {
            cb(err, assetInfo, previews, assetPaths);
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

    PreviewStore.prototype.upload = function(assetInfo, fn) {
        var i;
        var assetPaths;
        var funcs = [];
        if (!assetInfo.previews || !assetInfo.previews.length ||
            !assetInfo.id) {
            var err = errors.create('MissingParameters', '');
            fn(err);
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
                    cb(err, assetInfo, previews, assetPaths);
                });
            });
            funcs.push(handleIcons);
            funcs.push(handleCovers);
            funcs.push(handleScreenshots);
            funcs.push(handleOthers);

            async.waterfall(
                funcs,
                function(err, assetInfo, previews, assetPaths) {
                    fn(err);
                });
        });
    };

    PreviewStore.prototype.previewPaths = function() {
        return findPreviewPaths();
    };

    PreviewStore.prototype.publish = function(assetInfo, fn) {
    };

    return PreviewStore;
})();

module.exports.PreviewStore = PreviewStore;

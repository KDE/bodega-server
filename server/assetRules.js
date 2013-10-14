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
*/

// these are the tags which must be included with any asset uploaded
// the names correspond to the assetType tags in the database
// if no entry exists in mandatoryTags for an assetType tag, then
// any assets of that type will be rejected from upload
module.exports.mandatoryTags = {
    application: {
        author: { name: "Author", type: "author", multi: true, required: true },
        contentrating: { name: 'Content Rating', type: "contentrating", multi: false, required: true },
        descriptive: { name: "Category", type: "descriptive", multi: true, required: false },
        platform: { name: "Platform", type: "platform", multi: true, required: false }
    },
    widget: {
        author: { name: "Author", type: "author", multi: true, required: true },
        contentrating: { name: 'Content Rating', type: "contentrating", multi: false, required: true },
        descriptive: { name: "Category", type: "descriptive", multi: true, required: false }
    },
    game: {
        author: { name: "Author", type: "author", multi: true, required: true },
        contentrating: { name: 'Content Rating', type: "contentrating", multi: false, required: true },
        descriptive: { name: "Category", type: "descriptive", multi: true, required: false },
        platform: { name: "Platform", type: "platform", multi: true, required: false }
    },
    article: {
        author: { name: "Author", type: "author", multi: true, required: true },
        contentrating: { name: 'Content Rating', type: "contentrating", multi: false, required: true },
    },
    audio: {
        author: { name: "Author", type: "author", multi: true, required: true },
        contentrating: { name: 'Content Rating', type: "contentrating", multi: false, required: true },
    },
    audiobook: {
        author: { name: "Author", type: "author", multi: true, required: true },
        contentrating: { name: 'Content Rating', type: "contentrating", multi: false, required: true },
    },
    book: {
        author: { name: "Author", type: "author", multi: true, required: true },
        contentrating: { name: 'Content Rating', type: "contentrating", multi: false, required: true },
    },
    magazine: {
        author: { name: "Author", type: "author", multi: true, required: true },
        contentrating: { name: 'Content Rating', type: "contentrating", multi: false, required: true },
    },
    movie: {
        contentrating: { name: 'Content Rating', type: "contentrating", multi: false, required: true },
    },
    tvshow: {
        contentrating: { name: 'Content Rating', type: "contentrating", multi: false, required: true },
    },
    wallpaper: {
        author: { name: "Author", type: "author", multi: true, required: true },
        contentrating: { name: 'Content Rating', type: "contentrating", multi: false, required: true },
        resolution: { name: "Resolution", type: "resolution", multi: true, required: false },
        descriptive: { name: "Category", type: "descriptive", multi: true, required: false }
    },
};

var imageTypes = {
    cover: {
        sizes: {
            min : { w : 500, h : 500 },
            max : { w : 2560, h : 2560}
        }
    },
    screenshot: {
        sizes: {
            min : { w : 500, h : 500 },
            max : { w : 2560, h : 2560}
        }
    },
    icon: {
        huge: {
            sizes: {
                min : { w : 512, h : 512 },
                max : { w : 512, h : 512}
            }
        },
        large: {
            sizes: {
                min : { w : 256, h : 256 },
                max : { w : 256, h : 256}
            }
        },
        big: {
            sizes: {
                min : { w : 128, h : 128 },
                max : { w : 128, h : 128}
            }
        },
        medium: {
            sizes: {
                min : { w : 64, h : 64 },
                max : { w : 64, h : 64}
            }
        },
        small: {
            sizes: {
                min : { w : 32, h : 32 },
                max : { w : 32, h : 32}
            }
        },
        tiny: {
            sizes: {
                min : { w : 22, h : 22 },
                max : { w : 22, h : 22}
            }
        }
    }
};

var icons = [{
        type: 'icon',
        subtype: 'huge',
        name: "Icon (huge)",
        multi: false,
        props: imageTypes.icon.huge
    }, {
        type: 'icon',
        subtype: 'large',
        name: "Icon (large)",
        multi: false,
        props: imageTypes.icon.large
    }, {
        type: 'icon',
        subtype: 'big',
        name: "Icon (big)",
        multi: false,
        props: imageTypes.icon.big
    }, {
        type: 'icon',
        subtype: 'medium',
        name: "Icon (medium)",
        multi: false,
        props: imageTypes.icon.medium
    }, {
        type: 'icon',
        subtype: 'small',
        name: "Icon (small)",
        multi: false,
        props: imageTypes.icon.small
    }, {
        type: 'icon',
        subtype: 'tiny',
        name: "Icon (tiny)",
        multi: false,
        props: imageTypes.icon.tiny
    }
];

module.exports.images = {
    application : [{
            type: 'screenshot',
            subtype: 'screen1',
            name: "Screenshot 1",
            multi: false,
            props: imageTypes['screenshot']
        }, {
            type: 'screenshot',
            subtype: 'screen2',
            name: "Screenshot 2",
            multi: false,
            props: imageTypes['screenshot']
        }
    ].concat(icons),
    article: icons,
    audio: icons,
    audiobook: [{
            type: 'cover',
            subtype: 'front',
            name: "Front cover",
            multi: false,
            props: imageTypes['cover']
        }, {
            type: 'cover',
            subtype: 'back',
            name: "Back cover",
            multi: false,
            props: imageTypes['cover']
        }
    ].concat(icons),
    book : [{
            type: 'cover',
            subtype: 'front',
            name: "Front cover",
            multi: false,
            props: imageTypes['cover']
        }, {
            type: 'cover',
            subtype: 'back',
            name: "Back cover",
            multi: false,
            props: imageTypes['cover']
        }
    ].concat(icons),
    game : [{
            type: 'screenshot',
            subtype: 'screen1',
            name: "Screenshot 1",
            multi: false,
            props: imageTypes['screenshot']
        }, {
            type: 'screenshot',
            subtype: 'screen2',
            name: "Screenshot 2",
            multi: false,
            props: imageTypes['screenshot']
        }
    ].concat(icons),
    magazine : [{
            type: 'cover',
            subtype: 'front',
            name: "Cover",
            multi: false,
            props: imageTypes['cover']
        }
    ].concat(icons),
    movie : [{
            type: 'cover',
            subtype: 'front',
            name: "Cover",
            multi: false,
            props: imageTypes['cover']
        }
    ].concat(icons),
    tvshow : [{
            type: 'cover',
            subtype: 'front',
            name: "Cover",
            multi: false,
            props: imageTypes['cover']
        }
    ].concat(icons),
    wallpaper : [{
            type: 'screenshot',
            subtype: 'screen1',
            name: "Screenshot",
            multi: false,
            props: imageTypes['screenshot']
        }
    ]
}

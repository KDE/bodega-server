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
        descriptive: { name: "Category", type: "descriptive", multi: true, required: false }
    },
    widget: {
        author: { name: "Author", type: "author", multi: true, required: true },
        contentrating: { name: 'Content Rating', type: "contentrating", multi: false, required: true },
        descriptive: { name: "Category", type: "descriptive", multi: true, required: false }
    },
    game: {
        author: { name: "Author", type: "author", multi: true, required: true },
        contentrating: { name: 'Content Rating', type: "contentrating", multi: false, required: true },
        descriptive: { name: "Category", type: "descriptive", multi: true, required: false }
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

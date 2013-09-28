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
    application: ["author", "contentrating"],
    article: ["author", "contentrating"],
    audio: ["author", "contentrating"],
    audiobook: ["author", "contentrating"],
    book: ["author", "publisher", "contentrating"],
    game: ["author", "contentrating"],
    magazine: ["author", "contentrating"],
    movie: ["license", "contentrating"],
    tvshow: ["license", "contentrating"],
    wallpaper: ["author", "contentrating"]
};

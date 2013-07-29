/*
    Copyright 2012 Coherent Theory LLC

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

#include "kdewallpapersdatabase.h"

#include <QFileInfo>
#include <QHash>
#include <QLocale>
#include <QSqlDatabase>
#include <QSqlQuery>
#include <QSqlError>
#include <QTime>
#include <QVariant>

#include <QDebug>

void WallpapersDatabase::write(const QString &catalogPath)
{
    WallpapersDatabase db(catalogPath);

    Catalog catalog(catalogPath);
    db.writeWallpapers(catalog);
}

WallpapersDatabase::WallpapersDatabase(const QString &contentPath)
    : Database(contentPath, "KDE", "VIVALDI-1")
{
    m_licenseId = licenseId("LGPL");
    m_wallpapersChannelId = writeChannel(QLatin1String("Wallpapers"),
                                       QLatin1String("Wallpaper images"),
                                       "default/wallpaper.png");
    m_assetTypeTagId = tagId(tagTypeId("assetType"), "wallpaper", &m_mimetypeIds);
    writeChannelTags(m_wallpapersChannelId, m_assetTypeTagId);
}

void WallpapersDatabase::writeWallpapers(const Catalog &catalog)
{
    QTime time;

    time.start();

    bool transaction = QSqlDatabase::database().transaction();

    if (!transaction) {
        qWarning()<<"Couldn't initiate transaction!";
    }


    QHash<QString, Wallpaper> wallpapers = catalog.wallpapers();
    QHash<QString, Wallpaper>::const_iterator itr;
    int numWallpapersWritten = 0;
    // report progress every 5%
    const int reportIncrement = wallpapers.count() / 20.;
    int lastReport = 0;

    QSqlQuery registerJobQuery;
    registerJobQuery.prepare("update batchJobsInProgress set doWork = :working where job = 'kdeartwork'");
    registerJobQuery.bindValue(":working", true);
    if (!registerJobQuery.exec()) {
        showError(registerJobQuery);
    }

    QSqlQuery checkIfExists;
    checkIfExists.prepare("select id from assets where (path = :path and "
                          "id in (select asset from channelassets where channel = " +
                          QString::number(m_wallpapersChannelId) + "));");

    QSqlQuery updateQuery;
    updateQuery.prepare("update assets "
                  "set name = :name, license = :license, author = :author,"
                  "version = :version, externid = :externid, image = :image, size = :size "
                  "where id = :id "
                  "returning id;");

    QSqlQuery insertQuery;
    insertQuery.prepare("insert into assets "
                  "(name, description, license, author, version, path, file, externid, image, size) "
                  "values "
                  "(:name, :description, :license, :author, :version, :path, :file, :externid, :image, :size) "
                  "returning id;");

    for (itr = wallpapers.constBegin(); itr != wallpapers.constEnd(); ++itr) {
        const Wallpaper &wallpaper = *itr;
        int assetId = findWallpaperAsset(wallpaper, checkIfExists);
        if (assetId) {
            writeWallpaperAsset(wallpaper, updateQuery, assetId);
        } else {
            assetId = writeWallpaperAsset(wallpaper, insertQuery);

            if (!assetId) {
                QSqlDatabase::database().rollback();
                return;
            }
        }

        writeWallpaperAssetTags(wallpaper, assetId);

        ++numWallpapersWritten;
        if (numWallpapersWritten - lastReport > reportIncrement) {
            double written = numWallpapersWritten;
            int percent = (written/wallpapers.count()) * 100;
            qDebug()<<"Written "<< percent << "%...";
            lastReport = numWallpapersWritten;
        }
    }

    registerJobQuery.bindValue(":working", false);
    if (!registerJobQuery.exec()) {
        showError(registerJobQuery);
    }

    bool commit = QSqlDatabase::database().commit();
    if (!commit) {
        qWarning()<<"Couldn't commit db data!";
    }

    int elapsed = time.elapsed();

    qDebug()<<"Writing took "<<elapsed / 1000. << " secs.";
}

int WallpapersDatabase::findWallpaperAsset(const Wallpaper &wallpaper, QSqlQuery &query)
{
    query.bindValue(":path", wallpaper.installPath());
    if (!query.exec()) {
        qDebug() << "Tried to do: " << query.lastQuery();
        showError(query);
        return 0;
    }

    if (!query.first()) {
        return 0;
    }

    QVariant res = query.value(0);
    return res.toInt();
}

int WallpapersDatabase::writeWallpaperAsset(const Wallpaper &wallpaper, QSqlQuery &query, int assetId)
{
    QString image = "kdeartwork/" + wallpaper.path + ".jpg";
    return writeAsset(query, wallpaper.name, QString(), m_licenseId, partnerId(),
                      QLatin1String("1.0"), wallpaper.installPath(), wallpaper.pluginName, image);
}

void WallpapersDatabase::writeWallpaperAssetTags(const Wallpaper &wallpaper, int assetId)
{
    int author = authorId(wallpaper.author);
    writeAssetTags(assetId, author);
    writeAssetTags(assetId, m_assetTypeTagId);
}


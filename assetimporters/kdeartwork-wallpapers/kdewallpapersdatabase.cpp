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

void WallpapersDatabase::write(const QString &channelPath, const QString &catalogPath, bool clearOldData)
{
    WallpapersDatabase db(channelPath);

    Catalog catalog(catalogPath);
    db.writeInit(clearOldData);
    db.writeWallpapers(catalog);
    db.writeChannels();
    db.writeDeviceChannels();
}

WallpapersDatabase::WallpapersDatabase(const QString& channelPath)
    : Database(channelPath),
    m_partnerId(0),
    m_authorTagId(0),
    m_categoryTagId(0),
    m_licenseId(0),
    m_contributorTagId(0),
    m_createdTagId(0),
    m_mimetypeTagId(0)
{
    //FIXME: fix to LGPL
    m_licenseId = 2;
    //Fix to KDE
    m_partnerId = 1;
}

void WallpapersDatabase::writeInit(bool clearOldData)
{
    QSqlDatabase::database().transaction();
/*
    m_partnerId = partnerQuery();
    if (m_partnerId <= 0) {
        QSqlQuery query;
        if (!query.exec("insert into partners (name, developer, distributor) "
                        "values ('Project Gutenberg', false, true);")) {
            showError(query);
            QSqlDatabase::database().rollback();
            return;
        }
        m_partnerId = partnerQuery();
    }*/
    m_authorTagId = this->authorTagId();
    if (!m_authorTagId) {
        QSqlDatabase::database().rollback();
        Q_ASSERT(!"couldn't create author tag id");
        return;
    }
    m_categoryTagId = this->categoryTagTypeId();
    if (!m_categoryTagId) {
        QSqlDatabase::database().rollback();
        Q_ASSERT(!"couldn't create author tag id");
        return;
    }
    m_mimetypeTagId = this->mimetypeTagId();
    if (!m_mimetypeTagId) {
        QSqlDatabase::database().rollback();
        Q_ASSERT(!"couldn't create mimeType tag id");
        return;
    }

    QSqlDatabase::database().commit();
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

    int wallpapersChannel = channelId(QLatin1String("Wallpapers"), QLatin1String("Wallpapers"));

    QSqlQuery checkIfExists;
    checkIfExists.prepare("select id from assets where (path = :path and "
                          "id in (select asset from channelassets where channel = " +
                          QString::number(wallpapersChannel) + "));");

    QSqlQuery updateQuery;
    updateQuery.prepare("update assets "
                  "set name = :name, license = :license, author = :author,"
                  "version = :version, externid = :externid, image = :image "
                  "where id = :id "
                  "returning id;");

    QSqlQuery insertQuery;
    insertQuery.prepare("insert into assets "
                  "(name, license, author, version, path, externid, image) "
                  "values "
                  "(:name, :license, :author, :version, :path, :externid, :image) "
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
    query.bindValue(":name", wallpaper.name);
    query.bindValue(":license", m_licenseId);
    query.bindValue(":author", m_partnerId);
    query.bindValue(":version", QLatin1String("1.0"));
    query.bindValue(":path", wallpaper.installPath());
    query.bindValue(":externid", wallpaper.pluginName);
    query.bindValue(":image", "kdeartwork/" + wallpaper.path + ".jpg");
    // XXX figure out what to do about descriptions
    //query.bindValue(":description",);

    if (assetId > 0) {
        query.bindValue(":id", assetId);
    }

    if (!query.exec()) {
        showError(query);
        return 0;
    }

    if (!query.first()) {
        return 0;
    }

    QVariant res = query.value(0);
    //qDebug()<<"Last id"<<res;
    return res.toInt();
}

void WallpapersDatabase::writeWallpaperAssetTags(const Wallpaper &wallpaper, int assetId)
{
    writeAssetTags(assetId, wallpaper.author, wallpaper.mimeType);
}

void WallpapersDatabase::writeWallpapersChannelTags()
{
    writeChannelTags(QLatin1String("Wallpapers"), Catalog::c_mimeType, QLatin1String("Wallpapers"));

}


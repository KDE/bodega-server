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

#include "database.h"


#include <QFileInfo>
#include <QHash>
#include <QLocale>
#include <QSqlDatabase>
#include <QSqlQuery>
#include <QSqlError>
#include <QTime>
#include <QVariant>

#include <QDebug>

void WallpapersDatabase::write(const Catalog &catalog, bool clearOldData)
{
    WallpapersDatabase db;

    db.writeInit(clearOldData);
    db.writeWallpapers(catalog);
    db.writeChannels(catalog);
    db.writeDeviceChannels(catalog);
}

WallpapersDatabase::WallpapersDatabase()
    : m_db(QSqlDatabase::addDatabase("QPSQL")),
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
    //db.setHostName("localhost");
    m_db.setDatabaseName("bodega");
    m_db.setUserName("bodega");
    m_db.setPassword("bodega");
    bool ok = m_db.open();
    qDebug()<<"db opened = "<<ok;
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

void WallpapersDatabase::writeChannels(const Catalog &catalog)
{
    QSqlDatabase::database().transaction();

    int wallpapersChannel = channelId(QLatin1String("Wallpapers"), QLatin1String("Wallpapers"));
    if (!wallpapersChannel) {
        QSqlDatabase::database().rollback();
        return;
    }
    m_extraChannelIds.insert(QLatin1String("Wallpapers"), wallpapersChannel);

    QSqlQuery query;
    query.prepare("update channels set image = 'default/wallpaper.png' where id = :channelId;");
    query.bindValue(":channelid", wallpapersChannel);
    if (!query.exec()) {
        showError(query);
        QSqlDatabase::database().rollback();
        return;
    }

    writeChannelTags();

    QSqlDatabase::database().commit();
}

void WallpapersDatabase::writeDeviceChannels(const Catalog &catalog)
{
    QSqlQuery query;

    query.prepare("insert into deviceChannels (device, channel) "
                  "values ('VIVALDI-1', :channelId);");


    QHash<QString, int>::const_iterator itr;
    for (itr = m_channelIds.constBegin(); itr != m_channelIds.constEnd();
         ++itr) {
        int channelId = itr.value();

        query.bindValue(":channelId", channelId);
        if (!query.exec()) {
            showError(query);
            return;
        }
    }

    for (itr = m_extraChannelIds.constBegin();
         itr != m_extraChannelIds.constEnd();
         ++itr) {
        int channelId = itr.value();

        query.bindValue(":channelId", channelId);
        if (!query.exec()) {
            showError(query);
            return;
        }
    }
}


int WallpapersDatabase::authorQuery(const QString &author) const
{
    return tagQuery(m_authorTagId, author);
}

int WallpapersDatabase::tagQuery(int tagTypeId, const QString &text) const
{
    QSqlQuery query;
    query.prepare("select id from tags where partner=:partner "
                  "and type=:type "
                  " and title=:text;");

    query.bindValue(":partner", m_partnerId);
    query.bindValue(":type", tagTypeId);
    query.bindValue(":author", text);

    if (!query.exec()) {
        showError(query);
        return 0;
    }
    if (!query.first()) {
        return 0;
    }
    QVariant res = query.value(0);
    return res.toInt();
}

int WallpapersDatabase::tagTypeQuery(const QString &type) const
{
    QSqlQuery query;
    query.prepare("select id from tagTypes where type=:type;");
    query.bindValue(":type", type);
    if (!query.exec()) {
        showError(query);
        return 0;
    }
    if (!query.first()) {
        return 0;
    }
    QVariant res = query.value(0);
    return res.toInt();
}

int WallpapersDatabase::channelQuery(const QString &channel,
                           int parentId) const
{
    QSqlQuery query;
    QString queryText =
        QString::fromLatin1("select id from channels where "
                            "name=:name and partner=:partnerId");

    if (parentId) {
        queryText += QLatin1String(" and parent=:parentId;");
        query.prepare(queryText);
        query.bindValue(":parentId", parentId);
    } else {
        queryText += QLatin1String(";");
        query.prepare(queryText);
    }
    query.bindValue(":name", channel);
    query.bindValue(":partnerId", m_partnerId);

    if (!query.exec()) {
        showError(query);
        return 0;
    }
    if (!query.first()) {
        return 0;
    }
    QVariant res = query.value(0);
    //qDebug()<<"channel = "<<channel<<" is "<<res;
    return res.toInt();
}

int WallpapersDatabase::categoryQuery(const QString &name) const
{
    QSqlQuery query;

    query.prepare("select id from tags where partner=:partnerId and "
                  "type=:typeId and title=:title;");

    query.bindValue(":partnerId", m_partnerId);
    query.bindValue(":typeId", m_categoryTagId);
    query.bindValue(":title", name);

    if (!query.exec()) {
        showError(query);
        return 0;
    }
    if (!query.first()) {
        return 0;
    }
    QVariant res = query.value(0);
    //qDebug()<<"chennel = "<<channel<<" is "<<res;
    return res.toInt();
}

int WallpapersDatabase::tagTypeCreate(const QString &type)
{
    QSqlQuery query;
    query.prepare("insert into tagTypes "
                  "(type) "
                  "values (:type);");
    query.bindValue(":type", type);
    if (!query.exec()) {
        showError(query);
        QSqlDatabase::database().rollback();
        return 0;
    }

    return tagTypeQuery(type);
}

int WallpapersDatabase::channelCreate(const QString &name,
                            const QString &description,
                            int parentId)
{
    QSqlQuery query;
    if (parentId) {
        query.prepare("insert into channels "
                      "(partner, active, parent, name, description) "
                      "values "
                      "(:partner, :active, :parent, :name, :description) "
                      "returning id;");
        query.bindValue(":parent", parentId);
    } else {
        query.prepare("insert into channels "
                      "(partner, active, name, description) "
                      "values "
                      "(:partner, :active, :name, :description) "
                      "returning id;");
    }

    query.bindValue(":partner", m_partnerId);
    query.bindValue(":active", true);
    query.bindValue(":name", name);
    query.bindValue(":description", description);

    if (!query.exec()) {
        showError(query);
        return 0;
    }
    if (!query.first()) {
        return 0;
    }
    QVariant res = query.value(0);
    return res.toInt();
}

int WallpapersDatabase::categoryCreate(const QString &name)
{
    QSqlQuery query;

    query.prepare("insert into tags "
                  "(partner, type, title) "
                  "values "
                  "(:partner, :type, :title) "
                  "returning id;");

    query.bindValue(":partner", m_partnerId);
    query.bindValue(":type", m_categoryTagId);
    query.bindValue(":title", name);

    if (!query.exec()) {
        showError(query);
        return 0;
    }
    if (!query.first()) {
        return 0;
    }
    QVariant res = query.value(0);
    return res.toInt();
}

int WallpapersDatabase::authorTagId()
{
    int tagId= tagTypeQuery(QLatin1String("author"));
    if (!tagId) {
        tagId = tagTypeCreate(QLatin1String("author"));
    }
    return tagId;
}

int WallpapersDatabase::categoryTagTypeId()
{
    int tagId= tagTypeQuery(QLatin1String("category"));
    if (!tagId) {
        tagId = tagTypeCreate(QLatin1String("category"));
    }
    return tagId;
}

int WallpapersDatabase::contributorTagId()
{
    int tagId= tagTypeQuery(QLatin1String("contributor"));
    if (!tagId) {
        tagId = tagTypeCreate(QLatin1String("contributor"));
    }
    return tagId;
}

int WallpapersDatabase::createdTagId()
{
    int tagId= tagTypeQuery(QLatin1String("created"));
    if (!tagId) {
        tagId = tagTypeCreate(QLatin1String("created"));
    }
    return tagId;
}

int WallpapersDatabase::mimetypeTagId()
{
    int tagId= tagTypeQuery(QLatin1String("mimetype"));
    if (!tagId) {
        tagId = tagTypeCreate(QLatin1String("mimetype"));
    }
    return tagId;
}

int WallpapersDatabase::channelId(const QString &name,
                        const QString &description,
                        int parentId )
{
    int channelId = channelQuery(name, parentId);

    if (!channelId) {
        channelId = channelCreate(name, description, parentId);
    }
    return channelId;
}

int WallpapersDatabase::authorId(const QString &author)
{
    return tagId(m_authorTagId, author, &m_authorIds);
}


int WallpapersDatabase::tagId(int tagTypeId, const QString &text,
                    QHash<QString, int> *cache)
{
    Q_ASSERT(cache);

    if (cache->contains(text)) {
        return (*cache)[text];
    }

    int tagId = tagQuery(tagTypeId, text);
    if (!tagId) {
        QSqlQuery query;
        query.prepare("insert into tags "
                      "(partner, type, title) "
                      "values (:partner, :type, :title) "
                      "returning id;");
        query.bindValue(":partner", m_partnerId);
        query.bindValue(":type", tagTypeId);
        query.bindValue(":title", text);

        if (!query.exec()) {
            showError(query);
            return 0;
        }
        if (!query.first()) {
            return 0;
        }
        QVariant res = query.value(0);
        (*cache)[text] = res.toInt();
    } else {
        (*cache)[text] = tagId;
    }

    return (*cache)[text];
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
    QSqlQuery query;
    query.prepare("delete from assetTags where asset = :assetId");
    query.bindValue(":assetId", assetId);
    query.exec();

    query.prepare("insert into assetTags "
                  "(asset, tag) "
                  "values "
                  "(:assetId, :tagId);");

    query.bindValue(":assetId", assetId);
    query.bindValue(":tagId", authorId(wallpaper.author));
    if (!query.exec()) {
        showError(query);
    }

    query.bindValue(":assetId", assetId);
    const int mimetypeId = tagId(m_mimetypeTagId, wallpaper.mimeType, &m_mimetypeIds);
    query.bindValue(":tagId", mimetypeId);
    if (!query.exec()) {
        showError(query);
    }
}

void WallpapersDatabase::writeChannelTags()
{
    const int mimetypeId = tagId(m_mimetypeTagId, Catalog::c_mimeType,  &m_mimetypeIds);
    const int wallpapersChannel = channelId(QLatin1String("Wallpapers"), QLatin1String("Wallpapers"));

    QSqlQuery query;
    query.prepare("select * from channelTags where channel = :channel and tag = :tagId;");
    query.bindValue(":channelId", wallpapersChannel);
    query.bindValue(":tagId", mimetypeId);
    if (query.exec() && query.first()) {
        // tag already exists, don't make it again
        return;
    }

    query.prepare("insert into channelTags "
                  "(channel, tag) "
                  "values "
                  "(:channelId, :tagId);");

    query.bindValue(":channelId", wallpapersChannel);
    query.bindValue(":tagId", mimetypeId);
    if (!query.exec()) {
        showError(query);
    }
}

int WallpapersDatabase::showError(const QSqlQuery &query) const
{
    QSqlError error = query.lastError();
    qDebug() << Q_FUNC_INFO << "QPSQL Error: " << error.databaseText() << error.driverText();
    qDebug() << "Query was "<< query.executedQuery();
    qDebug() << "last was "<< query.lastQuery();
    qDebug() << "bound = "<<query.boundValues();
}


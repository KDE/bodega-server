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

#include "packagedatabase.h"

#include <QDebug>
#include <QTime>
#include <QSqlQuery>
#include <QVariant>

PackageDatabase::PackageDatabase(const QString &channelsCatalogPath,
                                 const QString &packageCatalogPath,
                                 const QString &packageDescPath)
    : Database(),
      m_channelsCatalog(channelsCatalogPath),
      m_catalog(PackageCatalog(packageCatalogPath)),
      m_packageDescPath(packageDescPath)
{
}

void PackageDatabase::write(bool clearOldData)
{
    writeInit(clearOldData);
    writePackageChannels();
    writePackages();
}

void PackageDatabase::writePackages()
{
    QTime time;

    time.start();

    bool transaction = QSqlDatabase::database().transaction();

    if (!transaction) {
        qWarning()<<"Couldn't initiate transaction!";
    }


    QList<Package> packages = m_catalog.packages();
    QList<Package>::const_iterator itr;
    int numPackagesWritten = 0;
    // report progress every 5%
    const int reportIncrement = packages.count() / 20.;
    int lastReport = 0;

    QSqlQuery registerJobQuery;
    registerJobQuery.prepare("update batchJobsInProgress set doWork = :working where job = 'obs'");
    registerJobQuery.bindValue(":working", true);
    if (!registerJobQuery.exec()) {
        showError(registerJobQuery);
    }


    QSqlQuery query;
    query.prepare("insert into assets "
                  "(name, description, license, author, version, path, file, externid, image) "
                  "values "
                  "(:name, :description, :license, :author, :version, :path, :file, :externid, :image) "
                  "returning id;");

    for (itr = packages.constBegin(); itr != packages.constEnd(); ++itr) {
        const Package &package = *itr;
        const QString packageId = package.name + ';' +
                                  package.version + ';' +
                                  package.architecture + ';' +
                                  package.repository;
        const QString packagePath = package.name+QLatin1String(".desc");

        QFile file(m_packageDescPath + '/' + packagePath);
        if (!file.open(QIODevice::WriteOnly | QIODevice::Text)) {
            qDebug() << "Impossible to write the file" << m_packageDescPath + '/' + packagePath;
            QSqlDatabase::database().rollback();
            return;
        }
        QTextStream out(&file);
        out << packageId;
        file.close();

        //TODO: check if the image exists
        int assetId = writeAsset(query, package.name, package.description, 2, 1, package.version, packagePath, packagePath, packageId, QLatin1String("images/")+package.name+QLatin1String(".png"));
        if (!assetId) {
            showError(query);
            QSqlDatabase::database().rollback();
            return;
        }

        int author = authorId(package.author);
        writeAssetTags(assetId, author);

        //TODO FIXME
        QHash<QString, int> mimetypeIds;
        int mimetypeId = tagId(mimetypeTagId(), package.mimeType, &mimetypeIds);
        writeAssetTags(assetId, mimetypeId);

        foreach (const QString &channel, package.channels) {
            //FIXME: assumes the channel already exists
            int packagesChannel = channelId(channel, QString());
            QSqlQuery subchannelassetQuery;
            subchannelassetQuery.prepare("insert into subchannelassets "
                            "(channel, leafchannel, asset) "
                            "values "
                            "(:channelid, :leafchannelid, :assetid);");

            subchannelassetQuery.bindValue(":channelid", packagesChannel);
            subchannelassetQuery.bindValue(":leafchannelid", packagesChannel);
            subchannelassetQuery.bindValue(":assetid", assetId);
            if (!subchannelassetQuery.exec()) {
                showError(subchannelassetQuery);
                QSqlDatabase::database().rollback();
                return;
            }


            QSqlQuery channelassetQuery;
            channelassetQuery.prepare("insert into channelassets "
                            "(channel, asset) "
                            "values "
                            "(:channelid, :assetid);");

            channelassetQuery.bindValue(":channelid", packagesChannel);
            channelassetQuery.bindValue(":assetid", assetId);
            if (!channelassetQuery.exec()) {
                showError(channelassetQuery);
                QSqlDatabase::database().rollback();
                return;
            }
        }

        ++numPackagesWritten;
        if (numPackagesWritten - lastReport > reportIncrement) {
            double written = numPackagesWritten;
            int percent = (written/packages.count()) * 100;
            qDebug()<<"Written "<< percent << "%...";
            lastReport = numPackagesWritten;
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

int PackageDatabase::partnerQuery()
{
    return 1;
}

void PackageDatabase::writePackageChannels()
{
    foreach(const Channel &c, m_channelsCatalog.channels()) {
        writeChannels(c.name, c.description, c.image, c.parent.toInt());

        const int chanId = channelId(c.name, c.description, c.parent.toInt());
        const int mime = mimetypeTagId();
        QHash<QString, int> mimetypeIds;
        const int mimetypeId = tagId(mime, c.mimeType, &mimetypeIds);

        writeChannelTags(chanId, mimetypeId);

        writeDeviceChannels(chanId);
    }
}


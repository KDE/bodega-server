#include "packagedatabase.h"

#include <QDebug>
#include <QTime>
#include <QSqlQuery>

PackageDatabase::PackageDatabase(const QString &channelsCatalogPath,
                                 const QString &packageCatalogPath,
                                 const QString &packageDescPath)
    : Database(channelsCatalogPath),
      m_catalog(PackageCatalog(packageCatalogPath)),
      m_packageDescPath(packageDescPath)
{
}

void PackageDatabase::write(bool clearOldData)
{
    writeInit(clearOldData);
    writeChannels();
    writeDeviceChannels();
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
    registerJobQuery.prepare("update batchJobsInProgress set doWork = :working where job = 'kdeartwork'");
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
        int assetId = writeAsset(query, package.name, package.description, package.version, packagePath, packagePath, packageId, QLatin1String("images/")+package.name+QLatin1String(".png"));
        if (!assetId) {
            showError(query);
            QSqlDatabase::database().rollback();
            return;
        }

        writeAssetTags(assetId, package.mimeType, package.author);

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

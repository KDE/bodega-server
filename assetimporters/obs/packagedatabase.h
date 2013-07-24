#ifndef PACKAGEDATABASE_H
#define PACKAGEDATABASE_H

#include "../database-common/database.h"
#include "packagecatalog.h"
#include "channelscatalog.h"

class PackageDatabase : public Database
{
public:
    PackageDatabase(const QString &channelsCatalogPath,
                    const QString &packageCatalogPath,
                    const QString &packageDescPath);
    void write();

private:
    void writePackageChannels();
    void writePackages();
    PackageCatalog m_catalog;
    QString m_packageDescPath;
    ChannelsCatalog m_channelsCatalog;
};

#endif

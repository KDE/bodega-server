#ifndef PACKAGEDATABASE_H
#define PACKAGEDATABASE_H

#include "../database-common/database.h"
#include "packagecatalog.h"

class PackageDatabase : public Database
{
public:
    PackageDatabase(const QString &channelsCatalogPath,
                    const QString &packageCatalogPath,
                    const QString &packageDescPath);
    void write(bool clearOldData);

private:
    void writePackages();
    int partnerQuery();
    PackageCatalog m_catalog;
    QString m_packageDescPath;
};

#endif

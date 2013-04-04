#ifndef WALLPAPERSDATABASE_H
#define WALLPAPERSDATABASE_H

#include "catalog.h"
#include "../database-common/database.h"
#include <QSqlDatabase>

class WallpapersDatabase : public Database
{
public:
    static void write(const QString &channelPath, const QString &catalogPath, bool clearOldData);

private:
    WallpapersDatabase(const QString& channelPath);

    void writeLanguages(const Catalog &catalog);
    void writeCategoryTags(const Catalog &catalog);
    void writeWallpapers(const Catalog &catalog);
    int partnerQuery();
    int languageQuery(const QString &lang);

private:
    int findWallpaperAsset(const Wallpaper &wallpaper, QSqlQuery &query);
    int writeWallpaperAsset(const Wallpaper &wallpaper, QSqlQuery &query, int assetId = 0);
    void writeWallpaperAssetTags(const Wallpaper &wallpaper, int assetId);
    void writeWallpapersChannelTags();

private:
    int m_partnerId;
    int m_authorTagId;
    int m_categoryTagId;
    int m_licenseId;
    int m_contributorTagId;
    int m_createdTagId;
    int m_mimetypeTagId;
    QHash<QString, int> m_channelIds;
    QHash<QString, int> m_authorIds;
    QHash<QString, int> m_categoryTagIds;
    QHash<QString, int> m_contributorIds;
    QHash<QString, int> m_extraChannelIds;
    QHash<QString, int> m_mimetypeIds;
    QHash<QString, int> m_createdIds;
};

#endif

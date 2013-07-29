#ifndef WALLPAPERSDATABASE_H
#define WALLPAPERSDATABASE_H

#include "catalog.h"
#include "../common/database.h"
#include <QSqlDatabase>

class WallpapersDatabase : public Database
{
public:
    static void write(const QString &catalogPath);

private:
    WallpapersDatabase(const QString &contentPath);

    void writeWallpapers(const Catalog &catalog);

private:
    int findWallpaperAsset(const Wallpaper &wallpaper, QSqlQuery &query);
    int writeWallpaperAsset(const Wallpaper &wallpaper, QSqlQuery &query, int assetId = 0);
    void writeWallpaperAssetTags(const Wallpaper &wallpaper, int assetId);

private:
    int m_assetTypeTagId;
    int m_wallpapersChannelId;
    int m_licenseId;
    QHash<QString, int> m_mimetypeIds;
};

#endif

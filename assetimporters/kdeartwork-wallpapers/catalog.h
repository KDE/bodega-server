#ifndef CATALOG_H
#define CATALOG_H

#include <QDir>
#include <QHash>

struct Wallpaper
{
    QString pluginName;
    QString name;
    QString author;
    QString path;
    QString mimeType;
};

class Catalog
{
public:
    Catalog(const QString &root);

    void addMetadata(const QString &path);

    QHash<QString, Wallpaper> wallpapers() const;

    static const QString c_mimeType;

private:
    QHash<QString, Wallpaper> m_wallpapers;
    QDir m_dir;
};

#endif

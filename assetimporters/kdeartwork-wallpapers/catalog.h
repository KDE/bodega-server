#ifndef CATALOG_H
#define CATALOG_H

#include <QDir>
#include <QHash>

struct Wallpaper
{
    QString installPath() const
    {
        return "wallpapers/" + path + ".wallpaper";
    }

    QString pluginName;
    QString name;
    QString author;
    QString path;
};

class Catalog
{
public:
    Catalog(const QString &root);

    void addMetadata(const QString &path);

    QHash<QString, Wallpaper> wallpapers() const;

private:
    QHash<QString, Wallpaper> m_wallpapers;
    QDir m_dir;
};

#endif

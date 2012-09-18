#include "catalog.h"

#include <QDebug>
#include <QSettings>

const QString Catalog::c_mimeType = QLatin1String("application/x-desktop-wallpaper");

Catalog::Catalog(const QString &root)
{
    m_dir = QDir(root);
    foreach (const QString &dir, m_dir.entryList(QDir::Dirs)) {
        addMetadata(m_dir.filePath(dir));
    }
}

void Catalog::addMetadata(const QString &path)
{
    QSettings settings(path + "/metadata.desktop", QSettings::IniFormat);
    settings.beginGroup("Desktop Entry");

    const QString pluginName = settings.value("X-KDE-PluginInfo-Name").toString();
    if (pluginName.isEmpty()) {
        return;
    }
    m_wallpapers[pluginName].pluginName = pluginName;
    m_wallpapers[pluginName].name = settings.value("Name").toString();
    m_wallpapers[pluginName].author = settings.value("X-KDE-PluginInfo-Author").toString();
    m_wallpapers[pluginName].path = QString(path).replace(QRegExp(".*/([^/]*)"), "\\1");
    m_wallpapers[pluginName].mimeType = c_mimeType;
}

QHash<QString, Wallpaper> Catalog::wallpapers() const
{
    return m_wallpapers;
}


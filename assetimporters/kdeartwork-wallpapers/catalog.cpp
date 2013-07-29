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

#include "catalog.h"

#include <QDebug>
#include <QSettings>

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
}

QHash<QString, Wallpaper> Catalog::wallpapers() const
{
    return m_wallpapers;
}


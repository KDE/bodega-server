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

#include "packagecatalog.h"

#include <QDebug>
#include <QSettings>

PackageCatalog::PackageCatalog(const QString &path)
{
    addMetadata(path);
}

void PackageCatalog::addMetadata(const QString &path)
{
    QSettings settings(path, QSettings::IniFormat);
    Package package;
    foreach (const QString &group, settings.childGroups()) {
        settings.beginGroup(group);

        package.architecture = settings.value("Architecture").toString();
        package.author = settings.value("Author").toString();
        package.description = settings.value("Description").toString();
        package.channels = settings.value("Channels").toString().split(QLatin1Char(','));
        package.mimeType = settings.value("MimeType").toString();
        package.name = settings.value("Name").toString();
        package.path = settings.value("Path").toString();
        package.repository = settings.value("Repository").toString();
        package.version = settings.value("Version").toString();

        m_packages << package;
        settings.endGroup();
    }
}

QList<Package> PackageCatalog::packages() const
{
    return m_packages;
}


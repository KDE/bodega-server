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

#include "channelscatalog.h"

#include <QDebug>
#include <QSettings>

ChannelsCatalog::ChannelsCatalog(const QString &path)
{
    addMetadata(path);
}

void ChannelsCatalog::addMetadata(const QString &path)
{
    QSettings settings(path, QSettings::IniFormat);
    Channel channel;
    foreach (const QString &group, settings.childGroups()) {
        settings.beginGroup(group);

        channel.name = settings.value("Name").toString();
        channel.description = settings.value("Description").toString();
        channel.parent = settings.value("Parent").toString();
        channel.image = settings.value("Image").toString();

        m_channels << channel;
        settings.endGroup();
    }
}

QList<Channel> ChannelsCatalog::channels() const
{
    return m_channels;
}


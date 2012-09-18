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


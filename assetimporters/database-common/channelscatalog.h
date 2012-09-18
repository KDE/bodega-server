#ifndef CHANNELSCATALOG_H
#define CHANNELSCATALOG_H

#include <QDir>
#include <QHash>

struct Channel
{
    QString name;
    QString description;
    QString mimeType;
    QString parent;
    QString image;
};

class ChannelsCatalog
{
public:
    ChannelsCatalog(const QString &path);

    void addMetadata(const QString &path);

    QList<Channel> channels() const;


private:
    QList<Channel> m_channels;
    QDir m_dir;
};

#endif

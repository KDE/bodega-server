#ifndef PACKAGECATALOG_H
#define PACKAGECATALOG_H

#include <QHash>
#include <QStringList>

struct Package
{
    QString architecture;
    QString author;
    QString description;
    QString mimeType;
    QString name;
    QString path;
    QString repository;
    QString version;
    QStringList channels;
};

class PackageCatalog
{
public:
    PackageCatalog(const QString &path);

    void addMetadata(const QString &path);

    QList<Package> packages() const;

private:
    QList<Package> m_packages;
};

#endif

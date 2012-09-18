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


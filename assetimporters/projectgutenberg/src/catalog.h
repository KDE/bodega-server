#ifndef CATALOG_H
#define CATALOG_H

#include "ebook.h"

#include <QObject>
#include <QHash>

class QFile;
class QNetworkAccessManager;
class QNetworkReply;
class QXmlStreamReader;

namespace Gutenberg
{

class Catalog
{
public:
    Catalog();

    void addFile(const File &file);
    void addBook(const Ebook &book);
    Gutenberg::Ebook bookWithId(const QString &bookId) const;

    QHash<QString, Gutenberg::Ebook> ebooks() const;


    bool isCompiled() const;
    void compile(const QString &imageCachePath);

    QStringList languages() const;
    QStringList authors() const;
    QHash<QUrl, QString> covers() const;

private:
    void removeNonEpubBooks();
    void dumpDebugInfo();

private:
    QHash<QString, Gutenberg::Ebook> m_ebooks;
    bool m_dirty;
    QStringList m_languages;
    QStringList m_authors;
    QStringList m_formats;
    QStringList m_lccs;
    QHash<QString, int> m_lcshs;
    QHash<QUrl, QString> m_coversToDownload;
};

class FileFetcher : public QObject
{
    Q_OBJECT

public:
    FileFetcher(const Catalog &catalog, QObject *parent = 0);

public Q_SLOTS:
    void fetchCovers();

Q_SIGNALS:
    void coversFetched();

private Q_SLOTS:
    void coverFetchFinished();
    void coverDataRecvd();

private:
    QHash<QUrl, QString> m_coversToDownload;
    QHashIterator<QUrl, QString> m_coversIt;
    QHash<QNetworkReply *, QFile *> m_coversBeingFetched;
    QNetworkAccessManager *m_network;
    int m_progress;
};

}

#endif

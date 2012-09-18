#ifndef GUTENBERG_EBOOK_H
#define GUTENBERG_EBOOK_H

#include "lcc.h"

#include <QDate>
#include <QDebug>
#include <QHash>
#include <QList>
#include <QString>
#include <QStringList>
#include <QUrl>

namespace Gutenberg
{

class Ebook;

struct File
{
    QUrl url;
    QString format;
    QString extent;
    QString modified;
    QString bookId;
};

class Ebook
{
public:
    enum Type {
        Type_Book,
        Type_AudioBookHumanRead,
        Type_AudioBookComputerGenerated,
        Type_PicturesStill,
        Type_PicturesMoving,
        Type_Compilations,
        Type_MusicRecorded,
        Type_MusicSheet,
        Type_OtherRecordings,
        Type_Data
    };
    enum Rights {
        Rights_Gutenberg,
        Rights_Copyrighted
    };
public:
    Ebook();

    QString bookId() const;
    void setBookId(const QString &bookId);

    QString publisher() const;
    void setPublisher(const QString &publisher);

    QStringList titles() const;
    void addTitle(const QString &title);

    QStringList creators() const;
    void setCreators(const QStringList &creators);

    QStringList contributors() const;
    void setContributors(const QStringList &lst);

    QString friendlyTitle() const;
    void setFriendlyTitle(const QString &ft);

    QStringList languages() const;
    void setLanguages(const QStringList &langs);

    QString created() const;
    void setCreated(const QString &date);

    QString rightsString() const;
    Ebook::Rights rights() const;
    void setRights(Ebook::Rights rights);

    QStringList descriptions() const;
    void setDescriptions(const QStringList &lst);

    QString typeString() const;
    Ebook::Type type() const;
    void setType(Ebook::Type type);

    QStringList alternatives() const;
    void setAlternatives(const QStringList &lst);

    QString tableOfContents() const;
    void setTableOfContents(const QString &toc);

    QStringList lcsh() const;
    void setLcsh(const QStringList &lst);

    void setLCC(const Gutenberg::LCC &lcc);
    Gutenberg::LCC lcc() const;

    QList<Gutenberg::File> files() const;
    void addFile(const Gutenberg::File &file);


    bool hasEpubFile() const;
    Gutenberg::File epubFile() const;

    bool hasCoverImage() const;
    Gutenberg::File coverImage() const;

private:
    QString m_id;
    QString m_publisher;
    QStringList m_creators;
    QStringList m_contributors;
    QStringList m_titles;
    QString m_friendlyTitle;
    QStringList m_languages;
    QString m_created;
    Ebook::Rights m_rights;
    QStringList m_descriptions;
    Ebook::Type m_type;
    QStringList m_alternatives;
    QString m_toc;

    QStringList m_lcsh;
    Gutenberg::LCC m_lcc;

    QList<Gutenberg::File> m_files;
};

}

QDebug operator<<(QDebug, const Gutenberg::Ebook &);

#endif

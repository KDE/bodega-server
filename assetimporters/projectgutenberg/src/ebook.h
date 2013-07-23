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
        Type_Unknown = 0,
        Type_Book,
        Type_AudioBook,
        Type_PicturesStill,
        Type_PicturesMoving,
        Type_Compilations,
        Type_MusicRecorded,
        Type_MusicSheet,
        Type_OtherRecordings,
        Type_Data
    };
    Q_ENUMS(Type)

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

    QString title() const;
    void setTitle(const QString &title);

    QStringList creators() const;
    void setCreators(const QStringList &creators);

    QStringList contributors() const;
    void setContributors(const QStringList &lst);

    QStringList languages() const;
    void setLanguages(const QStringList &langs);

    QString issued() const;
    void setIssued(const QString &date);

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

    void setCategories(const QStringList &lst);
    void setSubjects(const QStringList &subjects);
    const Gutenberg::LCC &lcc() const;

    QList<Gutenberg::File> files() const;
    void addFile(const Gutenberg::File &file);


    bool hasEpubFile() const;
    Gutenberg::File epubFile() const;

    QString coverImage() const;
    void setCoverImage(const QString &coverUrl);

private:
    QString m_id;
    QString m_publisher;
    QStringList m_creators;
    QStringList m_contributors;
    QString m_title;
    QStringList m_languages;
    QString m_issued;
    QString m_coverUrl;
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

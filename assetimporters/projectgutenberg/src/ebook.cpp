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

#include "ebook.h"

using namespace Gutenberg;

Ebook::Ebook()
    : m_rights(Ebook::Rights_Gutenberg),
      m_type(Ebook::Type_Book)
{
}

QString Ebook::bookId() const
{
    return m_id;
}

QString Ebook::publisher() const
{
    return m_publisher;
}

QStringList Ebook::creators() const
{
    return m_creators;
}

QStringList Ebook::contributors() const
{
    return m_contributors;
}

QString Ebook::title() const
{
    return m_title;
}

QString Ebook::friendlyTitle() const
{
    return m_friendlyTitle;
}

QStringList Ebook::languages() const
{
    return m_languages;
}

void Ebook::setBookId(const QString &bookId)
{
    Q_ASSERT(m_id.isEmpty());
    m_id = bookId;
}

void Gutenberg::Ebook::setPublisher(const QString &publisher)
{
    Q_ASSERT(m_publisher.isEmpty());
    m_publisher = publisher;
}

void Ebook::setTitle(const QString &title)
{
    m_title = title;
}

void Gutenberg::Ebook::setCreators(const QStringList &creators)
{
    Q_ASSERT(m_creators.isEmpty());
    m_creators = creators;
}

void Ebook::setContributors(const QStringList &lst)
{
    Q_ASSERT(m_contributors.isEmpty());
    m_contributors.append(lst);
}

void Ebook::setFriendlyTitle(const QString &ft)
{
    Q_ASSERT(m_friendlyTitle.isEmpty());
    m_friendlyTitle = ft;
}

void Ebook::setLanguages(const QStringList &langs)
{
    Q_ASSERT(m_languages.isEmpty());
    m_languages = langs;
}

QString Ebook::issued() const
{
    return m_issued;
}

void Ebook::setIssued(const QString &date)
{
    m_issued = date;
}

Ebook::Rights Ebook::rights() const
{
    return m_rights;
}

void Ebook::setRights(Ebook::Rights rights)
{
    m_rights = rights;
}

QStringList Ebook::descriptions() const
{
    return m_descriptions;
}

void Ebook::setDescriptions(const QStringList &lst)
{
    Q_ASSERT(m_descriptions.isEmpty());
    m_descriptions = lst;
}

Ebook::Type Ebook::type() const
{
    return m_type;
}

void Ebook::setType(Ebook::Type type)
{
    m_type = type;
}

QStringList Ebook::alternatives() const
{
    return m_alternatives;
}

void Ebook::setAlternatives(const QStringList &lst)
{
    Q_ASSERT(m_alternatives.isEmpty());
    m_alternatives = lst;
}

QString Ebook::tableOfContents() const
{
    return m_toc;
}

void Ebook::setTableOfContents(const QString &toc)
{
    Q_ASSERT(m_toc.isEmpty());
    m_toc = toc;
}

void Gutenberg::Ebook::setSubjects(const QStringList &lst)
{
    m_lcc.setSubjects(lst);
}

const Gutenberg::LCC &Ebook::lcc() const
{
    return m_lcc;
}

void Ebook::setCategories(const QStringList &lcc)
{
    m_lcc.setCategories(lcc);
}

QList<Gutenberg::File> Ebook::files() const
{
    return m_files;
}

void Ebook::addFile(const Gutenberg::File &file)
{
    m_files.append(file);
}

bool Ebook::hasEpubFile() const
{
    QLatin1String epubFormat("application/epub");
    foreach(const Gutenberg::File &file, m_files) {
        if (file.format.contains(epubFormat)) {
            return true;
        }
    }
    return false;
}

File Ebook::epubFile() const
{
    QLatin1String epubFormat("application/epub");
    QList<Gutenberg::File> epubFiles;

    foreach(const Gutenberg::File &file, m_files) {
        if (file.format.contains(epubFormat)) {
            epubFiles.append(file);
        }
    }
    if (epubFiles.isEmpty()){
        return Gutenberg::File();
    }
    /*
     * If possible we want to return the version with images
     */
    if (epubFiles.count() > 1) {
        Q_ASSERT(epubFiles.count() == 2);
        if (!epubFiles.first().url.toString().contains("-images.epub")) {
            return epubFiles[1];
        }
    }
    return epubFiles[0];
}

bool Ebook::hasCoverImage() const
{
    QLatin1String coverFile("cover.medium.jpg");
    foreach(const Gutenberg::File &file, m_files) {
        if (file.url.toString().contains(coverFile)) {
            return true;
        }
    }
    return false;
}

File Ebook::coverImage() const
{
    QLatin1String coverFile("cover.medium.jpg");
    foreach(const Gutenberg::File &file, m_files) {
        if (file.url.toString().contains(coverFile)) {
            return file;
        }
    }
    return Gutenberg::File();
}

QString Ebook::rightsString() const
{
    switch (m_rights) {
    case Rights_Gutenberg:
        return QLatin1String("http://www.gutenberg.org/license");
        break;
    case Rights_Copyrighted:
        return QLatin1String("Copyrighted work. See license inside work.");
        break;
    }
    return QLatin1String("http://www.gutenberg.org/license");
}

QString Ebook::typeString() const
{
    switch (m_type) {
    case Type_Book:
        return QString();
        break;
    case Type_AudioBookHumanRead:
        return QLatin1String("Audio Book, human-read");
        break;
    case Type_AudioBookComputerGenerated:
        return QLatin1String("Audio Book, computer-generated");
        break;
    case Type_PicturesStill:
        return QLatin1String("Pictures, still");
        break;
    case Type_PicturesMoving:
        return QLatin1String("Pictures, moving");
        break;
    case Type_Compilations:
        return QLatin1String("Compilations");
        break;
    case Type_MusicRecorded:
        return QLatin1String("Music, recorded");
        break;
    case Type_MusicSheet:
        return QLatin1String("Music, Sheet");
        break;
    case Type_OtherRecordings:
        return QLatin1String("Other recordings");
        break;
    case Type_Data:
        return QLatin1String("Data");
        break;
    }
    return QString();
}


QDebug operator<<(QDebug s, const Gutenberg::Ebook &book)
{
    s.nospace() << "Ebook(id=" << book.bookId() << ", "
                << "title = " << book.title() << ", issued: " << book.issued() << ")\n";
    s << "\tEPub" << book.epubFile().url << "\n";
    QList<Gutenberg::File> files = book.files();
    foreach (const Gutenberg::File &file, book.files()) {
        s.nospace() << "\t" << file.format << ": " << file.url << '\n';
    }

    QHash<QString, QStringList> lccCats = book.lcc().categories();
    QHashIterator<QString, QStringList> it(lccCats);
    while (it.hasNext()) {
        it.next();
        s.nospace() << "\tLCC " << it.key() << '\n';
        foreach (const QString &subCat, it.value()) {
            s.nospace() << "\t\t" << subCat << '\n';
        }
    }

    s.nospace() << "\tLCCH" << book.lcc().subjects() << '\n';
    return s;
}

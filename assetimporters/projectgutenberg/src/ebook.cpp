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

const QString Ebook::s_epubMimetype(QLatin1String("application/epub"));

Ebook::Ebook()
    : m_rights(Ebook::Rights_Gutenberg),
      m_type(Ebook::Type_Unknown)
{
}

QString Ebook::bookId() const
{
    return m_id;
}

QString Ebook::title() const
{
    return m_title;
}

QStringList Ebook::languages() const
{
    return m_languages;
}

void Ebook::setBookId(const QString &bookId)
{
    if (!m_id.isEmpty()) {
        throw QLatin1String("Book id already set");
    }
    m_id = bookId;
}

void Ebook::setTitle(const QString &title)
{
    static const QRegExp newlines("[\n\r]+");

    m_title = title;
    m_title = m_title.replace(newlines, ": ").simplified();
}

void Ebook::setLanguages(const QStringList &lang)
{
    if (!m_languages.isEmpty()) {
        throw QLatin1String("Languages already set");
    }
    m_languages = lang;
}

QStringList Ebook::authors() const
{
    return m_authors;
}

void Ebook::setAuthors(const QStringList &authors)
{
    m_authors = authors;
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

QString Ebook::description() const
{
    return m_descriptions.join("\n");
}

void Ebook::addDescription(const QString &desc)
{
    m_descriptions << desc;
}

Ebook::Type Ebook::type() const
{
    return m_type;
}

void Ebook::setType(Ebook::Type type)
{
    m_type = type;
}

QStringList Ebook::alternativeTitles() const
{
    return m_alternativeTitles;
}

void Ebook::setAlternativeTitles(const QStringList &lst)
{
    if (!m_alternativeTitles.isEmpty()) {
        throw QLatin1String("Alternative names already set");
    }
    m_alternativeTitles = lst;
}

void Ebook::addAlternativeTitle(const QString &name)
{
    m_alternativeTitles.append(name);
}

QString Ebook::tableOfContents() const
{
    return m_toc;
}

void Ebook::setTableOfContents(const QString &toc)
{
    if (!m_toc.isEmpty()) {
        throw QLatin1String("Table of contents already set");
    }
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

QString Ebook::epubMimetype ()
{
    return s_epubMimetype;
}

bool Ebook::hasEpubFile() const
{
    foreach(const Gutenberg::File &file, m_files) {
        if (file.format.contains(s_epubMimetype)) {
            return true;
        }
    }
    return false;
}

File Ebook::epubFile() const
{
    QList<Gutenberg::File> epubFiles;

    foreach(const Gutenberg::File &file, m_files) {
        if (file.format.contains(s_epubMimetype)) {
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

QString Ebook::coverImage() const
{
    return m_coverUrl;
}

void Ebook::setCoverImage(const QString &coverUrl)
{
    m_coverUrl = coverUrl;
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
    case Type_AudioBook:
        return QLatin1String("Audio Book");
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
    s.nospace() << "---------------------------------------------------------\n";
    s.nospace() << "Ebook(id=" << book.bookId() << ", "
                << "type = " << book.type() << ", "
                << ", issued: " << book.issued() << ")\n"
                << "\ttitle = " << QString(book.title()) << '\n';
    s << "\tEPub " << book.epubFile().url << "\n";
    if (!book.alternativeTitles().isEmpty()) {
        s << "\tAlso known as:" << "\n";
        foreach (const QString &alt, book.alternativeTitles()) {
            s << "\t\t" << alt << "\n";
        }
    }

    const QString desc = book.description();
    if (!desc.isEmpty()) {
        s.nospace() << "\tDescription: " << desc;
    }

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
    if (!book.tableOfContents().isEmpty()) {
        s.nospace() << "\n\tTable of contents:" << "\n\t\t" << book.tableOfContents().replace('\n', "\n\t\t");
    }

    s.nospace() << "\n---------------------------------------------------------\n";
    return s;
}

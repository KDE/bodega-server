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

#ifndef CATALOG_H
#define CATALOG_H

#include "ebook.h"

#include <QHash>

class QXmlStreamReader;

namespace Gutenberg
{

class Catalog
{
public:
    Catalog();

    void addBook(const Ebook &book);

    bool isCompiled() const;
    void compile(const QString &imageCachePath);

    QStringList languages() const;
    QStringList authors() const;
    QHash<QUrl, QString> covers() const;
    QStringList topLevelCategories() const;
    QStringList subCategories() const;
    QHash<QString, QStringList> categoryHierarchy() const;

    QList<Gutenberg::Ebook> m_ebooks;

private:
    void removeNonEpubBooks();
    void dumpDebugInfo();

private:
    bool m_clean;
    QStringList m_languages;
    QStringList m_authors;
    QStringList m_formats;
    QStringList m_lccs;
    QStringList m_subLccs;
    QHash<QString, int> m_lcshs;
    QHash<QString, QStringList> m_lccsHierarchy;
    QHash<QUrl, QString> m_coversToDownload;
};

}

#endif

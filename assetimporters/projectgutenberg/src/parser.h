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

#ifndef PARSER_H
#define PARSER_H

#include "catalog.h"
#include "ebook.h"

#include <QXmlStreamReader>

namespace Gutenberg
{

class Parser
{

public:
    static Catalog parse(const QString &filename);

private:
    enum SubjectCategory {
        Subject_Null,
        Subject_LCC,
        Subject_LCSH
    };
    Parser();

    void parseStartElement(QXmlStreamReader *xml);
    Gutenberg::Ebook parseEtext(QXmlStreamReader *xml);
    Gutenberg::File parseFile(QXmlStreamReader *xml);

    QString parsePublisher(QXmlStreamReader *xml);
    QString parseTitle(QXmlStreamReader *xml);
    QStringList parseCreator(QXmlStreamReader *xml);
    QStringList parseContributor(QXmlStreamReader *xml);
    QString parseFriendlyTitle(QXmlStreamReader *xml);
    QStringList parseLanguage(QXmlStreamReader *xml);
    QStringList parseSubject(QXmlStreamReader *xml,
                             SubjectCategory *foundCategory);
    QString parseCreated(QXmlStreamReader *xml);
    QString parseRights(QXmlStreamReader *xml);
    QStringList parseDescription(QXmlStreamReader *xml);
    QString parseEtextType(QXmlStreamReader *xml);
    QStringList parseEtextAlternative(QXmlStreamReader *xml);
    QString parseEtextTOC(QXmlStreamReader *xml);
    QString parseDownloads(QXmlStreamReader *xml);

    void parseBag(QXmlStreamReader *xml);

    QString parseFileFormat(QXmlStreamReader *xml);
    QString parseFileExtent(QXmlStreamReader *xml);
    QString parseFileModified(QXmlStreamReader *xml);
    QString parseFileIsFormatOf(QXmlStreamReader *xml);

    QStringList parseBag(QXmlStreamReader *xml,
                         const QStringList &tags);
    QStringList parseStartedBag(QXmlStreamReader *xml,
                                const QStringList &tags,
                                int starterTagIdx);
    QString parseTextBetweenTags(QXmlStreamReader *xml,
                                 const QStringList &tags);

    QXmlStreamReader::TokenType readNextElement(QXmlStreamReader *xml);

private:
    Catalog m_currentCatalog;
};

}
#endif

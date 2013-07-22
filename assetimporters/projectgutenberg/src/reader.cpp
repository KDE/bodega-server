/*
    Copyright 2013 Coherent Theory LLC

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

#include <QtCore>

namespace Reader
{

void ignoreBlock(QXmlStreamReader &xml)
{
    while (!xml.atEnd()) {
        switch (xml.readNext()) {
            case QXmlStreamReader::StartElement:
                ignoreBlock(xml);
                break;

            case QXmlStreamReader::EndElement:
                return;
                break;

            default:
                break;
        }
    }
}

void parseSubject(QXmlStreamReader &xml, Gutenberg::Ebook &book)
{
    QStringList subjects;
    bool lcc = false;

    while (!xml.atEnd()) {
        QXmlStreamReader::TokenType token = xml.readNext();
        const QString elem = xml.name().toString();
        //qDebug() << "subject block..." << elem;

        switch (token) {
            case QXmlStreamReader::StartElement:
                if (QString::fromLatin1("value") == elem) {
                    xml.readNext();
                    subjects << xml.text().toString();
                    xml.readNext();
                } else if (QString::fromLatin1("memberOf") == elem) {
                    lcc = xml.attributes().value("rdf:resource").endsWith("LCC");
                    xml.readNext();
                } else if (QString::fromLatin1("Description") != elem) {
                    ignoreBlock(xml);
                }
                break;

            case QXmlStreamReader::EndElement:
                if (QString::fromLatin1("subject") == elem) {
                    if (!subjects.isEmpty()) {
                        if (lcc) {
                            book.setCategories(subjects);
                        } else {
                            book.setSubjects(subjects);
                        }
                        //qDebug() << "subject found:" << lcc << subjects;
                    }
                    return;
                }
                break;

            default:
                break;
        }

    }
}

void parseEbookBlock(QXmlStreamReader &xml, Gutenberg::Ebook &book)
{
    QXmlStreamAttributes attrs = xml.attributes();
    Q_ASSERT(attrs.hasAttribute("rdf:about"));

    QString id = attrs.value("rdf:about").toString();
    int slash = id.indexOf('/');
    if (slash != -1) {
        id = id.right(id.count() - slash - 1);
    }
    book.setBookId(id);

    while (!xml.atEnd()) {
        switch (xml.readNext()) {
            case QXmlStreamReader::StartElement: {
                const QString elem = xml.name().toString();
                //qDebug() << "    " << elem;
                if (QString::fromLatin1("title") == elem) {
                    //qDebug() << "found the title!";
                    xml.readNext();
                    book.setTitle(xml.text().toString());
                    xml.readNext();
                } else if (QString::fromLatin1("issued") == elem) {
                    xml.readNext();
                    book.setIssued(xml.text().toString());
                    xml.readNext();
                } else if (QString::fromLatin1("subject") == elem) {
                    parseSubject(xml, book);
                } else {
                    ignoreBlock(xml);
                }
                break;
            }

            case QXmlStreamReader::Characters:
                //qDebug() << "got:" << xml.text();
                break;

            case QXmlStreamReader::EndElement:
                //qDebug() << "END!" << xml.name();
                return;
                break;

            default:
                break;
        }
    }
}

void parseFileBlock(QXmlStreamReader &xml, Gutenberg::Ebook &book)
{
    Gutenberg::File file;
    QXmlStreamAttributes attrs = xml.attributes();
    Q_ASSERT(attrs.hasAttribute("rdf:about"));

    file.url = (attrs.value("rdf:about").toString());

    while (!xml.atEnd()) {
        switch (xml.readNext()) {
            case QXmlStreamReader::StartElement: {
                const QString elem = xml.name().toString();
                if (QString::fromLatin1("format") == elem) {
                    while (!xml.atEnd())  {
                        QXmlStreamReader::TokenType token = xml.readNext();
                        //qDebug() << "PARSING FILE BLOCK WITH" << xml.name();
                        if (token == QXmlStreamReader::EndElement) {
                            if (QString::fromLatin1("format") == xml.name()) {
                                break;
                            }
                        } else if (token == QXmlStreamReader::StartElement) {
                            if (QString::fromLatin1("value") == xml.name()) {
                                xml.readNext();
                                file.format = xml.text().toString();
                                if (file.format == QString::fromLatin1("application/zip")) {
                                    // this is a compressed version
                                    // there will an uncompressed version, too, just stick to those
                                    // but otherwise parse this block as normal
                                    file.url.clear();
                                }
                            }
                        }
                    }
                } else if (QString::fromLatin1("modified") == elem) {
                    xml.readNext();
                    file.modified = xml.text().toString();
                    xml.readNext();
                    //qDebug() << "found the modification" << file.modified;
                } else if (QString::fromLatin1("extent") == elem) {
                    xml.readNext();
                    file.extent = xml.text().toString();
                    xml.readNext();
                    //qDebug() << "found the extent" << file.extent;
                } else {
                    ignoreBlock(xml);
                }
                break;
            }

            case QXmlStreamReader::EndElement:
                //qDebug() << "ending with" << xml.name();
                if (!file.url.isEmpty()) {
                    book.addFile(file);
                }
                return;
                break;

            default:
                break;
        }
    }
}

Gutenberg::Ebook parseRdf(const QString &path)
{
#ifdef TESTING
    qDebug() << path;
#endif

    QFile file(path);

    Gutenberg::Ebook book;
    if (file.open(QIODevice::ReadOnly)) {
        QXmlStreamReader xml(&file);
        while (!xml.atEnd()) {
            switch (xml.readNext()) {
                case QXmlStreamReader::StartElement: {
                    const QString elem = xml.name().toString();
                    //qDebug() << "starting element:" << elem;
                    if (QString::fromLatin1("ebook") == elem) {
                        parseEbookBlock(xml, book);
                    } else if (QString::fromLatin1("file") == elem) {
                        //qDebug() << "FILE BLOCK!";
                        parseFileBlock(xml, book);
                    } else if (QString::fromLatin1("RDF") != elem) {
                        //qDebug() << "ignoring" << elem;
                        ignoreBlock(xml);
                    }
                }
                    break;
                default:
                    break;
            }
        }
    }

    return book;
}

} //namespace Reader


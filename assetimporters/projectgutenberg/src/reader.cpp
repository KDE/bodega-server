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

namespace Gutenberg
{

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

    const QString valueTag(QLatin1String("value"));
    const QString memberTag(QLatin1String("memberOf"));
    const QString resTag(QLatin1String("rdf:resource"));
    const QString descriptionTag(QLatin1String("Description"));
    const QString subjectTag(QLatin1String("subject"));
    while (!xml.atEnd()) {
        QXmlStreamReader::TokenType token = xml.readNext();
        const QStringRef elem = xml.name();
        //qDebug() << "subject block..." << elem;

        switch (token) {
            case QXmlStreamReader::StartElement:
                if (valueTag == elem) {
                    xml.readNext();
                    subjects << xml.text().toString();
                    xml.readNext();
                } else if (memberTag == elem) {
                    lcc = xml.attributes().value(resTag).endsWith("LCC");
                    xml.readNext();
                } else if (descriptionTag != elem) {
                    ignoreBlock(xml);
                }
                break;

            case QXmlStreamReader::EndElement:
                if (subjectTag == elem) {
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

    const QString title(QLatin1String("title"));
    const QString issued(QLatin1String("issued"));
    const QString subject(QLatin1String("subject"));
    const QString coverImage(QLatin1String("marc901")); // don't ask
    while (!xml.atEnd()) {
        switch (xml.readNext()) {
            case QXmlStreamReader::StartElement: {
                const QStringRef elem = xml.name();
                //qDebug() << "    " << elem;
                if (title == elem) {
                    qDebug() << "found the title!";
                    xml.readNext();
                    book.setTitle(xml.text().toString());
                    xml.readNext();
                } else if (issued == elem) {
                    xml.readNext();
                    book.setIssued(xml.text().toString());
                    xml.readNext();
                } else if (subject == elem) {
                    parseSubject(xml, book);
                } else if (coverImage == elem) {
                    xml.readNext();
                    QString url = xml.text().toString();
                    // some of the files have local(!) paths
                    url.replace("file:///public/vhost/g/gutenberg/html/",
                                "http://www.gutenberg.org/");
                    book.setCoverImage(xml.text().toString());
                    xml.readNext();
                } else {
                    ignoreBlock(xml);
                }
                break;
            }

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

    const QString formatTag(QLatin1String("format"));
    const QString valueTag(QLatin1String("value"));
    const QString zipMimetype(QLatin1String("application/zip"));
    const QString modifiedTag(QLatin1String("modified"));
    const QString extentTag(QLatin1String("extent"));
    while (!xml.atEnd()) {
        switch (xml.readNext()) {
            case QXmlStreamReader::StartElement: {
                const QStringRef elem = xml.name();
                if (formatTag == elem) {
                    while (!xml.atEnd())  {
                        QXmlStreamReader::TokenType token = xml.readNext();
                        //qDebug() << "PARSING FILE BLOCK WITH" << xml.name();
                        if (token == QXmlStreamReader::EndElement) {
                            if (formatTag == xml.name()) {
                                break;
                            }
                        } else if (token == QXmlStreamReader::StartElement) {
                            if (valueTag == xml.name()) {
                                xml.readNext();
                                file.format = xml.text().toString();
                                if (file.format == zipMimetype) {
                                    // this is a compressed version
                                    // there will an uncompressed version, too, just stick to those
                                    // but otherwise parse this block as normal
                                    file.url.clear();
                                }
                            }
                        }
                    }
                } else if (modifiedTag == elem) {
                    xml.readNext();
                    file.modified = xml.text().toString();
                    xml.readNext();
                    //qDebug() << "found the modification" << file.modified;
                } else if (extentTag == elem) {
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
        const QString ebookTag(QLatin1String("ebook"));
        const QString fileTag(QLatin1String("file"));
        const QString openingTag(QLatin1String("RDF"));
        while (!xml.atEnd()) {
            switch (xml.readNext()) {
                case QXmlStreamReader::StartElement: {
                    const QStringRef elem = xml.name();
                    //qDebug() << "starting element:" << elem;
                    if (ebookTag == elem) {
                        //qDebug() << "EBOOK BLOCK";
                        parseEbookBlock(xml, book);
                    } else if (fileTag == elem) {
                        //qDebug() << "FILE BLOCK!";
                        parseFileBlock(xml, book);
                    } else if (openingTag != elem) {
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

} // namespace Gutenberg


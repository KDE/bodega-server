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

struct ReaderState
{
    QFile file;
    QXmlStreamReader xml;
    Ebook book;
};

void ignoreBlock(ReaderState &state)
{
    while (!state.xml.atEnd()) {
        switch (state.xml.readNext()) {
            case QXmlStreamReader::StartElement:
                ignoreBlock(state);
                break;

            case QXmlStreamReader::EndElement:
                return;
                break;

            default:
                break;
        }
    }
}

void parseSubject(ReaderState &state)
{
    QStringList subjects;
    bool lcc = false;

    static const QString valueTag(QLatin1String("value"));
    static const QString memberTag(QLatin1String("memberOf"));
    static const QString resTag(QLatin1String("rdf:resource"));
    static const QString descriptionTag(QLatin1String("Description"));
    static const QString subjectTag(QLatin1String("subject"));
    while (!state.xml.atEnd()) {
        QXmlStreamReader::TokenType token = state.xml.readNext();
        const QStringRef elem = state.xml.name();
        //qDebug() << "subject block..." << elem;

        switch (token) {
            case QXmlStreamReader::StartElement:
                if (valueTag == elem) {
                    state.xml.readNext();
                    subjects << state.xml.text().toString();
                    state.xml.readNext();
                } else if (memberTag == elem) {
                    lcc = state.xml.attributes().value(resTag).endsWith("LCC");
                    state.xml.readNext();
                } else if (descriptionTag != elem) {
                    ignoreBlock(state);
                }
                break;

            case QXmlStreamReader::EndElement:
                if (subjectTag == elem) {
                    if (!subjects.isEmpty()) {
                        if (lcc) {
                            state.book.setCategories(subjects);
                        } else {
                            state.book.setSubjects(subjects);
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

QHash<QString, Ebook::Type> ebookTypes;
Ebook::Type parseEbookType(ReaderState &state)
{
    if (ebookTypes.isEmpty()) {
        ebookTypes.insert(QString(), Ebook::Type_Book);
        ebookTypes.insert(QString::fromLatin1("Text"), Ebook::Type_Book);
        ebookTypes.insert(QString::fromLatin1("Sound"), Ebook::Type_AudioBook);
        ebookTypes.insert(QString::fromLatin1("Collection"), Ebook::Type_Compilations);
        ebookTypes.insert(QString::fromLatin1("Image"), Ebook::Type_PicturesStill);
        ebookTypes.insert(QString::fromLatin1("StillImage"), Ebook::Type_PicturesStill);
        ebookTypes.insert(QString::fromLatin1("MovingImage"), Ebook::Type_PicturesMoving);
        ebookTypes.insert(QString::fromLatin1("Dataset"), Ebook::Type_Data);
    }

    Ebook::Type t = ebookTypes.value(state.xml.text().toString());
    if (t == Ebook::Type_Unknown) {
        qDebug() << "Unknown ebook type =" << state.xml.text() << "in file" << state.file.fileName();
        Q_ASSERT(!"unknown ebook type");
    }

    return Ebook::Type_Book;
}

void parseType(ReaderState &state)
{
    QStringList subjects;
    bool lcc = false;

    static const QString typeTag(QLatin1String("type"));
    static const QString valueTag(QLatin1String("value"));
    static const QString descriptionTag(QLatin1String("Description"));
    static const QString subjectTag(QLatin1String("subject"));
    while (!state.xml.atEnd()) {
        QXmlStreamReader::TokenType token = state.xml.readNext();
        const QStringRef elem = state.xml.name();
        //qDebug() << "subject block..." << elem;

        switch (token) {
            case QXmlStreamReader::StartElement:
                if (valueTag == elem) {
                    state.xml.readNext();
                    state.book.setType(parseEbookType(state));
                    state.xml.readNext();
                } else if (descriptionTag != elem) {
                    ignoreBlock(state);
                }
                break;

            case QXmlStreamReader::EndElement:
                if (typeTag == elem) {
                    return;
                }
                break;

            default:
                break;
        }

    }
}

void parseLangauges(ReaderState &state)
{
    QStringList langs;
    bool hasBag = false;

    static const QString langTag(QLatin1String("language"));
    static const QString bagTag(QLatin1String("Bag"));
    static const QString itemTag(QLatin1String("li"));
    while (!state.xml.atEnd()) {
        QXmlStreamReader::TokenType token = state.xml.readNext();
        const QStringRef elem = state.xml.name();
        //qDebug() << "subject block..." << elem;

        switch (token) {
            case QXmlStreamReader::StartElement:
                if (bagTag == elem) {
                    hasBag = true;
                } else if (itemTag == elem) {
                    state.xml.readNext();
                    langs << state.xml.text().toString();
                    state.xml.readNext();
                } else {
                    ignoreBlock(state);
                }
                break;

            case QXmlStreamReader::Characters:
                if (!hasBag) {
                    langs << state.xml.text().toString();
                }
                break;

            case QXmlStreamReader::EndElement:
                if (langTag == elem) {
                    state.book.setLanguages(langs);
                    return;
                }
                break;

            default:
                break;
        }

    }
}

void parseEbookBlock(ReaderState &state)
{
    QXmlStreamAttributes attrs = state.xml.attributes();
    Q_ASSERT(attrs.hasAttribute("rdf:about"));

    QString id = attrs.value("rdf:about").toString();
    int slash = id.indexOf('/');
    if (slash != -1) {
        id = id.right(id.count() - slash - 1);
    }
    state.book.setBookId(id);

    static const QString titleTag(QLatin1String("title"));
    static const QString issuedTag(QLatin1String("issued"));
    static const QString subjectTag(QLatin1String("subject"));
    static const QString coverImageTag(QLatin1String("marc901")); // don't ask
    static const QString typeTag(QLatin1String("type"));
    static const QString langTag(QLatin1String("language"));
    static const QString descriptionTag(QLatin1String("description"));
    static const QString alternativeTag(QLatin1String("alternative"));
    static const QString tocTag(QLatin1String("tableOfContents"));
    static const QString rightsTag(QLatin1String("rights"));
    while (!state.xml.atEnd()) {
        switch (state.xml.readNext()) {
            case QXmlStreamReader::StartElement: {
                const QStringRef elem = state.xml.name();
                //qDebug() << "    " << elem;
                if (titleTag == elem) {
                    //qDebug() << "found the title!";
                    state.xml.readNext();
                    state.book.setTitle(state.xml.text().toString());
                    state.xml.readNext();
                } else if (issuedTag == elem) {
                    state.xml.readNext();
                    state.book.setIssued(state.xml.text().toString());
                    state.xml.readNext();
                } else if (subjectTag == elem) {
                    parseSubject(state);
                } else if (coverImageTag == elem) {
                    state.xml.readNext();
                    QString url = state.xml.text().toString();
                    // some of the files have local(!) paths
                    url.replace("file:///public/vhost/g/gutenberg/html/",
                                "http://www.gutenberg.org/");
                    state.book.setCoverImage(state.xml.text().toString());
                    state.xml.readNext();
                } else if (typeTag == elem) {
                    parseType(state);
                } else if (langTag == elem) {
                    parseLangauges(state);
                } else if (descriptionTag == elem) {
                    state.xml.readNext();
                    state.book.setDescription(state.xml.text().toString());
                    state.xml.readNext();
                } else if (alternativeTag == elem) {
                    state.xml.readNext();
                    state.book.addAlternativeName(state.xml.text().toString());
                    state.xml.readNext();
                } else if (tocTag == elem) {
                    state.xml.readNext();
                    QString toc = state.xml.text().toString();
                    toc.replace(" -- ", "\n");
                    state.book.setTableOfContents(toc);
                    state.xml.readNext();
                } else if (rightsTag == elem) {
                    state.xml.readNext();
                    // hackish, but this is the only string that appears in the entire catalog
                    // so it is safe to do this .. for now! *dum* *dum* *DUUUM*!
                    static const QString crText(QLatin1String("Copyrighted. Read the copyright notice inside this book for details."));
                    state.book.setRights(state.xml.text().compare(crText) == 0 ?
                                             Ebook::Rights_Copyrighted :
                                             Ebook::Rights_Gutenberg);
                    state.xml.readNext();
                } else {
                    ignoreBlock(state);
                }
                break;
            }

            case QXmlStreamReader::EndElement:
                //qDebug() << "END!" << state.xml.name();
                return;
                break;


            default:
                break;
        }
    }
}

void parseFileBlock(ReaderState &state)
{
    Gutenberg::File file;
    QXmlStreamAttributes attrs = state.xml.attributes();
    Q_ASSERT(attrs.hasAttribute("rdf:about"));

    file.url = (attrs.value("rdf:about").toString());

    static const QString formatTag(QLatin1String("format"));
    static const QString valueTag(QLatin1String("value"));
    static const QString zipMimetype(QLatin1String("application/zip"));
    static const QString modifiedTag(QLatin1String("modified"));
    static const QString extentTag(QLatin1String("extent"));
    while (!state.xml.atEnd()) {
        switch (state.xml.readNext()) {
            case QXmlStreamReader::StartElement: {
                const QStringRef elem = state.xml.name();
                if (formatTag == elem) {
                    while (!state.xml.atEnd())  {
                        QXmlStreamReader::TokenType token = state.xml.readNext();
                        //qDebug() << "PARSING FILE BLOCK WITH" << state.xml.name();
                        if (token == QXmlStreamReader::EndElement) {
                            if (formatTag == state.xml.name()) {
                                break;
                            }
                        } else if (token == QXmlStreamReader::StartElement) {
                            if (valueTag == state.xml.name()) {
                                state.xml.readNext();
                                file.format = state.xml.text().toString();
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
                    state.xml.readNext();
                    file.modified = state.xml.text().toString();
                    state.xml.readNext();
                    //qDebug() << "found the modification" << file.modified;
                } else if (extentTag == elem) {
                    state.xml.readNext();
                    file.extent = state.xml.text().toString();
                    state.xml.readNext();
                    //qDebug() << "found the extent" << file.extent;
                } else {
                    ignoreBlock(state);
                }
                break;
            }

            case QXmlStreamReader::EndElement:
                //qDebug() << "ending with" << state.xml.name();
                if (!file.url.isEmpty()) {
                    state.book.addFile(file);
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

    static const QString ebookTag(QLatin1String("ebook"));
    static const QString fileTag(QLatin1String("file"));
    static const QString openingTag(QLatin1String("RDF"));

    ReaderState state;
    state.file.setFileName(path);
    Gutenberg::Ebook book;

    if (state.file.open(QIODevice::ReadOnly)) {
        state.xml.setDevice(&state.file);
        while (!state.xml.atEnd()) {
            switch (state.xml.readNext()) {
                case QXmlStreamReader::StartElement: {
                    const QStringRef elem = state.xml.name();
                    //qDebug() << "starting element:" << elem;
                    if (ebookTag == elem) {
                        //qDebug() << "EBOOK BLOCK";
                        parseEbookBlock(state);
                    } else if (fileTag == elem) {
                        //qDebug() << "FILE BLOCK!";
                        parseFileBlock(state);
                    } else if (openingTag != elem) {
                        //qDebug() << "ignoring" << elem;
                        ignoreBlock(state);
                    }
                }
                    break;
                default:
                    break;
            }
        }
    }

    return state.book;
}

} //namespace Reader

} // namespace Gutenberg


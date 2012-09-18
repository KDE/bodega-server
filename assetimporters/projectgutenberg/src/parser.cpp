#include "parser.h"

#include "lcc.h"

#include <QDebug>
#include <QFile>
#include <QStringList>
#include <QXmlStreamReader>

using namespace Gutenberg;

static Ebook::Type
parseEbookType(const QString &str)
{
    if (str.isEmpty()) {
        return Ebook::Type_Book;
    } else if (str == QLatin1String("Other recordings")) {
        return Ebook::Type_OtherRecordings;
    } else if (str == QLatin1String("Audio Book, human-read")) {
        return Ebook::Type_AudioBookHumanRead;
    } else if (str == QLatin1String("Pictures, still")) {
        return Ebook::Type_PicturesStill;
    } else if (str == QLatin1String("Compilations")) {
        return Ebook::Type_Compilations;
    } else if (str == QLatin1String("Pictures, moving")) {
        return Ebook::Type_PicturesMoving;
    } else if (str == QLatin1String("Data")) {
        return Ebook::Type_Data;
    } else if (str == QLatin1String("Music, recorded")) {
        return Ebook::Type_MusicRecorded;
    } else if (str == QLatin1String("Audio Book, computer-generated")) {
        return Ebook::Type_AudioBookComputerGenerated;
    } else if (str == QLatin1String("Music, Sheet")) {
        return Ebook::Type_MusicSheet;
    } else {
        qDebug()<<"Unknown ebook type = "<<str;
        Q_ASSERT(!"unknown ebook type");
        return Ebook::Type_Book;
    }
}

static Ebook::Rights
parseEbookRights(const QString &str)
{
    if (str == QLatin1String("http://www.gutenberg.org/license")) {
        return Ebook::Rights_Gutenberg;
    } else if (str == QLatin1String("Copyrighted work. See license inside work.")) {
        return Ebook::Rights_Copyrighted;
    } else {
        qDebug()<<"Unkown ebook rights: "<<str;
        return Ebook::Rights_Copyrighted;
    }
}

Parser::Parser()
{
}

QString Parser::parsePublisher(QXmlStreamReader *xml)
{
    QXmlStreamReader::TokenType token;

    token = xml->readNext();
    if (token == QXmlStreamReader::Characters) {
        QString text = xml->text().toString();

        token = xml->readNext();
        if (token == QXmlStreamReader::EndElement) {
            return text;
        } else {
            qDebug()<< "Unexpected publisher end token: "<<token;
        }
    } else {
        qDebug()<< "Unexpected publisher characters token: "<< token;
    }
    return QString();
}

QString Parser::parseTitle(QXmlStreamReader *xml)
{
    QXmlStreamReader::TokenType token;

    token = xml->readNext();
    if (token == QXmlStreamReader::Characters) {
        QString text = xml->text().toString();

        token = xml->readNext();
        if (token == QXmlStreamReader::EndElement) {
            return text.simplified();
        } else {
            qDebug()<< "Unexpected title end token: "<<token;
        }
    } else {
        qDebug()<< "Unexpected title characters token: "<< token;
    }
    return QString();
}

QStringList Parser::parseCreator(QXmlStreamReader *xml)
{
    QXmlStreamReader::TokenType token;

    QStringList creators;

    token = xml->readNext();

    while (xml->isWhitespace()) {
        token = xml->readNext();
    }
    if (token == QXmlStreamReader::Characters) {
        creators += xml->text().toString();
    } else if (token == QXmlStreamReader::StartElement) {
        QString elemName = xml->name().toString();

        if (elemName == QLatin1String("Bag")) {
            creators = parseBag(xml,
                                QStringList() << QLatin1String("li"));
        } else {
            qDebug()<< "Unexpected creator elem: "<< elemName
                    <<", token "<<token;
        }
    } else {
        qDebug()<< "Unexpected creator characters token: "<< token;
        return QStringList();
    }

    token = xml->readNext();
    while (xml->isWhitespace()) {
        token = xml->readNext();
    }

    //qDebug()<< "parsed "<<creators;
    Q_ASSERT(token == QXmlStreamReader::EndElement);
    Q_ASSERT(!creators.isEmpty());
    return creators;
}

QStringList Parser::parseContributor(QXmlStreamReader *xml)
{
    QXmlStreamReader::TokenType token;

    QStringList contribs;

    token = xml->readNext();

    while (xml->isWhitespace()) {
        token = xml->readNext();
    }
    if (token == QXmlStreamReader::Characters) {
        contribs += xml->text().toString();
    } else if (token == QXmlStreamReader::StartElement) {
        QString elemName = xml->name().toString();

        if (elemName == QLatin1String("Bag")) {
            contribs = parseBag(xml,
                                QStringList() << QLatin1String("li"));
        } else {
            qDebug()<< "Unexpected contribs elem: "<< elemName
                    <<", token "<<token;
        }
    } else {
        qDebug()<< "Unexpected contribs characters token: "<< token;
        return QStringList();
    }

    token = xml->readNext();
    while (xml->isWhitespace()) {
        token = xml->readNext();
    }

    //qDebug()<< "parsed "<<contribs;
    Q_ASSERT(token == QXmlStreamReader::EndElement);
    Q_ASSERT(!contribs.isEmpty());
    return contribs;
}

QString Parser::parseFriendlyTitle(QXmlStreamReader *xml)
{
    QXmlStreamReader::TokenType token;

    token = xml->readNext();
    if (token == QXmlStreamReader::Characters) {
        QString text = xml->text().toString();

        token = xml->readNext();
        if (token == QXmlStreamReader::EndElement) {
            return text;
        } else {
            qDebug()<< "Unexpected friendlyTitle end token: "<<token;
        }
    } else if (token == QXmlStreamReader::EndElement) {
        //empty friendly title
        return QString();
    } else {
        qDebug()<< "Unexpected friendlyTitle characters token: "
                << token << ", "<<xml->lineNumber();
    }
    return QString();
}

QStringList Parser::parseLanguage(QXmlStreamReader *xml)
{
    QXmlStreamReader::TokenType token;

    QStringList languages;

    token = xml->readNext();
    while (xml->isWhitespace()) {
        token = xml->readNext();
    }
    if (token == QXmlStreamReader::StartElement) {
        QString elemName = xml->name().toString();

        if (elemName == QLatin1String("Bag")) {
            languages = parseBag(
                xml,
                QStringList() << QLatin1String("li")
                << QLatin1String("ISO639-2")
                << QLatin1String("value"));
        } else if (elemName == QLatin1String("ISO639-2")) {
            languages += parseTextBetweenTags(xml,
                                              QStringList()
                                              << QLatin1String("ISO639-2")
                                              << QLatin1String("value"));
        } else {
            qDebug()<< "Unexpected language elem: "<< elemName
                    <<", token "<<token;
        }
    } else {
        qDebug()<< "Unexpected language token: "<< token;
        return QStringList();
    }

    token = xml->readNext();
    while (xml->isWhitespace()) {
        token = xml->readNext();
    }

    //qDebug()<< "parsed "<<languages;
    Q_ASSERT(token == QXmlStreamReader::EndElement);
    Q_ASSERT(!languages.isEmpty());
    return languages;
}

QStringList Parser::parseSubject(QXmlStreamReader *xml,
                                 SubjectCategory *foundCategory)
{
    *foundCategory = Subject_Null;

    QStringList subjects;

    QXmlStreamReader::TokenType token = readNextElement(xml);
    if (token == QXmlStreamReader::StartElement) {
        QString elemName = xml->name().toString();

        if (elemName == QLatin1String("Bag")) {
            readNextElement(xml);
            Q_ASSERT(xml->tokenType() == QXmlStreamReader::StartElement);
            Q_ASSERT(xml->name() == QLatin1String("li"));
            readNextElement(xml);
            Q_ASSERT(xml->tokenType() == QXmlStreamReader::StartElement);
            Q_ASSERT(xml->name() == QLatin1String("LCC") ||
                     xml->name() == QLatin1String("LCSH"));
            if (xml->name() == QLatin1String("LCC")) {
                *foundCategory = Subject_LCC;
                subjects += parseStartedBag(xml,
                                            QStringList()
                                            << "li"
                                            << "LCC"
                                            << "value",
                                            1);
            } else {
                *foundCategory = Subject_LCSH;
                subjects += parseStartedBag(xml,
                                            QStringList()
                                            << "li"
                                            << "LCSH"
                                            << "value",
                                            1);
            }
        } else if (elemName == QLatin1String("LCC")) {
            *foundCategory = Subject_LCC;
            subjects += parseTextBetweenTags(xml,
                                              QStringList()
                                              << QLatin1String("LCC")
                                              << QLatin1String("value"));
        } else if (elemName == QLatin1String("LCSH")) {
            *foundCategory = Subject_LCSH;
            subjects += parseTextBetweenTags(xml,
                                              QStringList()
                                              << QLatin1String("LCSH")
                                              << QLatin1String("value"));
        } else {
            qDebug()<< "Unexpected language elem: "<< elemName
                    <<", token "<<token;
        }
    } else {
        qDebug()<< "Unexpected language token: "<< token;
        return QStringList();
    }

    readNextElement(xml);

    /*qDebug()<< "parsed "<<subjects;
    qDebug()<<"after = "<<xml->name().toString()
    <<", line = "<<xml->lineNumber();*/
    Q_ASSERT(xml->tokenType() == QXmlStreamReader::EndElement);
    Q_ASSERT(!subjects.isEmpty());
    Q_ASSERT(*foundCategory != Subject_Null);

    return subjects;
}

QString Parser::parseCreated(QXmlStreamReader *xml)
{
    QStringList created;

    created += parseTextBetweenTags(xml,
                                    QStringList()
                                    << QLatin1String("W3CDTF")
                                    << QLatin1String("value"));

    readNextElement(xml);
    Q_ASSERT(xml->tokenType() == QXmlStreamReader::EndElement);
    Q_ASSERT(created.count() == 1);
    Q_ASSERT(xml->name() == QLatin1String("created"));

    return created[0];
}

QString Parser::parseRights(QXmlStreamReader *xml)
{
    QXmlStreamAttributes attrs = xml->attributes();

    if (attrs.hasAttribute("rdf:resource")) {
        readNextElement(xml);
        Q_ASSERT(xml->tokenType() == QXmlStreamReader::EndElement);
        Q_ASSERT(xml->name() == QLatin1String("rights"));

        return attrs.value("rdf:resource").toString();
    } else {
        QString	license = xml->readElementText();
        //qDebug()<< "license is "<<license;
        return license;
    }
}

QStringList Parser::parseDescription(QXmlStreamReader *xml)
{
    QXmlStreamAttributes attrs = xml->attributes();
    if (attrs.hasAttribute("rdf:parseType")) {
        Q_ASSERT(attrs.value("rdf:parseType") == QLatin1String("Literal"));
        QStringList lst;
        lst += xml->readElementText();
        return lst;
    } else {
        readNextElement(xml);

        Q_ASSERT(xml->tokenType() == QXmlStreamReader::StartElement);
        Q_ASSERT(xml->name() == QLatin1String("Bag"));

        QStringList lst =
            parseBag(xml,
                     QStringList() << QLatin1String("li"));
        readNextElement(xml);
        Q_ASSERT(xml->tokenType() == QXmlStreamReader::EndElement);
        return lst;
    }

}

QString Parser::parseEtextType(QXmlStreamReader *xml)
{
    QStringList types;

    types += parseTextBetweenTags(xml,
                                    QStringList()
                                    << QLatin1String("category")
                                    << QLatin1String("value"));

    readNextElement(xml);
    Q_ASSERT(xml->tokenType() == QXmlStreamReader::EndElement);
    Q_ASSERT(types.count() == 1);
    Q_ASSERT(xml->name() == QLatin1String("type"));

    return types[0];
}

QStringList Parser::parseEtextAlternative(QXmlStreamReader *xml)
{
    QXmlStreamAttributes attrs = xml->attributes();
    if (attrs.hasAttribute("rdf:parseType")) {
        Q_ASSERT(attrs.value("rdf:parseType") == QLatin1String("Literal"));
        QStringList lst;
        lst += xml->readElementText();
        return lst;
    } else {
        readNextElement(xml);

        Q_ASSERT(xml->tokenType() == QXmlStreamReader::StartElement);
        Q_ASSERT(xml->name() == QLatin1String("Bag"));

        QStringList lst =
            parseBag(xml,
                     QStringList() << QLatin1String("li"));
        readNextElement(xml);
        Q_ASSERT(xml->tokenType() == QXmlStreamReader::EndElement);
        return lst;
    }
}

QString Parser::parseEtextTOC(QXmlStreamReader *xml)
{
      QXmlStreamAttributes attrs = xml->attributes();
      Q_ASSERT(attrs.hasAttribute("rdf:parseType"));
      Q_ASSERT(attrs.value("rdf:parseType") == QLatin1String("Literal"));

      return xml->readElementText();
}

QStringList Parser::parseStartedBag(QXmlStreamReader *xml,
                                    const QStringList &tags,
                                    int starterTagIdx)
{
    Q_ASSERT(xml->tokenType() == QXmlStreamReader::StartElement);
    Q_ASSERT(xml->name() == tags[starterTagIdx]);
    Q_ASSERT(starterTagIdx < tags.count());

    QStringList starterTags;
    for (int i = starterTagIdx; i < tags.count(); ++i) {
        starterTags.append(tags[i]);
    }

    QStringList strings;
    strings += parseTextBetweenTags(xml, starterTags);

    // +1 for the actual ending tag
    for (int i = 0; i < starterTagIdx + 1; ++i) {
        readNextElement(xml);
    }
    if (xml->tokenType() == QXmlStreamReader::EndElement &&
        xml->name() == QLatin1String("Bag")) {
        return strings;
    }

    while (true) {
        strings += parseTextBetweenTags(xml, tags);

        readNextElement(xml);
        if (xml->tokenType() == QXmlStreamReader::EndElement &&
            xml->name() == QLatin1String("Bag")) {
            return strings;
        }
    }
    Q_ASSERT("!should never get here");
    return strings;
}


QString Parser::parseFileFormat(QXmlStreamReader *xml)
{
    QString format = parseTextBetweenTags(xml,
                                          QStringList()
                                          << QLatin1String("format")
                                          << QLatin1String("IMT")
                                          << QLatin1String("value"));

    Q_ASSERT(xml->tokenType() == QXmlStreamReader::EndElement);
    Q_ASSERT(xml->name() == QLatin1String("format"));
    return format;
}

QString Parser::parseFileExtent(QXmlStreamReader *xml)
{
    QString extent = parseTextBetweenTags(xml,
                                          QStringList()
                                          << QLatin1String("extent"));

    Q_ASSERT(xml->tokenType() == QXmlStreamReader::EndElement);
    Q_ASSERT(xml->name() == QLatin1String("extent"));
    return extent;
}

QString Parser::parseFileModified(QXmlStreamReader *xml)
{
    QString modified = parseTextBetweenTags(xml,
                                            QStringList()
                                            << QLatin1String("modified")
                                            << QLatin1String("W3CDTF")
                                            << QLatin1String("value"));

    Q_ASSERT(xml->tokenType() == QXmlStreamReader::EndElement);
    Q_ASSERT(xml->name() == QLatin1String("modified"));
    return modified;
}

QString Parser::parseFileIsFormatOf(QXmlStreamReader *xml)
{
    QXmlStreamAttributes attrs = xml->attributes();
    Q_ASSERT(attrs.hasAttribute("rdf:resource"));
    readNextElement(xml);
    Q_ASSERT(xml->tokenType() == QXmlStreamReader::EndElement);
    Q_ASSERT(xml->name() == QLatin1String("isFormatOf"));
    return attrs.value("rdf:resource").toString();
}

Gutenberg::Ebook Parser::parseEtext(QXmlStreamReader *xml)
{
    Ebook book;

    QXmlStreamAttributes attrs = xml->attributes();
    Q_ASSERT(attrs.hasAttribute("rdf:ID"));

    book.setBookId(attrs.value("rdf:ID").toString());

    while (!xml->atEnd()) {
        //qDebug()<<"file pos = "<<file.pos()<<", size = "<<fileSize;
        switch (xml->readNext()) {
        case QXmlStreamReader::StartElement: {
            QString elemName = xml->name().toString();
            if (elemName == QLatin1String("publisher")) {
                QString publisher = parsePublisher(xml);
                book.setPublisher(publisher);
            } else if (elemName == QLatin1String("title")) {
                QString title = parseTitle(xml);
                book.addTitle(title);
            } else if (elemName == QLatin1String("creator")) {
                QStringList lst = parseCreator(xml);
                book.setCreators(lst);
            } else if (elemName == QLatin1String("contributor")) {
                QStringList lst = parseContributor(xml);
                book.setContributors(lst);
            } else if (elemName == QLatin1String("friendlytitle")) {
                QString title = parseFriendlyTitle(xml);
                book.setFriendlyTitle(title);
            } else if (elemName == QLatin1String("language")) {
                QStringList lst = parseLanguage(xml);
                book.setLanguages(lst);
            } else if (elemName == QLatin1String("subject")) {
                SubjectCategory subject;
                QStringList categories = parseSubject(xml, &subject);
                if (subject == Subject_LCC) {
                    Gutenberg::LCC lcc(categories);
                    book.setLCC(lcc);
                } else if (subject == Subject_LCSH) {
                    book.setLcsh(categories);
                }
            } else if (elemName == QLatin1String("created")) {
                QString date = parseCreated(xml);
                book.setCreated(date);
            } else if (elemName == QLatin1String("rights")) {
                QString rightsStr = parseRights(xml);
                Ebook::Rights rights = parseEbookRights(rightsStr);
                book.setRights(rights);
            } else if (elemName == QLatin1String("description")) {
                QStringList lst = parseDescription(xml);
                book.setDescriptions(lst);
            } else if (elemName == QLatin1String("type")) {
                QString typeStr = parseEtextType(xml);
                Ebook::Type type = parseEbookType(typeStr);
                book.setType(type);
            } else if (elemName == QLatin1String("alternative")) {
                QStringList lst = parseEtextAlternative(xml);
                book.setAlternatives(lst);
            } else if (elemName == QLatin1String("tableOfContents")) {
                QString toc = parseEtextTOC(xml);
                book.setTableOfContents(toc);
            } else {
                qDebug()<<"etext, unkown element "<< elemName;
            }
        }
            break;
        case QXmlStreamReader::EndElement:
            if (xml->name() == QLatin1String("etext")) {
                return book;
            } else {
                qDebug()<<"Unexpected termination at "<<xml->name();
            }
            break;
        default:
            break;
        }
    }
    return book;
}

Gutenberg::File Parser::parseFile(QXmlStreamReader *xml)
{
    File f;

    QXmlStreamAttributes attrs = xml->attributes();
    Q_ASSERT(attrs.hasAttribute("rdf:about"));
    f.url = QUrl(attrs.value("rdf:about").toString());
    //qDebug()<<"url is "<< f.url;
    while (!xml->atEnd()) {
        //qDebug()<<"file pos = "<<file.pos()<<", size = "<<fileSize;
        switch (xml->readNext()) {
        case QXmlStreamReader::StartElement: {
            QString elemName = xml->name().toString();
            if (elemName == QLatin1String("format")) {
                f.format = parseFileFormat(xml);
            } else if (elemName == QLatin1String("extent")) {
                f.extent = parseFileExtent(xml);
            } else if (elemName == QLatin1String("modified")) {
                f.modified = parseFileModified(xml);
            } else if (elemName == QLatin1String("isFormatOf")) {
                QString bookId = parseFileIsFormatOf(xml);
                Q_ASSERT(bookId[0] == '#');
                f.bookId = bookId.mid(1);
            } else {
                qDebug()<<"file, unkown element "<< elemName;
            }
        }
            break;
        case QXmlStreamReader::EndElement:
            if (xml->name() == QLatin1String("file")) {
                return f;
            } else {
                qDebug()<<"Unexpected termination at "<<xml->name();
                Q_ASSERT(!"couldn't find closing file tag");
            }
            break;
        default:
            break;
        }
    }
    return f;
}

void Parser::parseStartElement(QXmlStreamReader *xml)
{
    QString elemName = xml->name().toString();

    if (elemName == QLatin1String("etext")) {
        Ebook book = parseEtext(xml);
        if (!book.titles().isEmpty()) {
            m_currentCatalog.addBook(book);
        }
    } else if (elemName == QLatin1String("file")) {
        File f = parseFile(xml);
        m_currentCatalog.addFile(f);
    } else if (elemName == QLatin1String("RDF")) {
        //xml->skipCurrentElement();
    } else if (elemName == QLatin1String("Work")) {
        xml->skipCurrentElement();
    } else if (elemName == QLatin1String("License")) {
        xml->skipCurrentElement();
    } else if (elemName == QLatin1String("Description")) {
        xml->skipCurrentElement();
    } else {
        qDebug()<<"Unknown element: " <<elemName;
        xml->skipCurrentElement();
    }
}

Catalog Parser::parse(const QString &filename)
{
    QFile file(filename);

    if (!file.exists() ||
        !file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        return Catalog();
    }

    QXmlStreamReader xml(&file);
    Parser parser;

    double fileSize = file.size();
    qint64 lastSizeCheck = 0;
    while (!xml.atEnd()) {
        if ((file.pos() - lastSizeCheck) >=
            0.05 * fileSize) {
            int percent = int(100 * (double(file.pos()) / fileSize));
            qDebug()<< "Parsed "<< percent << "%...";
            lastSizeCheck = file.pos();
        }
        //qDebug()<<"file pos = "<<file.pos()<<", size = "<<fileSize;
        switch (xml.readNext()) {
        case QXmlStreamReader::StartElement:
            parser.parseStartElement(&xml);
            break;
        case QXmlStreamReader::EndElement:
            //endElement(xml.name());
            break;
        case QXmlStreamReader::Characters:
            //characters(xml.text());
            break;
        default:
            break;
        }
    }
    if (xml.hasError()) {
        // do error handling
        qDebug() << "Error: " << xml.errorString()
                 << " : " << xml.characterOffset();
    }

    return parser.m_currentCatalog;
}

QString Parser::parseTextBetweenTags(QXmlStreamReader *xml,
                                     const QStringList &tags)
{
    if (tags.isEmpty()) {
        return QString();
    }

    bool atFirst = false;
    if (xml->tokenType() == QXmlStreamReader::StartElement) {
        QString curElem = xml->name().toString();
        atFirst = (curElem == tags[0]);
    }

    for (int i =  atFirst ? 1 : 0; i < tags.count(); ++i) {
        xml->readNextStartElement();
        Q_ASSERT(xml->name() == tags[i]);
    }

    QString text;
    QXmlStreamReader::TokenType token = xml->readNext();
    if (token == QXmlStreamReader::Characters) {
        text = xml->text().toString();
    } else {
        qDebug()<<"Couldn't find characters data, token = "<<token
                <<", "<<xml->lineNumber()
                <<", "<<xml->name().toString();
    }

    int i = tags.count() - 1;
    while (i >= 0) {
        QXmlStreamReader::TokenType token = xml->readNext();

        Q_ASSERT(token != QXmlStreamReader::StartElement);
        if (token == QXmlStreamReader::EndElement) {
            QString elemName = xml->name().toString();
            if (elemName == tags[i]) {
                --i;
            } else {
                qDebug()<<"Unexpected element "<<elemName;
            }
        }
    }

    return text;
}

QStringList Parser::parseBag(QXmlStreamReader *xml,
                             const QStringList &tags)
{
    Q_ASSERT(xml->tokenType() == QXmlStreamReader::StartElement);
    Q_ASSERT(xml->name() == QLatin1String("Bag"));

    QStringList strings;

    xml->readNextStartElement();
    while (true) {
        strings += parseTextBetweenTags(xml, tags);

        readNextElement(xml);
        if (xml->tokenType() == QXmlStreamReader::EndElement &&
            xml->name() == QLatin1String("Bag")) {
            return strings;
        }
    }
    Q_ASSERT("!should never get here");
    return strings;
}

QXmlStreamReader::TokenType Parser::readNextElement(QXmlStreamReader *xml)
{
    QXmlStreamReader::TokenType token = xml->readNext();
    while (xml->isWhitespace()) {
        token = xml->readNext();
    }
    return token;
}

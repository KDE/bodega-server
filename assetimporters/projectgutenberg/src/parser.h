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

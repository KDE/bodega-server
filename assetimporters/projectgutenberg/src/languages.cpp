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

#include "languages.h"

namespace Gutenberg
{

#include "languages.xml"

Languages::Languages()
{
    static const QString languageTag(QLatin1String("language"));
    QBuffer buf(&languageXML);
    buf.open(QIODevice::ReadOnly);
    QXmlStreamReader xml(&buf);
    while (!xml.atEnd()) {
        switch (xml.readNext()) {
            case QXmlStreamReader::StartElement: {
                 const QStringRef elem = xml.name();
                 if (languageTag == elem) {
                    parseLanguage(xml);
                 }
            }
            break;

            default:
            break;
        }
    }

    QHashIterator<QString, QString> it(m_languages);
    qDebug() << "number of languages" << m_languages.count();
    while (it.hasNext()) {
        it.next();
        qDebug() << it.key() << it.value();
    }
}

QString Languages::name(const QString &code)
{
    QString lang = m_languages.value(code);

    if (lang.isEmpty()) {
        QLocale locale(code);
        if (locale != QLocale::c()) {
            lang = QLocale::languageToString(locale.language());
        }
    }

    return lang;
}

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

void Languages::parseLanguage(QXmlStreamReader &xml)
{
    static const QString nameTag(QLatin1String("name"));
    static const QString codeTag(QLatin1String("code"));
    QString name;
    QString code;

    while (!xml.atEnd()) {
        QXmlStreamReader::TokenType token = xml.readNext();
        const QStringRef elem = xml.name();

        switch (token) {
            case QXmlStreamReader::StartElement:
                if (nameTag == elem) {
                    xml.readNext();
                    name = xml.text().toString();
                    xml.readNext();
                } else if (codeTag == elem) {
                    xml.readNext();
                    code = xml.text().toString();
                    xml.readNext();
                } else {
                    ignoreBlock(xml);
                }
                break;

            case QXmlStreamReader::EndElement:
                if (!name.isEmpty() && !code.isEmpty()) {
                    m_languages.insert(code, name);
                }

                return;
                break;

            default:
                break;
        }
    }
}

} // namespace Gutenberg


import { extractStructuredTextFullSource, type StructuredSourceSection } from './knowledge-extractor'

type XmlNode = { name: string; attributes: Record<string, string>; children: Array<XmlNode | string> }

function decodeXml(value: string) {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/giu, (_, entity: string) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16))
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10))
    return named[entity.toLowerCase()]
  })
}

function localName(name: string) {
  return name.split(':').at(-1)!.toLowerCase()
}

function parseXml(xml: string) {
  if (/<!DOCTYPE|<!ENTITY/iu.test(xml)) throw new Error('KNOWLEDGE_BWB_XML_UNSAFE_DECLARATION')
  const document: XmlNode = { name: '#document', attributes: {}, children: [] }
  const stack = [document]
  for (const token of xml.match(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>|[^<]+/gu) ?? []) {
    if (token.startsWith('<!--') || token.startsWith('<?')) continue
    if (token.startsWith('<![CDATA[')) {
      stack.at(-1)!.children.push(token.slice(9, -3))
      continue
    }
    if (token.startsWith('</')) {
      const closing = localName(token.slice(2, -1).trim())
      if (stack.length === 1 || localName(stack.at(-1)!.name) !== closing) throw new Error('KNOWLEDGE_BWB_XML_MALFORMED')
      stack.pop()
      continue
    }
    if (token.startsWith('<')) {
      const selfClosing = /\/\s*>$/u.test(token)
      const content = token.slice(1, selfClosing ? token.lastIndexOf('/') : -1).trim()
      const name = content.match(/^[^\s]+/u)?.[0]
      if (!name) throw new Error('KNOWLEDGE_BWB_XML_MALFORMED')
      const attributes: Record<string, string> = {}
      for (const match of content.slice(name.length).matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu)) attributes[localName(match[1])] = decodeXml(match[2] ?? match[3] ?? '')
      const node: XmlNode = { name: localName(name), attributes, children: [] }
      stack.at(-1)!.children.push(node)
      if (!selfClosing) stack.push(node)
      continue
    }
    if (token) stack.at(-1)!.children.push(decodeXml(token))
  }
  if (stack.length !== 1) throw new Error('KNOWLEDGE_BWB_XML_MALFORMED')
  return document
}

function childNodes(node: XmlNode, name?: string) {
  return node.children.filter((child): child is XmlNode => typeof child !== 'string' && (!name || child.name === name))
}

function firstChild(node: XmlNode, name: string) {
  return childNodes(node, name)[0]
}

function text(node: XmlNode | undefined): string {
  if (!node || node.name === 'meta-data') return ''
  return node.children.map((child) => typeof child === 'string' ? child : text(child)).join('').normalize('NFKC').replace(/\s+/gu, ' ').trim()
}

function heading(node: XmlNode) {
  const kop = firstChild(node, 'kop')
  return kop ? childNodes(kop).map(text).filter(Boolean).join(' ') : ''
}

function findFirst(node: XmlNode, name: string): XmlNode | undefined {
  if (node.name === name) return node
  for (const child of childNodes(node)) {
    const found = findFirst(child, name)
    if (found) return found
  }
}

function directParagraphs(node: XmlNode) {
  return childNodes(node).filter((child) => ['al', 'alineagroep', 'tussenkop'].includes(child.name)).map(text).filter(Boolean)
}

function listSections(node: XmlNode, path: string[], sections: StructuredSourceSection[]) {
  for (const list of childNodes(node, 'lijst')) {
    for (const item of childNodes(list, 'li')) {
      const marker = text(firstChild(item, 'li.nr')) || String(childNodes(list, 'li').indexOf(item) + 1)
      const itemPath = [...path, `Onderdeel ${marker.replace(/[.)]+$/gu, '')}`]
      const paragraphs = directParagraphs(item)
      if (paragraphs.length) sections.push({ heading: itemPath.join(' > '), paragraphs })
      listSections(item, itemPath, sections)
    }
  }
}

function articleSections(article: XmlNode, ancestors: string[], sections: StructuredSourceSection[]) {
  const articleHeading = heading(article) || article.attributes.label
  if (!articleHeading) throw new Error('KNOWLEDGE_BWB_XML_ARTICLE_HEADING_REQUIRED')
  const articlePath = [...ancestors, articleHeading]
  const articleParagraphs = directParagraphs(article)
  if (articleParagraphs.length) sections.push({ heading: articlePath.join(' > '), paragraphs: articleParagraphs })
  for (const lid of childNodes(article, 'lid')) {
    const number = text(firstChild(lid, 'lidnr'))
    if (!number) throw new Error('KNOWLEDGE_BWB_XML_LID_NUMBER_REQUIRED')
    const lidPath = [...articlePath, `Lid ${number}`]
    const paragraphs = directParagraphs(lid)
    if (paragraphs.length) sections.push({ heading: lidPath.join(' > '), paragraphs })
    listSections(lid, lidPath, sections)
  }
  listSections(article, articlePath, sections)
}

function traverse(node: XmlNode, ancestors: string[], sections: StructuredSourceSection[]) {
  if (node.name === 'meta-data') return
  if (node.name === 'artikel') {
    articleSections(node, ancestors, sections)
    return
  }
  const structural = ['boek', 'titel', 'hoofdstuk', 'afdeling', 'paragraaf'].includes(node.name)
  const nodeHeading = structural ? heading(node) : ''
  const nextAncestors = nodeHeading ? [...ancestors, nodeHeading] : ancestors
  for (const child of childNodes(node)) traverse(child, nextAncestors, sections)
}

export function adaptBwbXmlToStructuredSections(xml: string): StructuredSourceSection[] {
  const document = parseXml(xml)
  const toestand = findFirst(document, 'toestand')
  const wetgeving = toestand && findFirst(toestand, 'wetgeving')
  if (!toestand?.attributes['bwb-id'] || !/^\d{4}-\d{2}-\d{2}$/u.test(toestand.attributes.inwerkingtreding ?? '') || !wetgeving) throw new Error('KNOWLEDGE_BWB_XML_IDENTITY_INVALID')
  const sections: StructuredSourceSection[] = []
  const title = text(firstChild(wetgeving, 'citeertitel')) || text(firstChild(wetgeving, 'intitule'))
  if (title) sections.push({ heading: title, paragraphs: [] })
  traverse(wetgeving, [], sections)
  if (!sections.some((section) => /Artikel\s*\d+/iu.test(section.heading ?? ''))) throw new Error('KNOWLEDGE_BWB_XML_ARTICLES_REQUIRED')
  return sections
}

export function extractBwbXmlFullSource(xml: string) {
  return extractStructuredTextFullSource(adaptBwbXmlToStructuredSections(xml), {
    name: 'WORKMATCHR_LEGAL_TEXT',
    version: '1.0.0',
    configurationVersion: 'BWB_XML_2026_1',
  })
}

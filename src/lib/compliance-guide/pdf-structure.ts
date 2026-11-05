import { PDFArray, PDFDict, PDFName, PDFNumber, PDFOperator, PDFString, type PDFDocument, type PDFPage, type PDFRef } from 'pdf-lib'

/** Structure and marked content share the same logical order. No PDF/UA claim. */
export function createPdfStructure(document: PDFDocument) {
  const context = document.context
  const root = context.obj({ Type: 'StructTreeRoot', K: [] })
  const rootRef = context.register(root)
  const tree = context.obj({ Nums: [] })
  const parents = new Map<PDFPage, PDFRef[]>()
  document.catalog.set(PDFName.of('StructTreeRoot'), rootRef)
  document.catalog.set(PDFName.of('MarkInfo'), context.obj({ Marked: true }))
  document.catalog.set(PDFName.of('ViewerPreferences'), context.obj({ DisplayDocTitle: true }))
  root.set(PDFName.of('ParentTree'), context.register(tree))
  function element(role: string, parent = rootRef, alt?: string) {
    const dict = context.obj({ Type: 'StructElem', S: role, P: parent, K: [] })
    if (alt) dict.set(PDFName.of('Alt'), PDFString.of(alt))
    if (role === 'TH') dict.set(PDFName.of('A'), context.obj({ O: 'Table', Scope: 'Row' }))
    const ref = context.register(dict)
    context.lookup(parent, PDFDict).lookup(PDFName.of('K'), PDFArray).push(ref)
    return ref
  }
  const body = element('Document')
  function mark(page: PDFPage, ref: PDFRef, draw: () => void) {
    let entries = parents.get(page)
    if (!entries) { entries = []; page.node.set(PDFName.of('StructParents'), PDFNumber.of(parents.size)); parents.set(page, entries) }
    const id = entries.length
    entries.push(ref)
    const dict = context.lookup(ref, PDFDict)
    dict.lookup(PDFName.of('K'), PDFArray).push(context.obj({ Type: 'MCR', Pg: page.ref, MCID: id }))
    page.pushOperators(PDFOperator.of('BDC' as never, [dict.lookup(PDFName.of('S'), PDFName), context.obj({ MCID: id }).toString()]))
    draw()
    page.pushOperators(PDFOperator.of('EMC' as never))
  }
  function artifact(page: PDFPage, draw: () => void) {
    page.pushOperators(PDFOperator.of('BMC' as never, [PDFName.of('Artifact')]))
    draw(); page.pushOperators(PDFOperator.of('EMC' as never))
  }
  function finish() {
    const nums = tree.lookup(PDFName.of('Nums'), PDFArray)
    for (const [index, refs] of [...parents.values()].entries()) { nums.push(PDFNumber.of(index)); nums.push(context.obj(refs)) }
    root.set(PDFName.of('ParentTreeNextKey'), PDFNumber.of(parents.size))
  }
  return { element: (role: string, parent = body, alt?: string) => element(role, parent, alt), mark, artifact, finish }
}

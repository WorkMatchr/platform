import 'server-only'
import path from 'node:path'
/** Rasterize the actual synthetic PDF; no HTML approximation or browser PDF plugin required. */
export async function certificatePreviewPng(bytes:Uint8Array){
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs')
 const {createCanvas}=await import('@napi-rs/canvas')
 const task=getDocument({data:new Uint8Array(bytes),standardFontDataUrl:path.join(process.cwd(),'node_modules','pdfjs-dist','standard_fonts').replaceAll('\\','/')+'/',useSystemFonts:false})
 try{
  const pdf=await task.promise
  if(pdf.numPages!==1)throw Error('CERTIFICATE_SINGLE_PAGE_REQUIRED')
  const page=await pdf.getPage(1),viewport=page.getViewport({scale:1.5})
  const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height))
  await page.render({canvas:canvas as unknown as HTMLCanvasElement,canvasContext:canvas.getContext('2d') as unknown as CanvasRenderingContext2D,viewport}).promise
  return canvas.toBuffer('image/png')
 }finally{await task.destroy()}
}

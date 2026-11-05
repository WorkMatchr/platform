import 'server-only'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { get, put } from '@vercel/blob'
export const learningMediaLimit=3*1024*1024
const types={webp:'image/webp'} as const
type Extension=keyof typeof types
function configuration(){const environment=process.env.VERCEL_ENV;const storeId=process.env.LEARNING_MEDIA_BLOB_STORE_ID;if(!storeId||!['preview','production'].includes(environment??'')||process.env.LEARNING_MEDIA_BLOB_ENVIRONMENT!==environment||!/^[A-Za-z0-9_-]{8,128}$/.test(storeId))throw Error('MEDIA_STORAGE_NOT_CONFIGURED');return {storeId}}
function local(){return !process.env.VERCEL&&['test','development'].includes(process.env.NODE_ENV??'')}
function parseKey(key:string){if(!/^[a-f0-9]{64}\.(webp)$/.test(key))throw Error('INVALID_MEDIA_KEY');return key.split('.')[1] as Extension}
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex')
export async function prepareLearningMedia(file:File){
 if(!file.size||file.size>learningMediaLimit)throw Error('MEDIA_SIZE')
 let bytes=Buffer.from(await file.arrayBuffer()),extension:Extension
 if(['image/png','image/jpeg','image/webp'].includes(file.type)){const {default:sharp}=await import('sharp');bytes=await sharp(bytes,{limitInputPixels:20_000_000}).rotate().resize({width:1920,height:1920,fit:'inside',withoutEnlargement:true}).webp().toBuffer();extension='webp'}
 else throw Error('MEDIA_FORMAT')
 return {bytes,key:`${hash(bytes)}.${extension}`,mediaType:types[extension]}
}
export async function saveLearningMedia(file:File){const prepared=await prepareLearningMedia(file);const {key,bytes,mediaType}=prepared
 if(local()){const dir=path.resolve('.local-storage','learning-media');await mkdir(dir,{recursive:true});try{await writeFile(path.join(dir,key),bytes,{flag:'wx'})}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e}}
 else{const {storeId}=configuration();await put(`learning-media/v1/${key}`,bytes,{storeId,access:'private',contentType:mediaType,addRandomSuffix:false,allowOverwrite:false,maximumSizeInBytes:learningMediaLimit})}
 const stored=await readLearningMedia(key);if(!stored||hash(stored.bytes)!==hash(bytes))throw Error('MEDIA_INTEGRITY');return `/learning-media/${key}`
}
export async function readLearningMedia(key:string){const extension=parseKey(key);let bytes:Uint8Array
 if(local()){try{bytes=await readFile(path.resolve('.local-storage','learning-media',key))}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e}}
 else{const {storeId}=configuration();const found=await get(`learning-media/v1/${key}`,{storeId,access:'private',useCache:false});if(!found||found.statusCode!==200)return null;if(found.blob.size>learningMediaLimit||found.blob.contentType!==types[extension])throw Error('MEDIA_INTEGRITY');bytes=new Uint8Array(await new Response(found.stream).arrayBuffer())}
 if(bytes.length>learningMediaLimit||hash(bytes)!==key.split('.')[0])throw Error('MEDIA_INTEGRITY');return {bytes,mediaType:types[extension]}
}

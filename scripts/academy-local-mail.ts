import 'dotenv/config'
import { execFileSync, spawn } from 'node:child_process'
import { randomBytes, X509Certificate } from 'node:crypto'
import { existsSync, lstatSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { getPrisma } from '../src/lib/prisma'
import { ACADEMY_APP_ORIGIN, ACADEMY_MAIL_CONTAINER, ACADEMY_MAIL_IMAGE, ACADEMY_MAIL_LABEL, ACADEMY_MAIL_NETWORK, ACADEMY_MAIL_URL, AcademyLocalMailError, academyMailContainerArguments, assertAcademyLocalMailEnvironment } from '../src/lib/academy-local-mail-policy'
import { academyMailPrivateDirectory, assertAcademyMailPrivateDirectory, readAcademyMailPrivateFile, writeAcademyMailPrivateFile } from '../src/lib/academy-local-mail-private'
import { academyMailRequest, readAcademyMailState } from '../src/lib/academy-local-mail'

const files=['state.json','ui.auth','send.auth','operator.txt','cert.pem','key.pem','ready']
const docker=(args:string[],input?:string)=>execFileSync('docker',args,{input,encoding:'utf8',windowsHide:true,stdio:[input===undefined?'ignore':'pipe','pipe','pipe']}).trim()
function localDocker() {
  if (process.env.DOCKER_HOST) throw new AcademyLocalMailError()
  const host=docker(['context','inspect','--format','{{.Endpoints.docker.Host}}'])
  if(!host.startsWith('npipe:////./pipe/') && host!=='unix:///var/run/docker.sock')throw new AcademyLocalMailError()
}
function inspectContainer() {
  const id=docker(['ps','--all','--quiet','--filter',`name=^/${ACADEMY_MAIL_CONTAINER}$`])
  if(!id)return null
  const [container]=JSON.parse(docker(['inspect',ACADEMY_MAIL_CONTAINER]))
  const bindings=container.HostConfig.PortBindings
  if(container.Config.Labels?.[ACADEMY_MAIL_LABEL]!=='true' || container.Config.Image!==ACADEMY_MAIL_IMAGE
    || container.HostConfig.NetworkMode!==ACADEMY_MAIL_NETWORK || container.HostConfig.Privileged
    || !container.HostConfig.ReadonlyRootfs || container.HostConfig.LogConfig.Type!=='none'
    || JSON.stringify(bindings)!==JSON.stringify({'8025/tcp':[{HostIp:'127.0.0.1',HostPort:'8025'}]}))throw new AcademyLocalMailError()
  return container
}
async function databasePreflight() {
  const db=getPrisma()
  try {
    const [identity]=await db.$queryRaw<{database:string;major:number}[]>`SELECT current_database() AS database,(current_setting('server_version_num')::int/10000)::int AS major`
    if(identity.database!=='neondb'||identity.major!==17)throw new AcademyLocalMailError()
  } finally {await db.$disconnect()}
}
async function status() {
  if(!inspectContainer()?.State.Running)throw new AcademyLocalMailError()
  readAcademyMailState()
  const credential=readAcademyMailPrivateFile('ui.auth').trim()
  const response=await academyMailRequest('/api/v1/info','GET',credential)
  if(response.status!==200)throw new AcademyLocalMailError()
  console.log(`Lokale mailopvang actief: ${ACADEMY_MAIL_URL}`)
  console.log(`Operatorgegevens (alleen lokaal openen): ${join(academyMailPrivateDirectory(),'operator.txt')}`)
}
async function start() {
  await databasePreflight()
  if(inspectContainer())return status()
  const directory=assertAcademyMailPrivateDirectory(true)
  if(files.some(name=>existsSync(join(directory,name))))throw new AcademyLocalMailError()
  const network=docker(['network','ls','--quiet','--filter',`name=^${ACADEMY_MAIL_NETWORK}$`])
  if(network) {
    const [found]=JSON.parse(docker(['network','inspect',ACADEMY_MAIL_NETWORK]))
    if(found.Options?.['com.docker.network.bridge.enable_ip_masquerade']!=='false' || found.Options?.['com.docker.network.bridge.enable_icc']!=='false' || found.Labels?.[ACADEMY_MAIL_LABEL]!=='true')throw new AcademyLocalMailError()
  } else docker(['network','create','--opt','com.docker.network.bridge.enable_ip_masquerade=false','--opt','com.docker.network.bridge.enable_icc=false','--label',`${ACADEMY_MAIL_LABEL}=true`,ACADEMY_MAIL_NETWORK])
  const senderPassword=randomBytes(32).toString('hex'),operatorPassword=randomBytes(32).toString('hex'),createdAt=Date.now()
  writeAcademyMailPrivateFile('state.json',JSON.stringify({version:1,origin:ACADEMY_APP_ORIGIN,createdAt,expiresAt:createdAt+24*60*60*1000,senderPassword}))
  writeAcademyMailPrivateFile('send.auth',`sender:${senderPassword}\n`)
  writeAcademyMailPrivateFile('ui.auth',`operator:${operatorPassword}\n`)
  const openssl=process.platform==='win32'?join(process.env.ProgramFiles??'C:/Program Files','Git','usr','bin','openssl.exe'):'openssl'
  execFileSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1',
    '-keyout',join(directory,'key.pem'),'-out',join(directory,'cert.pem')],{stdio:'ignore',windowsHide:true})
  const fingerprint=new X509Certificate(readAcademyMailPrivateFile('cert.pem')).fingerprint256
  writeAcademyMailPrivateFile('operator.txt',`WorkMatchr Academy — alleen voor de lokale operator\nURL: ${ACADEMY_MAIL_URL}\nGebruiker: operator\nWachtwoord: ${operatorPassword}\nTLS SHA-256: ${fingerprint}\nOpen dit bestand lokaal, kopieer geen inhoud naar logs of rapporten.\n`)
  docker(academyMailContainerArguments())
  // Docker Desktop cannot always read an operator-only Windows bind mount.
  // Stream over the local Docker pipe into tmpfs, without secret command arguments.
  for(const name of ['ui.auth','send.auth','cert.pem','key.pem']) docker(['exec','--interactive',ACADEMY_MAIL_CONTAINER,'/bin/sh','-c',`umask 077; cat > /private/${name}`],readAcademyMailPrivateFile(name))
  writeAcademyMailPrivateFile('ready','ready')
  docker(['exec','--interactive',ACADEMY_MAIL_CONTAINER,'/bin/sh','-c','umask 077; cat > /private/ready'],readAcademyMailPrivateFile('ready'))
  for(let attempt=0;attempt<20;attempt++) {
    try {await status();return} catch {await new Promise(resolve=>setTimeout(resolve,500))}
  }
  throw new AcademyLocalMailError()
}
function stop() {
  assertAcademyMailPrivateDirectory()
  readAcademyMailState(true)
  if(inspectContainer())docker(['rm','--force',ACADEMY_MAIL_CONTAINER])
  // Delete only this run's named files, never recursively delete a computed directory.
  for(const name of files) {
    const path=join(academyMailPrivateDirectory(),name)
    if(existsSync(path)){if(!lstatSync(path).isFile()||lstatSync(path).isSymbolicLink())throw new AcademyLocalMailError();unlinkSync(path)}
  }
  console.log('Lokale mailopvang gestopt; tijdelijke berichten en operatorgegevens verwijderd.')
}
async function app() {
  await databasePreflight();await status()
  const child=spawn(process.env.ComSpec??'sh',process.platform==='win32'?['/d','/s','/c','npm run dev -- --hostname 127.0.0.1 --port 3002']:['-c','npm run dev -- --hostname 127.0.0.1 --port 3002'],{
    stdio:'inherit',windowsHide:true,env:{...process.env,BETTER_AUTH_SECRET:process.env.BETTER_AUTH_SECRET||randomBytes(48).toString('base64')},
  })
  child.on('exit',code=>{process.exitCode=code??1})
}
async function main() {
  assertAcademyLocalMailEnvironment()
  localDocker()
  const action=process.argv[2]
  if(process.argv.length!==3||!['start','status','stop','app'].includes(action))throw new AcademyLocalMailError()
  if(action==='start')await start()
  else if(action==='status')await status()
  else if(action==='stop')stop()
  else await app()
}
main().catch(()=>{console.error('Lokale Academy-mailopvang is veilig afgebroken; gevoelige details zijn niet gelogd.');process.exitCode=1})

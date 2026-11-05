import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { AcademyLocalMailError } from './academy-local-mail-policy'

export const academyMailPrivateDirectory = () => process.platform === 'win32'
  ? join(/* turbopackIgnore: true */ homedir(),'AppData','Local','WorkMatchr','academy-local-mail')
  : join(/* turbopackIgnore: true */ homedir(),'.local','state','workmatchr','academy-local-mail')

function windowsPermissions(create: boolean) {
  const script = `$p=$env:ACADEMY_MAIL_PRIVATE_DIRECTORY; $sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User;
    ${create ? "$acl=[System.Security.AccessControl.DirectorySecurity]::new(); $acl.SetOwner($sid); $acl.SetAccessRuleProtection($true,$false); $rule=[System.Security.AccessControl.FileSystemAccessRule]::new($sid,[System.Security.AccessControl.FileSystemRights]::FullControl,[System.Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit',[System.Security.AccessControl.PropagationFlags]::None,[System.Security.AccessControl.AccessControlType]::Allow); $acl.AddAccessRule($rule); Set-Acl -LiteralPath $p -AclObject $acl -ErrorAction Stop;" : ''}
    $acl=Get-Acl -LiteralPath $p; if(!$acl.AreAccessRulesProtected -or $acl.Owner -ne $sid.Translate([System.Security.Principal.NTAccount]).Value){exit 1};
    foreach($r in $acl.Access){if($r.AccessControlType -eq 'Allow' -and $r.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value -ne $sid.Value){exit 1}}`
  execFileSync(/* turbopackIgnore: true */ 'pwsh.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,stdio:'ignore',env:{...process.env,ACADEMY_MAIL_PRIVATE_DIRECTORY:academyMailPrivateDirectory()}})
}

export function assertAcademyMailPrivateDirectory(create = false) {
  try {
    const directory=academyMailPrivateDirectory()
    if (create && !existsSync(/* turbopackIgnore: true */ directory)) {
      mkdirSync(/* turbopackIgnore: true */ directory,{recursive:true,mode:0o700})
      if(process.platform==='win32') windowsPermissions(true)
      else chmodSync(/* turbopackIgnore: true */ directory,0o700)
    }
    const stat=lstatSync(/* turbopackIgnore: true */ directory)
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new AcademyLocalMailError()
    if(process.platform==='win32') windowsPermissions(false)
    else if ((stat.mode & 0o077)!==0 || stat.uid!==process.getuid?.()) throw new AcademyLocalMailError()
    return directory
  } catch { throw new AcademyLocalMailError() }
}

export function writeAcademyMailPrivateFile(name: string, value: string) {
  if(!['state.json','ui.auth','send.auth','operator.txt','cert.pem','key.pem','ready','local.env'].includes(name))throw new AcademyLocalMailError()
  const path=join(/* turbopackIgnore: true */ assertAcademyMailPrivateDirectory(),name)
  writeFileSync(/* turbopackIgnore: true */ path,value,{encoding:'utf8',mode:0o600,flag:'wx'})
}

export function readAcademyMailPrivateFile(name: string) {
  try {
    if(!['state.json','ui.auth','send.auth','operator.txt','cert.pem','key.pem','ready','local.env'].includes(name))throw new AcademyLocalMailError()
    const path=join(/* turbopackIgnore: true */ assertAcademyMailPrivateDirectory(),name),stat=lstatSync(/* turbopackIgnore: true */ path)
    if(!stat.isFile() || stat.isSymbolicLink() || stat.size>16_384) throw new AcademyLocalMailError()
    return readFileSync(/* turbopackIgnore: true */ path,'utf8')
  } catch { throw new AcademyLocalMailError() }
}

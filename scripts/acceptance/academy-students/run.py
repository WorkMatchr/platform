import subprocess as sp, os, time, uuid, secrets, pathlib, re, argparse
parser=argparse.ArgumentParser(description='Academy: geïsoleerde PostgreSQL- en browseracceptatie')
parser.add_argument('--database-only',action='store_true',help='Alleen migraties, rollen, historie en de drie versies testen.')
parser.add_argument('--administration-only', action='store_true', help='Alleen de beheerbrowserroute na de databaseproef.')
parser.add_argument('--course', choices=['WL-001','WL-002','WL-003'], help='Voer na beheeracceptatie één studentroute uit.')
parser.add_argument('--assigned-pilot', action='store_true', help='Test de drie persoonlijke r07-pilotuitnodigingen in de eigen lokale database.')
parser.add_argument('--paid-pilot', action='store_true', help='Persoonlijke 99%%-codes met uitsluitend lokale providerimitaties.')
parser.add_argument('--management',action='store_true',help='Nieuwe cursus zonder vooraf ingevoerde cursusgegevens via de editor en de studentroute.')
args=parser.parse_args()
if args.paid_pilot: args.assigned_pilot=True
if sum(map(bool,[args.course,args.database_only,args.administration_only,args.management])) > 1:
 parser.error('Selecteer één deelproef.')
p=pathlib.Path.cwd()
assert (p/'prisma/schema.prisma').is_file(), 'Run from repository root'
folder=p/'.local-storage'/('academy-students-'+uuid.uuid4().hex)
folder.mkdir(parents=True)
env={k:v for k,v in os.environ.items() if k.lower() in 'path systemroot comspec windir pathext userprofile appdata localappdata tmp temp programdata programfiles programfiles(x86) commonprogramfiles os systemdrive number_of_processors processor_architecture userdomain username homedrive homepath'.split()}
env.update(CI='1',NEXT_TELEMETRY_DISABLED='1',BETTER_AUTH_SECRET=secrets.token_hex(48),POSTGRES_PASSWORD=secrets.token_hex(32),LEARNING_RUNTIME_ENABLED='true',AUTH_EMAIL_DELIVERY_ENABLED='false',NODE_ENV='test')
def cli(*a):return sp.check_output(a,env=env,text=True,encoding='utf8').strip()
def run(label,args,cwd):
 with (folder/(label+'.log')).open('w',encoding='utf8') as f:r=sp.run(args,env=env,cwd=cwd,stdout=f,stderr=sp.STDOUT,timeout=1400)
 print(label,r.returncode,flush=True)
 if r.returncode:raise RuntimeError(label)
for key in ('ACADEMY_PLAYWRIGHT_PATH','ACADEMY_CHROMIUM_PATH'):
 if key in os.environ:env[key]=os.environ[key]
if args.assigned_pilot:env['ACADEMY_TEST_ASSIGNED_PILOT']='1'
if args.paid_pilot:env.update(ACADEMY_PAID_PILOT='synthetic',ACADEMY_PILOT_TAX='NL_KOR_CONFIRMED',MOLLIE_API_KEY='test_'+'0'*30,MOLLIE_REDIRECT_BASE_URL='http://127.0.0.1',MOLLIE_WEBHOOK_BASE_URL='http://127.0.0.1')
if args.paid_pilot and args.database_only:env['ACADEMY_PAID_DB_PROBE']='1'
env['ACADEMY_TEST_ARTIFACTS']=str(folder)
print('Synthetic test results:',folder,flush=True)
tag=uuid.uuid4().hex;db='workmatchr_learning_'+str(os.getpid())+'_'+str(int(time.time()))
cid=cli('docker','run','--pull=never','-d','--label','wm.academy04='+tag,'-e','POSTGRES_PASSWORD','-p','127.0.0.1::5432','postgres:18')
def sql(q):return cli('docker','exec',cid,'psql','-XAtq','-v','ON_ERROR_STOP=1','-U','postgres','-d',db,'-c',q)
try:
 endpoint=cli('docker','port',cid,'5432/tcp');assert re.fullmatch(r'127\.0\.0\.1:\d+',endpoint)
 for i in range(90):
  if sp.run(['docker','exec',cid,'pg_isready','-h','127.0.0.1','-U','postgres'],capture_output=True).returncode==0:break
  time.sleep(1)
 cli('docker','exec',cid,'createdb','-U','postgres',db)
 env['DATABASE_URL']='postgresql://postgres:'+env['POSTGRES_PASSWORD']+'@'+endpoint+'/'+db
 env['LEARNING_TEST_DATABASE_URL']=env['DATABASE_URL']
 ts=['node','node_modules/tsx/dist/cli.mjs'];vit=['node','node_modules/vitest/vitest.mjs','run']
 mig=['node','node_modules/prisma/build/index.js','migrate','deploy']
 for l,cmd in ([('baseline',mig)] if args.management else [('baseline',mig),('lessons',ts+['scripts/seed-learning.ts']),('exam',ts+['scripts/seed-learning-final-exam.ts']),('v11',ts+['scripts/seed-learning-final-exam-v1-1.ts']),('history',vit+['src/lib/learning/learning-final-exam-runtime.integration.test.ts'])]):run(l,cmd,p)
 assert sql('SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')=='103'
 runtime=secrets.token_hex(32)
 perms='CREATE ROLE academy_content_editor LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '+chr(39)+runtime+chr(39)+'; REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO academy_content_editor; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO academy_content_editor; REVOKE INSERT,UPDATE,DELETE ON _prisma_migrations FROM academy_content_editor; GRANT SELECT,USAGE ON ALL SEQUENCES IN SCHEMA public TO academy_content_editor;'
 proc=sp.run(['docker','exec','-i',cid,'psql','-Xq','-v','ON_ERROR_STOP=1','-U','postgres','-d',db],input=perms,text=True,capture_output=True);assert proc.returncode==0
 if args.paid_pilot and args.database_only:
  # P1 creates its own sibling DB on this disposable Postgres, with all provider keys absent.
  test_key=env.pop('MOLLIE_API_KEY')
  try:run('pro-regression',['npm.cmd' if os.name=='nt' else 'npm','run','test:db:finance-p1'],p)
  finally:env['MOLLIE_API_KEY']=test_key
 env.pop('POSTGRES_PASSWORD')
 env['DATABASE_URL']='postgresql://academy_content_editor:'+runtime+'@'+endpoint+'/'+db
 env['LEARNING_TEST_DATABASE_URL']=env['DATABASE_URL'];env['ACADEMY_RELEASE03_LOCAL_TEST']='1'
 env['ACADEMY_STUDENT_PILOT_ENABLED']='true'
 if not args.management:run('integration',vit+['--testTimeout','30000','src/lib/learning/academy-release03.integration.test.ts'],p)

 env.update(NODE_ENV='production',BETTER_AUTH_URL='http://127.0.0.1',NEXT_PUBLIC_APP_URL='http://127.0.0.1')
 if not args.database_only:
  mode=['--management'] if args.management else ['--administration-only'] if args.administration_only else ['--course',args.course] if args.course else []
  run('administration' if args.administration_only else 'students',['node','scripts/acceptance/academy-students/student.mjs',*mode],p)

finally:
 assert cli('docker','inspect','--format','{{index .Config.Labels "wm.academy04"}}',cid)==tag;cli('docker','rm','-fv',cid);print('cleanup verified',flush=True)

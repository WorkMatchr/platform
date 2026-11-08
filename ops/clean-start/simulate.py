"""Private local PostgreSQL rehearsal. No URL, source data, bind mount or port accepted."""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
REFS = ('ProviderTaxonomy','ProviderTaxonomyVersion','ProviderTaxonomyTerm','Sector','LearningCourse','LearningCourseVersion','LearningChapter','LearningContentBlock',
        'LearningExam','LearningExamVersion','LearningExamQuestion','LearningQuestion','LearningQuestionOption',
        'ComplianceFrameworkVersion','ComplianceModuleDefinition')
EMPTY = ('User','Account','TwoFactor','Verification','Session','Organization','OrganizationMembership',
         'CreditAccount','CreditTransaction','CreditReservation','ProfessionalSubscription','FinancialPurchase',
         'FinancialPaymentEvent','FinancialInvoice','FinancialRefund','FinancialJorttSync','Assignment','Request',
         'ProviderProfile','ProviderInvitation','Quote','AwardDecision','NotificationOutbox','MarketplaceNotification',
         'ProviderQualificationDecision','ProviderEvidenceRevision','LearningEnrollment','LearningCertificate','ArboGuideRun')
GRAPH = """SELECT conrelid::regclass::text, confrelid::regclass::text, pg_get_constraintdef(oid), convalidated
FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace ORDER BY 1,2,3"""
TABLES = """SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1"""

def docker(*args, data=None):
    return subprocess.run(['docker', *args], input=data, capture_output=True, check=True).stdout.decode().strip()

def main():
    if sys.flags.optimize: raise RuntimeError('Run with assertions enabled')
    if os.getenv('DOCKER_HOST') or os.getenv('DOCKER_TLS_VERIFY'):
        raise RuntimeError('Remote Docker override refused')
    endpoint = json.loads(docker('context','inspect'))[0]['Endpoints']['docker']['Host']
    if not endpoint.startswith(('npipe:////./pipe/', 'unix:///var/run/docker.sock')):
        raise RuntimeError('Local Docker engine required')
    name = 'wm-clean-start-' + uuid.uuid4().hex
    # No credentials needed outside this container. psql uses its private Unix socket.
    cid = docker('run','--pull=never','-d','--name',name,'--network','none','--label','wm.rehearsal='+name,
                 '--tmpfs','/var/lib/postgresql:rw,size=512m','-e','POSTGRES_HOST_AUTH_METHOD=reject','-e',
                 'POSTGRES_PASSWORD_FILE=/proc/sys/kernel/random/uuid','postgres:18')
    if not re.fullmatch('[0-9a-f]{64}',cid):
        raise RuntimeError('Unexpected container identity')
    def sql(db, statement):
        return docker('exec','-i','-e','PGOPTIONS=-c workmatchr.clean_start_fixture=isolated-v3',cid,'psql','-XqAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',db,
                      data=statement.encode('utf8'))
    def inventories(db, tables):
        if not all(re.fullmatch(r'[A-Za-z0-9_]+',t) for t in tables):
            raise ValueError('Unexpected table identifier')
        statements = [f"""SELECT '{t}',count(*),encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,chr(10) ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex') FROM "{t}" r""" for t in tables]
        return {name:(int(n),digest) for name,n,digest in
                (line.split('|') for line in sql(db,' UNION ALL '.join(statements)).splitlines())}
    try:
        info = json.loads(docker('inspect',cid))[0]
        assert info['HostConfig']['NetworkMode']=='none' and not info['HostConfig']['PortBindings']
        assert not any(x['Type']=='bind' for x in info['Mounts'])
        for _ in range(90):
            try:
                if sql('postgres',"select current_setting('server_version_num')::int/10000")=='18': break
            except subprocess.CalledProcessError: pass
            time.sleep(1)
        else: raise RuntimeError('PostgreSQL 18 unavailable')
        sql('postgres','CREATE DATABASE fixture_base')
        paths=sorted((ROOT/'prisma/migrations').glob('*/migration.sql'))
        if not paths: raise RuntimeError('Missing schema files')
        # Only repository SQL. Keep psql meta-commands out of the input.
        scripts=[p.read_text(encoding='utf-8-sig') for p in paths]
        if any(re.search(r'(?m)^\s*\\',s) for s in scripts): raise RuntimeError('Unexpected psql command')
        chain = hashlib.sha256()
        for path,script in zip(paths,scripts): chain.update((path.parent.name+'\n'+script+'\0').encode())
        if chain.hexdigest()!='4de4e009ec1de1207cea81a42a9c59ebfb076a1ab887b7a08a51532698b3a4f2': raise ValueError('Schema manifest needs review')
        sql('fixture_base','\n'.join(scripts))
        for db in ('fixture_old','fixture_target'):
            sql('postgres',f'CREATE DATABASE {db} TEMPLATE fixture_base')
        tables = sql('fixture_base',TABLES).splitlines()
        baseline = inventories('fixture_base',tables)
        bootstrap = {t for t,(n,_) in baseline.items() if n}
        if bootstrap != {'IntakeQuestionnaireVersion','ComplianceFrameworkVersion','MarketplaceRuleSet',
                'ProviderTaxonomyVersion','IntakeQuestion','ProviderTaxonomyTerm','Specialism','IntakeQuestionOption',
                'IntakeQuestionnaire','ProviderTaxonomy','ProviderSpecialismTaxonomyMap'}:
            raise ValueError('Unreviewed bootstrap data')
        expected_graph = sql('fixture_base',GRAPH)
        def guard_graph():
            for db in ('fixture_old','fixture_target'):
                if sql(db,TABLES).splitlines()!=tables: raise ValueError('unknown table')
                if sql(db,GRAPH)!=expected_graph: raise ValueError('unknown dependency')
        guard_graph()
        try: sql('fixture_base',(HERE/'historical-fixture.sql').read_text(encoding='utf8'))
        except subprocess.CalledProcessError as err:
            if b'fixture only' not in err.stderr: raise
        else: raise RuntimeError('Incorrect database accepted')
        for db in ('fixture_old','fixture_target'):
            sql(db,(HERE/'reference-fixture.sql').read_text(encoding='utf8'))
        sql('fixture_old',(HERE/'historical-fixture.sql').read_text(encoding='utf8'))
        assert sql('fixture_old','SELECT count(*) FROM "ProfessionalSubscription" WHERE status=\'ACTIVE\'')=='1'
        assert sql('fixture_old','SELECT sum(balance) FROM "CreditAccount"')=='25'
        assert sql('fixture_old','SELECT count(*) FROM "Session" WHERE "expiresAt">now()')=='1'
        for t in ('User','Assignment','NotificationOutbox'):
            assert sql('fixture_old',f'SELECT count(*) FROM "{t}"')=='1'
        # Hash the approved fixture before adding an off-manifest course to the historical source.
        refs = inventories('fixture_old', REFS)
        sql('fixture_old', '''INSERT INTO "LearningCourse" (slug,code,title,description,"updatedAt")
            VALUES ('unreviewed','SYN-UNREVIEWED','Unreviewed','Unreviewed',now())''')
        assert inventories('fixture_old',['LearningCourse'])['LearningCourse'] != refs['LearningCourse']
        def verify():
            guard_graph()
            if sql('fixture_target',"SELECT count(*) FROM pg_constraint WHERE contype='f' AND NOT convalidated")!='0':
                raise ValueError('unvalidated foreign key')
            got = inventories('fixture_target', tables)
            for table,(count,digest) in got.items():
                if table in EMPTY and count: raise ValueError('operational residue '+table)
                if (count,digest)!=refs.get(table,baseline[table]): raise ValueError('off-manifest '+table)
        verify()
        print('PASS',len(paths),'schema files;',len(sql('fixture_target',GRAPH).splitlines()),'foreign keys;',
              len(EMPTY),'empty operational tables;',len(refs),'reference table digests; other tables match baseline',flush=True)
        sql('fixture_old','ALTER TABLE "LearningCourse" ADD COLUMN synthetic_owner uuid REFERENCES "User"(id)')
        try: verify()
        except ValueError as err:
            if str(err)!='unknown dependency': raise
            print('PASS unknown owner dependency blocks before transfer')
        else: raise RuntimeError('Unexpected dependency accepted')
    except subprocess.CalledProcessError as err:
        # This process only handles generated local fixtures and checked-in SQL.
        raise RuntimeError(err.stderr.decode(errors='replace')[-1400:]) from None
    finally:
        if docker('inspect','--format','{{index .Config.Labels "wm.rehearsal"}}',cid)!=name:
            raise RuntimeError('Cannot establish cleanup ownership')
        docker('rm','-fv',cid)
        if docker('ps','-aq','--filter','id='+cid): raise RuntimeError('Cleanup incomplete')
        print('Own container removed')
if __name__=='__main__':
    main()

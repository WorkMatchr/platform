"""Verify a checkpoint inside an owned, disposable local PostgreSQL 18 fixture."""
import hashlib
import os
import re
import subprocess
import uuid
from pathlib import Path


def docker(*args):
    return subprocess.check_output(["docker", *args], text=True, encoding="utf8").strip()


def main(source, clean_start):
    if not re.fullmatch(r"workmatchr_b4_[0-9a-f]{12}", source):
        raise ValueError("Synthetic database required")
    if os.getenv("DOCKER_HOST") or os.getenv("DOCKER_CONTEXT"):
        raise ValueError("Explicit remote context is not allowed")
    endpoint = docker("context", "inspect", "--format", "{{.Endpoints.docker.Host}}")
    if not endpoint.startswith(("npipe:////./pipe/", "unix:///")):
        raise ValueError("Local engine required")
    name = source.replace("workmatchr_b4_", "wm-b4-")
    if docker("inspect", "--format", '{{index .Config.Labels "workmatchr.b4"}}', name) != name:
        raise ValueError("Fixture ownership mismatch")

    def pg(database, statement):
        return docker("exec", name, "psql", "-XAtq", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", database, "-c", statement)

    if pg(source, "SELECT current_database()") != source or int(pg(source, "SHOW server_version_num")) // 10000 != 18:
        raise ValueError("Database identity mismatch")
    inventory = Path(__file__).with_name("clean-start-inventory.sql").read_text(encoding="utf8")
    before = pg(source, inventory)
    restored = "workmatchr_b4_" + uuid.uuid4().hex[:12]
    archive = "/dev/shm/v3-" + uuid.uuid4().hex + ".dump"
    docker("exec", name, "pg_dump", "-U", "postgres", "-Fc", "-f", archive, source)
    docker("exec", name, "createdb", "-U", "postgres", restored)
    try:
        docker("exec", name, "pg_restore", "-U", "postgres", "--exit-on-error", "--single-transaction", "-d", restored, archive)
        if pg(restored, inventory) != before:
            raise ValueError("Inventory or dependency mismatch")
        tables = pg(source, "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1").splitlines()
        if not tables or not all(re.fullmatch("[A-Za-z_][A-Za-z0-9_]*", t) for t in tables):
            raise ValueError("Unexpected schema")
        for start in range(0, len(tables), 12):
            queries = []
            for table in tables[start:start + 12]:
                queries.append(f"""SELECT '{table}',count(*),md5(string_agg(h,',' ORDER BY h))
                    FROM (SELECT md5(to_jsonb(t)::text) AS h FROM public."{table}" t) hashed""")
            query = " UNION ALL ".join(queries) + " ORDER BY 1"
            if pg(source, query) != pg(restored, query):
                raise ValueError("Synthetic table contents differ")
        if clean_start:
            # A new administration is a different database. The full historical copy stays intact.
            # These reference tables are the allowlist of this synthetic rehearsal only.
            reference = [
                "_prisma_migrations", "Sector", "Specialism", "ProviderTaxonomy", "ProviderTaxonomyVersion",
                "ProviderTaxonomyTerm", "ProviderSpecialismTaxonomyMap", "ProviderSectorTaxonomyMap",
                "ComplianceFrameworkVersion", "ComplianceModuleDefinition", "ComplianceQuestionDefinition",
                "ComplianceAnswerOptionDefinition", "ComplianceRuleDefinition", "LearningCourse", "LearningCourseVersion",
                "LearningChapter", "LearningContentBlock", "LearningQuestion", "LearningQuestionOption",
                "LearningExam", "LearningExamVersion", "LearningExamQuestion", "MarketplaceRuleSet",
            ]
            empty = ["User", "Organization", "CreditAccount", "CreditTransaction", "ProfessionalSubscription",
                     "FinancialPurchase", "FinancialInvoice", "Assignment", "Quote", "NotificationOutbox"]
            if not set(reference + empty).issubset(tables):
                raise ValueError("Reference manifest does not match the fixture schema")
            clean = "workmatchr_b4_" + uuid.uuid4().hex[:12]
            docker("exec", name, "createdb", "-U", "postgres", clean)
            try:
                restore = ["exec", name, "pg_restore", "-U", "postgres", "--exit-on-error", "-d", clean]
                docker(*restore, "--section=pre-data", archive)
                selected = [arg for table in reference for arg in ("-t", table)]
                docker(*restore, "--data-only", *selected, archive)
                # Apply and validate all indexes, foreign keys and triggers.
                docker(*restore, "--section=post-data", archive)
                for table in reference:
                    query = f"""SELECT count(*),md5(string_agg(h,',' ORDER BY h))
                        FROM (SELECT md5(to_jsonb(t)::text) AS h FROM public."{table}" t) hashed"""
                    if pg(clean, query) != pg(source, query):
                        raise ValueError("Reference data mismatch: " + table)
                for table in empty:
                    if pg(clean, f'SELECT count(*) FROM public."{table}"') != "0":
                        raise ValueError("Commercial starting balance is not empty: " + table)
                print(f"PASS new synthetic administration, {len(reference)} reference tables, {len(empty)} empty operational tables")
            finally:
                docker("exec", name, "dropdb", "-U", "postgres", clean)
        # The archive and original database belong to this disposable synthetic fixture.
        print(f"PASS synthetic checkpoint, {len(tables)} tables, row multisets and FK inventory")
        print("Inventory SHA-256", hashlib.sha256(before.encode()).hexdigest())
    finally:
        docker("exec", name, "dropdb", "-U", "postgres", restored)
        docker("exec", name, "rm", "--", archive)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source")
    parser.add_argument("--clean-start", action="store_true")
    args = parser.parse_args()
    main(args.source, args.clean_start)

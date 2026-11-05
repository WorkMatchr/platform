import { expect, it } from 'vitest'
import { regularAcademyCourses, registeredAcademyAccounts, registeredAcademyOrganizations } from './academy-admin-selection'
it('excludes only exact proven runtime courses, not a code or email pattern alone',()=>{
 expect(regularAcademyCourses.NOT.OR).toEqual([{code:'WL-901',slug:'academy-fixture-wl-901'},{code:'WL-902',slug:'academy-fixture-wl-902'}])
 expect(regularAcademyCourses.NOT.versions.some.academyImports.some.operatorReference).toBe('academy-domain-fixture')
 expect(JSON.stringify(regularAcademyCourses)).not.toContain('email')
})
it('requires a registered identity without selecting password hashes',()=>{expect(registeredAcademyAccounts).toEqual({status:'ACTIVE',emailVerified:true,accounts:{some:{}}});expect(JSON.stringify(registeredAcademyAccounts)).not.toContain('password')})
it('requires an active authorized registered organization member',()=>{expect(registeredAcademyOrganizations.memberships.some.role.in).toEqual(['OWNER','ADMIN']);expect(registeredAcademyOrganizations.memberships.some.user).toBe(registeredAcademyAccounts);expect(registeredAcademyOrganizations.systemKey).toBeNull()})

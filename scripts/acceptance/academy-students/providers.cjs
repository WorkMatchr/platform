// Test process only: consume generated verification mail in memory. No provider HTTP traffic.
if (new URL(process.env.DATABASE_URL).hostname !== '127.0.0.1' || new URL(process.env.PILOT_SINK).hostname !== '127.0.0.1') throw Error('Local pilot required')
const original=globalThis.fetch
globalThis.fetch=async(input, init)=>{
 const u=new URL(typeof input==='string'?input:input.url??input.href)
 if(u.hostname==='api.pwnedpasswords.com') return new Response('00000000000000000000000000000000000:0')
 if (u.hostname==='api.resend.com'&&u.pathname==='/emails'){
 const b=JSON.parse(init?.body??await input.text()),recipient=Array.isArray(b.to)?b.to[0]:b.to
 if(!/^[a-f0-9-]+@example\.invalid$/.test(recipient))throw Error('Niet-synthetisch adres')
 const links=(b.text||'').match(/https?:\/\/[^\s<>]+/g)||[]
 const verification=links.find(l=>{const v=new URL(l);return v.origin===process.env.BETTER_AUTH_URL&&v.pathname.includes('verify-email')})
 if(!verification)throw Error('Geen lokale verificatielink')
 const r=await original(process.env.PILOT_SINK,{method:'POST',headers:{authorization:process.env.PILOT_NONCE},body:JSON.stringify([recipient,verification])})
 if(!r.ok)throw Error('Lokale opvang niet beschikbaar')
 return Response.json({id:crypto.randomUUID()})
 }
 if(!['localhost','127.0.0.1','[::1]'].includes(u.hostname))throw Error('Externe verbinding geweigerd in de pilot')
 return original(input,init)
}

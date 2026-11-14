// Offline preparation only. Writes a private SQL import; never connects to Supabase.
// node scripts/import-invite-csv.mjs <csv> <batch> <monthly|yearly> <expiry ISO> <output.sql>
import fs from 'node:fs';
const [file,batch,plan,expiry,output]=process.argv.slice(2);
if(!file||!output||!/^\d{1,30}$/.test(batch??'')||!['monthly','yearly'].includes(plan)||!Number.isFinite(Date.parse(expiry))) throw new Error('Invalid import arguments');
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const lines=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);
const codes=lines.map(line=>{
  const cells=line.split(',').map(s=>s.trim().replace(/^"([^"]*)"$/,'$1'));
  if(cells.length!==2||!(/^[A-Z0-9]{8,32}$/).test(cells[0]))throw new Error('Expected the original two-column Apple CSV');
  const url=new URL(cells[1]);
  if(url.origin!=='https://apps.apple.com'||url.pathname!=='/redeem'||url.searchParams.get('id')!=='6820780610'||url.searchParams.get('code')!==cells[0])throw new Error('Code link does not match Juggle Dude');
  return cells[0];
});
if(!codes.length||codes.length>25000||new Set(codes).size!==codes.length)throw new Error('Invalid count or duplicate codes');
const label=plan==='monthly'?'Monthly tester invite':'Yearly tester invite';
const sql=`-- Private import generated from the original Apple CSV. Do not commit this file.
begin;
insert into private.admin_invite_batches(id,label,plan,expires_at) values(${quote(batch)},${quote(label)},${quote(plan)},${quote(new Date(expiry).toISOString())}) on conflict(id) do nothing;
do $$ begin
 if not exists(select 1 from private.admin_invite_batches where id=${quote(batch)} and plan=${quote(plan)} and expires_at=${quote(new Date(expiry).toISOString())}::timestamptz) then raise exception 'Existing batch metadata differs'; end if;
end $$;
insert into private.admin_invite_codes(batch_id,code,ordinal) values
${codes.map((code,i)=>`(${quote(batch)},${quote(code)},${i+1})`).join(',\n')}
on conflict(code) do nothing;
do $$ begin
 if (select count(*) from private.admin_invite_codes where batch_id=${quote(batch)} and code in (${codes.map(quote).join(',')}))<>${codes.length} then raise exception 'Codes belong to another batch'; end if;
end $$;
commit;
`;
fs.writeFileSync(output,sql,{mode:0o600,flag:'wx'});
console.log(JSON.stringify({batch,plan,codes:codes.length,expires:new Date(expiry).toISOString(),prepared:true}));

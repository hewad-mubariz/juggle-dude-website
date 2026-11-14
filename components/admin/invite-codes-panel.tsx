'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, RequestError } from '@/lib/admin/client';
import type { InviteCode, InviteInventory, InviteStatus } from '@/lib/admin/invites';
import './invite-codes.css';

const date = (value: string) => new Date(value).toLocaleString('en-GB', {timeZone:'Europe/Berlin',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
export function InviteCodesPanel() {
  const cache=useQueryClient();
  const [batch,setBatch]=useState('all'),[status,setStatus]=useState<InviteStatus>('unmarked'),[offset,setOffset]=useState(0);
  const [input,setInput]=useState(''),[found,setFound]=useState<InviteCode|null>(null),[message,setMessage]=useState('');
  const [fallback,setFallback]=useState<{id:string;text:string}|null>(null);
  const query=useQuery({queryKey:['admin-invites',batch,status,offset],queryFn:({signal})=>api<InviteInventory>(`invites?batch=${batch}&status=${status}&offset=${offset}`,undefined,signal),staleTime:30000});
  const find=useMutation({mutationFn:()=>api<InviteCode>('invites/find',{code:input}),onSuccess:row=>{setFound(row);setInput('');setMessage('');setFallback(null);}});
  const mark=useMutation({mutationFn:(row:InviteCode)=>api<InviteCode>(`invites/${row.id}/mark`,{used:!row.marked_used_at,version:row.version}),
    onSuccess:row=>{setFallback(null);setFound(old=>old?.id===row.id?row:old);setMessage(row.marked_used_at?'Marked used. Copying this code is now disabled.':'Used mark removed. This code is unmarked again.');void cache.invalidateQueries({queryKey:['admin-invites']});},
    onError:()=>{setFound(null);setFallback(null);void cache.invalidateQueries({queryKey:['admin-invites']});}});
  const copy=useMutation({mutationFn:async({row,kind}:{row:InviteCode;kind:'code'|'url'})=>{
    const value=await api<{code:string;url:string}>(`invites/${row.id}/copy`,{});
    try {await navigator.clipboard.writeText(value[kind]);setFallback(null);setMessage(kind==='code'?'Code copied. Its status has not changed.':'Redemption link copied. Its status has not changed.');}
    catch {setFallback({id:row.id,text:value[kind]});setMessage('Select and copy the text below. Its status has not changed.');}
  },onError:()=>void cache.invalidateQueries({queryKey:['admin-invites']})});
  useEffect(()=>{
    if([query.error,find.error,mark.error,copy.error].some(e=>e instanceof RequestError&&[401,403].includes(e.status))) void cache.invalidateQueries({queryKey:['admin-session']});
  },[query.error,find.error,mark.error,copy.error,cache]);
  function clear(){setOffset(0);setFound(null);setFallback(null);setMessage('');find.reset();mark.reset();copy.reset();}
  const data=query.data, busy=mark.isPending||copy.isPending;
  function rows(items:InviteCode[]) {return <div className="admin-table-wrap"><table className="admin-table invite-table"><thead><tr><th>Code</th><th>Offer</th><th>Status</th><th>Actions</th></tr></thead><tbody>{items.map(row=><tr key={row.id}>
    <td><code>•••• {row.suffix}</code><small>Row {row.ordinal} · Batch {row.batch_id}</small></td>
    <td><strong>{row.plan==='monthly'?'Monthly tester':'Yearly tester'}</strong><small>Redeem before {date(row.expires_at)} · Berlin</small></td>
    <td><span className={`invite-status ${row.marked_used_at?'used':row.expired?'expired':'unmarked'}`}>{row.marked_used_at?'Used':row.expired?'Expired':'Not marked used'}</span>{row.marked_used_at&&<small>Manually marked {date(row.marked_used_at)}</small>}</td>
    <td><div className="invite-actions"><button className="admin-btn secondary" disabled={busy||!!row.marked_used_at||row.expired} onClick={()=>copy.mutate({row,kind:'code'})}>Copy code</button><button className="admin-btn secondary" disabled={busy||!!row.marked_used_at||row.expired} onClick={()=>copy.mutate({row,kind:'url'})}>Copy link</button>
    <button className="invite-mark" disabled={busy} onClick={()=>mark.mutate(row)}>{mark.isPending&&mark.variables?.id===row.id?'Saving…':row.marked_used_at?'Undo used mark':'Mark used'}</button></div>
    {fallback?.id===row.id&&<input className="invite-copy-fallback" readOnly value={fallback.text} aria-label="Text to copy" onFocus={e=>e.target.select()}/>}</td>
  </tr>)}</tbody></table></div>;}
  return <div className="invite-panel">
    <div className="admin-page-heading"><div><p className="admin-kicker">A LITTLE PRO. A CLEAR LIST.</p><h1>Invite codes<span>.</span></h1><p>Your Apple tester codes, in one private place.</p></div><button className="admin-btn secondary" disabled={query.isFetching} onClick={()=>void cache.invalidateQueries({queryKey:['admin-invites']})}>{query.isFetching?'Refreshing…':'Refresh codes'}</button></div>
    <div className="invite-explanation"><strong>Mark a code used after the recipient confirms redemption.</strong><p>Copying or sending a code leaves it unmarked, as requested. Apple identifies the redeemed offer, but does not identify the individual one-time code in purchase records. “Not marked used” is your record—not an Apple check that a code is unused.</p></div>
    {data&&<section className="admin-stats invite-stats" aria-label="Invite code overview">
      <div className="admin-stat lime"><span>Not marked used</span><strong>{data.summary.unmarked.toLocaleString()}</strong><small>Not expired · usage unconfirmed</small></div>
      <div className="admin-stat"><span>Marked used</span><strong>{data.summary.used.toLocaleString()}</strong><small>Copying disabled</small></div>
      <div className="admin-stat"><span>Expired</span><strong>{data.summary.expired.toLocaleString()}</strong><small>Unmarked codes past their deadline</small></div>
      <div className="admin-stat"><span>Linked invite accounts</span><strong>{data.summary.linked_invite_accounts.toLocaleString()}</strong><small>Apple verified · all offers · exact codes unknown</small></div>
    </section>}
    <form className="invite-find" onSubmit={e=>{e.preventDefault();setFound(null);find.mutate();}}><label htmlFor="invite-find">Already redeemed a code? Find it here to mark it used.</label><div><input id="invite-find" autoComplete="off" spellCheck={false} maxLength={32} placeholder="Paste the exact code" value={input} onChange={e=>setInput(e.target.value)}/><button className="admin-btn secondary" disabled={find.isPending||!input.trim()}>{find.isPending?'Finding…':'Find code'}</button></div></form>
    {[query.error,find.error,mark.error,copy.error].filter(Boolean).map((e,i)=><div role="alert" className="admin-notice" key={i}>{e!.message}</div>)}
    {message&&<p role="status" className="admin-success">{message}</p>}
    {found&&<section className="admin-queue invite-found" aria-label="Found code"><div className="admin-queue-header"><h2>Matching code</h2><button className="invite-mark" onClick={()=>{setFound(null);setFallback(null);}}>Close result</button></div>{rows([found])}</section>}
    <section className="admin-queue" aria-label="Invite inventory"><div className="admin-queue-header invite-toolbar"><div><h2>Code lists <span>{data?.total??'—'}</span></h2><p>One-time codes from your original Apple CSV downloads.</p></div><div className="invite-filters"><label>Offer<select value={batch} onChange={e=>{setBatch(e.target.value);clear();}} disabled={busy}><option value="all">All offers</option>{data?.batches.map(b=><option value={b.id} key={b.id}>{b.label} · {b.total}</option>)}</select></label><label>Status<select value={status} onChange={e=>{setStatus(e.target.value as InviteStatus);clear();}} disabled={busy}><option value="unmarked">Not marked used</option><option value="used">Used</option><option value="expired">Expired</option><option value="all">All codes</option></select></label></div></div>
    {!data?<p className="admin-empty">{query.error?'Couldn’t load the code lists.':'Loading codes…'}</p>:data.rows.length?rows(data.rows):<div className="admin-empty"><h3>No codes in this view.</h3><p>Choose another offer or status.</p></div>}
    <footer className="admin-pagination"><span>{data?.rows.length?`${offset+1}–${offset+data.rows.length} of ${data.total}`:'0 shown'}</span><div><button disabled={offset===0||query.isFetching||busy} onClick={()=>{setOffset(offset-25);setFallback(null);}}>← Previous</button><button disabled={!data||offset+25>=data.total||query.isFetching||busy} onClick={()=>{setOffset(offset+25);setFallback(null);}}>Next →</button></div></footer></section>
    <p className="admin-bottom-note">Only you can see this inventory. Marking a code used does not redeem it, change a subscription or affect analytics. Code expiry is the redemption deadline, not the duration of Pro access.</p>
  </div>;
}

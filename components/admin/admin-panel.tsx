'use client';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { momentClip, momentID, momentTitle, timestamp } from '@/lib/admin/types';
import type { Attempt, Choice, FinishInput, Moment, Queue, ReviewDetail } from '@/lib/admin/types';
import './admin.css';

class RequestError extends Error { constructor(message:string,public status:number) { super(message); } }
async function api<T>(path:string,body?:unknown):Promise<T> {
 const url=new URL('/api/admin/'+path,window.location.origin); url.pathname=url.pathname.replace(/\/?$/,'/');
 const response=await fetch(url,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',
  ...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
 const data=await response.json();
 if(!response.ok) throw new RequestError(data.error||'Something went wrong. Please retry.',response.status);
 return data;
}
const date=(value:string|null)=>value?new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'Not submitted';
function Icon({name,...props}:{name:'check'|'close'|'play'|'shield'|'arrow'|'refresh'|'logout'|'inbox'}&React.SVGProps<SVGSVGElement>) {
 const paths={check:'m5 12 4 4L19 6',close:'m6 6 12 12M6 18 18 6',play:'m9 5 11 7-11 7Z',shield:'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7ZM8 12l3 3 5-6',arrow:'M4 12h16m-6-6 6 6-6 6',refresh:'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1',logout:'M9 4H4v16h5m6-14 6 6-6 6m-5-6h11',inbox:'M3 4h18v16H3ZM3 13h5l2 3h4l2-3h5'};
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]}/></svg>;
}
function Brand() { return <a href="/" className="admin-brand" aria-label="Juggle Dude home">JUGGLE <span>DUDE.</span></a>; }
function Notice({children}:{children:React.ReactNode}) { return <div role="alert" className="admin-notice">{children}</div>; }
export function AdminPanel() {
 const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:(n,e)=>!(e instanceof RequestError&&[401,403,400,404].includes(e.status))&&n<1,staleTime:10000,refetchOnWindowFocus:false},mutations:{retry:false}}}));
 return <QueryClientProvider client={client}><AdminSession /></QueryClientProvider>;
}
function AdminSession() {
 const cache=useQueryClient();
 const session=useQuery({queryKey:['admin-session'],queryFn:()=>api<{email:string}>('session'),refetchInterval:60000,retry:false});
 useEffect(()=>{ if(session.error instanceof RequestError&&session.error.status===401) cache.removeQueries({predicate:q=>q.queryKey[0]!=='admin-session'}); },[session.error,cache]);
 if(session.isPending) return <main id="main-content" className="admin-loading"><Brand/><p>Opening your review desk…</p></main>;
 if(!session.data||session.isError) return <Login serviceError={session.error instanceof RequestError&&session.error.status!==401?session.error.message:undefined}/>;
 return <Desk email={session.data.email}/>;
}
function Login({serviceError}:{serviceError?:string}) {
 const cache=useQueryClient(); const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const login=useMutation({mutationFn:()=>api<{email:string}>('login',{email:email.trim(),password}),onSuccess:data=>{setPassword('');cache.setQueryData(['admin-session'],data);}});
 function submit(e:FormEvent) { e.preventDefault(); if(!login.isPending) login.mutate(); }
 return <main id="main-content" className="admin-login"><div className="admin-login-story"><Brand/><span className="admin-kicker">THE REVIEW DESK</span><h1>Every touch.<br/>A fair call.</h1><p>Review the moments. Check the evidence.<br/>Help players keep the score they earned.</p><div className="admin-story-ball" aria-hidden="true">✦</div><div className="admin-story-footer"><Icon name="shield"/> PRIVATE CLIPS. ACCOUNTABLE DECISIONS.</div></div>
 <div className="admin-login-form"><div className="admin-lock"><Icon name="shield"/></div><p className="admin-kicker">JUGGLE DUDE ADMIN</p><h2>Welcome back.</h2><p className="admin-subtitle">Sign in to review player touch checks.</p>
 <form onSubmit={submit}><label htmlFor="admin-email">Email address</label><input id="admin-email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} placeholder="Your admin email" disabled={login.isPending}/>
 <label htmlFor="admin-password">Password</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required maxLength={256} placeholder="Enter your password" disabled={login.isPending}/>
 {(login.error||serviceError)&&<Notice>{login.error?.message||serviceError}</Notice>}
 <button className="admin-btn primary" disabled={login.isPending} type="submit">{login.isPending?'Signing in…':'Sign in to review desk'}<Icon name="arrow"/></button></form><p className="admin-login-note">Authorised reviewers only. Sessions expire after four hours.</p><a className="admin-back" href="/">← Back to Juggle Dude</a></div></main>;
}
function Desk({email}:{email:string}) {
 const cache=useQueryClient();
 const [status,setStatus]=useState('pending'),[offset,setOffset]=useState(0),[search,setSearch]=useState(''),[selected,setSelected]=useState<string|null>(null),[dirty,setDirty]=useState(false),[toast,setToast]=useState('');
 const queue=useQuery({queryKey:['admin-queue',status,offset],queryFn:()=>api<Queue>(`queue?status=${status}&offset=${offset}`),refetchInterval:30000});
 const logout=useMutation({mutationFn:()=>api('logout',{}),onSuccess:()=>{cache.clear();cache.setQueryData(['admin-session'],null);}});
 useEffect(()=>{
  const handler=(event:BeforeUnloadEvent)=>{if(dirty)event.preventDefault();};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);
 },[dirty]);
 function canLeave() { return !dirty||window.confirm('Leave this request? Your unsaved decisions will be discarded.'); }
 function choose(id:string|null) {if(!canLeave())return;setDirty(false);setSelected(id);setToast('');}
 function filter(next:string) {if(!canLeave())return;setStatus(next);setOffset(0);setSelected(null);setDirty(false);}
 function saved() {setDirty(false);setSelected(null);setToast('Review saved. The decision is available to the player on their next account refresh.');void cache.invalidateQueries({queryKey:['admin-queue']});}
 const rows=(queue.data?.items||[]).filter(a=>(a.player_name+' '+a.id).toLowerCase().includes(search.toLowerCase()));
 return <div className="admin-shell"><aside className="admin-sidebar"><Brand/><div className="admin-sidebar-label">WORKSPACE</div><button className="admin-nav-item" onClick={()=>choose(null)}><Icon name="inbox"/>Touch checks<span>{queue.data?.pending??'—'}</span></button><div className="admin-sidebar-bottom"><Icon name="shield"/><strong>Private review desk</strong><p>Only finalised batches update the player’s account.</p><a href="/support/">Support ↗</a></div></aside>
 <div className="admin-workspace"><header className="admin-topbar"><span className="admin-topbar-crumb">Workspace <span>/</span> Touch checks</span><div><span className="admin-avatar">JD</span><span className="admin-email">{email}</span><button className="admin-icon-btn" title="Sign out" aria-label="Sign out" disabled={logout.isPending} onClick={()=>{if(canLeave())logout.mutate();}}><Icon name="logout"/></button></div></header>
 <main id="main-content" className="admin-main"><div className="admin-page-heading"><div><p className="admin-kicker">THE HUMAN CHECK</p><h1>Touch reviews<span>.</span></h1><p>Small moments. Fair scores. One review at a time.</p></div><button className="admin-btn secondary" onClick={()=>void queue.refetch()} disabled={queue.isFetching}><Icon name="refresh"/>{queue.isFetching?'Refreshing…':'Refresh queue'}</button></div>
 {logout.error&&<Notice>{logout.error.message}</Notice>}{toast&&<div role="status" className="admin-success"><Icon name="check"/>{toast}</div>}
 <section className="admin-stats" aria-label="Review overview">{[['Waiting for review',queue.data?.pending,'Your next calls','lime'],['Confirmed requests',queue.data?.approved,'Saved to player accounts',''],['Rejected requests',queue.data?.rejected,'Device score kept','']].map(([label,value,caption,tone])=><div className={`admin-stat ${tone}`} key={label}><span>{label}</span><strong>{value??'—'}</strong><small>{caption}</small></div>)}</section>
 {selected?<Review key={selected} id={selected} onClose={()=>choose(null)} onDirty={setDirty} onSaved={saved}/>:<section className="admin-queue"><div className="admin-queue-header"><div><h2>Review queue <span>{queue.data?.total??'—'}</span></h2><p>Open a request to inspect its submitted clips.</p></div><label className="admin-search"><span className="sr-only">Search this page</span><input type="search" placeholder="Search this page…" value={search} onChange={e=>setSearch(e.target.value)} maxLength={100}/></label></div>
 <div className="admin-tabs" role="group" aria-label="Filter review requests">{[['pending','Waiting'],['approved','Confirmed'],['rejected','Rejected']].map(([value,label])=><button key={value} aria-pressed={status===value} className={status===value?'active':''} onClick={()=>filter(value)}>{label}</button>)}</div>
 {queue.error?<Notice>{queue.error.message} <button onClick={()=>void queue.refetch()}>Retry</button></Notice>:queue.isPending?<p className="admin-empty">Loading requests…</p>:!rows.length?<div className="admin-empty"><div className="admin-empty-icon"><Icon name="check"/></div><h3>{search?'No matches on this page':status==='pending'?'You’re all caught up.':'No reviews here yet.'}</h3><p>{search?'Try a different name or request ID.':'Player requests will appear here when they reach the account service.'}</p></div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PLAYER / REQUEST</th><th>REQUESTED STREAK</th><th>MOMENTS</th><th>SUBMITTED</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{rows.map(a=><tr key={a.id}><td><div className="admin-player"><span className="admin-player-initial">{a.player_name.slice(0,2).toUpperCase()}</span><div><strong>{a.player_name}</strong><small>#{a.id.slice(0,8)}</small></div></div></td><td><strong className="admin-score">{a.proposed_count}</strong><small>Device streak {a.device_count??'unavailable'}</small></td><td><span className="admin-moment-count">{a.touch_review?.moments.filter(m=>m.kind!=='continuityGap').length??0} to check</span></td><td>{date(a.submitted_at)}</td><td><button className="admin-row-action" onClick={()=>choose(a.id)}>{status==='pending'?'Review':'View'}<Icon name="arrow"/></button></td></tr>)}</tbody></table></div>}
 <footer className="admin-pagination"><span>{queue.data?.total?`${offset+1}–${Math.min(offset+25,queue.data.total)} of ${queue.data.total} requests`:'0 requests'}</span><div><button disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-25))}>← Previous</button><button disabled={!queue.data||offset+25>=queue.data.total} onClick={()=>setOffset(offset+25)}>Next →</button></div></footer></section>}
 <p className="admin-bottom-note"><Icon name="shield"/>Original clips stay private. Each finished review is recorded with your admin identity.</p></main></div></div>;
}
function Review({id,onClose,onDirty,onSaved}:{id:string;onClose:()=>void;onDirty:(v:boolean)=>void;onSaved:()=>void}) {
 const detail=useQuery({queryKey:['admin-detail',id],queryFn:()=>api<ReviewDetail>('attempts/'+id),staleTime:Infinity,gcTime:0});
 if(detail.isPending) return <section className="admin-queue admin-empty">Loading review…</section>;
 if(detail.error) return <section className="admin-queue"><button className="admin-back" onClick={onClose}>← Back to queue</button><Notice>{detail.error.message} <button onClick={()=>void detail.refetch()}>Retry</button></Notice></section>;
 if(!detail.data) return null;
 return <ReviewContent data={detail.data} onClose={onClose} onDirty={onDirty} onSaved={onSaved}/>;
}
function ReviewContent({data,onClose,onDirty,onSaved}:{data:ReviewDetail;onClose:()=>void;onDirty:(v:boolean)=>void;onSaved:()=>void}) {
 const a=data.attempt, moments=a.touch_review?.moments??[],askable=moments.filter(m=>m.kind!=='continuityGap'),locked=a.status!=='pending';
 const [choices,setChoices]=useState<Record<string,Choice['decision']>>(()=>Object.fromEntries((data.previous?.choices??[]).map(c=>[c.id,c.decision])));
 const [index,setIndex]=useState(0),[reason,setReason]=useState(a.review_reason??''),[count,setCount]=useState(String(a.reviewed_count??a.proposed_count)),[start,setStart]=useState(String((a.reviewed_start_ms??a.proposed_start_ms)/1000)),[end,setEnd]=useState(String((a.reviewed_end_ms??a.proposed_end_ms)/1000));
 const [watched,setWatched]=useState(false),[summary,setSummary]=useState(false),[legacyApprove,setLegacyApprove]=useState(true),[scoreChecked,setScoreChecked]=useState(false),[mediaError,setMediaError]=useState(''),[duration,setDuration]=useState(0);
 const [visited,setVisited]=useState<Set<string>>(new Set());const video=useRef<HTMLVideoElement>(null);const summarySection=useRef<HTMLElement>(null);const requestID=useRef<string|null>(null);
 const verify=useMutation({mutationFn:()=>api<{verified:boolean}>('attempts/'+a.id+'/verify',{}),onSuccess:()=>setMediaError('')});
 const save=useMutation({mutationFn:(body:FinishInput)=>api('attempts/'+a.id+'/finish',body),onSuccess:onSaved});
 const current=moments[index],confirmed=askable.filter(m=>choices[momentID(m)]==='confirm').length,rejected=askable.filter(m=>choices[momentID(m)]==='reject').length;
 const done=askable.every(m=>choices[momentID(m)]),mixed=confirmed>0&&rejected>0,approved=askable.length?confirmed>0:legacyApprove;
 const clip=current&&duration?momentClip(a,current,duration):null;
 const canSave=done&&watched&&reason.trim().length>0&&verify.isSuccess&&!mediaError&&(!approved||(Number.isInteger(Number(count))&&Number(count)>=1&&Number(count)<=a.proposed_count&&Number(start)>=0&&Number(end)>Number(start)&&Number(end)*1000<=a.duration_ms&&(!mixed||scoreChecked)));
 function dirty(){onDirty(true);requestID.current=null;save.reset();}
 function select(i:number){setIndex(i);setSummary(false);setMediaError('');}
 function seek(){if(video.current&&clip)video.current.currentTime=clip.start;}
 useEffect(()=>{if(summary)summarySection.current?.scrollIntoView({behavior:'smooth',block:'start'});},[summary]);
 useEffect(()=>{seek();},[index,duration]); // Seeking follows the selected recording moment.
 function decide(decision:Choice['decision']) {
  if(!current||locked||!visited.has(momentID(current)))return;
  setChoices(v=>({...v,[momentID(current)]:decision}));setScoreChecked(false);dirty();
  const next=moments.findIndex((m,i)=>i>index&&m.kind!=='continuityGap'&&!choices[momentID(m)]);
  if(next>=0)setIndex(next);
 }
 function confirmAll(){setChoices(Object.fromEntries(askable.map(m=>[momentID(m),'confirm'])));setCount(String(a.proposed_count));setStart(String(a.proposed_start_ms/1000));setEnd(String(a.proposed_end_ms/1000));setScoreChecked(false);dirty();setSummary(true);}
 function finish(){if(!canSave||save.isPending)return;if(!requestID.current)requestID.current=crypto.randomUUID();save.mutate({requestId:requestID.current,choices:askable.map(m=>({id:momentID(m),decision:choices[momentID(m)]})),count:approved?Number(count):null,startMS:approved?Math.round(Number(start)*1000):null,endMS:approved?Math.round(Number(end)*1000):null,reason:reason.trim(),watched:true});}
 return <fieldset disabled={save.isPending} className="admin-review"><div className="admin-review-heading"><button onClick={onClose} className="admin-back">← Back to queue</button><span className={`admin-status ${a.status}`}>{a.status==='pending'?'Waiting for review':a.status}</span></div><div className="admin-review-title"><div className="admin-player"><span className="admin-player-initial">{a.player_name.slice(0,2).toUpperCase()}</span><div><h2>{a.player_name}’s touch check</h2><p>#{a.id.slice(0,8)} · {date(a.submitted_at)}</p></div></div><div><strong>{a.proposed_count}</strong><small>requested streak · device {a.device_count??'unavailable'}</small></div></div>
 {a.touch_review&&!a.touch_review.complete&&<Notice>The device report is incomplete. Review only the submitted evidence; do not assume it describes every contact.</Notice>}
 {a.appeal_text&&<Notice>Player appeal: {a.appeal_text}</Notice>}
 {locked&&<div className="admin-success"><Icon name="check"/>This review is finalised. {a.reviewed_count?`Verified streak: ${a.reviewed_count}.`:'The device score was kept.'} {a.review_reason}</div>}
 <div className="admin-review-grid"><div className="admin-evidence"><div className="admin-video-top"><span><span className="admin-private-dot"/>PRIVATE EVIDENCE</span><span>{moments.length?`Moment ${index+1} / ${moments.length}`:'Submitted video'}</span></div>
 <div className="admin-video-stage">{verify.isSuccess&&!a.video_deleted_at&&!a.video_delete_requested_at?<video ref={video} src={`/api/admin/attempts/${a.id}/video/`} controls controlsList="nodownload noremoteplayback" disablePictureInPicture playsInline preload="metadata" onLoadedMetadata={e=>{e.currentTarget.playbackRate=0.5;setDuration(e.currentTarget.duration);}} onPlaying={()=>setMediaError('')} onEnded={()=>{if(current)setVisited(old=>new Set([...old,momentID(current)]));}} onError={()=>setMediaError('The video could not play. Try verifying again or use a browser that supports its format.')} onTimeUpdate={e=>{const v=e.currentTarget;if(current&&v.readyState>=2&&!v.seeking&&!v.paused&&clip&&v.currentTime>=clip.end-.15&&v.currentTime<=clip.end+.3){setVisited(old=>old.has(momentID(current))?old:new Set([...old,momentID(current)]));}if(clip&&v.currentTime>=clip.end&&!v.paused){v.pause();}}}/>:<div className="admin-video-placeholder"><Icon name="play"/><h3>{a.video_deleted_at||a.video_delete_requested_at?'Video no longer available':verify.isPending?'Checking the original…':'Start with the evidence.'}</h3><p>{verify.isPending?'Verifying the submitted file before it can be reviewed.':'Load the private video to inspect each requested moment.'}</p><button className="admin-btn primary" disabled={verify.isPending||Boolean(a.video_deleted_at||a.video_delete_requested_at)} onClick={()=>verify.mutate()}>{verify.isPending?'Verifying…':'Verify & load clips'}</button></div>}</div>
 {(verify.error||mediaError)&&<Notice>{verify.error?.message||mediaError} <button onClick={()=>verify.mutate()} disabled={verify.isPending}>Retry video</button></Notice>}
 <div className="admin-clip-controls"><button className="admin-btn secondary" disabled={!verify.isSuccess||!clip} onClick={()=>{seek();void video.current?.play().catch(()=>setMediaError('Press play on the video to start playback.'));}}><Icon name="refresh"/>Replay moment</button><label>Speed<select aria-label="Playback speed" defaultValue="0.5" onChange={e=>{if(video.current)video.current.playbackRate=Number(e.target.value);}}><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1">1×</option></select></label></div>
 {current&&<div className="admin-current-moment"><span className="admin-kicker">RECORDING TIME {timestamp(current.timeMS)}</span><h3>{momentTitle[current.kind]}</h3><p>{current.kind==='continuityGap'?'Context only: a gap does not by itself prove a missed touch.':'The player says this was a valid touch. Confirm the touch if the clip supports it; reject the request if it does not.'}</p>
 {!locked&&current.kind!=='continuityGap'&&<div className="admin-decision-buttons"><button className={`admin-btn confirm ${choices[momentID(current)]==='confirm'?'chosen':''}`} disabled={!visited.has(momentID(current))||!verify.isSuccess} onClick={()=>decide('confirm')}><Icon name="check"/>Confirm touch</button><button className={`admin-btn reject ${choices[momentID(current)]==='reject'?'chosen':''}`} disabled={!visited.has(momentID(current))||!verify.isSuccess} onClick={()=>decide('reject')}><Icon name="close"/>Reject request</button></div>}
 {!locked&&!visited.has(momentID(current))&&<small>Play this moment through before making a decision.</small>}</div>}
 {!moments.length&&<Notice>This older request has no individual moment markers. Watch the submitted video and verify the streak manually.</Notice>}
 <div className="admin-video-footer"><Icon name="shield"/>{verify.isSuccess?'Original file integrity verified.':'Evidence is checked against the submission’s size and SHA-256.'}</div></div>
 <aside className="admin-moments"><div className="admin-moments-heading"><h3>Requested moments</h3><span>{confirmed+rejected}/{askable.length}</span></div><div className="admin-moment-list">{moments.map((m,i)=><button key={momentID(m)+i} className={`admin-moment ${index===i&&!summary?'active':''}`} onClick={()=>select(i)}><span className={`admin-choice-dot ${choices[momentID(m)]??''}`}>{choices[momentID(m)]==='confirm'?'✓':choices[momentID(m)]==='reject'?'×':String(i+1).padStart(2,'0')}</span><span><strong>{momentTitle[m.kind]}</strong><small>{timestamp(m.timeMS)} · {m.kind==='continuityGap'?'Context':choices[momentID(m)]??'Waiting for your call'}</small></span></button>)}</div>
 {!locked&&<div className="admin-batch-actions"><button className="admin-btn secondary" onClick={confirmAll} disabled={!verify.isSuccess||!askable.length||!askable.every(m=>visited.has(momentID(m)))}><Icon name="check"/>Confirm all touches</button><p>Available after you have played every requested moment. Review the batch before saving.</p><button className="admin-btn primary" onClick={()=>setSummary(true)} disabled={!done||!verify.isSuccess}>Review batch<Icon name="arrow"/></button></div>}
 {locked&&data.previous&&<p className="admin-audit-note">Batch saved {date(data.previous.created_at)}.</p>}</aside></div>
 {!locked&&summary&&<section ref={summarySection} className="admin-finalise" aria-label="Finalise review"><div><p className="admin-kicker">READY FOR THE FINAL CALL</p><h2>Check the batch. Then finish.</h2><p>{confirmed} confirmed · {rejected} rejected{!askable.length?' · Legacy request':''}. Nothing changes on the player’s account until you finish.</p></div>
 {!askable.length&&<label className="admin-check"><input type="checkbox" checked={legacyApprove} onChange={e=>{setLegacyApprove(e.target.checked);dirty();}}/>Approve this legacy request with the verified score below</label>}
 {approved&&<><div className="admin-score-fields"><label>Verified streak<input type="number" min="1" max={a.proposed_count} step="1" value={count} onChange={e=>{setCount(e.target.value);setScoreChecked(false);dirty();}}/></label><label>Start in recording (seconds)<input type="number" min="0" max={a.duration_ms/1000} step="0.001" value={start} onChange={e=>{setStart(e.target.value);setScoreChecked(false);dirty();}}/></label><label>End in recording (seconds)<input type="number" min="0" max={a.duration_ms/1000} step="0.001" value={end} onChange={e=>{setEnd(e.target.value);setScoreChecked(false);dirty();}}/></label></div><p className="admin-field-help">{mixed?'Mixed decisions can split or join a streak. The server does not store every original touch timestamp, so a partial score cannot be calculated automatically. Enter only a streak you can verify from the available evidence.':'The requested streak is prefilled. Verify the count and recording times against the submitted evidence.'}</p>{mixed&&<label className="admin-check"><input type="checkbox" checked={scoreChecked} onChange={e=>{setScoreChecked(e.target.checked);dirty();}}/>I checked the final streak count and boundaries for these mixed decisions.</label>}</>}
 <label className="admin-summary-label">Decision summary<textarea maxLength={1000} rows={3} placeholder="Explain the decision. The player can see this summary." value={reason} onChange={e=>{setReason(e.target.value);dirty();}}/></label><label className="admin-check"><input type="checkbox" checked={watched} onChange={e=>{setWatched(e.target.checked);dirty();}}/>I watched the submitted evidence and checked the decisions and final score.</label>
 {save.error&&<Notice>{save.error.message}</Notice>}
 <div className="admin-finalise-footer"><p>Saved to the existing account review record. The app reads it on refresh.</p><button className="admin-btn primary" onClick={finish} disabled={!canSave||save.isPending}>{save.isPending?'Saving review…':'Finish & sync review'}<Icon name="check"/></button></div></section>}
 </fieldset>;
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { analyticsPlayerSchema, analyticsSchema, leaderboardSchema } from '../../lib/admin/validation';
import type { Analytics, PlayerDetail } from '../../lib/admin/analytics';

const migration = readFileSync(new URL('../../supabase/migrations/202611010001_admin_analytics.sql', import.meta.url), 'utf8');
const reviewMigration = readFileSync(new URL('../../supabase/migrations/202610230002_admin_review_panel.sql', import.meta.url), 'utf8');
const sessionFunction = reviewMigration.slice(reviewMigration.indexOf('create function public.admin_review_session_valid('), reviewMigration.indexOf('create function public.admin_review_logout('));
const token = 'a'.repeat(64);
const user = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const session = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function database() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema private; create schema auth;
    create table auth.users(id uuid primary key, email text, last_sign_in_at timestamptz);
    create table private.admin_review_sessions(token_hash text, expires_at timestamptz);
    create table profiles(id uuid primary key, display_name text, country_code text, created_at timestamptz, deletion_requested_at timestamptz);
    create table juggling_sessions(user_id uuid, id uuid, touch_count integer, duration_ms integer, source text,
      completed_at timestamptz, received_at timestamptz default now(), app_version text, counter_version text default 'counter-test', score_status text default 'device_reported',
      streak_touches integer, streak_start_ms integer, streak_end_ms integer, primary key(user_id,id));
    create table private.apple_subscriptions(environment text, original_transaction_id text, user_id uuid,
      product_id text, status integer, access_until_ms bigint, updated_at timestamptz default now());`);
  await db.exec(sessionFunction);
  await db.exec(migration);
  await db.exec(readFileSync(new URL('../../supabase/migrations/202611020001_admin_analytics_details.sql', import.meta.url), 'utf8'));
  await db.query('insert into private.admin_review_sessions values ($1,now()+interval \'1 hour\')', [token]);
  await db.query(`insert into profiles values
    ($1,'Player A','DE',now()-interval '2 days',null),
    ($2,'Player B',null,now()-interval '1 day',null),
    ($3,'No sessions','FR',now(),null),
    ($4,'Deleted','DE',now(),now()),
    ($5,'Older account','FR',now()-interval '60 days',null)`, [1, 2, 3, 4, 5].map(user));
  await db.query(`insert into juggling_sessions(user_id,id,touch_count,duration_ms,source,completed_at,app_version) values
    ($1,$6,10,10000,'recording',now(),'1.2.0'),
    ($1,$7,20,20000,'gallery',now()-interval '1 day','1.1.0'),
    ($2,$6,30,30000,'recording',now(),'1.1.0'),
    ($4,$6,99,90000,'recording',now(),'deleted-version'),
    ($5,$6,40,40000,'recording',now()-interval '40 days','1.0.0'),
    ($3,$6,50,50000,'recording',now()+interval '1 day','future-version')`,
    [...[1, 2, 3, 4, 5].map(user), session(1), session(2)]);
  await db.query(`insert into private.apple_subscriptions(environment,original_transaction_id,user_id,product_id,status,access_until_ms) values
    ('Production','1',$1,'com.hewad.juggledude.pro.yearly',1,extract(epoch from now()+interval '1 day')*1000),
    ('Production','2',$1,'com.hewad.juggledude.pro.monthly',4,extract(epoch from now()+interval '2 days')*1000),
    ('Production','3',$2,'com.hewad.juggledude.pro.monthly',1,extract(epoch from now()-interval '1 day')*1000),
    ('Sandbox','4',$3,'com.hewad.juggledude.pro.yearly',1,extract(epoch from now()+interval '1 day')*1000),
    ('Production','5',$4,'com.hewad.juggledude.pro.yearly',1,extract(epoch from now()+interval '1 day')*1000),
    ('Production','6',$5,'com.hewad.juggledude.pro.yearly',5,extract(epoch from now()+interval '1 day')*1000)`, [1, 2, 3, 4, 5].map(user));
  await db.query('insert into auth.users values ($1,$2,now())', [user(1), 'player-a@example.test']);
  return db;
}
async function analytics(db: PGlite, args: unknown[] = [token, 7, 'all', 'sessions', 0]) {
  return (await db.query<{ value: Analytics }>('select public.admin_analytics($1,$2,$3,$4,$5) as value', args)).rows[0].value;
}

test('analytics accepts only bounded presets and whole pages', () => {
  assert.deepEqual(analyticsSchema.parse({}), { days: 7, source: 'all', list: 'sessions', offset: 0 });
  for (const value of [{ days: '365' }, { source: 'bad' }, { list: 'sql' }, { offset: '-25' }, { offset: '1' }, { offset: '100025' }, { offset: '' }, { sql: 'select *' }]) {
    assert.equal(analyticsSchema.safeParse(value).success, false);
  }
});

test('counts distinct people and return days, excludes deleted/future sessions, fills quiet days', async () => {
  const db = await database(); try {
    const data = await analytics(db);
    assert.deepEqual(data.summary, { players: 2, sessions: 3, recordings: 2, imports: 1, returning_players: 1,
      average_duration_seconds: 20, new_accounts: 3, new_accounts_with_sessions: 2, pro_accounts: 1 });
    assert.equal(data.daily.length, 7);
    assert.equal(data.daily.reduce((n, d) => n + d.sessions, 0), 3);
    assert.ok(data.daily.some(d => d.sessions === 0 && d.players === 0));
    assert.deepEqual(data.versions, [{ app_version: '1.1.0', players: 1 }, { app_version: '1.2.0', players: 1 }]);
    assert.equal(data.countries.length, 2);
    assert.equal(data.total, 3);
    assert.equal(data.rows.length, 3, 'same session UUID on two accounts is not deduplicated');
    assert.ok(data.rows.every(r => !('email' in r) && !('original_transaction_id' in r)));
  } finally { await db.close(); }
});

test('source filters activity but not account acquisition or current Pro; billing chains are deduplicated', async () => {
  const db = await database(); try {
    const data = await analytics(db, [token, 7, 'gallery', 'players', 0]);
    assert.equal(data.summary.sessions, 1); assert.equal(data.summary.players, 1); assert.equal(data.summary.returning_players, 0);
    assert.equal(data.summary.new_accounts, 3); assert.equal(data.summary.pro_accounts, 1);
    assert.deepEqual(data.versions, [{ app_version: '1.1.0', players: 1 }]);
    const accounts = await analytics(db, [token, 7, 'gallery', 'accounts', 0]);
    assert.equal(accounts.list, 'accounts');
    if (accounts.list === 'accounts') assert.equal(accounts.rows.find(a => a.user_id === user(2))?.sessions, 1);
    const pro = await analytics(db, [token, 7, 'gallery', 'pro', 0]);
    assert.equal(pro.total, 1); assert.equal(pro.list, 'pro');
    if (pro.list === 'pro') { assert.equal(pro.rows[0].status, 4); assert.equal(pro.rows[0].user_id, user(1)); }
    const longer = await analytics(db, [token, 90, 'all', 'sessions', 0]);
    assert.equal(longer.summary.sessions, 4); assert.equal(longer.daily.length, 90);
  } finally { await db.close(); }
});

test('German calendar boundary is inclusive; pagination has no duplicate or missing records', async () => {
  const db = await database(); try {
    const first = await analytics(db);
    await db.query(`insert into juggling_sessions(user_id,id,touch_count,duration_ms,source,completed_at,app_version) values
      ($1,$2,1,1000,'recording',$4,'1.2.0'),
      ($1,$3,1,1000,'recording',$4::timestamptz-interval '1 millisecond','1.2.0')`, [user(1), session(90), session(91), first.starts_at]);
    const boundary = await analytics(db);
    assert.equal(boundary.summary.sessions, 4);
    assert.equal(boundary.daily[0].sessions, 1);
    for (let n = 100; n < 155; n++) await db.query(`insert into juggling_sessions(user_id,id,touch_count,duration_ms,source,completed_at,app_version)
      values($1,$2,1,1000,'recording',now(),'1.2.0')`, [user(1), session(n)]);
    const pages = await Promise.all([0, 25, 50].map(offset => analytics(db, [token, 7, 'all', 'sessions', offset])));
    assert.deepEqual(pages.map(p => p.rows.length), [25, 25, 9]);
    assert.ok(pages.every(p => p.total === 59 && p.summary.sessions === 59));
    assert.equal(new Set(pages.flatMap(p => p.list === 'sessions' ? p.rows.map(r => `${r.user_id}/${r.id}`) : [])).size, 59);
  } finally { await db.close(); }
});

test('empty data is real zero; invalid, expired and mobile callers fail closed', async () => {
  const db = await database(); try {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(analytics(db), /permission denied/);
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    assert.equal((await analytics(db)).summary.sessions, 3);
    await assert.rejects(analytics(db, ['wrong', 7, 'all', 'sessions', 0]), /Unauthorized/);
    await assert.rejects(analytics(db, [token, 365, 'all', 'sessions', 0]), /Invalid analytics/);
    await assert.rejects(analytics(db, [token, 7, 'all', 'sessions', 1]), /Invalid analytics/);
    await db.exec('reset role');
    await db.exec('delete from juggling_sessions; delete from profiles; delete from private.apple_subscriptions');
    const empty = await analytics(db);
    assert.equal(empty.total, 0); assert.equal(empty.summary.pro_accounts, 0); assert.deepEqual(empty.rows, []);
    assert.equal(empty.daily.length, 7); assert.ok(empty.daily.every(d => d.sessions === 0));
    await db.exec("update private.admin_review_sessions set expires_at = now()-interval '1 minute'");
    await assert.rejects(analytics(db), /Unauthorized/);
  } finally { await db.close(); }
});

async function player(db: PGlite, id = user(1), offset = 0, selected: string | null = null, key = token) {
  return (await db.query<{ value: PlayerDetail | null }>('select public.admin_analytics_player($1,$2,$3,$4) as value', [key, id, offset, selected])).rows[0].value;
}

test('player detail returns contact, complete history and production status, scoped to the exact account', async () => {
  const db = await database(); try {
    const a = (await player(db, user(1), 0, session(1)))!;
    assert.equal(a.profile.email, 'player-a@example.test');
    assert.equal(a.summary.sessions, 2); assert.equal(a.summary.touches, 30);
    assert.equal(a.summary.most_touches, 20); assert.equal(a.summary.latest_app_version, '1.2.0');
    assert.equal(a.sessions.length, 2); assert.equal(a.selected_session?.touch_count, 10);
    assert.equal(a.pro.active, true); assert.equal(a.pro.total, 2);
    assert.ok(a.pro.subscriptions.every(s => s.has_access));
    assert.equal(a.selected_session?.counter_version, 'counter-test');
    assert.ok(!JSON.stringify(a).includes('original_transaction_id'));
    const b = (await player(db, user(2), 0, session(1)))!;
    assert.equal(b.selected_session?.touch_count, 30, 'shared UUID resolves only in selected account');
    assert.equal(b.pro.active, false, 'expired timestamp overrides stored active status');
    assert.equal(b.pro.subscriptions[0].status, 1, 'still shows stored status honestly');
    assert.equal((await player(db, user(2), 0, session(2)))!.selected_session, null, 'does not leak another account session');
    const empty = (await player(db, user(3)))!;
    assert.equal(empty.summary.sessions, 0, 'future-dated session is excluded');
    assert.equal(empty.pro.total, 0, 'sandbox is excluded'); assert.equal(empty.pro.active, false);
    assert.equal(empty.profile.email, null); assert.equal(empty.summary.most_touches, null);
    assert.equal((await player(db, user(5)))!.summary.sessions, 1, 'lifetime includes old sessions');
    assert.equal((await player(db, user(5)))!.pro.active, false, 'revoked subscriptions do not grant access');
    assert.equal(await player(db, user(4)), null, 'deletion pending hides account');
    assert.equal(await player(db, user(99)), null, 'unknown account is absent');
  } finally { await db.close(); }
});

test('player history pagination, strict route parameters and private authorization', async () => {
  assert.deepEqual(analyticsPlayerSchema.parse({}), { offset: 0 });
  for (const invalid of [{ offset: '1' }, { offset: '-25' }, { offset: '100025' }, { session: 'bad' }, { email: 'no' }]) {
    assert.equal(analyticsPlayerSchema.safeParse(invalid).success, false);
  }
  const db = await database(); try {
    for (let n = 100; n < 155; n++) await db.query(`insert into juggling_sessions(user_id,id,touch_count,duration_ms,source,completed_at,app_version)
      values($1,$2,1,1000,'recording',now(),'1.2.0')`, [user(1), session(n)]);
    const pages = await Promise.all([0, 25, 50].map(offset => player(db, user(1), offset, session(2))));
    assert.deepEqual(pages.map(p => p!.sessions.length), [25, 25, 7]);
    assert.equal(new Set(pages.flatMap(p => p!.sessions.map(s => s.id))).size, 57);
    assert.ok(pages.every(p => p!.summary.sessions === 57 && p!.selected_session?.id === session(2)));
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`); await assert.rejects(player(db), /permission denied/); await db.exec('reset role');
    }
    await db.exec('set role service_role'); assert.ok(await player(db));
    await assert.rejects(player(db, user(1), 0, null, 'wrong'), /Unauthorized/);
    await assert.rejects(player(db, user(1), 1), /Invalid player/);
    await db.exec('reset role');
    await db.exec("update private.admin_review_sessions set expires_at = now()-interval '1 minute'");
    await assert.rejects(player(db), /Unauthorized/);
  } finally { await db.close(); }
});


test('leaderboard accepts only the app periods, without arbitrary data filters', () => {
  assert.deepEqual(leaderboardSchema.parse({}), {period:'week'});
  assert.deepEqual(leaderboardSchema.parse({period:'all_time'}), {period:'all_time'});
  for (const invalid of [{period:'month'}, {period:null}, {user_id:user(1)}, {limit:'1000'}, {sql:'select *'}]) {
    assert.equal(leaderboardSchema.safeParse(invalid).success, false);
  }
});

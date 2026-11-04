import { z } from 'zod';
import { momentKinds } from './types';
export const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) }).strict();
export const idSchema = z.uuid();
export const leaderboardSchema = z.object({
  period: z.enum(['week', 'all_time']).default('week'),
}).strict();
export const analyticsPlayerSchema = z.object({
  offset: z.string().regex(/^(0|[1-9][0-9]{0,5})$/).default('0').transform(Number)
    .refine(n => n <= 100000 && n % 25 === 0),
  session: z.uuid().optional(),
}).strict();
export const analyticsSchema = z.object({
  days: z.enum(['7', '30', '90']).default('7').transform(Number),
  source: z.enum(['all', 'recording', 'gallery']).default('all'),
  list: z.enum(['sessions', 'players', 'accounts', 'pro']).default('sessions'),
  offset: z.string().regex(/^(0|[1-9][0-9]{0,5})$/).default('0').transform(Number)
    .refine(n => n <= 100000 && n % 25 === 0),
}).strict();
export const finishSchema = z.object({
  requestId: z.uuid(),
  choices: z.array(z.object({id: z.string().regex(new RegExp(`^(${momentKinds.join('|')})-[0-9]{1,8}$`)), decision: z.enum(['confirm','reject'])}).strict()).max(2000),
  count: z.number().int().min(1).max(1000000).nullable(),
  startMS: z.number().int().min(0).max(86400000).nullable(), endMS: z.number().int().min(1).max(86400000).nullable(),
  reason: z.string().trim().min(1).max(1000), watched: z.literal(true),
}).strict().superRefine((v,ctx)=>{
  if(new Set(v.choices.map(c=>c.id)).size!==v.choices.length) ctx.addIssue({code:'custom',message:'Duplicate moments'});
  const approved = v.choices.some(c=>c.decision==='confirm') || v.choices.length===0 && v.count!==null;
  if(approved && (v.count===null||v.startMS===null||v.endMS===null||v.endMS<=v.startMS)) ctx.addIssue({code:'custom',message:'Enter a valid verified streak'});
  if(!approved && (v.count!==null||v.startMS!==null||v.endMS!==null)) ctx.addIssue({code:'custom',message:'Rejected requests cannot set a score'});
});

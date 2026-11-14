export type InviteStatus = 'all' | 'unmarked' | 'used' | 'expired';
export type InviteCode = {
  id: string; batch_id: string; suffix: string; ordinal: number; plan: 'monthly' | 'yearly'; label: string;
  expires_at: string; expired: boolean; marked_used_at: string | null; version: number;
};
export type InviteInventory = {
  batch: string; status: InviteStatus; offset: number; total: number; rows: InviteCode[];
  batches: { id: string; label: string; plan: 'monthly' | 'yearly'; expires_at: string; total: number }[];
  summary: { total: number; unmarked: number; used: number; expired: number; linked_invite_accounts: number };
};

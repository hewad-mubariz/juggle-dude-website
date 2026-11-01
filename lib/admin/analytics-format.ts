export const number = (n: number) => new Intl.NumberFormat('en-GB').format(n);
export const time = (s: string | null, empty = 'No synced session') => s ? new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(s)) : empty;
export const day = (s: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(s + 'T12:00:00Z'));
const countries = new Intl.DisplayNames(['en'], { type: 'region' });
export const country = (code: string | null) => code ? countries.of(code) || code : 'Not provided';
export const duration = (seconds: number) => {
  const rounded = Math.round(seconds);
  return rounded < 60 ? `${rounded}s` : `${Math.floor(rounded / 60)}m ${rounded % 60}s`;
};
export const plan = (id: string) => id.endsWith('.yearly') ? 'Yearly' : id.endsWith('.monthly') ? 'Monthly' : id;

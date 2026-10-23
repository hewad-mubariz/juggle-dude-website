import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export const sessionHash = (value: string) => createHash('sha256').update(value).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
export function passwordMatches(password: string, encoded: string) {
  const [algorithm,salt,hex] = encoded.split(':');
  if(algorithm!=='scrypt' || !/^[a-f0-9]{32}$/.test(salt||'') || !/^[a-f0-9]{128}$/.test(hex||'')) return false;
  const hash = scryptSync(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
  return timingSafeEqual(hash,Buffer.from(hex,'hex'));
}
export function privateKey(value: string, secret: string) { return createHmac('sha256',secret).update(value).digest('hex'); }
export function safeOrigin(request: Request, allowed: string) {
  return request.headers.get('origin') === allowed && !['cross-site'].includes(request.headers.get('sec-fetch-site')||'');
}

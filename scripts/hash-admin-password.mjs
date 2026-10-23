import { randomBytes, scryptSync } from 'node:crypto';
import { Writable } from 'node:stream';
import { createInterface } from 'node:readline/promises';
let password='';
if(process.stdin.isTTY){
 const silent=new Writable({write(chunk,encoding,done){done();}});
 const reader=createInterface({input:process.stdin,output:silent,terminal:true});
 process.stderr.write('New admin password (hidden): ');
 password=await reader.question('');reader.close();process.stderr.write('\n');
}else{for await(const chunk of process.stdin)password+=chunk.toString();password=password.replace(/\r?\n$/,'');}
if(password.length<12||password.length>256)throw new Error('Use a password between 12 and 256 characters.');
const salt=randomBytes(16).toString('hex');
const hash=scryptSync(password,salt,64,{N:32768,r:8,p:1,maxmem:67108864}).toString('hex');
console.log(`scrypt:${salt}:${hash}`);

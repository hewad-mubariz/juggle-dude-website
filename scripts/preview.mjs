import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const port=Number(process.argv[2]||4173);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Choose a valid port.');
const child=spawn(process.execPath,[fileURLToPath(new URL('../node_modules/next/dist/bin/next',import.meta.url)),'start','--hostname','127.0.0.1','--port',String(port)],{stdio:'inherit'});
child.on('exit',code=>process.exit(code??1));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));

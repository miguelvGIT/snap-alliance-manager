import {writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import webpush from 'web-push';
const server=webpush.generateVAPIDKeys(),receiver=webpush.generateVAPIDKeys();
const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/local-benchmark-only',keys:{p256dh:receiver.publicKey,auth:randomBytes(16).toString('base64url')}};
const options={vapidDetails:{subject:'mailto:local@example.invalid',publicKey:server.publicKey,privateKey:server.privateKey}};
const make=()=>webpush.generateRequestDetails(subscription,JSON.stringify({title:'Teste local',body:'Sem envio de rede'}),options);
for(let i=0;i<10;i++)make();
const measurements=[];
for(let iteration=0;iteration<10;iteration++){const cpu=process.cpuUsage();const started=performance.now();for(let i=0;i<10;i++)make();const diff=process.cpuUsage(cpu);measurements.push({cpuMs:(diff.user+diff.system)/1000,wallMs:performance.now()-started});}
const result={environment:'Node local; não mede CPU do Workers em produção',batchSize:10,iterations:10,networkRequests:0,cpuAverageMs:measurements.reduce((sum,x)=>sum+x.cpuMs,0)/measurements.length,cpuMaxMs:Math.max(...measurements.map(x=>x.cpuMs)),wallAverageMs:measurements.reduce((sum,x)=>sum+x.wallMs,0)/measurements.length};
writeFileSync('.wrangler/push-benchmark.json',JSON.stringify(result,null,2));process.stdout.write(JSON.stringify(result));

import webpush from 'web-push';
export default {
 async fetch(){
  const sender=webpush.generateVAPIDKeys(),receiver=webpush.generateVAPIDKeys();
  const auth=crypto.getRandomValues(new Uint8Array(16));
  const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/never-contacted',keys:{p256dh:receiver.publicKey,auth:btoa(String.fromCharCode(...auth)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}};
  const payload=JSON.stringify({title:'Prova local',body:'Nenhuma notificação foi enviada'});
  const request=webpush.generateRequestDetails(subscription,payload,{vapidDetails:{subject:'mailto:local@example.invalid',publicKey:sender.publicKey,privateKey:sender.privateKey}});
  return Response.json({ok:!!request.body,encrypted:!request.body?.toString().includes(payload),bytes:request.body?.byteLength??0,encoding:request.headers['Content-Encoding'],networkRequests:0});
 }
};

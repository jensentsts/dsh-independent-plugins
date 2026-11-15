import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const catalog=JSON.parse(readFileSync(resolve(root,'catalog.json'),'utf8'));
const categories={integration:{title:{en:'Connections',zh:'连接'}},message:{title:{en:'Messaging',zh:'消息'}},interface:{title:{en:'Conversation',zh:'会话界面'}},workspace:{title:{en:'Workspaces',zh:'工作区'}},foundation:{title:{en:'Foundation',zh:'基础'}}};
const plugins=catalog.map(p=>({name:p.name,title:p.title,description:p.description,icon:`icons/${p.repo}.svg`,author:p.author,homepage:`https://github.com/jensentsts/${p.repo}#readme`,repository:{url:`https://github.com/jensentsts/${p.repo}`},metadata:{category:p.category,keywords:p.keywords},versions:[{version:p.version,publishTimestamp:p.publishTimestamp,source:{type:'git',url:`https://github.com/jensentsts/${p.repo}`,commit:p.commit},...(p.dsh?{engines:{dsh:p.dsh}}:{})}]}));
writeFileSync(resolve(root,'market.json'),JSON.stringify({format:1,title:{en:'DSH Independent Plugins',zh:'DSH 独立插件集'},description:{en:'Independent DSH plugins for messaging and collaboration.',zh:'消息互联与会话协作的独立插件。'},metadata:{categories},plugins},null,2)+'\n');
console.log(`Built market.json with ${plugins.length} pinned plugins.`);

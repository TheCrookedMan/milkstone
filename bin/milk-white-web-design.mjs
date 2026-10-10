#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { skill, name, destination, installFolder, installChatGPT } from '../lib/install.mjs';
import { entries, zip, tgz } from '../lib/bundle.mjs';
try {
const {values,positionals}=parseArgs({allowPositionals:true,options:{agent:{type:'string'},global:{type:'boolean'},project:{type:'boolean'},target:{type:'string'},replace:{type:'boolean'},'dry-run':{type:'boolean'},out:{type:'string'},format:{type:'string'},source:{type:'string'},help:{type:'boolean'}}});
const command=positionals[0]??'help';if(values.global&&values.project)throw Error('Choose --global or --project, not both.');if(positionals.length>1)throw Error('Unexpected positional arguments.');
const opts={global:!!values.global,replace:!!values.replace,dryRun:!!values['dry-run']};
if(command==='help'||values.help){console.log(`milk-white-web-design (Node >=22.12)\n\ninstall --agent codex|claude-code [--global|--project] [--dry-run] [--replace]\ninstall --agent chatgpt [--global|--project]  Register a local desktop plugin; enable in UI\ninstall --agent opendesign --source <public-https-skill.tgz>  Delegate to od skill install\ninstall --target <skills-directory>  Copy skill into a specified host directory\nexport --format skill|zip|tgz --out <file>\n\nProject scope is the default. Existing files are never overwritten without --replace; replacement keeps a backup. No npm postinstall or account access.`);}
else if(command==='install'){
 if(values.target&&(values.agent==='chatgpt'||values.agent==='opendesign'))throw Error('--target is for directory-based hosts.');
 let result;
 if(values.agent==='chatgpt')result=await installChatGPT(opts);
 else if(values.agent==='opendesign'){
  if(!values.source)throw Error('OpenDesign requires --source <public HTTPS .tgz/.tar.gz URL>. Export a tgz, host it, then use the official od installer.');
  if(values.global||values.project||values.replace)throw Error('OpenDesign manages scope and replacement; use its official controls.');
  const url=new URL(values.source);if(url.protocol!=='https:'||url.username||url.password||!/(\.tgz|\.tar\.gz)$/.test(url.pathname))throw Error('Expected credential-free HTTPS tgz/tar.gz URL.');
  if(opts.dryRun)result={command:['od','skill','install',url.href],dryRun:true};else{const r=spawnSync('od',['skill','install',url.href],{stdio:'inherit',shell:false});if(r.error)throw r.error;if(r.status!==0)throw Error(`OpenDesign installer failed (${r.status})`);result={delegated:true,source:url.href};}
 }else{if(!values.agent&&!values.target)throw Error('Specify --agent or --target.');result=await installFolder(skill,destination(values.agent,{...opts,target:values.target}),opts);}
 console.log(JSON.stringify(result,null,2));
}else if(command==='export'){
 const format=values.format??'skill';if(!['skill','zip','tgz'].includes(format))throw Error('Format must be skill, zip or tgz.');const out=resolve(values.out??`${name}.${format}`);const list=(await entries(skill)).map(f=>({...f,name:name+'/'+f.name}));await mkdir(dirname(out),{recursive:true});await writeFile(out,format==='tgz'?tgz(list):zip(list),{flag:values.replace?'w':'wx'});console.log(`Exported ${out} (${list.length} files)`);
}else throw Error(`Unknown command: ${command}`);
}catch(e){console.error(`milk-white-web-design: ${e.message}`);process.exitCode=1;}

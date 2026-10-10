import { mkdir, cp, lstat, rename, rm, readFile, writeFile, mkdtemp, realpath } from 'node:fs/promises';
import { resolve, join, dirname, relative, sep } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
export const name='milk-white-web-design';
export const root=fileURLToPath(new URL('../',import.meta.url));
export const skill=join(root,'skills',name);
async function exists(path){try{await lstat(path);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
async function assertNoLinks(path){let current=resolve(path);while(true){if(await exists(current)&&(await lstat(current)).isSymbolicLink()){const aliases={'/var':'/private/var','/tmp':'/private/tmp','/etc':'/private/etc'};if(process.platform!=='darwin'||!aliases[current]||await realpath(current)!==aliases[current])throw Error(`Refusing symlink destination: ${current}`);}const next=dirname(current);if(next===current)break;current=next;}}
export async function installFolder(source,dest,{replace=false,dryRun=false}={}) {
 dest=resolve(dest);const src=resolve(source);if(dest===src||dest.startsWith(src+sep)||src.startsWith(dest+sep))throw Error('Source and destination overlap');
 await assertNoLinks(dest);const present=await exists(dest);if(present&&!replace)throw Error(`Already exists: ${dest}. Use --replace to preserve a backup and update.`);
 if(dryRun)return {destination:dest,dryRun:true,wouldReplace:present};
 await mkdir(dirname(dest),{recursive:true});const stage=await mkdtemp(join(dirname(dest),'.milk-install-'));let backup;
 try{await cp(src,join(stage,'payload'),{recursive:true,errorOnExist:true,force:false});if(present){backup=dest+'.backup-'+Date.now();await rename(dest,backup);}try{await rename(join(stage,'payload'),dest);}catch(e){if(backup)await rename(backup,dest);throw e;}return {destination:dest,backup};}finally{await rm(stage,{recursive:true,force:true});}
}
export function destination(agent,{global=false,cwd=process.cwd(),home=homedir(),target}={}){
 if(target)return resolve(target,name);
 if(agent==='codex')return join(global?home:cwd,'.agents','skills',name);
 if(agent==='claude-code')return join(global?home:cwd,'.claude','skills',name);
 throw Error('Use codex, claude-code, chatgpt or opendesign; other hosts require --target <skills-directory>.');
}
export async function installChatGPT(options={}){
 const cwd=options.cwd??process.cwd(),home=options.home??homedir();
 const base=options.global?home:cwd;
 const dest=options.global?join(home,'.codex','plugins',name+'-local'):join(cwd,'plugins',name);
 const market=join(base,'.agents','plugins','marketplace.json');await assertNoLinks(market);
 let catalog={name:options.global?'local-personal':'local-repo',plugins:[]};
 if(await exists(market)){catalog=JSON.parse(await readFile(market,'utf8'));if(!Array.isArray(catalog.plugins))throw Error('Existing marketplace has no plugins array');}
 const found=catalog.plugins.findIndex(p=>p.name===name);if(found>=0&&!options.replace)throw Error('Marketplace already contains this plugin. Use --replace.');
 const sourcePath='./'+relative(base,dest).split(sep).join('/');
 const entry={name,source:{source:'local',path:sourcePath},policy:{installation:'AVAILABLE',authentication:'ON_INSTALL'},interface:{displayName:'Milkstone'}};
 const temp=await mkdtemp(join((await import('node:os')).tmpdir(),'milk-plugin-'));
 try{await mkdir(join(temp,'skills'));await cp(skill,join(temp,'skills',name),{recursive:true});await cp(join(root,'plugin.json'),join(temp,'plugin.json'));const result=await installFolder(temp,dest,options);
  if(options.dryRun)return {...result,marketplace:market,activation:'Enable plugin in ChatGPT desktop Plugins Directory; no account or cloud install was performed.'};
  if(found>=0)catalog.plugins[found]=entry;else catalog.plugins.push(entry);
  await mkdir(dirname(market),{recursive:true});if(await exists(market))await cp(market,market+'.backup-'+Date.now());
  const staging=market+'.tmp-'+process.pid;await writeFile(staging,JSON.stringify(catalog,null,2)+'\n',{flag:'wx'});await rename(staging,market);
  return {...result,marketplace:market,activation:'Plugin files registered locally. Enable in ChatGPT desktop Plugins Directory; web/mobile require plugin distribution.'};
 }finally{await rm(temp,{recursive:true,force:true});}
}

import { entries } from '../lib/bundle.mjs';
import { skill } from '../lib/install.mjs';
import { readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
const text=await readFile(join(skill,'SKILL.md'),'utf8');
if(!/^---\nname: milk-white-web-design\ndescription: .+\n---/m.test(text))throw Error('Invalid skill frontmatter');
const files=await entries(skill);
for(const f of files.filter(f=>f.name.endsWith('.md'))){for(const m of f.data.toString().matchAll(/\]\(([^)]+)\)/g)){const link=m[1].split('#')[0];if(link&&!/^https?:/.test(link))await access(join(skill,dirname(f.name),link));}}
console.log(`Skill validated: ${files.length} files, resolved Markdown references.`);

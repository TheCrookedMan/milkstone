import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { deflateRawSync, gzipSync } from 'node:zlib';
export async function entries(root, prefix = '') {
  const out=[];
  for (const item of (await readdir(root,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
    if (['node_modules','dist','.git','.DS_Store'].includes(item.name)) continue;
    if (item.isSymbolicLink()) throw Error(`Skill assets must not be symlinks: ${item.name}`);
    const name=prefix+item.name;
    if(item.isDirectory()) out.push(...await entries(join(root,item.name),name+'/'));
    else if(item.isFile()) out.push({name,data:await readFile(join(root,item.name))});
  }
  return out;
}
function crc32(data) { let crc=0xffffffff; for(const b of data){crc^=b;for(let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0; }
export function zip(files) {
  const chunks=[], central=[];let offset=0;
  for(const file of files){const name=Buffer.from(file.name);const packed=deflateRawSync(file.data);const crc=crc32(file.data);
    const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(33,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(packed.length,18);h.writeUInt32LE(file.data.length,22);h.writeUInt16LE(name.length,26);
    chunks.push(h,name,packed);const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(33,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(packed.length,20);c.writeUInt32LE(file.data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);central.push(c,name);offset+=h.length+name.length+packed.length;
  }
  const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...chunks,directory,end]);
}
export function tgz(files) {
 const chunks=[];
 for(const {name,data} of files){const h=Buffer.alloc(512);let leaf=name, prefix='';if(Buffer.byteLength(leaf)>100){const cut=name.lastIndexOf('/');leaf=name.slice(cut+1);prefix=name.slice(0,cut);}if(Buffer.byteLength(leaf)>100||Buffer.byteLength(prefix)>155)throw Error('Tar path too long');
  h.write(leaf,0,100);h.write('0000644\0',100);h.write('0000000\0',108);h.write('0000000\0',116);h.write(data.length.toString(8).padStart(11,'0')+'\0',124);h.write('00000000000\0',136);h.fill(32,148,156);h.write('0',156);h.write('ustar\0',257);h.write('00',263);h.write(prefix,345,155);const sum=h.reduce((a,b)=>a+b,0);h.write(sum.toString(8).padStart(6,'0')+'\0 ',148);chunks.push(h,data,Buffer.alloc((512-data.length%512)%512));
 }return gzipSync(Buffer.concat([...chunks,Buffer.alloc(1024)]));
}

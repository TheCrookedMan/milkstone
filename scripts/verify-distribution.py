from pathlib import Path
import hashlib,zipfile,tarfile,json
r=Path(__file__).resolve().parents[1];name='milk-white-web-design';s=r/'skills'/name
skip={'node_modules','dist','.git','.DS_Store'}
expected={p.relative_to(s).as_posix():p.read_bytes() for p in s.rglob('*') if p.is_file() and not skip.intersection(p.relative_to(s).parts)}
records={}
for ext in ['skill','skill.zip','tar.gz']:
 p=r/'public'/f'{name}.{ext}'
 if ext=='tar.gz':
  with tarfile.open(p) as z:actual={i.name.removeprefix(name+'/'):z.extractfile(i).read() for i in z if i.isfile()}
 else:
  with zipfile.ZipFile(p) as z:actual={i.removeprefix(name+'/'):z.read(i) for i in z.namelist()}
 assert actual==expected,f'Archive mismatch: {ext}'
 records[ext]={'files':len(actual),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
print(json.dumps(records,indent=2))

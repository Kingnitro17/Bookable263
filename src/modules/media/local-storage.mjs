import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';

export function createLocalMediaStorage(directory) {
  const root=path.resolve(directory);
  return {
    async put(id,extension,bytes){await mkdir(root,{recursive:true});const key=`${id}.${extension}`;const target=path.resolve(root,key);if(!target.startsWith(root+path.sep))throw new Error('Invalid media key.');await writeFile(target,bytes,{flag:'wx',mode:0o600});return key;},
    async get(key){if(!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key))return null;try{return await readFile(path.resolve(root,key))}catch(error){if(error.code==='ENOENT')return null;throw error;}},
    async delete(key){if(!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key))return;try{await unlink(path.resolve(root,key))}catch(error){if(error.code!=='ENOENT')throw error;}}
  };
}

import { randomUUID } from 'node:crypto';
const fail=(status,message)=>Object.assign(new Error(message),{status});
function imageType(bytes){if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return {mime:'image/jpeg',extension:'jpg'};if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {mime:'image/png',extension:'png'};if(bytes.length>=12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return {mime:'image/webp',extension:'webp'};return null;}
export function createMediaService({repository,storage}) {
  return {
    async uploadPhoto(userId,artistId,bytes,contentType,caption=''){
      if(!Buffer.isBuffer(bytes)||bytes.length<12||bytes.length>8*1024*1024)throw fail(422,'Photos must be between 12 bytes and 8 MB.');
      const found=imageType(bytes);if(!found||contentType!==found.mime)throw fail(422,'Upload a valid JPEG, PNG, or WebP image.');
      const safeCaption=String(caption||'').trim();if(safeCaption.length>300)throw fail(422,'Caption must be 300 characters or fewer.');
      const id=randomUUID();const storageKey=await storage.put(id,found.extension,bytes);
      try{const result=repository.addArtistPhoto({id,artistId,userId,storageKey,caption:safeCaption,createdAt:new Date().toISOString()});if(result===null)throw fail(404,'Artist profile not found.');if(result===false){await storage.delete(storageKey);throw fail(409,'Artist profiles support up to five photos.');}return {...result,mimeType:found.mime};}catch(error){await storage.delete(storageKey);throw error;}
    },
    addVideo(userId,artistId,input){let url;try{url=new URL(String(input.url||''));if(url.protocol!=='https:'||url.username||url.password||!['youtube.com','www.youtube.com','youtu.be','www.youtu.be','vimeo.com','www.vimeo.com','player.vimeo.com'].includes(url.hostname.toLowerCase()))throw new Error();}catch{throw fail(422,'Video links must use YouTube or Vimeo over HTTPS.');}const caption=String(input.caption||'').trim();if(caption.length>300)throw fail(422,'Caption must be 300 characters or fewer.');const result=repository.addArtistVideo({id:randomUUID(),artistId,userId,sourceUrl:url.href,caption,createdAt:new Date().toISOString()});if(!result)throw fail(404,'Artist profile not found.');return result;},
    list(userId,artistId){const assets=repository.mediaForManager(artistId,userId);if(!assets)throw fail(404,'Artist profile not found.');return assets;},
    public(artistId){const assets=repository.publicArtistMedia(artistId);if(!assets)throw fail(404,'Artist profile not found.');return assets.map(asset=>({...asset,url:asset.mediaType==='photo'?`/media/${asset.id}`:asset.sourceUrl}));},
    async photoBytes(id){const asset=repository.publicPhotoAsset(id);if(!asset)return null;const bytes=await storage.get(asset.storageKey);return bytes?{bytes,mimeType:asset.storageKey.endsWith('.jpg')?'image/jpeg':asset.storageKey.endsWith('.png')?'image/png':'image/webp'}:null;},
    async remove(userId,id){const asset=repository.deleteArtistMedia({id,userId});if(!asset)throw fail(404,'Media item not found.');if(asset.storageKey)await storage.delete(asset.storageKey);return {ok:true};}
  };
}

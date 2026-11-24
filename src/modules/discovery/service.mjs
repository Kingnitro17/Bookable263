import {randomUUID} from 'node:crypto';

export function createDiscoveryService({repository}){
  return {
    shortlists(userId){return repository.shortlistsForUser(userId);},
    createShortlist(userId,input){const name=String(input.name||'').trim();if(name.length<2||name.length>80)throw Object.assign(new Error('Shortlist name must be between 2 and 80 characters.'),{status:422});return repository.createShortlist({id:randomUUID(),userId,name,createdAt:new Date().toISOString()});},
    shortlist(userId,id){const result=repository.shortlistForUser(id,userId);if(!result)throw Object.assign(new Error('Shortlist not found.'),{status:404});return result;},
    addArtist(userId,listId,artistId){const result=repository.addArtistToShortlist({shortlistId:listId,userId,artistId,addedAt:new Date().toISOString()});if(result===null)throw Object.assign(new Error('Shortlist not found.'),{status:404});if(result===false)throw Object.assign(new Error('Only published artist profiles can be saved.'),{status:404});return result;},
    removeArtist(userId,listId,artistId){if(!repository.removeArtistFromShortlist({shortlistId:listId,userId,artistId}))throw Object.assign(new Error('Shortlist not found.'),{status:404});return {ok:true};},
    deleteShortlist(userId,id){if(!repository.deleteShortlist(id,userId))throw Object.assign(new Error('Shortlist not found.'),{status:404});return {ok:true};},
    compare(input){const ids=[...new Set(String(input.ids||'').split(',').map(id=>id.trim()).filter(Boolean))];if(ids.length<2||ids.length>4)throw Object.assign(new Error('Compare between 2 and 4 published artists.'),{status:422});const artists=ids.map(id=>repository.publicArtist(id));if(artists.some(artist=>!artist))throw Object.assign(new Error('Only published profiles can be compared.'),{status:404});return {artists};},
    comparisons(userId){return repository.comparisonsForUser(userId);},
    getComparison(userId,id){const value=repository.comparisonForUser(id,userId);if(!value)throw Object.assign(new Error('Comparison not found.'),{status:404});return value;},
    saveComparison(userId,input){const name=String(input.name||'').trim();if(name.length<2||name.length>80)throw Object.assign(new Error('Comparison name must be between 2 and 80 characters.'),{status:422});const {artists}=this.compare({ids:Array.isArray(input.artistIds)?input.artistIds.join(','):''});return repository.createComparison({id:randomUUID(),userId,name,artistIds:artists.map(artist=>artist.id),createdAt:new Date().toISOString()});},
    deleteComparison(userId,id){if(!repository.deleteComparison(id,userId))throw Object.assign(new Error('Comparison not found.'),{status:404});return {ok:true};}
  };
}

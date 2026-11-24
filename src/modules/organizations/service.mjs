import { randomUUID } from 'node:crypto';

export function createOrganizationService({ repository }) {
  return {
    forUser(userId) { return repository.organizationsForUser(userId); },
    async create(userId,input) {
      const name=String(input.name||'').trim();const type=String(input.type||'');
      if(name.length<2||name.length>100)throw Object.assign(new Error('Organization name must be between 2 and 100 characters.'),{status:422});
      if(!['artist','agency','venue','promoter','other'].includes(type))throw Object.assign(new Error('Choose a valid organization type.'),{status:422});
      return repository.createOrganization({id:randomUUID(),name,type,userId,createdAt:new Date().toISOString()});
    }
  };
}

import { randomUUID, timingSafeEqual } from 'node:crypto';

const assignableRoles=new Set(['artist','manager','organizer','venue_staff']);
export function createIdentityService({ repository, scrypt, randomBytes }) {
  const hash = async (password, salt = randomBytes(16).toString('hex')) => ({ salt, digest: (await scrypt(password, salt, 64)).toString('hex') });
  return {
    publicUser(id) { return repository.userById(id) || null; },
    async addRoles(userId,input) {
      const roles=[...new Set(Array.isArray(input.roles)?input.roles:[])];
      if(!roles.length||roles.length>assignableRoles.size||roles.some(role=>!assignableRoles.has(role)))throw Object.assign(new Error('Choose at least one valid professional interest.'),{status:422});
      return repository.addUserRoles(userId,roles);
    },
    async register(input) {
      const name=String(input.name||'').trim();const email=String(input.email||'').trim().toLowerCase();const password=String(input.password||'');
      if(name.length<2||name.length>80)throw Object.assign(new Error('Enter a name between 2 and 80 characters.'),{status:422});
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Object.assign(new Error('Enter a valid email address.'),{status:422});
      if(password.length<12||password.length>200)throw Object.assign(new Error('Use a password with at least 12 characters.'),{status:422});
      const roles=[...new Set(Array.isArray(input.roles)?input.roles:[])];
      if(roles.length>assignableRoles.size||roles.some(role=>!assignableRoles.has(role)))throw Object.assign(new Error('Choose valid professional interests.'),{status:422});
      const secret=await hash(password);return repository.createUser({id:randomUUID(),name,email,password:secret,createdAt:new Date().toISOString(),roles});
    },
    async login(input) {
      const email=String(input.email||'').trim().toLowerCase();const password=String(input.password||'');const user=repository.userByEmail(email);
      if(!user){await scrypt(password,'bookable263-unknown-user',64);return null;}
      const actual=Buffer.from((await scrypt(password,user.password.salt,64)).toString('hex'),'hex');const expected=Buffer.from(user.password.digest,'hex');
      return actual.length===expected.length&&timingSafeEqual(actual,expected)?repository.userById(user.id):null;
    }
  };
}

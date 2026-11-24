import { randomBytes, randomUUID } from 'node:crypto';
import { hashToken } from '../../shared/database.mjs';
const fail=(status,message)=>Object.assign(new Error(message),{status});
export function createInvitationService({repository,random=randomBytes}) {
  return {
    create(userId,organizationId,input){const email=String(input.email||'').trim().toLowerCase();if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw fail(422,'Enter a valid invitee email address.');const role=String(input.role||'member');if(!['admin','member'].includes(role))throw fail(422,'Invitations can grant admin or member role.');const grants=input.manageOrganization===true?['organization.manage']:[];const days=Number(input.expiresInDays??7);if(!Number.isInteger(days)||days<1||days>30)throw fail(422,'Invitation expiry must be from 1 to 30 days.');const token=random(32).toString('base64url');const createdAt=new Date();const invitation=repository.createOrganizationInvitation({id:randomUUID(),organizationId,userId,email,role,permissions:grants,tokenHash:hashToken(token),expiresAt:createdAt.getTime()+days*86400_000,createdAt:createdAt.toISOString()});if(!invitation)throw fail(404,'Organization not found.');return {...invitation,invitationToken:token,delivery:'manual_copy'};},
    list(userId,organizationId){const invitations=repository.invitationsForOrganization(organizationId,userId);if(!invitations)throw fail(404,'Organization not found.');return invitations;},
    accept(user,token){if(typeof token!=='string'||token.length<32||token.length>100)throw fail(404,'Invitation not found.');const result=repository.acceptOrganizationInvitation({tokenHash:hashToken(token),userId:user.id,email:user.email,now:Date.now()});if(result===false)throw fail(403,'Invitation was issued to a different email address.');if(!result)throw fail(404,'Invitation is invalid, expired, or already used.');return result;},
    revoke(userId,organizationId,id){const result=repository.revokeOrganizationInvitation({id,organizationId,userId});if(result===null)throw fail(404,'Organization not found.');if(!result)throw fail(404,'Pending invitation not found.');return {ok:true};}
  };
}

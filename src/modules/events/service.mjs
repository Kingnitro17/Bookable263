import { randomUUID } from 'node:crypto';

export function createEventsService({repository}) {
  const bad=message=>Object.assign(new Error(message),{status:422});
  const text=(value,label,max,min=1)=>{const normalized=String(value??'').trim();if(normalized.length<min||normalized.length>max)throw bad(`${label} must be ${min} to ${max} characters.`);return normalized};
  const currencies=new Set(Intl.supportedValuesOf('currency'));
  return {
    createVenue(userId,input){
      const organization=repository.managedOrganization(userId,String(input.organizationId||''));if(!organization||!['venue','promoter','other'].includes(organization.type))throw Object.assign(new Error('Choose a venue or organizer workspace that you manage.'),{status:403});
      const capacity=input.capacity===''||input.capacity==null?null:Number(input.capacity);if(capacity!==null&&(!Number.isInteger(capacity)||capacity<1||capacity>1_000_000))throw bad('Capacity must be a whole number from 1 to 1,000,000.');
      return repository.createVenue({id:randomUUID(),organizationId:organization.id,userId,name:text(input.name,'Venue name',120,2),city:text(input.city,'City',80),address:String(input.address||'').trim(),capacity,description:String(input.description||'').trim(),now:new Date().toISOString()});
    },
    venues(userId){return repository.venuesForUser(userId);},
    createEvent(userId,input){
      const organizationId=String(input.organizationId||'');const organization=repository.managedOrganization(userId,organizationId);if(!organization||!['venue','promoter','other'].includes(organization.type))throw Object.assign(new Error('Choose a venue or organizer workspace that you manage.'),{status:403});
      const startsAt=String(input.startsAt||'');if(!Number.isFinite(Date.parse(startsAt))||!/^\d{4}-\d\d-\d\dT/.test(startsAt))throw bad('Choose an event date and time.');
      const timeZone=text(input.timeZone,'Time zone',80);try{new Intl.DateTimeFormat('en',{timeZone})}catch{throw bad('Enter a valid IANA time zone.');}
      const budgetCurrency=input.budgetCurrency?String(input.budgetCurrency).toUpperCase():null;const budgetMinor=input.budgetMinor===''||input.budgetMinor==null?null:Number(input.budgetMinor);if(budgetCurrency&&!currencies.has(budgetCurrency))throw bad('Choose a supported ISO currency.');if(budgetMinor!==null&&(!Number.isSafeInteger(budgetMinor)||budgetMinor<0))throw bad('Budget must be non-negative integer minor units.');if(Boolean(budgetCurrency)!==(budgetMinor!==null))throw bad('Provide both budget currency and amount, or leave both blank.');
      const venueId=input.venueId?String(input.venueId):null;const result=repository.createEvent({id:randomUUID(),organizationId,venueId,userId,name:text(input.name,'Event name',140,2),eventType:text(input.eventType,'Event type',60,2),startsAt:new Date(startsAt).toISOString(),timeZone,city:text(input.city,'City',80),requirements:String(input.requirements||'').trim(),budgetCurrency,budgetMinor,now:new Date().toISOString()});if(result===false)throw Object.assign(new Error('Venue is not part of this organization.'),{status:422});return result;
    },
    events(userId){return repository.eventsForUser(userId);}
  };
}

import { randomUUID } from 'node:crypto';

export function createTalentService({repository}) {
  const normalizeProfile=input=>{
    const name=String(input.name||'').trim();const type=String(input.type||'');const biography=String(input.biography||'').trim();const baseCity=String(input.baseCity||'').trim();
    if(name.length<2||name.length>100)throw Object.assign(new Error('Professional name must be between 2 and 100 characters.'),{status:422});
    if(!['individual','group'].includes(type))throw Object.assign(new Error('Choose an individual or group profile.'),{status:422});
    if(biography.length>1800)throw Object.assign(new Error('Biography must be 1,800 characters or fewer.'),{status:422});
    if(baseCity.length>80)throw Object.assign(new Error('Base city must be 80 characters or fewer.'),{status:422});
    let yearsExperience=null;if(input.yearsExperience!==''&&input.yearsExperience!==undefined&&input.yearsExperience!==null){yearsExperience=Number(input.yearsExperience);if(!Number.isInteger(yearsExperience)||yearsExperience<0||yearsExperience>80)throw Object.assign(new Error('Experience must be a whole number from 0 to 80.'),{status:422});}
    const valid=new Set(repository.artistCategories().map(row=>row.slug));const categories=[...new Set(Array.isArray(input.categories)?input.categories:[])];
    if(!categories.length||categories.length>5||categories.some(slug=>!valid.has(slug)))throw Object.assign(new Error('Choose between 1 and 5 valid performance categories.'),{status:422});
    const genres=[...new Set((Array.isArray(input.genres)?input.genres:[]).map(value=>String(value).trim()).filter(Boolean))];
    if(genres.length>10||genres.some(genre=>genre.length<2||genre.length>40))throw Object.assign(new Error('Add up to 10 genres, each 2 to 40 characters.'),{status:422});
    return {name,type,biography,baseCity,yearsExperience,categories,genres};
  };
  const isoCurrencies=new Set(Intl.supportedValuesOf('currency'));
  const parseMinorUnits=(value,currency)=>{
    const digits=new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits;
    const match=String(value??'').trim().match(/^(\d{1,12})(?:\.(\d+))?$/);
    if(!match||((match[2]||'').length>digits))throw Object.assign(new Error(`Enter a non-negative amount with up to ${digits} decimal places for ${currency}.`),{status:422});
    const scale=10n**BigInt(digits);const fraction=digits?BigInt((match[2]||'').padEnd(digits,'0')||'0'):0n;const minor=BigInt(match[1])*scale+fraction;
    if(minor>BigInt(Number.MAX_SAFE_INTEGER))throw Object.assign(new Error('The amount is too large.'),{status:422});
    return Number(minor);
  };
  const validLocalDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return false;const [year,month,day]=value.split('-').map(Number);const date=new Date(Date.UTC(year,month-1,day));return date.toISOString().slice(0,10)===value};
  const validateTimeZone=value=>{const timeZone=String(value||'').trim();if(timeZone.length>80)throw Object.assign(new Error('Enter a valid IANA time zone.'),{status:422});try{new Intl.DateTimeFormat('en',{timeZone})}catch{throw Object.assign(new Error('Enter a valid IANA time zone.'),{status:422})}return timeZone};
  return {
    categories(){return repository.artistCategories();},
    currencies(){const names=new Intl.DisplayNames(['en'],{type:'currency',style:'long'});return [...isoCurrencies].sort().map(code=>({code,name:names.of(code)||code}));},
    managedBy(userId){return repository.managedArtists(userId);},
    create(userId,input){
      const organizationId=String(input.organizationId||'');const organization=repository.managedOrganization(userId,organizationId);
      if(!organization||!['artist','agency'].includes(organization.type))throw Object.assign(new Error('Choose an artist or agency organization that you manage.'),{status:403});
      const profile=normalizeProfile(input);
      return repository.createArtist({id:randomUUID(),organizationId,...profile,createdBy:userId,createdAt:new Date().toISOString()});
    },
    update(userId,id,input){
      if(!repository.artistByIdForManager(id,userId))throw Object.assign(new Error('Artist profile not found.'),{status:404});
      return repository.updateArtist({id,userId,...normalizeProfile(input),updatedAt:new Date().toISOString()});
    },
    setRateCard(userId,artistId,input){
      if(!repository.artistByIdForManager(artistId,userId))throw Object.assign(new Error('Artist profile not found.'),{status:404});
      const currencyCode=String(input.currencyCode||'').trim().toUpperCase();
      if(!isoCurrencies.has(currencyCode))throw Object.assign(new Error('Choose a supported ISO 4217 currency code.'),{status:422});
      const customQuote=input.customQuote===true||input.customQuote==='true';
      const priceBasis=String(input.priceBasis||'');if(!['per_performance','per_hour','per_event'].includes(priceBasis))throw Object.assign(new Error('Choose a valid pricing basis.'),{status:422});
      const durationMinutes=input.expectedDurationMinutes===''||input.expectedDurationMinutes==null?null:Number(input.expectedDurationMinutes);
      if(durationMinutes!==null&&(!Number.isInteger(durationMinutes)||durationMinutes<1||durationMinutes>1440))throw Object.assign(new Error('Performance duration must be a whole number from 1 to 1,440 minutes.'),{status:422});
      const visibility=String(input.visibility||'public');if(!['public','private'].includes(visibility))throw Object.assign(new Error('Rate visibility must be public or private.'),{status:422});
      const amountMinor=customQuote?null:parseMinorUnits(input.amountMajor,currencyCode);
      return repository.setArtistRateCard({id:randomUUID(),artistId,userId,currencyCode,amountMinor,customQuote,priceBasis,durationMinutes,visibility,updatedAt:new Date().toISOString()});
    },
    setAvailability(userId,artistId,input){
      if(!repository.artistByIdForManager(artistId,userId))throw Object.assign(new Error('Artist profile not found.'),{status:404});
      const localDate=String(input.localDate||'');if(!validLocalDate(localDate))throw Object.assign(new Error('Choose a real calendar date in YYYY-MM-DD format.'),{status:422});
      const timeZone=validateTimeZone(input.timeZone);const status=String(input.status||'');if(!['available','unavailable'].includes(status))throw Object.assign(new Error('Choose available or unavailable.'),{status:422});
      return repository.setAvailability({artistId,userId,localDate,timeZone,status,updatedAt:new Date().toISOString()});
    },
    managedAvailability(userId,artistId){if(!repository.artistByIdForManager(artistId,userId))throw Object.assign(new Error('Artist profile not found.'),{status:404});return repository.availabilityForManager(artistId,userId);},
    deleteAvailability(userId,artistId,localDate){if(!validLocalDate(localDate)||!repository.deleteAvailability({artistId,userId,localDate}))throw Object.assign(new Error('Availability entry not found.'),{status:404});return {ok:true};},
    publicAvailability(artistId,input){
      const today=new Date().toISOString().slice(0,10);const from=String(input.from||today);const defaultTo=new Date(Date.now()+90*86400_000).toISOString().slice(0,10);const to=String(input.to||defaultTo);
      if(!validLocalDate(from)||!validLocalDate(to)||from>to||(Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`))>90*86400_000)throw Object.assign(new Error('Choose a valid availability range of up to 90 days.'),{status:422});
      const dates=repository.publicAvailability(artistId,{from,to});if(!dates)throw Object.assign(new Error('Artist profile not found.'),{status:404});return {dates,confirmationRequired:true};
    },
    publish(userId,id){const artist=repository.publishArtist(id,userId);if(!artist)throw Object.assign(new Error('We could not publish this profile. Check that you manage it and it has a category.'),{status:404});return artist;},
    search(input){
      const query=String(input.q||'').trim();const category=String(input.category||'').trim();const genre=String(input.genre||'').trim();const location=String(input.location||'').trim();const availableOn=String(input.availableOn||'').trim();const timeZone=String(input.timeZone||'').trim();
      if(query.length>120||category.length>40||genre.length>40||location.length>80)throw Object.assign(new Error('One or more search filters are too long.'),{status:422});
      const page=Math.max(1,Math.min(10000,Number.parseInt(input.page||'1',10)||1));const limit=12;
      if(query&&!/[\p{L}\p{N}]/u.test(query))return {total:0,artists:[],page,pageSize:limit};
      if(availableOn){if(!validLocalDate(availableOn))throw Object.assign(new Error('Choose a real date for availability search.'),{status:422});validateTimeZone(timeZone)}
      return {...repository.searchArtists({query,category,genre,location,availableOn,timeZone,limit,offset:(page-1)*limit}),page,pageSize:limit};
    },
    publicProfile(id){return repository.publicArtist(id);},
    publicEditorialProfile(slug){return repository.publicArtistEditorialProfile(String(slug||'').trim());}
  };
}

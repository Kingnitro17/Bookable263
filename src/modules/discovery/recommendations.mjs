export function createRecommendationService({events,talent}) {
  return {
    forEvent(userId,eventId,{category='',genre=''}={}){
      const event=events.events(userId).find(item=>item.id===eventId);if(!event)throw Object.assign(new Error('Event not found.'),{status:404});
      const date=new Intl.DateTimeFormat('en-CA',{timeZone:event.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(event.startsAt));
      const first=talent.search({location:event.city,category,genre});const pageCount=Math.min(50,Math.ceil(first.total/first.pageSize));const artists=[...first.artists];for(let page=2;page<=pageCount;page++)artists.push(...talent.search({location:event.city,category,genre,page}).artists);
      const ranked=artists.map(artist=>{
        const factors=[];let score=0;
        if(artist.baseCity.toLowerCase()===event.city.toLowerCase()){score+=30;factors.push({key:'location',points:30,reason:`Based in ${event.city}`})}
        if(category){score+=20;factors.push({key:'category',points:20,reason:`Matches ${category} category`})}
        if(genre){score+=10;factors.push({key:'genre',points:10,reason:`Matches ${genre} genre`})}
        const availability=talent.publicAvailability(artist.id,{from:date,to:date}).dates.some(item=>item.timeZone===event.timeZone);
        if(availability){score+=40;factors.push({key:'availability',points:40,reason:`Artist-listed as available on ${date} (${event.timeZone}); confirm directly`})}
        if(artist.rateCard){score+=5;factors.push({key:'rate_card',points:5,reason:'Public artist-submitted rate information is available'})}
        return {artistId:artist.id,name:artist.name,score,factors,availabilitySource:availability?'artist_submitted':null,disclaimer:'Rule-based fit signals from published data; not a prediction or booking guarantee.'};
      }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
      return {event:{id:event.id,name:event.name,city:event.city,localDate:date,timeZone:event.timeZone},method:'explainable_rule_match_v1',candidateCount:artists.length,candidatesTruncated:first.total>artists.length,recommendations:ranked};
    }
  };
}

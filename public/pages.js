const page=document.body.dataset.page;
let csrfToken=null,currentUser=null,currentOrganizations=[],managedArtistIds=new Set(),selectedForCompare=[];
const byId=id=>document.getElementById(id);
const toast=message=>{const element=byId('toast');if(!element)return;element.textContent=message;element.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>element.classList.remove('show'),3400)};
async function api(path,options={}){const headers={...(options.body instanceof Blob?{}:{'content-type':'application/json'}),...(csrfToken?{'x-csrf-token':csrfToken}:{}),...options.headers};const response=await fetch(path,{credentials:'same-origin',...options,headers});let result={};try{result=await response.json()}catch{}if(!response.ok)throw Object.assign(new Error(result.error||'Something went wrong. Please try again.'),{status:response.status});return result}
function headerInitials(name){const words=String(name||'').trim().split(/\s+/).filter(Boolean);return words.slice(0,2).map(word=>Array.from(word)[0].toLocaleUpperCase()).join('')||'U'}
function mountShell(){
  const active=location.pathname;
  const header=byId('site-header');
  header.innerHTML=`<header class="topbar"><a class="brand" href="/" aria-label="Bookable263 home"><img class="brand-symbol" src="/img/logo.png" alt=""><img class="brand-wordmark" src="/img/header.png" alt="Bookable263"></a><nav id="primary-navigation" aria-label="Main navigation"><div class="nav-links"><a href="/artists" ${active==='/artists'?'aria-current="page"':''}>Discover</a><a href="/workspace" ${active==='/workspace'?'aria-current="page"':''}>For artists</a><a href="/saved" ${active==='/saved'?'aria-current="page"':''}>Saved talent</a><a href="/bookings" ${active==='/bookings'?'aria-current="page"':''}>Events &amp; bookings</a></div><div class="nav-session" id="nav-session"><a class="nav-login" href="/sign-in">Sign in</a><a class="button small" href="/register">Create account</a></div></nav><div class="top-actions" id="account-actions"><a class="quiet" href="/sign-in">Sign in</a><a class="button small" href="/register">Create account</a></div><div class="mobile-header-actions"><a class="session-avatar hidden" id="session-avatar" href="/account" aria-label="Your account"></a><button class="menu" id="menu-toggle" type="button" aria-label="Open navigation" aria-controls="primary-navigation" aria-expanded="false"><span class="menu-icon" aria-hidden="true"><i></i><i></i><i></i></span></button></div></header>`;
  byId('site-footer').innerHTML=`<footer class="site-footer"><a class="brand" href="/" aria-label="Bookable263 home"><img class="brand-symbol" src="/img/logo.png" alt=""><img class="brand-wordmark" src="/img/header.png" alt="Bookable263"></a><span>The Entertainment Intelligence Network · Zimbabwe</span><nav><a href="/cookies">Cookies &amp; privacy</a><a href="/account">Account</a></nav></footer>`;
  const menu=byId('menu-toggle');
  const nav=byId('primary-navigation');
  const closeMenu=()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation')};
  menu.onclick=()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation')};
  nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu()});
  document.addEventListener('click',event=>{if(!event.target.closest('.topbar'))closeMenu()});
}
function mountCookieNotice(){const layer=byId('cookie-layer');if(localStorage.getItem('b263-cookie-notice-v1'))return;layer.innerHTML=`<aside class="cookie-notice" aria-label="Cookie information"><div><b>Essential cookies only</b><p>We use a secure session cookie to keep you signed in. This site does not use advertising or analytics cookies.</p></div><div class="cookie-actions"><a class="quiet-link" href="/cookies">Details</a><button id="cookie-dismiss" class="button small" type="button">Got it</button></div></aside>`;byId('cookie-dismiss').onclick=()=>{localStorage.setItem('b263-cookie-notice-v1','dismissed');layer.replaceChildren()}}
function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node}
function skeletonCards(count=6){return Array.from({length:count},()=>{const card=element('div','skeleton-card');card.innerHTML='<div class="skeleton skeleton-banner"></div><div class="skeleton skeleton-line wide"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-button"></div>';return card})}
function formatMoney(minor,currency){if(minor===null||minor===undefined)return 'Not provided';try{return new Intl.NumberFormat(undefined,{style:'currency',currency}).format(Number(minor)/10**new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits)}catch{return `${currency} ${minor}`}}
const hulengendeProfile={
  slug:'hulengende',
  name:'HULENGENDE',
  alias:'Mukambo',
  location:'Zimbabwe',
  genres:['Zimdancehall','Dancehall'],
  bio:"Hulengende, popularly known as Mukambo, is a Zimbabwean Zimdancehall artist recognised for his energetic musical delivery, street-inspired Shona lyricism and growing presence in Zimbabwe's entertainment scene. His distinctive sound and expanding catalogue make him an exciting live-performance attraction.",
  tags:['Zimbabwean music','Live entertainment','Festival performer','Club performer','Emerging artist'],
  tracks:['Zunza Mupunduru','Fadza Madzimai','Kukwadabuka','Chingonzwisisa Baby','Waponda Moyo','Nhepfu Tepfu','Shanje','Gorogota','NhepfuTepfu collaborations'],
  metrics:[
    {value:'5M+',label:'Combined digital views',detail:'Historical media-reported figure · date and source not supplied'},
    {value:'19.6K',label:'Audiomack followers',detail:'Historical reported snapshot · not live · date not supplied'},
    {value:'159.9K',label:'Monthly listeners',detail:'Historical reported snapshot · not live · date not supplied'}
  ],
  event:{
    name:'Tsvimbo Mutauro Album Launch',
    date:'31 October 2026',
    venue:'Chitungwiza Aquatic Complex, Zimbabwe',
    description:'Event listing reports the venue filled to capacity. Numerical attendance has not been verified.',
    lineup:['Guspy Warrior','Bagga','Madedido','Bling 4','Young Fantan','King Alpha Kadiki'],
    tickets:'Reported listings: advance $5 / $10; door $10. VIP/VVIP prices of $10 / $50 were also mentioned and require verification.'
  },
  links:[
    {label:'Audiomack listing',detail:'Ownership unconfirmed',url:'https://audiomack.com/hulengende-'},
    {label:'YouTube search',detail:'Discovery link',url:'https://www.youtube.com/results?search_query=Hulengende+Official'},
    {label:'Facebook search',detail:'Discovery link',url:'https://www.facebook.com/search/top?q=Hulengende'},
    {label:'Instagram search',detail:'Discovery link',url:'https://www.instagram.com/explore/search/keyword/?q=Hulengende'},
    {label:'TikTok search',detail:'Discovery link',url:'https://www.tiktok.com/search?q=Hulengende'}
  ]
};
const madedidoProfile={
  slug:'madedido',
  name:'Madedido',
  origin:'Masvingo, Zimbabwe · reported',
  base:'Chitungwiza, Zimbabwe · reported',
  genres:['Zimdancehall','Dancehall','Trap-influenced Dancehall'],
  movement:'Hwabada Movement · associated',
  bio:"Madedido is a Zimbabwean Zimdancehall artist associated with the Hwabada Movement. Known for his energetic dancehall sound and collaborations within Zimbabwe's urban music scene, he has developed a growing digital audience through releases including Madede, Attack MaJapanees and Ndeapi. His music blends contemporary dancehall influences with Zimbabwean street culture.",
  trackCandidates:['Madede','Attack MaJapanees','Ndeapi','Escobar','Jaiva','Haisi Give','Takano Korobhera','Hwabada Yadonha','Siya Ndiite','Nditerere','Yangu Hayidhambi','Pongwe','Chekutanga'],
  metrics:[
    ['10.2K','Audiomack followers'],
    ['30.5K','Monthly listeners'],
    ['347K','Total plays']
  ],
  links:[
    {label:'Audiomack listing',detail:'Ownership unconfirmed',url:'https://audiomack.com/madedido-1'},
    {label:'YouTube search',detail:'Discovery link',url:'https://www.youtube.com/results?search_query=Madedido+Zw'},
    {label:'Facebook search',detail:'Discovery link',url:'https://www.facebook.com/search/top?q=Madedido'},
    {label:'Instagram search',detail:'Discovery link',url:'https://www.instagram.com/explore/search/keyword/?q=Madedido'},
    {label:'TikTok search',detail:'Discovery link',url:'https://www.tiktok.com/search?q=Madedido'}
  ]
};
const kingAlfaProfile={
  slug:'king-alfa-kadiki',
  name:'King Alfa aka Kadiki',
  alternativeName:'King Alfa Kadiki',
  location:'Zimbabwe · reported',
  genres:['Zimdancehall','Afrobeat','Hip-Hop'],
  movement:'Matrix Music Movement · associated',
  bio:'King Alfa, also known as Kadiki, is a Zimbabwean artist associated with the Matrix Music Movement. His reported releases span Zimdancehall, Afrobeat and Hip-Hop. This profile is awaiting confirmation from the artist or an authorized guardian.',
  trackCandidates:['Summer BinLaden','Yadeuka Yadeuka','Mebho','Yahwee','Shamwari Yerwendo','Chamunorwa','Senorita','Ndizvo Here','Ndiri Mudiki Mainini','Dear Brother','Mutiomborere','Kurauone Mwanangu','Mwari Mukuru','Lodza','Magetsi','Amai','Mumoyo Nda...'],
  links:[{platform:'youtube',label:'YouTube channel',detail:'Channel link supplied · ownership unverified',url:'https://www.youtube.com/@Kingalfakadiki'}]
};
const bossPumacolProfile={
  slug:'boss-pumacol',
  name:'Boss Pumacol',
  aliases:['Boss Pumakol'],
  location:'Zimbabwe',
  reportedOrigin:'Mabvuku, Harare · reported',
  genres:['Reggae Dancehall','Zimdancehall','Reggae Fusion'],
  movement:'Chillspot Records · reported association',
  bio:"Boss Pumacol is a Zimbabwean reggae and dancehall recording artist known for his energetic delivery, distinctive dancehall sound and collaborations across Zimbabwe's urban music scene. Associated with the Chillspot Records movement, he has built a catalogue spanning Zimdancehall, reggae and contemporary dancehall influences, with releases including Zvamakatakura Amai, Father Devil, Ammara, Goodbye and Bho Takadaro.",
  trackCandidates:[
    'Zvamakatakura Amai','Father Devil','Ammara','Rekeni','Mazuva Angu','Problem','Nguva Yekutamba','16 Law','Zvatinoita',
    'Come Over','Time Time','Geza','Ndiwe Wega','Murudo','Zimbabwe','Hondo','Hesi Marry J','Gauro','Haisi Danger','Haasi Bho',
    'Formular','Ammara Brown','Hamunzwe (Dongo Dongo)','Crispi Malabhula','Ako Mudhara','Swag Dug Dig','Snapback','Lucifer',
    'King Booker','Goodbye','Bho Takadaro','Skelemu','Nyasha ne Ngoni','Uri Mwenje','Saraffina','Ndodya Vanhu','Push It In',
    'Chop Dem','Ngaakande','Mwari Muhombe','Shinga'
  ],
  featuredTracks:[
    {title:'Goodbye',featuring:'Anita Jaxson',release:'2025 · Chadzunda EP · reported',credit:'Victor Stot · reported production credit'},
    {title:'Bho Takadaro',featuring:'Blot Greenade',release:'Published 25 March 2025 · Chadzunda EP · reported',credit:'Cymplex Music audio · Studio Art Pictures visuals · reported credits'},
    {title:'Zimbabwe',release:'2021 · Destiny Riddim · reported',credit:'Tala Muzik · reported production credit'},
    {title:'Nguva Yekutamba',featuring:'Jah Signal',release:'Release details unconfirmed',credit:'Reported collaboration'},
    {title:'Time Time',featuring:'Rymez and Ammara Brown',release:'Release details unconfirmed',credit:'Reported collaboration'},
    {title:'Come Over',featuring:'Ti Gonzi',release:'Release details unconfirmed',credit:'Reported collaboration'}
  ],
  recentReleases:[
    ['Nyasha ne Ngoni','2026'],['Twenty Twenty Fix EP','2026'],['Saraffina','2026'],['Skelemu','2026'],['Uri Mwenje','2026'],
    ['Ndodya Vanhu','2025'],['Push It In','2025'],['Chop Dem','2025'],['Ngaakande','2025'],['Mwari Muhombe','2025']
  ],
  links:[
    {platform:'youtube',label:'YouTube channel',detail:'Channel supplied · awaiting artist confirmation',url:'https://www.youtube.com/@Bosspumacol'},
    {platform:'apple-music',label:'Apple Music catalogue',detail:'Artist listing · awaiting artist confirmation',url:'https://music.apple.com/us/artist/boss-pumacol/1734132511'}
  ]
};
function socialPlatform(link){
  if(link.platform)return link.platform;
  const label=String(link.label||'').toLowerCase();
  for(const name of ['audiomack','youtube','instagram','facebook','tiktok','spotify','apple music','x'])if(label.includes(name))return name.replace(' ','-');
  return 'link';
}
function socialGlyph(platform){
  return ({audiomack:'A',youtube:'▶',instagram:'◎',facebook:'f',tiktok:'♪',spotify:'≋','apple-music':'♪',x:'𝕏',link:'↗'})[platform]||'↗';
}
function socialIconLink(link,className='social-icon-link'){
  const platform=socialPlatform(link);
  const anchor=element('a',`${className} social-${platform}`);
  anchor.href=link.url;anchor.target='_blank';anchor.rel='noopener noreferrer';
  anchor.setAttribute('aria-label',`${link.label} · ${link.detail}`);
  anchor.title=`${link.label} · ${link.detail}`;
  anchor.append(element('span','social-icon-symbol',socialGlyph(platform)));
  return anchor
}
function localDateTimeToUtc(value,timeZone){if(!value)return '';const [date,time]=value.split('T');const [year,month,day]=date.split('-').map(Number);const [hour,minute]=time.split(':').map(Number);const desired=Date.UTC(year,month-1,day,hour,minute);let guess=desired;const formatter=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});for(let iteration=0;iteration<4;iteration++){const parts=Object.fromEntries(formatter.formatToParts(new Date(guess)).filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));const represented=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second);const correction=desired-represented;guess+=correction;if(correction===0)break}return new Date(guess).toISOString()}
function requireUser(){if(!currentUser){location.href=`/sign-in?next=${encodeURIComponent(location.pathname+location.search)}`;return false}return true}
async function ensureSession(){
  try{
    const session=await api('/api/session');
    csrfToken=session.csrfToken;
    currentUser=session.user;
    const actions=byId('account-actions');
    const avatar=byId('session-avatar');
    const mobileSession=byId('nav-session');
    if(currentUser){
      avatar.textContent=headerInitials(currentUser.name);
      avatar.title=currentUser.name;
      avatar.setAttribute('aria-label',`Account for ${currentUser.name}`);
      avatar.classList.remove('hidden');
      const greeting=element('a','quiet',currentUser.name.split(' ')[0]);
      greeting.href='/account';
      const out=element('button','quiet','Sign out');
      out.type='button';
      out.onclick=async()=>{try{await api('/api/logout',{method:'POST',body:'{}'});location.href='/'}catch(error){toast(error.message)}};
      actions.replaceChildren(greeting,out);
      const account=element('a','nav-account','Account');
      account.href='/account';
      const mobileSignout=element('button','nav-signout','Sign out');
      mobileSignout.type='button';
      mobileSignout.onclick=out.onclick;
      mobileSession.replaceChildren(account,mobileSignout);
    }else{
      avatar.classList.add('hidden');
      const login=element('a','nav-login','Sign in');
      login.href='/sign-in';
      const join=element('a','button small','Create account');
      join.href='/register';
      mobileSession.replaceChildren(login,join);
      const desktopLogin=element('a','quiet','Sign in');
      desktopLogin.href='/sign-in';
      const desktopJoin=element('a','button small','Create account');
      desktopJoin.href='/register';
      actions.replaceChildren(desktopLogin,desktopJoin);
    }
    return session;
  }catch(error){return {user:null}}
}
function routeArtist(artist){location.href=`/artists/${artist.id}`}
async function saveArtist(artistId){if(!requireUser())return;try{let {shortlists}=await api('/api/shortlists');let list=shortlists.find(item=>item.name.toLowerCase()==='saved artists')||shortlists[0];if(!list)list=(await api('/api/shortlists',{method:'POST',body:JSON.stringify({name:'Saved artists'})})).shortlist;await api(`/api/shortlists/${list.id}/artists/${artistId}`,{method:'POST',body:'{}'});toast('Artist saved to your shortlist.')}catch(error){toast(error.message)}}
function artistCard(artist){const card=element('article',`artist-card${artist.profileImageUrl?' has-image':''}`);const banner=element('div','artist-card-top');if(artist.profileImageUrl){const image=document.createElement('img');image.className='artist-card-image';image.src=artist.profileImageUrl;image.alt=`Image supplied for ${artist.name}`;image.loading='lazy';banner.append(image)}banner.append(element('span','artist-monogram',artist.name.slice(0,1).toUpperCase()),element('span','artist-type',artist.claimed?'ARTIST':artist.profileStatus==='demo'?'DEMO · UNCLAIMED':artist.type==='group'?'GROUP / BAND':'ARTIST'));const content=element('div','artist-card-content');content.append(element('h2','',artist.name),element('p','artist-meta',[artist.baseCity||'Location not provided',...artist.categories.map(item=>item.label)].join(' · ')),element('p','artist-bio',artist.biography||'No biography supplied.'),element('p','artist-rate',artist.rateCard?(artist.rateCard.customQuote?'Custom quotation available':formatMoney(artist.rateCard.amountMinor,artist.rateCard.currencyCode)):'Booking rate not provided'),element('small','artist-trust',artist.profileStatus==='demo'?'Demo profile · artist confirmation pending':'Artist-submitted profile · performance history only when confirmed'));const actions=element('div','card-actions');const view=element('a','button outline','View profile');view.href=`/artists/${artist.profileSlug||artist.id}`;const save=element('button','text-button','Save +');save.type='button';save.onclick=()=>saveArtist(artist.id);actions.append(view,save);const compare=element('label','compare-option');const check=document.createElement('input');check.type='checkbox';check.checked=selectedForCompare.includes(artist.id);check.onchange=()=>{selectedForCompare=check.checked?[...selectedForCompare,artist.id]:selectedForCompare.filter(id=>id!==artist.id);document.querySelectorAll('#compare-selected').forEach(button=>button.classList.toggle('hidden',selectedForCompare.length<2))};compare.append(check,document.createTextNode('Compare'));content.append(actions,compare);card.append(banner,content);return card}
function homeFeaturedArtist({name,alias,imageSrc,imageAlt,genres,bio,track,previewNote,priceTitle,priceBadge,priceNote,stats,statusNote,profileUrl,profileLabel,socialLinks=[],variantClass=''}){
  const card=element('article',`home-featured-artist ${variantClass}`.trim());
  const profile=element('section','home-artist-profile');
  const portrait=element('div','home-artist-portrait');
  const image=document.createElement('img');image.src=imageSrc;image.alt=imageAlt;image.loading='lazy';image.decoding='async';
  const status=element('span','flagship-label','DEMO · UNCLAIMED');
  portrait.append(image,status);
  const identity=element('div','home-artist-identity');
  identity.append(element('p','artist-meta','ZIMDANCEHALL · ZIMBABWE'),element('h2','',name));
  if(alias)identity.append(element('p','home-artist-alias',`Also known as ${alias}`));
  const tags=element('div','home-artist-tags');
  for(const tag of genres)tags.append(element('span','',tag));
  identity.append(tags,element('p','home-artist-bio',bio));
  const player=element('div','home-audio-preview');
  const play=element('button','preview-play','▶');play.type='button';play.disabled=true;play.setAttribute('aria-label','Audio preview unavailable');play.title='An authorized audio preview has not been supplied.';
  const trackInfo=element('div','preview-track');trackInfo.append(element('strong','',track),element('span','',previewNote));
  const waveform=element('div','preview-waveform');waveform.setAttribute('aria-hidden','true');
  for(const height of [7,11,15,9,18,12,22,14,9,19,12,16,8,21,13,10,17,7,14,19]){const bar=document.createElement('i');bar.style.setProperty('--bar-height',`${height}px`);waveform.append(bar)}
  player.append(play,trackInfo,waveform);
  identity.append(player);
  profile.append(portrait,identity);

  const details=element('div','home-artist-details');
  const price=element('section','home-price-panel');
  const priceHeading=element('div','home-panel-heading');priceHeading.append(element('span','',priceTitle),element('span','indicative-badge',priceBadge));
  price.append(priceHeading,element('strong','home-price',priceNote.value),element('p','home-panel-note',priceNote.description));

  const intelligence=element('section','home-intelligence-panel');
  const intelligenceHeader=element('div','home-panel-heading');intelligenceHeader.append(element('span','','Audience & event snapshot'),element('span','reported-badge','Reported data'));
  const intelligenceBody=element('div','home-intelligence-body');
  const ring=element('div','confidence-ring');ring.setAttribute('role','img');ring.setAttribute('aria-label','Profile figures are reported or unverified; none are presented as verified live data.');
  ring.append(element('span','','STATUS'),element('strong','','UNVERIFIED'));
  const statGrid=element('div','home-stat-grid');
  for(const [value,label,note] of stats){const stat=element('article','home-stat');stat.append(element('strong','',value),element('span','',label),element('small','',note));statGrid.append(stat)}
  intelligenceBody.append(ring,statGrid);
  intelligence.append(intelligenceHeader,intelligenceBody,element('p','home-panel-note',statusNote));

  const actions=element('div','home-feature-actions');
  const socials=element('div','home-card-socials');
  for(const link of socialLinks)socials.append(socialIconLink(link,'social-icon-link home-social-icon'));
  const view=element('a','button',profileLabel);view.href=profileUrl;
  const paused=element('span','booking-paused','Booking opens when the profile is claimed');
  if(socialLinks.length)actions.append(socials);
  actions.append(view,paused);
  details.append(price,intelligence,actions);
  card.append(profile,details);
  return card
}
function hulengendeCard(){
  return homeFeaturedArtist({
    name:hulengendeProfile.name,
    alias:hulengendeProfile.alias,
    imageSrc:'/img/hulengende.png',
    imageAlt:'Portrait supplied for Hulengende’s demo profile',
    genres:['Zimdancehall','Dancehall','Live performer'],
    bio:'Energetic Zimdancehall delivery and street-inspired Shona lyricism. This demo profile has not been claimed or independently verified.',
    track:hulengendeProfile.tracks[0],
    previewNote:'30-second preview · coming soon',
    priceTitle:'Booking indication',
    priceBadge:'Indicative',
    priceNote:{value:'From $5,000 USD',description:'Reported media figure. Not a guaranteed rate; management confirmation required.'},
    stats:[['5M+','Combined digital views','Media reported'],['19.6K','Audiomack followers','Historical snapshot'],['159.9K','Monthly listeners','Historical snapshot'],['Capacity filled','Tsvimbo Mutauro launch','Attendance unverified']],
    statusNote:'Audience figures are historical reports, not live analytics. The reported event did not include a verified attendance count.',
    profileUrl:'/artists/hulengende',
    profileLabel:'Explore full profile',
    socialLinks:hulengendeProfile.links
  })
}
function madedidoHomeCard(){
  return homeFeaturedArtist({
    name:madedidoProfile.name,
    imageSrc:'/img/madedido.png',
    imageAlt:'Portrait supplied for Madedido’s unclaimed demo profile',
    genres:['Zimdancehall','Dancehall','Hwabada Movement'],
    bio:'Energetic dancehall sound and collaborations in Zimbabwe’s urban music scene. This profile is awaiting artist confirmation.',
    track:madedidoProfile.trackCandidates[0],
    previewNote:'Audio preview · awaiting confirmation',
    priceTitle:'Booking enquiries',
    priceBadge:'Quote only',
    priceNote:{value:'Request a quote',description:'No current booking rate is confirmed. Availability and quotations require authorized management.'},
    stats:[['10.2K','Audiomack followers','Historical snapshot'],['30.5K','Monthly listeners','Historical snapshot'],['347K','Total plays','Historical snapshot'],['No verified shows','Performance history','Awaiting confirmation']],
    statusNote:'Historical reported figures only—not live analytics. The artist account and collection date are unconfirmed.',
    profileUrl:'/artists/madedido',
    profileLabel:'Explore full profile',
    socialLinks:madedidoProfile.links,
    variantClass:'home-madedido-card'
  })
}
function kingAlfaHomeCard(){
  return homeFeaturedArtist({
    name:kingAlfaProfile.name,
    imageSrc:'/img/kadiki.png',
    imageAlt:'Image supplied for King Alfa aka Kadiki’s guardian-managed demo profile',
    genres:['Zimdancehall','Afrobeat','Hip-Hop'],
    bio:'Artist associated with the Matrix Music Movement. This guardian-managed demo profile is awaiting authorized confirmation.',
    track:kingAlfaProfile.trackCandidates[0],
    previewNote:'Audio preview · awaiting authorization',
    priceTitle:'Booking enquiries',
    priceBadge:'Guardian review',
    priceNote:{value:'Request a quote',description:'No fee is published. Bookings require review and approval from an authorized adult guardian.'},
    stats:[['17','Track candidates','Attribution unverified'],['No public fee','Quote by enquiry','Guardian approval required'],['No direct contact','Safeguarding protected','Guardian-managed profile'],['Unverified','Artist profile status','Awaiting confirmation']],
    statusNote:'No private contact details or identity documents are displayed. Promoters cannot contact the artist directly.',
    profileUrl:'/artists/king-alfa-kadiki',
    profileLabel:'View full profile',
    socialLinks:kingAlfaProfile.links,
    variantClass:'home-king-alfa-card'
  })
}
function bossPumacolHomeCard(){
  return homeFeaturedArtist({
    name:bossPumacolProfile.name,
    imageSrc:'/img/boss-pumacol.png',
    imageAlt:'Portrait supplied for Boss Pumacol’s unclaimed demo profile',
    genres:['Reggae Dancehall','Zimdancehall','Reggae Fusion'],
    bio:'Energetic Zimbabwean reggae and dancehall sound, with a reported catalogue across the local urban music scene. Profile details await artist confirmation.',
    track:'Goodbye · featuring Anita Jaxson',
    previewNote:'Featured release · audio preview unavailable',
    priceTitle:'Booking enquiries',
    priceBadge:'Quote only',
    priceNote:{value:'Request a quote',description:'No current booking fee is published. Confirm rate and availability with authorized management.'},
    stats:[['No live metrics','Audience data','Not provided'],['No confirmed shows','Performance history','Awaiting verification'],['Request a quote','Booking model','No public rate'],['Unclaimed','Profile status','Awaiting confirmation']],
    statusNote:'No audience metrics or verified performance history have been supplied. Catalogue credits are labelled as reported pending confirmation.',
    profileUrl:'/artists/boss-pumacol',
    profileLabel:'View full profile',
    socialLinks:bossPumacolProfile.links,
    variantClass:'home-boss-pumacol-card'
  })
}
function bazookaHomeCard(){
  return homeFeaturedArtist({
    name:'Bazooka',
    alias:'Bazooker',
    imageSrc:'/img/bazooker.png',
    imageAlt:'Image supplied for Bazooka’s unclaimed demo profile',
    genres:['Zimdancehall','Dancehall','Reggae'],
    bio:'Zimbabwean Zimdancehall performer with a reported catalogue including Kumba Kwedu and Umdala Wethu. Artist details and music credits await confirmation.',
    track:'Kumba Kwedu',
    previewNote:'Reported catalogue highlight · audio preview unavailable',
    priceTitle:'Booking enquiries',
    priceBadge:'Quote only',
    priceNote:{value:'Request a quote',description:'No current booking fee is published. Booking requests require artist or authorized management confirmation.'},
    stats:[['Historical snapshot','Audience data','Not live · unverified'],['No confirmed shows','Performance history','Awaiting verification'],['Request a quote','Booking model','No public rate'],['Unclaimed','Profile status','Awaiting confirmation']],
    statusNote:'Catalogue, collaborations, social accounts and performance references are reported candidates awaiting verification.',
    profileUrl:'/artists/bazooka',
    profileLabel:'View full profile',
    socialLinks:[
      {platform:'youtube',label:'YouTube channel',url:'https://www.youtube.com/@realbazookerofficial'},
      {platform:'audiomack',label:'Audiomack listing',url:'https://audiomack.com/bazooker'}
    ],
    variantClass:'home-bazooka-card'
  })
}
const searchableDemoProfiles=[
  {profile:hulengendeProfile,name:'HULENGENDE',url:'/artists/hulengende',image:'/img/hulengende.png',imageAlt:'Portrait supplied for Hulengende’s demo profile',genres:['Zimdancehall','Dancehall','Musician','Live performer'],locations:['Zimbabwe'],keywords:['Mukambo','Zimbabwean music',...hulengendeProfile.tracks],links:hulengendeProfile.links,description:'Zimbabwean Zimdancehall artist · demo profile awaiting confirmation.'},
  {profile:madedidoProfile,name:'Madedido',url:'/artists/madedido',image:'/img/madedido.png',imageAlt:'Portrait supplied for Madedido’s demo profile',genres:['Zimdancehall','Dancehall','Trap-influenced Dancehall','Musician'],locations:['Zimbabwe','Masvingo','Chitungwiza'],keywords:['Zimbabwean music','Hwabada Movement',...madedidoProfile.trackCandidates],links:madedidoProfile.links,description:'Zimdancehall artist · demo profile awaiting artist confirmation.'},
  {profile:kingAlfaProfile,name:'King Alfa aka Kadiki',url:'/artists/king-alfa-kadiki',image:'/img/kadiki.png',imageAlt:'Image supplied for King Alfa aka Kadiki’s guardian-managed demo profile',genres:['Zimdancehall','Afrobeat','Hip-Hop','Musician'],locations:['Zimbabwe'],keywords:['King Alfa Kadiki','Matrix Music Movement',...kingAlfaProfile.trackCandidates],links:kingAlfaProfile.links,description:'Guardian-managed demo profile · awaiting authorized confirmation.'},
  {profile:bossPumacolProfile,name:'Boss Pumacol',url:'/artists/boss-pumacol',image:'/img/boss-pumacol.png',imageAlt:'Portrait supplied for Boss Pumacol’s unclaimed demo profile',genres:['Reggae Dancehall','Zimdancehall','Reggae Fusion','Musician'],locations:['Zimbabwe','Harare','Mabvuku'],keywords:['Boss Pumakol','Chillspot Records',...bossPumacolProfile.trackCandidates,...bossPumacolProfile.featuredTracks.flatMap(track=>[track.featuring,track.credit])],links:bossPumacolProfile.links,description:'Reggae dancehall artist · profile awaiting artist confirmation.'}
];
function matchesDemoProfile(item,filters){
  if(filters.availableOn)return false;
  if(filters.category&&!['musician','performer'].includes(filters.category))return false;
  if(filters.genre&&!item.genres.some(genre=>genre.toLowerCase()===filters.genre.toLowerCase()))return false;
  const location=String(filters.location||'').trim().toLowerCase();
  if(location&&!item.locations.some(value=>value.toLowerCase().startsWith(location)||location.startsWith(value.toLowerCase())))return false;
  const searchable=[item.name,...item.genres,...item.locations,...item.keywords,item.profile.bio].join(' ').toLowerCase();
  return String(filters.q||'').trim().toLowerCase().split(/\s+/).filter(Boolean).every(token=>searchable.includes(token))
}
function demoArtistSearchCard(item){
  const card=element('article','artist-card demo-artist-card');
  const banner=element('div','artist-card-top demo-artist-card-top');
  const image=document.createElement('img');image.src=item.image;image.alt=item.imageAlt;image.loading='lazy';image.decoding='async';
  banner.append(image,element('span','flagship-label',item.name===kingAlfaProfile.name?'GUARDIAN-MANAGED · DEMO':'DEMO · UNCLAIMED'));
  const content=element('div','artist-card-content');
  content.append(element('p','artist-meta','ZIMBABWE · ZIMDANCEHALL'),element('h2','',item.name),element('p','artist-bio',item.description));
  const actions=element('div','card-actions demo-card-actions');
  const icons=element('div','demo-card-socials');for(const link of item.links)icons.append(socialIconLink(link));
  const view=element('a','button outline','View full profile');view.href=item.url;
  actions.append(icons,view);content.append(actions);card.append(banner,content);return card
}
async function loadHome(){byId('home-search').onsubmit=event=>{event.preventDefault();const query=byId('home-query').value.trim();location.href='/artists'+(query?'?q='+encodeURIComponent(query):'')};byId('home-artists').replaceChildren(hulengendeCard(),madedidoHomeCard(),kingAlfaHomeCard(),bossPumacolHomeCard(),bazookaHomeCard())}
let searchPage=1,searchFilters={};
async function loadArtistSearch({append=false}={}){const area=byId('artist-results');if(!append){searchPage=1;area.setAttribute('aria-busy','true');area.replaceChildren(...skeletonCards(6))}const params=new URLSearchParams({...searchFilters,page:String(searchPage)});try{const result=await api(`/api/artists?${params}`);const demoMatches=append?[]:searchableDemoProfiles.filter(item=>matchesDemoProfile(item,searchFilters));const cards=[...demoMatches.map(demoArtistSearchCard),...result.artists.map(artistCard)];if(append)area.append(...cards);else area.replaceChildren(...cards);const shown=area.querySelectorAll('.artist-card').length;const total=result.total+demoMatches.length;byId('artist-result-status').textContent=`${total} profile${total===1?'':'s'} found · showing ${shown}`;const more=byId('load-more-artists');more.classList.toggle('hidden',shown>=total);searchPage++;if(total===0)area.append(element('div','empty-panel','No published profiles match those filters. Try a different city or date.'))}catch(error){area.replaceChildren(element('div','empty-panel',error.message));byId('artist-result-status').textContent='Could not load profiles.'}finally{area.setAttribute('aria-busy','false')}}
async function initArtists(){byId('filter-zone').value=Intl.DateTimeFormat().resolvedOptions().timeZone;try{const {categories}=await api('/api/artist-categories');const select=byId('filter-category');for(const item of categories){const option=document.createElement('option');option.value=item.slug;option.textContent=item.label;select.append(option)}}catch{}const params=new URLSearchParams(location.search);for(const key of ['q','category','genre','location','availableOn','timeZone'])if(params.has(key)){const map={q:'filter-q',category:'filter-category',genre:'filter-genre',location:'filter-city',availableOn:'filter-date',timeZone:'filter-zone'};byId(map[key]).value=params.get(key)}byId('artist-search').onsubmit=event=>{event.preventDefault();searchFilters=Object.fromEntries(new FormData(event.currentTarget));searchFilters=Object.fromEntries(Object.entries(searchFilters).filter(([,value])=>value));const next=new URLSearchParams(searchFilters);history.replaceState(null,'',`/artists${next.size?'?'+next:''}`);loadArtistSearch()};byId('load-more-artists').onclick=()=>loadArtistSearch({append:true});byId('compare-selected').onclick=openComparison;searchFilters=Object.fromEntries(new URLSearchParams(location.search));await loadArtistSearch()}
async function openComparison(){if(selectedForCompare.length<2||selectedForCompare.length>4){toast('Select two to four profiles to compare.');return}try{const {artists}=await api(`/api/artist-comparison?ids=${selectedForCompare.join(',')}`);const dialog=document.createElement('dialog');dialog.className='compare-dialog';const inner=element('div','dialog-form');const close=element('button','dialog-close','×');close.type='button';close.onclick=()=>dialog.close();inner.append(close,element('div','eyebrow','PROFILE COMPARISON'),element('h2','','Compare your selection'));const table=document.createElement('table');table.className='comparison-table';const rows=[['Artist',artist=>artist.name],['City',artist=>artist.baseCity||'Unavailable'],['Categories',artist=>artist.categories.map(item=>item.label).join(', ')||'Unavailable'],['Genres',artist=>artist.genres.join(', ')||'Unavailable'],['Rate',artist=>artist.rateCard?(artist.rateCard.customQuote?'Custom quote':formatMoney(artist.rateCard.amountMinor,artist.rateCard.currencyCode)):'Unavailable'],['Availability',()=> 'Confirm directly']];for(const [label,value] of rows){const tr=table.insertRow();tr.insertCell().textContent=label;for(const artist of artists)tr.insertCell().textContent=value(artist)}inner.append(table);const save=document.createElement('form');save.className='inline-form';save.innerHTML='<label class="sr-only">Comparison name<input name="name" minlength="2" maxlength="80" required placeholder="Comparison name"></label><button class="button">Save comparison</button>';save.onsubmit=async event=>{event.preventDefault();try{await api('/api/comparisons',{method:'POST',body:JSON.stringify({name:new FormData(save).get('name'),artistIds:selectedForCompare})});toast('Comparison saved.');dialog.close()}catch(error){toast(error.message)}};inner.append(save);dialog.append(inner);document.body.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove(),{once:true})}catch(error){toast(error.message)}}
async function loadArtistPage(){const id=location.pathname.split('/').at(-1);const root=byId('artist-profile');try{const [{artist},{dates},{media},{reputation}]=await Promise.all([api(`/api/artists/${id}`),api(`/api/artists/${id}/availability`),api(`/api/artists/${id}/media`),api(`/api/artists/${id}/reputation`)]);document.title=`${artist.name} · Bookable263`;root.replaceChildren();root.removeAttribute('aria-busy');const cover=element('div','artist-profile-cover');for(const item of media.slice(0,5)){if(item.mediaType==='photo'){const img=document.createElement('img');img.src=item.url;img.alt=item.caption||`${artist.name} portfolio`;cover.append(img)}}const body=element('div','artist-profile-body');const intro=element('div','profile-intro');intro.append(element('div','eyebrow',`${artist.type==='group'?'GROUP / BAND':'ARTIST'} · ARTIST-SUBMITTED`),element('h1','',artist.name),element('p','artist-meta',[artist.baseCity||'Location not provided',...artist.categories.map(item=>item.label)].join(' · ')),element('p','profile-bio',artist.biography||'No biography provided.'));const book=element('a','button','Request this artist');book.href=`/bookings?artist=${artist.id}`;const save=element('button','button outline','Save to shortlist');save.type='button';save.onclick=()=>saveArtist(artist.id);intro.append(book,save);const details=element('div','profile-details');details.append(infoPanel('Booking rate',artist.rateCard?(artist.rateCard.customQuote?'Custom quotation available':formatMoney(artist.rateCard.amountMinor,artist.rateCard.currencyCode)):'Not provided'),infoPanel('Availability',dates.length?dates.map(date=>`${date.localDate} · ${date.timeZone} · artist-submitted`).join('<br>'):'Not provided. Please confirm directly.',true),infoPanel('Confirmed history',`${reputation.verifiedPerformances} performances · ${reputation.verifiedReviewCount} reviews${reputation.averageRating===null?'':` · ${reputation.averageRating}/5`}`),infoPanel('Genres',artist.genres.join(', ')||'Not provided'));body.append(intro,details);const videos=media.filter(item=>item.mediaType==='video');if(videos.length){const gallery=element('section','content-panel');gallery.append(element('h2','','Performance videos'));for(const video of videos){const a=element('a','profile-video-link',video.caption||'Open artist-submitted video');a.href=video.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';gallery.append(a)}body.append(gallery)}root.append(cover,body)}catch(error){root.removeAttribute('aria-busy');root.replaceChildren(element('div','empty-panel',error.message))}}
function infoPanel(title,content,allowBreaks=false){const panel=element('article','info-card');panel.append(element('h3','',title));const value=element('p','',allowBreaks?content.replaceAll('<br>',' · '):content);panel.append(value);return panel}
function guestView(guestId,loadingId,contentId){byId(loadingId)?.classList.add('hidden');byId(contentId)?.classList.add('hidden');byId(guestId)?.classList.remove('hidden')}
async function loadWorkspace(){let artistOrgs=[];if(!currentUser){guestView('workspace-guest','workspace-skeleton','workspace-content');return}const skeleton=byId('workspace-skeleton'),content=byId('workspace-content');try{const [{organizations},managed,categories]=await Promise.all([api('/api/organizations'),api('/api/managed-artists'),api('/api/artist-categories')]);currentOrganizations=organizations;managedArtistIds=new Set(managed.artists.map(artist=>artist.id));artistOrgs=organizations.filter(org=>['artist','agency'].includes(org.type));byId('organization-list').replaceChildren();for(const org of organizations){const row=element('article','list-row');const info=element('div');info.append(element('b','',org.name),element('small','',`${org.type} · ${org.role}`));const actions=element('div','row-actions');const invite=element('button','text-button','Invite teammate');invite.type='button';invite.onclick=async()=>{const email=prompt('Email address for the teammate');if(!email)return;try{const result=await api(`/api/organizations/${org.id}/invitations`,{method:'POST',body:JSON.stringify({email,role:'member'})});const inviteUrl=`${location.origin}/invite?token=${encodeURIComponent(result.invitation.invitationToken)}`;try{await navigator.clipboard.writeText(inviteUrl);toast('Invitation link copied. Send it to the invited email address.')}catch{alert(`Share this one-time invitation link with ${email}:\n${inviteUrl}`)}}catch(error){toast(error.message)}};actions.append(invite);row.append(info,actions);byId('organization-list').append(row)}const orgSelect=byId('artist-organization');orgSelect.replaceChildren(...artistOrgs.map(org=>{const option=document.createElement('option');option.value=org.id;option.textContent=org.name;return option}));const categorySelect=byId('artist-categories');categorySelect.replaceChildren();for(const category of categories.categories){const option=document.createElement('option');option.value=category.slug;option.textContent=category.label;categorySelect.append(option)}byId('managed-artists').replaceChildren();if(!managed.artists.length)byId('managed-artists').append(element('p','empty-inline','No profiles yet. Create an artist or agency organization, then start a profile.'));for(const artist of managed.artists){const row=element('article','list-row');const info=element('div');info.append(element('b','',artist.name),element('small','',artist.publicationStatus==='published'?'Published profile':'Private draft'));const actions=element('div','row-actions');if(artist.publicationStatus==='draft'){const publish=element('button','text-button','Publish');publish.type='button';publish.onclick=async()=>{try{await api(`/api/artists/${artist.id}/publish`,{method:'POST',body:'{}'});toast('Profile published.');loadWorkspace()}catch(error){toast(error.message)}};actions.append(publish)}const mediaButton=element('button','text-button','Add photo');mediaButton.type='button';mediaButton.onclick=()=>{const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{const response=await fetch(`/api/artists/${artist.id}/media/photos`,{method:'POST',credentials:'same-origin',headers:{'content-type':file.type,'x-csrf-token':csrfToken},body:file});const result=await response.json();if(!response.ok)throw new Error(result.error);toast('Photo uploaded.');}catch(error){toast(error.message)}};input.click()};actions.append(mediaButton);row.append(info,actions);byId('managed-artists').append(row)}skeleton.classList.add('hidden');content.classList.remove('hidden')}catch(error){skeleton.classList.add('hidden');content.classList.remove('hidden');byId('organization-list').append(element('p','form-error',error.message))}byId('new-organization').onclick=()=>byId('organization-modal').showModal();byId('new-artist').onclick=()=>{if(!artistOrgs.length){toast('Create an artist or agency organization first.');return}byId('artist-modal').showModal()};byId('organization-form').onsubmit=async event=>{event.preventDefault();try{await api('/api/organizations',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});byId('organization-modal').close();toast('Organization created.');loadWorkspace()}catch(error){toast(error.message)}};byId('artist-form').onsubmit=async event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));data.categories=[...byId('artist-categories').selectedOptions].map(option=>option.value);data.genres=String(data.genres||'').split(',').map(item=>item.trim()).filter(Boolean);try{await api('/api/artists',{method:'POST',body:JSON.stringify(data)});byId('artist-modal').close();event.currentTarget.reset();toast('Private artist profile created.');loadWorkspace()}catch(error){toast(error.message)}}}
async function loadSaved(){if(!currentUser){guestView('saved-guest','saved-skeleton','saved-content');return}try{const [lists,comparisons]=await Promise.all([api('/api/shortlists'),api('/api/comparisons')]);byId('saved-skeleton').classList.add('hidden');byId('saved-content').classList.remove('hidden');byId('shortlist-list').replaceChildren();for(const item of lists.shortlists){const row=element('article','list-row');const info=element('div');info.append(element('b','',item.name),element('small','',`${item.artistCount} artists`));const view=element('button','text-button','Open');view.type='button';view.onclick=()=>openShortlist(item.id);row.append(info,view);byId('shortlist-list').append(row)}if(!lists.shortlists.length)byId('shortlist-list').append(element('p','empty-inline','Save artists from discovery to build your first shortlist.'));byId('comparison-list').replaceChildren();for(const comp of comparisons.comparisons){const row=element('article','list-row');row.append(element('b','',comp.name),element('small','',new Date(comp.createdAt).toLocaleDateString()));byId('comparison-list').append(row)}if(!comparisons.comparisons.length)byId('comparison-list').append(element('p','empty-inline','Comparisons you save will appear here.'));byId('new-shortlist-form').onsubmit=async event=>{event.preventDefault();try{await api('/api/shortlists',{method:'POST',body:JSON.stringify({name:new FormData(event.currentTarget).get('name')})});event.currentTarget.reset();toast('Shortlist created.');loadSaved()}catch(error){toast(error.message)}}}catch(error){toast(error.message)}}
async function openShortlist(id){try{const {shortlist}=await api(`/api/shortlists/${id}`);byId('shortlist-title').textContent=shortlist.name;const area=byId('shortlist-artists');area.replaceChildren();for(const artist of shortlist.artists){const row=element('article','list-row');const link=element('a','',artist.name);link.href=`/artists/${artist.id}`;const remove=element('button','text-button','Remove');remove.type='button';remove.onclick=async()=>{await api(`/api/shortlists/${id}/artists/${artist.id}`,{method:'DELETE'});openShortlist(id)};row.append(link,remove);area.append(row)}byId('delete-shortlist').onclick=async()=>{if(!confirm('Delete this shortlist?'))return;await api(`/api/shortlists/${id}`,{method:'DELETE'});byId('shortlist-modal').close();loadSaved()};byId('shortlist-modal').showModal()}catch(error){toast(error.message)}}
async function loadBookings(){if(!currentUser){guestView('bookings-guest','bookings-skeleton','bookings-content');return}try{const [orgResult,eventResult,venueResult,bookingResult,managed]=await Promise.all([api('/api/organizations'),api('/api/events'),api('/api/venues'),api('/api/bookings'),api('/api/managed-artists')]);currentOrganizations=orgResult.organizations;managedArtistIds=new Set(managed.artists.map(artist=>artist.id));const organizerOrgs=currentOrganizations.filter(org=>['venue','promoter','other'].includes(org.type));for(const select of document.querySelectorAll('.organizer-org-select')){select.replaceChildren(...organizerOrgs.map(org=>{const option=document.createElement('option');option.value=org.id;option.textContent=org.name;return option}))}byId('event-form').elements.timeZone.value=Intl.DateTimeFormat().resolvedOptions().timeZone;byId('booking-time-zone').value=Intl.DateTimeFormat().resolvedOptions().timeZone;const venueSelect=byId('event-form').elements.venueId;venueSelect.replaceChildren(Object.assign(document.createElement('option'),{value:'',textContent:'Add a venue later'}));for(const venue of venueResult.venues){const option=document.createElement('option');option.value=venue.id;option.textContent=`${venue.name} · ${venue.city}`;venueSelect.append(option)}const eventSelect=byId('booking-event-id');const events=eventResult.events;eventSelect.replaceChildren(...events.map(event=>{const option=document.createElement('option');option.value=event.id;option.textContent=`${event.name} · ${new Date(event.startsAt).toLocaleDateString()}`;return option}));const artistId=new URLSearchParams(location.search).get('artist');if(artistId){byId('booking-artist-id').value=artistId;byId('booking-artist-help').textContent='Artist selected from their published profile.'}else{byId('booking-form').classList.add('booking-needs-artist');byId('booking-form').querySelector('button').disabled=true;byId('booking-artist-help').textContent='Open a published artist profile and choose Request this artist to start a booking.';}byId('event-list').replaceChildren();for(const event of events){const row=element('article','list-row');row.append(element('div','',event.name),element('small','',`${event.city} · ${new Date(event.startsAt).toLocaleString()} · ${event.timeZone}`));byId('event-list').append(row)}if(!events.length)byId('event-list').append(element('p','empty-inline','Create an event to start a booking request.'));byId('booking-list').replaceChildren();for(const booking of bookingResult.bookings){const row=element('article','booking-row');const summary=element('div');summary.append(element('b','',`${booking.eventName} · ${booking.artistName}`),element('small','',`${booking.performanceDate} · ${booking.startTime} · ${booking.state.replaceAll('_',' ')}`));const actions=element('div','row-actions');const isArtist=managedArtistIds.has(booking.artistId);const isOrganizer=organizerOrgs.some(org=>org.id===booking.organizerOrganizationId);if(isArtist&&['requested','negotiating','quoted'].includes(booking.state)){const quote=element('button','text-button',booking.state==='quoted'?'Revise quote':'Send quote');quote.type='button';quote.onclick=async()=>{const amount=prompt('Performance fee in minor units (for example USD cents)');if(amount===null)return;try{await api(`/api/bookings/${booking.id}/quotes`,{method:'POST',body:JSON.stringify({currencyCode:'USD',performanceFeeMinor:Number(amount),transportMinor:0,accommodationMinor:0,equipmentMinor:0,depositMinor:0,terms:'Please contact me to confirm final arrangements.',validUntil:new Date(Date.now()+14*86400000).toISOString().slice(0,10)})});toast('Quote submitted.');loadBookings()}catch(error){toast(error.message)}};actions.append(quote)}if(isOrganizer&&booking.state==='quoted'){const accept=element('button','text-button','Agree terms');accept.type='button';accept.onclick=async()=>{try{await api(`/api/bookings/${booking.id}/transition`,{method:'POST',body:JSON.stringify({from:'quoted',to:'terms_agreed',note:'Organizer accepted quotation'})});toast('Terms recorded as agreed.');loadBookings()}catch(error){toast(error.message)}};actions.append(accept)}if(booking.state==='terms_agreed'&&(isArtist||isOrganizer)){const complete=element('button','text-button','Submit performance');complete.type='button';complete.onclick=async()=>{const evidenceUrl=prompt('HTTPS link to performance evidence');if(!evidenceUrl)return;try{await api(`/api/bookings/${booking.id}/performance`,{method:'POST',body:JSON.stringify({evidenceUrl})});toast('Performance submitted for counterparty confirmation.');loadBookings()}catch(error){toast(error.message)}};actions.append(complete)}row.append(summary,actions);if(booking.quotes?.length){const last=booking.quotes[0];row.append(element('small','',`Latest quote v${last.version}: ${formatMoney(last.performanceFeeMinor,last.currencyCode)} · expires ${last.validUntil}`))}byId('booking-list').append(row)}if(!bookingResult.bookings.length)byId('booking-list').append(element('p','empty-inline','No booking requests yet.'));byId('bookings-skeleton').classList.add('hidden');byId('bookings-content').classList.remove('hidden');byId('venue-form').onsubmit=async event=>{event.preventDefault();try{await api('/api/venues',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});event.currentTarget.reset();toast('Venue saved.');loadBookings()}catch(error){toast(error.message)}};byId('event-form').onsubmit=async event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));data.startsAt=localDateTimeToUtc(data.startsAt,data.timeZone);data.budgetCurrency=data.budgetCurrency?.toUpperCase()||'';data.budgetMinor=data.budgetMinor||'';try{await api('/api/events',{method:'POST',body:JSON.stringify(data)});event.currentTarget.reset();toast('Event created.');loadBookings()}catch(error){toast(error.message)}};byId('booking-form').onsubmit=async event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));data.durationMinutes=data.durationMinutes||'';data.budgetCurrency=data.budgetCurrency?.toUpperCase()||'';data.budgetMinor=data.budgetMinor||'';try{await api('/api/bookings',{method:'POST',body:JSON.stringify(data)});toast('Booking request sent.');loadBookings()}catch(error){toast(error.message)}}}catch(error){byId('bookings-skeleton').classList.add('hidden');byId('bookings-content').classList.remove('hidden');toast(error.message)}}
async function loadAccount(session){byId('account-loading').classList.add('hidden');const panel=byId('account-panel');panel.classList.remove('hidden');panel.replaceChildren();if(!currentUser){panel.append(element('h2','','Sign in to view your account'),Object.assign(element('a','button','Sign in'),{href:'/sign-in'}));return}panel.append(element('h2','',currentUser.name),element('p','',currentUser.email),element('p','form-hint',`This device is signed in. Session expiry: ${session.expiresAt?new Date(session.expiresAt).toLocaleString():'not available'}.`),element('p','form-hint','Your session cookie is HttpOnly and SameSite Strict. Sign out here to revoke this session immediately.'),Object.assign(element('a','button outline','Manage organizations'),{href:'/workspace'}),Object.assign(element('a','button outline','Cookie settings'),{href:'/cookies'}));const signout=element('button','button danger','Sign out');signout.type='button';signout.onclick=async()=>{await api('/api/logout',{method:'POST',body:'{}'});location.href='/'};panel.append(signout)}
async function authPage(kind){const isRegister=kind==='register';const form=byId(isRegister?'register-form':'sign-in-form');form.onsubmit=async event=>{event.preventDefault();const data=Object.fromEntries(new FormData(form));if(isRegister)data.roles=[...form.querySelectorAll('input[name="roles"]:checked')].map(input=>input.value);else data.rememberMe=form.elements.rememberMe.checked;const error=byId('auth-error');error.textContent='';try{const result=await api(`/api/${isRegister?'register':'login'}`,{method:'POST',body:JSON.stringify(data)});csrfToken=result.csrfToken;currentUser=result.user;const next=new URLSearchParams(location.search).get('next');const safeNext=next?.startsWith('/')&&!next.startsWith('//')&&!next.includes('\\');location.href=safeNext?next:(isRegister?'/workspace':'/account')}catch(reason){error.textContent=reason.message}}}
async function initInvitation(){const token=new URLSearchParams(location.search).get('token');if(token)byId('invitation-token').value=token;if(!currentUser)byId('invitation-account-hint').textContent='Sign in or create an account using the invited email address, then return here to accept.';byId('invitation-form').onsubmit=async event=>{event.preventDefault();if(!currentUser){location.href=`/sign-in?next=${encodeURIComponent(location.pathname+location.search)}`;return}const error=byId('invitation-error');error.textContent='';try{const result=await api('/api/invitations/accept',{method:'POST',body:JSON.stringify({token:new FormData(event.currentTarget).get('token')})});toast(`You joined ${result.organization.name}.`);location.href='/workspace'}catch(reason){error.textContent=reason.message}}}
function renderHulengendeProfile(){
  const root=byId('artist-profile');
  document.title='Hulengende · Artist profile · Bookable263';
  root.replaceChildren();
  root.removeAttribute('aria-busy');
  root.classList.add('hulengende-profile');

  const hero=element('section','hulengende-hero');
  const intro=element('div','hulengende-intro');
  intro.append(element('div','eyebrow','ZIMBABWEAN MUSIC · ARTIST PROFILE'));
  const status=element('div','profile-status');status.append(element('span','status-light'),document.createTextNode('DEMO · UNCLAIMED'));
  intro.append(status,element('h1','',hulengendeProfile.name),element('p','hulengende-alias',`Also known as ${hulengendeProfile.alias}`));
  const genres=element('div','hulengende-tags');for(const tag of [...hulengendeProfile.genres,'Musician · Live performer',hulengendeProfile.location])genres.append(element('span','',tag));
  intro.append(genres,element('p','hulengende-bio',hulengendeProfile.bio),element('p','profile-disclaimer','This profile is a demo listing and has not been claimed, verified or authorized by the artist or management.'));
  const actions=element('div','hulengende-actions');
  const musicLink=element('a','button','Explore music');musicLink.href='#music';
  const bookButton=element('button','button outline','Booking requests unavailable');bookButton.type='button';bookButton.disabled=true;bookButton.title='This demo profile is unclaimed and has no authorized booking contact.';
  actions.append(musicLink,bookButton);
  intro.append(actions,element('p','booking-unavailable-note','Booking requests are paused until an authorized representative claims this profile. No management contact details have been supplied.'));
  const portrait=element('figure','hulengende-portrait');
  const image=document.createElement('img');image.src='/img/hulengende.png';image.alt='Portrait supplied for Hulengende’s demo profile';image.fetchPriority='high';image.decoding='async';
  portrait.append(image,element('figcaption','','Portrait supplied for this demo profile'));
  hero.append(intro,portrait);

  const quick=element('section','profile-snapshot');quick.setAttribute('aria-label','Profile at a glance');
  for(const [label,value] of [['Style','Zimdancehall'],['Based in','Zimbabwe'],['Booking indication','From $5,000 USD'],['Profile status','Unclaimed demo']]){
    const item=element('article','snapshot-item');item.append(element('span','snapshot-label',label),element('strong','',value));quick.append(item)
  }

  const mainGrid=element('div','hulengende-content-grid');
  const primary=element('div','hulengende-main-column');
  const music=element('section','content-panel profile-section');music.id='music';
  music.append(element('div','eyebrow','SELECTED CATALOGUE'),element('h2','','Music'));
  music.append(element('p','section-copy','Track titles supplied for this profile. Release dates, artwork, collaborators and track-specific listening links have not been independently confirmed.'));
  const tracks=element('ol','track-list');
  for(const [index,title] of hulengendeProfile.tracks.entries()){
    const row=element('li','track-item');row.append(element('span','track-number',String(index+1).padStart(2,'0')),element('span','track-name',title),element('span','track-label','Title supplied'));
    tracks.append(row)
  }
  music.append(tracks);
  const audiomack=element('a','external-listening-link','Open supplied Audiomack listing ↗');audiomack.href='https://audiomack.com/hulengende-';audiomack.target='_blank';audiomack.rel='noopener noreferrer';
  music.append(audiomack,element('p','source-note','Link ownership has not been confirmed. This is not an embedded or verified artist account.'));

  const history=element('section','content-panel profile-section');history.append(element('div','eyebrow','REPORTED EVENT'),element('h2','',hulengendeProfile.event.name));
  const eventFacts=element('div','event-facts');eventFacts.append(element('span','',hulengendeProfile.event.date),element('span','',hulengendeProfile.event.venue));
  history.append(eventFacts,element('p','',hulengendeProfile.event.description),element('span','verification-pill','Attendance · unverified'));
  const lineup=element('div','reported-lineup');lineup.append(element('h3','','Supporting artists reported in event coverage'));
  const lineupTags=element('div','hulengende-tags');for(const name of hulengendeProfile.event.lineup)lineupTags.append(element('span','',name));lineup.append(lineupTags);
  history.append(lineup);
  const ticketDetails=document.createElement('details');ticketDetails.className='ticket-details';ticketDetails.append(element('summary','','Reported ticket listings · unverified'),element('p','',hulengendeProfile.event.tickets));history.append(ticketDetails);

  const related=element('section','content-panel profile-section');related.append(element('div','eyebrow','INDUSTRY CONTEXT'),element('h2','','Related artists'));
  related.append(element('p','section-copy','No collaborator, producer or industry relationships are shown until each connection can be reliably attributed. Names mentioned in the supplied notes are not presented as verified relationships.'));
  primary.append(music,history,related);

  const aside=element('aside','hulengende-aside');
  const booking=element('section','content-panel booking-indication');booking.append(element('div','eyebrow','BOOKING INDICATION'),element('h2','','From $5,000 USD'),element('p','','Reported media figure · indicative only'));
  booking.append(element('p','section-copy','Not a confirmed or guaranteed rate. Final quotations require management confirmation. Travel, accommodation, hospitality and technical requirements are quoted separately.'));
  const eventTypes=element('div','event-type-list');for(const type of ['Club appearances','Music festivals','Corporate events','Private functions','Album launches','Concert performances','Brand activations'])eventTypes.append(element('span','',type));
  booking.append(element('h3','','Event types'),eventTypes);

  const intelligence=element('section','content-panel profile-section');intelligence.append(element('div','eyebrow','AUDIENCE SNAPSHOT'),element('h2','','Reported reach'));
  intelligence.append(element('p','section-copy','Historical reported figures only—not live analytics. Dates and independent source documentation were not supplied.'));
  const metricGrid=element('div','metric-grid');
  for(const metric of hulengendeProfile.metrics){const card=element('article','metric-card');card.append(element('strong','',metric.value),element('span','',metric.label),element('small','',metric.detail));metricGrid.append(card)}
  intelligence.append(metricGrid,element('p','source-note','Verification status: media-reported / unverified. No current platform metrics are available.'));

  const socials=element('section','content-panel profile-section');socials.append(element('div','eyebrow','LISTEN & DISCOVER'),element('h2','','Across the web'));
  const links=element('div','social-link-list');
  for(const link of hulengendeProfile.links){const row=element('div','social-link');row.append(socialIconLink(link,'social-icon-link detail-social-icon'));const anchor=element('a','social-link-label',link.label);anchor.href=link.url;anchor.target='_blank';anchor.rel='noopener noreferrer';row.append(anchor,element('small','',link.detail),element('span','social-arrow','↗'));links.append(row)}
  socials.append(links,element('p','source-note','Only links clearly labelled as a discovery search are search destinations. No social account ownership is verified.'));
  aside.append(booking,intelligence,socials);
  mainGrid.append(primary,aside);
  root.append(hero,quick,mainGrid);
}
function renderMadedidoProfile(){
  const root=byId('artist-profile');
  document.title='Madedido · Artist profile · Bookable263';
  root.replaceChildren();
  root.removeAttribute('aria-busy');
  root.classList.add('hulengende-profile','madedido-profile');

  const hero=element('section','hulengende-hero');
  const intro=element('div','hulengende-intro');
  intro.append(element('div','eyebrow','ZIMBABWEAN MUSIC · ARTIST PROFILE'));
  const status=element('div','profile-status');status.append(element('span','status-light'),document.createTextNode('DEMO · UNCLAIMED · UNVERIFIED'));
  intro.append(status,element('h1','',madedidoProfile.name));
  const tags=element('div','hulengende-tags');
  for(const tag of [...madedidoProfile.genres,'Zimbabwe'])tags.append(element('span','',tag));
  intro.append(tags,element('p','hulengende-bio',madedidoProfile.bio),element('p','profile-disclaimer','Profile details and music attribution are awaiting artist confirmation. No official artist account or management relationship has been verified.'));
  const actions=element('div','hulengende-actions');
  const musicLink=element('a','button','Explore music');musicLink.href='#madedido-music';
  const streamLink=element('a','button outline','Audiomack · unverified');streamLink.href='https://audiomack.com/madedido-1';streamLink.target='_blank';streamLink.rel='noopener noreferrer';
  streamLink.setAttribute('aria-label','Open supplied Audiomack listing; account ownership unverified');
  const shareButton=element('button','button outline','Share profile');shareButton.type='button';
  shareButton.onclick=async()=>{
    const url=location.href;
    try{
      if(navigator.share){await navigator.share({title:'Madedido · Bookable263',url});return}
      await navigator.clipboard.writeText(url);
      toast('Profile link copied.');
    }catch(error){
      if(error.name==='AbortError')return;
      try{await navigator.clipboard.writeText(url);toast('Profile link copied.')}
      catch{toast('Could not share the profile link from this browser.')}
    }
  };
  const bookingButton=element('button','button outline','Booking requests paused');bookingButton.type='button';bookingButton.disabled=true;bookingButton.title='This unclaimed profile is not connected to an authorized booking manager.';
  actions.append(musicLink,streamLink,shareButton,bookingButton);
  intro.append(actions,element('p','booking-unavailable-note','Booking is enquiry-based. Pricing, availability and authorized management must be confirmed before requests can be submitted.'));
  const portrait=element('figure','hulengende-portrait');
  const image=document.createElement('img');image.src='/img/madedido.png';image.alt='Portrait supplied for Madedido’s unclaimed demo profile';image.fetchPriority='high';image.decoding='async';
  portrait.append(image,element('figcaption','','Image supplied for this demo profile'));
  hero.append(intro,portrait);

  const quick=element('section','profile-snapshot');quick.setAttribute('aria-label','Profile at a glance');
  for(const [label,value] of [['Primary genre','Zimdancehall'],['Base location','Chitungwiza · reported'],['Movement','Hwabada · associated'],['Booking','Request a quote']]){
    const item=element('article','snapshot-item');item.append(element('span','snapshot-label',label),element('strong','',value));quick.append(item)
  }

  const mainGrid=element('div','hulengende-content-grid');
  const primary=element('div','hulengende-main-column');
  const music=element('section','content-panel profile-section');music.id='madedido-music';
  music.append(element('div','eyebrow','TRACK CANDIDATES'),element('h2','','Music catalogue'));
  music.append(element('p','section-copy','These titles were supplied as research candidates. Their attribution to Madedido, release details, credits and official links have not been independently confirmed.'));
  const featured=element('div','madedido-featured-tracks');
  for(const title of madedidoProfile.trackCandidates.slice(0,5)){
    const row=element('article','madedido-track');row.append(element('span','track-number',String(madedidoProfile.trackCandidates.indexOf(title)+1).padStart(2,'0')),element('strong','',title),element('span','track-label','Attribution unverified'));featured.append(row)
  }
  music.append(featured);
  const additional=document.createElement('details');additional.className='ticket-details madedido-more-tracks';additional.append(element('summary','','View more unverified title candidates'));
  const list=element('ul','madedido-candidate-list');
  for(const title of madedidoProfile.trackCandidates.slice(5))list.append(element('li','',title));
  additional.append(list);music.append(additional,element('p','source-note','No audio previews, artwork, release dates, producers or track URLs have been added without verified sources.'));

  const history=element('section','content-panel profile-section');history.append(element('div','eyebrow','LIVE PERFORMANCE HISTORY'),element('h2','','Performances'));
  history.append(element('div','empty-panel madedido-empty','No verified performances are listed yet. Past appearances can be added after confirmation.'));
  const booking=element('section','content-panel booking-indication');booking.append(element('div','eyebrow','BOOKING ENQUIRIES'),element('h2','','Request a quote'),element('p','','Current rate not confirmed · USD quotation by enquiry'));
  booking.append(element('p','section-copy','No current booking rate has been confirmed. Request a quotation after an authorized representative claims the profile.'));
  const eventTypes=element('div','event-type-list');
  for(const type of ['Club appearances','Nightclubs','Festivals','Corporate events','Private events','Album launches','Concerts','Brand activations','University events','Promotional appearances'])eventTypes.append(element('span','',type));
  booking.append(element('h3','','Booking categories'),eventTypes);
  booking.append(element('p','source-note','Travel, accommodation, hospitality and technical requirements require a separate quotation. All bookings require manual artist or management approval.'));
  const related=element('section','content-panel profile-section');related.append(element('div','eyebrow','ARTIST INTELLIGENCE'),element('h2','','Profile details'));
  const facts=element('div','madedido-facts');
  for(const [label,value] of [['Country','Zimbabwe'],['Origin','Masvingo · reported'],['Base','Chitungwiza · reported'],['Genres','Dancehall · Trap-influenced Dancehall'],['Movement','Hwabada Movement · associated'],['Profile status','Unclaimed · awaiting confirmation']]){
    const row=element('div','madedido-fact');row.append(element('span','',label),element('strong','',value));facts.append(row)
  }
  related.append(facts);
  primary.append(music,history,booking,related);

  const aside=element('aside','hulengende-aside');
  const intelligence=element('section','content-panel profile-section');intelligence.append(element('div','eyebrow','AUDIENCE SNAPSHOT'),element('h2','','Historical Audiomack figures'));
  intelligence.append(element('p','section-copy','A retrieved historical snapshot—not live data. The profile owner and collection date have not been confirmed.'));
  const metricGrid=element('div','metric-grid');
  for(const [value,label] of madedidoProfile.metrics){const card=element('article','metric-card');card.append(element('strong','',value),element('span','',label),element('small','','Historical · date unavailable'));metricGrid.append(card)}
  intelligence.append(metricGrid,element('p','source-note','Multiple profiles use the Madedido name. These figures are not merged with any other profile and remain unverified.'));

  const socials=element('section','content-panel profile-section');socials.append(element('div','eyebrow','LISTEN & DISCOVER'),element('h2','','Streaming & social'));
  const links=element('div','social-link-list');
  for(const link of madedidoProfile.links){const row=element('div','social-link');row.append(socialIconLink(link,'social-icon-link detail-social-icon'));const anchor=element('a','social-link-label',link.label);anchor.href=link.url;anchor.target='_blank';anchor.rel='noopener noreferrer';row.append(anchor,element('small','',link.detail),element('span','social-arrow','↗'));links.append(row)}
  socials.append(links,element('p','source-note','Discovery and supplied listing URLs are not presented as verified artist-controlled accounts.'));
  const collaborators=element('section','content-panel profile-section');collaborators.append(element('div','eyebrow','COLLABORATIONS'),element('h2','','Collaborators'));
  collaborators.append(element('p','section-copy','No collaborator relationships are displayed until they are verified against a specific track or reliable source.'));
  aside.append(intelligence,socials,collaborators);
  mainGrid.append(primary,aside);
  root.append(hero,quick,mainGrid);
}
function renderKingAlfaProfile(){
  const root=byId('artist-profile');
  document.title='King Alfa aka Kadiki · Bookable263';
  root.replaceChildren();
  root.removeAttribute('aria-busy');
  root.classList.add('hulengende-profile','king-alfa-profile');
  const hero=element('section','hulengende-hero');
  const intro=element('div','hulengende-intro');
  intro.append(element('div','eyebrow','ZIMBABWEAN MUSIC · GUARDIAN-MANAGED PROFILE'));
  const status=element('div','profile-status');status.append(element('span','status-light'),document.createTextNode('DEMO · UNCLAIMED · GUARDIAN CONFIRMATION REQUIRED'));
  intro.append(status,element('h1','',kingAlfaProfile.name));
  const genres=element('div','hulengende-tags');for(const tag of [...kingAlfaProfile.genres,'Zimbabwe'])genres.append(element('span','',tag));
  intro.append(genres,element('p','hulengende-bio',kingAlfaProfile.bio),element('p','profile-disclaimer','This profile is awaiting confirmation from an authorized parent or legal guardian. Private identity, contact and safeguarding information is not displayed.'));
  const actions=element('div','hulengende-actions');
  const tracksLink=element('a','button','Explore music');tracksLink.href='#king-alfa-music';
  const channelLink=socialIconLink(kingAlfaProfile.links[0],'button outline king-channel-link');channelLink.append(document.createTextNode(' YouTube channel · unverified'));
  const bookingButton=element('button','button outline','Guardian approval required');bookingButton.type='button';bookingButton.disabled=true;bookingButton.title='Booking requests require an authorized guardian-managed process.';
  actions.append(tracksLink,channelLink,bookingButton);
  intro.append(actions,element('p','booking-unavailable-note','No direct contact with the artist is available. Booking requests require private guardian review and adult approval.'));
  const portrait=element('figure','hulengende-portrait');
  const image=document.createElement('img');image.src='/img/kadiki.png';image.alt='Image supplied for King Alfa aka Kadiki’s guardian-managed demo profile';image.fetchPriority='high';image.decoding='async';
  portrait.append(image,element('figcaption','','Image supplied for this demo profile'));
  hero.append(intro,portrait);
  const quick=element('section','profile-snapshot');quick.setAttribute('aria-label','Profile at a glance');
  for(const [label,value] of [['Primary genre','Zimdancehall'],['Associated movement','Matrix Music Movement'],['Booking','Request a quote'],['Safeguarding','Guardian approval required']]){
    const item=element('article','snapshot-item');item.append(element('span','snapshot-label',label),element('strong','',value));quick.append(item)
  }
  const mainGrid=element('div','hulengende-content-grid');
  const primary=element('div','hulengende-main-column');
  const music=element('section','content-panel profile-section');music.id='king-alfa-music';
  music.append(element('div','eyebrow','RELEASE CANDIDATES'),element('h2','','Music catalogue'));
  music.append(element('p','section-copy','These titles were supplied as research candidates, not a confirmed discography. Track credits, artwork, release dates and attribution have not been independently verified.'));
  const featured=element('div','madedido-featured-tracks');
  for(const title of kingAlfaProfile.trackCandidates.slice(0,4)){const row=element('article','madedido-track');row.append(element('span','track-number',String(kingAlfaProfile.trackCandidates.indexOf(title)+1).padStart(2,'0')),element('strong','',title),element('span','track-label','Attribution unverified'));featured.append(row)}
  music.append(featured);
  const more=document.createElement('details');more.className='ticket-details madedido-more-tracks';more.append(element('summary','','View more unverified title candidates'));
  const candidateList=element('ul','madedido-candidate-list');for(const title of kingAlfaProfile.trackCandidates.slice(4))candidateList.append(element('li','',title));
  more.append(candidateList);music.append(more,element('p','source-note','No playable clips, lyrics or unverified artist contact channels are included.'));
  const achievements=element('section','content-panel profile-section');achievements.append(element('div','eyebrow','REPORTED ACHIEVEMENTS'),element('h2','','Awaiting source verification'));
  achievements.append(element('p','section-copy','The attached research brief mentions chart, view-count and award claims. Source URLs were not provided, so those claims are not published as profile statistics until they can be independently attributed.'));
  const booking=element('section','content-panel booking-indication');booking.append(element('div','eyebrow','SAFEGUARDED BOOKING'),element('h2','','Request a quote'),element('p','','No booking fee is published'));
  booking.append(element('p','section-copy','A private booking enquiry must be reviewed by an authorized guardian. Written terms, safeguarding arrangements, an adult chaperone and travel plans require approval before any booking can be confirmed.'));
  const eventTypes=element('div','event-type-list');for(const type of ['Festivals','Concerts','Corporate events','Community events','School-approved events','Brand activations','Album launches','Media appearances'])eventTypes.append(element('span','',type));
  booking.append(element('h3','','Suitable event types'),eventTypes);
  primary.append(music,achievements,booking);
  const aside=element('aside','hulengende-aside');
  const safeguards=element('section','content-panel profile-section');safeguards.append(element('div','eyebrow','ARTIST SAFEGUARDING'),element('h2','','Guardian-managed'));
  const safeFacts=element('div','madedido-facts');
  for(const [label,value] of [['Profile status','Unclaimed · awaiting confirmation'],['Communication','Guardian only'],['Booking approval','Authorized adult required'],['Identity & contact','Private · not displayed']]){
    const row=element('div','madedido-fact');row.append(element('span','',label),element('strong','',value));safeFacts.append(row)
  }
  safeguards.append(safeFacts,element('p','source-note','No direct messaging, phone number, email, personal identity details or private verification documents are exposed on this public profile.'));
  const socials=element('section','content-panel profile-section');socials.append(element('div','eyebrow','LISTEN & DISCOVER'),element('h2','','Social link'));
  const links=element('div','social-link-list');
  for(const link of kingAlfaProfile.links){const row=element('div','social-link');row.append(socialIconLink(link,'social-icon-link detail-social-icon'));const anchor=element('a','social-link-label',link.label);anchor.href=link.url;anchor.target='_blank';anchor.rel='noopener noreferrer';row.append(anchor,element('small','',link.detail),element('span','social-arrow','↗'));links.append(row)}
  socials.append(links,element('p','source-note','Supplied channel URL only; it is not represented as a verified artist-owned account.'));
  aside.append(safeguards,socials);
  mainGrid.append(primary,aside);
  root.append(hero,quick,mainGrid);
}
function renderBossPumacolProfile(){
  const root=byId('artist-profile');
  document.title='Boss Pumacol · Bookable263';
  root.replaceChildren();
  root.removeAttribute('aria-busy');
  root.classList.add('hulengende-profile','boss-pumacol-profile');
  const hero=element('section','hulengende-hero');
  const intro=element('div','hulengende-intro');
  intro.append(element('div','eyebrow','ZIMBABWEAN MUSIC · ARTIST PROFILE'));
  const status=element('div','profile-status');status.append(element('span','status-light'),document.createTextNode('DEMO · UNCLAIMED · AWAITING ARTIST CONFIRMATION'));
  intro.append(status,element('h1','',bossPumacolProfile.name),element('p','hulengende-alias','Also known as Boss Pumakol'));
  const genres=element('div','hulengende-tags');for(const tag of [...bossPumacolProfile.genres,bossPumacolProfile.location])genres.append(element('span','',tag));
  intro.append(genres,element('p','hulengende-bio',bossPumacolProfile.bio),element('p','profile-disclaimer','Profile biography, catalogue entries and reported credits are awaiting confirmation by the artist or authorized representative. Personal identity and contact details are not shown.'));
  const actions=element('div','hulengende-actions');
  const musicLink=element('a','button','Explore music');musicLink.href='#boss-pumacol-music';
  const share=element('button','button outline','Share profile');share.type='button';
  share.onclick=async()=>{try{if(navigator.share){await navigator.share({title:'Boss Pumacol · Bookable263',url:location.href});return}await navigator.clipboard.writeText(location.href);toast('Profile link copied.')}catch(error){if(error.name==='AbortError')return;toast('Could not share the profile link from this browser.')}};
  const booking=element('button','button outline','Booking requests paused');booking.type='button';booking.disabled=true;booking.title='Booking enquiries open after the artist or authorized representative verifies and claims the profile.';
  actions.append(musicLink,share,booking);
  intro.append(actions,element('p','booking-unavailable-note','Booking is request-a-quote. No current fee is published; enquiries will open after an authorized representative verifies the profile.'));
  const portrait=element('figure','hulengende-portrait');
  const image=document.createElement('img');image.src='/img/boss-pumacol.png';image.alt='Portrait supplied for Boss Pumacol’s demo profile';image.fetchPriority='high';image.decoding='async';
  portrait.append(image,element('figcaption','','Image supplied for this demo profile'));
  hero.append(intro,portrait);

  const quick=element('section','profile-snapshot');quick.setAttribute('aria-label','Profile at a glance');
  for(const [label,value] of [['Primary genre','Reggae Dancehall'],['Also known as','Boss Pumakol'],['Origin','Mabvuku, Harare · reported'],['Booking','Request a quote']]){
    const item=element('article','snapshot-item');item.append(element('span','snapshot-label',label),element('strong','',value));quick.append(item)
  }
  const mainGrid=element('div','hulengende-content-grid');
  const primary=element('div','hulengende-main-column');

  const music=element('section','content-panel profile-section');music.id='boss-pumacol-music';
  music.append(element('div','eyebrow','FEATURED RELEASE CANDIDATES'),element('h2','','Music catalogue'));
  music.append(element('p','section-copy','Featured titles and credits below are reported catalogue information, not independently verified artist records.'));
  const featured=element('div','boss-featured-tracks');
  for(const [index,track] of bossPumacolProfile.featuredTracks.entries()){
    const card=element('article','boss-track-card');card.append(element('span','track-number',String(index+1).padStart(2,'0')),element('h3','',track.title));
    if(track.featuring)card.append(element('p','boss-track-credit',`Featuring ${track.featuring} · reported`));
    card.append(element('p','boss-track-credit',track.release),element('small','',track.credit),element('span','track-label','Awaiting confirmation'));featured.append(card)
  }
  music.append(featured);
  const allTracks=document.createElement('details');allTracks.className='ticket-details boss-track-candidates';allTracks.append(element('summary','','View all catalogue candidates'));
  const candidateList=element('ol','boss-track-list');
  for(const [index,title] of bossPumacolProfile.trackCandidates.entries()){
    const row=element('li','boss-track-item');row.append(element('span','track-number',String(index+1).padStart(2,'0')),element('span','',title),element('small','',`Candidate · ${title.toLowerCase()==='goodbye'||title.toLowerCase()==='bho takadaro'||title.toLowerCase()==='zimbabwe'?'reported details above':'credits and release details unconfirmed'}`));candidateList.append(row)
  }
  allTracks.append(candidateList);music.append(allTracks,element('p','source-note','No fabricated artwork, audio previews, release dates, producer or streaming URLs have been added.'));

  const recent=element('section','content-panel profile-section');recent.append(element('div','eyebrow','APPLE MUSIC DISCOVERY LISTING'),element('h2','','Recent catalogue references'));
  recent.append(element('p','section-copy','Titles and years below are from the supplied discovery brief. Please confirm release metadata and account attribution with the artist.'));
  const releases=element('div','boss-release-grid');
  for(const [title,year] of bossPumacolProfile.recentReleases){const card=element('article','boss-release');card.append(element('strong','',title),element('span','',year),element('small','','Reported listing · pending confirmation'));releases.append(card)}
  const apple=element('a','external-listening-link','Open Apple Music artist listing ↗');apple.href=bossPumacolProfile.links.find(link=>link.platform==='apple-music').url;apple.target='_blank';apple.rel='noopener noreferrer';
  recent.append(releases,apple,element('p','source-note','The listing is a discovery reference and is not represented as a verified artist-controlled account.'));

  const events=element('section','content-panel profile-section');events.append(element('div','eyebrow','LIVE PERFORMANCE HISTORY'),element('h2','','Performances'));
  events.append(element('div','empty-panel madedido-empty','No verified performances are listed yet. Past appearances can be added after confirmation.'));
  const collabs=element('section','content-panel profile-section');collabs.append(element('div','eyebrow','REPORTED TRACK CREDITS'),element('h2','','Collaborations & credits'));
  const credits=element('div','boss-credit-list');
  for(const track of bossPumacolProfile.featuredTracks.filter(item=>item.featuring||item.credit.includes('production'))){
    const row=element('div','madedido-fact');row.append(element('span','',track.title),element('strong','',[track.featuring?`Featuring ${track.featuring}`:'',track.credit].filter(Boolean).join(' · ')));credits.append(row)
  }
  collabs.append(credits,element('p','source-note','Track-level relationships are reported and awaiting confirmation; no management or ongoing affiliations are implied.'));

  const aside=element('aside','hulengende-aside');
  const bookingPanel=element('section','content-panel booking-indication');bookingPanel.append(element('div','eyebrow','BOOKING ENQUIRIES'),element('h2','','Request a quote'),element('p','','Current performance fee not confirmed'));
  bookingPanel.append(element('p','section-copy','No public rate or availability is available. Booking requests require artist or authorized management confirmation.'));
  const eventTypes=element('div','event-type-list');for(const type of ['Nightclubs','Festivals','Corporate events','Private events','Album launches','Concerts','University events','Brand activations','Promotional appearances','International performances'])eventTypes.append(element('span','',type));
  bookingPanel.append(element('h3','','Event categories'),eventTypes);

  const intelligence=element('section','content-panel profile-section');intelligence.append(element('div','eyebrow','ARTIST INFORMATION'),element('h2','','Profile details'));
  const facts=element('div','madedido-facts');
  for(const [label,value] of [['Canonical name','Boss Pumacol'],['Search spelling','Boss Pumakol'],['Country','Zimbabwe'],['Reported origin','Mabvuku, Harare'],['Genres','Reggae Dancehall · Zimdancehall · Reggae Fusion'],['Association','Chillspot Records · reported'],['Status','Unclaimed · awaiting confirmation']]){
    const row=element('div','madedido-fact');row.append(element('span','',label),element('strong','',value));facts.append(row)
  }
  intelligence.append(facts,element('p','source-note','Real name, birth date, telephone and email are intentionally omitted from the public profile.'));
  const socials=element('section','content-panel profile-section');socials.append(element('div','eyebrow','LISTEN & DISCOVER'),element('h2','','Streaming & social'));
  const links=element('div','social-link-list');
  for(const link of bossPumacolProfile.links){const row=element('div','social-link');row.append(socialIconLink(link,'social-icon-link detail-social-icon'));const anchor=element('a','social-link-label',link.label);anchor.href=link.url;anchor.target='_blank';anchor.rel='noopener noreferrer';row.append(anchor,element('small','',link.detail),element('span','social-arrow','↗'));links.append(row)}
  socials.append(links,element('p','source-note','Only the supplied YouTube and Apple Music links are included. Their ownership awaits confirmation.'));
  aside.append(bookingPanel,intelligence,socials);
  primary.append(music,recent,events,collabs);
  mainGrid.append(primary,aside);
  root.append(hero,quick,mainGrid);
}
async function renderBazookaProfile(){
  const root=byId('artist-profile');
  try{
    const {artist}=await api('/api/artist-profiles/bazooka');
    root.replaceChildren();
    root.removeAttribute('aria-busy');
    root.classList.add('hulengende-profile','bazooka-profile');
    document.title=`${artist.name} · Bookable263`;
    const hero=element('section','hulengende-hero');
    const intro=element('div','hulengende-intro');
    intro.append(element('div','eyebrow','ZIMBABWEAN MUSIC · ARTIST PROFILE'));
    const status=element('div','profile-status');status.append(element('span','status-light'),document.createTextNode('DEMO · UNCLAIMED · AWAITING ARTIST CONFIRMATION'));
    intro.append(status,element('h1','',artist.name),element('p','hulengende-alias','Also known professionally as Bazooker'));
    const genres=element('div','hulengende-tags');for(const tag of [...artist.genres,artist.country])genres.append(element('span','',tag));
    intro.append(genres,element('p','hulengende-bio',artist.biography),
      element('p','profile-disclaimer','The Chillspot Records association, biography and catalogue entries are reported candidates awaiting confirmation. This profile is not affiliated with Bazuka (Mabasa Ziyambi).'));
    const actions=element('div','hulengende-actions');
    const musicLink=element('a','button','Explore music');musicLink.href='#bazooka-music';
    const share=element('button','button outline','Share profile');share.type='button';
    share.onclick=async()=>{try{if(navigator.share){await navigator.share({title:'Bazooka · Bookable263',url:location.href});return}await navigator.clipboard.writeText(location.href);toast('Profile link copied.')}catch(error){if(error.name!=='AbortError')toast('Could not share the profile link from this browser.')}};
    const booking=element('button','button outline','Booking requests paused');booking.type='button';booking.disabled=true;
    booking.title='Booking enquiries open after an artist or authorized representative claims the profile.';
    actions.append(musicLink,share,booking);intro.append(actions,element('p','booking-unavailable-note','Request-a-quote pricing · USD. No current fee or availability is confirmed. Booking needs artist or authorized management confirmation.'));
    const portrait=element('figure','hulengende-portrait');
    const image=document.createElement('img');image.src=artist.profileImageUrl;image.alt='Image supplied for Bazooka’s unclaimed demo profile';image.fetchPriority='high';image.decoding='async';
    portrait.append(image,element('figcaption','','Image supplied for this demo profile'));
    hero.append(intro,portrait);

    const quick=element('section','profile-snapshot');quick.setAttribute('aria-label','Profile at a glance');
    for(const [label,value] of [['Primary genre','Zimdancehall'],['Also known as','Bazooker'],['Country',artist.country],['Booking','Request a quote']]){
      const item=element('article','snapshot-item');item.append(element('span','snapshot-label',label),element('strong','',value));quick.append(item)
    }
    const mainGrid=element('div','hulengende-content-grid');
    const primary=element('div','hulengende-main-column');
    const music=element('section','content-panel profile-section');music.id='bazooka-music';
    music.append(element('div','eyebrow','REPORTED RELEASE CANDIDATES'),element('h2','','Music catalogue'),
      element('p','section-copy','Catalogue candidates are stored in the shared artist database. Track credits, dates and links are only shown when supplied and await verification.'));
    const featured=element('div','boss-featured-tracks');
    for(const track of artist.tracks.filter(item=>item.featured)){
      const card=element('article','boss-track-card');card.append(element('h3','',track.title));
      if(track.featuredArtists.length)card.append(element('p','boss-track-credit',`Featuring ${track.featuredArtists.join(', ')} · reported`));
      card.append(element('span','track-label','Awaiting confirmation'));featured.append(card)
    }
    music.append(featured);
    const allTracks=document.createElement('details');allTracks.className='ticket-details boss-track-candidates';allTracks.append(element('summary','','View full catalogue candidates'));
    const list=element('ol','boss-track-list');
    for(const [index,track] of artist.tracks.entries()){
      const row=element('li','boss-track-item');
      row.append(element('span','track-number',String(index+1).padStart(2,'0')),element('span','',track.title));
      const details=[track.mainArtist,...track.featuredArtists.map(name=>`feat. ${name}`),track.producer&&`Producer: ${track.producer}`,track.label&&`Label: ${track.label}`,track.releaseDate||track.releaseYear,track.genre,track.verificationStatus].filter(Boolean).join(' · ');
      row.append(element('small','',details));list.append(row)
    }
    allTracks.append(list);music.append(allTracks,element('p','source-note','No release dates, artwork, producer credits or per-track streaming URLs have been fabricated.'));
    const references=element('section','content-panel profile-section');references.append(element('div','eyebrow','HISTORICAL SNAPSHOTS · NOT LIVE'),element('h2','','Audience references'));
    references.append(element('p','section-copy','Approximate historical platform and third-party snapshots; not current analytics and not independently verified.'));
    const metrics=element('div','boss-release-grid');
    for(const item of artist.analytics){const metric=element('article','boss-release');const label=item.metric.replaceAll('_',' ');metric.append(element('strong','',`${item.value.toLocaleString()} ${label}`),element('span','',item.platform),element('small','',`${item.collectionDate||'Collection date not provided'} · ${item.verificationStatus}`));if(item.sourceUrl){const source=element('a','external-listening-link','Source ↗');source.href=item.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';metric.append(source)}metrics.append(metric)}
    references.append(metrics);
    const performances=element('section','content-panel profile-section');performances.append(element('div','eyebrow','PRESS-REFERENCE CANDIDATES'),element('h2','','Performance history'));
    performances.append(element('p','section-copy','These are historical event references, not verified completed performances.'));
    const events=element('div','boss-credit-list');
    for(const item of artist.performances){const row=element('div','madedido-fact');row.append(element('span','',item.eventName),element('strong','',[item.venue,item.city,item.country,item.dateLabel,item.completionStatus.replaceAll('_',' '),item.verificationStatus].filter(Boolean).join(' · ')));events.append(row)}
    performances.append(events);
    const collabs=element('section','content-panel profile-section');collabs.append(element('div','eyebrow','REPORTED CREDITS'),element('h2','','Collaborators'));
    const collaborators=[...new Set(artist.tracks.flatMap(track=>track.featuredArtists))];
    collabs.append(element('p','section-copy',collaborators.length?`Reported featured artists: ${collaborators.join(', ')}. These are track-level candidates, not verified ongoing affiliations.`:'No collaborator credits have been supplied.'));
    primary.append(music,references,performances,collabs);

    const aside=element('aside','hulengende-aside');
    const bookingPanel=element('section','content-panel booking-indication');bookingPanel.append(element('div','eyebrow','BOOKING ENQUIRIES'),element('h2','','Request a quote'));
    bookingPanel.append(element('p','',`Currency: ${artist.bookingCurrency} · Current fee: not confirmed`),element('p','section-copy',`${artist.availabilityNote} ${artist.bookingApproval}`));
    const eventTypes=element('div','event-type-list');for(const type of artist.booking?.supportedCategories||[])eventTypes.append(element('span','',type));
    bookingPanel.append(element('h3','','Event categories'),eventTypes);
    const socials=element('section','content-panel profile-section');socials.append(element('div','eyebrow','LISTEN & DISCOVER'),element('h2','','Streaming & social'));
    const links=element('div','social-link-list');
    for(const account of artist.socials){
      const row=element('div','social-link');const platformLabel=account.platform.replaceAll('-',' ');
      row.append(element('span','social-icon-link detail-social-icon',socialGlyph(account.platform)));
      const info=element('div','social-link-label');info.append(element('strong','',platformLabel),element('small','',`${account.username||''}${account.username?' · ':''}${account.verificationStatus}`));
      if(account.url){const anchor=element('a','social-link-label');anchor.href=account.url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.textContent='Open channel ↗';row.append(info,anchor)}else row.append(info);
      links.append(row)
    }
    socials.append(links,element('p','source-note','Account names and links were supplied as discovery references; ownership is unverified.'));
    const related=element('section','content-panel profile-section');related.append(element('div','eyebrow','PROFILE INFORMATION'),element('h2','','Identity & status'));
    const facts=element('div','madedido-facts');
    for(const [label,value] of [['Public name','Bazooka'],['Professional alias','Bazooker'],['Search aliases','Bazooka Zimbabwe · Bazooker Zimbabwe'],['Genre','Zimdancehall · Dancehall · Reggae'],['Reported association','Chillspot Records · unverified'],['Profile','Demo · unclaimed'],['Verification','Awaiting artist confirmation']]){
      const row=element('div','madedido-fact');row.append(element('span','',label),element('strong','',value));facts.append(row)
    }
    related.append(facts,element('p','source-note','No legal name, birth date, age, personal contact details or hometown are published.'));
    aside.append(bookingPanel,socials,related);
    mainGrid.append(primary,aside);root.append(hero,quick,mainGrid)
  }catch(error){root.removeAttribute('aria-busy');root.replaceChildren(element('div','empty-panel',error.message))}
}
async function init(){mountShell();mountCookieNotice();const session=await ensureSession();if(page==='home')await loadHome();if(page==='artists')await initArtists();if(page==='artist'){const route=location.pathname.toLowerCase();if(route==='/artists/hulengende')renderHulengendeProfile();else if(route==='/artists/madedido')renderMadedidoProfile();else if(route==='/artists/king-alfa-kadiki')renderKingAlfaProfile();else if(route==='/artists/boss-pumacol'||route==='/artists/boss-pumakol')renderBossPumacolProfile();else if(route==='/artists/bazooka'||route==='/artists/bazooker')await renderBazookaProfile();else await loadArtistPage()}if(page==='workspace')await loadWorkspace();if(page==='saved')await loadSaved();if(page==='bookings')await loadBookings();if(page==='account')await loadAccount(session);if(page==='sign-in'||page==='register')await authPage(page);if(page==='invite')initInvitation();if(page==='cookies')byId('reset-cookie-notice').onclick=()=>{localStorage.removeItem('b263-cookie-notice-v1');mountCookieNotice();toast('Cookie notice is visible again.')}}
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>byId(button.dataset.close).close()));
init();

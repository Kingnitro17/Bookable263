import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createIdentityService } from '../src/modules/identity/service.mjs';
import { createOrganizationService } from '../src/modules/organizations/service.mjs';
import { createTalentService } from '../src/modules/talent/service.mjs';
import { createDiscoveryService } from '../src/modules/discovery/service.mjs';
import { createEventsService } from '../src/modules/events/service.mjs';
import { createInvitationService } from '../src/modules/organizations/invitations.mjs';
import { createBookingService } from '../src/modules/bookings/service.mjs';
import { createVerificationService } from '../src/modules/verification/service.mjs';
import { createRecommendationService } from '../src/modules/discovery/recommendations.mjs';
import { createLocalMediaStorage } from '../src/modules/media/local-storage.mjs';
import { createMediaService } from '../src/modules/media/service.mjs';
import { openDatabase, hashToken } from '../src/shared/database.mjs';

const scrypt = promisify(scryptCb);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbFile=path.resolve(process.env.BOOKABLE_DATABASE_PATH || path.join(root,'.data','bookable.sqlite'));
const dataDir=path.dirname(dbFile);
await mkdir(dataDir, { recursive: true });
const repository=openDatabase(dbFile);
try { const legacy=JSON.parse(await readFile(path.join(dataDir,'store.json'),'utf8')); if(repository.importLegacy('store.json:v1',legacy))console.log('Imported legacy local store; original JSON file was preserved.'); }
catch(error) { if(error.code!=='ENOENT')throw new Error(`Cannot import legacy local data: ${error.message}`); }
const identity = createIdentityService({ repository, scrypt, randomBytes });
const organizations = createOrganizationService({ repository });
const talent=createTalentService({repository});
const discovery=createDiscoveryService({repository});
const events=createEventsService({repository});
const invitations=createInvitationService({repository,random:randomBytes});
const bookings=createBookingService({repository});
const verification=createVerificationService({repository});
const recommendations=createRecommendationService({events,talent});
const media=createMediaService({repository,storage:createLocalMediaStorage(path.join(dataDir,'media'))});
const attempts = new Map();
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png' };

function json(res, status, body, extra = {}) { res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', ...extra }); res.end(JSON.stringify(body)); }
function cookieMap(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map(x => x.trim().split('=').map(decodeURIComponent)).filter(x => x.length === 2)); }
async function body(req) { let raw=''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw,'utf8') > 24_000) throw Object.assign(new Error('Request is too large.'),{status:413}); } return raw ? JSON.parse(raw) : {}; }
async function binaryBody(req,maxBytes=8*1024*1024){const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>maxBytes)throw Object.assign(new Error('Upload exceeds the 8 MB limit.'),{status:413});chunks.push(chunk)}return Buffer.concat(chunks,length)}
function session(req) { const token=cookieMap(req).b263_session;if(!token)return null;const tokenHash=hashToken(token);const s=repository.sessionByTokenHash(tokenHash);return s&&s.expires_at>Date.now()?{...s,userId:s.user_id,tokenHash}:null; }
function csrfValid(req,s) { if(!req.headers['x-csrf-token']||!s)return false;const actual=Buffer.from(hashToken(String(req.headers['x-csrf-token'])));const expected=Buffer.from(s.csrf_hash);return actual.length===expected.length&&timingSafeEqual(actual,expected); }
function rateLimited(req) { const ip = req.socket.remoteAddress || 'unknown'; const now = Date.now(); const entry = attempts.get(ip) || { start: now, count: 0 }; if (now - entry.start > 60_000) { entry.start = now; entry.count = 0; } entry.count++; attempts.set(ip, entry); return entry.count > 12; }

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'GET' && url.pathname === '/api/session') { const s=session(req);const csrfToken=s?randomBytes(24).toString('base64url'):null;if(s)repository.rotateSessionCsrf(s.tokenHash,hashToken(csrfToken));return json(res,200,{user:s?identity.publicUser(s.userId):null,csrfToken,expiresAt:s?.expires_at||null}); }
      if (req.method === 'GET' && url.pathname === '/api/artist-categories') return json(res,200,{categories:talent.categories()});
      if (req.method === 'GET' && url.pathname === '/api/currencies') return json(res,200,{currencies:talent.currencies()});
      if (req.method === 'GET' && url.pathname === '/api/artists') return json(res,200,talent.search(Object.fromEntries(url.searchParams)));
      const editorialProfileMatch=url.pathname.match(/^\/api\/artist-profiles\/([a-z0-9-]{2,80})$/i);
      if(req.method==='GET'&&editorialProfileMatch){const artist=talent.publicEditorialProfile(editorialProfileMatch[1]);return artist?json(res,200,{artist}):json(res,404,{error:'Artist profile not found.'});}
      if(req.method==='GET'&&url.pathname==='/api/artist-comparison')return json(res,200,discovery.compare(Object.fromEntries(url.searchParams)));
      const publicAvailabilityMatch=url.pathname.match(/^\/api\/artists\/([0-9a-f-]{36})\/availability$/i);
      if(req.method==='GET'&&publicAvailabilityMatch)return json(res,200,talent.publicAvailability(publicAvailabilityMatch[1],Object.fromEntries(url.searchParams)));
      const publicMediaMatch=url.pathname.match(/^\/api\/artists\/([0-9a-f-]{36})\/media$/i);
      if(req.method==='GET'&&publicMediaMatch)return json(res,200,{media:media.public(publicMediaMatch[1])});
      const artistReputationMatch=url.pathname.match(/^\/api\/artists\/([0-9a-f-]{36})\/reputation$/i);
      if(req.method==='GET'&&artistReputationMatch){if(!talent.publicProfile(artistReputationMatch[1]))return json(res,404,{error:'Artist profile not found.'});return json(res,200,{reputation:verification.reputation(artistReputationMatch[1])});}
      const publicArtistMatch=url.pathname.match(/^\/api\/artists\/([0-9a-f-]{36})$/i);
      if(req.method==='GET'&&publicArtistMatch){const artist=talent.publicProfile(publicArtistMatch[1]);return artist?json(res,200,{artist}):json(res,404,{error:'Artist profile not found.'});}
      if (req.method === 'POST' && ['/api/register','/api/login'].includes(url.pathname)) {
        if (rateLimited(req)) return json(res, 429, { error: 'Too many attempts. Wait a minute and try again.' });
        const input = await body(req);
        const user = url.pathname.endsWith('register') ? await identity.register(input) : await identity.login(input);
        if (!user) return json(res, 401, { error: 'Email or password is incorrect.' });
        const id = randomBytes(32).toString('base64url'); const csrf = randomBytes(24).toString('base64url');
        const rememberMe=url.pathname.endsWith('login')&&input.rememberMe===true;const lifetime=rememberMe?30*86400_000:url.pathname.endsWith('register')?7*86400_000:12*3600_000;
        repository.createSession({tokenHash:hashToken(id),csrfHash:hashToken(csrf),userId:user.id,expiresAt:Date.now()+lifetime});
        const persistence=rememberMe||url.pathname.endsWith('register')?`; Max-Age=${Math.floor(lifetime/1000)}`:'';
        return json(res, 200, { user: identity.publicUser(user.id), csrfToken: csrf, expiresAt:Date.now()+lifetime, remembered:rememberMe }, { 'set-cookie': `b263_session=${encodeURIComponent(id)}; HttpOnly; SameSite=Strict; Path=/${persistence}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}` });
      }
      const s = session(req);
      if (req.method === 'POST' && url.pathname === '/api/logout') { if (!s || !csrfValid(req,s)) return json(res,403,{error:'Your session has expired.'}); repository.deleteSession(s.tokenHash); return json(res,200,{ok:true},{'set-cookie':'b263_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'}); }
      if (!s) return json(res, 401, { error:'Sign in to continue.' });
      if (!csrfValid(req,s)) return json(res,403,{error:'Refresh the page and try again.'});
      if (req.method === 'POST' && url.pathname === '/api/profile/roles') return json(res,200,{user:await identity.addRoles(s.userId,await body(req))});
      if (req.method === 'GET' && url.pathname === '/api/organizations') return json(res,200,{organizations:organizations.forUser(s.userId)});
      if (req.method === 'POST' && url.pathname === '/api/organizations') return json(res,201,{organization:await organizations.create(s.userId,await body(req))});
      const organizationInviteMatch=url.pathname.match(/^\/api\/organizations\/([0-9a-f-]{36})\/invitations(?:\/([0-9a-f-]{36}))?$/i);
      if(organizationInviteMatch&&req.method==='GET'&&!organizationInviteMatch[2])return json(res,200,{invitations:invitations.list(s.userId,organizationInviteMatch[1])});
      if(organizationInviteMatch&&req.method==='POST'&&!organizationInviteMatch[2])return json(res,201,{invitation:invitations.create(s.userId,organizationInviteMatch[1],await body(req))});
      if(organizationInviteMatch&&req.method==='DELETE'&&organizationInviteMatch[2])return json(res,200,invitations.revoke(s.userId,organizationInviteMatch[1],organizationInviteMatch[2]));
      if(req.method==='POST'&&url.pathname==='/api/invitations/accept')return json(res,200,{organization:invitations.accept(identity.publicUser(s.userId),String((await body(req)).token||''))});
      if(req.method==='GET'&&url.pathname==='/api/venues')return json(res,200,{venues:events.venues(s.userId)});
      if(req.method==='POST'&&url.pathname==='/api/venues')return json(res,201,{venue:events.createVenue(s.userId,await body(req))});
      if(req.method==='GET'&&url.pathname==='/api/events')return json(res,200,{events:events.events(s.userId)});
      if(req.method==='POST'&&url.pathname==='/api/events')return json(res,201,{event:events.createEvent(s.userId,await body(req))});
      if(req.method==='GET'&&url.pathname==='/api/recommendations')return json(res,200,recommendations.forEvent(s.userId,url.searchParams.get('eventId')||'',{category:url.searchParams.get('category')||'',genre:url.searchParams.get('genre')||''}));
      if(req.method==='GET'&&url.pathname==='/api/bookings')return json(res,200,{bookings:bookings.list(s.userId)});
      if(req.method==='POST'&&url.pathname==='/api/bookings')return json(res,201,{booking:bookings.create(s.userId,await body(req))});
      const submitPerformanceMatch=url.pathname.match(/^\/api\/bookings\/([0-9a-f-]{36})\/performance$/i);
      if(req.method==='POST'&&submitPerformanceMatch)return json(res,201,{performance:verification.submitPerformance(s.userId,submitPerformanceMatch[1],await body(req))});
      const performanceMatch=url.pathname.match(/^\/api\/performances\/([0-9a-f-]{36})(?:\/(confirm|reviews))?$/i);
      if(req.method==='POST'&&performanceMatch&&performanceMatch[2]==='confirm')return json(res,200,{verification:verification.confirm(s.userId,performanceMatch[1])});
      if(req.method==='POST'&&performanceMatch&&performanceMatch[2]==='reviews')return json(res,201,{review:verification.review(s.userId,performanceMatch[1],await body(req))});
      const quoteMatch=url.pathname.match(/^\/api\/bookings\/([0-9a-f-]{36})\/quotes$/i);
      if(req.method==='POST'&&quoteMatch)return json(res,201,{booking:bookings.quote(s.userId,quoteMatch[1],await body(req))});
      const bookingActionMatch=url.pathname.match(/^\/api\/bookings\/([0-9a-f-]{36})\/(transition|quotes)$/i);
      if(req.method==='POST'&&bookingActionMatch&&bookingActionMatch[2]==='transition')return json(res,200,{booking:bookings.transition(s.userId,bookingActionMatch[1],await body(req))});
      const bookingMatch=url.pathname.match(/^\/api\/bookings\/([0-9a-f-]{36})$/i);
      if(req.method==='GET'&&bookingMatch)return json(res,200,{booking:bookings.get(s.userId,bookingMatch[1])});
      if(req.method==='GET'&&url.pathname==='/api/managed-artists')return json(res,200,{artists:talent.managedBy(s.userId)});
      const managedMediaMatch=url.pathname.match(/^\/api\/managed-artists\/([0-9a-f-]{36})\/media$/i);
      if(req.method==='GET'&&managedMediaMatch)return json(res,200,{media:media.list(s.userId,managedMediaMatch[1])});
      const artistPhotoMatch=url.pathname.match(/^\/api\/artists\/([0-9a-f-]{36})\/media\/photos$/i);
      if(req.method==='POST'&&artistPhotoMatch){const contentType=String(req.headers['content-type']||'').split(';')[0];return json(res,201,{media:await media.uploadPhoto(s.userId,artistPhotoMatch[1],await binaryBody(req),contentType,url.searchParams.get('caption')||'')});}
      const artistVideoMatch=url.pathname.match(/^\/api\/artists\/([0-9a-f-]{36})\/media\/videos$/i);
      if(req.method==='POST'&&artistVideoMatch)return json(res,201,{media:media.addVideo(s.userId,artistVideoMatch[1],await body(req))});
      const mediaDeleteMatch=url.pathname.match(/^\/api\/media\/([0-9a-f-]{36})$/i);
      if(req.method==='DELETE'&&mediaDeleteMatch)return json(res,200,await media.remove(s.userId,mediaDeleteMatch[1]));
      const managedAvailabilityMatch=url.pathname.match(/^\/api\/managed-artists\/([0-9a-f-]{36})\/availability$/i);
      if(req.method==='GET'&&managedAvailabilityMatch)return json(res,200,{dates:talent.managedAvailability(s.userId,managedAvailabilityMatch[1])});
      const artistAvailabilityMatch=url.pathname.match(/^\/api\/artists\/([0-9a-f-]{36})\/availability$/i);
      if(req.method==='PUT'&&artistAvailabilityMatch)return json(res,200,{availability:talent.setAvailability(s.userId,artistAvailabilityMatch[1],await body(req))});
      const deleteAvailabilityMatch=url.pathname.match(/^\/api\/artists\/([0-9a-f-]{36})\/availability\/(\d{4}-\d{2}-\d{2})$/i);
      if(req.method==='DELETE'&&deleteAvailabilityMatch)return json(res,200,talent.deleteAvailability(s.userId,deleteAvailabilityMatch[1],deleteAvailabilityMatch[2]));
      if(req.method==='POST'&&url.pathname==='/api/artists')return json(res,201,{artist:talent.create(s.userId,await body(req))});
      const publishMatch=url.pathname.match(/^\/api\/artists\/([0-9a-f-]{36})\/publish$/i);
      if(req.method==='POST'&&publishMatch)return json(res,200,{artist:talent.publish(s.userId,publishMatch[1])});
      const rateMatch=url.pathname.match(/^\/api\/artists\/([0-9a-f-]{36})\/rate-card$/i);
      if(req.method==='PUT'&&rateMatch)return json(res,200,{rateCard:talent.setRateCard(s.userId,rateMatch[1],await body(req))});
      const editMatch=url.pathname.match(/^\/api\/artists\/([0-9a-f-]{36})$/i);
      if(req.method==='PUT'&&editMatch)return json(res,200,{artist:talent.update(s.userId,editMatch[1],await body(req))});
      if(req.method==='GET'&&url.pathname==='/api/shortlists')return json(res,200,{shortlists:discovery.shortlists(s.userId)});
      if(req.method==='POST'&&url.pathname==='/api/shortlists')return json(res,201,{shortlist:discovery.createShortlist(s.userId,await body(req))});
      const shortlistArtistMatch=url.pathname.match(/^\/api\/shortlists\/([0-9a-f-]{36})\/artists\/([0-9a-f-]{36})$/i);
      if(req.method==='POST'&&shortlistArtistMatch)return json(res,200,{shortlist:discovery.addArtist(s.userId,shortlistArtistMatch[1],shortlistArtistMatch[2])});
      if(req.method==='DELETE'&&shortlistArtistMatch)return json(res,200,discovery.removeArtist(s.userId,shortlistArtistMatch[1],shortlistArtistMatch[2]));
      const shortlistMatch=url.pathname.match(/^\/api\/shortlists\/([0-9a-f-]{36})$/i);
      if(req.method==='GET'&&shortlistMatch)return json(res,200,{shortlist:discovery.shortlist(s.userId,shortlistMatch[1])});
      if(req.method==='DELETE'&&shortlistMatch)return json(res,200,discovery.deleteShortlist(s.userId,shortlistMatch[1]));
      if(req.method==='GET'&&url.pathname==='/api/comparisons')return json(res,200,{comparisons:discovery.comparisons(s.userId)});
      if(req.method==='POST'&&url.pathname==='/api/comparisons')return json(res,201,{comparison:discovery.saveComparison(s.userId,await body(req))});
      const comparisonMatch=url.pathname.match(/^\/api\/comparisons\/([0-9a-f-]{36})$/i);
      if(req.method==='GET'&&comparisonMatch)return json(res,200,{comparison:discovery.getComparison(s.userId,comparisonMatch[1])});
      if(req.method==='DELETE'&&comparisonMatch)return json(res,200,discovery.deleteComparison(s.userId,comparisonMatch[1]));
      return json(res,404,{error:'Not found.'});
    }
    const photoMatch=url.pathname.match(/^\/media\/([0-9a-f-]{36})$/i);
    if(req.method==='GET'&&photoMatch){const asset=await media.photoBytes(photoMatch[1]);if(!asset)return json(res,404,{error:'Media not found.'});res.writeHead(200,{'content-type':asset.mimeType,'content-length':asset.bytes.length,'cache-control':'public, max-age=3600','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"});return res.end(asset.bytes);}
    const pageRoutes={'/':'index.html','/artists':'artists.html','/workspace':'workspace.html','/saved':'saved.html','/bookings':'bookings.html','/account':'account.html','/sign-in':'sign-in.html','/register':'register.html','/cookies':'cookies.html','/invite':'invite.html'};
    const artistPage=url.pathname.match(/^\/artists\/([0-9a-f-]{36}|hulengende|madedido|king-alfa-kadiki|boss-pumacol|boss-pumakol|bazooka|bazooker)$/i);
    const relative=artistPage?'artist.html':pageRoutes[url.pathname]||decodeURIComponent(url.pathname.slice(1));
    const target = path.resolve(root, 'public', relative);
    if (!target.startsWith(path.resolve(root,'public') + path.sep)) return json(res,404,{error:'Not found.'});
    const content = await readFile(target);
    res.writeHead(200,{ 'content-type':mime[path.extname(target)] || 'application/octet-stream', 'cache-control':'no-cache', 'x-content-type-options':'nosniff', 'x-frame-options':'DENY', 'referrer-policy':'strict-origin-when-cross-origin', 'content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" }); res.end(content);
  } catch (error) {
    const status = error.status || (error instanceof SyntaxError ? 400 : error.code==='ENOENT'?404:500);
    json(res,status,{error:status < 500 ? error.message : 'Something went wrong. Please try again.'});
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`Bookable263 running at http://localhost:${port}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>{repository.close();process.exit(0)}));

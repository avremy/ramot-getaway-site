const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM, VirtualConsole} = require('jsdom');
const html = () => fs.readFileSync('index.html', 'utf8');
async function page({sdk = {init() {}, send: () => Promise.resolve({status: 200})}, mobile = true, now = '2026-11-25T12:00:00Z'} = {}) {
  const errors = [], calls = [], opens = [], alerts = [];
  const dom = new JSDOM(html(), {runScripts: 'outside-only', url: 'https://ramot-getaway.cohen.network/', virtualConsole: new VirtualConsole().on('jsdomError', e => errors.push(e))});
  const w = dom.window;
  if (now) {
    const RealDate=w.Date;
    w.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[now]));} static now(){return new RealDate(now).getTime();}};
  }
  const media = {matches: mobile, addEventListener(_, cb) {this.change = cb;}};
  w.matchMedia = () => media;
  w.IntersectionObserver = class {observe() {} unobserve() {}};
  w.HTMLElement.prototype.scrollIntoView = function() {};
  w.alert = text => alerts.push(text);
  w.open = (...args) => opens.push(args);
  if (sdk) w.emailjs = {init: (...args) => {calls.push(['init', ...args]); return sdk.init(...args);}, send: (...args) => {calls.push(args); return sdk.send(...args);}};
  const ready = new Promise(resolve => w.document.addEventListener('DOMContentLoaded', resolve, {once: true}));
  w.eval(fs.readFileSync('script.js', 'utf8'));
  await ready;
  return {dom, w, d: w.document, errors, calls, opens, alerts, media};
}
function fillBooking(p) {
  for (const [id, value] of Object.entries({bookingName:'Jane & Family',bookingEmail:'jane@example.com',bookingPhone:'+972555123456',checkin:'2027-03-28',checkout:'2027-03-30',adults:'2',children:'2'})) p.d.getElementById(id).value = value;
  p.d.getElementById('crib').checked = true;
}
function submit(p, id) {p.d.getElementById(id).dispatchEvent(new p.w.Event('submit', {bubbles:true, cancelable:true}));}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('page initializes once after native DOMContentLoaded and subsequent ticks', async () => {
  const p = await page();
  try {
    await settle();
    await settle();
    assert.equal(p.d.readyState, 'complete');
    assert.equal(p.w.Date.now(), Date.parse('2026-11-25T12:00:00Z'));
    assert.equal(new p.w.Date().toISOString(), '2026-11-25T12:00:00.000Z');
    assert.equal(p.calls.filter(c => c[0] === 'init').length, 1);
    assert.equal(p.d.querySelectorAll('.review-card').length, 16);
    const button = p.d.querySelector('.hamburger');
    button.click();
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    assert.equal(p.d.querySelector('.nav-menu').hidden, false);
    assert.deepEqual(p.errors, []);
  } finally {
    p.dom.window.close();
  }
});

test('mobile navigation is a named native button, hides closed links, restores focus and adapts to desktop without EmailJS', async () => {
  const p = await page({sdk:null});
  const button = p.d.querySelector('.hamburger'), menu = p.d.querySelector('.nav-menu');
  assert.equal(button.tagName, 'BUTTON');
  assert.equal(button.type, 'button');
  assert.equal(button.getAttribute('aria-controls'), menu.id);
  assert.ok(button.getAttribute('aria-label'));
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(menu.hidden, true);
  button.click();
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(menu.hidden, false);
  menu.querySelector('a').focus();
  p.d.dispatchEvent(new p.w.KeyboardEvent('keydown', {key:'Escape'}));
  assert.equal(menu.hidden, true);
  assert.equal(p.d.activeElement, button);
  p.media.matches = false; p.media.change();
  assert.equal(menu.hidden, false);
  p.media.matches = true; p.media.change();
  assert.equal(menu.hidden, true);
  button.click(); menu.querySelector('a').click();
  assert.equal(menu.hidden, true);
  p.d.querySelector('.gallery-item img').click();
  assert.equal(p.d.getElementById('imageModal').style.display, 'block');
  assert.deepEqual(p.errors, []);
  p.dom.window.close();
});

test('booking rejection preserves data, recovers loading and offers only user-initiated encoded WhatsApp draft', async () => {
  let reject;
  const p = await page({sdk:{init(){},send:()=>new Promise((_, r)=>{reject=r;})}});
  fillBooking(p);
  submit(p, 'bookingForm');
  const button = p.d.querySelector('#bookingForm button[type="submit"]');
  assert.equal(button.disabled, true);
  await settle(); reject(new Error('Controlled simulation: offline')); await settle();
  const status = p.d.getElementById('bookingStatus');
  assert.ok(status, 'inline booking status exists');
  assert.equal(status.getAttribute('aria-live'), 'polite');
  assert.match(status.textContent, /not sent/i);
  assert.equal(p.d.getElementById('bookingName').value, 'Jane & Family');
  assert.equal(p.d.getElementById('crib').checked, true);
  assert.equal(button.disabled, false);
  const link = status.querySelector('a[href^="https://wa.me/"]');
  assert.ok(link, 'explicit WhatsApp fallback');
  const url = new URL(link.href);
  assert.equal(url.pathname, '/972559953030');
  const draft = url.searchParams.get('text');
  for (const detail of ['Jane & Family','jane@example.com','+972555123456','2027-03-28','2027-03-30','Nights: 2','Adults: 2','Children: 2','Crib requested: Yes','confirm availability and pricing']) assert.ok(draft.includes(detail), detail);
  assert.deepEqual(p.opens, []); assert.deepEqual(p.alerts, []);
  p.dom.window.close();
});

test('booking validates date presence, past dates and checkout order before contacting EmailJS', async () => {
  for (const dates of [{checkin:'',checkout:''},{checkin:'2020-01-01',checkout:'2020-01-02'},{checkin:'2027-03-30',checkout:'2027-03-29'},{checkin:'2027-03-30',checkout:'2027-03-30'}]) {
    const p = await page(); fillBooking(p);
    p.d.getElementById('checkin').value = dates.checkin;
    p.d.getElementById('checkout').value = dates.checkout;
    submit(p, 'bookingForm'); await settle();
    assert.match(p.d.getElementById('bookingStatus').textContent, /not sent/i);
    assert.equal(p.calls.filter(c=>c[0]!=='init').length,0);
    assert.equal(p.d.getElementById('bookingName').value,'Jane & Family');
    assert.equal(p.d.querySelector('#bookingForm button').disabled,false);
    assert.deepEqual(p.errors,[]); p.dom.window.close();
  }
});

test('booking success preserves calendar dates, prevents duplicate sends and never auto-opens WhatsApp', async () => {
  let resolve;
  const p = await page({sdk:{init(){},send:()=>new Promise(r=>{resolve=r;})}});
  fillBooking(p); submit(p,'bookingForm'); submit(p,'bookingForm'); await settle();
  const sends=p.calls.filter(c=>c[0]!=='init'); assert.equal(sends.length,1);
  assert.equal(sends[0][0],'service_zov0yer'); assert.equal(sends[0][1],'template_y5stmvv');
  assert.equal(sends[0][2].checkin,'2027-03-28'); assert.equal(sends[0][2].checkout,'2027-03-30');
  assert.equal(sends[0][2].nights,2);
  resolve({status:200}); await settle();
  assert.match(p.d.getElementById('bookingStatus').textContent,/request was sent/i);
  assert.match(p.d.getElementById('bookingStatus').textContent,/not a confirmed reservation/i);
  assert.equal(p.d.querySelector('#bookingForm button').disabled,false);
  assert.deepEqual(p.opens,[]); assert.deepEqual(p.alerts,[]); assert.deepEqual(p.errors,[]);
  p.dom.window.close();
});

test('clearing check-in restores date limits without a script error and calendar advancement is timezone-safe', async () => {
  const p=await page(); const input=p.d.getElementById('checkin'), checkout=p.d.getElementById('checkout');
  input.value='2027-03-28'; input.dispatchEvent(new p.w.Event('change'));
  assert.equal(checkout.min,'2027-03-29');
  input.value=''; input.dispatchEvent(new p.w.Event('change'));
  assert.deepEqual(p.errors,[]);
  assert.equal(checkout.min,input.min);
  p.dom.window.close();
});

test('minimum booking date uses the guest local calendar day rather than UTC', async () => {
  const now='2026-11-25T00:30:00Z'; const p=await page({now}); const d=new Date(now);
  const expected=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  assert.equal(p.d.getElementById('checkin').min,expected);
  p.dom.window.close();
});

test('booking fallback handles missing SDK, initialization errors and synchronous send errors', async () => {
  for (const sdk of [null,{init(){throw Error('blocked init');},send(){throw Error('must not send');}},{init(){},send(){throw Error('offline');}}]) {
    const p=await page({sdk}); fillBooking(p); submit(p,'bookingForm'); await settle();
    assert.match(p.d.getElementById('bookingStatus').textContent,/not sent/i);
    assert.equal(p.d.getElementById('bookingName').value,'Jane & Family');
    assert.ok(p.d.querySelector('#bookingStatus a[href^="https://wa.me/972559953030?text="]'));
    assert.equal(p.d.querySelector('#bookingForm button').disabled,false);
    assert.deepEqual(p.errors,[]); assert.deepEqual(p.opens,[]); assert.deepEqual(p.alerts,[]);
    p.dom.window.close();
  }
});

test('availability content states host confirmation, verified property details and current Airbnb rules', () => {
  const d = new JSDOM(html()).window.document;
  assert.equal(d.querySelector('#bookingForm button[type="submit"]').textContent, 'Request Availability');
  const booking = d.querySelector('#booking').textContent;
  assert.match(booking, /dates and prices require host confirmation/i);
  assert.match(booking, /children.s sleeping arrangements/i);
  assert.match(booking, /crib.*occupancy.*host/i);
  const summary = d.querySelector('#propertySummary'); assert.ok(summary);
  for (const detail of ['Sleeps 2 adults','crib or a bed for young children','by arrangement with the host','1 bedroom','1 double bed','1 bathroom','Ground floor','Free parking','Kitchen','Washer/dryer','lockbox','3pm','10am','1 pet','No smoking']) assert.ok(summary.textContent.includes(detail), detail);
  assert.ok(d.querySelector('a[href="https://www.airbnb.com/rooms/615293478807650528"]'));
  assert.ok([...d.querySelectorAll('a')].some(a => a.textContent === 'Book on Airbnb'));
  assert.match(summary.textContent, /house rules and cancellation/i);
  assert.doesNotMatch(d.body.textContent, /1\.5 Gbps|73\s?Mbps/);
  assert.deepEqual([...d.querySelector('#adults').options].map(o=>o.value), ['1','2']);
  assert.deepEqual([...d.querySelector('#children').options].map(o=>o.value), ['0','1','2']);
});

test('gallery includes five inspected listing photos with factual alt text and existing originals retained', () => {
  const d = new JSDOM(html()).window.document;
  const alts = ['Bedroom with double bed, bedside table and window','Tree-lined street and gated exterior','Kitchenette with white cabinets, sink, countertop oven and dining area','Living-area sofa beside kitchenette, with doorway to bedroom','Paved outdoor approach with shrubs and fence'];
  alts.forEach((alt,i) => {
    const path = `images/airbnb-listing-0${i+1}.jpg`;
    const image = d.querySelector(`.gallery-item img[src="${path}"]`);
    assert.ok(image, path); assert.equal(image.alt, alt); assert.ok(fs.existsSync(path));
  });
  assert.ok(fs.existsSync('images/2022-04-29.jpg'));
});

test('social previews use canonical title description and inspected property photo', () => {
  const d = new JSDOM(html()).window.document;
  const canonical = d.querySelector('link[rel="canonical"]').href;
  const description = d.querySelector('meta[name="description"]').content;
  for (const [selector, expected] of [
    ['meta[property="og:title"]',d.title],['meta[property="og:description"]',description],['meta[property="og:url"]',canonical],['meta[property="og:type"]','website'],['meta[property="og:image"]',canonical+'images/airbnb-listing-01.jpg'],['meta[name="twitter:card"]','summary_large_image'],['meta[name="twitter:title"]',d.title],['meta[name="twitter:description"]',description],['meta[name="twitter:image"]',canonical+'images/airbnb-listing-01.jpg']
  ]) assert.equal(d.querySelector(selector)?.content, expected, selector);
});

test('contact failure retains entered values and provides email and WhatsApp alternatives for rejection, missing SDK and init failure', async () => {
  for (const sdk of [null,{init(){throw Error('blocked init');},send(){throw Error('must not send');}},{init(){},send(){throw Error('offline');}},{init(){},send:()=>Promise.reject(Error('offline'))}]) {
    const p = await page({sdk});
    for (const [id,value] of Object.entries({name:'Jane',email:'jane@example.com',phone:'123',message:'Can we stay? & thanks'})) p.d.getElementById(id).value=value;
    submit(p,'contactForm'); await settle();
    const status = p.d.getElementById('contactStatus');
    assert.ok(status, 'inline contact status'); assert.equal(status.getAttribute('aria-live'),'polite');
    assert.match(status.textContent,/not sent/i);
    assert.equal(p.d.getElementById('message').value,'Can we stay? & thanks');
    assert.equal(p.d.querySelector('#contactForm button').disabled,false);
    assert.ok(status.querySelector('a[href="mailto:ramot-getaway@cohen.network"]'));
    assert.equal(new URL(status.querySelector('a[href^="https://wa.me/"]').href).pathname,'/972559953030');
    assert.deepEqual(p.alerts,[]); assert.deepEqual(p.opens,[]); assert.deepEqual(p.errors,[]);
    p.dom.window.close();
  }
});

test('privacy note explains actual contact processing without invented policies', () => {
  const d = new JSDOM(html()).window.document;
  const note = d.querySelector('#privacy'); assert.ok(note);
  for (const phrase of ['name, email, phone','reply','coordinate stays','EmailJS','underlying email service','WhatsApp','only when you choose','Airbnb','privacy policy']) assert.ok(note.textContent.includes(phrase), phrase);
  assert.ok(d.querySelector('#bookingForm a[href="#privacy"]'));
  assert.ok(d.querySelector('#contactForm a[href="#privacy"]'));
  assert.ok(note.querySelector('a[href="https://www.airbnb.com/help/article/2855"]'));
});

test('contact success reports send without claiming receipt and restores loading state', async () => {
  let resolve;
  const p = await page({sdk:{init(){},send:()=>new Promise(r=>{resolve=r;})}});
  for (const [id,value] of Object.entries({name:'Jane',email:'jane@example.com',message:'Hello'})) p.d.getElementById(id).value=value;
  submit(p,'contactForm');
  const button = p.d.querySelector('#contactForm button');
  assert.equal(button.disabled,true);
  assert.match(p.d.getElementById('contactStatus').textContent,/sending/i);
  await settle(); resolve({status:200}); await settle();
  assert.equal(button.disabled,false); assert.equal(button.textContent,'Send Message');
  assert.match(p.d.getElementById('contactStatus').textContent,/message was sent/i);
  assert.doesNotMatch(p.d.getElementById('contactStatus').textContent,/received/i);
  assert.deepEqual(p.calls.find(c=>c[1]==='template_mzckjrc').slice(0,2),['service_zov0yer','template_mzckjrc']);
  assert.equal(p.d.getElementById('message').value,'');
  assert.deepEqual(p.alerts,[]); assert.deepEqual(p.opens,[]);
  p.dom.window.close();
});

test('confirmed testimonials retain wording while Airbnb excerpts have accurate linked attribution', async () => {
  const p = await page();
  const cards = [...p.d.querySelectorAll('.review-card')];
  assert.equal(cards.length,16);
  for (const [i,name,date,text] of [[0,'Sarah M.','March 2024','"Amazing place! Perfect location, clean, and very comfortable. The host was super responsive and helpful."'],[1,'David L.','February 2024','"Great spot for a family vacation. The kids loved it and we appreciated the full kitchen and parking."']]) {
    assert.equal(cards[i].querySelector('strong').textContent,name);
    assert.equal(cards[i].querySelector('.review-date').textContent,date);
    assert.equal(cards[i].querySelector('.review-text').textContent,text);
    assert.match(cards[i].textContent,/Guest feedback/);
    assert.doesNotMatch(cards[i].textContent,/Airbnb/);
  }
  for (const card of cards.slice(2)) {
    assert.match(card.textContent,/Airbnb review excerpt/);
    assert.equal(card.querySelector('a').href,'https://www.airbnb.com/rooms/615293478807650528/reviews');
  }
  assert.equal(cards[3].querySelector('.review-stars').textContent,'★★★★☆');
  p.dom.window.close();
});

test('keyboard focus has a visible contrasting outline and booking links stay readable', () => {
  const css = fs.readFileSync('styles.css','utf8');
  const dom = new JSDOM('<style>'+css+'</style>');
  const rules = [...dom.window.document.styleSheets[0].cssRules];
  const focus = rules.find(r=>r.selectorText===':focus-visible');
  assert.ok(focus); assert.match(focus.style.outline,/3px solid/); assert.equal(focus.style.getPropertyValue('outline-offset'),'3px');
  assert.ok(rules.find(r=>r.selectorText==='.booking a:not(.btn)' && r.style.color));
  assert.ok(rules.find(r=>r.selectorText==='[hidden]' && r.style.display==='none'));
});

test('public contact links route to confirmed phone, WhatsApp and email', () => {
  const d = new JSDOM(html()).window.document;
  const phoneLinks = [...d.querySelectorAll('a[href^="tel:"]')];
  assert.ok(phoneLinks.length > 0, 'public phone links exist');
  for (const a of phoneLinks) assert.equal(a.getAttribute('href'), 'tel:' + '+' + '972559953030');
  for (const a of d.querySelectorAll('a[href*="wa.me"]')) assert.equal(new URL(a.href).pathname, '/972559953030');
  assert.ok(d.querySelectorAll('a[href="mailto:ramot-getaway@cohen.network"]').length >= 2);
  assert.match(d.querySelector('#whatsappFloat a').getAttribute('aria-label') || '', /WhatsApp/);
  for (const node of d.querySelectorAll('.contact-item, .footer-section')) if (node.textContent.includes('ramot-getaway@')) assert.ok(node.querySelector('a[href^="mailto:"]'));
});

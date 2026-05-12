/* ============================================================
   DATA
   ============================================================ */
const COLLEGES = {
  'VIIT':              { lat: 17.6868, lng: 83.2185, area:'Duvvada' },
  'GITAM':             { lat: 17.7714, lng: 83.3713, area:'Rushikonda' },
  'ANITS':             { lat: 17.8603, lng: 83.3706, area:'Sangivalasa' },
  'Andhra University': { lat: 17.7321, lng: 83.3206, area:'Waltair' }
};

let RIDES_DATA = [];

const fetchRides = async () => {
  if (!window.supabase) return;
  
  let query = window.supabase
    .from('rides')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters from state
  if (state.selectedCollege) {
    query = query.eq('to_college', state.selectedCollege);
  }
  
  const vFilter = state.filters.vehicle !== 'all' ? state.filters.vehicle : null;
  if (vFilter) {
    query = query.eq('vehicle_type', vFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching rides:", error);
    return;
  }
  
  if (data) {
    // Map Supabase fields to local state fields
    RIDES_DATA = data.map(r => ({
      id: r.id,
      driver: r.rider_name,
      initials: (r.rider_name || 'ND').split(' ').map(n=>n[0]).join('').toUpperCase().substring(0,2),
      vehicle: r.vehicle_type,
      gender: r.gender_pref || 'any',
      from: r.from_location,
      to: r.to_college,
      time: r.departure_time,
      price: r.price || 50,
      seats: r.available_seats,
      totalSeats: r.total_seats || r.available_seats,
      rating: r.rating || 5.0,
      phone: r.phone,
      lat: r.lat || (17.7 + (Math.random() * 0.1)),
      lng: r.lng || (83.3 + (Math.random() * 0.1))
    }));
    
    // Refresh UI
    renderRides();
  }
};

/* ============================================================
   STATE
   ============================================================ */
let state = {
  filters: { vehicle:'all', gender:'any', price:200, time:'any' },
  selectedCollege: '',
  quickVehicle: 'all',
  currentStep: 1,
  formData: { vehicle:'bike', gender:'male' },
  currentRide: null,
  mapsInit: { hero:false, heroSearch:false, results:false, detail:false }
};

let heroSearchMap, resultsMap, detailMap;
let resultsMarkers = [];

/* ============================================================
   CINEMATIC INTRO
   ============================================================ */
(function initIntro(){
  const intro = document.getElementById('intro');
  const app = document.getElementById('app');
  
  // Check if intro has already played in this session
  if (sessionStorage.getItem('introPlayed')) {
    if (intro) intro.style.display = 'none';
    if (app) app.classList.add('show');
    return;
  }

  const canvas = document.getElementById('routeCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  if(!ctx) return;
  let nodes = [], particles = [], W, H;
  function resize(){ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  class Node {
    constructor(){ this.x = Math.random()*W; this.y = Math.random()*H; this.vx = (Math.random()-0.5)*0.5; this.vy = (Math.random()-0.5)*0.5; }
    update(){ this.x += this.vx; this.y += this.vy; if(this.x<0||this.x>W) this.vx*=-1; if(this.y<0||this.y>H) this.vy*=-1; }
  }
  function addParticle(){
    const n1 = nodes[Math.floor(Math.random()*nodes.length)];
    const n2 = nodes[Math.floor(Math.random()*nodes.length)];
    if(n1 && n2) particles.push({n1, n2, p:0, s:0.005+Math.random()*0.01});
  }
  for(let i=0;i<40;i++) nodes.push(new Node());
  function draw(){
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle = 'rgba(136,136,136,0.1)'; ctx.lineWidth = 1;
    nodes.forEach(n=>{ n.update(); nodes.forEach(n2=>{ const d = Math.hypot(n.x-n2.x, n.y-n2.y); if(d<150){ ctx.beginPath(); ctx.moveTo(n.x,n.y); ctx.lineTo(n2.x,n2.y); ctx.stroke(); } }); });
    particles.forEach((p,i)=>{ p.p += p.s; const cx = p.n1.x + (p.n2.x-p.n1.x)*p.p; const cy = p.n1.y + (p.n2.y-p.n1.y)*p.p; ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fillStyle=`rgba(136,136,136,0.95)`; ctx.fill(); if(p.p>=1) particles.splice(i,1); });
    if(nodes.length>0 && Math.random()>0.9) addParticle();
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', resize); resize(); draw();
  setTimeout(()=>{ const ic = document.getElementById('introCenter'); if(ic) ic.classList.add('show'); const is = document.getElementById('introScroll'); if(is) is.classList.add('show'); }, 1200);
  
  function exitIntro(){
    if(intro) intro.classList.add('out'); if(app) app.classList.add('show');
    sessionStorage.setItem('introPlayed', 'true');
    setTimeout(()=>{ if(intro) intro.style.display='none'; }, 1400);
    window.removeEventListener('scroll', exitIntro); document.removeEventListener('click', exitIntro);
  }
  
  setTimeout(()=>{ window.addEventListener('scroll', exitIntro, {once:true}); document.addEventListener('click', exitIntro, {once:true}); }, 5000);
  setTimeout(exitIntro, 7800);
})();


/* ============================================================
   MAPS
   ============================================================ */
function initHeroSearchMap(){
  if(state.mapsInit.heroSearch) return;
  state.mapsInit.heroSearch = true;
  const el = document.getElementById('heroMapEl2'); if(!el) return;
  heroSearchMap = L.map('heroMapEl2', { zoomControl:false, scrollWheelZoom:false, attributionControl:false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:18}).addTo(heroSearchMap);
  heroSearchMap.setView([17.7321, 83.3206], 12);
  const mkIcon = L.divIcon({ html:`<div style="width:12px;height:12px;background:#1A1A1A;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.1)"></div>`, iconAnchor:[6,6], className:'' });
  Object.entries(COLLEGES).forEach(([name, pos])=>{ L.marker([pos.lat, pos.lng], {icon: mkIcon}).addTo(heroSearchMap).bindTooltip(name,{permanent:false,direction:'top'}); });
}
function initResultsMap(){
  if(state.mapsInit.results) return;
  state.mapsInit.results = true;
  const el = document.getElementById('resultsMapEl'); if(!el) return;
  resultsMap = L.map('resultsMapEl', { zoomControl:false, scrollWheelZoom:false, attributionControl:false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:18}).addTo(resultsMap);
  resultsMap.setView([17.7321, 83.3206], 12);
}
function updateResultsMap(rides){
  if(!resultsMap) return;
  resultsMap.invalidateSize();
  resultsMarkers.forEach(m=>m.remove()); resultsMarkers = [];
  const bounds = [];
  rides.forEach(r=>{
    const icon = L.divIcon({ html:`<div style="background:${r.vehicle==='bike'?'#F59E0B':'#1A1A1A'};color:white;padding:3px 9px;border-radius:16px;font-size:10px;font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,0.25);white-space:nowrap;">₹${r.price}</div>`, iconAnchor:[0,0], className:'' });
    const m = L.marker([r.lat, r.lng], {icon}).addTo(resultsMap).bindTooltip(`${r.driver} → ${r.to}`,{direction:'top'});
    resultsMarkers.push(m); bounds.push([r.lat, r.lng]);
    const col = COLLEGES[r.to]; if(col) bounds.push([col.lat, col.lng]);
  });
  if(bounds.length>0) resultsMap.fitBounds(bounds, {padding:[40,40]});
}

/* ============================================================
   UTILITIES
   ============================================================ */
function scrollTo(id){ const el = document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth'}); }
function scrollToSection(id){ scrollTo(id); }
function showToast(msg, type='ok'){
  const t = document.createElement('div'); t.className = `toast ${type}`; t.innerHTML = (type==='ok'?'✅ ':'❌ ') + msg; document.body.appendChild(t);
  setTimeout(()=>t.classList.add('show'),10); setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),400); }, 3000);
}

/* ============================================================
   SEARCH & FILTERS
   ============================================================ */
function useCurrentLocation() { document.getElementById('fromInput').value = 'MVP Colony, Visakhapatnam'; showToast('📍 Location set to MVP Colony'); }
function selectCollege(el) { document.querySelectorAll('#collegeChips .chip').forEach(c => c.classList.remove('on')); el.classList.add('on'); state.selectedCollege = el.dataset.college; fetchRides(); }
function quickFilter(el) { document.querySelectorAll('.chips .chip[data-v]').forEach(c => c.classList.remove('on')); el.classList.add('on'); state.quickVehicle = el.dataset.v; state.filters.vehicle = el.dataset.v; fetchRides(); }

function doSearch() {
  const from = document.getElementById('fromInput').value.trim();
  if (!from) { showToast('Please enter your pickup location', 'err'); return; }
  if (!state.selectedCollege) { showToast('Please select a college', 'err'); return; }
  const rs = document.getElementById('results-section'); if (rs) { rs.classList.add('on'); rs.scrollIntoView({ behavior: 'smooth' }); }
  const list = document.getElementById('ridesList');
  if (list) {
    list.innerHTML = [1, 2, 3].map(() => `
      <div class="skel-card">
        <div style="display:flex;gap:10px;align-items:center">
          <div class="skel" style="width:42px;height:42px;border-radius:50%"></div>
          <div style="flex:1"><div class="skel" style="height:14px;width:60%;margin-bottom:7px"></div><div class="skel" style="height:11px;width:40%"></div></div>
          <div class="skel" style="height:24px;width:50px;border-radius:6px"></div>
        </div>
        <div class="skel" style="height:36px;margin-top:10px;border-radius:9px"></div>
        <div style="display:flex;gap:10px;margin-top:10px">
          <div class="skel" style="height:11px;width:60px"></div><div class="skel" style="height:11px;width:50px"></div><div class="skel" style="height:11px;width:55px"></div>
        </div>
      </div>`).join('');
  }
  if (!state.mapsInit.results) initResultsMap();
  state.filters.vehicle = state.quickVehicle;
  setTimeout(() => { fetchRides(); }, 900);
}

function applyFilter(type, el) { el.closest('.f-opts').querySelectorAll('.f-btn').forEach(b => b.classList.remove('on')); el.classList.add('on'); state.filters[type] = el.dataset.fv; fetchRides(); }
function applyPriceFilter(val) { const el = document.getElementById('priceVal'); if (el) el.textContent = '₹' + val; state.filters.price = +val; renderRides(); }
function clearFilters() {
  state.filters = { vehicle: 'all', gender: 'any', price: 200, time: 'any' };
  document.querySelectorAll('.f-btn').forEach(b => { b.classList.remove('on'); if (b.dataset.fv === 'all' || b.dataset.fv === 'any') b.classList.add('on'); });
  const slider = document.getElementById('priceSlider'); if (slider) slider.value = 200;
  const val = document.getElementById('priceVal'); if (val) val.textContent = '₹200';
  renderRides();
}
function sortRides(val) { renderRides(val); }

function getFilteredRides(sort = 'recommended') {
  let rides = [...RIDES_DATA];
  if (state.selectedCollege) rides = rides.filter(r => r.to === state.selectedCollege);
  if (state.filters.vehicle !== 'all') rides = rides.filter(r => r.vehicle === state.filters.vehicle);
  if (state.filters.gender !== 'any') rides = rides.filter(r => r.gender === state.filters.gender || r.gender === 'any');
  rides = rides.filter(r => r.price <= state.filters.price);
  if(sort==='price_asc') rides.sort((a,b)=>a.price-b.price);
  else if(sort==='price_desc') rides.sort((a,b)=>b.price-a.price);
  else if(sort==='rating') rides.sort((a,b)=>b.rating-a.rating);
  else rides.sort((a,b)=>{ const aS=(a.recommended?3:0)+(a.popular?2:0)+a.rating; const bS=(b.recommended?3:0)+(b.popular?2:0)+b.rating; return bS-aS; });
  return rides;
}

function renderRides(sort = 'recommended') {
  const rides = getFilteredRides(sort); const list = document.getElementById('ridesList');
  const count = document.getElementById('resultsCount'); if (count) count.textContent = rides.length;
  if (!rides.length) { if (list) list.innerHTML = `<div class="empty"><h3>No rides found</h3><button class="btn btn-primary" onclick="openAddRide()">+ Add a Ride</button></div>`; updateResultsMap([]); return; }
  const minP = Math.min(...rides.map(r=>r.price));
  if (list) {
    list.innerHTML = rides.map((r, i) => {
      const col = COLLEGES[r.to]; const dist = col ? Math.round(Math.sqrt(Math.pow((r.lat-col.lat)*111,2)+Math.pow((r.lng-col.lng)*100,2))) : '?';
      return `<div class="ride-card reveal" style="animation-delay:${i*0.06}s" onclick="openRideDetail(${r.id})">
        <div class="rc-top">
          <div class="rc-driver"><div class="rc-avatar">${r.initials}</div><div><div class="rc-name">${r.driver}</div><div class="rc-rating">★ ${r.rating} · ${r.vehicle==='bike'?'Bike':'Car'}</div></div></div>
          <div style="text-align:right"><div class="rc-price"><sup>₹</sup>${r.price}<small>/seat</small></div><div class="rc-rating">${r.seats} seats left</div></div>
        </div>
        <div class="rc-route"><span class="rc-from">📍 ${r.from}</span><div class="rc-arrow"></div><span class="rc-to">🎓 ${r.to}</span></div>
        <div class="rc-meta"><div class="rc-m">🕐 <b>${r.time}</b></div><div class="rc-m">💺 <b>${r.seats}/${r.totalSeats||1}</b> available</div><div class="rc-m">📍 ${dist}km</div></div>
        <div class="rc-badges">
          <span class="badge ${r.vehicle==='bike'?'b-bike':'b-car'}">${r.vehicle==='bike'?'🏍 Bike':'🚗 Car'}</span>
          <span class="badge ${r.gender==='female'?'b-female':r.gender==='male'?'b-male':'b-any'}">${r.gender==='female'?'👩 Female Only':r.gender==='male'?'👨 Male Only':'⚥ Any'}</span>
          ${r.popular?'<span class="badge b-popular">🔥 Popular</span>':''} ${r.recommended?'<span class="badge b-recommended">⭐ Recommended</span>':''} ${r.price===minP?'<span class="badge b-cheapest">💚 Cheapest</span>':''}
        </div>
      </div>`;
    }).join('');
  }
  updateResultsMap(rides);
  setTimeout(()=>document.querySelectorAll('.ride-card.reveal').forEach(el=>observer.observe(el)), 100);
}

/* ============================================================
   RIDE DETAIL
   ============================================================ */
function openRideDetail(id){
  const rides = getFilteredRides(); const r = rides.find(x=>x.id===id); if(!r) return; state.currentRide = r;
  const col = COLLEGES[r.to]; const dist = col ? Math.round(Math.sqrt(Math.pow((r.lat-col.lat)*111,2)+Math.pow((r.lng-col.lng)*100,2))) : '?'; const dur = Math.round(dist * 2.5);
  document.getElementById('detailTitle').textContent = `${r.from} → ${r.to}`;
  document.getElementById('detailBody').innerHTML = `
    <div style="padding:0 0 16px">
      <div class="detail-map-area"><div id="detailMapEl" style="width:100%;height:100%"></div></div>
      <div class="detail-driver-row">
        <div class="detail-av">${r.initials}</div>
        <div class="detail-driver-info"><h3>${r.driver}</h3><p>★ ${r.rating} rating · ${r.vehicle==='bike'?'Bike Rider':'Car Driver'} · ${r.gender==='female'?'Female':'Male'}</p></div>
        <div style="margin-left:auto;text-align:right"><div style="font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800;color:var(--primary)">₹${r.price}</div><div style="font-size:0.75rem;color:var(--text-muted)">per seat</div></div>
      </div>
      <div class="detail-stats-row">
        <div class="d-stat"><div class="n">${r.seats}</div><div class="l">Seats Left</div></div>
        <div class="d-stat"><div class="n">${dist}km</div><div class="l">Distance</div></div>
        <div class="d-stat"><div class="n">~${dur}m</div><div class="l">Est. Time</div></div>
      </div>
      <div class="route-visual">
        <div class="rv-row"><div class="rv-dot" style="background:#10B981"></div><div style="font-size:0.86rem;font-weight:600;color:var(--text)">📍 ${r.from}</div></div>
        <div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0"><div class="rv-line"></div><div style="font-size:0.76rem;color:var(--text-muted);padding-top:2px">${dur} min drive · ${dist} km</div></div>
        <div class="rv-row"><div class="rv-dot" style="background:#1A1A1A"></div><div style="font-size:0.86rem;font-weight:600;color:var(--text)">🎓 ${r.to} Campus</div></div>
      </div>
    </div>`;
  
  // Set contact links
  const whatsapp = document.getElementById('btnWhatsApp');
  const call = document.getElementById('btnCall');
  if(whatsapp) whatsapp.href = `https://wa.me/91${r.phone || ''}`;
  if(call) call.href = `tel:${r.phone || ''}`;

  openModal('detailOverlay');
  setTimeout(()=>{
    if(!detailMap) { detailMap = L.map('detailMapEl',{zoomControl:false,attributionControl:false}); L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(detailMap); }
    detailMap.invalidateSize(); detailMap.setView([r.lat, r.lng], 14); L.marker([r.lat, r.lng]).addTo(detailMap);
  }, 300);
}

function bookRide(){ if(!state.currentRide) return; closeModal('detailOverlay'); showToast(`🎉 Ride booked with ${state.currentRide.driver}!`); }

/* ============================================================
   ADD RIDE MODAL
   ============================================================ */
function openAddRide(){ state.currentStep = 1; renderStep(1); openModal('addRideOverlay'); }
function renderStep(n){
  // Update content visibility
  for(let i=1;i<=5;i++){ 
    const sc = document.getElementById('sc'+i); 
    if(sc) sc.classList.toggle('act', i===n);
    
    // Update step dots
    const sd = document.getElementById('sd'+i);
    if(sd) {
      sd.classList.toggle('act', i===n);
      sd.classList.toggle('done', i<n);
    }
    
    // Update step lines (lines sl1 to sl4 correspond to gaps between dots 1-5)
    if(i < 5) {
      const sl = document.getElementById('sl'+i);
      if(sl) sl.classList.toggle('done', i<n);
    }
  }

  // Update back button visibility
  const back = document.getElementById('stepBack');
  if(back) back.style.display = n === 1 ? 'none' : 'block';

  // If entering summary step, build it
  if(n === 5) buildSummary();

  const next = document.getElementById('stepNext'); 
  if(next) next.textContent = n===5?'🚀 Publish Ride':'Next →';
}

function stepNav(dir){ 
  const n = state.currentStep + dir; 
  if(n<1) return;
  
  // If clicking "Publish" on step 5
  if(n > 5) {
    publishRide();
    return;
  }
  
  state.currentStep = n; 
  renderStep(n); 
}

function selectVehicle(v){ 
  state.formData.vehicle = v; 
  document.querySelectorAll('.veh-opt').forEach(el => el.classList.remove('sel'));
  const target = v === 'bike' ? document.getElementById('vBike') : document.getElementById('vCar');
  if(target) target.classList.add('sel');
}

function selGender(g){ 
  state.formData.gender = g; 
  document.querySelectorAll('.gender-opt').forEach(el => el.classList.remove('sel'));
  const target = g === 'male' ? document.getElementById('gMale') : document.getElementById('gFemale');
  if(target) target.classList.add('sel');
}

function buildSummary(){
  const summary = document.getElementById('rideSummary');
  if(!summary) return;
  
  // Collect values from DOM
  const from = document.getElementById('addFrom').value || 'Not set';
  const to = document.getElementById('addCollege').value || 'Not set';
  const date = document.getElementById('addDate').value || 'Not set';
  const time = document.getElementById('addTime').value || '08:00';
  const seats = document.getElementById('addSeats').value || '1';
  const price = document.getElementById('addPrice').value || '0';
  const name = document.getElementById('addName').value || 'Anonymous';
  const phone = document.getElementById('addPhone').value || 'No phone';
  const v = state.formData.vehicle;
  const g = state.formData.gender;

  summary.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:0.85rem">
      <div style="grid-column: span 2; padding:10px; background:rgba(0,0,0,0.03); border-radius:8px; margin-bottom:4px">
        <div style="font-weight:700; color:var(--primary); margin-bottom:4px">📍 ROUTE</div>
        <div style="color:var(--text)">${from} → ${to}</div>
      </div>
      <div style="padding:10px; background:rgba(0,0,0,0.03); border-radius:8px">
        <div style="font-weight:700; color:var(--primary); margin-bottom:4px">🚗 DETAILS</div>
        <div style="color:var(--text)">${v.toUpperCase()} · ${seats} Seats · ₹${price}</div>
      </div>
      <div style="padding:10px; background:rgba(0,0,0,0.03); border-radius:8px">
        <div style="font-weight:700; color:var(--primary); margin-bottom:4px">🕐 TIMING</div>
        <div style="color:var(--text)">${date} at ${time}</div>
      </div>
      <div style="grid-column: span 2; padding:10px; background:rgba(0,0,0,0.03); border-radius:8px">
        <div style="font-weight:700; color:var(--primary); margin-bottom:4px">👤 DRIVER</div>
        <div style="color:var(--text)">${name} (${g}) · ${phone}</div>
      </div>
    </div>
  `;
}

async function publishRide(){
  // Final validation
  const from = document.getElementById('addFrom').value.trim();
  const to = document.getElementById('addCollege').value;
  const name = document.getElementById('addName').value || 'Anonymous';
  const phone = document.getElementById('addPhone').value || '';
  const time = document.getElementById('addTime').value;
  const seats = parseInt(document.getElementById('addSeats').value) || 1;
  const price = parseInt(document.getElementById('addPrice').value) || 50;
  
  if(!from || !to) { showToast('Please complete route details', 'err'); return; }

  if (!window.supabase) {
    showToast('Supabase not connected', 'err');
    return;
  }

  const { data, error } = await window.supabase
    .from('rides')
    .insert([
      {
        rider_name: name,
        phone: phone,
        from_location: from,
        to_college: to,
        departure_time: time,
        vehicle_type: state.formData.vehicle,
        available_seats: seats,
        price: price,
        rating: 5.0,
        lat: 17.7 + (Math.random() * 0.1),
        lng: 83.3 + (Math.random() * 0.1)
      }
    ]);

  if (error) {
    console.error("Error publishing ride:", error);
    showToast('Failed to publish ride', 'err');
    return;
  }

  closeModal('addRideOverlay');
  showToast('🚀 Ride published successfully!');
  
  // Refresh data
  await fetchRides();
}

/* ============================================================
   MODAL HELPERS
   ============================================================ */
function openModal(id){ const el = document.getElementById(id); if(el) el.classList.add('open'); document.body.style.overflow='hidden'; }
function closeModal(id){ const el = document.getElementById(id); if(el) el.classList.remove('open'); document.body.style.overflow=''; }

/* ============================================================
   INIT & OBSERVERS
   ============================================================ */
const observer = new IntersectionObserver((entries)=>{ entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('vis'); }); },{threshold:0.1});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

window.addEventListener('scroll',()=>{ const nav = document.getElementById('mainNav'); if(nav) nav.classList.toggle('scrolled', window.scrollY>30); });

// Lazy-init maps on scroll
const sectionObserver = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      if(e.target.id==='search-section') initHeroSearchMap();
    }
  });
},{threshold:0.2});
document.querySelectorAll('#search-section').forEach(el=>sectionObserver.observe(el));

// Also eagerly init after a short delay as fallback
setTimeout(()=>{ initHeroSearchMap(); }, 2000);

function toggleMobileNav(){ const checkbox = document.getElementById('navCheckbox'); const links = document.querySelector('.nav-links'); if(checkbox && links) links.classList.toggle('open', checkbox.checked); }
document.querySelectorAll('.nav-links a').forEach(link => { link.addEventListener('click', () => { const checkbox = document.getElementById('navCheckbox'); if (checkbox) checkbox.checked = false; const links = document.querySelector('.nav-links'); if (links) links.classList.remove('open'); }); });

/* ============================================================
   ANIMATED COUNTERS
   ============================================================ */
function animateCounters(){
  document.querySelectorAll('[data-count]').forEach(el=>{
    const target = +el.dataset.count;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    let current = 0;
    const step = target / 60;
    const timer = setInterval(()=>{
      current = Math.min(current + step, target);
      el.textContent = prefix + Math.round(current).toLocaleString() + suffix;
      if(current >= target) clearInterval(timer);
    }, 22);
  });
}
const heroObs = new IntersectionObserver(entries=>{
  if(entries[0] && entries[0].isIntersecting){ animateCounters(); heroObs.disconnect(); }
},{threshold:0.4});
const heroEl = document.getElementById('hero');
if(heroEl) heroObs.observe(heroEl);

// Pre-select default chip
const qAll = document.getElementById('qAll');
if(qAll) qAll.classList.add('on');

// Initial fetch
fetchRides();
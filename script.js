// --- Category filter chips + load more -----------------------------------
const chips = Array.from(document.querySelectorAll('.chip'));
const reviewGrid = document.getElementById('reviewGrid');
const filterEmpty = document.getElementById('filterEmpty');
const loadMoreBtn = document.getElementById('loadMoreBtn');

function applyFilter(filterValue) {
  if (!reviewGrid) return;
  const cards = Array.from(reviewGrid.querySelectorAll('.review-card'));
  let anyVisible = false;

  cards.forEach((card) => {
    const categories = (card.dataset.categories || '').split(' ');
    const isLoadMoreItem = card.classList.contains('load-more-item');

    if (filterValue === 'all') {
      // Reset to the default state: first 3 shown, "load more" cards hidden again.
      card.hidden = isLoadMoreItem;
    } else {
      card.hidden = !categories.includes(filterValue);
    }
    if (!card.hidden) anyVisible = true;
  });

  if (filterEmpty) filterEmpty.hidden = anyVisible;
  if (loadMoreBtn) loadMoreBtn.style.display = filterValue === 'all' ? '' : 'none';
}

chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    chips.forEach((c) => c.classList.remove('chip-active'));
    chip.classList.add('chip-active');
    applyFilter(chip.dataset.filter);
    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

loadMoreBtn?.addEventListener('click', () => {
  reviewGrid?.querySelectorAll('.load-more-item').forEach((card) => (card.hidden = false));
  loadMoreBtn.hidden = true;
});

// --- Mobile menu ------------------------------------------------------
const menuButton = document.getElementById('menuToggle');
const nav = document.getElementById('mainNav');

function setMenuOpen(open) {
  if (!nav) return;
  nav.dataset.open = String(open);
  menuButton?.setAttribute('aria-expanded', String(open));
}

menuButton?.addEventListener('click', () => {
  const open = nav.dataset.open === 'true';
  setMenuOpen(!open);
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMenuOpen(false));
});

// --- Share button -------------------------------------------------------
// Uses the native share sheet on supported devices (incl. Instagram as a
// target); falls back to copying the link on desktop browsers that don't
// support the Web Share API.
const shareBtn = document.getElementById('shareBtn');
shareBtn?.addEventListener('click', async () => {
  const shareData = {
    title: document.title,
    text: 'Check out this review on Makan Trail',
    url: window.location.href,
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      shareBtn.textContent = 'Link copied ✓';
      setTimeout(() => (shareBtn.textContent = 'Share this review ↗'), 2000);
    }
  } catch (err) {
    // User cancelled the native share sheet — no action needed.
  }
});

// --- Interactive hawker map (Leaflet + real NEA GPS data) ----------------
// Hawker centre coordinates below are sourced from NEA's "Hawker Centres"
// dataset on data.gov.sg (Open Data Licence, free for commercial use).
// Stall-level points and names are placeholder/editorial — no public dataset
// exists at the individual-stall level. Stall names below are intentionally
// fictional (not real, identifiable stalls) since they carry demo ratings
// and reviews; each stall is offset a small, realistic distance (tens of
// metres) from its hawker centre's real GPS point to demonstrate drill-down.
const mapEl = document.getElementById('hawkerMap');

if (mapEl && window.L) {
  const SG_CENTER = [1.3226, 103.8636];
  const SG_ZOOM = 12;
  const STALL_ZOOM = 18;

  const hawkerCentres = [
    {
      id: 'chinatown', name: 'Chinatown Complex', lat: 1.2823, lng: 103.8428802,
      address: '335 Smith Street, Singapore 050335', stallCount: 226,
      stalls: [
        { name: 'Golden Ladle Wanton Mee', cuisine: 'Noodles', rating: 4.5, dlat: 0.00035, dlng: -0.00030 },
        { name: 'Silver Bowl Porridge', cuisine: 'Porridge', rating: 4.2, dlat: -0.00020, dlng: 0.00025 },
        { name: 'Riverside Fried Kway Teow', cuisine: 'Fried Kway Teow', rating: 4.6, dlat: 0.00020, dlng: 0.00040 },
      ],
    },
    {
      id: 'tiongbahru', name: 'Tiong Bahru Market', lat: 1.28468299, lng: 103.832428,
      address: '30 Seng Poh Road, Singapore 168898', stallCount: 83,
      stalls: [
        { name: 'Teochew Corner Shui Kueh', cuisine: 'Teochew', rating: 4.4, dlat: 0.00025, dlng: -0.00020 },
        { name: 'Market Wok Hokkien Mee', cuisine: 'Hokkien Mee', rating: 4.3, dlat: -0.00030, dlng: 0.00015 },
        { name: 'Lor Mee Corner', cuisine: 'Lor Mee', rating: 4.1, dlat: 0.00010, dlng: 0.00035 },
      ],
    },
    {
      id: 'maxwell', name: 'Maxwell Food Centre', lat: 1.28055096, lng: 103.8444595,
      address: '1 Kadayanallur Street, Singapore 069184', stallCount: 103,
      stalls: [
        { name: 'Sunny Isle Chicken Rice', cuisine: 'Chicken Rice', rating: 4.5, dlat: 0.00020, dlng: -0.00025 },
        { name: 'Harbour Fuzhou Oyster Cake', cuisine: 'Snacks', rating: 4.0, dlat: -0.00025, dlng: 0.00020 },
        { name: 'Northern Style La Mian & Xiao Long Bao', cuisine: 'Noodles', rating: 4.3, dlat: 0.00030, dlng: 0.00030 },
      ],
    },
    {
      id: 'geylang', name: 'Geylang Serai Market', lat: 1.31688809, lng: 103.8974075,
      address: '1 Geylang Serai, Singapore 402001', stallCount: 63,
      stalls: [
        { name: "Uncle Kok's Frog Leg Bee Hoon", cuisine: 'Bee Hoon', rating: 4.8, dlat: 0.00030, dlng: -0.00020 },
        { name: 'Kampung Flavours Nasi Padang', cuisine: 'Malay', rating: 4.4, dlat: -0.00020, dlng: 0.00030 },
        { name: 'Sweet Steam Putu Piring', cuisine: 'Dessert', rating: 4.2, dlat: 0.00015, dlng: 0.00035 },
      ],
    },
    {
      id: 'oldairport', name: '51 Old Airport Road Food Centre', lat: 1.30827999, lng: 103.8858414,
      address: 'Blk 51, Old Airport Road, Singapore 390051', stallCount: 168,
      stalls: [
        { name: 'Golden Wok Rou Cuo Mian', cuisine: 'Mee Pok', rating: 4.6, dlat: 0.00025, dlng: -0.00030 },
        { name: 'Harbourfront Hokkien Fried Mee', cuisine: 'Hokkien Mee', rating: 4.7, dlat: -0.00020, dlng: 0.00025 },
        { name: 'Fruit Rojak Corner', cuisine: 'Snacks', rating: 4.1, dlat: 0.00030, dlng: 0.00020 },
      ],
    },
    {
      id: 'newton', name: 'Newton Food Centre', lat: 1.3122250, lng: 103.8397293,
      address: '500 Clemenceau Avenue North, Singapore 229495', stallCount: 83,
      stalls: [
        { name: 'Circus Lights BBQ Seafood', cuisine: 'Seafood', rating: 4.3, dlat: 0.00025, dlng: -0.00025 },
        { name: 'Charcoal Trail Satay', cuisine: 'Satay', rating: 4.5, dlat: -0.00030, dlng: 0.00015 },
        { name: 'Golden Pan Fried Oyster Omelette', cuisine: 'Local', rating: 4.2, dlat: 0.00015, dlng: 0.00030 },
      ],
    },
  ];

  const SG_BOUNDS = L.latLngBounds([1.130, 103.55], [1.475, 104.15]);

  const map = L.map(mapEl, {
    scrollWheelZoom: true,
    maxBounds: SG_BOUNDS,
    maxBoundsViscosity: 1.0,
    minZoom: 11,
  }).setView(SG_CENTER, SG_ZOOM);
  map.setMaxBounds(SG_BOUNDS);

  // OneMap (Singapore Land Authority) basemap tiles -- Singapore-specific
  // detail and no third-party usage-policy limits, replacing the generic
  // OpenStreetMap public tile server used during early drafting.
  L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
    attribution: '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener">OneMap</a> &copy; contributors | Powered by SLA',
    maxZoom: 19,
    detectRetina: true,
  }).addTo(map);
  map.attributionControl.setPrefix(false);

  // Icons: each has a small visible dot plus generous invisible padding so
  // the tappable area clears the ~40px mobile touch-target guideline even
  // though the visual mark stays small enough not to clutter the map.
  const hcIcon = L.divIcon({ className: '', html: '<div class="pin-tap"><div class="hc-pin"></div></div>', iconSize: [40, 40], iconAnchor: [20, 20] });
  const stallIcon = L.divIcon({ className: '', html: '<div class="pin-tap"><div class="stall-pin"></div></div>', iconSize: [36, 36], iconAnchor: [18, 18] });
  const dirIcon = L.divIcon({ className: '', html: '<div class="pin-tap"><div class="dir-pin"></div></div>', iconSize: [36, 36], iconAnchor: [18, 18] });

  // Full hawker centre directory (name, lat, lng, short address, food stall
  // count) sourced from NEA's official dataset (data.gov.sg, snapshot Nov
  // 2025). These are shown as a clustered layer -- nearby points group into
  // a single number bubble that "explodes" into individual pins on zoom, so
  // 100+ locations stay readable instead of turning into a wall of pins.
  // Centres still under construction are excluded since they aren't open yet.
  const directoryCentres = [
    ['Ci Yuan Hawker Centre', 1.3749377, 103.8829472, '51 Hougang Ave 9', 40],
    ['Ayer Rajah Market', 1.31195998, 103.7591019, '502 West Coast Drive', 0],
    ['Ayer Rajah Food Centre', 1.31186998, 103.7598038, '503 West Coast Drive', 80],
    ['Bedok South Blk 16', 1.32055998, 103.9355469, '16 Bedok South Road', 64],
    ['Pasir Ris Central Hawker Centre', 1.373318, 103.951364, '110 Pasir Ris Central', 42],
    ['Tampines Round Market', 1.34559596, 103.9445953, '137 Tampines St 11', 45],
    ['Toa Payoh Lor 5 Blk 75', 1.33609998, 103.8529968, '75 Lor 5 Toa Payoh', 36],
    ['Zion Riverside Food Centre', 1.29234004, 103.8311844, '70 Zion Road', 32],
    ['Toa Payoh Lor 1 Blk 127', 1.33816004, 103.8447876, '127 Lor 1 Toa Payoh', 40],
    ['Tanjong Pagar Plaza Blk 6', 1.27667999, 103.8432312, '6 Tanjong Pagar Plaza', 52],
    ['Kebun Baru Food Centre', 1.36726606, 103.8399429, '226H Ang Mo Kio St 22', 29],
    ['Bedok Food Centre', 1.32035303, 103.9554749, '1 Bedok Road', 32],
    ['Bedok North St 1 Blk 216', 1.32711995, 103.9332962, '216 Bedok North St 1', 82],
    ['Kaki Bukit 511 Market', 1.33331001, 103.930687, '511 Bedok North St 3', 42],
    ['Bedok North St 3 Blk 538', 1.33210003, 103.9247208, '538 Bedok North St 3', 42],
    ['85 Fengshan Centre', 1.33205998, 103.9388123, '85 Bedok North St 4', 72],
    ['Bedok Reservoir Blk 630', 1.33298004, 103.9142075, '630 Bedok Reservoir Rd', 36],
    ['Circuit Road Blk 89', 1.32363999, 103.8855209, '89 Circuit Road', 41],
    ['Holland Drive Market', 1.30818999, 103.7928391, '44 Holland Drive', 45],
    ['Toa Payoh Lor 4 Blk 93', 1.33853996, 103.8495712, '93 Lor 4 Toa Payoh', 28],
    ['Kim Keat Palm Market', 1.33528996, 103.8570633, '22 Lor 7 Toa Payoh', 61],
    ['Toa Payoh Lor 8 Blk 210', 1.34033001, 103.8544617, '210 Lor 8 Toa Payoh', 80],
    ['Blk 17 Upper Boon Keng', 1.31508994, 103.8716812, '17 Upper Boon Keng Rd', 84],
    ['Hong Lim Market & Food Centre', 1.28446996, 103.8458633, '531A Upper Cross St', 103],
    ['East Coast Lagoon Food Village', 1.30772996, 103.9343033, '1220 East Coast Pkwy', 63],
    ['Circuit Road Blk 79/79A', 1.32666004, 103.8851166, '79/79A Circuit Road', 106],
    ['Jurong West St 52 Blk 505', 1.34969997, 103.7184601, '505 Jurong West St 52', 60],
    ['North Bridge Road Market', 1.30584705, 103.8638611, '861 North Bridge Rd', 37],
    ['Bukit Merah View Blk 115', 1.28524005, 103.8223724, '115 Bukit Merah View', 84],
    ['Yishun Park Hawker Centre', 1.424911, 103.844992, '51 Yishun Ave 11', 45],
    ['Chong Pang Market & Food Centre', 1.43165803, 103.8280716, '104/105 Yishun Ring Rd', 56],
    ['Teck Ghee Court', 1.36416996, 103.84832, '341 Ang Mo Kio Ave 1', 32],
    ['Chong Boon Market', 1.36829996, 103.8564377, '453A Ang Mo Kio Ave 10', 38],
    ['Blk 724 Ang Mo Kio Market', 1.37204003, 103.8464966, '724 Ang Mo Kio Ave 6', 45],
    ['Clementi Ave 3 Blk 448', 1.31334996, 103.7645874, '448 Clementi Ave 3', 51],
    ['Taman Jurong Market & Food Centre', 1.33468103, 103.7216187, '3 Yung Sheng Road', 123],
    ["People's Park Food Centre", 1.28487098, 103.8425903, '32 New Market Road', 87],
    ['Clementi Ave 2 Blk 353', 1.31433797, 103.7707748, '353 Clementi Ave 2', 18],
    ['Bedok Interchange Hawker Centre', 1.3246290, 103.930477, '208B New Upper Changi Rd', 70],
    ['New Upper Changi Rd Blk 58', 1.32516551, 103.940155, '58 New Upper Changi Rd', 48],
    ['Clementi West St 2 Blk 726', 1.30391705, 103.7641754, '726 Clementi West St 2', 60],
    ['Tanglin Halt / Commonwealth Food Centre', 1.29955006, 103.7980194, '1A/2A/3A Commonwealth Dr', 40],
    ['Eunos Crescent Blk 4A', 1.320292, 103.9042206, '4A Eunos Crescent', 42],
    ['Bukit Panjang Hawker Centre & Market', 1.378269, 103.772432, '2 Bukit Panjang Ring Rd', 28],
    ['Bukit Timah Market', 1.33964503, 103.7758026, '51 Upper Bukit Timah Rd', 84],
    ['Chomp Chomp Food Centre', 1.36422801, 103.8665314, '20 Kensington Park Rd', 36],
    ['Mei Chin Road Market', 1.29330003, 103.8029633, '159 Mei Chin Road', 47],
    ['Pasir Panjang Food Centre', 1.27565897, 103.7915573, '121 Pasir Panjang Rd', 45],
    ['Redhill Market', 1.28790999, 103.8183975, '79 Redhill Lane', 0],
    ['Redhill Food Centre', 1.28740001, 103.8183975, '85 Redhill Lane', 96],
    ['Serangoon Garden Market', 1.36354005, 103.8669815, '49A Serangoon Garden Way', 46],
    ['Shunfu Mart', 1.35181999, 103.8370285, '320 Shunfu Road', 31],
    ['Geylang Bahru Market', 1.32152998, 103.8700714, '69 Geylang Bahru', 84],
    ['Ghim Moh Road Market', 1.31105995, 103.7882919, '20 Ghim Moh Road', 72],
    ['Tanglin Halt Market', 1.30085003, 103.7976837, '48A Tanglin Halt Road', 28],
    ['Kukoh 21 Food Centre', 1.28831995, 103.8399963, '1 Jalan Kukoh', 21],
    ['Yuhua Market & Hawker Centre', 1.34536004, 103.7315826, '347 Jurong East Ave 1', 56],
    ['Yuhua Village Market', 1.34343302, 103.7376862, '254 Jurong East St 24', 60],
    ['Kallang Estate Market & Food Centre', 1.30711246, 103.8841476, '17 Old Airport Road', 16],
    ['Holland Village Market & Food Centre', 1.31110203, 103.7949448, '1 Lorong Mambong', 21],
    ['Hougang 105 Hainanese Village', 1.35408998, 103.890213, '105 Hougang Ave 1', 51],
    ['Kovan Hougang Market', 1.359079, 103.8859253, '209 Hougang St 21', 65],
    ['Jalan Bukit Merah Blk 112', 1.28006995, 103.8260727, '112 Jalan Bukit Merah', 28],
    ['ABC Brickworks Market', 1.28700995, 103.8081894, '6 Jalan Bukit Merah', 96],
    ['Commonwealth Crescent Market', 1.30743206, 103.7994614, '31 Commonwealth Crescent', 39],
    ['Empress Road Market', 1.31631005, 103.805687, '7 Empress Road', 40],
    ['Boon Lay Place Market & Food Village', 1.34528005, 103.7128525, '221A/B Boon Lay Place', 72],
    ['Jurong West Hawker Centre', 1.34122300, 103.697374, '50 Jurong West St 61', 34],
    ['Bukit Merah Central Food Centre', 1.28374004, 103.8171082, '163 Bukit Merah Central', 57],
    ['Pek Kio Market & Food Centre', 1.31620002, 103.8503036, '41A Cambridge Road', 50],
    ['Golden Mile Food Centre', 1.30314175, 103.86387762, '505 Beach Road', 112],
    ['Dunman Food Centre', 1.30941789, 103.90182541, '271 Onan Road', 30],
    ['Beo Crescent Market', 1.28883089, 103.82735389, '38A Beo Crescent', 32],
    ['Adam Road Food Centre', 1.32415985, 103.81416592, '2 Adam Road', 32],
    ['50A Marine Terrace', 1.30572974, 103.91573704, '50A Marine Terrace', 24],
    ['Marine Parade Central Market & Food Centre', 1.30229656, 103.90634383, '84 Marine Parade Central', 55],
    ['Kampung Admiralty Hawker Centre', 1.43974952, 103.80072071, '676 Woodlands Drive 71', 43],
    ['Market Street Hawker Centre', 1.28390006, 103.85000596, '86 Market Street', 53],
    ['Marsiling Lane Blk 20/21', 1.44341624, 103.77700610, '20 Marsiling Lane', 52],
    ['Marsiling Mall Hawker Centre', 1.43354318, 103.77988189, '4 Woodlands Street 12', 70],
    ['Albert Centre', 1.30110202, 103.85411578, '270 Queen Street', 86],
    ['Sims Vista Market & Food Centre', 1.31703502, 103.87930986, '49 Sims Place', 66],
    ['Teban Gardens Market & Food Centre', 1.32083109, 103.74274812, '37A Teban Gardens Road', 28],
    ['Telok Blangah Food Centre', 1.27335599, 103.80761813, '79 Telok Blangah Drive', 40],
    ['Telok Blangah Market', 1.27389077, 103.80790034, '82 Telok Blangah Drive', 0],
    ['Telok Blangah Rise Market', 1.27276129, 103.82236354, '36 Telok Blangah Rise', 24],
    ['Toa Payoh Vista Market', 1.33455075, 103.85200351, '74 Lorong 4 Toa Payoh', 10],
    ['Telok Blangah Crescent Market & Food Centre', 1.27736813, 103.81865152, '11 Telok Blangah Crescent', 56],
    ['Teck Ghee Square', 1.36265411, 103.85528830, '409 Ang Mo Kio Ave 10', 40],
    ['Cheng San Market & Cooked Food Centre', 1.37277209, 103.85445796, '527 Ang Mo Kio Ave 10', 50],
    ['Mayflower Market', 1.37452774, 103.83917606, '160 Ang Mo Kio Ave 4', 40],
    ['Ang Mo Kio 628 Market', 1.38098762, 103.84062809, '628 Ang Mo Kio Ave 4', 52],
    ['Bendemeer Market & Food Centre', 1.31921668, 103.86302092, '29 Bendemeer Road', 88],
    ['Tekka Centre', 1.30618664, 103.85058557, '665 Buffalo Road', 119],
    ['Blk 117 Aljunied Market & Food Centre', 1.32064637, 103.88702414, '117 Aljunied Ave 2', 79],
    ['Alexandra Village Food Centre', 1.28630594, 103.80449264, '120 Bukit Merah Lane 1', 88],
    ['Changi Village Hawker Centre', 1.38915165, 103.98824525, '2 Changi Village Road', 87],
    ['80 Circuit Road Market & Food Centre', 1.32783415, 103.88710267, '80 Circuit Road', 16],
    ['Haig Road Market & Cooked Food Centre', 1.31510752, 103.89558794, '13 Haig Road', 72],
    ['Havelock Road Cooked Food Centre', 1.28797052, 103.82962341, '22A Havelock Road', 30],
    ['Hawker Centre @ Our Tampines Hub', 1.35313360, 103.94040814, '1 Tampines Walk', 42],
    ['Jalan Batu Hawker Centre', 1.30236035, 103.88390947, '4A Jalan Batu', 36],
    ['Whampoa Makan Place', 1.32306494, 103.85499618, '90 Whampoa Drive', 80],
    ['Whampoa Drive Market', 1.32342819, 103.85406020, '91 Whampoa Drive', 52],
    ['Margaret Drive Hawker Centre', 1.29748656, 103.80469380, '38A Margaret Drive', 38],
    ['Anchorvale Village Hawker Centre', 1.39679315, 103.88843734, '339 Anchorvale Road', 36],
    ['Fernvale Hawker Centre & Market', 1.39172209, 103.87703907, '21 Sengkang West Avenue', 28],
    ['One Punggol Hawker Centre', 1.40874765, 103.90516946, '1 Punggol Drive', 34],
    ['Bukit Canberra Hawker Centre', 1.44826336, 103.82276363, '21 Canberra Link', 44],
    ['Punggol Coast Hawker Centre', 1.41451801, 103.90854260, '84 Punggol Way', 40],
    ['Senja Hawker Centre', 1.38719400, 103.76108398, '2 Senja Close', 28],
    ['Buangkok Hawker Centre', 1.38298163, 103.89272101, '70 Compassvale Bow', 38],
    ['Bukit Batok West Hawker Centre', 1.35544583, 103.74207854, '469A Bukit Batok West Avenue 9', 22],
    ['Woodleigh Village Hawker Centre', 1.33979101, 103.87201377, '202C Woodleigh Link', 40],
    ['Bukit Timah Interim Hawker Centre', 1.34078792, 103.77521471, '2A Jalan Seh Chuan', 78],
    ['Amoy Street Food Centre', 1.27923121, 103.84661927, '7 Maxwell Road', 134],
    ['Sembawang Hills Food Centre', 1.37231949, 103.82901815, '590 Upper Thomson Road', 36],
    ['Berseh Food Centre', 1.30734411, 103.85688878, '166 Jalan Besar', 66],
  ];

  // Wider cluster radius + disableClusteringAtZoom keeps the city-wide view
  // to a small, readable number of grouped bubbles instead of 100+ dots on
  // top of each other; individual pins only appear once zoomed in close
  // enough that they're naturally spaced apart.
  const directoryCluster = L.markerClusterGroup({ maxClusterRadius: 70, disableClusteringAtZoom: 16 });
  directoryCentres.forEach(([name, lat, lng, address, stalls]) => {
    const marker = L.marker([lat, lng], { icon: dirIcon });
    const stallLabel = stalls > 0 ? `${stalls} cooked food stalls` : 'Market stalls only';
    marker.bindPopup(`
      <span class="popup-title">${name}</span>
      <span class="popup-meta">${address}<br />${stallLabel} · NEA, data.gov.sg</span>
      <a class="popup-btn" href="stall.html">View stall page →</a>
    `);
    directoryCluster.addLayer(marker);
  });
  map.addLayer(directoryCluster);

  const mapBack = document.getElementById('mapBack');
  const mapTitle = document.getElementById('mapTitle');
  const stallPanel = document.getElementById('stallPanel');

  function resetStallPanel() {
    if (stallPanel) {
      stallPanel.innerHTML = '<p class="map-hint">Click a stall marker to preview its review.</p>';
    }
  }

  function showStallPreview(stall) {
    if (!stallPanel) return;
    const ratingNum = Math.round(stall.rating);
    stallPanel.innerHTML = `
      <p class="tag">${stall.cuisine}</p>
      <h3>${stall.name}</h3>
      <div class="stars small" aria-label="${stall.rating} out of 5 stars">${'★'.repeat(ratingNum)}${'☆'.repeat(5 - ratingNum)}</div>
      <a class="popup-btn" href="stall.html">View full review →</a>
    `;
  }

  let activeStallLayer = null;

  // flyTo() eases both pan and zoom together along a curve that becomes
  // numerically unstable -- a brief violent shake -- whenever the start
  // and end zoom levels are identical (a known Leaflet quirk). That's
  // exactly what happens when hopping between two hawker centres while
  // already zoomed in to STALL_ZOOM, or re-clicking the one you're on.
  // Route those cases through setView/panTo instead, which don't use
  // that curve, and reserve flyTo for moves that actually change zoom.
  function flyToUnlessAlreadyThere(latlng, zoom) {
    const target = L.latLng(latlng);
    const sameZoom = map.getZoom() === zoom;
    const alreadyThere = sameZoom && map.getCenter().distanceTo(target) < 5;
    if (alreadyThere) {
      map.setView(target, zoom, { animate: false });
    } else if (sameZoom) {
      map.panTo(target, { animate: true, duration: 0.6 });
    } else {
      map.flyTo(target, zoom, { duration: 0.9 });
    }
  }

  function openHawkerCentre(hc, focusStallName) {
    flyToUnlessAlreadyThere([hc.lat, hc.lng], STALL_ZOOM);

    if (activeStallLayer) {
      map.removeLayer(activeStallLayer);
      activeStallLayer = null;
    }

    const group = L.layerGroup();
    hc.stalls.forEach((stall) => {
      const stallMarker = L.marker([hc.lat + stall.dlat, hc.lng + stall.dlng], { icon: stallIcon });
      stallMarker.bindTooltip(stall.name, { direction: 'top', offset: [0, -6] });
      stallMarker.on('click', (event) => {
        L.DomEvent.stopPropagation(event);
        showStallPreview(stall);
      });
      group.addLayer(stallMarker);
      if (focusStallName && stall.name === focusStallName) {
        setTimeout(() => stallMarker.openTooltip(), 950);
      }
    });
    group.addTo(map);
    activeStallLayer = group;

    if (mapBack) mapBack.hidden = false;
    if (mapTitle) mapTitle.textContent = hc.name;

    const focusStall = focusStallName && hc.stalls.find((s) => s.name === focusStallName);
    if (focusStall) {
      showStallPreview(focusStall);
    } else {
      resetStallPanel();
    }
  }

  hawkerCentres.forEach((hc) => {
    const marker = L.marker([hc.lat, hc.lng], { icon: hcIcon }).addTo(map);
    marker.bindTooltip(hc.name, { direction: 'top', offset: [0, -16] });
    marker.on('click', () => openHawkerCentre(hc));
  });

  // --- Search box: find a hawker centre or stall by name, fly to it -------
  const searchInput = document.getElementById('mapSearchInput');
  const searchResults = document.getElementById('mapSearchResults');

  function renderSearchResults(query) {
    if (!searchResults) return;
    const q = query.trim().toLowerCase();
    if (!q) {
      searchResults.hidden = true;
      searchResults.innerHTML = '';
      return;
    }

    const matches = [];
    hawkerCentres.forEach((hc) => {
      if (hc.name.toLowerCase().includes(q)) {
        matches.push({ type: 'centre', label: hc.name, sub: 'Featured · has a review', hc });
      }
      hc.stalls.forEach((stall) => {
        if (stall.name.toLowerCase().includes(q)) {
          matches.push({ type: 'stall', label: stall.name, sub: hc.name, hc, stall });
        }
      });
    });
    directoryCentres.forEach(([name, lat, lng, address]) => {
      if (name.toLowerCase().includes(q)) {
        matches.push({ type: 'directory', label: name, sub: address, lat, lng });
      }
    });

    if (!matches.length) {
      searchResults.innerHTML = '<div class="map-search-empty">No matches yet — try a hawker centre or stall name.</div>';
      searchResults.hidden = false;
      return;
    }

    searchResults.innerHTML = matches
      .slice(0, 6)
      .map(
        (m, i) => `<button type="button" class="map-search-item" data-index="${i}">
          <strong>${m.label}</strong><span>${m.sub}</span>
        </button>`
      )
      .join('');
    searchResults.hidden = false;

    Array.from(searchResults.querySelectorAll('.map-search-item')).forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const m = matches[i];
        if (m.type === 'directory') {
          flyToUnlessAlreadyThere([m.lat, m.lng], STALL_ZOOM);
          if (mapBack) mapBack.hidden = false;
          if (mapTitle) mapTitle.textContent = m.label;
        } else {
          openHawkerCentre(m.hc, m.type === 'stall' ? m.stall.name : undefined);
        }
        searchResults.hidden = true;
        if (searchInput) searchInput.value = m.label;
      });
    });
  }

  searchInput?.addEventListener('input', (e) => renderSearchResults(e.target.value));
  searchInput?.addEventListener('focus', (e) => {
    if (e.target.value) renderSearchResults(e.target.value);
  });
  document.addEventListener('click', (e) => {
    if (searchResults && !searchResults.contains(e.target) && e.target !== searchInput) {
      searchResults.hidden = true;
    }
  });

  function resetMap() {
    flyToUnlessAlreadyThere(SG_CENTER, SG_ZOOM);
    if (activeStallLayer) {
      map.removeLayer(activeStallLayer);
      activeStallLayer = null;
    }
    if (mapBack) mapBack.hidden = true;
    if (mapTitle) mapTitle.textContent = 'Tap a hawker centre to see its stalls.';
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.hidden = true;
    resetStallPanel();
  }

  mapBack?.addEventListener('click', resetMap);
}

// --- Language toggle (EN / 中文) --------------------------------------
// A simple dictionary-driven swap over elements tagged with data-i18n.
// Covers site chrome (nav, hero, section headings, buttons, map UI,
// footer) so non-English-speaking users can navigate and understand the
// core flows; long-form editorial review text stays English-only for now.
const I18N = {
  navBrowse: { en: 'Browse', zh: '浏览' },
  navReviews: { en: 'Reviews', zh: '评价' },
  navProcess: { en: 'How we review', zh: '评测方式' },
  navAbout: { en: 'About', zh: '关于我们' },
  mapTag: { en: 'Explore the island', zh: '探索全岛' },
  mapTitleDefault: { en: 'Tap a hawker centre to see its stalls.', zh: '点击小贩中心查看摊位。' },
  legendReviewed: { en: 'Reviewed by our team', zh: '我们团队已评测' },
  legendDirectory: { en: 'Full NEA directory (124 centres)', zh: '全国环境局完整名录（124 个中心）' },
  mapBack: { en: '← Back to Singapore', zh: '← 返回新加坡全岛' },
  mapSearchPlaceholder: { en: 'Search a hawker centre or stall…', zh: '搜索小贩中心或摊位…' },
  mapHint: { en: 'Click a stall marker to preview its review.', zh: '点击摊位标记查看评价预览。' },
  mapCredit: { en: 'Hawker centre locations: NEA, data.gov.sg (Open Data Licence). Map data © OneMap, SLA. Centres still under construction aren’t plotted yet.', zh: '小贩中心位置数据来源：国家环境局 NEA, data.gov.sg（开放数据许可）。地图数据 © OneMap, SLA。仍在施工中的中心尚未标出。' },
  heroTicket: { en: 'QUEUE No. 001', zh: '排队号 001' },
  heroTitle: { en: 'Singapore,<br />one stall at a time.', zh: '新加坡，<br />一个摊位一个故事。' },
  heroText: { en: "We queue, we taste, we film — then we tell you straight whether it's worth the walk. Hawker stalls, food courts, and kopitiams, reviewed by our team and rated by yours.", zh: '我们排队、试吃、拍摄——然后直接告诉你值不值得跑一趟。小贩摊位、美食广场与咖啡店，由我们团队评测，也欢迎你来评分。' },
  heroBtnReviews: { en: 'See the latest tastings', zh: '查看最新试吃' },
  heroBtnBrowse: { en: 'Browse by neighbourhood', zh: '按地区浏览' },
  browseHeading: { en: 'Find your next<br />makan.', zh: '找到你的<br />下一餐。' },
  browseText: { en: "Filter by what you're actually deciding between — where you are, what you're craving, or who you're eating with.", zh: '按你真正在意的条件筛选——所在地区、想吃什么，或和谁一起吃。' },
  chipAll: { en: 'All', zh: '全部' },
  chipHawker: { en: 'Hawker', zh: '小贩中心' },
  chipKopitiam: { en: 'Kopitiam', zh: '咖啡店' },
  chipCafe: { en: 'Cafe', zh: '咖啡馆' },
  tickerHawker: { en: 'HAWKER STALLS', zh: '小贩摊位' },
  tickerKopitiam: { en: 'KOPITIAM', zh: '咖啡店' },
  tickerFoodCourts: { en: 'FOOD COURTS', zh: '美食广场' },
  tickerCafes: { en: 'CAFES', zh: '咖啡馆' },
  tickerHalal: { en: 'HALAL', zh: '清真' },
  tickerLateNight: { en: 'LATE NIGHT', zh: '深夜营业' },
  tickerCheapEats: { en: 'CHEAP EATS', zh: '平价美食' },
  chipCheapEats: { en: 'Cheap eats', zh: '平价美食' },
  chipHalal: { en: 'Halal', zh: '清真' },
  chipLateNight: { en: 'Late night', zh: '深夜营业' },
  chipSoloLunch: { en: 'Solo lunch', zh: '单人午餐' },
  chipBigGroup: { en: 'Big group', zh: '多人聚餐' },
  filterEmpty: { en: "No reviews match that filter yet — check back soon.", zh: '暂无符合该分类的评价，请稍后再看。' },
  reviewsHeading: { en: 'Latest<br />tastings.', zh: '最新<br />试吃。' },
  reviewsText: { en: 'Filmed and reviewed by the Makan Trail team this month.', zh: '本月由 Makan Trail 团队拍摄评测。' },
  loadMore: { en: 'Load more reviews', zh: '加载更多评价' },
  processHeading: { en: 'How we<br />review.', zh: '我们的<br />评测方式。' },
  processText: { en: 'Every stall on Makan Trail goes through the same three steps before it’s published.', zh: '每个摊位在发布前都会经过相同的三个步骤。' },
  processStep1Title: { en: 'We queue and taste', zh: '排队试吃' },
  processStep1Text: { en: 'Same as any other customer — full price, no heads-up to the stall, no free samples.', zh: '和普通顾客一样——全额付费，不事先通知摊主，不接受免费试吃。' },
  processStep2Title: { en: 'We film and photograph', zh: '拍摄记录' },
  processStep2Text: { en: 'Every dish is shot on site. Video for the ones worth watching someone cook.', zh: '每道菜都在现场拍摄，值得一看的烹饪过程会录成视频。' },
  processStep3Title: { en: 'We publish it straight', zh: '如实发布' },
  processStep3Text: { en: 'The good, the average, and the "don\'t bother" — all get a review, not just the wins.', zh: '好的、普通的、不推荐的——都会写评价，不只报道好的一面。' },
  communityHeading: { en: 'What readers<br />are saying.', zh: '读者<br />怎么说。' },
  communityText: { en: "Signed-in reviews from people who've eaten there too.", zh: '来自其他到访过的读者的评价。' },
  reviewCtaTitle: { en: 'Tried a stall on here?', zh: '吃过这里的摊位吗？' },
  reviewCtaText: { en: 'Read reader reviews and leave your own rating →', zh: '查看读者评价，也可以留下你的评分 →' },
  footerPrivacy: { en: 'Privacy Policy', zh: '隐私政策' },
  footerContact: { en: 'Contact', zh: '联系我们' },
  footerNote: { en: '© 2026 Makan Trail. Draft concept — placeholder content and images.', zh: '© 2026 Makan Trail。草稿概念——内容与图片均为占位。' },
};

const LANG_KEY = 'makanTrailLang';

function applyLanguage(lang) {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const entry = I18N[el.dataset.i18n];
    if (!entry) return;
    el.innerHTML = entry[lang] || entry.en;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const entry = I18N[el.dataset.i18nPlaceholder];
    if (!entry) return;
    el.placeholder = entry[lang] || entry.en;
  });
  document.documentElement.lang = lang === 'zh' ? 'zh-SG' : 'en';
  document.querySelectorAll('.lang-toggle').forEach((btn) => {
    btn.textContent = lang === 'zh' ? 'EN' : '中文';
    btn.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : 'Switch to Chinese');
  });
  localStorage.setItem(LANG_KEY, lang);
  window.__makanTrailLang = lang;
}

const savedLang = localStorage.getItem(LANG_KEY) === 'zh' ? 'zh' : 'en';
applyLanguage(savedLang);

document.querySelectorAll('.lang-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    applyLanguage(window.__makanTrailLang === 'zh' ? 'en' : 'zh');
  });
});

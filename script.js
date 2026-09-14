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
  nav.style.display = open ? 'flex' : '';
  nav.style.position = open ? 'absolute' : '';
  nav.style.top = open ? '76px' : '';
  nav.style.right = open ? '17px' : '';
  nav.style.background = open ? '#F5F1E4' : '';
  nav.style.border = open ? '1px solid #D8D0BC' : '';
  nav.style.padding = open ? '18px' : '';
  nav.style.flexDirection = open ? 'column' : '';
  nav.style.alignItems = open ? 'flex-start' : '';
  nav.style.gap = open ? '16px' : '';
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
// Stall-level points are still placeholder/editorial — no public dataset
// exists at the individual-stall level, so each stall is offset a small,
// realistic distance (tens of metres) from its hawker centre's real GPS
// point, purely to demonstrate the drill-down interaction.
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
        { name: "Ah Heng's Wanton Mee", cuisine: 'Noodles', rating: 4.5, dlat: 0.00035, dlng: -0.00030 },
        { name: 'Zhen Zhen Porridge', cuisine: 'Porridge', rating: 4.2, dlat: -0.00020, dlng: 0.00025 },
        { name: 'Outram Park Fried Kway Teow', cuisine: 'Fried Kway Teow', rating: 4.6, dlat: 0.00020, dlng: 0.00040 },
      ],
    },
    {
      id: 'tiongbahru', name: 'Tiong Bahru Market', lat: 1.28468299, lng: 103.832428,
      address: '30 Seng Poh Road, Singapore 168898', stallCount: 83,
      stalls: [
        { name: 'Jian Bo Shui Kueh', cuisine: 'Teochew', rating: 4.4, dlat: 0.00025, dlng: -0.00020 },
        { name: 'Tiong Bahru Fried Hokkien Mee', cuisine: 'Hokkien Mee', rating: 4.3, dlat: -0.00030, dlng: 0.00015 },
        { name: 'Lor Mee Corner', cuisine: 'Lor Mee', rating: 4.1, dlat: 0.00010, dlng: 0.00035 },
      ],
    },
    {
      id: 'maxwell', name: 'Maxwell Food Centre', lat: 1.28055096, lng: 103.8444595,
      address: '1 Kadayanallur Street, Singapore 069184', stallCount: 103,
      stalls: [
        { name: 'Tian Tian Hainanese Chicken Rice', cuisine: 'Chicken Rice', rating: 4.5, dlat: 0.00020, dlng: -0.00025 },
        { name: 'Maxwell Fuzhou Oyster Cake', cuisine: 'Snacks', rating: 4.0, dlat: -0.00025, dlng: 0.00020 },
        { name: 'Zhong Guo La Mian Xiao Long Bao', cuisine: 'Noodles', rating: 4.3, dlat: 0.00030, dlng: 0.00030 },
      ],
    },
    {
      id: 'geylang', name: 'Geylang Serai Market', lat: 1.31688809, lng: 103.8974075,
      address: '1 Geylang Serai, Singapore 402001', stallCount: 63,
      stalls: [
        { name: 'Frog Leg Bee Hoon', cuisine: 'Bee Hoon', rating: 4.8, dlat: 0.00030, dlng: -0.00020 },
        { name: 'Geylang Serai Nasi Padang', cuisine: 'Malay', rating: 4.4, dlat: -0.00020, dlng: 0.00030 },
        { name: 'Haig Road Putu Piring', cuisine: 'Dessert', rating: 4.2, dlat: 0.00015, dlng: 0.00035 },
      ],
    },
    {
      id: 'oldairport', name: '51 Old Airport Road Food Centre', lat: 1.30827999, lng: 103.8858414,
      address: 'Blk 51, Old Airport Road, Singapore 390051', stallCount: 168,
      stalls: [
        { name: 'Xing Ji Rou Cuo Mian', cuisine: 'Mee Pok', rating: 4.6, dlat: 0.00025, dlng: -0.00030 },
        { name: 'Nam Sing Hokkien Fried Mee', cuisine: 'Hokkien Mee', rating: 4.7, dlat: -0.00020, dlng: 0.00025 },
        { name: 'Fruit Rojak Corner', cuisine: 'Snacks', rating: 4.1, dlat: 0.00030, dlng: 0.00020 },
      ],
    },
    {
      id: 'newton', name: 'Newton Food Centre', lat: 1.3122250, lng: 103.8397293,
      address: '500 Clemenceau Avenue North, Singapore 229495', stallCount: 83,
      stalls: [
        { name: 'Newton Circus BBQ Seafood', cuisine: 'Seafood', rating: 4.3, dlat: 0.00025, dlng: -0.00025 },
        { name: 'Alliance Satay', cuisine: 'Satay', rating: 4.5, dlat: -0.00030, dlng: 0.00015 },
        { name: 'Hup Kee Fried Oyster Omelette', cuisine: 'Local', rating: 4.2, dlat: 0.00015, dlng: 0.00030 },
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

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);
  map.attributionControl.setPrefix(false);

  const hcIcon = L.divIcon({ className: '', html: '<div class="hc-pin"></div>', iconSize: [18, 18] });
  const stallIcon = L.divIcon({ className: '', html: '<div class="stall-pin"></div>', iconSize: [10, 10] });
  const dirIcon = L.divIcon({ className: '', html: '<div class="dir-pin"></div>', iconSize: [12, 12] });

  // Full hawker centre directory (name, lat, lng, short address, food stall
  // count) sourced from NEA's official dataset. These are shown as a
  // clustered layer -- nearby points group into a single number bubble that
  // "explodes" into individual pins on zoom, so 70+ locations stay readable
  // instead of turning into a wall of pins. A handful of the newest hawker
  // centres (opened after this dataset's last snapshot) aren't included yet
  // since no official coordinate exists for them -- see the note in chat.
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
  ];

  const directoryCluster = L.markerClusterGroup({ maxClusterRadius: 50 });
  directoryCentres.forEach(([name, lat, lng, address, stalls]) => {
    const marker = L.marker([lat, lng], { icon: dirIcon });
    const stallLabel = stalls > 0 ? `${stalls} cooked food stalls` : 'Market stalls only';
    marker.bindPopup(`<span class="popup-title">${name}</span><span class="popup-meta">${address}<br />${stallLabel} · NEA, data.gov.sg</span>`);
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
    `;
  }

  let activeStallLayer = null;

  function openHawkerCentre(hc, focusStallName) {
    map.flyTo([hc.lat, hc.lng], STALL_ZOOM, { duration: 0.9 });

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
    marker.bindPopup(`
      <span class="popup-title">${hc.name}</span>
      <span class="popup-meta">${hc.address}<br />${hc.stallCount} cooked food stalls · NEA, data.gov.sg</span>
    `);
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
          map.flyTo([m.lat, m.lng], STALL_ZOOM, { duration: 0.9 });
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
    map.flyTo(SG_CENTER, SG_ZOOM, { duration: 0.9 });
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

// --- Sign-in + review submission (demo/session-only) ----------------------
// TODO(dev team): this simulates login and review storage entirely in the
// browser so the full UX flow is demonstrable. Nothing here is persisted or
// sent anywhere. Once a real backend is chosen (e.g. Firebase, Supabase),
// replace `mockSignIn` with real Google/Facebook OAuth, and replace
// `submitReview` with an actual API call that saves to a database.
const writeReviewBtn = document.getElementById('writeReviewBtn');
const headerSignIn = document.getElementById('headerSignIn');
const authPanel = document.getElementById('authPanel');
const authNameInput = document.getElementById('authNameInput');
const authContinueBtn = document.getElementById('authContinueBtn');
const reviewForm = document.getElementById('reviewForm');
const reviewingAsNote = document.getElementById('reviewingAsNote');
const starPicker = document.getElementById('starPicker');
const reviewText = document.getElementById('reviewText');
const reviewPhotoInput = document.getElementById('reviewPhotoInput');
const userReviewsList = document.getElementById('userReviewsList');

let currentUserName = null;
let selectedRating = 0;

function openAuthOrReviewFlow() {
  if (currentUserName) {
    reviewForm.hidden = false;
    authPanel.hidden = true;
    reviewForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    authPanel.hidden = false;
    reviewForm.hidden = true;
    authPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    authNameInput?.focus();
  }
}

writeReviewBtn?.addEventListener('click', openAuthOrReviewFlow);
headerSignIn?.addEventListener('click', (event) => {
  event.preventDefault();
  if (authPanel) openAuthOrReviewFlow();
});

authContinueBtn?.addEventListener('click', () => {
  const name = (authNameInput?.value || '').trim();
  if (!name) {
    authNameInput?.focus();
    return;
  }
  currentUserName = name;
  authPanel.hidden = true;
  reviewForm.hidden = false;
  if (reviewingAsNote) reviewingAsNote.textContent = `Posting as ${currentUserName} (demo session).`;
  if (headerSignIn) headerSignIn.textContent = currentUserName;
  reviewForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Star picker: click a star to select 1-5, filling all stars up to it.
starPicker?.querySelectorAll('button').forEach((starBtn) => {
  starBtn.addEventListener('click', () => {
    selectedRating = parseInt(starBtn.dataset.value, 10);
    starPicker.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('star-filled', parseInt(b.dataset.value, 10) <= selectedRating);
    });
  });
});

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

reviewForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!selectedRating) {
    alert('Please select a star rating before posting.');
    return;
  }
  const text = reviewText.value.trim();
  if (!text) {
    reviewText.focus();
    return;
  }

  const card = document.createElement('div');
  card.className = 'user-review';
  const ratingStars = '★'.repeat(selectedRating) + '☆'.repeat(5 - selectedRating);

  let photoHtml = '';
  const file = reviewPhotoInput?.files?.[0];
  if (file) {
    const url = URL.createObjectURL(file);
    photoHtml = `<div class="user-review-photo" style="background-image:url('${url}');background-size:cover;background-position:center"></div>`;
  }

  card.innerHTML = `
    <span class="avatar">${initials(currentUserName)}</span>
    <div>
      <strong>${currentUserName}</strong>
      <div class="stars small" aria-label="${selectedRating} out of 5 stars">${ratingStars}</div>
      <p>${text}</p>
      ${photoHtml}
    </div>
  `;
  userReviewsList?.prepend(card);

  reviewText.value = '';
  reviewPhotoInput.value = '';
  selectedRating = 0;
  starPicker.querySelectorAll('button').forEach((b) => b.classList.remove('star-filled'));
  reviewForm.hidden = true;
});

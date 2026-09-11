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

  const map = L.map(mapEl, { scrollWheelZoom: true }).setView(SG_CENTER, SG_ZOOM);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);
  map.attributionControl.setPrefix(false);

  const hcIcon = L.divIcon({ className: '', html: '<div class="hc-pin"></div>', iconSize: [18, 18] });
  const stallIcon = L.divIcon({ className: '', html: '<div class="stall-pin"></div>', iconSize: [10, 10] });

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
        matches.push({ type: 'centre', label: hc.name, sub: 'Hawker centre', hc });
      }
      hc.stalls.forEach((stall) => {
        if (stall.name.toLowerCase().includes(q)) {
          matches.push({ type: 'stall', label: stall.name, sub: hc.name, hc, stall });
        }
      });
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
        openHawkerCentre(m.hc, m.type === 'stall' ? m.stall.name : undefined);
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

// --- Login-gated review button -------------------------------------------
// TODO(dev team): replace this placeholder with real auth (e.g. Google/
// Facebook OAuth) once the backend is in place. For now it just reveals a
// note explaining why sign-in is required, so the flow is demonstrable.
const writeReviewBtn = document.getElementById('writeReviewBtn');
const loginNote = document.getElementById('loginNote');
const headerSignIn = document.getElementById('headerSignIn');

writeReviewBtn?.addEventListener('click', () => {
  if (loginNote) loginNote.hidden = !loginNote.hidden;
});

headerSignIn?.addEventListener('click', (event) => {
  event.preventDefault();
  if (loginNote) {
    loginNote.hidden = false;
    loginNote.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

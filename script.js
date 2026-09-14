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

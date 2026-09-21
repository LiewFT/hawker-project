// --- Category filter chips + load more -----------------------------------
const chips = Array.from(document.querySelectorAll('.chip'));
const reviewGrid = document.getElementById('reviewGrid');
const filterEmpty = document.getElementById('filterEmpty');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const filterStatus = document.getElementById('filterStatus');

function applyFilter(filterValue) {
  if (!reviewGrid) return;
  const cards = Array.from(reviewGrid.querySelectorAll('.review-card'));
  let visibleCount = 0;

  cards.forEach((card) => {
    const categories = (card.dataset.categories || '').split(' ');
    const isLoadMoreItem = card.classList.contains('load-more-item');

    if (filterValue === 'all') {
      // Reset to the default state: first 3 shown, "load more" cards hidden again.
      card.hidden = isLoadMoreItem;
    } else {
      card.hidden = !categories.includes(filterValue);
    }
    if (!card.hidden) visibleCount++;
  });

  const anyVisible = visibleCount > 0;
  if (filterEmpty) filterEmpty.hidden = anyVisible;
  if (loadMoreBtn) loadMoreBtn.style.display = filterValue === 'all' ? '' : 'none';
  if (filterStatus) {
    const isZh = window.__makanTrailLang === 'zh';
    filterStatus.textContent = anyVisible
      ? (isZh ? `显示 ${visibleCount} 条评价。` : `Showing ${visibleCount} review${visibleCount === 1 ? '' : 's'}.`)
      : (isZh ? '暂无符合该分类的评价。' : 'No reviews match that filter yet.');
  }
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

// Featured hawker centres + their demo stalls, kept at top level (not inside
// the map-only block below) so stall.html can also look up a stall's real
// name/cuisine/rating/photo by id, without needing the map itself to load.
const hawkerCentres = [
    {
      id: 'chinatown', name: 'Chinatown Complex', lat: 1.2823, lng: 103.8428802,
      address: '335 Smith Street, Singapore 050335', stallCount: 226,
      stalls: [
        { name: 'Golden Ladle Wanton Mee', cuisine: 'Noodles', dlat: 0.00035, dlng: -0.00030, photo: 'images/stalls/wanton-mee.svg' },
        { name: 'Silver Bowl Porridge', cuisine: 'Porridge', dlat: -0.00020, dlng: 0.00025 },
        { name: 'Riverside Fried Kway Teow', cuisine: 'Fried Kway Teow', dlat: 0.00020, dlng: 0.00040, photo: 'images/stalls/char-kway-teow.svg' },
      ],
    },
    {
      id: 'tiongbahru', name: 'Tiong Bahru Market', lat: 1.28468299, lng: 103.832428,
      address: '30 Seng Poh Road, Singapore 168898', stallCount: 83,
      stalls: [
        { name: 'Teochew Corner Shui Kueh', cuisine: 'Teochew', dlat: 0.00025, dlng: -0.00020 },
        { name: 'Market Wok Hokkien Mee', cuisine: 'Hokkien Mee', dlat: -0.00030, dlng: 0.00015 },
        { name: 'Lor Mee Corner', cuisine: 'Lor Mee', dlat: 0.00010, dlng: 0.00035 },
      ],
    },
    {
      id: 'maxwell', name: 'Maxwell Food Centre', lat: 1.28055096, lng: 103.8444595,
      address: '1 Kadayanallur Street, Singapore 069184', stallCount: 103,
      stalls: [
        { name: 'Sunny Isle Chicken Rice', cuisine: 'Chicken Rice', dlat: 0.00020, dlng: -0.00025, photo: 'images/stalls/chicken-rice.svg' },
        { name: 'Harbour Fuzhou Oyster Cake', cuisine: 'Snacks', dlat: -0.00025, dlng: 0.00020 },
        { name: 'Northern Style La Mian & Xiao Long Bao', cuisine: 'Noodles', dlat: 0.00030, dlng: 0.00030 },
      ],
    },
    {
      id: 'geylang', name: 'Geylang Serai Market', lat: 1.31688809, lng: 103.8974075,
      address: '1 Geylang Serai, Singapore 402001', stallCount: 63,
      stalls: [
        { name: "Uncle Kok's Frog Leg Bee Hoon", cuisine: 'Bee Hoon', dlat: 0.00030, dlng: -0.00020, photo: 'images/stalls/frog-leg-claypot.svg' },
        { name: 'Kampung Flavours Nasi Padang', cuisine: 'Malay', dlat: -0.00020, dlng: 0.00030 },
        { name: 'Sweet Steam Putu Piring', cuisine: 'Dessert', dlat: 0.00015, dlng: 0.00035 },
      ],
    },
    {
      id: 'oldairport', name: '51 Old Airport Road Food Centre', lat: 1.30827999, lng: 103.8858414,
      address: 'Blk 51, Old Airport Road, Singapore 390051', stallCount: 168,
      stalls: [
        { name: 'Golden Wok Rou Cuo Mian', cuisine: 'Mee Pok', dlat: 0.00025, dlng: -0.00030 },
        { name: 'Harbourfront Hokkien Fried Mee', cuisine: 'Hokkien Mee', dlat: -0.00020, dlng: 0.00025 },
        { name: 'Fruit Rojak Corner', cuisine: 'Snacks', dlat: 0.00030, dlng: 0.00020 },
      ],
    },
    {
      id: 'newton', name: 'Newton Food Centre', lat: 1.3122250, lng: 103.8397293,
      address: '500 Clemenceau Avenue North, Singapore 229495', stallCount: 83,
      stalls: [
        { name: 'Circus Lights BBQ Seafood', cuisine: 'Seafood', dlat: 0.00025, dlng: -0.00025 },
        { name: 'Charcoal Trail Satay', cuisine: 'Satay', dlat: -0.00030, dlng: 0.00015, photo: 'images/stalls/satay.svg' },
        { name: 'Golden Pan Fried Oyster Omelette', cuisine: 'Local', dlat: 0.00015, dlng: 0.00030 },
      ],
    },
];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function findStallBySlug(hcId, stallSlug) {
  const hc = hawkerCentres.find((h) => h.id === hcId);
  const stall = hc?.stalls.find((s) => slugify(s.name) === stallSlug);
  return hc && stall ? { hc, stall } : null;
}

// stall.html only: reads ?hc=<id>&stall=<slug> from the URL and, if it
// matches a real stall, overwrites the page's generic Golden Ladle demo
// content with that stall's real name/cuisine/rating/photo. With no match
// (including a plain visit to stall.html with no query string, e.g. from a
// directory-only hawker centre with no stall-level data), the static demo
// content already in the HTML is left untouched.
function renderStallDetail() {
  const heroEl = document.querySelector('.stall-hero');
  if (!heroEl) return;

  const params = new URLSearchParams(location.search);
  const match = findStallBySlug(params.get('hc'), params.get('stall'));
  if (!match) return;
  const { hc, stall } = match;
  const isZh = window.__makanTrailLang === 'zh';

  document.title = `${stall.name} — ${hc.name}｜Makan Trail`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = `${stall.name} reviewed by Makan Trail — taste tested by our team.`;

  const breadcrumbName = document.getElementById('stallBreadcrumbName');
  if (breadcrumbName) breadcrumbName.textContent = stall.name;

  const tagEl = document.getElementById('stallTagLine');
  if (tagEl) {
    tagEl.removeAttribute('data-i18n');
    tagEl.textContent = isZh ? `${hc.name} · 小贩中心 · ${stall.cuisine}` : `${hc.name} · Hawker · ${stall.cuisine}`;
  }

  const venueLink = document.getElementById('stallVenueLink');
  if (venueLink) {
    venueLink.href = 'venue.html?v=' + encodeURIComponent(hc.id);
    venueLink.hidden = false;
  }

  const nameEl = document.getElementById('stallNameHeading');
  if (nameEl) nameEl.textContent = stall.name;

  const addressEl = document.getElementById('stallAddressDynamic');
  if (addressEl) {
    addressEl.removeAttribute('data-i18n');
    addressEl.textContent = `📍 ${hc.address}`;
  }

  const cuisineValueEl = document.getElementById('stallCuisineValueDynamic');
  if (cuisineValueEl) {
    cuisineValueEl.removeAttribute('data-i18n');
    cuisineValueEl.textContent = isZh ? `本地 · ${stall.cuisine}` : `Local · ${stall.cuisine}`;
  }

  if (stall.photo) {
    const galleryMain = document.getElementById('stallGalleryMain');
    if (galleryMain) {
      galleryMain.style.background = `url('${stall.photo}') center/cover`;
      galleryMain.classList.remove('photo-a');
      galleryMain.setAttribute('role', 'img');
      galleryMain.setAttribute('aria-label', `${stall.name} (dish illustration)`);
      // Honest label: this is an illustration of the dish, not a photo of the stall.
      galleryMain.querySelector('.illustration-caption')?.remove();
      const caption = document.createElement('span');
      caption.className = 'video-badge illustration-caption';
      caption.textContent = isZh ? '菜式插图' : 'Dish illustration';
      galleryMain.appendChild(caption);
    }
  }
}

if (mapEl && window.L) {
  const SG_CENTER = [1.3226, 103.8636];
  const SG_ZOOM = 12;
  const STALL_ZOOM = 18;

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

  // Every NEA hawker centre comes from data/venues.json -- the same file the
  // venue pages read -- fetched at load. The featured centres in hawkerCentres
  // are drawn separately as red pins, so they are skipped in this layer.
  let directoryVenues = [];

  // Wider cluster radius + disableClusteringAtZoom keeps the city-wide view
  // to a small, readable number of grouped bubbles instead of 100+ dots on
  // top of each other; individual pins only appear once zoomed in close
  // enough that they're naturally spaced apart.
  const directoryCluster = L.markerClusterGroup({ maxClusterRadius: 70, disableClusteringAtZoom: 16 });
  map.addLayer(directoryCluster);

  function esc(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Built when the popup opens, so it follows the current language.
  function venuePopupHtml(v) {
    const stalls = v.stall_count_nea > 0 ? t('cookedStalls', { n: v.stall_count_nea }) : t('marketStallsOnly');
    const status = v.status === 'open' ? '' : `<br />${esc(t('status_' + v.status))}`;
    return `
      <span class="popup-title">${esc(v.name)}</span>
      <span class="popup-meta">${esc(v.address)}<br />${esc(stalls)}${status}<br />${esc(t('checked', { date: formatVenueDate(v.verified) }))}</span>
      <a class="popup-btn" href="venue.html?v=${encodeURIComponent(v.slug)}">${esc(t('viewVenue'))}</a>
    `;
  }

  fetch('data/venues.json')
    .then((res) => { if (!res.ok) throw new Error('venues.json ' + res.status); return res.json(); })
    .then((venues) => {
      const featuredIds = new Set(hawkerCentres.map((h) => h.id));
      directoryVenues = venues.filter((v) => !featuredIds.has(v.slug));
      venueTotal = venues.length;
      venueUnderConstruction = venues.filter((v) => v.status === 'under_construction').length;
      directoryVenues.forEach((v) => {
        const marker = L.marker([v.lat, v.lng], { icon: dirIcon });
        marker.bindPopup(() => venuePopupHtml(v));
        directoryCluster.addLayer(marker);
      });
      renderLegendCount();
    })
    .catch((err) => console.error('Could not load data/venues.json', err));

  const mapBack = document.getElementById('mapBack');
  const mapTitle = document.getElementById('mapTitle');
  const stallPanel = document.getElementById('stallPanel');

  function resetStallPanel(hc) {
    if (!stallPanel) return;
    const venueLink = hc ? `<a class="popup-btn popup-btn-quiet" href="venue.html?v=${encodeURIComponent(hc.id)}">${t('viewVenue')}</a>` : '';
    stallPanel.innerHTML = `<p class="map-hint">${t('mapHint')}</p>${venueLink}`;
  }

  function showStallPreview(hc, stall) {
    if (!stallPanel) return;
    const photoHtml = stall.photo
      ? `<img class="stall-panel-photo" src="${stall.photo}" alt="${stall.name} (dish illustration)" />`
      : '';
    const detailUrl = `stall.html?hc=${encodeURIComponent(hc.id)}&stall=${encodeURIComponent(slugify(stall.name))}`;
    stallPanel.innerHTML = `
      ${photoHtml}
      <p class="tag">${stall.cuisine} <span class="badge badge-muted">${t('demoBadge')}</span></p>
      <h3>${stall.name}</h3>
      <div class="panel-actions">
        <a class="popup-btn" href="${detailUrl}">${t('viewStall')}</a>
        <a class="popup-btn popup-btn-quiet" href="venue.html?v=${encodeURIComponent(hc.id)}">${t('viewVenue')}</a>
      </div>
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
        showStallPreview(hc, stall);
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
      showStallPreview(hc, focusStall);
    } else {
      resetStallPanel(hc);
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
        matches.push({ type: 'centre', label: hc.name, sub: t('demoStalls'), hc });
      }
      hc.stalls.forEach((stall) => {
        if (stall.name.toLowerCase().includes(q)) {
          matches.push({ type: 'stall', label: stall.name, sub: hc.name, hc, stall });
        }
      });
    });
    directoryVenues.forEach((v) => {
      if (v.name.toLowerCase().includes(q)) {
        matches.push({ type: 'directory', label: v.name, sub: v.address, lat: v.lat, lng: v.lng });
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

  let searchDebounce = null;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    const value = e.target.value;
    searchDebounce = setTimeout(() => renderSearchResults(value), 150);
  });
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
  checked: {"en":"Checked {date}","zh":"查证于 {date}"},
  staleChecked: {"en":"Last checked {date} — may be out of date","zh":"上次查证于 {date} — 可能已过时"},
  cookedStalls: {"en":"{n} cooked food stalls (NEA)","zh":"{n} 个熟食摊位（NEA）"},
  marketStallsOnly: {"en":"Market stalls only","zh":"仅有巴刹摊位"},
  typeHawker: {"en":"Hawker centre","zh":"小贩中心"},
  status_open: {"en":"Open","zh":"营业中"},
  status_under_construction: {"en":"Under construction","zh":"施工中"},
  status_closed: {"en":"Closed","zh":"已关闭"},
  status_unknown: {"en":"Unknown","zh":"未知"},
  day_mon: {"en":"Mon","zh":"周一"},
  day_tue: {"en":"Tue","zh":"周二"},
  day_wed: {"en":"Wed","zh":"周三"},
  day_thu: {"en":"Thu","zh":"周四"},
  day_fri: {"en":"Fri","zh":"周五"},
  day_sat: {"en":"Sat","zh":"周六"},
  day_sun: {"en":"Sun","zh":"周日"},
  pick: {"en":"Pick","zh":"精选"},
  payment: {"en":"Payment","zh":"付款方式"},
  stallClosedNoName: {"en":"Closed stall","zh":"已关闭的摊位"},
  stallUnknown: {"en":"Unit status unknown","zh":"摊位状态未知"},
  venueNotFound: {"en":"Venue not found","zh":"找不到该场所"},
  backToMap: {"en":"← Back to the map","zh":"← 返回地图"},
  breadcrumbHome: {"en":"Home","zh":"首页"},
  staleWarning: {"en":"This record has not been re-checked recently.","zh":"此记录近期未重新查证。"},
  venueMapLabel: {"en":"Map showing {name}","zh":"显示 {name} 位置的地图"},
  atAGlance: {"en":"At a glance","zh":"一览"},
  address: {"en":"Address","zh":"地址"},
  postal: {"en":"Postal code","zh":"邮区编号"},
  nearestMrt: {"en":"Nearest MRT","zh":"最近地铁站"},
  nea: {"en":"Stalls (NEA)","zh":"摊位数（NEA）"},
  statusLabel: {"en":"Status","zh":"状态"},
  openInGoogleMaps: {"en":"Open in Google Maps ↗","zh":"在 Google 地图中打开 ↗"},
  share: {"en":"Share","zh":"分享"},
  linkCopied: {"en":"Link copied ✓","zh":"链接已复制 ✓"},
  stallsHeading: {"en":"Stalls","zh":"摊位"},
  coverageLine: {"en":"{n} of ~{total} stalls logged","zh":"已记录约 {total} 个摊位中的 {n} 个"},
  coverageLineNoTotal: {"en":"{n} stalls logged","zh":"已记录 {n} 个摊位"},
  missingNotAbsent: {"en":"A missing stall does not mean it isn't there.","zh":"未列出的摊位并不代表不存在。"},
  belowCoverage: {"en":"Too few stalls have been logged to show a useful list yet.","zh":"目前记录的摊位太少，暂不显示列表。"},
  noStallsYet: {"en":"No stalls have been checked in person here yet.","zh":"这里尚未有经实地查证的摊位。"},
  viewVenue: {"en":"View venue page →","zh":"查看场所页面 →"},
  venueMapCredit: {"en":"Hawker centre locations: NEA, data.gov.sg (Open Data Licence). Map data © OneMap, SLA.","zh":"小贩中心位置数据来源：国家环境局 NEA, data.gov.sg（开放数据许可）。地图数据 © OneMap, SLA。"},
  cat_halal: {"en":"Halal","zh":"清真"},
  demoBadge: {"en":"Demo","zh":"示例"},
  demoStalls: {"en":"Demo stalls","zh":"示例摊位"},
  viewStall: {"en":"View demo stall page →","zh":"查看示例摊位页面 →"},
  stallVenueLink: {"en":"View the venue page →","zh":"查看场所页面 →"},
  legendUnderConstruction: {"en":"{n} under construction","zh":"其中 {n} 个施工中"},
  demoContentBanner: {"en":"<strong>DEMO CONTENT.</strong> The stalls, reviews and dish illustrations in this section are fictional samples, not real stalls at these centres. The venues themselves are real.","zh":"<strong>示例内容。</strong>本区块中的摊位、评价和菜式插图均为虚构样本，并非这些中心的真实摊位。中心本身是真实的。"},
  navBrowse: { en: 'Browse', zh: '浏览' },
  navReviews: { en: 'Reviews', zh: '评价' },
  navProcess: { en: 'How we review', zh: '评测方式' },
  navAbout: { en: 'About', zh: '关于我们' },
  mapTag: { en: 'Explore the island', zh: '探索全岛' },
  mapTitleDefault: { en: 'Tap a hawker centre to see its stalls.', zh: '点击小贩中心查看摊位。' },
  legendReviewed: { en: 'Demo centres (sample stalls)', zh: '示例中心（含示例摊位）' },
  legendDirectory: { en: 'Full NEA directory ({n} centres)', zh: '全国环境局完整名录（{n} 个中心）' },
  mapBack: { en: '← Back to Singapore', zh: '← 返回新加坡全岛' },
  mapSearchPlaceholder: { en: 'Search a hawker centre or stall…', zh: '搜索小贩中心或摊位…' },
  mapHint: { en: 'Click a stall marker to preview it.', zh: '点击摊位标记查看预览。' },
  mapCredit: { en: 'Hawker centre locations: NEA, data.gov.sg (Open Data Licence). Map data © OneMap, SLA. Centres still under construction aren’t plotted yet.', zh: '小贩中心位置数据来源：国家环境局 NEA, data.gov.sg（开放数据许可）。地图数据 © OneMap, SLA。仍在施工中的中心尚未标出。' },
  heroTicket: { en: 'QUEUE No. 001', zh: '排队号 001' },
  heroTitle: { en: 'Singapore,<br />one stall at a time.', zh: '新加坡，<br />一个摊位一个故事。' },
  heroText: { en: "We queue, we taste, we film — then we tell you straight whether it's worth the walk. Hawker stalls, food courts, and kopitiams, reviewed by our team.", zh: '我们排队、试吃、拍摄——然后直接告诉你值不值得跑一趟。小贩摊位、美食广场与咖啡店，由我们团队评测。' },
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
  processStep2Text: { en: 'Every dish is shot on site. Photos of every dish.', zh: '每道菜都在现场拍摄，并附上照片。' },
  processStep3Title: { en: 'We publish it straight', zh: '如实发布' },
  processStep3Text: { en: 'The good, the average, and the "don\'t bother" — all get a review, not just the wins.', zh: '好的、普通的、不推荐的——都会写评价，不只报道好的一面。' },
  communityHeading: { en: 'What readers<br />are saying.', zh: '读者<br />怎么说。' },
  communityText: { en: "Signed-in reviews from people who've eaten there too.", zh: '来自其他到访过的读者的评价。' },
  reviewCtaTitle: { en: 'Tried a stall on here?', zh: '吃过这里的摊位吗？' },
  reviewCtaText: { en: 'Read reader reviews and leave your own rating →', zh: '查看读者评价，也可以留下你的评分 →' },
  footerPrivacy: { en: 'Privacy Policy', zh: '隐私政策' },
  footerContact: { en: 'Contact', zh: '联系我们' },
  footerNote: { en: '© 2026 Makan Trail. Draft concept — placeholder content and images.', zh: '© 2026 Makan Trail。草稿概念——内容与图片均为占位。' },

  // --- stall.html ---
  stallBreadcrumbHome: { en: 'Home', zh: '首页' },
  stallTag: { en: 'Chinatown Complex · Hawker · Noodles', zh: '牛车水大厦 · 小贩中心 · 面食' },
  stallAddress: { en: '📍 335 Smith St, #02-111, Singapore (placeholder unit)', zh: '📍 新加坡史密斯街335号 #02-111（占位单位）' },
  stallHours: { en: '🕐 Open 10am–8pm, closed Mon', zh: '🕐 营业时间 10am–8pm，星期一休息' },
  stallPrice: { en: '💵 $4–$6 per pax', zh: '💵 每人 $4–$6' },
  stallRatingSummary: { en: '4.5 editorial score', zh: '编辑评分 4.5' },
  stallWatchTasting: { en: '▶ Watch the tasting', zh: '▶ 观看试吃视频' },
  stallByline: { en: 'Reviewed by the Makan Trail team · Published 3 Sept 2026 · Taste-tested in person, full price', zh: '由 Makan Trail 团队评测 · 2026年9月3日发布 · 亲自试吃，全额付费' },
  stallFictionalNote: { en: 'This is a fictional demo stall used to preview the review layout — not a real business.', zh: '这是一个虚构的示例摊位，用于预览评价页面排版——并非真实商家。' },
  stallPara1: { en: "Forty years in, and the queue outside Golden Ladle still snakes past the neighbouring stalls by 11:30am on a weekday. We joined it anyway, curious whether the hype still holds up against Chinatown's newer noodle stalls.", zh: '开业四十年，工作日上午11点半，Golden Ladle门前的队伍依然蜿蜒过隔壁摊位。我们还是加入了排队，想看看在牛车水新兴面食摊位的冲击下，这份口碑是否依然名不虚传。' },
  stallPara2: { en: "It does. The noodles are springy without being tough, tossed in a dark sauce that isn't overly sweet — a common fault at stalls chasing a younger crowd. The chilli, made fresh each morning, has real heat and a lingering smokiness from what tastes like charred dried chillies rather than the usual shortcut of chilli sauce out of a bottle. The char siew is grilled to order over charcoal, which explains both the char and the ten-minute wait once you place your order.", zh: '确实名不虚传。面条弹牙不硬，拌入的黑酱油不会过甜——这是许多迎合年轻顾客口味的摊位常犯的毛病。每天早上现制的辣椒酱够辣，还带着烘干辣椒的烟熏香，而不是瓶装辣椒酱的敷衍味道。叉烧是现点现烤的炭烤叉烧，这解释了叉烧的炭香，也解释了点餐后要等上十分钟的原因。' },
  stallPara3: { en: "At $4.50 for a regular bowl, this isn't the cheapest wanton mee in the complex, but it's priced fairly for what's clearly not being rushed. Portions are modest — order a side of dumplings if you're hungrier than a light lunch.", zh: '一碗普通份量卖$4.50，在这座大厦里不算最便宜的云吞面，但对于用心不赶工的出品来说，价格算公道。份量偏小——如果想吃得更饱，建议加点一份水饺。' },
  stallPara4: { en: '<strong>Worth the queue?</strong> Yes, if you go before 11:30am or after 1:30pm. The 20-minute midday queue is the only real downside.', zh: '<strong>值得排队吗？</strong>值得，只要你在上午11点半前或下午1点半后前往。中午20分钟的排队时间，是唯一真正的缺点。' },
  stallShareBtn: { en: 'Share this review ↗', zh: '分享这篇评价 ↗' },
  stallAtAGlance: { en: 'At a glance', zh: '一览' },
  stallCuisine: { en: 'Cuisine', zh: '菜系' },
  stallCuisineValue: { en: 'Local · Noodles', zh: '本地 · 面食' },
  stallPriceRange: { en: 'Price range', zh: '价格范围' },
  stallBestFor: { en: 'Best for', zh: '适合' },
  stallBestForValue: { en: 'Solo lunch, cheap eats', zh: '单人午餐、平价美食' },
  stallNo: { en: 'No', zh: '否' },
  stallPayment: { en: 'Payment', zh: '付款方式' },
  stallCashOnly: { en: 'Cash only', zh: '只收现金' },
  stallNearestMrt: { en: 'Nearest MRT', zh: '最近地铁站' },
  stallNearestMrtValue: { en: 'Chinatown (5 min walk)', zh: '牛车水站（步行5分钟）' },

  // --- about.html ---
  aboutTitle: { en: 'About<br />Makan Trail.', zh: '关于<br />Makan Trail。' },
  aboutPara1: { en: 'Makan Trail started with a simple frustration: most food recommendations online are either paid placements dressed up as reviews, or crowd ratings that swing wildly depending on who happened to post that week.', zh: 'Makan Trail 的起点很简单：网络上大多数美食推荐，不是包装成评价的广告置入，就是随发帖人心情剧烈波动的大众评分。' },
  aboutPara2: { en: "We wanted something closer to what a well-fed friend would tell you — someone who's actually queued at the stall, paid full price, and will tell you honestly if it's not worth the wait.", zh: '我们想要的，更像一位吃饱喝足的朋友会告诉你的话——一个真的去排过队、自己付了钱，并且会老实告诉你值不值得等的人。' },
  aboutWhatWeDoTitle: { en: 'What we do', zh: '我们做什么' },
  aboutWhatWeDoText: { en: "Our team visits hawker stalls, food courts, and kopitiams across Singapore, orders like any other customer, photographs and films the food on site, and writes up an honest verdict — good, average, or skip it. Every review carries a byline and a publish date, so you always know it's current and who stands behind it.", zh: '我们的团队走访新加坡各地的小贩摊位、美食广场和咖啡店，像普通顾客一样点餐，在现场拍照拍摄，并写下诚实的结论——好、一般，或不推荐。每篇评价都标注作者与发布日期，让你随时知道内容是否最新，以及是谁把关的。' },
  aboutReaderReviewsTitle: { en: 'Reader reviews', zh: '读者评价' },
  aboutReaderReviewsText: { en: "Alongside our own editorial reviews, we plan to let readers leave their own star rating, a note, and an optional photo. That feature needs real accounts and a database to work honestly, so it's not live on this draft yet — for now you're seeing editorial reviews and sample reader comments only.", zh: '除了我们自己的编辑评价，我们计划让读者留下自己的星级评分、留言，以及可选的照片。这项功能需要真实账户与数据库才能可靠运作，因此目前这份草稿版本尚未上线——现在你看到的只是编辑评价和示例读者留言。' },
  aboutWhatWeDontTitle: { en: "What we don't do", zh: '我们不做什么' },
  aboutDont1: { en: "We don't accept payment in exchange for a positive review.", zh: '我们不接受付费换取正面评价。' },
  aboutDont2: { en: "We don't take free meals in exchange for coverage — every visit is paid for at full price.", zh: '我们不接受免费餐食换取报道——每一次到访都全额付费。' },
  aboutDont3: { en: 'We don’t inflate or fabricate ratings, view counts, or "most popular" claims.', zh: '我们不夸大或捏造评分、浏览量，或「最受欢迎」之类的说法。' },
  aboutContactTitle: { en: 'Get in touch', zh: '联系我们' },
  aboutContactText: { en: 'Spotted a stall we should try, or think we got a review wrong? Use the "Recommend a Stall" link on any listing, or drop us a note through our contact channels.', zh: '发现了值得我们试吃的摊位，或觉得我们的评价有误？可以在任何页面使用「推荐摊位」链接，或透过我们的联系渠道留言。' },

  // --- privacy.html ---
  privacyTitle: { en: 'Privacy<br />Policy.', zh: '隐私<br />政策。' },
  privacyLegalNotice: { en: '⚠ <strong>Placeholder text — not legal advice.</strong> This page is a structural draft only. Before publishing, this must be reviewed and confirmed by the site owner or a qualified lawyer, particularly for compliance with Singapore’s Personal Data Protection Act (PDPA).', zh: '⚠ <strong>占位文本——并非法律意见。</strong>本页仅为结构草稿。发布前必须由网站所有者或专业律师审阅确认，尤其需符合新加坡《个人资料保护法》（PDPA）的要求。' },
  privacyLastUpdated: { en: 'Last updated: [insert date]', zh: '最后更新：[请填入日期]' },
  privacyCollectTitle: { en: 'What we collect', zh: '我们收集的信息' },
  privacyCollectNote: { en: "Sign-in and reader review submission are not live on this draft yet — the items below describe what we'll collect once that feature ships with a real backend.", zh: '登录与读者评价提交功能目前尚未在这份草稿中上线——以下条目描述的是该功能接入真实后端后，我们将会收集的信息。' },
  privacyCollect1: { en: 'Account information if you sign in to leave a review (name, email, or social login profile details)', zh: '登录留言时的账户信息（姓名、电子邮箱，或社交账号登录的个人资料信息）' },
  privacyCollect2: { en: 'Reviews, ratings, and any photos you choose to submit', zh: '你提交的评价、评分，以及任何照片' },
  privacyCollect3: { en: 'Basic analytics data (pages visited, general location, device type) to understand site usage', zh: '基础分析数据（浏览页面、大致地区、设备类型），用于了解网站使用情况' },
  privacyUseTitle: { en: 'How we use it', zh: '我们如何使用这些信息' },
  privacyUse1: { en: 'To display your review and attribute it to your account', zh: '展示你的评价，并标注为你的账户所发布' },
  privacyUse2: { en: 'To moderate submitted content and prevent spam or fake reviews', zh: '审核提交内容，防止垃圾信息或虚假评价' },
  privacyUse3: { en: "To improve the site based on how it's used", zh: '根据使用情况改进网站' },
  privacyDont1: { en: "We don't sell personal data to third parties.", zh: '我们不会将个人数据出售给第三方。' },
  privacyDont2: { en: "We don't use your data for purposes beyond what's described here without asking first.", zh: '除非事先征得同意，我们不会将你的数据用于本政策未说明的用途。' },
  privacyRightsTitle: { en: 'Your rights', zh: '你的权利' },
  privacyRightsText: { en: '[Insert: how users can request access to, correction of, or deletion of their data, per PDPA requirements. Include a contact method for privacy requests.]', zh: '[请填入：根据 PDPA 要求，用户如何申请查阅、更正或删除其数据，并附上隐私相关请求的联系方式。]' },
  privacyRetentionTitle: { en: 'Data retention', zh: '数据保留' },
  privacyRetentionText: { en: '[Insert: how long account and review data is kept, and what happens to it if an account is deleted.]', zh: '[请填入：账户与评价数据的保留期限，以及账户被删除后数据将如何处理。]' },
  privacyThirdPartyTitle: { en: 'Third-party services', zh: '第三方服务' },
  privacyThirdPartyText: { en: '[Insert: list of third-party services used — e.g. login providers, hosting, analytics — and link to their respective privacy policies.]', zh: '[请填入：所使用的第三方服务清单——例如登录服务商、主机服务、分析工具——并附上各自隐私政策的链接。]' },
  privacyContactText: { en: '[Insert: contact email or form for privacy-related questions or data requests.]', zh: '[请填入：用于隐私相关问题或数据请求的联系邮箱或表单。]' },

  // --- 404.html ---
  notFoundTicket: { en: 'QUEUE No. 404', zh: '排队号 404' },
  notFoundTitle: { en: "This stall's<br />moved on.", zh: '这个摊位<br />已经搬走了。' },
  notFoundText: { en: "The page you're looking for doesn't exist, or the listing may have closed. Let's get you back on the trail.", zh: '你要找的页面不存在，或该摊位可能已经歇业。我们带你回到主页吧。' },
  notFoundButton: { en: 'Back to homepage', zh: '返回首页' },
  notFoundFooterNote: { en: '© 2026 Makan Trail.', zh: '© 2026 Makan Trail。' },
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
  window.__makanTrailLang = lang;
  document.documentElement.lang = lang === 'zh' ? 'zh-SG' : 'en';
  document.querySelectorAll('.lang-toggle').forEach((btn) => {
    btn.textContent = lang === 'zh' ? 'EN' : '中文';
    btn.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : 'Switch to Chinese');
  });
  localStorage.setItem(LANG_KEY, lang);
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

function getLang() {
  return window.__makanTrailLang === 'zh' ? 'zh' : 'en';
}

function t(key, vars) {
  const entry = I18N[key];
  let text = entry ? (entry[getLang()] || entry.en) : key;
  if (vars) text = text.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : ''));
  return text;
}

function formatVenueDate(isoDate) {
  return new Intl.DateTimeFormat(getLang() === 'zh' ? 'zh-SG' : 'en-SG', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(isoDate + 'T00:00:00Z'));
}

// The venue page's modules read the same dictionary through this.
window.MT = { t, getLang };

let venueTotal = null;
let venueUnderConstruction = 0;

function renderLegendCount() {
  const node = document.getElementById('legendDirectoryText');
  if (!node || venueTotal == null) return;
  node.textContent = t('legendDirectory', { n: venueTotal })
    + (venueUnderConstruction ? (getLang() === 'zh' ? '，' : ', ') + t('legendUnderConstruction', { n: venueUnderConstruction }) : '');
}
document.addEventListener('langchange', renderLegendCount);

const savedLang = localStorage.getItem(LANG_KEY) === 'zh' ? 'zh' : 'en';
applyLanguage(savedLang);
renderStallDetail();

document.querySelectorAll('.lang-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    applyLanguage(window.__makanTrailLang === 'zh' ? 'en' : 'zh');
    renderStallDetail();
  });
});

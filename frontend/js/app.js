(function () {
  "use strict";
  const APP_VERSION = "1.0.0";

  const API_URL = "http://127.0.0.1:8000";

  function getToken() {return localStorage.getItem("token");
  }

  function authHeaders() {
    const token = getToken() || "";
    const cleanToken = String(token).replace(/^['"](.*)['"]$/, '$1').trim();
    return {
        "Content-Type": "application/json",
        ...(cleanToken ? { "Authorization": `Bearer ${cleanToken}` } : {})
    };
}
  if (localStorage.getItem("bhv_version") !== APP_VERSION) {
    localStorage.clear();
    localStorage.setItem("bhv_version", APP_VERSION);
  }

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var money = function (n) { 
  if (n === undefined || n === null || isNaN(n)) return "$0.00";
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); 
};
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var esc = function (value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[character];
  });
};
  var rt = function () { var r = Math.random(); return r < 0.7 ? Math.floor(r / 0.7 * 4) : r < 0.86 ? 4 : 5; };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  async function refreshCartBadge() {
  try {
    const items = await fetchCart();

    const count = items.reduce(
      function (total, item) {
        return (
          total +
          Number(item.quantity || 0)
        );
      },
      0
    );

    updateServerCartBadge(count);
  } catch (error) {
    console.error(
      "Cart badge refresh failed:",
      error
    );
  }
}

  /*---------cart fetching------------*/
 async function fetchCart() {
  const response = await fetch(`${API_URL}/cart`, {
    method: "GET",
    headers: authHeaders()
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || data.error || "Unable to load cart"
    );
  }

  return Array.isArray(data)
    ? data
    : data.items || data.cart || [];
}

  /* ---------- palettes + watch drawing ---------- */
  var DIALS = { ink: "#1b1a17", cobalt: "#1f3a5f", signal: "#7a1f2b", sun: "#e8d39a", white: "#f1ead8", slate: "#4b5a52" };
  var CASES = { steel: ["#e4e1d8", "#8d8a80"], gold: ["#e6c56e", "#8f6a1c"], black: ["#4a3f35", "#1b1612"] };
  var STRAPS = { ink: ["#1b1410", "Black"], tan: ["#9a6a3a", "Chestnut"], cobalt: ["#1f3a5f", "Navy"], signal: ["#7a1f2b", "Burgundy"] };

  /* A watch face drawn on a 200x280 canvas. Hands sit at 10:10 unless o.live, then the page clock drives them. */
  function watchSVG(o) {
    var d = DIALS[o.dial], c = CASES[o.cas], s = STRAPS[o.strap][0];
    var rx = { square: 14, cushion: 38, round: 64 }[o.shape];
    var light = o.dial === "white" || o.dial === "sun";
    var fg = light ? "#1b1410" : "#f1ead8";
    var sec = o.dial === "signal" ? "#e0c070" : "#b3262e";
    var EDGE = "#d8b45a";
    var g = "";
    // leather straps with cream stitching and punched holes
    g += "<rect x='64' y='4' width='72' height='82' rx='5' fill='" + s + "' stroke='" + EDGE + "' stroke-width='1.5'/>";
    g += "<rect x='64' y='194' width='72' height='82' rx='5' fill='" + s + "' stroke='" + EDGE + "' stroke-width='1.5'/>";
    g += "<path d='M72 14V70M128 14V70M72 210V266M128 210V266' stroke='rgba(232,211,154,.55)' stroke-width='1.5' stroke-dasharray='4 3'/>";
    for (var h = 0; h < 4; h++) g += "<circle cx='100' cy='" + (226 + h * 13) + "' r='3.2' fill='#120d09' opacity='.6'/>";
    // crown + case
    g += "<rect x='160' y='130' width='12' height='20' rx='2' fill='" + c[1] + "' stroke='" + EDGE + "' stroke-width='1.5'/>";
    g += "<rect x='34' y='74' width='132' height='132' rx='" + rx + "' fill='" + c[0] + "' stroke='" + EDGE + "' stroke-width='2.5'/>";
    g += "<rect x='42' y='82' width='116' height='116' rx='" + Math.max(rx - 6, 6) + "' fill='none' stroke='" + c[1] + "' stroke-width='3'/>";
    // dial
    var dr = Math.min(Math.max(rx - 12, 4), 52);
    g += "<rect x='48' y='88' width='104' height='104' rx='" + dr + "' fill='" + d + "' stroke='#2a1d12' stroke-width='2'/>";
    // roman quarter numerals, baton ticks between
    var nums = { 0: "XII", 3: "III", 6: "VI", 9: "IX" };
    for (var i = 0; i < 12; i++) {
      if (i % 3 === 0) {
        var a = i * Math.PI / 6, x = 100 + Math.sin(a) * 37, y = 140 - Math.cos(a) * 37;
        g += "<text x='" + x.toFixed(1) + "' y='" + y.toFixed(1) + "' text-anchor='middle' dy='.35em' font-family='Playfair Display,Georgia,serif' font-weight='700' font-size='" + (i === 0 ? 13 : 12) + "' fill='" + fg + "'>" + nums[i] + "</text>";
      } else {
        g += "<rect x='99.25' y='93' width='1.5' height='6' fill='" + fg + "' transform='rotate(" + (i * 30) + " 100 140)'/>";
      }
    }
    g += "<text x='100' y='122' text-anchor='middle' font-family='Playfair Display,Georgia,serif' font-size='5.5' letter-spacing='1.2' fill='" + fg + "' opacity='.75'>BLOCKHOUR</text>";
    if (o.chrono) {
      g += "<circle cx='82' cy='156' r='9' fill='none' stroke='" + fg + "' stroke-width='1.2'/><circle cx='118' cy='156' r='9' fill='none' stroke='" + fg + "' stroke-width='1.2'/>";
    }
    // hands: dauphine hour and minute, slim seconds with counterweight; every hand pivots on (100,140)
    var sA = o.live ? 0 : 210, mA = o.live ? 0 : 60, hA = o.live ? 0 : 305;
    g += "<g class='hh' transform='rotate(" + hA + " 100 140)'><polygon points='100,108 104.5,138 100,147 95.5,138' fill='" + fg + "' stroke='#1b1410' stroke-width='0.8'/></g>";
    g += "<g class='hm' transform='rotate(" + mA + " 100 140)'><polygon points='100,93 102.8,138 100,147 97.2,138' fill='" + fg + "' stroke='#1b1410' stroke-width='0.8'/></g>";
    g += "<g class='hs' transform='rotate(" + sA + " 100 140)'><rect x='99.2' y='94' width='1.6' height='64' fill='" + sec + "'/><rect x='97.4' y='148' width='5.2' height='10' fill='" + sec + "'/></g>";
    g += "<circle cx='100' cy='140' r='4.2' fill='" + sec + "' stroke='" + EDGE + "' stroke-width='1.2'/>";
    return "<svg class='" + (o.live ? "live" : "") + "' viewBox='0 0 200 280' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='" + esc(o.name || "Watch") + "'>" + g + "</svg>";
  }

  
/* ---------- catalogue ---------- */
  var CATS = { dress: "Dress", dive: "Dive", field: "Field", chrono: "Chrono" };
  var CAT_TILE = { dress: "radial-gradient(circle at 50% 42%,#3a5a8c,#101a30 76%)", dive: "radial-gradient(circle at 50% 42%,#93313f,#2a0d12 76%)", field: "radial-gradient(circle at 50% 42%,#66724c,#1b2314 76%)",
     chrono: "radial-gradient(circle at 50% 42%,#80592f,#26170a 76%)" };
  
  let WATCHES = [
    
  ];
let byId = {};

async function loadProducts() {
  const response = await fetch(`${API_URL}/products`);

  if (!response.ok) {
    throw new Error("Unable to load products");
  }

  const products = await response.json();

  WATCHES = products.map(function (product) {
    return {
      id: product.id,
      name: product.name,
      cat: product.cat || product.category || "dress",
      shape: product.shape || "round",
      dial: product.dial || "white",
      cas: product.cas || product.case_material || "steel",
      strap: product.strap || "ink",
      price: Number(product.price),
      size: Number(product.size || 40),
      move: product.move || product.movement || "Quartz",
      water: product.water || "50 m",
      glass: product.glass || "Mineral",
      chrono: Boolean(product.chrono),
      tile:
        product.tile ||
        "radial-gradient(circle at 50% 42%,#3a5a8c,#101a30 76%)",
      desc: product.desc || product.description || ""
    };
  });

  byId = {};

  WATCHES.forEach(function (watch) {
    byId[Number(watch.id)] = watch;
  });
}

  var wopts = function (watch, strap, extra) { var o = { name: watch.name, dial: watch.dial, cas: watch.cas, shape: watch.shape, strap: strap || watch.strap, chrono: watch.chrono };
   for (var k in extra) o[k] = extra[k]; return o; };

  /* ---------- state ---------- */
  var user = store.get("bh_user", null);
  var cart = store.get("bh_cart", {});   // key "id|strap" -> qty
  var promo = store.get("bh_promo", "");
  var shop = { cat: "all", sort: "featured", q: "" };
  var authMode = "login";
  var loginDial = "cobalt";
  var pd = { id: 0, strap: "ink", qty: 1 };
  var lastOrder = null;

  var saveCart = function () { store.set("bh_cart", cart); };
  var cartCount = function () { var n = 0; for (var k in cart) n += cart[k]; return n; };
  var cartKeys = function () { return Object.keys(cart).filter(function (k) { return byId[k.split("|")[0]]; }); };
  function totals() {
    var sub = 0; cartKeys().forEach(function (k) { sub += byId[k.split("|")[0]].price * cart[k]; });
    var disc = promo === "BLOCK10" ? Math.round(sub * 10) / 100 : 0;
    var ship = sub - disc >= 300 || !sub ? 0 : 12;
    return { sub: sub, disc: disc, ship: ship, total: sub - disc + ship };
  }
  var toastTimer;
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("on"); }, 1800); }

  /* ---------- nav ---------- */
  function renderNav(route) {
    var nav = $("#nav");
    if (!user || route === "login") { nav.innerHTML = ""; return; }
    nav.innerHTML = "<div class='nav'><div class='nav-in'>" +
      "<a class='brand' href='#home'><span class='logo'><i></i><i></i><i></i><i></i></span>BLOCKHOUR</a>" +
      "<a class='nl' href='#home'" + (route === "home" || route === "watch" ? " aria-current='page'" : "") + ">Shop</a>" +
      "<span class='who' title='" + esc(user.email || "") + "'>" + esc(user.name) + "</span>" +
      "<button class='link-btn' data-logout='1'>Log out</button>" +
      "<a class='cart-link' href='#cart' aria-label='Cart'>Cart <span class='badge' id='badge'>" + cartCount() + "</span></a></div></div>";
  }
  var updateBadge = function () { ["#badge", "#tbadge"].forEach(function (id) { var b = $(id); if (b) b.textContent = cartCount(); }); };

  function updateServerCartBadge(count) {
  const badges = [
    document.querySelector("#badge"),
    document.querySelector("#tbadge")
  ];

  badges.forEach(function (badge) {
    if (badge) {
      badge.textContent = count;
    }
  });
}

  /* ---------- bottom tab bar: Home, Search, Categories, Cart ---------- */
  var ICON = {
    home: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linejoin='miter' aria-hidden='true'><path d='M3 11 12 3l9 8v10H3z'/><path d='M10 21v-6h4v6'/></svg>",
    search: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' aria-hidden='true'><rect x='3' y='3' width='13' height='13'/><path d='M14 14l7 7'/></svg>",
    cats: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' aria-hidden='true'><rect x='3' y='3' width='7' height='7'/><rect x='14' y='3' width='7' height='7'/><rect x='3' y='14' width='7' height='7'/><rect x='14' y='14' width='7' height='7'/></svg>",
    cart: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linejoin='miter' aria-hidden='true'><path d='M2 4h3l2.5 11h11L21 7H6'/><rect x='8' y='19' width='3' height='3'/><rect x='16' y='19' width='3' height='3'/></svg>"
  };
  var pendingScroll = false;
  function renderTabs(route) {
    var tb = $("#tabbar");
    if (!user || route === "login") { tb.hidden = true; tb.innerHTML = ""; document.body.classList.remove("has-tabs"); return; }
    tb.hidden = false; document.body.classList.add("has-tabs");
    var cur = function (on) { return on ? " aria-current='page'" : ""; };
    tb.innerHTML = "<div class='tabbar-in'>" +
      "<button class='tab' data-tab='home'" + cur(route === "home" || route === "watch") + ">" + ICON.home + "Home</button>" +
      "<button class='tab' data-tab='search'" + cur(route === "search") + ">" + ICON.search + "Search</button>" +
      "<button class='tab' data-tab='cats'" + cur(route === "categories") + ">" + ICON.cats + "Categories</button>" +
      "<button class='tab' data-tab='cart'" + cur(route === "cart" || route === "checkout") + ">" + ICON.cart + "Cart<span class='tbadge' id='tbadge'>" + cartCount() + "</span></button></div>";
  }
  function scrollShop() { var a = $("#shop-anchor"); if (!a) return; try { a.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); } catch (e) { a.scrollIntoView(true); } }
  function scrollTop0() { try { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); } catch (e) { window.scrollTo(0, 0); } }
  function goShop(cat, q) {
    shop.cat = cat; shop.q = q || ""; shop.sort = "featured";
    if ((location.hash || "") !== "#home") { pendingScroll = true; location.hash = "#home"; } else { viewHome(); scrollShop(); }
  }
  /* ---------- search + categories pages ---------- */
  var searchQ = "";
  function renderSearchResults() {
  var q =
    searchQ
      .trim()
      .toLowerCase();

  var list;

  if (q) {
    list = WATCHES.filter(function (w) {
      return (
        (
          w.name + " " +
          (CATS[w.cat] || "") + " " +
          w.move + " " +
          w.dial + " " +
          w.shape + " " +
          w.cas
        )
          .toLowerCase()
          .indexOf(q) > -1
      );
    });
  } else {
    /*
     * Don't rely on old hard-coded product IDs.
     * Just show the first four real products.
     */
    list = WATCHES.slice(0, 4); }

  $("#search-results").innerHTML =
    "<p class='sheet-sub'>" +

      (
        q
          ? (
              list.length +
              " result" +
              (list.length === 1 ? "" : "s") +
              " for “" +
              esc(searchQ.trim()) +
              "”"
            )
          : "Popular watches"
      ) +

    "</p>" +

    (
      list.length
        ? (
            "<div class='grid'>" +
              list
                .map(cardHTML)
                .join("") +
            "</div>"
          )
        : (
            "<div class='blk empty'>" +
              "No watches match that search." +
            "</div>"
          )
    );
}
  function viewSearch() {
    var chips = ["Dive", "Cobalt", "Automatic", "Gold", "Square", "Chrono"].map(function (c) { return "<button class='chip' data-q='" + c + "'>" + c + "</button>"; }).join("");
    $("#view").innerHTML = "<div class='page'><h1>Search</h1><input class='input bigsearch' id='page-search' type='search' placeholder='Search watches, dials, movements' autocomplete='off' aria-label='Search watches' value='" +
     esc(searchQ) + "'><div class='chips' style='margin:16px 0 0'>" + chips + "</div><div id='search-results'></div></div>";
    renderSearchResults();
    var i = $("#page-search"); if (i && !window.matchMedia("(pointer: coarse)").matches) i.focus();
  }
  function viewCategories() {
    var tiles = Object.keys(CATS).map(function (c) {
      var items = WATCHES.filter(function (w) { return w.cat === c; });
      var low = Math.min.apply(null, items.map(function (w) { return w.price; }));
      return "<button class='blk cat-big' data-sheetcat='" + c + "' style='background:" + CAT_TILE[c] + "'><span class='cat-top'><strong>" + CATS[c] + "</strong><span>" + items.length + " watches · from " + money(low) +
       "</span></span><span class='cat-art'>" + items.slice(0, 3).map(function (w) { return watchSVG(wopts(w)); }).join("") + "</span></button>";
    }).join("");
    $("#view").innerHTML = "<div class='page'><h1>Categories</h1><div class='cat-page'>" + tiles + "</div><div style='margin-top:24px'><button class='btn alt' data-sheetcat='all'>Shop all 12 watches</button></div></div>";
  }

  /* ---------- login (live watch + shifting mosaic) ---------- */
  function greeting() { var h = new Date().getHours(); return h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }
  function liveWatch() { return watchSVG({ name: "Live clock", dial: loginDial, cas: "steel", shape: "cushion", strap: loginDial === "signal" ? "ink" : "signal", live: true }); }
  function viewLogin() {
    var signup = authMode === "signup", tiles = "";
    for (var i = 0; i < 36; i++) tiles += "<i class='t" + rt() + "'></i>";
    var sw = Object.keys(DIALS).map(function (k) { return "<button type='button' class='sw' data-dial='" + k + "' style='background:" + DIALS[k] + "' aria-label='" + k + " dial' aria-pressed='" + (k === loginDial) + "'></button>"; }).join("");
    $("#view").innerHTML = "<div class='login'>" +
      "<section class='blk stage' aria-label='Live watch'><div class='mosaic' aria-hidden='true'>" + tiles + "</div><div class='stage-in'>" +
      "<div class='hello'><b>" + greeting() + "</b><span id='clock'>--:--:--</span></div>" +
      "<div class='wwrap' id='lw'>" + liveWatch() + "</div>" +
      "<div class='dials'><span>Dial</span>" + sw + "</div></div></section>" +
      "<form class='blk auth' id='authForm' novalidate>" +
      "<div class='brand' style='margin:0'><span class='logo'><i></i><i></i><i></i><i></i></span>BLOCKHOUR</div>" +
      "<h1>" + (signup ? "Create your account" : "Welcome back") + "</h1><p class='sub'>Sign in to shop, save your cart and check out faster.</p>" +
      "<div class='tabs' role='tablist'><button type='button' role='tab' data-mode='login' aria-selected='" + !signup + "'>Login</button><button type='button' role='tab' data-mode='signup' aria-selected='" + signup + "'>Sign up</button></div>" +
      (signup ? "<div class='field'><label for='f-name'>Full name</label><input class='input' id='f-name' autocomplete='name' placeholder='Ada Obi'><div class='err' id='e-name'></div></div>" : "") +
      "<div class='field'><label for='f-email'>Email</label><input class='input' id='f-email' type='email' autocomplete='email' placeholder='you@example.com'><div class='err' id='e-email'></div></div>" +
      "<div class='field'><label for='f-pass'>Password</label><div class='pw'><input class='input' id='f-pass' type='password' autocomplete='" + (signup ? "new-password" : "current-password") +
      "' placeholder='At least 6 characters'><button type='button' data-togglepw='1' aria-label='Show password'>Show</button></div><div class='err' id='e-pass'></div></div>" +
      "<label class='check'><input type='checkbox' id='f-remember' checked> Keep me signed in</label>" +
      "<button class='btn block' type='submit'>" + (signup ? "Create account" : "Log in") + "</button>" +
      "<button class='btn out block' type='button' data-guest='1'>Continue as guest</button>" +
      "<p class='fine'>Sign in securely to access your cart and complete checkout.</p></form></div>";
    tick();
  }
  async function submitAuth(e) {
    e.preventDefault();

    const signup = authMode === "signup";

    const name = signup
        ? $("#f-name").value.trim()
        : "";

    const email = $("#f-email").value.trim();

    const pass = $("#f-pass").value;

    if (signup) {

        const response = await fetch(
            `${API_URL}/register?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(pass)}`,
            {
                method: "POST"
            }
        );

        const data = await response.json();

        if (data.error) {
            toast(data.error);
            return;
        }

        toast("Registration successful");

        authMode = "login";

        viewLogin();

    } else {

        const response = await fetch(
            `${API_URL}/login`,
            {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
             body: JSON.stringify({
              email: email,
              password: pass
            })
              }
           
        );

        const data = await response.json();

        if (data.error) {
            toast(data.error);
            return;
        }

        localStorage.setItem(
            "token",
            data.access_token
        );

        user = {
            email: email,
            name: email.split("@")[0]
        };

        store.set("bh_user", user);

        location.hash = "#home";
    }
}

  /* ---------- shop ---------- */
  function cardHTML(w) {
    if (!w) {return "";}
   var categoryName = 
   CATS[w.cat] ||
   w.cat ||
   "Watch";
    return ("<article class='blk card' style='--tile:" + w.tile + "'><a class='art' href='#watch/" + w.id + "' aria-label='View " + esc(w.name) + "'>" + watchSVG(wopts(w)) + "</a>" +
      "<div class='cb'><div class='cat'>" + CATS[w.cat] + "</div><h3><a href='#watch/" + w.id + "'>" + esc(w.name) + "</a></h3><p class='spec'>" + w.size + " mm · " + w.move + " · " + w.water + "</p>" +
      "<div class='buy'><strong>" + money(w.price) + "</strong><button class='btn sm' data-add='" + w.id + "'>Add to cart</button></div></div></article>"
    );
  }
  function renderGrid() {
    var q = shop.q.trim().toLowerCase();
    var list = WATCHES.filter(function (w) {
      return (shop.cat === "all" || w.cat === shop.cat) && (!q || (w.name + " " + CATS[w.cat] + " " + w.move + " " + w.dial).toLowerCase().indexOf(q) > -1);
    });
    var html = "";
    if (!list.length) html = "<div class='blk empty'>No watches match that search. Try another collection.</div>";
    else if (shop.cat === "all" && !q && shop.sort === "featured") {
      Object.keys(CATS).forEach(function (c) {
        var items = list.filter(function (w) { return w.cat === c; });
        html += "<section class='coll'><div class='coll-h'><h2>" + CATS[c] + "</h2><span>" + items.length + " watches</span></div><div class='grid'>" + items.map(cardHTML).join("") + "</div></section>";
      });
    } else {
      if (shop.sort === "low") list.sort(function (a, b) { return a.price - b.price; });
      if (shop.sort === "high") list.sort(function (a, b) { return b.price - a.price; });
      html = "<section class='coll'><div class='coll-h'><h2>" + (shop.cat === "all" ? "Results" : CATS[shop.cat]) + "</h2><span>" + list.length + " watches</span></div><div class='grid'>" + list.map(cardHTML).join("") + "</div></section>";
    }
    $("#grid").innerHTML = html;
  }
  async function viewHome() {
  if (!WATCHES.length) {
    $("#view").innerHTML =
      "<div class='blk empty'>Loading watches...</div>";

    try {
      await loadProducts();
    } catch (error) {
      console.error(error);

      $("#view").innerHTML =
        "<div class='blk empty'>Unable to load watches.</div>";

      return;
    }
  }

  var counts = {};

  WATCHES.forEach(function (watch) {
    counts[watch.cat] = (counts[watch.cat] || 0) + 1;
  });

    var cats = Object.keys(CATS).map(function (c) { return "<button class='blk cat-t' data-cat='" + c + "' style='background:" + CAT_TILE[c] + "'><strong>" + CATS[c] + "</strong><span>" + counts[c] + " watches</span></button>"; }).join("");
    var chips = "<button class='chip' data-filter='all' aria-pressed='" + (shop.cat === "all") + "'>All</button>" + Object.keys(CATS).map(function (c) { return "<button class='chip' data-filter='" + c + "' aria-pressed='" + (shop.cat === c) + "'>" + CATS[c] + "</button>"; }).join("");
    $("#view").innerHTML =
      "<section class='hero'><div class='blk hero-l'><div class='eyebrow'>New collection · 12 watches</div><h1>Time, built in blocks.</h1>" +
      "<p>Square, cushion and round cases with bold block markers. Quartz from $165, automatic from $275, free shipping over $500.</p>" +
      "<div class='cta'><a class='btn' href='#shop-anchor' data-jump='1'>Shop watches</a><button class='btn out' data-cat='dive'>See the divers</button></div></div>" +
      "<div class='blk hero-r'><div class='wwrap'>" + watchSVG({ name: "Live clock", dial: "sun", cas: "gold", shape: "square", strap: "ink", live: true }) + "</div></div></section>" +
      "<div class='cats'>" + cats + "</div>" +
      "<div class='tools' id='shop-anchor'><input class='input' id='search' type='search' placeholder='Search watches' value='" + esc(shop.q) + "' aria-label='Search watches'><div class='chips'>" + chips + "</div>" +
      "<select class='input' id='sort' aria-label='Sort'><option value='featured'" + (shop.sort === "featured" ? " selected" : "") + ">Sort: Featured</option><option value='low'" + (shop.sort === "low" ? " selected" : "") + ">Price: low to high</option><option value='high'" + (shop.sort === "high" ? " selected" : "") + ">Price: high to low</option></select></div>" +
      "<div id='grid'></div>" +
      "<div class='perks'><div class='blk perk'><b>Free shipping</b><span>On orders over $300.</span></div><div class='blk perk'><b>2-year warranty</b><span>On every movement.</span></div><div class='blk perk'><b>30-day returns</b><span>Unworn, in the box.</span></div><div class='blk perk'><b>Secure checkout</b><span>Secure payments powered by Paystack.</span></div></div>";
    renderGrid();
  }

  /* ---------- product page ---------- */
  function renderPD() {
    var w = byId[pd.id];
    $("#pd-art").innerHTML = watchSVG(wopts(w, pd.strap));
    document.querySelectorAll("[data-strap]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.strap === pd.strap); });
    $("#pd-qty").textContent = pd.qty;
  }
  function viewWatch(id) {
    var w = byId[id]; if (!w) { location.hash = "#home"; return; }
    if (pd.id !== w.id) pd = { id: w.id, strap: w.strap, qty: 1 };
    var sw = Object.keys(STRAPS).map(function (k) { return "<button class='sw' data-strap='" + k + "' style='background:" + STRAPS[k][0] + "' aria-label='" + STRAPS[k][1] + " strap' title='" + STRAPS[k][1] + "'></button>"; }).join("");
    var more = WATCHES.filter(function (x) { return x.cat === w.cat && x.id !== w.id; }).concat(WATCHES.filter(function (x) { return x.cat !== w.cat; })).slice(0, 4);
    $("#view").innerHTML = "<a class='back' href='#home'>← All watches</a><div class='pd'>" +
      "<div class='blk pd-art' id='pd-art' style='--tile:" + w.tile + "'></div>" +
      "<div class='pd-info'><div class='cat'>" + CATS[w.cat] + " collection</div><h1>" + esc(w.name) + "</h1><div class='price'>" + money(w.price) + "</div><p style='margin:0;font-size:17px'>" + esc(w.desc) + "</p>" +
      "<div class='straps'><b>Strap</b>" + sw + "</div>" +
      "<dl class='specs' style='margin:0'><div><dt>Case</dt><dd>" + w.size + " mm " + w.shape + "</dd></div><div><dt>Movement</dt><dd>" + w.move + "</dd></div><div><dt>Water resistance</dt><dd>" + w.water + "</dd></div><div><dt>Glass</dt><dd>" + w.glass + "</dd></div></dl>" +
      "<div class='addrow'><div class='qty'><button data-pdq='-1' aria-label='Decrease quantity'>−</button><span id='pd-qty'>1</span><button data-pdq='1' aria-label='Increase quantity'>+</button></div><button class='btn' data-addpd='1'>Add to cart</button></div></div></div>" +
      "<section class='coll'><div class='coll-h'><h2>You may also like</h2></div><div class='grid'>" + more.map(cardHTML).join("") + "</div></section>";
    renderPD();
  }

  /* ---------- cart ---------- */
  async function viewCart() {
  const view = $("#view");

  view.innerHTML =
    "<div class='page'>" +
      "<h1>Your cart</h1>" +
      "<div class='blk empty'>Loading your cart...</div>" +
    "</div>";

  try {
    const items = await fetchCart();

    if (!items.length) {
      view.innerHTML =
        "<div class='page'>" +
          "<h1>Your cart</h1>" +
          "<div class='blk empty'>" +
            "Your cart is empty.<br><br>" +
            "<a class='btn' href='#home'>Browse watches</a>" +
          "</div>" +
        "</div>";

      updateServerCartBadge(0);
      return;
    }

    let subtotal = 0;
    let totalQuantity = 0;

    const lines = items.map(function (item) {
      const productId = Number(item.product_id);
const quantity = Number(item.quantity || 0);
const watch = byId[productId];

      if (!watch) {
        console.error(
          "Product not found in frontend catalogue:",
          productId,
          item
        );

        return "";
      }

      const itemPrice = Number(
        item.price !== undefined
          ? item.price
          : watch.price
      );

      const lineTotal = itemPrice * quantity;
      const cartItemId = item.cart_id || item.id;

      subtotal += lineTotal;
      totalQuantity += quantity;

      return (
        "<div class='line'>" +

          "<div class='thumb' style='--tile:" +
            watch.tile +
          "'>" +
            watchSVG(wopts(watch, watch.strap)) +
          "</div>" +

          "<div style='min-width:0'>" +
            "<h3>" + esc(watch.name) + "</h3>" +

            "<p class='spec'>" +
              watch.size + " mm · " +
              money(itemPrice) + " each" +
            "</p>" +

            "<div class='qty'>" +
              "<span>Quantity: " + quantity + "</span>" +
            "</div>" +
          "</div>" +

          "<div class='right'>" +
            "<strong>" + money(lineTotal) + "</strong>" +

            "<button " +
              "class='link-btn' " +
              "data-server-remove='" + cartItemId + "'" +
            ">" +
              "Remove" +
            "</button>" +
          "</div>" +

        "</div>"
      );
    }).join("");

   const shipping =
  subtotal === 0 || subtotal >= 500
    ? 0
    : 12;
    const total = subtotal + shipping;

    view.innerHTML =
      "<div class='page'>" +
        "<h1>Your cart</h1>" +

        "<div class='split'>" +

          "<div class='blk panel'>" +
            lines +
          "</div>" +

          "<aside class='blk panel'>" +
            "<h2>Order summary</h2>" +

            "<div class='sum'>" +
              "<div>" +
                "Subtotal " +
                "<b>" + money(subtotal) + "</b>" +
              "</div>" +

              "<div>" +
                "Shipping " +
                "<b>" +
                  (shipping ? money(shipping) : "Free") +
                "</b>" +
              "</div>" +

              "<div class='total'>" +
                "Total " +
                "<b>" + money(total) + "</b>" +
              "</div>" +
            "</div>" +

            "<br>" +

            "<a class='btn block' href='#checkout'>" +
              "Proceed to checkout" +
            "</a>" +
          "</aside>" +

        "</div>" +
      "</div>";

    updateServerCartBadge(totalQuantity);

  } catch (error) {
    console.error("Cart loading error:", error);

    view.innerHTML =
      "<div class='page'>" +
        "<h1>Your cart</h1>" +
        "<div class='blk empty'>" +
          "Unable to load your cart.<br><br>" +
          "<button class='btn' type='button' " +
            "onclick='location.reload()'>" +
            "Try again" +
          "</button>" +
        "</div>" +
      "</div>";
  }
}

  function applyPromo(e) {
    e.preventDefault();
    var v = $("#promo").value.trim().toUpperCase();
    if (!v) { promo = ""; store.del("bh_promo"); viewCart(); return; }
    if (v !== "BLOCK10") { $("#e-promo").textContent = "That code is not valid."; return; }
    promo = v; store.set("bh_promo", promo); viewCart(); toast("10% off applied");
  }


  /* ---------- checkout ---------- */
 async function viewCheckout() {
  const view = $("#view");

  view.innerHTML =
    "<div class='page'>" +
      "<h1>Checkout</h1>" +
      "<div class='blk empty'>" +
        "Loading checkout..." +
      "</div>" +
    "</div>";

  let serverItems;

  try {
    serverItems = await fetchCart();
  } catch (error) {
    console.error(
      "Checkout cart error:",
      error
    );

    toast("Unable to load your cart");

    location.hash = "#cart";
    return;
  }

  if (!serverItems.length) {
    updateServerCartBadge(0);
    location.hash = "#cart";
    return;
  }

  let subtotal = 0;

  serverItems.forEach(function (item) {
    subtotal +=
      Number(item.price || 0) *
      Number(item.quantity || 0);
  });

  const shipping =
    subtotal >= 300
      ? 0
      : 12;

  const total =
    subtotal + shipping;

  const items = serverItems
    .map(function (item) {
      const quantity =
        Number(item.quantity || 0);

      const price =
        Number(item.price || 0);

      return (
        "<div>" +
          "<span>" +
            esc(
              item.product_name ||
              "Watch"
            ) +
            " × " +
            quantity +
          "</span>" +

          "<b>" +
            money(price * quantity) +
          "</b>" +
        "</div>"
      );
    })
    .join("");

  const countries = [
    "Nigeria",
    "Ghana",
    "Kenya",
    "South Africa",
    "United Kingdom",
    "United States",
    "Other"
  ]
    .map(function (country) {
      return (
        "<option>" +
          country +
        "</option>"
      );
    })
    .join("");

  view.innerHTML =
    "<div class='page'>" +

      "<h1>Checkout</h1>" +

      "<div class='split'>" +

        "<form " +
          "class='blk panel' " +
          "id='payForm' " +
          "novalidate" +
        ">" +

          "<h2>Delivery</h2>" +

          "<div class='mp'>" +

            "<div class='two'>" +

              "<div class='field'>" +
                "<label for='d-name'>" +
                  "Full name" +
                "</label>" +

                "<input " +
                  "class='input' " +
                  "id='d-name' " +
                  "autocomplete='name' " +
                  "value='" +
                    esc(
                      user.name === "Guest"
                        ? ""
                        : user.name
                    ) +
                  "'" +
                ">" +

                "<div " +
                  "class='err' " +
                  "id='e-dname'" +
                "></div>" +
              "</div>" +

              "<div class='field'>" +
                "<label for='d-phone'>" +
                  "Phone" +
                "</label>" +

                "<input " +
                  "class='input' " +
                  "id='d-phone' " +
                  "type='tel' " +
                  "autocomplete='tel' " +
                  "placeholder='+234 800 000 0000'" +
                ">" +

                "<div " +
                  "class='err' " +
                  "id='e-dphone'" +
                "></div>" +
              "</div>" +

            "</div>" +

            "<div class='field'>" +
              "<label for='d-addr'>" +
                "Street address" +
              "</label>" +

              "<input " +
                "class='input' " +
                "id='d-addr' " +
                "autocomplete='street-address'" +
              ">" +

              "<div " +
                "class='err' " +
                "id='e-daddr'" +
              "></div>" +
            "</div>" +

            "<div class='two'>" +

              "<div class='field'>" +
                "<label for='d-city'>" +
                  "City" +
                "</label>" +

                "<input " +
                  "class='input' " +
                  "id='d-city' " +
                  "autocomplete='address-level2'" +
                ">" +

                "<div " +
                  "class='err' " +
                  "id='e-dcity'" +
                "></div>" +
              "</div>" +

              "<div class='field'>" +
                "<label for='d-country'>" +
                  "Country" +
                "</label>" +

                "<select " +
                  "class='input' " +
                  "id='d-country'" +
                ">" +
                  countries +
                "</select>" +
              "</div>" +

            "</div>" +

          "</div>" +

          "<hr class='sep'>" +

          "<h2>Payment</h2>" +

          "<div class='mp'>" +

            "<div class='method'>" +
              "<span>" +
                "<strong>Paystack</strong>" +
                "<br>" +
                "Secure hosted checkout" +
              "</span>" +
            "</div>" +

            "<p class='note'>" +
              "You will continue to Paystack to complete your payment securely." +
            "</p>" +

          "</div>" +

          "<br>" +

          "<button " +
            "class='btn block' " +
            "type='submit' " +
            "id='payBtn'" +
          ">" +
            "Pay with Paystack · " +
            money(total) +
          "</button>" +

        "</form>" +

        "<aside class='blk panel'>" +

          "<h2>Order summary</h2>" +

          "<div class='sum'>" +

            items +

            "<div>" +
              "Subtotal " +
              "<b>" +
                money(subtotal) +
              "</b>" +
            "</div>" +

            "<div>" +
              "Shipping " +
              "<b>" +
                (
                  shipping
                    ? money(shipping)
                    : "Free"
                ) +
              "</b>" +
            "</div>" +

            "<div class='total'>" +
              "Total " +
              "<b>" +
                money(total) +
              "</b>" +
            "</div>" +

          "</div>" +

        "</aside>" +

      "</div>" +

    "</div>";
}

 
let isCheckingOut = false;

async function submitPay(e) {
  if (e) e.preventDefault();
  if (isCheckingOut) return;
  isCheckingOut = true;

  const payBtn = document.querySelector("#payBtn") || (e && e.submitter);
  if (payBtn) {
    payBtn.disabled = true;
    payBtn.textContent = "Creating order...";
  }

  try {
    console.log("Step 1: Creating order in database...");
    const orderRes = await fetch(`${API_URL}/orders/checkout`, {
      method: "POST",
      headers: authHeaders()
    });
    
    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      throw new Error(orderData.detail || orderData.error || "Checkout failed");
    }

    const orderId = Number(orderData.order_id || orderData.id);
    if (!orderId) throw new Error("Invalid order ID returned");

    if (payBtn) {
      payBtn.textContent = "Connecting to Paystack...";
    }

    console.log("Step 2: Initializing Paystack for Order ID:", orderId);
    const payRes = await fetch(`${API_URL}/payments/initialize/${orderId}`, {
      method: "POST",
      headers: authHeaders()
    });

    const payData = await payRes.json();
    if (!payRes.ok) {
      throw new Error(payData.detail || payData.message || "Payment initialization failed");
    }

    console.log("Step 3: Paystack response received:", payData);

    const providerData = payData.data || {};
    const authorizationUrl = providerData.authorization_url;
    const reference = providerData.reference || orderData.payment_reference;

    if (!authorizationUrl) {
      throw new Error("Paystack returned no payment URL");
    }

    // Safely store reference without risking circular JSON errors
    const cityInput = document.querySelector("#d-city");
    const pendingOrder = {
      order_id: orderId,
      total: orderData.total || orderData.amount,
      reference: reference,
      city: cityInput ? cityInput.value.trim.valueOf() : ""
    };

    try {
      sessionStorage.setItem("payment_reference", reference);
      sessionStorage.setItem("pending_order", JSON.stringify(pendingOrder));
    } catch (storageErr) {
      console.warn("Session storage warning:", storageErr);
    }

    console.log("Step 4: Redirecting browser to Paystack ->", authorizationUrl);

    // Force direct assignment
    window.location.href = authorizationUrl;
    return;

  } catch (err) {
    console.error("Checkout error caught:", err);
    alert(err.message || "Unable to complete order"); // Fallback if toast isn't defined
    isCheckingOut = false;
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.textContent = "Pay now";
    }
  }
}
  
  function viewDone() {
  if (!lastOrder) {
    const storedOrder =
      sessionStorage.getItem(
        "last_order"
      );

    if (storedOrder) {
      try {
        lastOrder =
          JSON.parse(storedOrder);
      } catch (error) {
        console.error(
          "Stored order error:",
          error
        );
      }
    }
  }

  if (!lastOrder) {
    location.hash = "#home";
    return;
  }

  $("#view").innerHTML =
    "<div class='done'>" +
      "<div class='blk panel'>" +

        "<div class='ok' aria-hidden='true'>" +
          "✓" +
        "</div>" +

        "<h1 style='font-size:30px'>" +
          "Payment successful" +
        "</h1>" +

        "<p class='note'>" +
          "Your payment was verified and your order was received." +
        "</p>" +

        "<div class='oid'>" +
          esc(
            lastOrder.reference ||
            lastOrder.id ||
            "Confirmed"
          ) +
        "</div>" +

        "<div class='kv' style='width:100%'>" +

          "<div>" +
            "<span class='k'>Payment status</span>" +
            "<span class='v'>Paid</span>" +
          "</div>" +

          "<div>" +
            "<span class='k'>Paid with</span>" +
            "<span class='v'>" +
              esc(
                lastOrder.method ||
                "Paystack"
              ) +
            "</span>" +
          "</div>" +

          "<div>" +
            "<span class='k'>Total</span>" +
            "<span class='v'>" +
              money(
                Number(
                  lastOrder.total || 0
                )
              ) +
            "</span>" +
          "</div>" +

          "<div>" +
            "<span class='k'>Delivering to</span>" +
            "<span class='v'>" +
              esc(
                lastOrder.city ||
                "Provided address"
              ) +
            "</span>" +
          "</div>" +

        "</div>" +

        "<a class='btn' href='#home'>" +
          "Keep shopping" +
        "</a>" +

      "</div>" +
    "</div>";
}

  /* ---------- router ---------- */
  function route() {
    try {
    var parts = (location.hash || "").replace("#", "").split("/"); var r = parts[0];
                   } catch(err) { 
                      console.error(err);
                      document.getElementById("view").innerHTML =
                       '<div class="blk empty"> Routing error </div>' ;
                      }
                    
    if (["login", "home", "watch", "search", "categories", "cart", "checkout", "done"].indexOf(r) < 0) r = user ? "home" : "login";
    if (!user && r !== "login") { location.hash = "#login"; return; }
    if (user && r === "login") { location.hash = "#home"; return; }
    renderNav(r); renderTabs(r);
    if (r === "login") viewLogin(); else if (r === "home") viewHome(); else if (r === "watch") viewWatch(+parts[1]);
    else if (r === "search") viewSearch(); else if (r === "categories") viewCategories(); else if (r === "cart") viewCart(); else if (r === "checkout") viewCheckout(); else viewDone();
    hasLive = !!document.querySelector("svg.live");
    if (r !== "watch") {
      window.scrollTo({
        top: 0,
        behavior: reduce
          ? "auto"
          : "smooth"
      });
    }
    if (pendingScroll) { pendingScroll = false; scrollShop(); }
  }
  window.addEventListener("hashchange", route);
  window.addEventListener("beforeunload",
    function () {
      clearTimeout(toastTimer);
    }
  );


  /*--------- copy fallback ----------*/
  function copyText(text) {
    if (
      navigator.clipboard && window.isSecureContext
    ){
     navigator.clipboard.writeText(text)
     .then(function() {toast("Address copied");});
      return;
    }
    var ta =
    document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  /* ---------- events ---------- */
async function addToCart(id, strap, qty) {
  const token = getToken();

  if (!token) {
    toast("Please log in again");
    location.hash = "#login";
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/cart/add?product_id=${encodeURIComponent(id)}&quantity=${encodeURIComponent(qty)}`,
      {
        method: "POST",
        headers: authHeaders()
      }
    );

    const data = await response.json();

    if (!response.ok) {
      toast(
        data.detail ||
        data.error ||
        "Unable to add item"
      );

      return;
    }

   const items = await fetchCart();

    const count = items.reduce(function (total, item) {
      return total + Number(item.quantity || 0);
    }, 0);

    // Update local cart state & trigger standard badge update
    cart = {};
    items.forEach(item => {
      cart[`${item.product_id}|standard`] = item.quantity;
    });
    saveCart();
     updateServerCartBadge(count);

    toast(data.message || "Added to cart");

  } catch (error) {
    console.error("Add-to-cart error:", error);
    toast("Unable to connect to cart");
  }
}
  
  document.addEventListener("click", function (e) {
    var t = e.target.closest(
  "[data-add]," +
  "[data-addpd]," +
  "[data-pdq]," +
  "[data-strap]," +
  "[data-cat]," +
  "[data-filter]," +
  "[data-qty]," +
  "[data-remove]," +
  "[data-server-remove]," +
  "[data-logout]," +
  "[data-mode]," +
  "[data-togglepw]," +
  "[data-copy]," +
  "[data-jump]," +
  "[data-dial]," +
  "[data-guest]," +
  "[data-tab]," +
  "[data-sheetcat]," +
  "[data-q]"
);
    if (!t) return;
    var d = t.dataset;
    if (d.tab) {
      var target = { home: "#home", search: "#search", cats: "#categories", cart: "#cart" }[d.tab];
      if ((location.hash || "") === target) scrollTop0(); else location.hash = target;
    }
    else if (d.sheetcat) goShop(d.sheetcat, "");
    else if (d.q) { searchQ = d.q; var si = $("#page-search"); if (si) si.value = searchQ; renderSearchResults(); }
    else if (d.add) addToCart(+d.add, byId[d.add].strap, 1);
    else if (d.addpd) { addToCart(pd.id, pd.strap, pd.qty); }
    else if (d.pdq) { pd.qty = Math.max(1, Math.min(9, pd.qty + +d.pdq)); renderPD(); }
    else if (d.strap) { pd.strap = d.strap; renderPD(); }
    else if (d.cat) { shop.cat = d.cat; shop.q = ""; shop.sort = "featured"; viewHome(); scrollShop(); }
    else if (d.filter) { shop.cat = d.filter; viewHome(); }
    else if (d.qty) { var q = (cart[d.qty] || 0) + Number(d.d); if (q <= 0){delete cart[d.qty];} else { cart[d.qty] = q;}saveCart();updateBadge(); viewCart();}
    else if (d.serverRemove) {
  fetch(
    `${API_URL}/cart/${encodeURIComponent(d.serverRemove)}`,
    {
      method: "DELETE",
      headers: authHeaders()
    }
  )
  .then(function (response) {
    return response.json();
  })
  .then(function () {
    toast("Item removed");
    viewCart();
  })
  .catch(function (error) {
    console.error("Remove-cart error:", error);
    toast("Unable to remove item");
  });
}
    else if (d.remove) { delete cart[d.remove]; saveCart(); viewCart(); updateBadge(); }
    else if (d.logout) { user = null; store.del("bh_user");  localStorage.removeItem("token"); location.hash = "#login"; }
    else if (d.mode) { authMode = d.mode; viewLogin(); }
    else if (d.guest) { user = { name: "Guest", email: "" }; store.set("bh_user", user); location.hash = "#home"; }
    else if (d.dial) { loginDial = d.dial; $("#lw").innerHTML = liveWatch(); document.querySelectorAll("[data-dial]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.dial === loginDial); }); tick(); }
    else if (d.togglepw) { var inp = $("#f-pass"), show = inp.type === "password"; inp.type = show ? "text" : "password"; t.textContent = show ? "Hide" : "Show"; t.setAttribute("aria-label", show ? "Hide password" : "Show password"); }
    else if (d.copy) { var txt = $("#" + d.copy).textContent; try { navigator.clipboard.writeText(txt).then(function () { toast("Address copied"); }, function () { toast("Select the address and copy it manually"); }); } catch (err) { toast("Select the address and copy it manually"); } }
    else if (d.jump) { e.preventDefault(); scrollShop(); }
  });
  document.addEventListener("submit", function (e) {
    if (e.target.id === "authForm") submitAuth(e);
    else if (e.target.id === "payForm") submitPay(e);
    else if (e.target.id === "promoForm") applyPromo(e);
  });
 document.addEventListener(
  "input",
  function (e) {
    var el = e.target;

    if (el.id === "search") {
      shop.q = el.value;
      renderGrid();
    }
  }
);

  document.addEventListener(
  "change",
  function (e) {
    if (e.target.id === "sort") {
      shop.sort = e.target.value;
      renderGrid();
    }
  }
);
/* document.addEventListener("click", function (e) {
  // Check if a payment method label or button was clicked
  var methodLabel = e.target.closest("label.method") || e.target.closest("[data-panel-target]") || e.target.closest("input[name='method']");
  
  if (methodLabel) {
    var radioInput = methodLabel.querySelector("input[type='radio']") || methodLabel;
    if (radioInput && radioInput.value) {
      // Check the radio input
      var targetRadio = document.querySelector(`input[name='method'][value='${radioInput.value}']`);
      if (targetRadio) targetRadio.checked = true;

      // Toggle corresponding data-panel visibility
      document.querySelectorAll("[data-panel]").forEach(function (p) {
        if (p.dataset.panel === radioInput.value) {
          p.removeAttribute("hidden");
          p.style.display = "block";
        } else {
          p.setAttribute("hidden", "true");
          p.style.display = "none";
        }
      });
    }
  }
});*/

  /* ---------- live clock + mosaic ---------- */
  function setRot(svg, sel, a) { var g = svg.querySelector(sel); if (g) g.setAttribute("transform", "rotate(" + a + " 100 140)"); }
  function tick() {
    var now = new Date(), s = now.getSeconds() + (reduce ? 0 : now.getMilliseconds() / 1000), m = now.getMinutes() + s / 60, h = (now.getHours() % 12) + m / 60;
    document.querySelectorAll("svg.live").forEach(function (sv) { setRot(sv, ".hh", h * 30); setRot(sv, ".hm", m * 6); setRot(sv, ".hs", s * 6); });
    var c = $("#clock"); if (c) c.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
  }
  var hasLive = false;
  function loop() { if (hasLive) tick(); requestAnimationFrame(loop); }
  setInterval(function () {
    var tiles = document.querySelectorAll(".mosaic i");
    if (!tiles.length || reduce || document.hidden) return;
    for (var n = 0; n < 4; n++) { var el = tiles[Math.floor(Math.random() * tiles.length)]; el.className = "t" + rt(); }
  }, 900);

  /* search page */
  document.addEventListener("input", function (e) { if (e.target.id === "page-search") { searchQ = e.target.value; renderSearchResults(); } });

  async function handlePaymentCallback() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const isPaymentCallback =
    params.get("payment_callback") === "1";

  
  if (!isPaymentCallback) {
    return false;
  }
  const reference =
    params.get("reference") ||
    params.get("trxref") ||
    sessionStorage.getItem(
      "payment_reference"
    );

  $("#view").innerHTML =
    "<div class='page'>" +
      "<div class='blk empty'>" +
        "<h2>Confirming payment...</h2>" +
        "<p>Please wait while Blockhour verifies your payment.</p>" +
      "</div>" +
    "</div>";

  if (!reference) {
    $("#view").innerHTML =
      "<div class='page'>" +
        "<div class='blk empty'>" +
          "<h2>Payment reference missing</h2>" +
          "<p>Blockhour could not identify this transaction.</p>" +
          "<br>" +
          "<a class='btn' href='#cart'>" +
            "Return to cart" +
          "</a>" +
        "</div>" +
      "</div>";

    return true;
  }

  try {
    const response = await fetch(
      `${API_URL}/payments/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: authHeaders()
      }
    );

    const result =
      await response.json();

    console.log(
      "Callback verification:",
      result
    );

    if (!response.ok) {
      throw new Error(
        result.detail ||
        result.message ||
        "Payment verification failed"
      );
    }

    if (
      result.payment_status !== "success"
    ) {
      throw new Error(
        "Payment has not been confirmed. " +
        "Current status: " +
        (
          result.payment_status ||
          "unknown"
        )
      );
    }

    let pendingOrder = {};

    const storedPendingOrder =
      sessionStorage.getItem(
        "pending_order"
      );

    if (storedPendingOrder) {
      try {
        pendingOrder =
          JSON.parse(storedPendingOrder);
      } catch (error) {
        console.error(
          "Pending order read error:",
          error
        );
      }
    }

    lastOrder = {
      id:
        result.order_id ||
        pendingOrder.order_id ||
        pendingOrder.id,

      reference:
        result.reference ||
        reference,

      method:
        result.channel ||
        "Paystack",

      total:
        result.total_amount ||
        pendingOrder.total_amount ||
        0,

      city:
        pendingOrder.city ||
        "Provided address"
    };

    sessionStorage.setItem(
      "last_order",
      JSON.stringify(lastOrder)
    );

    sessionStorage.removeItem(
      "payment_reference"
    );

    sessionStorage.removeItem(
      "pending_order"
    );

    cart = {};
    store.del("bh_cart");

    updateServerCartBadge(0);

    /*
     * Remove callback parameters and display
     * the success route.
     */
    history.replaceState(
      null,
      "",
      window.location.pathname +
      "#done"
    );

    route();

    return true;

  } catch (error) {
    console.error(
      "Payment callback error:",
      error
    );

    $("#view").innerHTML =
      "<div class='page'>" +
        "<div class='blk empty'>" +
          "<h2>Payment could not be confirmed</h2>" +
          "<p>" +
            esc(
              error.message ||
              "Payment verification failed"
            ) +
          "</p>" +
          "<br>" +
          "<a class='btn' href='#cart'>" +
            "Return to cart" +
          "</a>" +
        "</div>" +
      "</div>";

    return true;
  }
}

  /* Fetch products from FastAPI backend first, then initialize the router*/
async function init() {
  try {
    await loadProducts();
  } catch (error) {
    console.error(
      "Startup product error:",
      error
    );
  }

  const handledCallback =
    await handlePaymentCallback();

  if (!handledCallback) {
    if (!location.hash) {
      history.replaceState(
        null,
        "",
        window.location.pathname +
        (user ? "#home" : "#login")
      );
    }

    route();
  }

  if (reduce) {
    setInterval(function () {
      if (hasLive) {
        tick();
      }
    }, 1000);
  } else {
    loop();
  }
}

init();

})();
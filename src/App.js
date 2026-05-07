import { useState, useCallback, createContext, useContext, useReducer } from "react";

// ============================================================
// TIER 3: DATABASE LAYER
// ============================================================
const DB = {
  users: [
    { id: 1, name: "John Doe", email: "user@shop.com", password: "123456", avatar: "JD" }
  ],
  products: [
    { id: 1,  name: "Wireless Headphones",   price: 59,  category: "Electronics", stock: 20, rating: 4.5, image: "🎧", desc: "High quality sound with noise cancellation and long battery life." },
    { id: 2,  name: "Running Shoes",          price: 45,  category: "Sports",      stock: 15, rating: 4.3, image: "👟", desc: "Lightweight and comfortable shoes for everyday running." },
    { id: 3,  name: "Coffee Mug",             price: 12,  category: "Kitchen",     stock: 50, rating: 4.7, image: "☕", desc: "Ceramic mug that keeps your drink warm for hours." },
    { id: 4,  name: "Desk Lamp",              price: 25,  category: "Home",        stock: 30, rating: 4.4, image: "💡", desc: "LED desk lamp with adjustable brightness and USB port." },
    { id: 5,  name: "Backpack",               price: 35,  category: "Fashion",     stock: 18, rating: 4.6, image: "🎒", desc: "Durable waterproof backpack with multiple compartments." },
    { id: 6,  name: "Sunglasses",             price: 20,  category: "Fashion",     stock: 25, rating: 4.2, image: "🕶️", desc: "UV400 protection sunglasses, lightweight and stylish." },
    { id: 7,  name: "Water Bottle",           price: 18,  category: "Sports",      stock: 40, rating: 4.8, image: "🍶", desc: "Stainless steel insulated bottle, keeps cold 24 hours." },
    { id: 8,  name: "Notebook Set",           price: 10,  category: "Stationery",  stock: 60, rating: 4.5, image: "📓", desc: "Pack of 3 ruled notebooks, 200 pages each." },
    { id: 9,  name: "Phone Stand",            price: 15,  category: "Electronics", stock: 35, rating: 4.3, image: "📱", desc: "Adjustable aluminium phone stand for desk use." },
    { id: 10, name: "Yoga Mat",               price: 28,  category: "Sports",      stock: 22, rating: 4.6, image: "🧘", desc: "Non-slip thick yoga mat with carrying strap." },
    { id: 11, name: "Scented Candle",         price: 14,  category: "Home",        stock: 45, rating: 4.7, image: "🕯️", desc: "Soy wax candle with calming lavender fragrance." },
    { id: 12, name: "Bluetooth Speaker",      price: 40,  category: "Electronics", stock: 12, rating: 4.4, image: "🔊", desc: "Portable waterproof speaker with 12 hour playtime." },
  ],
  orders: [],
  nextUserId: 2,
  nextOrderId: 1,
};

// ============================================================
// TIER 2: SERVICE / BACKEND LAYER
// ============================================================
const AuthService = {
  login(email, password) {
    const user = DB.users.find(u => u.email === email && u.password === password);
    if (!user) throw new Error("Invalid email or password");
    const { password: _, ...safe } = user;
    return { token: `tok_${user.id}_${Date.now()}`, user: safe };
  },
  register(name, email, password) {
    if (DB.users.find(u => u.email === email)) throw new Error("Email already in use");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");
    const user = { id: DB.nextUserId++, name, email, password, avatar: name.slice(0,2).toUpperCase() };
    DB.users.push(user);
    const { password: _, ...safe } = user;
    return { token: `tok_${user.id}_${Date.now()}`, user: safe };
  }
};

const ProductService = {
  getCategories() { return ["All", ...new Set(DB.products.map(p => p.category))]; },
  search(query, category) {
    return DB.products.filter(p => {
      const q = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.desc.toLowerCase().includes(query.toLowerCase());
      const c = !category || category === "All" || p.category === category;
      return q && c;
    });
  }
};

const OrderService = {
  create(userId, items, address) {
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const order = { id: DB.nextOrderId++, userId, items: [...items], total, address, status: "Confirmed", placedAt: new Date().toISOString() };
    items.forEach(item => {
      const p = DB.products.find(p => p.id === item.id);
      if (p) p.stock = Math.max(0, p.stock - item.qty);
    });
    DB.orders.push(order);
    return order;
  },
  getUserOrders(userId) {
    return DB.orders.filter(o => o.userId === userId).sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  }
};

// ============================================================
// GLOBAL STATE CONTEXT
// ============================================================
const Ctx = createContext(null);

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const ex = state.find(i => i.id === action.item.id);
      if (ex) return state.map(i => i.id === action.item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...state, { ...action.item, qty: 1 }];
    }
    case "REMOVE":     return state.filter(i => i.id !== action.id);
    case "UPDATE_QTY": return state.map(i => i.id === action.id ? { ...i, qty: action.qty } : i).filter(i => i.qty > 0);
    case "CLEAR":      return [];
    default:           return state;
  }
}

function AppProvider({ children }) {
  const [auth, setAuth]   = useState(null);
  const [cart, dispatch]  = useReducer(cartReducer, []);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);

  const login    = (e, p) => { const r = AuthService.login(e, p); setAuth(r); return r; };
  const register = (n, e, p) => { const r = AuthService.register(n, e, p); setAuth(r); return r; };
  const logout   = () => { setAuth(null); dispatch({ type: "CLEAR" }); };
  const addToCart = useCallback((product) => {
    dispatch({ type: "ADD", item: product });
    showToast(`${product.name} added to cart!`);
  }, [showToast]);

  return (
    <Ctx.Provider value={{ auth, login, register, logout, cart, dispatch, addToCart, showToast }}>
      {children}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 9999,
          background: toast.type === "error" ? "#e53e3e" : "#38a169",
          color: "#fff", padding: "11px 20px", borderRadius: 10,
          fontSize: 14, fontWeight: 600, fontFamily: "'Nunito', sans-serif",
          boxShadow: "0 6px 24px rgba(0,0,0,0.18)", animation: "toastIn 0.3s ease"
        }}>{toast.msg}</div>
      )}
    </Ctx.Provider>
  );
}

const useApp = () => useContext(Ctx);

// ============================================================
// TIER 1: FRONTEND COMPONENTS
// ============================================================
const S = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:      #f0f4ff;
    --white:   #ffffff;
    --primary: #4f46e5;
    --primary-dark: #3730a3;
    --accent:  #f59e0b;
    --text:    #1e1b4b;
    --muted:   #6b7280;
    --border:  #e5e7eb;
    --card:    #ffffff;
    --radius:  14px;
    --shadow:  0 2px 16px rgba(79,70,229,0.08);
    --shadow-lg: 0 8px 40px rgba(79,70,229,0.15);
  }
  body { background: var(--bg); font-family: 'Nunito', sans-serif; color: var(--text); }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
  @keyframes toastIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
  @keyframes pop     { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }
  .fade  { animation: fadeUp 0.4s ease both; }
  .pop   { animation: pop   0.3s ease both; }
  input, select {
    font-family: 'Nunito', sans-serif; font-size: 14px; color: var(--text);
    background: var(--white); border: 1.5px solid var(--border);
    border-radius: 10px; padding: 10px 14px; outline: none;
    width: 100%; transition: border-color 0.2s, box-shadow 0.2s;
  }
  input:focus, select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79,70,229,0.12); }
  input::placeholder { color: #9ca3af; }
  button { cursor: pointer; font-family: 'Nunito', sans-serif; border: none; outline: none; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
`;

// ── NAV ──────────────────────────────────────────────────────
function Nav({ page, setPage }) {
  const { auth, logout, cart } = useApp();
  const count = cart.reduce((s, i) => s + i.qty, 0);
  return (
    <nav style={{
      background: "var(--white)", borderBottom: "1px solid var(--border)",
      position: "sticky", top: 0, zIndex: 100,
      boxShadow: "0 1px 12px rgba(79,70,229,0.07)"
    }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <button onClick={() => setPage("shop")} style={{ background: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛍️</div>
          <span style={{ fontWeight: 900, fontSize: 20, color: "var(--primary)", letterSpacing: "-0.3px" }}>ShopEasy</span>
        </button>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {auth ? (
            <>
              <NBtn active={page==="shop"}   onClick={() => setPage("shop")}>Shop</NBtn>
              <NBtn active={page==="orders"} onClick={() => setPage("orders")}>Orders</NBtn>
              <button onClick={() => setPage("cart")} style={{
                background: page === "cart" ? "var(--primary)" : "var(--bg)",
                color: page === "cart" ? "#fff" : "var(--muted)",
                borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13,
                display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                border: "1.5px solid var(--border)"
              }}>
                🛒 Cart
                {count > 0 && <span style={{ background: "var(--accent)", color: "#fff", borderRadius: 20, fontSize: 11, fontWeight: 800, padding: "1px 7px", minWidth: 20, textAlign: "center" }}>{count}</span>}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), #818cf8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{auth.user.avatar}</div>
                <button onClick={logout} style={{ background: "none", color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>Logout</button>
              </div>
            </>
          ) : (
            <>
              <NBtn active={page==="login"} onClick={() => setPage("login")}>Login</NBtn>
              <button onClick={() => setPage("register")} style={{ background: "var(--primary)", color: "#fff", borderRadius: 10, padding: "9px 20px", fontWeight: 800, fontSize: 13 }}>Sign Up</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function NBtn({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "rgba(79,70,229,0.08)" : "none",
      color: active ? "var(--primary)" : "var(--muted)",
      borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, transition: "all 0.2s"
    }}>{children}</button>
  );
}

// ── AUTH ─────────────────────────────────────────────────────
function AuthPage({ mode, setPage }) {
  const { login, register, showToast } = useApp();
  const [form, setForm]   = useState({ name: "", email: mode === "login" ? "user@shop.com" : "", password: mode === "login" ? "123456" : "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState("");

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      if (mode === "login") { login(form.email, form.password); showToast("Welcome back!"); }
      else { register(form.name, form.email, form.password); showToast("Account created!"); }
      setPage("shop");
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fade" style={{ minHeight: "82vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--white)", borderRadius: 20, padding: "40px 44px", width: "100%", maxWidth: 400, boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>{mode === "login" ? "👋" : "🎉"}</div>
          <h2 style={{ fontWeight: 900, fontSize: 24, color: "var(--text)" }}>{mode === "login" ? "Welcome back!" : "Create account"}</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 5 }}>{mode === "login" ? "Sign in to your account" : "Join ShopEasy today"}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "register" && (
            <div>
              <label style={lbl}>Full Name</label>
              <input placeholder="Your name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
            </div>
          )}
          <div>
            <label style={lbl}>Email Address</label>
            <input type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
          </div>
          <div>
            <label style={lbl}>Password</label>
            <input type="password" placeholder="••••••" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} />
          </div>
          {err && <div style={{ background: "#fff5f5", border: "1px solid #feb2b2", borderRadius: 9, padding: "9px 13px", color: "#c53030", fontSize: 13 }}>{err}</div>}
          {mode === "login" && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 9, padding: "9px 13px", fontSize: 12, color: "var(--muted)" }}>
              Demo: <strong style={{ color: "var(--primary)" }}>user@shop.com</strong> / <strong style={{ color: "var(--primary)" }}>123456</strong>
            </div>
          )}
          <button onClick={submit} disabled={loading} style={{
            background: "var(--primary)", color: "#fff", borderRadius: 11,
            padding: "13px", fontWeight: 800, fontSize: 15, marginTop: 4,
            opacity: loading ? 0.7 : 1, transition: "opacity 0.2s"
          }}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "var(--muted)" }}>
          {mode === "login" ? "No account? " : "Already registered? "}
          <button onClick={() => setPage(mode === "login" ? "register" : "login")} style={{ background: "none", color: "var(--primary)", fontWeight: 800, fontSize: 13 }}>
            {mode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}
const lbl = { fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 };

// ── SHOP ─────────────────────────────────────────────────────
function ShopPage({ setPage, setProduct }) {
  const { addToCart, auth } = useApp();
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort]         = useState("default");
  const cats = ProductService.getCategories();
  let products = ProductService.search(search, category);
  if (sort === "asc")    products.sort((a,b) => a.price - b.price);
  if (sort === "desc")   products.sort((a,b) => b.price - a.price);
  if (sort === "rating") products.sort((a,b) => b.rating - a.rating);

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 20px" }} className="fade">
      {/* Banner */}
      <div style={{
        background: "linear-gradient(120deg, var(--primary) 0%, #818cf8 100%)",
        borderRadius: 18, padding: "36px 36px", marginBottom: 32, position: "relative", overflow: "hidden"
      }}>
        <div style={{ position: "absolute", right: 30, top: "50%", transform: "translateY(-50%)", fontSize: 80, opacity: 0.15 }}>🛍️</div>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Welcome to ShopEasy</p>
        <h1 style={{ color: "#fff", fontWeight: 900, fontSize: "clamp(22px,4vw,40px)", lineHeight: 1.15, marginBottom: 12 }}>
          Everything you need,<br />all in one place.
        </h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, maxWidth: 380 }}>
          Browse our wide range of products — quality items at great prices, delivered fast.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        <input placeholder="🔍  Search products..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: "1 1 200px", maxWidth: 260 }} />
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {cats.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              background: category === cat ? "var(--primary)" : "var(--white)",
              color: category === cat ? "#fff" : "var(--muted)",
              border: "1.5px solid var(--border)", borderRadius: 20,
              padding: "6px 15px", fontSize: 12, fontWeight: 700, transition: "all 0.2s"
            }}>{cat}</button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ flex: "0 0 160px" }}>
          <option value="default">Sort: Default</option>
          <option value="asc">Price: Low to High</option>
          <option value="desc">Price: High to Low</option>
          <option value="rating">Top Rated</option>
        </select>
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <div style={{ textAlign: "center", padding: "70px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: 50, marginBottom: 14 }}>🔍</div>
          <p style={{ fontSize: 16, fontWeight: 600 }}>No products found.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
          {products.map((p, i) => <Card key={p.id} p={p} i={i} onView={() => { setProduct(p); setPage("product"); }} onAdd={() => auth ? addToCart(p) : setPage("login")} />)}
        </div>
      )}
    </div>
  );
}

function Card({ p, i, onView, onAdd }) {
  const [h, setH] = useState(false);
  return (
    <div className="fade" style={{
      background: "var(--card)", borderRadius: "var(--radius)",
      border: `1.5px solid ${h ? "var(--primary)" : "var(--border)"}`,
      overflow: "hidden", cursor: "pointer",
      transform: h ? "translateY(-4px)" : "none",
      boxShadow: h ? "var(--shadow-lg)" : "var(--shadow)",
      transition: "all 0.22s", animationDelay: `${i * 35}ms`
    }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onView}>
      <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)", height: 160, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, position: "relative" }}>
        {p.image}
        {p.stock <= 3 && p.stock > 0 && <span style={{ position: "absolute", top: 10, right: 10, background: "#fef3c7", color: "#92400e", fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 20 }}>LOW STOCK</span>}
        {p.stock === 0 && <span style={{ position: "absolute", top: 10, right: 10, background: "#fee2e2", color: "#991b1b", fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 20 }}>SOLD OUT</span>}
      </div>
      <div style={{ padding: "14px 16px 12px" }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: "var(--primary)", letterSpacing: 1.2, textTransform: "uppercase" }}>{p.category}</span>
        <h3 style={{ fontWeight: 800, fontSize: 15, margin: "4px 0 6px", lineHeight: 1.3 }}>{p.name}</h3>
        <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, lineHeight: 1.5 }}>{p.desc.slice(0,65)}...</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "var(--primary)" }}>${p.price}</div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>★ {p.rating} rating</div>
          </div>
          <button onClick={e => { e.stopPropagation(); onAdd(); }} disabled={p.stock === 0} style={{
            background: p.stock === 0 ? "var(--border)" : "var(--primary)",
            color: p.stock === 0 ? "var(--muted)" : "#fff",
            borderRadius: 9, padding: "8px 14px", fontSize: 12, fontWeight: 800, transition: "opacity 0.2s"
          }}>
            {p.stock === 0 ? "Sold Out" : "+ Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PRODUCT DETAIL ───────────────────────────────────────────
function ProductPage({ product, setPage }) {
  const { addToCart, auth } = useApp();
  const [qty, setQty] = useState(1);
  if (!product) return null;
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 20px" }} className="fade">
      <button onClick={() => setPage("shop")} style={{ background: "none", color: "var(--muted)", fontWeight: 700, fontSize: 13, marginBottom: 22 }}>← Back to shop</button>
      <div style={{ background: "var(--white)", borderRadius: 20, padding: "36px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}>
        <div style={{ background: "linear-gradient(135deg, #eff6ff, #e0e7ff)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 100, minHeight: 280 }}>{product.image}</div>
        <div>
          <span style={{ fontSize: 10, fontWeight: 800, color: "var(--primary)", letterSpacing: 1.5, textTransform: "uppercase" }}>{product.category}</span>
          <h1 style={{ fontWeight: 900, fontSize: 28, margin: "8px 0 12px", lineHeight: 1.2 }}>{product.name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ color: "#f59e0b", fontSize: 14 }}>{"★".repeat(Math.floor(product.rating))}{"☆".repeat(5 - Math.floor(product.rating))}</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{product.rating} stars</span>
          </div>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.75, marginBottom: 22 }}>{product.desc}</p>
          <div style={{ fontWeight: 900, fontSize: 30, color: "var(--primary)", marginBottom: 22 }}>${product.price}</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>QTY</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg)", borderRadius: 9, padding: "5px 12px", border: "1.5px solid var(--border)" }}>
              <button onClick={() => setQty(q => Math.max(1, q-1))} style={{ background: "none", fontSize: 17, color: "var(--primary)", width: 24, display:"flex", alignItems:"center", justifyContent:"center" }}>-</button>
              <span style={{ fontWeight: 800, minWidth: 18, textAlign: "center" }}>{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock, q+1))} style={{ background: "none", fontSize: 17, color: "var(--primary)", width: 24, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
            </div>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{product.stock} available</span>
          </div>
          <button onClick={() => { for(let i=0; i<qty; i++) auth ? addToCart(product) : setPage("login"); }} style={{
            background: "var(--primary)", color: "#fff", borderRadius: 12, padding: "13px",
            fontWeight: 800, fontSize: 15, width: "100%"
          }}>Add to Cart</button>
        </div>
      </div>
    </div>
  );
}

// ── CART ─────────────────────────────────────────────────────
function CartPage({ setPage }) {
  const { cart, dispatch, auth, showToast } = useApp();
  const [step, setStep]   = useState("cart");
  const [addr, setAddr]   = useState({ name: auth?.user?.name || "", line1: "", city: "", state: "", pin: "" });
  const [busy, setBusy]   = useState(false);
  const [done, setDone]   = useState(null);

  const sub      = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = sub >= 100 ? 0 : 5;
  const total    = sub + shipping;

  if (done) return (
    <div className="pop" style={{ maxWidth: 480, margin: "60px auto", padding: 20, textAlign: "center" }}>
      <div style={{ background: "var(--white)", borderRadius: 20, padding: 44, boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 56, marginBottom: 14 }}>✅</div>
        <h2 style={{ fontWeight: 900, fontSize: 24, marginBottom: 8 }}>Order Placed!</h2>
        <p style={{ color: "var(--muted)", marginBottom: 6 }}>Order #{done.id} is confirmed.</p>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 26 }}>Thank you for shopping with ShopEasy!</p>
        <div style={{ background: "var(--bg)", borderRadius: 12, padding: 18, marginBottom: 22, textAlign: "left" }}>
          {done.items.map(i => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 7 }}>
              <span>{i.image} {i.name} ×{i.qty}</span>
              <span style={{ fontWeight: 700 }}>${(i.price * i.qty).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 16, color: "var(--primary)" }}>
            <span>Total</span><span>${done.total.toFixed(2)}</span>
          </div>
        </div>
        <button onClick={() => setPage("orders")} style={{ background: "var(--primary)", color: "#fff", borderRadius: 12, padding: "12px 28px", fontWeight: 800, fontSize: 14, width: "100%" }}>View Orders</button>
        <button onClick={() => setPage("shop")} style={{ background: "none", color: "var(--muted)", fontSize: 13, marginTop: 10, width: "100%" }}>Continue Shopping</button>
      </div>
    </div>
  );

  if (cart.length === 0) return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 20, textAlign: "center" }} className="fade">
      <div style={{ fontSize: 58, marginBottom: 14 }}>🛒</div>
      <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>Your cart is empty</h2>
      <p style={{ color: "var(--muted)", marginBottom: 26 }}>Add items to get started!</p>
      <button onClick={() => setPage("shop")} style={{ background: "var(--primary)", color: "#fff", borderRadius: 12, padding: "12px 28px", fontWeight: 800, fontSize: 14 }}>Browse Products</button>
    </div>
  );

  const place = async () => {
    if (!addr.name || !addr.line1 || !addr.city || !addr.pin) { showToast("Fill all address fields", "error"); return; }
    setBusy(true);
    await new Promise(r => setTimeout(r, 700));
    const order = OrderService.create(auth.user.id, cart, addr);
    dispatch({ type: "CLEAR" });
    setDone(order);
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "36px 20px" }} className="fade">
      <h1 style={{ fontWeight: 900, fontSize: 26, marginBottom: 26 }}>{step === "cart" ? "🛒 Your Cart" : "📦 Delivery Info"}</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22, alignItems: "start" }}>
        <div>
          {step === "cart" && cart.map(item => (
            <div key={item.id} style={{ background: "var(--white)", borderRadius: 14, padding: 16, marginBottom: 12, display: "flex", alignItems: "center", gap: 14, boxShadow: "var(--shadow)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 36, background: "var(--bg)", borderRadius: 10, width: 58, height: 58, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.image}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700 }}>${item.price} each</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg)", borderRadius: 9, padding: "4px 10px", border: "1.5px solid var(--border)" }}>
                <button onClick={() => dispatch({ type: "UPDATE_QTY", id: item.id, qty: item.qty - 1 })} style={{ background: "none", fontSize: 16, color: "var(--primary)", width: 20, display:"flex", alignItems:"center", justifyContent:"center" }}>-</button>
                <span style={{ fontWeight: 800, minWidth: 16, textAlign: "center", fontSize: 14 }}>{item.qty}</span>
                <button onClick={() => dispatch({ type: "UPDATE_QTY", id: item.id, qty: item.qty + 1 })} style={{ background: "none", fontSize: 16, color: "var(--primary)", width: 20, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
              </div>
              <div style={{ fontWeight: 900, fontSize: 15, color: "var(--primary)", minWidth: 55, textAlign: "right" }}>${(item.price * item.qty).toFixed(2)}</div>
              <button onClick={() => dispatch({ type: "REMOVE", id: item.id })} style={{ background: "none", color: "#e53e3e", fontSize: 18, padding: "4px 8px" }}>×</button>
            </div>
          ))}

          {step === "address" && (
            <div style={{ background: "var(--white)", borderRadius: 16, padding: 24, boxShadow: "var(--shadow)", border: "1px solid var(--border)" }}>
              <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 18 }}>Shipping Address</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[["Full Name","name"],["Address","line1"],["City","city"],["State","state"],["PIN / ZIP","pin"]].map(([label, key]) => (
                  <div key={key}>
                    <label style={lbl}>{label}</label>
                    <input placeholder={label} value={addr[key]} onChange={e => setAddr(a => ({...a, [key]: e.target.value}))} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div style={{ background: "var(--white)", borderRadius: 16, padding: 22, boxShadow: "var(--shadow)", border: "1px solid var(--border)" }}>
          <h3 style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>Order Summary</h3>
          {cart.map(i => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 7, color: "var(--muted)" }}>
              <span>{i.name} ×{i.qty}</span><span>${(i.price * i.qty).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, color: "var(--muted)" }}>
              <span>Subtotal</span><span>${sub.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14, color: "var(--muted)" }}>
              <span>Shipping</span>
              <span style={{ color: shipping === 0 ? "#38a169" : "inherit", fontWeight: 700 }}>{shipping === 0 ? "FREE" : `$${shipping}`}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 19, color: "var(--primary)" }}>
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
          </div>
          {sub < 100 && <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 7 }}>Add ${(100-sub).toFixed(2)} more for free shipping!</p>}

          {step === "cart" ? (
            <button onClick={() => auth ? setStep("address") : setPage("login")} style={{
              background: "var(--primary)", color: "#fff", borderRadius: 12,
              padding: "13px", fontWeight: 800, fontSize: 14, width: "100%", marginTop: 18
            }}>Checkout →</button>
          ) : (
            <>
              <button onClick={place} disabled={busy} style={{
                background: "#38a169", color: "#fff", borderRadius: 12, padding: "13px",
                fontWeight: 800, fontSize: 14, width: "100%", marginTop: 18, opacity: busy ? 0.7 : 1
              }}>{busy ? "Placing..." : "✓ Place Order"}</button>
              <button onClick={() => setStep("cart")} style={{ background: "none", color: "var(--muted)", fontSize: 12, marginTop: 10, width: "100%" }}>← Back</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ORDERS ───────────────────────────────────────────────────
function OrdersPage() {
  const { auth } = useApp();
  const orders = OrderService.getUserOrders(auth?.user?.id);
  if (orders.length === 0) return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 20, textAlign: "center" }} className="fade">
      <div style={{ fontSize: 56, marginBottom: 14 }}>📦</div>
      <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>No orders yet</h2>
      <p style={{ color: "var(--muted)" }}>Your order history will appear here.</p>
    </div>
  );
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "36px 20px" }} className="fade">
      <h1 style={{ fontWeight: 900, fontSize: 26, marginBottom: 26 }}>📦 My Orders</h1>
      {orders.map(o => (
        <div key={o.id} style={{ background: "var(--white)", borderRadius: 16, padding: 22, marginBottom: 14, boxShadow: "var(--shadow)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Order #{o.id}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{new Date(o.placedAt).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })}</div>
            </div>
            <span style={{ background: "#f0fff4", color: "#276749", border: "1px solid #9ae6b4", padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 800 }}>✓ {o.status}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {o.items.map(i => (
              <div key={i.id} style={{ background: "var(--bg)", borderRadius: 9, padding: "5px 12px", fontSize: 12, fontWeight: 600, border: "1px solid var(--border)" }}>
                {i.image} {i.name} ×{i.qty}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>📍 {o.address.line1}, {o.address.city}, {o.address.state} {o.address.pin}</span>
            <span style={{ fontWeight: 900, fontSize: 18, color: "var(--primary)" }}>${o.total.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]       = useState("shop");
  const [product, setProduct] = useState(null);
  return (
    <>
      <style>{S}</style>
      <AppProvider>
        <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
          <Nav page={page} setPage={setPage} />
          {page === "shop"     && <ShopPage    setPage={setPage} setProduct={setProduct} />}
          {page === "product"  && <ProductPage product={product} setPage={setPage} />}
          {page === "login"    && <AuthPage    mode="login"    setPage={setPage} />}
          {page === "register" && <AuthPage    mode="register" setPage={setPage} />}
          {page === "cart"     && <CartPage    setPage={setPage} />}
          {page === "orders"   && <OrdersPage />}
        </div>
      </AppProvider>
    </>
  );
}
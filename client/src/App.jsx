import { useMemo, useState, useEffect } from 'react'
import {
  Search, ShoppingBag, Heart, ChevronDown, ArrowRight, Star,
  Plus, Minus, X, PackageCheck, Headphones, Laptop, Keyboard, Mouse, Monitor,
  BatteryCharging, Gamepad2, Speaker, HardDrive, Sparkles, CircleCheck, CircleX, Menu,
  SlidersHorizontal, Zap, Box, ChevronRight, Smartphone, Tablet, Camera, Shirt,
  Watch, Pill, Stethoscope, ShoppingBasket, Sofa, Glasses, Briefcase, RotateCcw,
  ShieldCheck, Truck, User, Shield, Lock, RefreshCw, LogOut, CreditCard, Check
} from 'lucide-react'
import { placeOrder, fetchInventory, adjustInventoryStock, fetchAllOrders } from './api/client'

const INVENTORY_SERVICE = 'http://localhost:5002'

// Prices are shown in US Dollars ($)
const CURRENCY = 'USD'
const LOCALE = 'en-US'
const FREE_SHIPPING_OVER = 150
const PAYMENT_THRESHOLD = 1000
const money = n => new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)

const iconMap = {
  headphones: Headphones, mouse: Mouse, keyboard: Keyboard, monitor: Monitor, laptop: Laptop,
  ssd: HardDrive, battery: BatteryCharging, gamepad: Gamepad2, sparkles: Sparkles, box: Box,
  phone: Smartphone, tablet: Tablet, camera: Camera, speaker: Speaker, shirt: Shirt, watch: Watch,
  pill: Pill, medical: Stethoscope, basket: ShoppingBasket, sofa: Sofa, glasses: Glasses, bag: Briefcase
}

// Pick an icon from the product's real DB category + name
const nameRules = [
  [/laptop|xps|macbook|thinkpad|notebook/, 'laptop'],
  [/iphone|galaxy s|phone|pixel/, 'phone'],
  [/ipad|tablet|kindle/, 'tablet'],
  [/monitor|ultrawide|display/, 'monitor'],
  [/playstation|xbox|nintendo|console|controller/, 'gamepad'],
  [/speaker|soundbar|jbl/, 'speaker'],
  [/camera|canon|gopro|mirrorless/, 'camera'],
  [/power bank|charger|battery|anker/, 'battery'],
  [/headphone|earbud|airpods|buds|headset/, 'headphones'],
  [/keyboard/, 'keyboard'],
  [/mouse/, 'mouse'],
  [/ssd|hard drive|flash drive|memory card/, 'ssd'],
  [/watch/, 'watch'],
  [/sunglass|glasses/, 'glasses'],
  [/backpack|handbag|wallet|\bbag\b/, 'bag'],
]
const categoryIcon = { Clothing: 'shirt', Cosmetics: 'sparkles', Medical: 'medical', Grocery: 'basket', 'Home & Living': 'sofa', Accessories: 'watch', Electronics: 'laptop' }

function pickIcon(name = '', category = '') {
  const n = name.toLowerCase()
  if (category === 'Medical') return /vitamin|capsule|tablet|syrup|paracetamol|ointment/.test(n) ? 'pill' : 'medical'
  if (category === 'Electronics' || category === 'Accessories') {
    const hit = nameRules.find(([re]) => re.test(n))
    if (hit) return hit[1]
  }
  return categoryIcon[category] || 'box'
}

function ProductArt({ product, large = false }) {
  const iconKey = product.icon || pickIcon(product.name, product.category)
  const Icon = iconMap[iconKey] || Box
  return <div className={`product-art ${product.tint || 'lilac'} ${large ? 'large' : ''} art-${iconKey}`}>
    <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
    <div className="art-icon"><Icon strokeWidth={1.15} /></div>
    <span className="art-glint">✳</span>
  </div>
}

// Preset Client-Side Accounts (Zero Database Storage)
const DEMO_USERS = {
  customer: { id: 'cust_1', name: 'John Doe', email: 'customer@resilix.com', role: 'customer' },
  admin: { id: 'admin_1', name: 'Admin Manager', email: 'admin@resilix.com', role: 'admin' }
}

/* =========================================================
   DEDICATED FULL-PAGE LOGIN VIEW (NO DATABASE REQUIRED)
========================================================= */
function LoginPage({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState('customer')
  const [identifier, setIdentifier] = useState('customer@resilix.com')
  const [password, setPassword] = useState('customer123')
  const [errorMsg, setErrorMsg] = useState('')

  const handleRoleTab = (role) => {
    setSelectedRole(role)
    setErrorMsg('')
    if (role === 'customer') {
      setIdentifier('customer@resilix.com')
      setPassword('customer123')
    } else {
      setIdentifier('admin@resilix.com')
      setPassword('admin123')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMsg('')
    const targetUser = DEMO_USERS[selectedRole]

    if (
      (identifier.trim().toLowerCase() === targetUser.email.toLowerCase() ||
       identifier.trim().toLowerCase() === selectedRole) &&
      (password === `${selectedRole}123` || password === 'admin123' || password === 'customer123')
    ) {
      onLogin(targetUser)
    } else {
      setErrorMsg(`Invalid credentials. Demo password for ${selectedRole} is: ${selectedRole}123`)
    }
  }

  return (
    <div className="login-screen-wrapper">
      <div className="login-card-box">
        <div className="login-brand-header">
          <div className="login-brand-icon">
            <Zap size={26} fill="currentColor" />
          </div>
          <h1>resilix<span>.</span></h1>
          <p>Distributed Saga E-Commerce Architecture</p>
        </div>

        <div className="role-segmented-control">
          <button
            type="button"
            className={`role-seg-btn ${selectedRole === 'customer' ? 'active' : ''}`}
            onClick={() => handleRoleTab('customer')}
          >
            <User size={14} />
            Customer Portal
          </button>
          <button
            type="button"
            className={`role-seg-btn ${selectedRole === 'admin' ? 'active' : ''}`}
            onClick={() => handleRoleTab('admin')}
          >
            <Shield size={14} />
            Admin Operations
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form-inner">
          <label>
            <span>{selectedRole === 'admin' ? 'Admin ID / Email' : 'Email Address'}</span>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={selectedRole === 'admin' ? 'admin@resilix.com' : 'customer@resilix.com'}
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {errorMsg && (
            <div className="login-error-msg">
              <CircleX size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          <button type="submit" className="login-submit-btn">
            Log In as {selectedRole === 'admin' ? 'Administrator' : 'Customer'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="quick-access-separator">
          <span>Or Quick 1-Click Access</span>
        </div>

        <div className="quick-login-actions">
          <button
            type="button"
            className="quick-login-btn"
            onClick={() => onLogin(DEMO_USERS.customer)}
          >
            <User size={13} color="#244b39" />
            Quick Customer
          </button>
          <button
            type="button"
            className="quick-login-btn"
            onClick={() => onLogin(DEMO_USERS.admin)}
          >
            <Shield size={13} color="#244b39" />
            Quick Admin
          </button>
        </div>

        <div className="demo-credentials-note">
          <strong>Client-Side Demo Auth:</strong> Credentials are verified in memory with zero database storage required.
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   MAIN APPLICATION
========================================================= */
export default function App() {
  const [currentUser, setCurrentUser] = useState(null)

  // Products & Categories (Dynamically fetched from DB/Inventory Service)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All products')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('featured')

  // Shopping & UI state
  const [cart, setCart] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [drawer, setDrawer] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [customerLastReceipt, setCustomerLastReceipt] = useState(null)
  const [toast, setToast] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')
  const [placing, setPlacing] = useState(false)
  const [page, setPage] = useState('shop') // 'shop' | 'inventory' | 'admin-orders' | 'receipt'
  const [showWishlist, setShowWishlist] = useState(false)

  // Admin live audit state
  const [adminOrders, setAdminOrders] = useState([])
  const [loadingAdminData, setLoadingAdminData] = useState(false)

  const notify = msg => { setToast(msg); setTimeout(() => setToast(''), 2800) }

  // Sync current user details with checkout inputs
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.name)
      setEmail(currentUser.email)
    }
  }, [currentUser])

  // Fetch live products from Inventory Service (Port 5002) - Matches DB contents
  const loadProducts = async () => {
    try {
      const res = await fetch(`${INVENTORY_SERVICE}/products`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const tints = ['lilac', 'sand', 'blue', 'mint', 'peach']
      const formatted = data.map((p, idx) => {
        const price = Number(p.price) || 0
        const cat = (p.category || 'General').trim()
        const available = p.available ?? Math.max(0, p.stock - (p.reserved_stock || 0))
        return {
          id: p.id,
          name: p.name,
          price,
          category: cat,
          stock: available,
          total_stock: p.stock,
          reserved_stock: p.reserved_stock || 0,
          rating: p.rating ? Number(p.rating).toFixed(1) : (4.5 + (p.id % 5) * 0.1).toFixed(1),
          detail: p.detail || `${cat} - ${p.name}`,
          icon: p.icon || pickIcon(p.name, cat),
          tag: p.tag || (price > PAYMENT_THRESHOLD ? `OVER $1K (DEMO SAGA)` : ''),
          tint: p.tint || tints[idx % tints.length]
        }
      })
      setProducts(formatted)
    } catch (err) {
      console.warn('Could not fetch live inventory products from 5002:', err.message)
    } finally {
      setLoading(false)
    }
  }

  // Load Admin Data (all system orders & inventory)
  const refreshAdminData = async () => {
    if (!currentUser || currentUser.role !== 'admin') return
    setLoadingAdminData(true)
    const [_, ords] = await Promise.all([loadProducts(), fetchAllOrders()])
    if (ords && Array.isArray(ords)) setAdminOrders(ords)
    setLoadingAdminData(false)
  }

  // Boot & background polling to keep UI aligned with DB
  useEffect(() => {
    loadProducts()
    const timer = setInterval(loadProducts, 10000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (currentUser?.role === 'admin' && (page === 'inventory' || page === 'admin-orders')) {
      refreshAdminData()
    }
  }, [page, currentUser])

  // Dynamically extract categories from database products
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))].filter(Boolean)
    return ['All products', ...cats]
  }, [products])

  const filtered = useMemo(() => {
    let list = products.filter(p => (category === 'All products' || p.category === category)
      && (p.name.toLowerCase().includes(search.toLowerCase()) || p.detail.toLowerCase().includes(search.toLowerCase()))
      && (!showWishlist || wishlist.includes(p.id)))
    if (sort === 'low') list = [...list].sort((a,b) => a.price - b.price)
    if (sort === 'high') list = [...list].sort((a,b) => b.price - a.price)
    if (sort === 'rating') list = [...list].sort((a,b) => b.rating - a.rating)
    return list
  }, [category, search, sort, showWishlist, wishlist, products])

  const count = cart.reduce((n, item) => n + item.quantity, 0)
  const subtotal = cart.reduce((n, item) => n + item.price * item.quantity, 0)
  const shipping = subtotal >= FREE_SHIPPING_OVER ? 0 : 8
  const total = subtotal + shipping

  const addToCart = p => {
    setCart(old => {
      const found = old.find(i => i.id === p.id)
      return found ? old.map(i => i.id === p.id ? { ...i, quantity: Math.min(i.quantity + 1, p.stock) } : i) : [...old, { ...p, quantity: 1 }]
    })
    notify(`${p.name} added to bag`)
  }

  const updateQty = (id, delta) => setCart(old => old.map(i => i.id === id ? { ...i, quantity: Math.max(1, Math.min(i.stock, i.quantity + delta)) } : i))
  const toggleWish = id => setWishlist(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id])
  const beginCheckout = () => { if (!cart.length) return; setDrawer(false); setCheckout(true) }

  // Admin Restock Action
  async function handleRestock(productId, amount = 10) {
    try {
      await adjustInventoryStock(productId, amount)
      notify(`Restocked Product #${productId} (+${amount} units)`)
      await loadProducts()
      if (currentUser?.role === 'admin') refreshAdminData()
    } catch (err) {
      notify(`Restock failed: ${err.message}`)
    }
  }

  // Logout Function
  const handleLogout = () => {
    setCurrentUser(null)
    setPage('shop')
    setCart([])
    notify('Logged out successfully.')
  }

  // Submit Order via Distributed Saga Orchestrator
  async function submitOrder(e) {
    e.preventDefault()
    if (!fullName.trim() || !email.trim() || !address.trim()) return
    setPlacing(true)

    try {
      const results = []
      for (const item of cart) {
        results.push(await placeOrder({
          productId: item.id,
          quantity: item.quantity,
          amount: item.price * item.quantity,
          customer: fullName
        }))
      }

      const failed = results.find(r => r.status === 'FAILED' || r.status === 'failed')
      const result = failed || results[0]
      const orderRecord = {
        ...result,
        customer: fullName,
        email,
        address,
        date: new Date().toLocaleString(),
        items: cart.map(i => ({ ...i })),
        total,
        status: failed ? 'CANCELLED' : 'COMPLETED',
        steps: result.steps || []
      }

      setOrders(old => [orderRecord, ...old])
      setCustomerLastReceipt(orderRecord)
      setCheckout(false)
      setCart([])

      // Customer sees receipt; Admin can inspect full saga trace
      if (currentUser?.role === 'admin') {
        setSelectedOrder(orderRecord)
        setPage('admin-orders')
      } else {
        setPage('receipt')
      }
      notify(failed ? 'Order cancelled: Payment declined (exceeds $1,000.00 threshold).' : 'Order placed successfully!')
    } catch (err) {
      notify('Could not place order. Please check backend connection.')
    } finally {
      setPlacing(false)
      loadProducts()
    }
  }

  const goShop = () => { setPage('shop'); setShowWishlist(false); setCategory('All products') }
  const goCategory = c => { setPage('shop'); setShowWishlist(false); setCategory(c); setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  // IF NOT LOGGED IN -> RENDER DEDICATED FULL-PAGE LOGIN
  if (!currentUser) {
    return <LoginPage onLogin={(user) => {
      setCurrentUser(user)
      notify(`Welcome, ${user.name}! Logged in as ${user.role.toUpperCase()}.`)
    }} />
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', color: '#244b39' }}>Loading Resilix Distributed Storefront...</div>
  }

  return <div className="app-shell">
    {/* Announcement bar */}
    <div className="announcement">
      <Sparkles size={13} />
      <span>Saga Pattern Microservices Demo · Payment Threshold: <strong>$1,000.00</strong></span>
      <span>·</span>
      <span>Free shipping over {money(FREE_SHIPPING_OVER)}</span>
      <span>·</span>
      <span>Logged in as: <strong style={{ textTransform: 'uppercase' }}>{currentUser.role}</strong> ({currentUser.name})</span>
    </div>

    {/* Topbar navigation header */}
    <header className="topbar">
      <button className="mobile-menu icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Open menu"><Menu /></button>
      <button className="brand" onClick={goShop} aria-label="Resilix home">
        <span className="brand-mark"><Zap size={20} fill="currentColor" /></span>
        <span>resilix<span className="brand-dot">.</span></span>
      </button>

      {/* Role-based navigation links */}
      <nav className={mobileMenu ? 'nav-links open' : 'nav-links'}>
        <button className={page === 'shop' && category === 'All products' && !showWishlist ? 'nav-active' : ''} onClick={goShop}>
          Shop all
        </button>
        {categories.slice(1, 5).map(c => (
          <button
            key={c}
            className={page === 'shop' && category === c && !showWishlist ? 'nav-active' : ''}
            onClick={() => goCategory(c)}
          >
            {c}
          </button>
        ))}

        {/* ADMIN ONLY TABS */}
        {currentUser.role === 'admin' ? (
          <>
            <button
              className={page === 'inventory' ? 'nav-active' : ''}
              onClick={() => { setPage('inventory'); setMobileMenu(false); }}
              style={{ color: '#244b39', fontWeight: 700 }}
            >
              📦 Inventory
            </button>
            <button
              className={page === 'admin-orders' ? 'nav-active' : ''}
              onClick={() => { setPage('admin-orders'); setMobileMenu(false); }}
              style={{ color: '#244b39', fontWeight: 700 }}
            >
              📋 Order Details
            </button>
          </>
        ) : (
          customerLastReceipt && (
            <button
              className={page === 'receipt' ? 'nav-active' : ''}
              onClick={() => { setPage('receipt'); setMobileMenu(false); }}
            >
              Recent Receipt
            </button>
          )
        )}
      </nav>

      {/* Top right actions */}
      <div className="top-actions">
        <label className="search-box">
          <Search size={17} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage('shop'); }} placeholder="Search items..." />
          <kbd>⌘ K</kbd>
        </label>

        {/* Current User Badge & Logout */}
        <span className={`role-pill ${currentUser.role}`} style={{ padding: '6px 10px', fontSize: '10px' }}>
          {currentUser.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
          {currentUser.role.toUpperCase()}
        </span>

        <button className="logout-btn" onClick={handleLogout} title="Sign out and return to Login Page">
          <LogOut size={13} />
          <span>Logout</span>
        </button>

        <button className={`icon-button ${showWishlist ? 'active' : ''}`} onClick={() => { setShowWishlist(!showWishlist); setPage('shop'); setCategory('All products'); }} aria-label="Wishlist">
          <Heart size={19} />
          {wishlist.length > 0 && <i className="count-dot">{wishlist.length}</i>}
        </button>

        <button className="bag-button" onClick={() => setDrawer(true)}>
          <ShoppingBag size={19} />
          <span>Bag</span>
          <b>{count}</b>
        </button>
      </div>
    </header>

    {/* ================= PAGE: SHOPPING STOREFRONT ================= */}
    {page === 'shop' && <>
      {!showWishlist && category === 'All products' && !search && <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> LIVE DATABASE CATALOG</div>
          <h1>Quality goods.<br /><em>Delivered securely.</em></h1>
          <p>Multi-category products synchronized directly with PostgreSQL. Transactions protected with the Saga pattern.</p>
          <button className="primary-button" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>
            Explore the collection <ArrowRight size={17} />
          </button>
          <div className="hero-proof">
            <div className="avatar-stack"><span>J</span><span>A</span><span>M</span></div>
            <div><div className="proof-stars">★★★★★</div><small>Payment failure threshold: $1,000.00</small></div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-label label-top"><span className="pulse" /> LIVE MICROSERVICE SYNC</div>
          <div className="hero-product">{products[0] && <ProductArt product={products[0]} large />}</div>
          <div className="hero-product-note">
            <div>
              <span>01 / FEATURED</span>
              <strong>{products[0]?.name}</strong>
              <small>{products[0]?.category} · {products[0]?.detail}</small>
            </div>
            <b>{money(products[0]?.price)}</b>
          </div>
          <div className="floating-chip chip-a"><Zap size={16} /><span>Live Stock<br /><b>{products[0]?.stock} in database</b></span></div>
          <div className="floating-chip chip-b"><ShieldCheck size={17} /><span>Saga Protected<br /><b>Rollback &gt; $1,000</b></span></div>
          <div className="hero-spark spark-a">✳</div><div className="hero-spark spark-b">✳</div>
        </div>
      </section>}

      <section className="trust-strip">
        <div><Truck /><span><b>Fast delivery</b><small>On all orders</small></span></div>
        <div><ShieldCheck /><span><b>Saga Reliability</b><small>Threshold: $1,000.00</small></span></div>
        <div><RotateCcw /><span><b>Automatic Compensation</b><small>Stock releases on payment decline</small></span></div>
        <div><Headphones /><span><b>Role: {currentUser.role.toUpperCase()}</b><small>{currentUser.name}</small></span></div>
      </section>

      <main id="products" className="catalog">
        <div className="section-heading">
          <div>
            <div className="eyebrow">{showWishlist ? 'SAVED FOR LATER' : 'LIVE DATABASE INVENTORY'}</div>
            <h2>{showWishlist ? 'Your wishlist' : category === 'All products' ? 'Explore all products.' : category}</h2>
            <p>Real-time inventory synchronized across distributed database microservices.</p>
          </div>
          <div className="catalog-controls">
            <label className="sort-control">
              <SlidersHorizontal size={15} />
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="featured">Featured</option>
                <option value="rating">Top rated</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
              <ChevronDown size={14} />
            </label>
          </div>
        </div>

        <div className="category-pills">
          {categories.map(c => (
            <button
              key={c}
              className={category === c && !showWishlist ? 'selected' : ''}
              onClick={() => { setCategory(c); setShowWishlist(false); }}
            >
              {c}
            </button>
          ))}
        </div>

        {(search || showWishlist) && <div className="result-note">
          {filtered.length} {filtered.length === 1 ? 'item' : 'items'} {showWishlist ? 'saved' : `matching “${search}”`}
          <button onClick={() => { setSearch(''); setShowWishlist(false); }}>Clear <X size={13} /></button>
        </div>}

        {filtered.length ? (
          <div className="product-grid">
            {filtered.map(p => <article className="product-card" key={p.id}>
              <div className="product-image-wrap" onClick={() => addToCart(p)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && addToCart(p)} aria-label={`Quick add ${p.name}`}>
                {p.tag && <span className={`product-tag ${p.tag.includes('1K') || p.tag.includes('10K') ? 'tag-deal' : ''}`}>{p.tag}</span>}
                <button className={`wish-button ${wishlist.includes(p.id) ? 'wished' : ''}`} onClick={e => { e.stopPropagation(); toggleWish(p.id); }} aria-label="Save to wishlist">
                  <Heart size={17} fill={wishlist.includes(p.id) ? 'currentColor' : 'none'} />
                </button>
                <ProductArt product={p} />
                <span className="quick-add">Quick add <Plus size={14} /></span>
              </div>
              <div className="product-meta"><span>{p.category}</span><span className="rating"><Star size={12} fill="currentColor" />{p.rating}</span></div>
              <h3>{p.name}</h3>
              <p className="product-detail">Stock: <b>{p.stock}</b> available</p>
              <div className="product-price">
                <strong>{money(p.price)}</strong>
                <button onClick={() => addToCart(p)} aria-label={`Add ${p.name} to bag`}><Plus size={17} /></button>
              </div>
            </article>)}
          </div>
        ) : (
          <div className="empty-state">
            <Heart size={28} />
            <h3>No products found</h3>
            <p>Try searching another term or selecting a different category.</p>
            <button className="primary-button" onClick={goShop}>Reset filters <ArrowRight size={16} /></button>
          </div>
        )}
      </main>
    </>}

    {/* ================= PAGE: ADMIN INVENTORY MANAGEMENT (ADMIN ONLY) ================= */}
    {page === 'inventory' && (
      currentUser.role === 'admin' ? (
        <main className="admin-view-shell">
          <div className="admin-bar-header">
            <div>
              <div className="eyebrow"><Shield size={12} /> ADMIN ACCESS GRANTED</div>
              <h2 style={{ font: '700 28px Manrope', margin: '6px 0 4px', color: '#243425' }}>Live Inventory Management</h2>
              <p style={{ fontSize: '12px', color: '#7a8277', margin: 0 }}>Real-time row-level lock tracking, stock levels, and replenishment.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="admin-tab-btn active" onClick={refreshAdminData} disabled={loadingAdminData}>
                <RefreshCw size={13} className={loadingAdminData ? 'spinner' : ''} />
                {loadingAdminData ? 'Refreshing...' : 'Refresh Stock'}
              </button>
            </div>
          </div>

          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Price ($)</th>
                  <th>Total Physical Stock</th>
                  <th>Reserved Stock (Saga In-Flight)</th>
                  <th>Available to Purchase</th>
                  <th>Inventory Status</th>
                  <th>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const totalStock = p.total_stock ?? p.stock
                  const reserved = p.reserved_stock ?? 0
                  const available = p.stock
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: '#38533a' }}>#{p.id}</td>
                      <td><b>{p.name}</b></td>
                      <td><span style={{ fontSize: '11px', background: '#eaf0e4', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>{p.category}</span></td>
                      <td><strong>{money(p.price)}</strong></td>
                      <td><strong>{totalStock}</strong> units</td>
                      <td>
                        <span style={{ color: reserved > 0 ? '#b35d25' : '#72796e', fontWeight: reserved > 0 ? 700 : 400 }}>
                          {reserved} reserved
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: available > 5 ? '#2d6a36' : available > 0 ? '#b27218' : '#b03426' }}>
                          {available} available
                        </strong>
                      </td>
                      <td>
                        <span className={`stock-badge ${available > 10 ? 'stock-ok' : available > 0 ? 'stock-low' : 'stock-empty'}`}>
                          {available > 10 ? 'In Stock' : available > 0 ? 'Low Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td>
                        <button className="restock-btn" onClick={() => handleRestock(p.id, 5)}>
                          <Plus size={12} /> +5 Restock
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </main>
      ) : (
        <div className="access-denied-box">
          <Lock size={38} color="#b03426" />
          <h3>Access Denied</h3>
          <p>You are logged in as <strong>Customer</strong>. Customers are not authorized to view raw inventory management counters or warehouse stock levels.</p>
          <button className="primary-button" onClick={handleLogout}>Log out &amp; Sign in as Admin</button>
        </div>
      )
    )}

    {/* ================= PAGE: ADMIN ORDER DETAILS & SAGA EXPLORER (ADMIN ONLY) ================= */}
    {page === 'admin-orders' && (
      currentUser.role === 'admin' ? (
        <main className="admin-view-shell">
          <div className="admin-bar-header">
            <div>
              <div className="eyebrow"><Shield size={12} /> ADMIN ACCESS GRANTED</div>
              <h2 style={{ font: '700 28px Manrope', margin: '6px 0 4px', color: '#243425' }}>Order Details &amp; Saga Transactions</h2>
              <p style={{ fontSize: '12px', color: '#7a8277', margin: 0 }}>System-wide customer orders, transaction outcomes, and distributed rollback traces.</p>
            </div>
            <button className="admin-tab-btn active" onClick={refreshAdminData} disabled={loadingAdminData}>
              <RefreshCw size={13} className={loadingAdminData ? 'spinner' : ''} />
              {loadingAdminData ? 'Refreshing...' : 'Refresh Orders'}
            </button>
          </div>

          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Product ID / Items</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Saga Inspection</th>
                </tr>
              </thead>
              <tbody>
                {adminOrders.length > 0 ? (
                  adminOrders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700, color: '#2e4933' }}>#{o.id}</td>
                      <td><b>{o.customer || 'Customer'}</b></td>
                      <td>Product #{o.product_id}</td>
                      <td>{o.quantity}</td>
                      <td><strong>{money(o.amount || o.total)}</strong></td>
                      <td>
                        <span className={`status-pill ${o.status === 'COMPLETED' ? 'status-success' : 'status-failed'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '11px', color: '#73796d' }}>{o.created_at || 'Recent'}</td>
                      <td>
                        <button
                          className="inspect-btn"
                          onClick={() => setSelectedOrder(o)}
                        >
                          Trace Saga <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#7a8074' }}>
                      No orders placed yet. Place an order through the store to observe live Saga traces!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      ) : (
        <div className="access-denied-box">
          <Lock size={38} color="#b03426" />
          <h3>Access Denied</h3>
          <p>You are logged in as <strong>Customer</strong>. Customers cannot view system-wide order logs, audit details, or internal Saga orchestration state.</p>
          <button className="primary-button" onClick={handleLogout}>Log out &amp; Sign in as Admin</button>
        </div>
      )
    )}

    {/* ================= PAGE: CUSTOMER ORDER RECEIPT (CUSTOMER ONLY) ================= */}
    {page === 'receipt' && (
      <main style={{ padding: '30px 5%' }}>
        <button className="back-link" onClick={goShop}>
          <ChevronRight size={15} className="back-chevron" /> Back to shopping
        </button>

        {customerLastReceipt ? (
          <div className="customer-receipt-card">
            <div className="receipt-header">
              {customerLastReceipt.status === 'COMPLETED' ? (
                <CircleCheck size={36} color="#3d7042" />
              ) : (
                <CircleX size={36} color="#b03426" />
              )}
              <div>
                <h3>{customerLastReceipt.status === 'COMPLETED' ? 'Thank You For Your Order!' : 'Order Cancelled'}</h3>
                <p>Order Reference: <strong>#{customerLastReceipt.orderId}</strong> · {customerLastReceipt.date}</p>
              </div>
            </div>

            {customerLastReceipt.status === 'CANCELLED' && (
              <div className="compensation-note" style={{ marginTop: '20px' }}>
                <RotateCcw size={16} />
                <span>
                  <b>Payment Declined:</b> Total order amount exceeded the single transaction limit of <strong>$1,000.00</strong>. You were not charged, and your items were returned to inventory.
                </span>
              </div>
            )}

            <div className="receipt-items">
              <span className="eyebrow" style={{ marginBottom: '10px' }}>PURCHASE SUMMARY</span>
              {customerLastReceipt.items.map(it => (
                <div className="receipt-row" key={it.id}>
                  <span>{it.name} × {it.quantity}</span>
                  <strong>{money(it.price * it.quantity)}</strong>
                </div>
              ))}
            </div>

            <div className="receipt-total-row">
              <span>Total Paid:</span>
              <span>{customerLastReceipt.status === 'COMPLETED' ? money(customerLastReceipt.total) : '$0.00'}</span>
            </div>

            <div style={{ marginTop: '24px', fontSize: '11px', color: '#7c8376', lineHeight: 1.6 }}>
              <span>Delivery to: <strong>{customerLastReceipt.customer}</strong> ({customerLastReceipt.address})</span>
            </div>

            <button className="primary-button full-button" style={{ marginTop: '25px' }} onClick={goShop}>
              Continue Shopping <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <PackageCheck size={36} />
            <h3>No recent receipt found</h3>
            <p>Place an order through the store to view your purchase receipt.</p>
            <button className="primary-button" onClick={goShop}>Start Shopping</button>
          </div>
        )}
      </main>
    )}

    {/* ================= MODAL: ADMIN SAGA INSPECTOR ================= */}
    {selectedOrder && currentUser.role === 'admin' && (
      <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setSelectedOrder(null)}>
        <section className="order-modal">
          <div className="drawer-head">
            <div>
              <span className="eyebrow">ADMIN SAGA TRANSACTION AUDIT</span>
              <h2>Order #{selectedOrder.id || selectedOrder.orderId}</h2>
            </div>
            <button className="icon-button" onClick={() => setSelectedOrder(null)}><X /></button>
          </div>

          <div className={`result-banner ${selectedOrder.status === 'COMPLETED' ? 'result-ok' : 'result-no'}`}>
            {selectedOrder.status === 'COMPLETED' ? <CircleCheck size={24} /> : <RotateCcw size={24} />}
            <div>
              <b>{selectedOrder.status === 'COMPLETED' ? 'Distributed Transaction Completed' : 'Saga Compensation Rollback'}</b>
              <p>
                {selectedOrder.status === 'COMPLETED'
                  ? 'All microservice steps (order, reservation, payment) finished successfully.'
                  : `Payment declined (${selectedOrder.reason || 'Amount exceeds $1,000.00'}). Compensating actions released reserved stock automatically.`}
              </p>
            </div>
          </div>

          <h3 className="timeline-title">Distributed Saga Step Journey</h3>
          <div className="saga-timeline">
            {(selectedOrder.steps || [
              { label: 'Order created in PENDING state', state: 'done' },
              { label: 'Inventory reserved', state: 'done' },
              selectedOrder.status === 'COMPLETED'
                ? { label: 'Payment approved', state: 'done' }
                : { label: 'Payment declined (Threshold: $1,000.00)', state: 'failed' },
              selectedOrder.status === 'COMPLETED'
                ? { label: 'Order marked COMPLETED', state: 'done' }
                : { label: 'Compensating action: Reserved stock released', state: 'compensated' },
            ]).map((s, i) => (
              <div className={`timeline-step step-${s.state}`} key={i}>
                <span className="timeline-dot">
                  {s.state === 'done' ? <Check size={13} /> : s.state === 'failed' ? <X size={13} /> : <RotateCcw size={12} />}
                </span>
                <div>
                  <b>{s.label}</b>
                  <small>{s.state === 'compensated' ? 'Saga Compensating Action' : s.state === 'failed' ? 'Simulated Failure' : 'Completed'}</small>
                </div>
              </div>
            ))}
          </div>

          <div className="detail-total">
            <span>Order total</span>
            <strong>{money(selectedOrder.amount || selectedOrder.total)}</strong>
          </div>

          <button className="primary-button full-button" onClick={() => setSelectedOrder(null)}>
            Close Audit Inspector
          </button>
        </section>
      </div>
    )}

    {/* Cart Drawer */}
    {drawer && <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setDrawer(false)}>
      <aside className="cart-drawer">
        <div className="drawer-head">
          <div><span className="eyebrow">YOUR CART</span><h2>Bag <span>({count})</span></h2></div>
          <button className="icon-button" onClick={() => setDrawer(false)} aria-label="Close cart"><X /></button>
        </div>

        {cart.length === 0 ? (
          <div className="drawer-empty">
            <ShoppingBag size={32} />
            <h3>Your bag is empty</h3>
            <p>Explore the catalog and add items to your cart.</p>
            <button className="primary-button" onClick={() => setDrawer(false)}>Continue Shopping</button>
          </div>
        ) : (
          <>
            <div className="shipping-progress">
              <div className="shipping-progress-label">
                <Truck size={14} />
                <span>{subtotal >= FREE_SHIPPING_OVER ? 'You unlocked free delivery!' : `Add ${money(FREE_SHIPPING_OVER - subtotal)} more for free delivery`}</span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_OVER) * 100)}%` }} />
              </div>
            </div>

            <div className="cart-items">
              {cart.map(item => <div className="cart-item" key={item.id}>
                <ProductArt product={item} />
                <div className="cart-item-info">
                  <span>{item.category}</span>
                  <b>{item.name}</b>
                  <strong>{money(item.price)}</strong>
                  <div className="qty-control">
                    <button onClick={() => updateQty(item.id, -1)} aria-label="Decrease quantity"><Minus size={12} /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} disabled={item.quantity >= item.stock} aria-label="Increase quantity"><Plus size={12} /></button>
                  </div>
                </div>
              </div>)}
            </div>

            <div className="cart-summary">
              <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
              <div><span>Shipping</span><b>{shipping === 0 ? 'FREE' : money(shipping)}</b></div>
              <div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div>
              <button className="checkout-button" onClick={beginCheckout}>Continue to checkout <ArrowRight size={17} /></button>
            </div>
          </>
        )}
      </aside>
    </div>}

    {/* Checkout Modal */}
    {checkout && <div className="overlay checkout-overlay" onMouseDown={e => e.target === e.currentTarget && !placing && setCheckout(false)}>
      <section className="checkout-modal">
        <div className="drawer-head">
          <div><span className="eyebrow">RESILIX CHECKOUT</span><h2>Order Checkout</h2></div>
          <button className="icon-button" onClick={() => setCheckout(false)} disabled={placing}><X /></button>
        </div>
        <div className="checkout-layout">
          <form className="checkout-form" onSubmit={submitOrder}>
            <h3><span>1</span> Delivery details</h3>
            <label>Customer Name<input value={fullName} onChange={e => setFullName(e.target.value)} required /></label>
            <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
            <label>Delivery address<textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter street and city" rows="2" required /></label>
            <div className="demo-payment-note">
              <CreditCard size={18} />
              <div>
                <b>Payment Limit Policy:</b>
                <p>Transactions ≤ <strong>$1,000.00</strong> succeed immediately. Orders <strong>&gt; $1,000.00</strong> trigger automated Saga compensation rollback.</p>
              </div>
            </div>
            <button className="checkout-button" type="submit" disabled={placing}>
              {placing ? <><span className="spinner" /> Orchestrating Saga...</> : <>Place Order · {money(total)} <ArrowRight size={17} /></>}
            </button>
          </form>
          <div className="checkout-summary">
            <h3>Items in Order</h3>
            {cart.map(i => <div className="checkout-line" key={i.id}>
              <ProductArt product={i} />
              <div><b>{i.name}</b><small>Qty: {i.quantity}</small></div>
              <strong>{money(i.price * i.quantity)}</strong>
            </div>)}
            <div className="checkout-totals">
              <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
              <div><span>Shipping</span><b>{shipping === 0 ? 'FREE' : money(shipping)}</b></div>
              <div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div>
            </div>
          </div>
        </div>
      </section>
    </div>}

    {/* Footer */}
    <footer className="footer">
      <div className="footer-brand">
        <button className="brand" onClick={goShop}>
          <span className="brand-mark"><Zap size={18} fill="currentColor" /></span>
          <span>resilix<span className="brand-dot">.</span></span>
        </button>
        <p>Curated storefront synchronized with live PostgreSQL databases and Distributed Saga Concurrency Control.</p>
      </div>
      <div className="footer-links">
        <span>CURRENT SESSION</span>
        <button onClick={handleLogout}>Role: {currentUser.role.toUpperCase()}</button>
        <button onClick={handleLogout}>User: {currentUser.name}</button>
        <button onClick={handleLogout} style={{ color: '#a03525', fontWeight: 700 }}>Log Out</button>
      </div>
      <div className="footer-links">
        <span>MICROSERVICES</span>
        <button onClick={() => window.open('http://localhost:5001/health')}>Order Service (5001)</button>
        <button onClick={() => window.open('http://localhost:5002/health')}>Inventory Service (5002)</button>
        <button onClick={() => window.open('http://localhost:5003/health')}>Payment Service (5003)</button>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Resilix Store. Role-Based Access Control Enabled.</span>
        <span><ShieldCheck size={14} /> Threshold: $1,000.00</span>
      </div>
    </footer>

    {toast && <div className="toast"><CircleCheck size={17} />{toast}</div>}
  </div>
}

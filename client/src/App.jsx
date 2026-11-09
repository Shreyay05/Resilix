import { useMemo, useState, useEffect } from 'react'
import {
  Search, ShoppingBag, Heart, ChevronDown, ArrowRight, Star,
  Plus, Minus, X, PackageCheck, Headphones, Laptop, Keyboard, Mouse, Monitor,
  BatteryCharging, Gamepad2, Speaker, HardDrive, Sparkles, CircleCheck, CircleX, Menu,
  SlidersHorizontal, Zap, Box, ChevronRight, Smartphone, Tablet, Camera, Shirt,
  Watch, Pill, Stethoscope, ShoppingBasket, Sofa, Glasses, Briefcase, RotateCcw,
  ShieldCheck, Truck, User, Shield, Lock, RefreshCw, LogOut, CreditCard, Check
} from 'lucide-react'
import { placeOrder, adjustInventoryStock, fetchAllOrders } from './api/client'

const INVENTORY_SERVICE = 'http://localhost:5002';

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
  return <div className={`product-art ${product.tint || 'lilac'} ${large ? 'large' : ''} art-${iconKey || 'box'}`}>
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
   DEDICATED FULL-PAGE LOGIN VIEW (USES EXACT STYLES.CSS)
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
    <div className="login-page-screen">
      <div className="login-card-container">
        <div className="login-brand-header">
          <div className="brand-mark">
            <Zap size={24} fill="currentColor" />
          </div>
          <h1>resilix<span className="brand-dot">.</span></h1>
          <p>Distributed Saga E-Commerce Architecture</p>
        </div>

        <div className="role-tab-selector">
          <button
            type="button"
            className={`role-tab-btn ${selectedRole === 'customer' ? 'active' : ''}`}
            onClick={() => handleRoleTab('customer')}
          >
            <User size={14} />
            Customer Portal
          </button>
          <button
            type="button"
            className={`role-tab-btn ${selectedRole === 'admin' ? 'active' : ''}`}
            onClick={() => handleRoleTab('admin')}
          >
            <Shield size={14} />
            Admin Operations
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form-fields">
          <div className="form-input-group">
            <label>{selectedRole === 'admin' ? 'Admin ID / Email' : 'Email Address'}</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={selectedRole === 'admin' ? 'admin@resilix.com' : 'customer@resilix.com'}
              required
            />
          </div>

          <div className="form-input-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {errorMsg && (
            <div style={{ color: '#b03426', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CircleX size={13} />
              <span>{errorMsg}</span>
            </div>
          )}

          <button type="submit" className="login-submit-btn">
            Log In as {selectedRole === 'admin' ? 'Administrator' : 'Customer'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="quick-login-divider">
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

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All products')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('featured')
  const [cart, setCart] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [drawer, setDrawer] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [toast, setToast] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')
  const [placing, setPlacing] = useState(false)
  const [page, setPage] = useState('shop') // 'shop' | 'orders' | 'inventory' | 'admin-orders' | 'receipt'
  const [showWishlist, setShowWishlist] = useState(false)

  // Admin Live State
  const [adminOrders, setAdminOrders] = useState([])
  const [loadingAdminData, setLoadingAdminData] = useState(false)

  // Fetch live products from Inventory Service (Port 5002) - Matches DB contents
  const loadProducts = () => {
    return fetch(`${INVENTORY_SERVICE}/products`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
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
            tag: p.tag || (price > PAYMENT_THRESHOLD ? 'OVER $1K (DEMO SAGA)' : ''),
            tint: p.tint || tints[idx % tints.length]
          }
        })
        setProducts(formatted)
      })
      .catch(err => console.error('Error fetching inventory products:', err))
      .finally(() => setLoading(false))
  }

  // Load Admin Data when on Admin pages
  const refreshAdminData = async () => {
    if (!currentUser || currentUser.role !== 'admin') return
    setLoadingAdminData(true)
    const [_, ords] = await Promise.all([loadProducts(), fetchAllOrders()])
    if (ords && Array.isArray(ords)) setAdminOrders(ords)
    setLoadingAdminData(false)
  }

  // Sync user details into checkout form
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.name)
      setEmail(currentUser.email)
    }
  }, [currentUser])

  // Periodic poll to keep UI in sync with DB
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

  // Dynamically extract categories from products
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
  const notify = msg => { setToast(msg); setTimeout(() => setToast(''), 2600) }

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

  // Admin Restocking
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

  // Place Order via Saga Orchestrator
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
      const order = {
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
      setOrders(old => [order, ...old])
      setSelectedOrder(order)
      setCheckout(false)
      setCart([])

      // Customer sees receipt; Admin sees order audit
      if (currentUser?.role === 'admin') {
        setPage('admin-orders')
      } else {
        setPage('receipt')
      }
      notify(failed ? 'Order cancelled: Payment declined (exceeds $1,000.00 threshold).' : 'Order placed successfully!')
    } catch (err) {
      notify('Could not place the demo order. Please try again.')
    } finally {
      setPlacing(false)
      loadProducts()
    }
  }

  const goShop = () => { setPage('shop'); setShowWishlist(false); setCategory('All products') }
  const goCategory = c => { setPage('shop'); setShowWishlist(false); setCategory(c); setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  // IF NOT LOGGED IN -> RENDER DEDICATED FULL LOGIN PAGE
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
    {/* Announcement bar matching database live status */}
    <div className="announcement">
      <Sparkles size={13} />
      Multi-Category Catalog Live <span>·</span> Threshold: <strong>$1,000.00</strong> <span>·</span> Free shipping over {money(FREE_SHIPPING_OVER)} <span>·</span> Logged in as: <strong style={{ textTransform: 'uppercase' }}>{currentUser.role}</strong>
    </div>

    {/* Header */}
    <header className="topbar">
      <button className="mobile-menu icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Open menu"><Menu /></button>
      <button className="brand" onClick={goShop} aria-label="Resilix home">
        <span className="brand-mark"><Zap size={20} fill="currentColor" /></span>
        <span>resilix<span className="brand-dot">.</span></span>
      </button>

      {/* Navigation links */}
      <nav className={mobileMenu ? 'nav-links open' : 'nav-links'}>
        <button className={page === 'shop' && category === 'All products' && !showWishlist ? 'nav-active' : ''} onClick={goShop}>Shop all</button>
        {categories.slice(1, 5).map(c => (
          <button
            key={c}
            className={page === 'shop' && category === c && !showWishlist ? 'nav-active' : ''}
            onClick={() => goCategory(c)}
          >
            {c}
          </button>
        ))}

        {/* Role-based navigation items */}
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
          <button
            className={page === 'orders' || page === 'receipt' ? 'nav-active' : ''}
            onClick={() => { setPage('orders'); setMobileMenu(false); }}
          >
            My orders
          </button>
        )}
      </nav>

      {/* Top right actions */}
      <div className="top-actions">
        <label className="search-box">
          <Search size={17} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage('shop'); }} placeholder="Search items..." />
          <kbd>⌘ K</kbd>
        </label>

        <button className="logout-btn" onClick={handleLogout} title="Sign out and return to Login">
          <LogOut size={13} />
          <span>Logout ({currentUser.role.toUpperCase()})</span>
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

    {/* ================= PAGE: SHOPPING STOREFRONT (EXACT MATCH TO DATABASE UI) ================= */}
    {page === 'shop' && <>
      {!showWishlist && category === 'All products' && !search && <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> DISTRIBUTED E-COMMERCE CATALOG</div>
          <h1>Quality goods.<br /><em>Delivered securely.</em></h1>
          <p>Browse electronics, clothing, cosmetics, medical essentials, and more with distributed ACID guarantees.</p>
          <button className="primary-button" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>
            Explore collection <ArrowRight size={17} />
          </button>
          <div className="hero-proof">
            <div className="avatar-stack"><span>S</span><span>R</span><span>I</span></div>
            <div>
              <div className="proof-stars">★★★★★</div>
              <small>Payment threshold: $1,000.00 · Live DB Sync</small>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-label label-top"><span className="pulse" /> LIVE MICROSERVICE SYNC</div>
          <div className="hero-product">{products[0] && <ProductArt product={products[0]} large />}</div>
          <div className="hero-product-note">
            <div>
              <span>01 / FEATURED</span>
              <strong>{products[0]?.name}</strong>
              <small>{products[0]?.category}</small>
            </div>
            <b>{money(products[0]?.price)}</b>
          </div>
        </div>
      </section>}

      <main id="products" className="catalog">
        <div className="section-heading">
          <div>
            <div className="eyebrow">{showWishlist ? 'SAVED FOR LATER' : 'ALL CATEGORIES'}</div>
            <h2>{showWishlist ? 'Your wishlist' : category === 'All products' ? 'Explore all products.' : category}</h2>
            <p>Real-time inventory synchronized across distributed database nodes.</p>
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

        {filtered.length ? (
          <div className="product-grid">
            {filtered.map((p) => (
              <article className="product-card" key={p.id}>
                <div className="product-image-wrap" onClick={() => addToCart(p)} role="button" tabIndex={0} aria-label={`Quick add ${p.name}`}>
                  <button className={`wish-button ${wishlist.includes(p.id) ? 'wished' : ''}`} onClick={e => { e.stopPropagation(); toggleWish(p.id); }}>
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
                  <button onClick={() => addToCart(p)} aria-label={`Add ${p.name} to cart`}><Plus size={17} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Heart size={28} />
            <h3>No products found</h3>
            <p>Try searching another term or category.</p>
            <button className="primary-button" onClick={goShop}>Reset filters</button>
          </div>
        )}
      </main>
    </>}

    {/* ================= PAGE: CUSTOMER ORDER HISTORY ================= */}
    {(page === 'orders' || page === 'receipt') && (
      <main className="orders-page">
        <button className="back-link" onClick={goShop}><ChevronRight size={15} className="back-chevron" /> Back to shopping</button>
        <div className="section-heading">
          <div><div className="eyebrow">YOUR ACCOUNT</div><h2>Order history.</h2></div>
          <span className="order-count">{orders.length} orders</span>
        </div>
        {orders.length === 0 ? (
          <div className="empty-state order-empty">
            <PackageCheck size={34} />
            <h3>No orders placed yet.</h3>
            <p>Select items from the catalog to place your first order.</p>
            <button className="primary-button" onClick={goShop}>Start exploring</button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((o, i) => (
              <article className="order-card" key={(o.orderId || o.id) + '-' + i}>
                <div className="order-card-top">
                  <div>
                    <span className="order-number">ORDER #{o.orderId || o.id}</span>
                    <p>{o.date || o.created_at}</p>
                  </div>
                  <span className={`status-pill ${o.status === 'COMPLETED' ? 'status-success' : 'status-failed'}`}>
                    {o.status}
                  </span>
                </div>
                {o.status === 'CANCELLED' && (
                  <div style={{ margin: '8px 0', fontSize: '11px', color: '#a03223', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RotateCcw size={14} />
                    <span><b>Payment Declined:</b> Total exceeded single transaction limit of <strong>$1,000.00</strong>. Saga compensation rollback returned stock to database.</span>
                  </div>
                )}
                <div className="order-card-bottom">
                  <span>Total: <b>{money(o.total || o.amount)}</b></span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    )}

    {/* ================= PAGE: ADMIN INVENTORY MANAGEMENT (ADMIN ONLY) ================= */}
    {page === 'inventory' && (
      currentUser.role === 'admin' ? (
        <main className="admin-view-shell" style={{ width: '89.2%', maxWidth: '1390px', margin: '30px auto' }}>
          <div className="admin-bar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <div className="eyebrow"><Shield size={12} /> ADMIN ACCESS GRANTED</div>
              <h2 style={{ font: '700 28px Manrope', margin: '6px 0 4px', color: '#243425' }}>Live Inventory Management</h2>
              <p style={{ fontSize: '12px', color: '#7a8277', margin: 0 }}>Real-time row-level lock tracking, stock levels, and replenishment.</p>
            </div>
            <button className="admin-tab-btn active" onClick={refreshAdminData} disabled={loadingAdminData}>
              <RefreshCw size={13} className={loadingAdminData ? 'spinner' : ''} />
              {loadingAdminData ? 'Refreshing...' : 'Refresh Stock'}
            </button>
          </div>

          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Price ($)</th>
                  <th>Physical Stock</th>
                  <th>Reserved Stock (Saga)</th>
                  <th>Available</th>
                  <th>Status</th>
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
                      <td><span style={{ fontSize: '10px', background: '#eaf0e4', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>{p.category}</span></td>
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
        <main className="admin-view-shell" style={{ width: '89.2%', maxWidth: '1390px', margin: '30px auto' }}>
          <div className="admin-bar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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
                  <th>Product ID</th>
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
              { label: 'Inventory reserved in inventory_db', state: 'done' },
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
    {drawer && <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setDrawer(false)}><aside className="cart-drawer">
      <div className="drawer-head"><div><span className="eyebrow">YOUR BAG</span><h2>Bag <span>({count})</span></h2></div><button className="icon-button" onClick={() => setDrawer(false)}><X /></button></div>
      {cart.length === 0 ? <div className="drawer-empty"><ShoppingBag size={32} /><h3>Your bag is empty</h3><button className="primary-button" onClick={() => setDrawer(false)}>Explore items</button></div> : <>
        <div className="cart-items">{cart.map(item => <div className="cart-item" key={item.id}><ProductArt product={item} /><div className="cart-item-info"><span>{item.category}</span><b>{item.name}</b><strong>{money(item.price)}</strong><div className="qty-control"><button onClick={() => updateQty(item.id,-1)}><Minus size={12} /></button><span>{item.quantity}</span><button onClick={() => updateQty(item.id,1)}><Plus size={12} /></button></div></div></div>)}</div>
        <div className="cart-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div><button className="checkout-button" onClick={beginCheckout}>Continue to checkout <ArrowRight size={17} /></button></div>
      </>}
    </aside></div>}

    {/* Checkout Modal */}
    {checkout && <div className="overlay checkout-overlay" onMouseDown={e => e.target === e.currentTarget && !placing && setCheckout(false)}><section className="checkout-modal">
      <div className="drawer-head"><div><span className="eyebrow">CHECKOUT</span><h2>Saga Payment</h2></div><button className="icon-button" onClick={() => setCheckout(false)} disabled={placing}><X /></button></div>
      <form className="checkout-form" onSubmit={submitOrder}>
        <label>Full name<input value={fullName} onChange={e => setFullName(e.target.value)} required /></label>
        <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Delivery address<textarea value={address} onChange={e => setAddress(e.target.value)} rows="3" required /></label>
        <div className="demo-payment-note" style={{ background: '#f0f4ea', padding: '12px', borderRadius: '8px', margin: '14px 0', fontSize: '11px', color: '#445642' }}>
          <b>Saga Policy:</b> Orders &le; $1,000.00 succeed immediately. Orders &gt; $1,000.00 trigger automated Saga compensation rollback.
        </div>
        <button className="checkout-button" type="submit" disabled={placing}>{placing ? 'Processing...' : `Place Order · ${money(total)}`}</button>
      </form>
    </section></div>}

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

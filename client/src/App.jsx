import { useMemo, useState } from 'react'
import {
  Search, ShoppingBag, Heart, ChevronDown, ArrowRight, ArrowUpRight, Star,
  Plus, Minus, X, Check, PackageCheck, ShieldCheck, Truck, Headphones,
  Laptop, Keyboard, Mouse, Monitor, BatteryCharging, Gamepad2, Speaker,
  HardDrive, Sparkles, CircleCheck, CircleX, RotateCcw, Menu, SlidersHorizontal,
  AudioLines, Zap, Box, CreditCard, ShoppingCart, ChevronRight
} from 'lucide-react'
import { products, categories } from './data/products'
import { placeOrder } from './api/client'

const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n * 83)
const iconMap = { headphones: Headphones, headphones2: AudioLines, earbuds: AudioLines, mouse: Mouse, keyboard: Keyboard, monitor: Monitor, laptop: Laptop, ssd: HardDrive, battery: BatteryCharging, gamepad: Gamepad2, vr: Sparkles, speaker: Speaker }
const visual = {
  headphones: 'headphones', headphones2: 'headphones', earbuds: 'earbuds', mouse: 'mouse', keyboard: 'keyboard',
  monitor: 'monitor', laptop: 'laptop', ssd: 'ssd', battery: 'battery', gamepad: 'gamepad', vr: 'vr', speaker: 'speaker'
}

function ProductArt({ product, large = false }) {
  const Icon = iconMap[product.icon] || Box
  return <div className={`product-art ${product.tint} ${large ? 'large' : ''} art-${visual[product.icon]}`}>
    <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
    <div className="art-icon"><Icon strokeWidth={1.15} /></div>
    <span className="art-glint">✳</span>
  </div>
}
function App() {
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
  const [page, setPage] = useState('shop')
  const [showWishlist, setShowWishlist] = useState(false)

  const filtered = useMemo(() => {
    let list = products.filter(p => (category === 'All products' || p.category === category)
      && (p.name.toLowerCase().includes(search.toLowerCase()) || p.detail.toLowerCase().includes(search.toLowerCase()))
      && (!showWishlist || wishlist.includes(p.id)))
    if (sort === 'low') list = [...list].sort((a,b) => a.price-b.price)
    if (sort === 'high') list = [...list].sort((a,b) => b.price-a.price)
    if (sort === 'rating') list = [...list].sort((a,b) => b.rating-a.rating)
    return list
  }, [category, search, sort, showWishlist, wishlist])
  const count = cart.reduce((n, item) => n + item.quantity, 0)
  const subtotal = cart.reduce((n, item) => n + item.price * item.quantity, 0)
  const shipping = subtotal >= 150 ? 0 : 8
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

  async function submitOrder(e) {
    e.preventDefault()
    if (!fullName.trim() || !email.trim() || !address.trim()) return
    setPlacing(true)
    const first = cart[0]
    try {
      // Existing backend currently accepts one product per order; one order per cart line
      // is used here to keep the mock compatible with its present contract.
      const results = []
      for (const item of cart) {
        results.push(await placeOrder({ productId: item.id, quantity: item.quantity, amount: item.price * item.quantity }))
      }
      const failed = results.find(r => r.status === 'FAILED' || r.status === 'failed')
      const result = failed || results[0]
      const order = {
        ...result, customer: fullName, email, address, date: new Date().toLocaleString(),
        items: cart.map(i => ({ ...i })), total,
        status: failed ? 'CANCELLED' : 'COMPLETED',
        steps: result.steps || []
      }
      setOrders(old => [order, ...old])
      setSelectedOrder(order)
      setCheckout(false)
      setPage('orders')
      setCart([])
    } catch (err) {
      notify('Could not place the demo order. Please try again.')
    } finally { setPlacing(false) }
  }

  const goShop = () => { setPage('shop'); setShowWishlist(false); setCategory('All products') }
  const goCategory = c => { setPage('shop'); setShowWishlist(false); setCategory(c); setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return <div className="app-shell">
    <div className="announcement"><Sparkles size={13} /> A little upgrade goes a long way <span>·</span> Free shipping over ₹12,450</div>
    <header className="topbar">
      <button className="mobile-menu icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Open menu"><Menu /></button>
      <button className="brand" onClick={goShop} aria-label="Resilix home"><span className="brand-mark"><Zap size={20} fill="currentColor" /></span><span>resilix<span className="brand-dot">.</span></span></button>
      <nav className={mobileMenu ? 'nav-links open' : 'nav-links'}>
        <button className={page === 'shop' && category === 'All products' && !showWishlist ? 'nav-active' : ''} onClick={goShop}>Shop all</button>
        <button onClick={() => goCategory('Audio')}>Audio</button>
        <button onClick={() => goCategory('Accessories')}>Accessories</button>
        <button onClick={() => goCategory('Computers')}>Computers</button>
        <button className={page === 'orders' ? 'nav-active' : ''} onClick={() => {setPage('orders');setMobileMenu(false)}}>My orders</button>
      </nav>
      <div className="top-actions">
        <label className="search-box"><Search size={17}/><input value={search} onChange={e => {setSearch(e.target.value);setPage('shop')}} placeholder="Find your next favourite" /><kbd>⌘ K</kbd></label>
        <button className={`icon-button ${showWishlist ? 'active' : ''}`} onClick={() => {setShowWishlist(!showWishlist);setPage('shop');setCategory('All products')}} aria-label="Wishlist"><Heart size={19}/>{wishlist.length > 0 && <i className="count-dot">{wishlist.length}</i>}</button>
        <button className="bag-button" onClick={() => setDrawer(true)}><ShoppingBag size={19}/><span>Bag</span><b>{count}</b></button>
      </div>
    </header>

    {page === 'shop' && <>
      {!showWishlist && category === 'All products' && !search && <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line"/> THE EVERYDAY TECH EDITION</div>
          <h1>Good tech.<br/><em>Better days.</em></h1>
          <p>Thoughtful tech for the things you love doing. Meet your next everyday essential.</p>
          <button className="primary-button" onClick={() => document.getElementById('products')?.scrollIntoView({behavior:'smooth'})}>Explore the collection <ArrowRight size={17}/></button>
          <div className="hero-proof"><div className="avatar-stack"><span>J</span><span>A</span><span>M</span></div><div><div className="proof-stars">★★★★★</div><small>Loved by 2,400+ tech people</small></div></div>
        </div>
        <div className="hero-visual">
          <div className="hero-label label-top"><span className="pulse"/> THE DAILY DRIVER</div>
          <div className="hero-product"><ProductArt product={products[0]} large/></div>
          <div className="hero-product-note"><div><span>01 / FEATURED</span><strong>Sony WH-1000XM5</strong><small>Silence the noise. Find your flow.</small></div><b>{money(399)}</b></div>
          <div className="floating-chip chip-a"><AudioLines size={16}/><span>Pure sound<br/><b>All day long</b></span></div>
          <div className="floating-chip chip-b"><ShieldCheck size={17}/><span>Picked with<br/><b>care &amp; quality</b></span></div>
          <div className="hero-spark spark-a">✳</div><div className="hero-spark spark-b">✳</div>
        </div>
      </section>}

      <section className="trust-strip">
        <div><Truck/><span><b>Free shipping</b><small>On orders over ₹12,450</small></span></div>
        <div><ShieldCheck/><span><b>Quality you can trust</b><small>Every pick, thoughtfully chosen</small></span></div>
        <div><RotateCcw/><span><b>Easy returns</b><small>30-day return window</small></span></div>
        <div><Headphones/><span><b>Here to help</b><small>Real humans, real support</small></span></div>
      </section>

      <main id="products" className="catalog">
        <div className="section-heading"><div><div className="eyebrow">{showWishlist ? 'SAVED FOR LATER' : 'THE RESILIX COLLECTION'}</div><h2>{showWishlist ? 'Your wishlist' : category === 'All products' ? 'Find your next favourite.' : category + ', made better.'}</h2><p>{showWishlist ? 'All the good stuff you have your eye on.' : 'Useful, lovely, reliable tech. No guesswork needed.'}</p></div>
          <div className="catalog-controls"><label className="sort-control"><SlidersHorizontal size={15}/><select value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="rating">Top rated</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select><ChevronDown size={14}/></label></div>
        </div>
        <div className="category-pills">{categories.map(c => <button key={c} className={category === c && !showWishlist ? 'selected' : ''} onClick={() => {setCategory(c);setShowWishlist(false)}}>{c}</button>)}</div>
        {(search || showWishlist) && <div className="result-note">{filtered.length} {filtered.length === 1 ? 'item' : 'items'} {showWishlist ? 'saved' : `matching “${search}”`} <button onClick={() => {setSearch('');setShowWishlist(false)}}>Clear <X size={13}/></button></div>}
        {filtered.length ? <div className="product-grid">{filtered.map((p, idx) => <article className="product-card" key={p.id}>
          <div className="product-image-wrap" onClick={() => addToCart(p)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && addToCart(p)} aria-label={`Quick add ${p.name}`}>
            {p.tag && <span className={`product-tag ${p.tag === 'DEAL' ? 'tag-deal' : ''}`}>{p.tag}</span>}
            <button className={`wish-button ${wishlist.includes(p.id) ? 'wished' : ''}`} onClick={e => {e.stopPropagation();toggleWish(p.id)}} aria-label="Save to wishlist"><Heart size={17} fill={wishlist.includes(p.id) ? 'currentColor' : 'none'}/></button>
            <ProductArt product={p}/>
            <span className="quick-add">Quick add <Plus size={14}/></span>
          </div>
          <div className="product-meta"><span>{p.category}</span><span className="rating"><Star size={12} fill="currentColor"/>{p.rating}</span></div>
          <h3>{p.name}</h3><p className="product-detail">{p.detail}</p>
          <div className="product-price"><strong>{money(p.price)}</strong>{p.oldPrice && <del>{money(p.oldPrice)}</del>}<button onClick={() => addToCart(p)} aria-label={`Add ${p.name} to bag`}><Plus size={17}/></button></div>
        </article>)}</div> : <div className="empty-state"><Heart size={28}/><h3>Nothing here just yet</h3><p>Try another search or explore the full collection.</p><button className="primary-button" onClick={goShop}>Explore all products <ArrowRight size={16}/></button></div>}
        <div className="catalog-foot"><span>Showing {filtered.length} of {products.length} thoughtfully chosen essentials</span><span className="foot-dots">✳ &nbsp; Made for everyday</span></div>
      </main>
      <section className="newsletter"><div className="newsletter-icon"><Sparkles/></div><div><span className="eyebrow">GOOD THINGS, OCCASIONALLY</span><h2>A little tech joy in your inbox.</h2><p>New drops, useful finds, and the occasional very good deal.</p></div><form onSubmit={e => {e.preventDefault();notify('You’re on the list — welcome to Resilix!');setEmail('')}}><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" required/><button type="submit">Count me in <ArrowRight size={15}/></button></form></section>
    </>}

    {page === 'orders' && <main className="orders-page">
      <button className="back-link" onClick={goShop}><ChevronRight size={15} className="back-chevron"/> Back to shopping</button>
      <div className="section-heading"><div><div className="eyebrow">YOUR RESILIX ACCOUNT</div><h2>Order history.</h2><p>Every order, all in one place.</p></div><span className="order-count">{orders.length} {orders.length === 1 ? 'order' : 'orders'}</span></div>
      {orders.length === 0 ? <div className="empty-state order-empty"><PackageCheck size={34}/><h3>Your next favourite is waiting.</h3><p>You haven’t placed an order in this demo yet. Browse the collection and try a checkout.</p><button className="primary-button" onClick={goShop}>Start exploring <ArrowRight size={16}/></button></div> : <div className="orders-list">{orders.map((o,i) => <article className="order-card" key={o.orderId + i}>
        <div className="order-card-top"><div><span className="order-number">ORDER #{o.orderId}</span><p>{o.date}</p></div><span className={`status-pill ${o.status === 'COMPLETED' ? 'status-success' : 'status-failed'}`}>{o.status === 'COMPLETED' ? <CircleCheck size={14}/> : <CircleX size={14}/>} {o.status === 'COMPLETED' ? 'Confirmed' : 'Cancelled'}</span></div>
        <div className="order-products">{o.items.map(it => <div className="order-product" key={it.id}><ProductArt product={it}/><div><b>{it.name}</b><small>Qty: {it.quantity}</small></div><strong>{money(it.price * it.quantity)}</strong></div>)}</div>
        {o.status === 'CANCELLED' && <div className="compensation-note"><RotateCcw size={16}/><span><b>You're not charged.</b> Payment was declined in this demo and reserved stock was released automatically.</span></div>}
        <div className="order-card-bottom"><span>Order total <b>{money(o.total)}</b></span><button className="text-button" onClick={() => setSelectedOrder(o)}>View order details <ArrowUpRight size={15}/></button></div>
      </article>)}</div>}
    </main>}

    <footer className="footer"><div className="footer-brand"><button className="brand" onClick={goShop}><span className="brand-mark"><Zap size={18} fill="currentColor"/></span><span>resilix<span className="brand-dot">.</span></span></button><p>Everyday tech. Thoughtfully chosen.</p></div><div className="footer-links"><span>SHOP</span><button onClick={goShop}>All products</button><button onClick={() => goCategory('Audio')}>Audio &amp; sound</button><button onClick={() => goCategory('Accessories')}>Accessories</button></div><div className="footer-links"><span>NEED A HAND?</span><button onClick={() => notify('Support chat is part of the future integration.')}>Contact support</button><button onClick={() => notify('Returns information will be connected later.')}>Shipping &amp; returns</button><button onClick={() => setPage('orders')}>Track an order</button></div><div className="footer-bottom"><span>© 2026 Resilix Store. Demo storefront.</span><span><ShieldCheck size={14}/> Secure checkout experience (mock)</span></div></footer>

    {drawer && <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setDrawer(false)}><aside className="cart-drawer">
      <div className="drawer-head"><div><span className="eyebrow">YOUR LITTLE LINEUP</span><h2>Your bag <span>({count})</span></h2></div><button className="icon-button" onClick={() => setDrawer(false)} aria-label="Close bag"><X/></button></div>
      {cart.length === 0 ? <div className="drawer-empty"><ShoppingBag size={32}/><h3>Your bag is taking a breather.</h3><p>Go find something you’ll love using every day.</p><button className="primary-button" onClick={() => setDrawer(false)}>Explore products <ArrowRight size={16}/></button></div> : <>
        <div className="shipping-progress"><div className="shipping-progress-label">{subtotal >= 150 ? <><Check size={14}/> You’ve unlocked free shipping!</> : <>You’re {money(150-subtotal)} away from free shipping</>}</div><div className="progress-track"><span style={{width:`${Math.min(100,subtotal/150*100)}%`}}/></div></div>
        <div className="cart-items">{cart.map(item => <div className="cart-item" key={item.id}><ProductArt product={item}/><div className="cart-item-info"><span>{item.category}</span><b>{item.name}</b><strong>{money(item.price)}</strong><div className="qty-control"><button onClick={() => item.quantity === 1 ? setCart(old => old.filter(i => i.id !== item.id)) : updateQty(item.id,-1)}><Minus size={12}/></button><span>{item.quantity}</span><button onClick={() => updateQty(item.id,1)} disabled={item.quantity >= item.stock}><Plus size={12}/></button></div></div><button className="remove-item" onClick={() => setCart(old => old.filter(i => i.id !== item.id))} aria-label="Remove item"><X size={15}/></button></div>)}</div>
        <div className="cart-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Shipping</span><b>{shipping === 0 ? 'FREE' : money(shipping)}</b></div><div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div><button className="checkout-button" onClick={beginCheckout}>Continue to checkout <ArrowRight size={17}/></button><div className="checkout-reassurance"><ShieldCheck size={14}/> Safe &amp; secure demo checkout</div></div>
      </>}
    </aside></div>}

    {checkout && <div className="overlay checkout-overlay" onMouseDown={e => e.target === e.currentTarget && !placing && setCheckout(false)}><section className="checkout-modal">
      <div className="drawer-head"><div><span className="eyebrow">ALMOST YOURS</span><h2>Checkout</h2></div><button className="icon-button" onClick={() => setCheckout(false)} disabled={placing}><X/></button></div>
      <div className="checkout-layout"><form className="checkout-form" onSubmit={submitOrder}>
        <h3><span>1</span> Delivery details</h3><label>Full name<input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" required/></label>
        <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required/></label>
        <label>Delivery address<textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="House / street / city / PIN code" rows="3" required/></label>
        <div className="demo-payment-note"><CreditCard size={18}/><div><b>Demo payment</b><p>No real payment details needed. This checkout simulates the Resilix order saga.</p></div></div>
        <button className="checkout-button" type="submit" disabled={placing}>{placing ? <><span className="spinner"/> Processing your order…</> : <>Place demo order · {money(total)} <ArrowRight size={17}/></>}</button>
        <p className="mock-warning">Mock only — no real payment will be taken.</p>
      </form>
      <div className="checkout-summary"><h3>Your order</h3>{cart.map(i => <div className="checkout-line" key={i.id}><ProductArt product={i}/><div><b>{i.name}</b><small>Qty {i.quantity}</small></div><strong>{money(i.price*i.quantity)}</strong></div>)}<div className="checkout-totals"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Shipping</span><b>{shipping === 0 ? 'FREE' : money(shipping)}</b></div><div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div></div></div></div>
    </section></div>}

    {selectedOrder && <div className="overlay" onMouseDown={e => e.target === e.currentTarget && setSelectedOrder(null)}><section className="order-modal">
      <div className="drawer-head"><div><span className="eyebrow">ORDER DETAILS</span><h2>#{selectedOrder.orderId}</h2></div><button className="icon-button" onClick={() => setSelectedOrder(null)}><X/></button></div>
      <div className={`result-banner ${selectedOrder.status === 'COMPLETED' ? 'result-ok' : 'result-no'}`}>{selectedOrder.status === 'COMPLETED' ? <CircleCheck size={24}/> : <RotateCcw size={24}/>}<div><b>{selectedOrder.status === 'COMPLETED' ? 'Order confirmed!' : 'Order cancelled safely'}</b><p>{selectedOrder.status === 'COMPLETED' ? 'Your demo order made it through every step.' : 'A step failed, so Resilix compensated and cancelled the order.'}</p></div></div>
      <h3 className="timeline-title">Order journey</h3><div className="saga-timeline">{(selectedOrder.steps || []).map((s,i) => <div className={`timeline-step step-${s.state}`} key={i}><span className="timeline-dot">{s.state === 'done' ? <Check size={13}/> : s.state === 'failed' ? <X size={13}/> : <RotateCcw size={12}/>}</span><div><b>{s.label}</b><small>{s.state === 'compensated' ? 'Compensation action' : s.state === 'failed' ? 'Failure simulated' : 'Completed successfully'}</small></div></div>)}</div>
      <div className="detail-total"><span>Order total</span><strong>{money(selectedOrder.total)}</strong></div><button className="primary-button full-button" onClick={() => {setSelectedOrder(null);goShop()}}>Continue shopping <ArrowRight size={16}/></button>
    </section></div>}

    {toast && <div className="toast"><CircleCheck size={17}/>{toast}</div>}
  </div>
}
export default App
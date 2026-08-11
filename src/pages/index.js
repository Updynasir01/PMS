import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import BrandLogo from '../components/BrandLogo';
import {
  IconWrench, IconQr, IconCheck, IconUser, IconLayers, IconHome,
} from '../components/Icons';

const PILOT_WHATSAPP = 'https://wa.me/252615942403?text=' + encodeURIComponent(
  'Salaan — I want to request an eNuzul pilot for my properties.'
);
const PILOT_EMAIL = 'mailto:hello@enuzul.com?subject=' + encodeURIComponent('eNuzul pilot request');

function ProductShot({ src, alt, phone }) {
  if (phone) {
    return (
      <div className="mkt-shot-phone">
        <div className="mkt-shot-phone-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="mkt-shot-img" />
        </div>
      </div>
    );
  }
  return (
    <div className="mkt-shot">
      <div className="mkt-shot-bar">
        <span className="mkt-shot-dot" />
        <span className="mkt-shot-dot" />
        <span className="mkt-shot-dot" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="mkt-shot-img" />
    </div>
  );
}

export default function LandingPage() {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetch('/api/public/landing-customers')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setCustomers(Array.isArray(rows) ? rows : []))
      .catch(() => setCustomers([]));
  }, []);
  return (
    <>
      <Head>
        <title>eNuzul — Property management, simplified</title>
        <meta
          name="description"
          content="eNuzul helps Mogadishu property owners manage rent, maintenance, leases, and tenants — with a QR portal for residents. No passwords."
        />
        <meta name="theme-color" content="#1a2e28" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="mkt">
        <header className="mkt-nav">
          <div className="mkt-wrap mkt-nav-inner">
            <Link href="/" aria-label="eNuzul home">
              <BrandLogo force="dark" height={44} />
            </Link>
            <nav className="mkt-nav-links" aria-label="Primary">
              <a href="#how">How it works</a>
              <a href="#product">Product</a>
              <a href="#pricing">Pricing</a>
              <a href="#contact">Contact</a>
            </nav>
            <div className="mkt-nav-actions">
              <Link href="/login" className="mkt-btn mkt-btn-text">Login</Link>
              <a href={PILOT_WHATSAPP} target="_blank" rel="noreferrer" className="mkt-btn mkt-btn-pill">
                Request pilot
              </a>
            </div>
          </div>
        </header>

        <section className="mkt-hero">
          <div className="mkt-hero-bg" aria-hidden="true" />
          <div className="mkt-wrap mkt-hero-inner">
            <div className="mkt-hero-copy">
              <p className="mkt-brand">eNuzul</p>
              <h1>Manage your properties with ease.</h1>
              <p className="mkt-hero-sub">
                Rent, maintenance, and leases — built for Mogadishu owners at home and abroad.
              </p>
              <div className="mkt-hero-ctas">
                <a href={PILOT_WHATSAPP} target="_blank" rel="noreferrer" className="mkt-btn mkt-btn-pill mkt-btn-lg">
                  Request pilot
                </a>
                <a href="#product" className="mkt-btn mkt-btn-outline mkt-btn-lg">
                  See the product
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="mkt-customers" aria-label="Customers">
          <div className="mkt-wrap">
            <p className="mkt-customers-label">Trusted by property owners</p>
            {customers.length > 0 ? (
              <ul className="mkt-customers-row">
                {customers.map((c) => {
                  const inner = c.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logo_url} alt={c.name} className="mkt-customers-logo" />
                  ) : (
                    <span className="mkt-customers-name">{c.name}</span>
                  );
                  return (
                    <li key={c.id}>
                      {c.website_url ? (
                        <a href={c.website_url} target="_blank" rel="noreferrer" className="mkt-customers-item">
                          {inner}
                        </a>
                      ) : (
                        <div className="mkt-customers-item">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mkt-customers-empty">Early owners across Mogadishu — join the pilot.</p>
            )}
          </div>
        </section>

        <section className="mkt-section" id="how">
          <div className="mkt-wrap">
            <p className="mkt-kicker">How it works</p>
            <h2>Three steps. Then you’re in control.</h2>
            <p className="mkt-lead">Set up once. Run every month with less friction.</p>
            <ol className="mkt-steps">
              <li className="mkt-step">
                <span className="mkt-step-num" aria-hidden="true">01</span>
                <h3>Add your buildings</h3>
                <p>Properties, units, and rents — organized by Mogadishu district.</p>
              </li>
              <li className="mkt-step">
                <span className="mkt-step-num" aria-hidden="true">02</span>
                <h3>Invite tenants by QR</h3>
                <p>Print a code for each unit. Stick it inside. No passwords for tenants.</p>
              </li>
              <li className="mkt-step">
                <span className="mkt-step-num" aria-hidden="true">03</span>
                <h3>Run the month</h3>
                <p>Track payments, handle repairs, sign leases — all in one place.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="mkt-section mkt-section-product" id="product">
          <div className="mkt-wrap">
            <p className="mkt-kicker">Product</p>
            <h2>See it before you commit.</h2>
            <p className="mkt-lead">The same calm interface owners and tenants use every day.</p>
            <div className="mkt-product-stage">
              <div className="mkt-product-main">
                <p className="mkt-label">Owner dashboard</p>
                <ProductShot src="/marketing/dashboard.png" alt="eNuzul owner dashboard" />
              </div>
              <div className="mkt-product-side">
                <div>
                  <p className="mkt-label">Properties</p>
                  <ProductShot src="/marketing/properties.png" alt="eNuzul properties" />
                </div>
                <div className="mkt-product-phone">
                  <p className="mkt-label">Tenant portal</p>
                  <ProductShot src="/marketing/tenant-portal.png" alt="eNuzul tenant portal" phone />
                </div>
              </div>
            </div>
            <p className="mkt-product-note">Also: maintenance tracking with live request status.</p>
          </div>
        </section>

        <section className="mkt-section" id="who">
          <div className="mkt-wrap mkt-audience">
            <div className="mkt-audience-col">
              <p className="mkt-kicker">Owners</p>
              <h2>Clarity from anywhere.</h2>
              <ul className="mkt-bullets">
                <li>See collected, pending, and overdue rent</li>
                <li>Assign caretakers without sharing full finances</li>
                <li>Sign leases in the browser — PDF stored online</li>
                <li>Stay clear on every building, even abroad</li>
              </ul>
            </div>
            <div className="mkt-audience-col">
              <p className="mkt-kicker">Tenants</p>
              <h2>Scan. Done.</h2>
              <ul className="mkt-bullets">
                <li>QR on the door — no app store, no password</li>
                <li>Know what’s due this month</li>
                <li>Report a repair and follow the thread</li>
                <li>Sign agreements without creating an account</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mkt-section mkt-section-surface" id="features">
          <div className="mkt-wrap">
            <p className="mkt-kicker">Capabilities</p>
            <h2>Everything that matters.</h2>
            <p className="mkt-lead">Replace notebooks, spreadsheets, and scattered chats.</p>
            <div className="mkt-features">
              {[
                { Icon: IconLayers, title: 'Rent tracking & receipts', body: 'Mark paid, track overdue, download clean PDF receipts.' },
                { Icon: IconCheck, title: 'Overdue clarity', body: 'Know who is late — before it becomes a dispute.' },
                { Icon: IconWrench, title: 'Maintenance + chat', body: 'Tickets with priority, status, and a real conversation thread.' },
                { Icon: IconQr, title: 'Unit QR portal', body: 'Tenants scan once. Full access — no passwords to forget.' },
                { Icon: IconHome, title: 'Cloud lease e-sign', body: 'Landlord and tenant sign in the browser. PDF stored online.' },
                { Icon: IconUser, title: 'Caretaker access', body: 'Staff handle repairs on-site without seeing your full finances.' },
              ].map(({ Icon, title, body }) => (
                <div key={title} className="mkt-feature">
                  <div className="mkt-feature-icon"><Icon size={18} /></div>
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mkt-section" id="pricing">
          <div className="mkt-wrap">
            <div className="mkt-center">
              <p className="mkt-kicker">Pricing</p>
              <h2>Simple plans. Clear limits.</h2>
              <p className="mkt-lead">Pay for the units you manage. Upgrade when you grow.</p>
            </div>
            <div className="mkt-pricing">
              <div className="mkt-plan">
                <h3>Starter</h3>
                <p className="mkt-plan-limit">Up to 10 units</p>
                <div className="mkt-plan-price">$19<span>/mo</span></div>
                <ul>
                  <li>Properties &amp; units</li>
                  <li>QR tenant portal</li>
                  <li>Rent tracking</li>
                  <li>Maintenance</li>
                </ul>
                <a href={PILOT_WHATSAPP} target="_blank" rel="noreferrer" className="mkt-btn mkt-btn-ghost" style={{ width: '100%' }}>
                  Start pilot
                </a>
              </div>
              <div className="mkt-plan mkt-plan-featured">
                <span className="mkt-plan-badge">Popular</span>
                <h3>Basic</h3>
                <p className="mkt-plan-limit">Up to 25 units</p>
                <div className="mkt-plan-price">$49<span>/mo</span></div>
                <ul>
                  <li>Everything in Starter</li>
                  <li>Caretakers</li>
                  <li>Expense tracking</li>
                  <li>Lease e-sign</li>
                </ul>
                <a href={PILOT_WHATSAPP} target="_blank" rel="noreferrer" className="mkt-btn mkt-btn-primary" style={{ width: '100%' }}>
                  Start pilot
                </a>
              </div>
              <div className="mkt-plan">
                <h3>Professional</h3>
                <p className="mkt-plan-limit">Up to 60 units</p>
                <div className="mkt-plan-price">$99<span>/mo</span></div>
                <ul>
                  <li>Everything in Basic</li>
                  <li>More units</li>
                  <li>Priority onboarding</li>
                  <li>Enterprise available</li>
                </ul>
                <a href={PILOT_EMAIL} className="mkt-btn mkt-btn-ghost" style={{ width: '100%' }}>
                  Talk to us
                </a>
              </div>
            </div>
            <p className="mkt-pilot-note">Early owners: free pilot available — limited spots.</p>
          </div>
        </section>

        <section className="mkt-cta" id="contact">
          <div className="mkt-wrap">
            <p className="mkt-kicker mkt-kicker-on-dark">Pilot</p>
            <h2>Your buildings deserve a quieter system.</h2>
            <p>Join the pilot. We’ll help you set up your first property — step by step.</p>
            <div className="mkt-cta-actions">
              <a href={PILOT_WHATSAPP} target="_blank" rel="noreferrer" className="mkt-btn mkt-btn-light mkt-btn-lg">
                WhatsApp us
              </a>
              <a href={PILOT_EMAIL} className="mkt-btn mkt-btn-on-dark mkt-btn-lg">
                Email hello@enuzul.com
              </a>
            </div>
          </div>
        </section>

        <footer className="mkt-footer">
          <div className="mkt-wrap mkt-footer-inner">
            <div>
              <BrandLogo force="light" height={28} />
              <p>Property management, simplified. · Mogadishu</p>
            </div>
            <div className="mkt-footer-links">
              <Link href="/login">Login</Link>
              <a href={PILOT_EMAIL}>Contact</a>
              <a href="https://enuzul.com" target="_blank" rel="noreferrer">eNuzul.com</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

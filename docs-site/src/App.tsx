import { useState } from 'react';
import {
  Book,
  Terminal,
  Settings,
  Layers,
  Zap,
  CreditCard,
  Code,
  Search,
  AlertCircle,
  Scale,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const sections = [
  { id: 'intro', title: 'Introduction', icon: Book },
  { id: 'install', title: 'Installation', icon: Terminal },
  { id: 'config', title: 'Configuration', icon: Settings },
  { id: 'api', title: 'API Reference', icon: Layers },
  { id: 'i18n', title: 'Multi-language', icon: Zap },
  { id: 'errors', title: 'Error Handling', icon: AlertCircle },
  { id: 'legal', title: 'Legal Notice', icon: Scale },
];

function App() {
  const [activeSection, setActiveSection] = useState('intro');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Mobile Menu Toggle */}
      <button 
        className="hamburger"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      <div 
        className={`sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="nav-logo">
          <div className="logo-icon">
            <CreditCard size={18} color="white" strokeWidth={3} />
          </div>
          satim-node
        </div>

        <div className="search-container" style={{ marginBottom: '2rem' }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search docs..."
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.6rem 1rem 0.6rem 2.5rem',
                color: 'white',
                fontSize: '0.9rem'
              }}
            />
          </div>
        </div>

        <nav>
          {sections.map((section) => (
            <div
              key={section.id}
              className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => {
                setActiveSection(section.id);
                setIsMobileMenuOpen(false);
              }}
            >
              <section.icon size={18} />
              {section.title}
            </div>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <a
            href="https://github.com"
            target="_blank"
            className="nav-item"
            style={{ textDecoration: 'none' }}
          >
            <Code size={18} />
            GitHub Repository
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeSection === 'intro' && (
              <section>
                <span className="badge">v1.1.0 Stable</span>
                <h1>Introduction</h1>
                <p>
                  satim-node is a powerful, type-safe Node.js SDK for the SATIM (Société d'Automatisation des Transactions Interbancaires et de Monétiques)
                  payment gateway in Algeria. It provides a seamless developer experience for handling CIB and Edahabia transactions.
                </p>

                <h2>Core Features</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                  <FeatureCard
                    title="Type Safety"
                    desc="Full TypeScript support with comprehensive interfaces for every request and response."
                  />
                  <FeatureCard
                    title="Extended API"
                    desc="Uses getOrderStatusExtended.do for highly reliable payment verification."
                  />
                  <FeatureCard
                    title="Built-in I18n"
                    desc="Native translations for error codes in English, Arabic, and French."
                  />
                </div>
              </section>
            )}

            {activeSection === 'install' && (
              <section>
                <span className="badge">NPM / Yarn / PNPM</span>
                <h1>Installation</h1>
                <p>Install the <code>satim-node</code> package via your favorite package manager to get started.</p>
                
                <div className="code-block-wrapper">
                  <pre>
                    <code>npm install satim-node</code>
                  </pre>
                </div>

                <div style={{ marginTop: '2rem' }}>
                  <p>Or using Yarn:</p>
                  <div className="code-block-wrapper">
                    <pre>
                      <code>yarn add satim-node</code>
                    </pre>
                  </div>
                </div>

                <div className="admonition" style={{ borderLeftColor: 'var(--accent)' }}>
                  <div className="admonition-title"><Zap size={18} /> Requirements</div>
                  <p>This library requires <strong>Node.js 16+</strong> and works beautifully with both TypeScript and modern JavaScript projects.</p>
                </div>
              </section>
            )}

            {activeSection === 'config' && (
              <section>
                <h1>Configuration</h1>
                <p>Initialize the <code>Satim</code> client with your merchant credentials. These are typically provided by your bank or directly by SATIM.</p>
                <div className="code-block-wrapper">
                  <pre>
                    <code>{`import { Satim } from 'satim-node';\n\nconst satim = new Satim({\n  username:   process.env.SATIM_USER,\n  password:   process.env.SATIM_PASS,\n  terminalId: process.env.SATIM_TERMINAL,\n  sandbox:    true,\n  debug:      true\n});`}</code>
                  </pre>
                </div>

                <h2>Configuration Parameters</h2>
                <div className="table-wrapper">
                  <table className="docs-table">
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>Type</th>
                        <th>Default</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>username</code> <span className="req">*</span></td>
                        <td><code>string</code></td>
                        <td>-</td>
                        <td>Your merchant username (API login).</td>
                      </tr>
                      <tr>
                        <td><code>password</code> <span className="req">*</span></td>
                        <td><code>string</code></td>
                        <td>-</td>
                        <td>Your merchant password.</td>
                      </tr>
                      <tr>
                        <td><code>terminalId</code> <span className="req">*</span></td>
                        <td><code>string</code></td>
                        <td>-</td>
                        <td>Your assigned Terminal ID.</td>
                      </tr>
                      <tr>
                        <td><code>sandbox</code></td>
                        <td><code>boolean</code></td>
                        <td><code>false</code></td>
                        <td>Use the SATIM test environment.</td>
                      </tr>
                      <tr>
                        <td><code>debug</code></td>
                        <td><code>boolean</code></td>
                        <td><code>false</code></td>
                        <td>Enables verbose axios logging of requests/responses.</td>
                      </tr>
                      <tr>
                        <td><code>timeout</code></td>
                        <td><code>number</code></td>
                        <td><code>30000</code></td>
                        <td>Request timeout in milliseconds.</td>
                      </tr>
                      <tr>
                        <td><code>verifySsl</code></td>
                        <td><code>boolean</code></td>
                        <td><code>true</code></td>
                        <td>Set to <code>false</code> if SATIM sandbox has certificate issues.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="admonition warning">
                  <div className="admonition-title"><AlertCircle size={18} /> Security Best Practices</div>
                  <p>Never hardcode credentials in your source code. We recommend using <code>.env</code> files or a dedicated secrets manager.</p>
                  <pre>
                    <code>{`SATIM_USER=your_login\nSATIM_PASS=your_secret\nSATIM_TERMINAL=E0109...`}</code>
                  </pre>
                </div>
              </section>
            )}

            {activeSection === 'i18n' && (
              <section>
                <h1>Multi-language Support</h1>
                <p>
                  The library includes a utility to translate technical action codes into
                  human-readable messages for your customers. This is particularly useful for showing friendly errors instead of raw codes like <code>116</code>.
                </p>
                <div className="code-block-wrapper">
                  <pre>
                    <code>{`import { getLocalizedMessage } from 'satim-node';\n\n// AR: رصيد البطاقة غير كافٍ\nconst msg = getLocalizedMessage(116, 'ar'); `}</code>
                  </pre>
                </div>

                <h2>Supported Languages</h2>
                <div className="table-wrapper">
                  <table className="docs-table">
                    <thead>
                      <tr>
                        <th>Language</th>
                        <th>Code</th>
                        <th>Native Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Arabic</td>
                        <td><code>ar</code></td>
                        <td>العربية</td>
                      </tr>
                      <tr>
                        <td>French</td>
                        <td><code>fr</code></td>
                        <td>Français</td>
                      </tr>
                      <tr>
                        <td>English</td>
                        <td><code>en</code></td>
                        <td>English</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="admonition" style={{ borderLeftColor: 'var(--accent)' }}>
                  <div className="admonition-title"><Layers size={18} /> Implementation Tip</div>
                  <p>
                    You can use these messages directly in your UI. The <code>getLocalizedMessage</code> helper
                    will fall back to French if a translation is missing or the language code is unrecognized.
                  </p>
                </div>
              </section>
            )}

            {activeSection === 'api' && (
              <section>
                <h1>API Reference</h1>
                <p>The core <code>Satim</code> class provides all the methods needed to interact with the gateway.</p>

                <h2 id="register">registerOrder(params)</h2>
                <p>Initiates a payment by registering the order with SATIM and retrieving the <code>formUrl</code>.</p>
                <pre>
                  <code>{`const { orderId, formUrl } = await satim.registerOrder({\n  orderNumber: "INV-001",\n  amount: DZDToCentimes(1500),\n  returnUrl: "https://site.dz/success",\n  failUrl: "https://site.dz/fail"\n});`}</code>
                </pre>

                <h2 id="status">getOrderStatus(params)</h2>
                <p>Retrieves the full status (including card info and action codes) of an existing order.</p>
                <pre>
                  <code>{`const status = await satim.getOrderStatus({\n  orderId: "..."\n});\nconsole.log(status.orderStatus); // e.g. 2 for AUTHORIZED`}</code>
                </pre>

                <h2 id="confirm">confirmOrder(params)</h2>
                <p>Captures a pre-authorized payment. Used only for two-step terminals.</p>
                <pre>
                  <code>{`const result = await satim.confirmOrder({\n  orderId: "...",\n  amount: 500000\n});`}</code>
                </pre>

                <h2 id="refund">refundOrder(params)</h2>
                <p>Refunds a captured order (partial or full).</p>
                <pre>
                  <code>{`const result = await satim.refundOrder({\n  orderId: "...",\n  amount: 250000 // Refund 2 500 DZD\n});`}</code>
                </pre>

                <h2 id="reverse">reverseOrder(params)</h2>
                <p>Voids an authorization before it has been captured.</p>
                <pre>
                  <code>{`const result = await satim.reverseOrder({\n  orderId: "..."\n});`}</code>
                </pre>

                <h2 id="helper">isPaymentSuccessful(status)</h2>
                <p>A convenient helper that checks if an order status is <code>AUTHORIZED</code> or <code>PRE_AUTHORIZED</code>.</p>
                <pre>
                  <code>{`if (satim.isPaymentSuccessful(status)) {\n  console.log('Payment verified!');\n}`}</code>
                </pre>

                <h2>Enums & Types</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
                  <div>
                    <h3 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>OrderStatus</h3>
                    <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', listStyle: 'none' }}>
                      <li><code>0</code> — REGISTERED</li>
                      <li><code>1</code> — PRE_AUTHORIZED</li>
                      <li><code>2</code> — AUTHORIZED ✅</li>
                      <li><code>6</code> — DECLINED ❌</li>
                    </ul>
                  </div>
                  <div>
                    <h3 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>SatimLanguage</h3>
                    <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', listStyle: 'none' }}>
                      <li><code>AR</code> — Arabic</li>
                      <li><code>FR</code> — French (Default)</li>
                      <li><code>EN</code> — English</li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'errors' && (
              <section>
                <h1>Error Handling</h1>
                <p>All errors thrown by the SDK inherit from <code>SatimError</code>. Use these to build robust payment flows.</p>

                <h2>Handling API Errors</h2>
                <p>Thrown when SATIM returns a non-zero <code>errorCode</code>.</p>
                <pre>
                  <code>{`try {\n  await satim.registerOrder(...);\n} catch (err) {\n  if (err instanceof SatimApiError) {\n    console.log(err.errorCode); // Technical code\n    console.log(err.raw);       // Raw SATIM response\n  }\n}`}</code>
                </pre>

                <h2>Exception Types</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr', gap: '1rem', marginTop: '2rem' }}>
                  <strong style={{ color: 'var(--accent)' }}>SatimApiError</strong>
                  <span>Business errors from SATIM (e.g. invalid credentials)</span>

                  <strong style={{ color: 'var(--accent)' }}>SatimNetworkError</strong>
                  <span>Connection or timeout issues with SATIM servers</span>

                  <strong style={{ color: 'var(--accent)' }}>SatimValidationError</strong>
                  <span>Invalid inputs (e.g. negative amount) before sending request</span>
                </div>
              </section>
            )}
            {activeSection === 'legal' && (
              <section>
                <h1>Legal Notice</h1>
                <div style={{
                  padding: '1.5rem',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  marginBottom: '2rem',
                }}>
                  <p style={{ color: '#fca5a5', margin: 0, fontSize: '0.95rem' }}>
                    <strong>Disclaimer:</strong> This package is an <strong>unofficial</strong> open-source SDK.
                    It is NOT affiliated with, authorized, or endorsed by SATIM (Société d'Automatisation des Transactions Interbancaires et de Monétique).
                  </p>
                </div>

                <h2>Usage Requirements</h2>
                <p>To use this library in production, you MUST meet the following criteria:</p>
                <ul>
                  <li>You must have an official merchant account with an Algerian bank.</li>
                  <li>You must have received your technical credentials (User, Password, Terminal ID) directly from SATIM or your bank.</li>
                  <li>You are responsible for adhering to all Algerian financial regulations and SATIM's service agreements.</li>
                </ul>

                <h2>Legality & Distribution</h2>
                <p>
                  This library is a thin wrapper around SATIM's publicly documented REST APIs.
                  It does not include any private credentials, merchant keys, or security-bypassing code.
                  It is intended solely to improve the developer experience for authorized merchants.
                </p>

                <blockquote>
                  Use of this library is at your own risk. The authors are not responsible for any issues arising from
                  unauthorized use or non-compliance with SATIM's terms of service.
                </blockquote>
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string, desc: string }) {
  return (
    <div style={{
      padding: '1.5rem',
      borderRadius: '16px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border)',
      transition: 'transform 0.2s'
    }}>
      <h3 style={{ marginBottom: '0.75rem', color: 'var(--accent)', fontSize: '1.1rem' }}>{title}</h3>
      <p style={{ fontSize: '0.95rem', margin: 0 }}>{desc}</p>
    </div>
  )
}

export default App;

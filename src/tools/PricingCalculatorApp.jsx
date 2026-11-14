import React, { useState, useMemo } from 'react';
import './PricingCalculatorApp.css';

const PROJECT_ARCHETYPES = [
  {
    id: 'saas-mvp',
    name: 'Full-Stack SaaS MVP',
    baseHours: 80,
    desc: 'Core dashboard, API schema, and responsive UI shell',
  },
  {
    id: 'design-system',
    name: 'Design System & UI Kit',
    baseHours: 55,
    desc: 'Token architecture, accessible primitives, and docs',
  },
  {
    id: 'ai-agent',
    name: 'AI Workflow & Copilot',
    baseHours: 70,
    desc: 'LLM orchestration, streaming UI, and tool-use pipeline',
  },
  {
    id: 'marketing-flagship',
    name: 'Interactive Flagship Site',
    baseHours: 42,
    desc: 'Motion storytelling, WebGL/SVG craft, and 99+ Lighthouse',
  },
];

const FEATURE_MODULES = [
  {
    id: 'auth-rbac',
    name: 'Auth, OAuth & RBAC',
    hours: 18,
    desc: 'Multi-tenant roles, session security, and magic links',
  },
  {
    id: 'stripe-billing',
    name: 'Stripe Subscriptions',
    hours: 22,
    desc: 'Webhooks, metered usage tiers, and customer portal',
  },
  {
    id: 'realtime-sync',
    name: 'Realtime Collaboration',
    hours: 28,
    desc: 'WebSockets, live presence cursors, and optimistic UI',
  },
  {
    id: 'motion-shaders',
    name: 'Bespoke SVG & Motion',
    hours: 20,
    desc: 'Custom micro-interactions, choreographed transitions',
  },
  {
    id: 'analytics-hub',
    name: 'Telemetry & Analytics',
    hours: 16,
    desc: 'Custom funnel charts, audit logs, and CSV/JSON exports',
  },
  {
    id: 'cicd-testing',
    name: 'Automated CI/CD & E2E',
    hours: 14,
    desc: 'GitHub Actions pipeline, Playwright suite, zero-downtime',
  },
];

const COMPLEXITY_TIERS = [
  { id: 'standard', label: 'Standard (1.0×)', mult: 1.0 },
  { id: 'scale', label: 'High Scale (1.25×)', mult: 1.25 },
  { id: 'enterprise', label: 'Enterprise (1.5×)', mult: 1.5 },
];

const URGENCY_TIERS = [
  { id: 'flexible', label: 'Flexible (-10%)', mult: 0.9 },
  { id: 'normal', label: 'Standard (1.0×)', mult: 1.0 },
  { id: 'rush', label: 'Sprint Rush (+30%)', mult: 1.3 },
];

const SAAS_ADDONS = [
  { id: 'sso', name: 'Enterprise SAML SSO', monthly: 140, desc: 'Okta, Azure AD, and SCIM provisioning' },
  { id: 'vpc', name: 'Dedicated Cloud Region', monthly: 290, desc: 'Isolated data residency & private peering' },
  { id: 'sla', name: '24/7 Priority Slack SLA', monthly: 180, desc: 'Under 30-min engineering response time' },
  { id: 'audit', name: 'Compliance Audit Stream', monthly: 95, desc: 'SOC2 SIEM log forwarding & retention' },
];

export default function PricingCalculatorApp({ onNavigateHome }) {
  const [calculatorMode, setCalculatorMode] = useState('project'); // 'project' | 'saas'

  // Project Scope State
  const [archetypeId, setArchetypeId] = useState('saas-mvp');
  const [selectedModules, setSelectedModules] = useState(['auth-rbac', 'stripe-billing', 'motion-shaders']);
  const [hourlyRate, setHourlyRate] = useState(125);
  const [complexityId, setComplexityId] = useState('standard');
  const [urgencyId, setUrgencyId] = useState('normal');
  const [retainerDiscount, setRetainerDiscount] = useState(false);

  // SaaS Plan State
  const [seats, setSeats] = useState(18);
  const [eventsK, setEventsK] = useState(250); // in thousands
  const [annualBilling, setAnnualBilling] = useState(true);
  const [selectedAddons, setSelectedAddons] = useState(['sso', 'sla']);

  const [exportTab, setExportTab] = useState('markdown');
  const [copied, setCopied] = useState(false);

  const toggleModule = (id) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAddon = (id) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const projectEstimate = useMemo(() => {
    const arch = PROJECT_ARCHETYPES.find((a) => a.id === archetypeId) || PROJECT_ARCHETYPES[0];
    const mods = FEATURE_MODULES.filter((m) => selectedModules.includes(m.id));
    const modHours = mods.reduce((sum, m) => sum + m.hours, 0);
    const rawHours = arch.baseHours + modHours;

    const comp = COMPLEXITY_TIERS.find((c) => c.id === complexityId) || COMPLEXITY_TIERS[0];
    const urg = URGENCY_TIERS.find((u) => u.id === urgencyId) || URGENCY_TIERS[1];

    const effectiveHours = Math.round(rawHours * comp.mult);
    const subtotal = effectiveHours * hourlyRate * urg.mult;
    const discountAmount = retainerDiscount ? Math.round(subtotal * 0.1) : 0;
    const total = Math.round(subtotal - discountAmount);
    const estimatedWeeks = Math.max(1.5, +(effectiveHours / (urg.id === 'rush' ? 40 : 30)).toFixed(1));

    return {
      arch,
      mods,
      rawHours,
      effectiveHours,
      comp,
      urg,
      subtotal: Math.round(subtotal),
      discountAmount,
      total,
      estimatedWeeks,
      kickoff: Math.round(total * 0.3),
      alpha: Math.round(total * 0.4),
      launch: total - Math.round(total * 0.3) - Math.round(total * 0.4),
    };
  }, [archetypeId, selectedModules, hourlyRate, complexityId, urgencyId, retainerDiscount]);

  const saasEstimate = useMemo(() => {
    const basePlatform = 79;
    const seatCost = seats * 19;
    const usageBlocks = Math.max(0, Math.ceil((eventsK - 50) / 50));
    const usageCost = usageBlocks * 25;
    const addonsList = SAAS_ADDONS.filter((a) => selectedAddons.includes(a.id));
    const addonsCost = addonsList.reduce((sum, a) => sum + a.monthly, 0);

    const rawMonthly = basePlatform + seatCost + usageCost + addonsCost;
    const effectiveMonthly = annualBilling ? Math.round(rawMonthly * 0.8) : rawMonthly;
    const annualTotal = effectiveMonthly * 12;
    const annualSavings = annualBilling ? (rawMonthly - effectiveMonthly) * 12 : 0;
    const hoursSavedMonthly = seats * 11;

    return {
      basePlatform,
      seatCost,
      usageCost,
      addonsList,
      addonsCost,
      rawMonthly,
      effectiveMonthly,
      annualTotal,
      annualSavings,
      hoursSavedMonthly,
    };
  }, [seats, eventsK, annualBilling, selectedAddons]);

  const quoteExportText = useMemo(() => {
    if (calculatorMode === 'project') {
      if (exportTab === 'json') {
        return JSON.stringify(
          {
            mode: 'project_scope_estimate',
            archetype: projectEstimate.arch.name,
            hourlyRateUSD: hourlyRate,
            effectiveHours: projectEstimate.effectiveHours,
            estimatedWeeks: projectEstimate.estimatedWeeks,
            complexity: projectEstimate.comp.label,
            timeline: projectEstimate.urg.label,
            modules: projectEstimate.mods.map((m) => ({ name: m.name, hours: m.hours })),
            totalInvestmentUSD: projectEstimate.total,
            milestones: {
              kickoff30: projectEstimate.kickoff,
              alpha40: projectEstimate.alpha,
              launch30: projectEstimate.launch,
            },
          },
          null,
          2
        );
      }

      const modLines =
        projectEstimate.mods.length > 0
          ? projectEstimate.mods.map((m) => `- **${m.name}** (+${m.hours} hrs)`).join('\n')
          : '- Base architecture only';

      return `### Engineering Proposal Estimate — ${projectEstimate.arch.name}

- **Base Track**: ${projectEstimate.arch.name} (${projectEstimate.arch.baseHours} hrs)
- **Complexity & Velocity**: ${projectEstimate.comp.label} • ${projectEstimate.urg.label}
- **Estimated Effort**: ${projectEstimate.effectiveHours} engineering hours (~${projectEstimate.estimatedWeeks} weeks)
- **Blended Rate**: $${hourlyRate}/hr

#### Selected Scope Modules
${modLines}

#### Milestone Schedule
1. **30% Kickoff & Architecture**: $${projectEstimate.kickoff.toLocaleString()}
2. **40% Beta Milestone Delivery**: $${projectEstimate.alpha.toLocaleString()}
3. **30% Production Launch**: $${projectEstimate.launch.toLocaleString()}

**Total Estimated Investment: $${projectEstimate.total.toLocaleString()} USD**`;
    }

    if (exportTab === 'json') {
      return JSON.stringify(
        {
          mode: 'saas_subscription_quote',
          billingCycle: annualBilling ? 'annual_20_off' : 'monthly',
          seats,
          monthlyEventsK: eventsK,
          addons: saasEstimate.addonsList.map((a) => a.name),
          monthlyEffectiveUSD: saasEstimate.effectiveMonthly,
          annualContractValueUSD: saasEstimate.annualTotal,
          annualSavingsUSD: saasEstimate.annualSavings,
        },
        null,
        2
      );
    }

    return `### SaaS Subscription Quote (${annualBilling ? 'Annual Plan — 20% Off' : 'Monthly Plan'})

- **Active Team Seats**: ${seats} seats ($${saasEstimate.seatCost}/mo)
- **Event Volume**: ${eventsK}k monthly events ($${saasEstimate.usageCost}/mo)
- **Enterprise Add-ons**: ${saasEstimate.addonsList.map((a) => a.name).join(', ') || 'None'}

**Effective Monthly Investment**: **$${saasEstimate.effectiveMonthly.toLocaleString()}/mo**
**Annual Contract Value (ACV)**: **$${saasEstimate.annualTotal.toLocaleString()}/yr**${
      saasEstimate.annualSavings > 0
        ? ` *(Saves $${saasEstimate.annualSavings.toLocaleString()}/yr)*`
        : ''
    }`;
  }, [calculatorMode, exportTab, projectEstimate, saasEstimate, hourlyRate, annualBilling, seats, eventsK]);

  const handleCopyQuote = async () => {
    try {
      await navigator.clipboard.writeText(quoteExportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="price-studio-shell">
      <header className="price-studio-topbar">
        <div className="price-studio-topbar-inner">
          <div className="price-studio-brand">
            <a
              href="/"
              className="price-studio-back"
              aria-label="Back to portfolio"
              onClick={(e) => {
                if (onNavigateHome) {
                  e.preventDefault();
                  onNavigateHome();
                }
              }}
            >
              ← Portfolio
            </a>
            <div>
              <span className="price-studio-kicker">TOOL // SCOPE &amp; REVENUE MODELER</span>
              <h1 className="price-studio-title">Interactive Pricing Calculator</h1>
            </div>
          </div>

          <div className="price-mode-switch" role="tablist">
            <button
              type="button"
              className={`price-mode-pill ${calculatorMode === 'project' ? 'is-active' : ''}`}
              onClick={() => setCalculatorMode('project')}
            >
              Project Scope Estimator
            </button>
            <button
              type="button"
              className={`price-mode-pill ${calculatorMode === 'saas' ? 'is-active' : ''}`}
              onClick={() => setCalculatorMode('saas')}
            >
              SaaS Tier &amp; ROI Calculator
            </button>
          </div>
        </div>
      </header>

      <main className="price-studio-workspace">
        <div className="price-config-column">
          {calculatorMode === 'project' ? (
            <>
              <section className="price-card">
                <div className="price-card-head">
                  <h2 className="price-card-title">1. Base Project Archetype</h2>
                  <span className="price-card-badge">{projectEstimate.arch.baseHours} HRS BASE</span>
                </div>

                <div className="price-archetype-grid">
                  {PROJECT_ARCHETYPES.map((arch) => (
                    <button
                      key={arch.id}
                      type="button"
                      className={`price-archetype-btn ${archetypeId === arch.id ? 'is-active' : ''}`}
                      onClick={() => setArchetypeId(arch.id)}
                    >
                      <span className="price-archetype-name">{arch.name}</span>
                      <span className="price-archetype-meta">
                        {arch.baseHours} hrs • {arch.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="price-card">
                <div className="price-card-head">
                  <h2 className="price-card-title">2. Interactive Scope Modules</h2>
                  <span className="price-card-badge">
                    {selectedModules.length} OF {FEATURE_MODULES.length} SELECTED
                  </span>
                </div>

                <div className="price-modules-grid">
                  {FEATURE_MODULES.map((mod) => {
                    const isSelected = selectedModules.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        className={`price-module-tile ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => toggleModule(mod.id)}
                      >
                        <div>
                          <span className="price-module-title">
                            {isSelected ? '✓ ' : '+ '}
                            {mod.name}
                          </span>
                          <span className="price-module-desc">{mod.desc}</span>
                        </div>
                        <span className="price-module-hours">+{mod.hours}h</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="price-card">
                <div className="price-card-head">
                  <h2 className="price-card-title">3. Rate, Complexity &amp; Velocity</h2>
                  <span className="price-card-badge">${hourlyRate}/HR</span>
                </div>

                <div className="price-slider-group">
                  <div className="price-slider-row">
                    <div className="price-slider-label">
                      <span>Engineering Hourly Rate</span>
                      <span className="price-slider-val">${hourlyRate} USD / hr</span>
                    </div>
                    <input
                      type="range"
                      className="price-slider"
                      min="65"
                      max="225"
                      step="5"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                    />
                  </div>

                  <div className="price-slider-row">
                    <div className="price-slider-label">
                      <span>Architecture Complexity</span>
                    </div>
                    <div className="price-tier-pills">
                      {COMPLEXITY_TIERS.map((tier) => (
                        <button
                          key={tier.id}
                          type="button"
                          className={`price-tier-btn ${complexityId === tier.id ? 'is-active' : ''}`}
                          onClick={() => setComplexityId(tier.id)}
                        >
                          {tier.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="price-slider-row">
                    <div className="price-slider-label">
                      <span>Delivery Timeline Urgency</span>
                    </div>
                    <div className="price-tier-pills">
                      {URGENCY_TIERS.map((tier) => (
                        <button
                          key={tier.id}
                          type="button"
                          className={`price-tier-btn ${urgencyId === tier.id ? 'is-active' : ''}`}
                          onClick={() => setUrgencyId(tier.id)}
                        >
                          {tier.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="price-slider-row">
                    <button
                      type="button"
                      className={`price-tier-btn ${retainerDiscount ? 'is-active' : ''}`}
                      onClick={() => setRetainerDiscount((v) => !v)}
                    >
                      {retainerDiscount
                        ? '✓ Multi-Quarter Retainer Partner Discount (-10% Applied)'
                        : 'Apply Quarterly Retainer Partner Discount (-10%)'}
                    </button>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="price-card">
                <div className="price-card-head">
                  <h2 className="price-card-title">1. Team Seats &amp; Metered Scale</h2>
                  <button
                    type="button"
                    className={`price-tier-btn ${annualBilling ? 'is-active' : ''}`}
                    onClick={() => setAnnualBilling((v) => !v)}
                  >
                    {annualBilling ? '✓ Annual Billing (20% Off)' : 'Switch to Annual (Save 20%)'}
                  </button>
                </div>

                <div className="price-slider-group">
                  <div className="price-slider-row">
                    <div className="price-slider-label">
                      <span>Active Workspace Seats ($19/seat)</span>
                      <span className="price-slider-val">{seats} seats</span>
                    </div>
                    <input
                      type="range"
                      className="price-slider"
                      min="1"
                      max="150"
                      value={seats}
                      onChange={(e) => setSeats(Number(e.target.value))}
                    />
                  </div>

                  <div className="price-slider-row">
                    <div className="price-slider-label">
                      <span>Monthly API / Telemetry Events</span>
                      <span className="price-slider-val">{eventsK.toLocaleString()}k events/mo</span>
                    </div>
                    <input
                      type="range"
                      className="price-slider"
                      min="50"
                      max="2000"
                      step="50"
                      value={eventsK}
                      onChange={(e) => setEventsK(Number(e.target.value))}
                    />
                  </div>
                </div>
              </section>

              <section className="price-card">
                <div className="price-card-head">
                  <h2 className="price-card-title">2. Enterprise Security &amp; SLA Add-ons</h2>
                  <span className="price-card-badge">{selectedAddons.length} ACTIVE</span>
                </div>

                <div className="price-modules-grid">
                  {SAAS_ADDONS.map((addon) => {
                    const isSelected = selectedAddons.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        className={`price-module-tile ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => toggleAddon(addon.id)}
                      >
                        <div>
                          <span className="price-module-title">
                            {isSelected ? '✓ ' : '+ '}
                            {addon.name}
                          </span>
                          <span className="price-module-desc">{addon.desc}</span>
                        </div>
                        <span className="price-module-hours">+${addon.monthly}/mo</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>

        <aside className="price-summary-column">
          {calculatorMode === 'project' ? (
            <div className="price-receipt-card">
              <span className="price-receipt-kicker">LIVE PROJECT INVESTMENT QUOTE</span>
              <div className="price-total-figure">
                ${projectEstimate.total.toLocaleString()}
                <span className="price-total-sub">USD</span>
              </div>

              <div className="price-metrics-strip">
                <div className="price-metric-box">
                  <span className="price-metric-label">Total Effort</span>
                  <span className="price-metric-val">{projectEstimate.effectiveHours} hrs</span>
                </div>
                <div className="price-metric-box">
                  <span className="price-metric-label">Est. Duration</span>
                  <span className="price-metric-val">~{projectEstimate.estimatedWeeks} wks</span>
                </div>
                <div className="price-metric-box">
                  <span className="price-metric-label">Modules</span>
                  <span className="price-metric-val">+{projectEstimate.mods.length}</span>
                </div>
              </div>

              <div className="price-line-items">
                <div className="price-line-row">
                  <span>{projectEstimate.arch.name} (Base)</span>
                  <strong>{projectEstimate.arch.baseHours} hrs</strong>
                </div>
                <div className="price-line-row">
                  <span>Selected Feature Modules ({projectEstimate.mods.length})</span>
                  <strong>+{projectEstimate.rawHours - projectEstimate.arch.baseHours} hrs</strong>
                </div>
                <div className="price-line-row">
                  <span>Complexity &amp; Urgency Multipliers</span>
                  <strong>
                    {projectEstimate.comp.mult}× / {projectEstimate.urg.mult}×
                  </strong>
                </div>
                {projectEstimate.discountAmount > 0 && (
                  <div className="price-line-row" style={{ color: '#10b981' }}>
                    <span>Retainer Partner Discount (10%)</span>
                    <strong>-${projectEstimate.discountAmount.toLocaleString()}</strong>
                  </div>
                )}
              </div>

              <div className="price-milestones">
                <div className="price-milestone-bar">
                  <span>01. Kickoff &amp; Architecture (30%)</span>
                  <strong>${projectEstimate.kickoff.toLocaleString()}</strong>
                </div>
                <div className="price-milestone-bar">
                  <span>02. Alpha Build &amp; Review (40%)</span>
                  <strong>${projectEstimate.alpha.toLocaleString()}</strong>
                </div>
                <div className="price-milestone-bar">
                  <span>03. Production Handover (30%)</span>
                  <strong>${projectEstimate.launch.toLocaleString()}</strong>
                </div>
              </div>

              <button type="button" className="price-copy-btn" onClick={handleCopyQuote}>
                {copied ? '✓ Proposal Copied to Clipboard' : 'Copy Shareable Proposal Quote'}
              </button>
            </div>
          ) : (
            <div className="price-receipt-card">
              <span className="price-receipt-kicker">SAAS SUBSCRIPTION SUMMARY</span>
              <div className="price-total-figure">
                ${saasEstimate.effectiveMonthly.toLocaleString()}
                <span className="price-total-sub">/ month</span>
              </div>

              <div className="price-metrics-strip">
                <div className="price-metric-box">
                  <span className="price-metric-label">Annual ACV</span>
                  <span className="price-metric-val">${saasEstimate.annualTotal.toLocaleString()}</span>
                </div>
                <div className="price-metric-box">
                  <span className="price-metric-label">Annual Savings</span>
                  <span className="price-metric-val" style={{ color: '#10b981' }}>
                    ${saasEstimate.annualSavings.toLocaleString()}
                  </span>
                </div>
                <div className="price-metric-box">
                  <span className="price-metric-label">Time Saved</span>
                  <span className="price-metric-val">{saasEstimate.hoursSavedMonthly}h/mo</span>
                </div>
              </div>

              <div className="price-line-items">
                <div className="price-line-row">
                  <span>Core Platform Base</span>
                  <strong>${saasEstimate.basePlatform}/mo</strong>
                </div>
                <div className="price-line-row">
                  <span>Team Seats ({seats} × $19)</span>
                  <strong>${saasEstimate.seatCost}/mo</strong>
                </div>
                <div className="price-line-row">
                  <span>Metered Events ({eventsK}k/mo)</span>
                  <strong>${saasEstimate.usageCost}/mo</strong>
                </div>
                <div className="price-line-row">
                  <span>Enterprise Add-ons ({saasEstimate.addonsList.length})</span>
                  <strong>${saasEstimate.addonsCost}/mo</strong>
                </div>
              </div>

              <button type="button" className="price-copy-btn" onClick={handleCopyQuote}>
                {copied ? '✓ Quote Copied to Clipboard' : 'Copy SaaS Quote Summary'}
              </button>
            </div>
          )}

          <div className="price-card">
            <div className="price-card-head">
              <div className="price-tier-pills" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <button
                  type="button"
                  className={`price-tier-btn ${exportTab === 'markdown' ? 'is-active' : ''}`}
                  onClick={() => setExportTab('markdown')}
                >
                  Markdown Proposal
                </button>
                <button
                  type="button"
                  className={`price-tier-btn ${exportTab === 'json' ? 'is-active' : ''}`}
                  onClick={() => setExportTab('json')}
                >
                  JSON Payload
                </button>
              </div>
            </div>
            <pre className="price-code-pre">
              <code>{quoteExportText}</code>
            </pre>
          </div>
        </aside>
      </main>
    </div>
  );
}

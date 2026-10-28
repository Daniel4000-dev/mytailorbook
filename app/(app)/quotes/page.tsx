'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import TopBar from '@/components/layout/TopBar/TopBar';
import Symbol from '@/components/ui/Symbol/Symbol';
import Avatar from '@/components/ui/Avatar/Avatar';
import MoneyInput from '@/components/ui/MoneyInput/MoneyInput';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import { formatCurrency, getWhatsAppLink } from '@/lib/formatters';
import type { Customer } from '@/lib/types';
import { useToast } from '@/contexts/ToastContext';
import styles from './page.module.css';

interface CostItem {
  id: string;
  name: string;
  amount: number;
}

interface SavedQuote {
  id: string;
  clientName: string;
  clientPhone: string;
  garmentTitle: string;
  fabricSourcing: 'customer' | 'shop';
  totalCost: number;
  recommendedPrice: number;
  depositAmount: number;
  turnaroundDays: number;
  createdAt: string;
}

const CRAFT_PRESET_CATEGORIES = [
  {
    category: 'Fabric & Foundation',
    items: [
      { name: 'Fabric Material / Cloth', defaultAmount: 0 },
      { name: 'German Woven Stay & Canvas', defaultAmount: 0 },
      { name: 'Silk / Jacquard Lining', defaultAmount: 0 },
      { name: 'Buttons, Zippers & Notions', defaultAmount: 0 },
    ],
  },
  {
    category: 'Workmanship & Construction',
    items: [
      { name: 'Cutting, Tailoring & Construction', defaultAmount: 0 },
      { name: 'Custom Monogram / Initials', defaultAmount: 0 },
    ],
  },
  {
    category: 'Luxury Embellishments',
    items: [
      { name: 'Filigree Chest Embroidery', defaultAmount: 0 },
      { name: 'Hand Beading & Crystals', defaultAmount: 0 },
      { name: 'Machine Crystal Stoning', defaultAmount: 0 },
      { name: 'Aso-Oke Accents & Trims', defaultAmount: 0 },
    ],
  },
  {
    category: 'Atelier Packaging & Delivery',
    items: [
      { name: 'Garment Suit Bag & Hanger', defaultAmount: 0 },
      { name: 'Courier Dispatch / Delivery', defaultAmount: 0 },
    ],
  },
];

const STYLE_PRESETS_MALE = [
  'Senator Suite',
  'Royal 3-Piece Agbada',
  'Luxury Kaftan',
  'Two-Piece Bespoke Suit',
  'Safari Suit',
  'Casual Danshiki',
];

const STYLE_PRESETS_FEMALE = [
  'Royal Silk Boubou',
  'Corset Lace Gown',
  'Ankara Mermaid Gown',
  'Two-Piece Silk Set',
  'Chic Jumpsuit',
];

const MARKUP_PRESETS = [
  { label: '30%', value: '30' },
  { label: '40%', value: '40' },
  { label: '50% (Standard)', value: '50' },
  { label: '70% (Premium)', value: '70' },
  { label: '100% (2x Luxury)', value: '100' },
];

const DEPOSIT_PRESETS = [
  { label: '70% Upfront (30% Balance)', value: 70 },
  { label: '60% Upfront (40% Balance)', value: 60 },
  { label: '50% Upfront (50% Balance)', value: 50 },
  { label: '100% Full Payment', value: 100 },
];

const TURNAROUND_PRESETS = [
  { label: 'Standard (10–14 days)', days: 12, rushFeePercent: 0 },
  { label: 'Express Priority (5–7 days)', days: 6, rushFeePercent: 15 },
  { label: 'Emergency 48h (2–3 days)', days: 3, rushFeePercent: 30 },
];

export default function QuoteEstimatorPage() {
  const router = useRouter();
  const { currentShop, customers } = useData();
  const { showToast } = useToast();

  const currency = currentShop?.currency || 'NGN';
  const shopName = currentShop?.name || 'Bespoke Atelier';

  // Client Selection State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerPhone, setManualCustomerPhone] = useState('');

  // Style & Fabric Sourcing
  const [genderTab, setGenderTab] = useState<'male' | 'female'>('male');
  const [garmentTitle, setGarmentTitle] = useState('Senator Suite');
  const [fabricSourcing, setFabricSourcing] = useState<'customer' | 'shop'>('shop');
  
  // Fabric Quick Yardage Helper
  const [fabricYards, setFabricYards] = useState('4');
  const [fabricRatePerYard, setFabricRatePerYard] = useState('0');

  // Costs Breakdown
  const [costs, setCosts] = useState<CostItem[]>([
    { id: '1', name: 'Fabric Material / Cloth', amount: 0 },
    { id: '2', name: 'Cutting, Tailoring & Construction', amount: 0 },
  ]);

  // Turnaround & Timeline
  const [turnaroundIndex, setTurnaroundIndex] = useState(0);

  // Pricing & Margin State
  const [marginPercent, setMarginPercent] = useState('50');
  const [depositPercent, setDepositPercent] = useState(70);

  // WhatsApp Format Preference
  const [whatsAppFormat, setWhatsAppFormat] = useState<'inclusive' | 'itemized'>('inclusive');

  // Copy status
  const [copied, setCopied] = useState(false);

  // Recent Quotes Cache
  const [recentQuotes, setRecentQuotes] = useState<SavedQuote[]>([]);
  const [showRecentTray, setShowRecentTray] = useState(false);

  // Load recent quotes from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(`mtb_recent_quotes_${currentShop?.id || 'default'}`);
      if (stored) {
        setRecentQuotes(JSON.parse(stored));
      }
    } catch {
      // Ignore cache errors
    }
  }, [currentShop?.id]);

  // Save quote to recent history
  const recordRecentQuote = (quote: SavedQuote) => {
    try {
      const updated = [quote, ...recentQuotes.filter((q) => q.id !== quote.id)].slice(0, 5);
      setRecentQuotes(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`mtb_recent_quotes_${currentShop?.id || 'default'}`, JSON.stringify(updated));
      }
    } catch {
      // Ignore cache errors
    }
  };

  // Search autocomplete for existing clients
  const searchResults = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const query = customerSearch.toLowerCase().trim();
    const digits = query.replace(/\D/g, '');
    return customers
      .filter((c) => {
        if (c.fullName.toLowerCase().includes(query)) return true;
        if (digits && c.whatsappNumber.includes(digits)) return true;
        return false;
      })
      .slice(0, 5);
  }, [customers, customerSearch]);

  const activeCustomerName = selectedCustomer ? selectedCustomer.fullName : manualCustomerName.trim();
  const activeCustomerPhone = selectedCustomer ? selectedCustomer.whatsappNumber : manualCustomerPhone.trim();

  // Cost Item Handlers
  const addCostItem = (name = '', defaultAmount = 0) => {
    setCosts((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, name, amount: defaultAmount }]);
  };

  const removeCostItem = (id: string) => {
    if (costs.length <= 1) {
      setCosts([{ id: '1', name: '', amount: 0 }]);
      return;
    }
    setCosts((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCostItem = (id: string, field: 'name' | 'amount', value: string | number) => {
    setCosts((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  // Handle Fabric Sourcing toggle
  const handleToggleFabricSourcing = (source: 'customer' | 'shop') => {
    setFabricSourcing(source);
    if (source === 'customer') {
      // Zero out fabric item or remove it
      setCosts((prev) => prev.map((c) => (c.name.toLowerCase().includes('fabric') ? { ...c, amount: 0 } : c)));
    }
  };

  // Apply Yardage Calculator to first fabric item
  const applyYardageCalculation = () => {
    const y = parseFloat(fabricYards) || 0;
    const r = parseFloat(fabricRatePerYard) || 0;
    const total = Math.round(y * r);
    if (total > 0) {
      setCosts((prev) => {
        const idx = prev.findIndex((c) => c.name.toLowerCase().includes('fabric'));
        const desc = `${fabricYards} yards fabric (@ ${formatCurrency(r, currency)}/yd)`;
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], name: desc, amount: total };
          return next;
        }
        return [{ id: `${Date.now()}`, name: desc, amount: total }, ...prev];
      });
      showToast(`Added ${fabricYards} yards (${formatCurrency(total, currency)}) to costs`, 'info');
    }
  };

  // Financial Calculations
  const baseCost = useMemo(() => costs.reduce((sum, item) => sum + (item.amount || 0), 0), [costs]);
  const activeTurnaround = TURNAROUND_PRESETS[turnaroundIndex] || TURNAROUND_PRESETS[0];
  const rushFeeMultiplier = 1 + activeTurnaround.rushFeePercent / 100;
  
  const margin = parseFloat(marginPercent) || 0;
  const markupMultiplier = 1 + margin / 100;

  // Final Price & Profit
  const recommendedPrice = Math.round(baseCost * markupMultiplier * rushFeeMultiplier);
  const projectedProfit = recommendedPrice - baseCost;
  const profitMarginPercent = recommendedPrice > 0 ? (projectedProfit / recommendedPrice) * 100 : 0;

  // Deposit breakdown
  const depositAmount = Math.round((recommendedPrice * depositPercent) / 100);
  const balanceDue = recommendedPrice - depositAmount;

  // Estimated completion date
  const estimatedCompletionDate = useMemo(() => {
    const target = new Date();
    target.setDate(target.getDate() + activeTurnaround.days);
    return target.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [activeTurnaround.days]);

  // Convert Quote into Bespoke Order
  const handleConvertToOrder = () => {
    const custId = selectedCustomer?.id || '';
    const styleQuery = encodeURIComponent(garmentTitle.trim() || 'Senator');
    const priceQuery = encodeURIComponent(recommendedPrice.toString());
    const materialQuery = encodeURIComponent(fabricSourcing);

    // Build comprehensive breakdown note for the cutter/tailor
    const filteredCosts = costs.filter((c) => c.name.trim() && c.amount > 0);
    const costNoteLines = filteredCosts.map((c) => `${c.name}: ${formatCurrency(c.amount, currency)}`).join(', ');
    const noteSummary = `[QUOTATION SPEC] ${garmentTitle}. Fabric: ${
      fabricSourcing === 'customer' ? 'Client Provided' : 'Atelier Sourced'
    }. Items: ${costNoteLines || 'Standard Tailoring'}. Target: ${estimatedCompletionDate}. Initial Deposit: ${formatCurrency(
      depositAmount,
      currency
    )} (${depositPercent}%).`;
    const notesQuery = encodeURIComponent(noteSummary);

    // Save to recent quotes history
    recordRecentQuote({
      id: `quote-${Date.now()}`,
      clientName: activeCustomerName || 'Walk-in Client',
      clientPhone: activeCustomerPhone,
      garmentTitle,
      fabricSourcing,
      totalCost: baseCost,
      recommendedPrice,
      depositAmount,
      turnaroundDays: activeTurnaround.days,
      createdAt: new Date().toISOString(),
    });

    let targetUrl = `/orders/new?style=${styleQuery}&price=${priceQuery}&material=${materialQuery}&notes=${notesQuery}`;
    if (custId) {
      targetUrl += `&customer=${custId}`;
    }

    showToast('Converting quote to bespoke intake order...', 'success');
    router.push(targetUrl);
  };

  // Generate Courteous Nigerian Atelier WhatsApp Quotation Message
  const generateQuoteMessage = () => {
    const greeting = activeCustomerName ? `Good day Chief ${activeCustomerName}` : `Good day`;
    const filteredCosts = costs.filter((c) => c.name.trim() && c.amount > 0);

    const fabricNote =
      fabricSourcing === 'customer'
        ? '• Fabric: Client Provided (delivered to atelier)'
        : '• Fabric: Sourced & Supplied by Atelier';

    let contentBody = '';
    if (whatsAppFormat === 'inclusive') {
      contentBody = `Outfit: ${garmentTitle || 'Bespoke Garment'}
${fabricNote}
• Construction: Handcrafted Bespoke Tailoring & Finishing
• Turnaround: ${activeTurnaround.label} (Est. Delivery: ${estimatedCompletionDate})`;
    } else {
      const costLines =
        filteredCosts.length > 0
          ? filteredCosts.map((c) => `• ${c.name}: ${formatCurrency(c.amount, currency)}`).join('\n')
          : `• Bespoke Tailoring & Materials: ${formatCurrency(baseCost, currency)}`;
      contentBody = `Outfit: ${garmentTitle || 'Bespoke Garment'}
${fabricNote}
${costLines}
• Turnaround: ${activeTurnaround.label} (Est. Delivery: ${estimatedCompletionDate})`;
    }

    const depositLine =
      depositPercent < 100
        ? `Commitment Deposit (${depositPercent}%): ${formatCurrency(depositAmount, currency)}
Balance Upon Delivery / Fitting: ${formatCurrency(balanceDue, currency)}`
        : `Payment: Full Payment of ${formatCurrency(recommendedPrice, currency)}`;

    return `${greeting}!

Here is your bespoke price quotation from ${shopName}:

${contentBody}
─────────────────────────
Total Investment: ${formatCurrency(recommendedPrice, currency)}
${depositLine}

To confirm this commission and schedule your initial measurement or fitting session, please reply to this message. We look forward to crafting your piece!

${shopName}`;
  };

  // Send via WhatsApp
  const handleSendWhatsApp = () => {
    // Record quote before sending
    recordRecentQuote({
      id: `quote-${Date.now()}`,
      clientName: activeCustomerName || 'Walk-in Client',
      clientPhone: activeCustomerPhone,
      garmentTitle,
      fabricSourcing,
      totalCost: baseCost,
      recommendedPrice,
      depositAmount,
      turnaroundDays: activeTurnaround.days,
      createdAt: new Date().toISOString(),
    });

    const text = generateQuoteMessage();
    if (activeCustomerPhone) {
      const link = getWhatsAppLink(activeCustomerPhone, text);
      window.open(link, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // Copy Quote Text to Clipboard
  const handleCopyQuote = () => {
    const text = generateQuoteMessage();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('Quotation text copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Restore saved quote
  const handleRestoreSavedQuote = (saved: SavedQuote) => {
    setGarmentTitle(saved.garmentTitle);
    setFabricSourcing(saved.fabricSourcing);
    setManualCustomerName(saved.clientName);
    setManualCustomerPhone(saved.clientPhone);
    showToast(`Loaded quote for ${saved.clientName}`, 'info');
    setShowRecentTray(false);
  };

  return (
    <>
      <div className="noPrint">
        <TopBar
          title="Bespoke Quote Estimator"
          subtitle="Estimate costs, calculate margins & send quotes"
          showBack
          onBack={() => router.back()}
        />
      </div>

      <div className={styles.container}>
        {/* --- PRINT ONLY INVOICE HEADER --- */}
        <div className={styles.printOnly}>
          <div className={styles.printHeader}>
            <div>
              <h1 className={styles.printShopName}>{shopName}</h1>
              <p className={styles.printDocType}>Official Price Quotation & Pro-Forma Estimate</p>
            </div>
            <div className={styles.printMeta}>
              <h2 className={styles.printDocLabel}>ESTIMATE</h2>
              <p className={styles.printDate}>Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className={styles.printClientSection}>
            <div>
              <h3 className={styles.printSubheading}>Quotation Prepared For:</h3>
              <p className={styles.printClientName}>{activeCustomerName || 'Valued Client'}</p>
              {activeCustomerPhone && <p className={styles.printClientPhone}>{activeCustomerPhone}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 className={styles.printSubheading}>Garment Specification:</h3>
              <p className={styles.printGarmentTitle}>{garmentTitle || 'Custom Bespoke Tailoring'}</p>
              <p className={styles.printDeliveryDate}>Estimated Delivery: {estimatedCompletionDate}</p>
            </div>
          </div>

          <table className={styles.printTable}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Item / Description</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {costs
                .filter((c) => c.name && c.amount > 0)
                .map((cost, idx) => (
                  <tr key={idx}>
                    <td>{cost.name}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(cost.amount, currency)}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div className={styles.printTotalRow}>
            <div className={styles.printTotalBox}>
              <div className={styles.printTotalLine}>
                <span>Materials &amp; Construction Cost</span>
                <span>{formatCurrency(baseCost, currency)}</span>
              </div>
              <div className={`${styles.printTotalLine} ${styles.printGrandTotal}`}>
                <span>Total Quotation</span>
                <span>{formatCurrency(recommendedPrice, currency)}</span>
              </div>
              <div className={styles.printTotalLine} style={{ marginTop: '8px', color: '#4B5563' }}>
                <span>Required Commitment Deposit ({depositPercent}%)</span>
                <span>{formatCurrency(depositAmount, currency)}</span>
              </div>
              <div className={styles.printTotalLine} style={{ color: '#4B5563' }}>
                <span>Balance Due on Fitting/Delivery</span>
                <span>{formatCurrency(balanceDue, currency)}</span>
              </div>
            </div>
          </div>

          <div className={styles.printFooter}>
            <p>Thank you for choosing {shopName}. Valid for 14 days from date of issue.</p>
          </div>
        </div>
        {/* --- END PRINT ONLY --- */}

        {/* --- INTERACTIVE ON-SCREEN APP --- */}
        <div className={`${styles.mainContent} noPrint`}>
          {/* Top Bar Utilities: Recent Quotes History Trigger */}
          {recentQuotes.length > 0 && (
            <div className={styles.historyTriggerRow}>
              <button
                type="button"
                className={styles.historyTriggerBtn}
                onClick={() => setShowRecentTray(!showRecentTray)}
              >
                <Symbol name="history" size={16} />
                <span>Recent Quotes ({recentQuotes.length})</span>
                <Symbol name={showRecentTray ? 'expand_less' : 'expand_more'} size={16} />
              </button>

              {showRecentTray && (
                <div className={styles.recentQuotesDropdown}>
                  <div className={styles.recentQuotesHeader}>
                    <span>Previously Quoted Commissions</span>
                    <button
                      type="button"
                      className={styles.closeRecentBtn}
                      onClick={() => setShowRecentTray(false)}
                    >
                      <Symbol name="close" size={14} />
                    </button>
                  </div>
                  <div className={styles.recentQuotesList}>
                    {recentQuotes.map((q) => (
                      <div
                        key={q.id}
                        className={styles.recentQuoteItem}
                        onClick={() => handleRestoreSavedQuote(q)}
                      >
                        <div className={styles.recentQuoteLeft}>
                          <span className={styles.recentQuoteClient}>{q.clientName}</span>
                          <span className={styles.recentQuoteGarment}>{q.garmentTitle}</span>
                        </div>
                        <div className={styles.recentQuoteRight}>
                          <span className={styles.recentQuotePrice}>
                            {formatCurrency(q.recommendedPrice, currency)}
                          </span>
                          <span className={styles.recentQuoteDate}>
                            {new Date(q.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2-Column Responsive Workspace on Desktop */}
          <div className={styles.twoColQuote}>
            {/* Left Column: Form & Cost Configuration */}
            <div className={styles.configCol}>
              {/* Section 1: Client Information */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Symbol name="person" size={20} className={styles.cardIcon} />
                  <h2 className={styles.cardTitle}>Client Information</h2>
                </div>

                {selectedCustomer ? (
                  <div className={styles.selectedCustomerCard}>
                    <div className={styles.selectedCustomerLeft}>
                      <Avatar name={selectedCustomer.fullName} size="md" />
                      <div>
                        <h4 className={styles.selectedCustomerName}>{selectedCustomer.fullName}</h4>
                        <span className={styles.selectedCustomerPhone}>{selectedCustomer.whatsappNumber}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.changeCustomerBtn}
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearch('');
                      }}
                    >
                      Change Client
                    </button>
                  </div>
                ) : (
                  <div className={styles.clientInputGroup}>
                    <div className={styles.searchWrap}>
                      <Symbol name="search" size={18} className={styles.searchIcon} />
                      <input
                        type="text"
                        className={styles.inputWithIcon}
                        placeholder="Search existing client by name or phone..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowSearchDropdown(true);
                        }}
                        onFocus={() => setShowSearchDropdown(true)}
                      />
                      {customerSearch && (
                        <button
                          type="button"
                          className={styles.clearSearchBtn}
                          onClick={() => setCustomerSearch('')}
                        >
                          <Symbol name="close" size={16} />
                        </button>
                      )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showSearchDropdown && searchResults.length > 0 && (
                      <div className={styles.searchDropdown}>
                        {searchResults.map((cust) => (
                          <div
                            key={cust.id}
                            className={styles.searchItem}
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setShowSearchDropdown(false);
                              setCustomerSearch('');
                            }}
                          >
                            <Avatar name={cust.fullName} size="sm" />
                            <div>
                              <div className={styles.searchItemName}>{cust.fullName}</div>
                              <div className={styles.searchItemPhone}>{cust.whatsappNumber}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={styles.orDivider}>
                      <span>or enter walk-in contact details</span>
                    </div>

                    <div className={styles.walkInRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Client Name</label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="e.g. Chief Adeleke"
                          value={manualCustomerName}
                          onChange={(e) => setManualCustomerName(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>WhatsApp Phone</label>
                        <input
                          type="tel"
                          className={styles.input}
                          placeholder="e.g. 08012345678"
                          value={manualCustomerPhone}
                          onChange={(e) => setManualCustomerPhone(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Garment Style & Fabric Sourcing */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Symbol name="dry_cleaning" size={20} className={styles.cardIcon} />
                  <h2 className={styles.cardTitle}>Garment &amp; Fabric Sourcing</h2>
                </div>

                {/* Fabric Sourcing Selector: Core Tailoring Decision */}
                <div className={styles.sourcingSegment}>
                  <button
                    type="button"
                    className={`${styles.segmentBtn} ${fabricSourcing === 'shop' ? styles.segmentBtnActive : ''}`}
                    onClick={() => handleToggleFabricSourcing('shop')}
                  >
                    <Symbol name="storefront" size={16} />
                    <span>Atelier Supplies Fabric</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.segmentBtn} ${fabricSourcing === 'customer' ? styles.segmentBtnActive : ''}`}
                    onClick={() => handleToggleFabricSourcing('customer')}
                  >
                    <Symbol name="person" size={16} />
                    <span>Client Brings Fabric</span>
                  </button>
                </div>

                {fabricSourcing === 'customer' ? (
                  <div className={styles.clientFabricBanner}>
                    <Symbol name="info" size={16} />
                    <span>Client will provide their own fabric. Fabric material cost set to 0. Cost only tailoring craftsmanship, stay, lining, and embellishments below.</span>
                  </div>
                ) : (
                  <div className={styles.yardageHelper}>
                    <div className={styles.yardageHeader}>
                      <span className={styles.yardageLabel}>Quick Fabric Cost Helper</span>
                    </div>
                    <div className={styles.yardageInputRow}>
                      <div className={styles.yardageCol}>
                        <label className={styles.subLabel}>Yards Required</label>
                        <input
                          type="number"
                          step="0.5"
                          className={styles.input}
                          placeholder="4"
                          value={fabricYards}
                          onChange={(e) => setFabricYards(e.target.value)}
                        />
                      </div>
                      <div className={styles.yardageCol}>
                        <label className={styles.subLabel}>Price per Yard ({currency})</label>
                        <MoneyInput
                          value={fabricRatePerYard}
                          onChange={(val) => setFabricRatePerYard(val)}
                          placeholder="0"
                        />
                      </div>
                      <button
                        type="button"
                        className={styles.applyYardageBtn}
                        onClick={applyYardageCalculation}
                      >
                        Apply Cost
                      </button>
                    </div>
                  </div>
                )}

                {/* Gender Tabs */}
                <div className={styles.genderTabs}>
                  <button
                    type="button"
                    className={`${styles.genderTab} ${genderTab === 'male' ? styles.genderTabActive : ''}`}
                    onClick={() => setGenderTab('male')}
                  >
                    Gentlemen
                  </button>
                  <button
                    type="button"
                    className={`${styles.genderTab} ${genderTab === 'female' ? styles.genderTabActive : ''}`}
                    onClick={() => setGenderTab('female')}
                  >
                    Ladies
                  </button>
                </div>

                {/* Style Chips */}
                <div className={styles.stylePresetsRow}>
                  {(genderTab === 'male' ? STYLE_PRESETS_MALE : STYLE_PRESETS_FEMALE).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`${styles.styleChip} ${garmentTitle === preset ? styles.styleChipActive : ''}`}
                      onClick={() => setGarmentTitle(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className={styles.formGroup} style={{ marginTop: '12px' }}>
                  <label className={styles.label}>Garment Description / Title</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. 3-Piece Royal Agbada with Hand Embroidery"
                    value={garmentTitle}
                    onChange={(e) => setGarmentTitle(e.target.value)}
                  />
                </div>
              </div>

              {/* Section 3: Cost Breakdown (Craftsmanship, Stay, Embroidery, Beading) */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Symbol name="receipt_long" size={20} className={styles.cardIcon} />
                  <div className={styles.cardTitleRow}>
                    <h2 className={styles.cardTitle}>Production Cost Breakdown</h2>
                    <span className={styles.costTotalPill}>Total Cost: {formatCurrency(baseCost, currency)}</span>
                  </div>
                </div>

                {/* Quick Add Presets Grouped by Craft */}
                <div className={styles.costPresetsSection}>
                  <span className={styles.costPresetLabel}>Quick Add Atelier Craft Items:</span>
                  <div className={styles.presetGroupStack}>
                    {CRAFT_PRESET_CATEGORIES.map((cat) => (
                      <div key={cat.category} className={styles.presetGroup}>
                        <span className={styles.presetGroupTitle}>{cat.category}</span>
                        <div className={styles.costPresetsList}>
                          {cat.items.map((item) => (
                            <button
                              key={item.name}
                              type="button"
                              className={styles.costPresetChip}
                              onClick={() => addCostItem(item.name, item.defaultAmount)}
                            >
                              <Symbol name="add" size={12} />
                              <span>{item.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dynamic Cost Rows */}
                <div className={styles.costsList}>
                  {costs.map((cost, idx) => (
                    <div key={cost.id} className={styles.costRow}>
                      <div className={styles.costNameCol}>
                        {idx === 0 && <label className={styles.label}>Item Description</label>}
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="e.g. Hand Beading & Swarovski Crystals"
                          value={cost.name}
                          onChange={(e) => updateCostItem(cost.id, 'name', e.target.value)}
                        />
                      </div>

                      <div className={styles.costAmountCol}>
                        {idx === 0 && <label className={styles.label}>Amount ({currency})</label>}
                        <MoneyInput
                          value={cost.amount ? cost.amount.toString() : ''}
                          onChange={(val) => updateCostItem(cost.id, 'amount', parseInt(val, 10) || 0)}
                          placeholder="0"
                        />
                      </div>

                      <button
                        type="button"
                        className={styles.deleteCostBtn}
                        onClick={() => removeCostItem(cost.id)}
                        title="Remove item"
                        style={{ marginTop: idx === 0 ? '24px' : '0' }}
                        aria-label="Remove item"
                      >
                        <Symbol name="close" size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className={styles.addCustomCostBtn}
                  onClick={() => addCostItem('')}
                >
                  <Symbol name="add" size={16} />
                  <span>Add Custom Cost Item</span>
                </button>
              </div>

              {/* Section 4: Turnaround & Delivery Timeline */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Symbol name="schedule" size={20} className={styles.cardIcon} />
                  <div className={styles.cardTitleRow}>
                    <h2 className={styles.cardTitle}>Turnaround Time &amp; Urgency</h2>
                    <span className={styles.deliveryBadge}>Est. Delivery: {estimatedCompletionDate}</span>
                  </div>
                </div>

                <div className={styles.turnaroundRow}>
                  {TURNAROUND_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.label}
                      type="button"
                      className={`${styles.turnaroundBtn} ${turnaroundIndex === idx ? styles.turnaroundBtnActive : ''}`}
                      onClick={() => setTurnaroundIndex(idx)}
                    >
                      <span className={styles.turnaroundLabel}>{preset.label}</span>
                      {preset.rushFeePercent > 0 && (
                        <span className={styles.rushFeeBadge}>+{preset.rushFeePercent}% Rush</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 5: Pricing Markup Strategy & Deposit Schedule */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <Symbol name="trending_up" size={20} className={styles.cardIcon} />
                  <h2 className={styles.cardTitle}>Markup Strategy &amp; Deposit Terms</h2>
                </div>

                {/* Markup Presets */}
                <label className={styles.label}>Desired Markup on Production Cost</label>
                <div className={styles.markupPresetsRow}>
                  {MARKUP_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      className={`${styles.markupChip} ${marginPercent === preset.value ? styles.markupChipActive : ''}`}
                      onClick={() => setMarginPercent(preset.value)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className={styles.customMarkupWrap}>
                  <div className={styles.formGroup}>
                    <label className={styles.subLabel}>Custom Markup (% on cost)</label>
                    <div className={styles.percentInputWrap}>
                      <input
                        type="number"
                        className={styles.percentInput}
                        placeholder="50"
                        value={marginPercent}
                        onChange={(e) => setMarginPercent(e.target.value)}
                      />
                      <span className={styles.percentBadge}>%</span>
                    </div>
                  </div>
                  <p className={styles.markupExplanation}>
                    A {marginPercent}% markup on {formatCurrency(baseCost, currency)} cost yields{' '}
                    <strong>{formatCurrency(projectedProfit, currency)} profit</strong> ({profitMarginPercent.toFixed(0)}% margin).
                  </p>
                </div>

                {/* Commitment Deposit Ratio */}
                <div style={{ marginTop: '16px' }}>
                  <label className={styles.label}>Upfront Commitment Deposit</label>
                  <div className={styles.depositRow}>
                    {DEPOSIT_PRESETS.map((dep) => (
                      <button
                        key={dep.value}
                        type="button"
                        className={`${styles.depositChip} ${depositPercent === dep.value ? styles.depositChipActive : ''}`}
                        onClick={() => setDepositPercent(dep.value)}
                      >
                        {dep.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Sticky Live Atelier Quotation Summary */}
            <div className={styles.summaryCol}>
              <div className={styles.heroPriceCard}>
                {/* Sartorial Twill Weave Background & Stitch Border */}
                <div className={styles.heroStitchBorder} aria-hidden="true" />

                <div className={styles.heroPriceHeader}>
                  <span className={styles.heroKicker}>Recommended Selling Price</span>
                  <span className={styles.marginPill}>
                    <Symbol name="trending_up" size={14} />
                    <span>{profitMarginPercent.toFixed(0)}% Margin</span>
                  </span>
                </div>

                <div className={styles.heroPriceValue}>
                  {formatCurrency(recommendedPrice, currency)}
                </div>

                {/* Commercial Deposit Split */}
                <div className={styles.depositSummaryTray}>
                  <div className={styles.depositSummaryCol}>
                    <span className={styles.depositSummaryLabel}>Required Deposit ({depositPercent}%)</span>
                    <span className={styles.depositSummaryVal}>{formatCurrency(depositAmount, currency)}</span>
                  </div>
                  <div className={styles.depositSummaryDivider} />
                  <div className={styles.depositSummaryCol}>
                    <span className={styles.depositSummaryLabel}>Balance Due</span>
                    <span className={styles.depositSummaryVal}>{formatCurrency(balanceDue, currency)}</span>
                  </div>
                </div>

                {/* Breakdown Metrics */}
                <div className={styles.heroMetricsRow}>
                  <div className={styles.heroMetric}>
                    <span className={styles.metricLabel}>Production Cost</span>
                    <span className={styles.metricVal}>{formatCurrency(baseCost, currency)}</span>
                  </div>
                  <div className={styles.metricDivider} />
                  <div className={styles.heroMetric}>
                    <span className={styles.metricLabel}>Net Profit</span>
                    <span className={styles.metricValGreen}>{formatCurrency(projectedProfit, currency)}</span>
                  </div>
                  <div className={styles.metricDivider} />
                  <div className={styles.heroMetric}>
                    <span className={styles.metricLabel}>Delivery</span>
                    <span className={styles.metricVal}>{estimatedCompletionDate}</span>
                  </div>
                </div>

                {/* WhatsApp Format Preference */}
                <div className={styles.formatPrefRow}>
                  <span className={styles.formatPrefLabel}>WhatsApp Format:</span>
                  <div className={styles.formatPillGroup}>
                    <button
                      type="button"
                      className={`${styles.formatPill} ${whatsAppFormat === 'inclusive' ? styles.formatPillActive : ''}`}
                      onClick={() => setWhatsAppFormat('inclusive')}
                    >
                      All-Inclusive
                    </button>
                    <button
                      type="button"
                      className={`${styles.formatPill} ${whatsAppFormat === 'itemized' ? styles.formatPillActive : ''}`}
                      onClick={() => setWhatsAppFormat('itemized')}
                    >
                      Itemized
                    </button>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className={styles.heroActionRow}>
                  <button
                    type="button"
                    className={styles.convertOrderBtn}
                    onClick={handleConvertToOrder}
                    title="Convert quote directly into an active bespoke intake order"
                  >
                    <Symbol name="content_cut" size={16} />
                    <span>Convert to Bespoke Order</span>
                  </button>

                  <button
                    type="button"
                    className={styles.whatsAppQuoteBtn}
                    onClick={handleSendWhatsApp}
                    title="Send quotation via WhatsApp"
                  >
                    <WhatsappIcon size={16} />
                    <span>Send on WhatsApp</span>
                  </button>
                </div>

                {/* Secondary Utility Actions */}
                <div className={styles.secondaryActionsRow}>
                  <button
                    type="button"
                    className={styles.secondaryActionBtn}
                    onClick={handleCopyQuote}
                    title="Copy quotation message to clipboard"
                  >
                    <Symbol name={copied ? 'check' : 'content_copy'} size={15} />
                    <span>{copied ? 'Copied' : 'Copy Text'}</span>
                  </button>

                  <button
                    type="button"
                    className={styles.secondaryActionBtn}
                    onClick={() => window.print()}
                    title="Print official pro-forma invoice"
                  >
                    <Symbol name="print" size={15} />
                    <span>Print / PDF</span>
                  </button>

                  <button
                    type="button"
                    className={styles.secondaryActionBtn}
                    onClick={() => {
                      setCosts([
                        { id: '1', name: 'Fabric Material / Cloth', amount: 0 },
                        { id: '2', name: 'Cutting, Tailoring & Construction', amount: 0 },
                      ]);
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                      setManualCustomerName('');
                      setManualCustomerPhone('');
                      setGarmentTitle('Senator Suite');
                      setMarginPercent('50');
                      setFabricSourcing('shop');
                    }}
                    title="Reset quotation inputs"
                  >
                    <Symbol name="undo" size={15} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

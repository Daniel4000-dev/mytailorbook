'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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

const STYLE_BENCHMARKS: Record<string, { cost: number; fabricYards: number; male: boolean }> = {
  'Senator Suit': { cost: 22000, fabricYards: 4, male: true },
  'Royal 3-Piece Agbada': { cost: 55000, fabricYards: 7, male: true },
  'Luxury Kaftan': { cost: 18000, fabricYards: 4, male: true },
  'Two-Piece Suit': { cost: 65000, fabricYards: 3.5, male: true },
  'Safari Suit': { cost: 24000, fabricYards: 4, male: true },
  'Casual Danshiki': { cost: 14000, fabricYards: 3, male: true },
  'Royal Silk Boubou': { cost: 28000, fabricYards: 4, male: false },
  'Corset Lace Gown': { cost: 48000, fabricYards: 5, male: false },
  'Ankara Mermaid Gown': { cost: 32000, fabricYards: 6, male: false },
  'Two-Piece Silk Set': { cost: 26000, fabricYards: 3.5, male: false },
  'Chic Jumpsuit': { cost: 22000, fabricYards: 3.5, male: false },
};

const CRAFT_PRESET_CATEGORIES = [
  {
    category: 'Fabric & Interfacing',
    items: [
      { name: 'Fabric Material', defaultAmount: 12000 },
      { name: 'Interfacing & Canvas', defaultAmount: 3500 },
      { name: 'Lining', defaultAmount: 3000 },
      { name: 'Buttons & Zippers', defaultAmount: 1500 },
    ],
  },
  {
    category: 'Tailoring & Labor',
    items: [
      { name: 'Cutting & Sewing', defaultAmount: 12000 },
      { name: 'Initials / Monogram', defaultAmount: 2500 },
    ],
  },
  {
    category: 'Embellishments & Design',
    items: [
      { name: 'Chest Embroidery', defaultAmount: 8500 },
      { name: 'Beading & Crystals', defaultAmount: 15000 },
      { name: 'Stoning', defaultAmount: 6000 },
      { name: 'Aso-Oke Accents', defaultAmount: 5000 },
    ],
  },
  {
    category: 'Packaging & Delivery',
    items: [
      { name: 'Suit Bag & Hanger', defaultAmount: 2000 },
      { name: 'Delivery / Courier', defaultAmount: 3500 },
    ],
  },
];

const STYLE_PRESETS_MALE = [
  'Senator Suit',
  'Royal 3-Piece Agbada',
  'Luxury Kaftan',
  'Two-Piece Suit',
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
  { label: '+30%', value: '30' },
  { label: '+40%', value: '40' },
  { label: '+50% (Standard)', value: '50' },
  { label: '+70% (Premium)', value: '70' },
  { label: '+100% (2x)', value: '100' },
];

const DEPOSIT_PRESETS = [
  { label: '70% Upfront', value: 70 },
  { label: '60% Upfront', value: 60 },
  { label: '50% Upfront', value: 50 },
  { label: '100% Full Payment', value: 100 },
];

const TURNAROUND_PRESETS = [
  { label: 'Standard (10–14 days)', days: 12, rushFeePercent: 0 },
  { label: 'Express Priority (5–7 days)', days: 6, rushFeePercent: 15 },
  { label: 'Emergency 48h (2–3 days)', days: 3, rushFeePercent: 30 },
];

const QUICK_COST_BENCHMARKS = [15000, 22000, 30000, 45000, 60000, 85000];

export default function QuoteEstimatorPage() {
  const router = useRouter();
  const { currentShop, customers } = useData();
  const { showToast } = useToast();

  const currency = currentShop?.currency || 'NGN';
  const shopName = currentShop?.name || 'Tailor Shop';

  // Client Selection State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerPhone, setManualCustomerPhone] = useState('');
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const recentDropdownRef = useRef<HTMLDivElement>(null);

  // Style & Fabric Sourcing
  const [genderTab, setGenderTab] = useState<'male' | 'female'>('male');
  const [garmentTitle, setGarmentTitle] = useState('Senator Suit');
  const [fabricSourcing, setFabricSourcing] = useState<'customer' | 'shop'>('shop');

  // Costing Mode: 'quick' vs 'itemized'
  const [costingMode, setCostingMode] = useState<'quick' | 'itemized'>('quick');
  const [tailoringCost, setTailoringCost] = useState('22000');

  // Fabric Yardage Calculator
  const [fabricYards, setFabricYards] = useState('4');
  const [fabricRatePerYard, setFabricRatePerYard] = useState('0');

  // Dynamic localized price-per-yard presets
  const ratePresets = useMemo(() => {
    const curr = (currency || 'NGN').toUpperCase();
    if (['USD', 'EUR', 'GBP'].includes(curr)) {
      return [15, 25, 40, 60];
    }
    return [2500, 4000, 6000, 10000];
  }, [currency]);

  // Detailed Costs Breakdown
  const [costs, setCosts] = useState<CostItem[]>([
    { id: '1', name: 'Fabric Material', amount: 10000 },
    { id: '2', name: 'Cutting & Sewing', amount: 12000 },
  ]);

  // Turnaround & Timeline
  const [turnaroundIndex, setTurnaroundIndex] = useState(0);

  // Pricing, Markup & Deposit
  const [marginPercent, setMarginPercent] = useState('50');
  const [depositMode, setDepositMode] = useState<'preset' | 'custom'>('preset');
  const [depositPercent, setDepositPercent] = useState(70);
  const [customDepositType, setCustomDepositType] = useState<'percent' | 'amount'>('percent');
  const [customDepositValue, setCustomDepositValue] = useState('');

  // WhatsApp Format Preference
  const [whatsAppFormat, setWhatsAppFormat] = useState<'inclusive' | 'itemized'>('inclusive');

  // Copy status
  const [copied, setCopied] = useState(false);

  // Recent Quotes Cache
  const [recentQuotes, setRecentQuotes] = useState<SavedQuote[]>([]);
  const [showRecentTray, setShowRecentTray] = useState(false);

  // Progressive disclosure: Show/hide advanced margin, deposit, and delivery controls
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(target)) {
        setShowSearchDropdown(false);
      }
      if (recentDropdownRef.current && !recentDropdownRef.current.contains(target)) {
        setShowRecentTray(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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

  // Calculated Fabric Total
  const calculatedFabricCost = useMemo(() => {
    if (fabricSourcing === 'customer') return 0;
    const y = parseFloat(fabricYards) || 0;
    const r = parseFloat(fabricRatePerYard) || 0;
    return Math.round(y * r);
  }, [fabricSourcing, fabricYards, fabricRatePerYard]);

  // Compute Active Base Cost based on Mode
  const baseCost = useMemo(() => {
    if (costingMode === 'quick') {
      const labor = parseInt(tailoringCost, 10) || 0;
      return labor + calculatedFabricCost;
    }
    return costs.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [costingMode, tailoringCost, calculatedFabricCost, costs]);

  const activeTurnaround = TURNAROUND_PRESETS[turnaroundIndex] || TURNAROUND_PRESETS[0];
  const rushFeeMultiplier = 1 + activeTurnaround.rushFeePercent / 100;

  const markup = parseFloat(marginPercent) || 0;
  const markupMultiplier = 1 + markup / 100;

  // Final Price & Profit
  const recommendedPrice = Math.round(baseCost * markupMultiplier * rushFeeMultiplier);
  const projectedProfit = recommendedPrice - baseCost;
  const profitMarginPercent = recommendedPrice > 0 ? (projectedProfit / recommendedPrice) * 100 : 0;

  // Deposit breakdown (Supports presets, custom %, or custom flat amount)
  const depositAmount = useMemo(() => {
    if (depositMode === 'custom' && customDepositValue) {
      if (customDepositType === 'percent') {
        const pct = Math.min(100, Math.max(0, parseFloat(customDepositValue) || 0));
        return Math.round((recommendedPrice * pct) / 100);
      } else {
        const parsed = parseInt(customDepositValue, 10) || 0;
        return Math.min(recommendedPrice, parsed);
      }
    }
    return Math.round((recommendedPrice * depositPercent) / 100);
  }, [depositMode, customDepositValue, customDepositType, recommendedPrice, depositPercent]);

  const effectiveDepositPercent = useMemo(() => {
    if (recommendedPrice <= 0) return 0;
    return Math.round((depositAmount / recommendedPrice) * 100);
  }, [depositAmount, recommendedPrice]);

  const balanceDue = Math.max(0, recommendedPrice - depositAmount);

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

  // Seamless Mode Switcher that keeps numbers synchronized
  const handleSwitchCostingMode = (targetMode: 'quick' | 'itemized') => {
    if (targetMode === costingMode) return;
    if (targetMode === 'itemized') {
      const totalInQuick = (parseInt(tailoringCost, 10) || 0) + calculatedFabricCost;
      const currentItemizedSum = costs.reduce((sum, item) => sum + (item.amount || 0), 0);
      if (totalInQuick > 0 && currentItemizedSum !== totalInQuick) {
        if (fabricSourcing === 'shop' && calculatedFabricCost > 0) {
          setCosts([
            { id: 'fabric-sync', name: `${fabricYards} yds Fabric Material`, amount: calculatedFabricCost },
            { id: 'labor-sync', name: `Tailoring & Finishing (${garmentTitle})`, amount: parseInt(tailoringCost, 10) || 0 },
          ]);
        } else {
          setCosts([
            { id: 'labor-sync', name: `Tailoring & Finishing (${garmentTitle})`, amount: totalInQuick },
          ]);
        }
      }
    } else {
      const itemizedTotal = costs.reduce((sum, item) => sum + (item.amount || 0), 0);
      if (itemizedTotal > 0) {
        if (fabricSourcing === 'shop' && calculatedFabricCost > 0) {
          const laborPart = Math.max(0, itemizedTotal - calculatedFabricCost);
          setTailoringCost(laborPart.toString());
        } else {
          setTailoringCost(itemizedTotal.toString());
        }
      }
    }
    setCostingMode(targetMode);
  };

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

  // Style Selection with Instant Benchmark for both modes
  const handleSelectStyle = (style: string) => {
    setGarmentTitle(style);
    const benchmark = STYLE_BENCHMARKS[style];
    if (benchmark) {
      setFabricYards(benchmark.fabricYards.toString());
      setTailoringCost(benchmark.cost.toString());
      setCosts([
        ...(fabricSourcing === 'shop'
          ? [
              {
                id: '1',
                name: `${benchmark.fabricYards} yds Fabric Material`,
                amount: calculatedFabricCost > 0 ? calculatedFabricCost : Math.round(benchmark.cost * 0.4),
              },
            ]
          : []),
        {
          id: '2',
          name: `Tailoring & Finishing (${style})`,
          amount: fabricSourcing === 'shop' && calculatedFabricCost === 0 ? Math.round(benchmark.cost * 0.6) : benchmark.cost,
        },
      ]);
    }
  };

  // Handle Fabric Sourcing toggle
  const handleToggleFabricSourcing = (source: 'customer' | 'shop') => {
    setFabricSourcing(source);
    if (source === 'customer') {
      if (costingMode === 'itemized') {
        setCosts((prev) => prev.map((c) => (c.name.toLowerCase().includes('fabric') ? { ...c, amount: 0 } : c)));
      }
    } else {
      if (costingMode === 'itemized') {
        setCosts((prev) => {
          const hasFabric = prev.some((c) => c.name.toLowerCase().includes('fabric'));
          if (!hasFabric) {
            return [{ id: `${Date.now()}`, name: 'Fabric Material', amount: 10000 }, ...prev];
          }
          return prev;
        });
      }
    }
  };

  // Convert Quote into Order (Zero retyping for customer)
  const handleConvertToOrder = () => {
    const custId = selectedCustomer?.id || '';
    const styleQuery = encodeURIComponent(garmentTitle.trim() || 'Custom Outfit');
    const priceQuery = encodeURIComponent(recommendedPrice.toString());
    const materialQuery = encodeURIComponent(fabricSourcing);

    // Build comprehensive breakdown note for the cutter/tailor
    let noteSummary = '';
    if (costingMode === 'quick') {
      noteSummary = `[QUOTATION] ${garmentTitle}. Fabric: ${
        fabricSourcing === 'customer' ? 'Client Provided' : `Shop Sourced (${fabricYards} yds)`
      }. Est. Production Cost: ${formatCurrency(baseCost, currency)}. Target: ${estimatedCompletionDate}. Deposit: ${formatCurrency(
        depositAmount,
        currency
      )} (${effectiveDepositPercent}%).`;
    } else {
      const filteredCosts = costs.filter((c) => c.name.trim() && c.amount > 0);
      const costNoteLines = filteredCosts.map((c) => `${c.name}: ${formatCurrency(c.amount, currency)}`).join(', ');
      noteSummary = `[QUOTATION] ${garmentTitle}. Fabric: ${
        fabricSourcing === 'customer' ? 'Client Provided' : 'Shop Sourced'
      }. Items: ${costNoteLines || 'Standard Tailoring'}. Target: ${estimatedCompletionDate}. Deposit: ${formatCurrency(
        depositAmount,
        currency
      )} (${effectiveDepositPercent}%).`;
    }
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

    // Target Due Date calculation for order
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + activeTurnaround.days);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const dueDateString = `${yyyy}-${mm}-${dd}`;

    const priorityParam = activeTurnaround.rushFeePercent >= 30 ? 'urgent' : activeTurnaround.rushFeePercent > 0 ? 'high' : 'normal';

    let targetUrl = `/orders/new?style=${styleQuery}&price=${priceQuery}&material=${materialQuery}&notes=${notesQuery}&deposit=${encodeURIComponent(
      depositAmount.toString()
    )}&dueDate=${encodeURIComponent(dueDateString)}&priority=${priorityParam}`;
    if (custId) {
      targetUrl += `&customer=${custId}`;
    } else {
      if (manualCustomerName) targetUrl += `&clientName=${encodeURIComponent(manualCustomerName)}`;
      if (manualCustomerPhone) targetUrl += `&phone=${encodeURIComponent(manualCustomerPhone)}`;
    }

    showToast('Converting quote to order...', 'success');
    router.push(targetUrl);
  };

  // Generate Courteous, Clean WhatsApp Quotation Message
  const generateQuoteMessage = () => {
    const greeting = activeCustomerName ? `Hello ${activeCustomerName}` : `Hello`;

    const fabricNote =
      fabricSourcing === 'customer'
        ? '• Fabric: Client Provided (delivered to shop)'
        : calculatedFabricCost > 0
        ? `• Fabric: Sourced by Shop (${fabricYards} yds @ ${formatCurrency(parseFloat(fabricRatePerYard) || 0, currency)}/yd)`
        : '• Fabric: Sourced & Supplied by Shop';

    let contentBody = '';
    if (whatsAppFormat === 'inclusive' || costingMode === 'quick') {
      contentBody = `Outfit: ${garmentTitle || 'Custom Outfit'}
${fabricNote}
• Tailoring: Custom Tailoring & Finishing
• Turnaround: ${activeTurnaround.label} (Est. Delivery: ${estimatedCompletionDate})`;
    } else {
      const filteredCosts = costs.filter((c) => c.name.trim() && c.amount > 0);
      const costLines =
        filteredCosts.length > 0
          ? filteredCosts.map((c) => `• ${c.name}: ${formatCurrency(c.amount, currency)}`).join('\n')
          : `• Tailoring & Materials: ${formatCurrency(baseCost, currency)}`;
      contentBody = `Outfit: ${garmentTitle || 'Custom Outfit'}
${fabricNote}
${costLines}
• Turnaround: ${activeTurnaround.label} (Est. Delivery: ${estimatedCompletionDate})`;
    }

    const depositLine =
      effectiveDepositPercent < 100
        ? `Required Deposit (${effectiveDepositPercent}%): ${formatCurrency(depositAmount, currency)}
Balance Upon Fitting/Delivery: ${formatCurrency(balanceDue, currency)}`
        : `Payment: Full Payment of ${formatCurrency(recommendedPrice, currency)}`;

    return `${greeting}!

Here is your price quotation from ${shopName}:

${contentBody}
─────────────────────────
Total Price: ${formatCurrency(recommendedPrice, currency)}
${depositLine}

To confirm your order and schedule measurement or fitting, please reply to this message. We look forward to working with you!

${shopName}`;
  };

  // Send via WhatsApp
  const handleSendWhatsApp = () => {
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
      showToast('Quotation text copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Restore saved quote
  const handleRestoreSavedQuote = (saved: SavedQuote) => {
    setGarmentTitle(saved.garmentTitle);
    setFabricSourcing(saved.fabricSourcing);
    setManualCustomerName(saved.clientName);
    setManualCustomerPhone(saved.clientPhone);
    setCostingMode('quick');
    setTailoringCost(saved.totalCost.toString());
    setFabricRatePerYard('0');
    showToast(`Loaded quote for ${saved.clientName}`, 'info');
    setShowRecentTray(false);
  };

  // Complete Reset Handler
  const handleReset = () => {
    setGarmentTitle('Senator Suit');
    setGenderTab('male');
    setFabricSourcing('shop');
    setFabricYards('4');
    setFabricRatePerYard('0');
    setCostingMode('quick');
    setTailoringCost('22000');
    setCosts([
      { id: '1', name: 'Fabric Material', amount: 10000 },
      { id: '2', name: 'Cutting & Sewing', amount: 12000 },
    ]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setManualCustomerName('');
    setManualCustomerPhone('');
    setMarginPercent('50');
    setTurnaroundIndex(0);
    setDepositMode('preset');
    setDepositPercent(70);
    setCustomDepositType('percent');
    setCustomDepositValue('');
    setWhatsAppFormat('inclusive');
    showToast('Quotation inputs reset', 'info');
  };

  return (
    <>
      <div className="noPrint">
        <TopBar
          title="Price Quote Calculator"
          subtitle="Estimate production costs, set markup & share quotes"
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
              <p className={styles.printDocType}>Price Quotation &amp; Estimate</p>
            </div>
            <div className={styles.printMeta}>
              <h2 className={styles.printDocLabel}>ESTIMATE</h2>
              <p className={styles.printDate}>Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className={styles.printClientSection}>
            <div>
              <h3 className={styles.printSubheading}>Quotation Prepared For:</h3>
              <p className={styles.printClientName}>{activeCustomerName || 'Client'}</p>
              {activeCustomerPhone && <p className={styles.printClientPhone}>{activeCustomerPhone}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 className={styles.printSubheading}>Garment Specification:</h3>
              <p className={styles.printGarmentTitle}>{garmentTitle || 'Custom Tailoring'}</p>
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
              {costingMode === 'quick' ? (
                <tr>
                  <td>Materials, Tailoring &amp; Finishing</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(baseCost, currency)}</td>
                </tr>
              ) : (
                costs
                  .filter((c) => c.name && c.amount > 0)
                  .map((cost, idx) => (
                    <tr key={idx}>
                      <td>{cost.name}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(cost.amount, currency)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>

          <div className={styles.printTotalRow}>
            <div className={styles.printTotalBox}>
              <div className={styles.printTotalLine}>
                <span>Production Cost</span>
                <span>{formatCurrency(baseCost, currency)}</span>
              </div>
              <div className={`${styles.printTotalLine} ${styles.printGrandTotal}`}>
                <span>Total Quotation</span>
                <span>{formatCurrency(recommendedPrice, currency)}</span>
              </div>
              <div className={styles.printTotalLine} style={{ marginTop: '8px', color: '#4B5563' }}>
                <span>Required Deposit ({effectiveDepositPercent}%)</span>
                <span>{formatCurrency(depositAmount, currency)}</span>
              </div>
              <div className={styles.printTotalLine} style={{ color: '#4B5563' }}>
                <span>Balance Due on Delivery</span>
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
            <div className={styles.historyTriggerRow} ref={recentDropdownRef}>
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
                    <span>Recent Quotes</span>
                    <button
                      type="button"
                      className={styles.closeRecentBtn}
                      onClick={() => setShowRecentTray(false)}
                      aria-label="Close recent quotes"
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

          {/* ── 1. HERO PRICE ANCHOR CARD (Immediate Result at the Top) ── */}
          <div className={styles.heroAnchorCard}>
            <div className={styles.heroTopRow}>
              <span className={styles.heroKicker}>Instant Price Quotation</span>
              <span className={styles.heroDeliveryTag}>
                <Symbol name="schedule" size={14} />
                <span>Est. Delivery: {estimatedCompletionDate}</span>
              </span>
            </div>

            <div className={styles.heroPriceDisplay}>
              {formatCurrency(recommendedPrice, currency)}
            </div>

            <div className={styles.heroDepositBar}>
              <span>
                Required Deposit: <strong className={styles.heroDepositHighlight}>{formatCurrency(depositAmount, currency)} ({effectiveDepositPercent}%)</strong>
              </span>
              <span className={styles.heroBalanceText}>
                • Balance on Delivery: {formatCurrency(balanceDue, currency)}
              </span>
            </div>

            {/* Instant Actions */}
            <div className={styles.heroActionsGrid}>
              <button
                type="button"
                className={styles.whatsAppBtn}
                onClick={handleSendWhatsApp}
                title="Send quotation to client on WhatsApp"
              >
                <WhatsappIcon size={18} />
                <span>Send on WhatsApp</span>
              </button>

              <button
                type="button"
                className={styles.convertOrderBtn}
                onClick={handleConvertToOrder}
                title="Convert quote directly into an active order"
              >
                <Symbol name="content_cut" size={18} />
                <span>Convert to Order</span>
              </button>
            </div>

            {/* Quick Utilities */}
            <div className={styles.heroUtilitiesRow}>
              <button
                type="button"
                className={styles.utilityBtn}
                onClick={handleCopyQuote}
                title="Copy quotation text"
              >
                <Symbol name={copied ? 'check' : 'content_copy'} size={14} />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                className={styles.utilityBtn}
                onClick={() => window.print()}
                title="Print official pro-forma invoice"
              >
                <Symbol name="print" size={14} />
                <span>Print</span>
              </button>

              <button
                type="button"
                className={styles.utilityBtn}
                onClick={handleReset}
                title="Reset quotation inputs"
              >
                <Symbol name="undo" size={14} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* ── 2. UNIFIED SETUP CARD (3-Step Fast Human Flow) ── */}
          <div className={styles.setupCard}>
            {/* Step 1: Garment Style */}
            <div className={styles.stepBlock}>
              <div className={styles.stepHeader}>
                <h3 className={styles.stepTitle}>
                  <span className={styles.stepNumber}>1</span>
                  <span>What outfit are you making?</span>
                </h3>

                <div className={styles.genderPills}>
                  <button
                    type="button"
                    className={`${styles.genderPill} ${genderTab === 'male' ? styles.genderPillActive : ''}`}
                    onClick={() => {
                      setGenderTab('male');
                      handleSelectStyle('Senator Suit');
                    }}
                  >
                    Gentlemen
                  </button>
                  <button
                    type="button"
                    className={`${styles.genderPill} ${genderTab === 'female' ? styles.genderPillActive : ''}`}
                    onClick={() => {
                      setGenderTab('female');
                      handleSelectStyle('Royal Silk Boubou');
                    }}
                  >
                    Ladies
                  </button>
                </div>
              </div>

              {/* Quick Style Chips */}
              <div className={styles.styleChipsRow}>
                {(genderTab === 'male' ? STYLE_PRESETS_MALE : STYLE_PRESETS_FEMALE).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`${styles.styleChip} ${garmentTitle === preset ? styles.styleChipActive : ''}`}
                    onClick={() => handleSelectStyle(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <input
                type="text"
                className={styles.input}
                placeholder="e.g. Senator Suit with Chest Embroidery"
                value={garmentTitle}
                onChange={(e) => setGarmentTitle(e.target.value)}
              />
            </div>

            {/* Step 2: Fabric Sourcing */}
            <div className={styles.stepBlock}>
              <div className={styles.stepHeader}>
                <h3 className={styles.stepTitle}>
                  <span className={styles.stepNumber}>2</span>
                  <span>Who is providing the fabric?</span>
                </h3>
              </div>

              <div className={styles.fabricChoiceGrid}>
                <button
                  type="button"
                  className={`${styles.fabricChoiceBtn} ${fabricSourcing === 'customer' ? styles.fabricChoiceBtnActive : ''}`}
                  onClick={() => handleToggleFabricSourcing('customer')}
                >
                  <Symbol name="person" size={18} />
                  <span>Client brings cloth</span>
                </button>

                <button
                  type="button"
                  className={`${styles.fabricChoiceBtn} ${fabricSourcing === 'shop' ? styles.fabricChoiceBtnActive : ''}`}
                  onClick={() => handleToggleFabricSourcing('shop')}
                >
                  <Symbol name="storefront" size={18} />
                  <span>Shop supplies cloth</span>
                </button>
              </div>

              {fabricSourcing === 'customer' ? (
                <div className={styles.clientFabricNote}>
                  <Symbol name="check_circle" size={16} style={{ color: '#10B981' }} />
                  <span>Client provides their fabric. Quote covers tailoring, canvas, lining, and finishing.</span>
                </div>
              ) : (
                <div className={styles.yardageInlineBox}>
                  <div className={styles.yardageInlineInputs}>
                    <div>
                      <span className={styles.subLabel}>Yards Needed</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        className={styles.input}
                        placeholder="4"
                        value={fabricYards}
                        onChange={(e) => setFabricYards(e.target.value)}
                      />
                    </div>
                    <div>
                      <span className={styles.subLabel}>Fabric Price per Yard ({currency})</span>
                      <MoneyInput
                        value={fabricRatePerYard}
                        onChange={(val) => setFabricRatePerYard(val)}
                        placeholder="4,000"
                      />
                      <div className={styles.rateQuickChips}>
                        {ratePresets.map((r) => (
                          <button
                            key={r}
                            type="button"
                            className={`${styles.rateChip} ${fabricRatePerYard === r.toString() ? styles.rateChipActive : ''}`}
                            onClick={() => setFabricRatePerYard(r.toString())}
                          >
                            {formatCurrency(r, currency)}/yd
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Sewing Fee */}
            <div className={styles.stepBlock}>
              <div className={styles.stepHeader}>
                <h3 className={styles.stepTitle}>
                  <span className={styles.stepNumber}>3</span>
                  <span>Sewing &amp; Workmanship Charge ({currency})</span>
                </h3>
              </div>

              <MoneyInput
                value={tailoringCost}
                onChange={(val) => setTailoringCost(val)}
                placeholder="22,000"
              />

              <div className={styles.benchmarkChipsRow}>
                {QUICK_COST_BENCHMARKS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`${styles.benchmarkChip} ${tailoringCost === amt.toString() ? styles.benchmarkChipActive : ''}`}
                    onClick={() => setTailoringCost(amt.toString())}
                  >
                    {formatCurrency(amt, currency)}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4: Client Details (Optional) */}
            <div className={styles.stepBlock}>
              <div className={styles.stepHeader}>
                <h3 className={styles.stepTitle}>
                  <span className={styles.stepNumber}>4</span>
                  <span>Who is this quote for? <span style={{ fontWeight: 400, color: 'var(--sf-text-tertiary)', fontSize: '12px' }}>(Optional)</span></span>
                </h3>
              </div>

              {selectedCustomer ? (
                <div className={styles.selectedClientBar}>
                  <div className={styles.selectedClientLeft}>
                    <Avatar name={selectedCustomer.fullName} size="sm" />
                    <div>
                      <p className={styles.selectedClientName}>{selectedCustomer.fullName}</p>
                      <span className={styles.selectedClientPhone}>{selectedCustomer.whatsappNumber}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.changeClientBtn}
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                    }}
                  >
                    Change Client
                  </button>
                </div>
              ) : (
                <div ref={searchDropdownRef}>
                  <div className={styles.clientSearchWrap}>
                    <Symbol name="search" size={18} className={styles.searchIcon} />
                    <input
                      type="text"
                      className={styles.clientInputWithIcon}
                      placeholder="Search saved client by name or phone..."
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
                        aria-label="Clear client search"
                      >
                        <Symbol name="close" size={16} />
                      </button>
                    )}
                  </div>

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

                  <div className={styles.walkInInputsRow}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Walk-in Client Name"
                      value={manualCustomerName}
                      onChange={(e) => setManualCustomerName(e.target.value)}
                    />
                    <input
                      type="tel"
                      className={styles.input}
                      placeholder="WhatsApp Phone Number"
                      value={manualCustomerPhone}
                      onChange={(e) => setManualCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── 3. PROGRESSIVE DISCLOSURE: MORE OPTIONS ── */}
            <div className={styles.moreOptionsBox}>
              <button
                type="button"
                className={styles.moreOptionsToggle}
                onClick={() => setShowAdvanced(!showAdvanced)}
                aria-expanded={showAdvanced}
              >
                <span className={styles.moreOptionsTitle}>
                  <Symbol name="tune" size={16} />
                  <span>Customize Deposit, Rush Delivery &amp; Margin</span>
                </span>
                <Symbol
                  name="expand_more"
                  size={18}
                  className={`${styles.moreOptionsChevron} ${showAdvanced ? styles.moreOptionsChevronOpen : ''}`}
                />
              </button>

              {showAdvanced && (
                <div className={styles.moreOptionsBody}>
                  {/* Upfront Deposit */}
                  <div className={styles.subSection}>
                    <span className={styles.optionLabel}>Upfront Deposit Requirement</span>
                    <div className={styles.pillsRow}>
                      {DEPOSIT_PRESETS.map((dep) => (
                        <button
                          key={dep.value}
                          type="button"
                          className={`${styles.optionPill} ${depositPercent === dep.value ? styles.optionPillActive : ''}`}
                          onClick={() => setDepositPercent(dep.value)}
                        >
                          {dep.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Timeline */}
                  <div className={styles.subSection}>
                    <span className={styles.optionLabel}>Turnaround Time</span>
                    <div className={styles.pillsRow}>
                      {TURNAROUND_PRESETS.map((preset, idx) => (
                        <button
                          key={preset.label}
                          type="button"
                          className={`${styles.optionPill} ${turnaroundIndex === idx ? styles.optionPillActive : ''}`}
                          onClick={() => setTurnaroundIndex(idx)}
                        >
                          {preset.label}
                          {preset.rushFeePercent > 0 && ` (+${preset.rushFeePercent}% Rush)`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Profit Margin Markup */}
                  <div className={styles.subSection}>
                    <span className={styles.optionLabel}>Profit Markup</span>
                    <div className={styles.pillsRow}>
                      {MARKUP_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          className={`${styles.optionPill} ${marginPercent === preset.value ? styles.optionPillActive : ''}`}
                          onClick={() => setMarginPercent(preset.value)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sticky Mobile Bottom Bar (Zero-friction access on phones) ── */}
        <div className={`${styles.mobileStickyBar} noPrint`}>
          <div className={styles.mobileStickyLeft}>
            <span className={styles.mobileStickyPriceLabel}>Recommended Price</span>
            <span className={styles.mobileStickyPriceVal}>{formatCurrency(recommendedPrice, currency)}</span>
            <span className={styles.mobileStickyDeposit}>
              Deposit: {formatCurrency(depositAmount, currency)} ({effectiveDepositPercent}%)
            </span>
          </div>

          <div className={styles.mobileStickyRight}>
            <button
              type="button"
              className={styles.mobileStickyWhatsAppBtn}
              onClick={handleSendWhatsApp}
              title="Send quote via WhatsApp"
              aria-label="Send quote via WhatsApp"
            >
              <WhatsappIcon size={18} />
            </button>

            <button
              type="button"
              className={styles.mobileStickyConvertBtn}
              onClick={handleConvertToOrder}
              title="Convert to Order"
            >
              <Symbol name="content_cut" size={16} />
              <span>Convert</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

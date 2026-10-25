'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import TopBar from '@/components/layout/TopBar/TopBar';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import Avatar from '@/components/ui/Avatar/Avatar';
import MoneyInput from '@/components/ui/MoneyInput/MoneyInput';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import { formatCurrency, getWhatsAppLink, normalizePhone } from '@/lib/formatters';
import { GARMENT_STYLES } from '@/lib/constants';
import type { Customer } from '@/lib/types';
import { useToast } from '@/contexts/ToastContext';
import styles from './page.module.css';

interface CostItem {
  id: string;
  name: string;
  amount: number;
}

const COMMON_COST_PRESETS = [
  'Fabric Material',
  'Tailoring & Craftsmanship',
  'Embroidery / Monogram',
  'Lining, Stay & Canvas',
  'Buttons & Accessories',
  'Logistics / Delivery',
];

const STYLE_PRESETS = [
  'Senator',
  'Royal Agbada',
  'Luxury Kaftan',
  'Two-Piece Suit',
  'Boubou',
  'Ankara Gown',
  'Casual Danshiki',
];

const MARKUP_PRESETS = [
  { label: '30%', value: '30' },
  { label: '40%', value: '40' },
  { label: '50% (Standard)', value: '50' },
  { label: '70%', value: '70' },
  { label: '100% (2x)', value: '100' },
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

  // Style State
  const [garmentTitle, setGarmentTitle] = useState('Senator');

  // Pricing & Costs State
  const [marginPercent, setMarginPercent] = useState('50');
  const [costs, setCosts] = useState<CostItem[]>([
    { id: '1', name: 'Fabric Material', amount: 0 },
    { id: '2', name: 'Tailoring & Craftsmanship', amount: 0 },
  ]);

  const [copied, setCopied] = useState(false);

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
  const addCostItem = (name = '') => {
    setCosts([...costs, { id: Date.now().toString(), name, amount: 0 }]);
  };

  const removeCostItem = (id: string) => {
    if (costs.length <= 1) {
      setCosts([{ id: '1', name: '', amount: 0 }]);
      return;
    }
    setCosts(costs.filter((c) => c.id !== id));
  };

  const updateCostItem = (id: string, field: 'name' | 'amount', value: string | number) => {
    setCosts(costs.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  // Calculations
  const totalCost = costs.reduce((sum, item) => sum + (item.amount || 0), 0);
  const margin = parseFloat(marginPercent) || 0;
  const markupMultiplier = 1 + margin / 100;
  const recommendedPrice = totalCost * markupMultiplier;
  const projectedProfit = recommendedPrice - totalCost;
  const profitMarginPercent = recommendedPrice > 0 ? (projectedProfit / recommendedPrice) * 100 : 0;

  // Print PDF
  const handlePrint = () => {
    window.print();
  };

  // Convert Quote into Bespoke Order
  const handleConvertToOrder = () => {
    const custId = selectedCustomer?.id || '';
    const styleQuery = encodeURIComponent(garmentTitle.trim() || 'Senator');
    const priceQuery = encodeURIComponent(Math.round(recommendedPrice).toString());

    let targetUrl = `/orders/new?style=${styleQuery}&price=${priceQuery}`;
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

    const costLines = filteredCosts.length > 0
      ? filteredCosts.map((c) => `• ${c.name}: ${formatCurrency(c.amount, currency)}`).join('\n')
      : `• Bespoke Tailoring & Materials: ${formatCurrency(totalCost, currency)}`;

    return `${greeting}!

Here is your bespoke price quotation from ${shopName}:

Outfit: ${garmentTitle || 'Bespoke Garment'}
${costLines}
─────────────────────────
Total Investment: ${formatCurrency(recommendedPrice, currency)}

To confirm this quotation and schedule your measurement or initial fitting, please reply to this message. We look forward to crafting your piece!

${shopName}`;
  };

  // Send via WhatsApp
  const handleSendWhatsApp = () => {
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
                <span>Materials & Craftsmanship</span>
                <span>{formatCurrency(totalCost, currency)}</span>
              </div>
              <div className={`${styles.printTotalLine} ${styles.printGrandTotal}`}>
                <span>Total Quotation</span>
                <span>{formatCurrency(recommendedPrice, currency)}</span>
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
          {/* Atelier Hero Price Card */}
          <div className={styles.heroPriceCard}>
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

            <div className={styles.heroMetricsRow}>
              <div className={styles.heroMetric}>
                <span className={styles.metricLabel}>Total Cost</span>
                <span className={styles.metricVal}>{formatCurrency(totalCost, currency)}</span>
              </div>
              <div className={styles.metricDivider} />
              <div className={styles.heroMetric}>
                <span className={styles.metricLabel}>Net Profit</span>
                <span className={styles.metricValGreen}>{formatCurrency(projectedProfit, currency)}</span>
              </div>
              <div className={styles.metricDivider} />
              <div className={styles.heroMetric}>
                <span className={styles.metricLabel}>Markup</span>
                <span className={styles.metricVal}>{marginPercent}%</span>
              </div>
            </div>

            {/* Quick Conversion CTA */}
            <div className={styles.heroActionRow}>
              <button
                type="button"
                className={styles.convertOrderBtn}
                onClick={handleConvertToOrder}
                title="Convert this quote directly into an active bespoke intake order"
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
          </div>

          {/* Section 1: Client Selection */}
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

          {/* Section 2: Garment Specification */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Symbol name="dry_cleaning" size={20} className={styles.cardIcon} />
              <h2 className={styles.cardTitle}>Garment Style Specification</h2>
            </div>

            <div className={styles.stylePresetsRow}>
              {STYLE_PRESETS.map((preset) => (
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

            <div className={styles.formGroup}>
              <label className={styles.label}>Garment Description / Title</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. 3-Piece Royal Agbada with Embroidery"
                value={garmentTitle}
                onChange={(e) => setGarmentTitle(e.target.value)}
              />
            </div>
          </div>

          {/* Section 3: Cost Breakdown */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Symbol name="receipt_long" size={20} className={styles.cardIcon} />
              <div className={styles.cardTitleRow}>
                <h2 className={styles.cardTitle}>Production Cost Breakdown</h2>
                <span className={styles.costTotalPill}>Cost: {formatCurrency(totalCost, currency)}</span>
              </div>
            </div>

            <div className={styles.costPresetsSection}>
              <span className={styles.costPresetLabel}>Quick Add Common Items:</span>
              <div className={styles.costPresetsList}>
                {COMMON_COST_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={styles.costPresetChip}
                    onClick={() => addCostItem(preset)}
                  >
                    <Symbol name="add" size={12} />
                    <span>{preset}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.costsList}>
              {costs.map((cost, idx) => (
                <div key={cost.id} className={styles.costRow}>
                  <div className={styles.costNameCol}>
                    {idx === 0 && <label className={styles.label}>Item Description</label>}
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. 4 yards Cashmere fabric"
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

          {/* Section 4: Pricing Markup Strategy */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Symbol name="trending_up" size={20} className={styles.cardIcon} />
              <h2 className={styles.cardTitle}>Pricing Strategy & Desired Markup</h2>
            </div>

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
                <label className={styles.label}>Custom Markup (% on cost)</label>
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
                A {marginPercent}% markup on {formatCurrency(totalCost, currency)} production cost yields{' '}
                <strong>{formatCurrency(projectedProfit, currency)} net profit</strong> ({profitMarginPercent.toFixed(0)}% gross margin).
              </p>
            </div>
          </div>

          {/* Action Dock */}
          <div className={styles.actionDock}>
            <button
              type="button"
              className={styles.copyQuoteBtn}
              onClick={handleCopyQuote}
              title="Copy quote message to clipboard"
            >
              <Symbol name={copied ? 'check' : 'content_copy'} size={18} />
              <span>{copied ? 'Copied!' : 'Copy Quote Text'}</span>
            </button>

            <button
              type="button"
              className={styles.pdfPrintBtn}
              onClick={handlePrint}
              title="Print official pro-forma invoice"
            >
              <Symbol name="print" size={18} />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              className={styles.resetBtn}
              onClick={() => {
                setCosts([
                  { id: '1', name: 'Fabric Material', amount: 0 },
                  { id: '2', name: 'Tailoring & Craftsmanship', amount: 0 },
                ]);
                setSelectedCustomer(null);
                setCustomerSearch('');
                setManualCustomerName('');
                setManualCustomerPhone('');
                setGarmentTitle('Senator');
                setMarginPercent('50');
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

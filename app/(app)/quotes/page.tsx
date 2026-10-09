'use client';

import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import TopBar from '@/components/layout/TopBar/TopBar';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import MoneyInput from '@/components/ui/MoneyInput/MoneyInput';
import { formatCurrency } from '@/lib/formatters';
import styles from './page.module.css';

interface CostItem {
  id: string;
  name: string;
  amount: number;
}

export default function QuoteEstimatorPage() {
  const { currentShop } = useData();
  const currency = currentShop?.currency || 'NGN';
  const shopName = currentShop?.name || 'Tailor Shop';

  const [customerName, setCustomerName] = useState('');
  const [garmentTitle, setGarmentTitle] = useState('');
  const [marginPercent, setMarginPercent] = useState('50');
  const [costs, setCosts] = useState<CostItem[]>([
    { id: '1', name: 'Fabrics', amount: 0 },
    { id: '2', name: 'Lining & Threads', amount: 0 },
  ]);

  const addCostItem = () => {
    setCosts([...costs, { id: Date.now().toString(), name: '', amount: 0 }]);
  };

  const removeCostItem = (id: string) => {
    setCosts(costs.filter(c => c.id !== id));
  };

  const updateCostItem = (id: string, field: 'name' | 'amount', value: string | number) => {
    setCosts(costs.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const totalCost = costs.reduce((sum, item) => sum + (item.amount || 0), 0);
  const margin = parseFloat(marginPercent) || 0;
  
  // Calculate recommended price
  // Formula: Cost / (1 - Margin%) or Cost + (Cost * Margin%)
  // Typically "Profit Margin" means (Price - Cost) / Price. So Price = Cost / (1 - Margin)
  // But for simple markup, some people just do Cost + (Cost * Margin).
  // Let's use simple Markup for ease of understanding: Price = Cost + (Cost * (Margin / 100))
  const markupMultiplier = 1 + (margin / 100);
  const recommendedPrice = totalCost * markupMultiplier;
  const projectedProfit = recommendedPrice - totalCost;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="noPrint">
        <TopBar title="Quote Estimator" showBack />
      </div>

      <div className={styles.container}>
        <div className={`${styles.header} noPrint`}>
          <h1 className={styles.title}>Quick Quote</h1>
          <p className={styles.subtitle}>Estimate costs and calculate your selling price</p>
        </div>

        {/* --- PRINT ONLY INVOICE HEADER --- */}
        <div className={styles.printOnly} style={{ padding: '40px', fontFamily: 'var(--font-inter)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '32px', fontFamily: 'var(--font-fraunces)' }}>{shopName}</h1>
              <p style={{ margin: '5px 0 0 0', color: '#666' }}>Official Price Estimate</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>QUOTE</h2>
              <p style={{ margin: '5px 0 0 0', color: '#666' }}>Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px', textTransform: 'uppercase' }}>Estimate For:</h3>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{customerName || 'Valued Client'}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px', textTransform: 'uppercase' }}>Garment:</h3>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{garmentTitle || 'Custom Tailoring'}</p>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ccc' }}>
                <th style={{ textAlign: 'left', padding: '12px 0', color: '#666' }}>Description</th>
                <th style={{ textAlign: 'right', padding: '12px 0', color: '#666' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {costs.filter(c => c.name && c.amount > 0).map((cost, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '16px 0' }}>{cost.name}</td>
                  <td style={{ textAlign: 'right', padding: '16px 0' }}>{formatCurrency(cost.amount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#666' }}>Subtotal (Cost)</span>
                <span>{formatCurrency(totalCost, currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#666' }}>Markup / Profit</span>
                <span>{formatCurrency(projectedProfit, currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: '12px', marginTop: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '20px' }}>Total Price</span>
                <span style={{ fontWeight: 700, fontSize: '20px' }}>{formatCurrency(recommendedPrice, currency)}</span>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '60px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
            <p>Thank you for choosing {shopName}. We look forward to serving you.</p>
          </div>
        </div>
        {/* --- END PRINT ONLY --- */}

        <div className="noPrint">
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Client Details</h2>
            <div className={styles.formGroup}>
              <label className={styles.label}>Customer Name (Optional)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. John Doe"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Garment Title</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. 2-Piece Senator"
                value={garmentTitle}
                onChange={(e) => setGarmentTitle(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Estimated Costs</h2>
            {costs.map((cost, idx) => (
              <div key={cost.id} className={styles.inputRow}>
                <div>
                  {idx === 0 && <label className={styles.label}>Item</label>}
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Buttons"
                    value={cost.name}
                    onChange={(e) => updateCostItem(cost.id, 'name', e.target.value)}
                  />
                </div>
                <div>
                  {idx === 0 && <label className={styles.label}>Amount</label>}
                  <MoneyInput
                    value={cost.amount ? cost.amount.toString() : ''}
                    onChange={(val) => updateCostItem(cost.id, 'amount', parseInt(val) || 0)}
                    placeholder="0"
                  />
                </div>
                <button 
                  className={styles.deleteBtn} 
                  onClick={() => removeCostItem(cost.id)}
                  style={{ visibility: costs.length > 1 ? 'visible' : 'hidden' }}
                >
                  <Symbol name="close" size={20} />
                </button>
              </div>
            ))}
            <button className={styles.addBtn} onClick={addCostItem}>
              <Symbol name="add" size={18} /> Add another cost
            </button>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Pricing Strategy</h2>
            <div className={styles.formGroup}>
              <label className={styles.label}>Desired Profit Margin (%)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="50"
                  value={marginPercent}
                  onChange={(e) => setMarginPercent(e.target.value)}
                  style={{ width: '100px' }}
                />
                <span style={{ color: 'var(--sf-text-secondary)', fontSize: '14px' }}>% markup on cost</span>
              </div>
            </div>
          </div>

          <div className={styles.resultCard}>
            <div className={styles.resultLabel}>Recommended Price to Charge</div>
            <div className={styles.resultValue}>{formatCurrency(recommendedPrice, currency)}</div>
            
            <div className={styles.resultSubtext}>
              <span>Total Cost: {formatCurrency(totalCost, currency)}</span>
              <span>Net Profit: {formatCurrency(projectedProfit, currency)}</span>
            </div>
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" fullWidth onClick={() => {
              setCosts([{ id: '1', name: '', amount: 0 }]);
              setGarmentTitle('');
              setCustomerName('');
            }}>
              Clear All
            </Button>
            <Button variant="primary" fullWidth icon={<Symbol name="download" />} onClick={handlePrint}>
              Save as PDF
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

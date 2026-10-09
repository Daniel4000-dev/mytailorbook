'use client';

import { useState, useEffect } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import MoneyInput from '@/components/ui/MoneyInput/MoneyInput';
import Select from '@/components/ui/Select/Select';
import { Expense } from '@/lib/types';
import { addExpense, getOrderExpenses } from '@/app/actions/expenses';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency, formatDate } from '@/lib/formatters';
import styles from '../page.module.css';

interface OrderExpensesProps {
  orderId: string;
  shopId: string;
  totalBill: number;
  currency?: string;
}

export default function OrderExpenses({ orderId, shopId, totalBill, currency }: OrderExpensesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Expense['category']>('material');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && loading) {
      getOrderExpenses(orderId).then((data) => {
        setExpenses(data);
        setLoading(false);
      });
    }
  }, [isOpen, orderId, loading]);

  const handleAddExpense = async () => {
    if (!amount || !description) return;
    setSubmitting(true);
    try {
      const newExp = await addExpense({
        shopId,
        orderId,
        amount: parseInt(amount.replace(/,/g, '')) || 0,
        category,
        description,
        date: new Date().toISOString(),
      });
      setExpenses([newExp, ...expenses]);
      setIsAdding(false);
      setAmount('');
      setDescription('');
      showToast('Expense added', 'success');
    } catch (err) {
      showToast('Failed to add expense', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const profit = totalBill - totalExpenses;
  const margin = totalBill > 0 ? Math.round((profit / totalBill) * 100) : 0;

  return (
    <section className={styles.card}>
      <div className={styles.expenseHeader} onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Cost & Profit Calculator</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--sf-text-secondary)' }}>
          {totalExpenses > 0 && <span style={{ fontSize: '13px', fontWeight: 600 }}>Margin: {margin}%</span>}
          <Symbol name={isOpen ? "expand_less" : "expand_more"} size={20} />
        </div>
      </div>
      
      {isOpen && (
        <div style={{ marginTop: '16px' }}>
          <div className={styles.payRows}>
            <div className={styles.payRow}>
              <span className={styles.payLabel}>Total Order Value</span>
              <span className={styles.payValue}>{formatCurrency(totalBill, currency)}</span>
            </div>
            <div className={styles.payRow}>
              <span className={styles.payLabel}>Total Costs Logged</span>
              <span className={styles.payValueAccent}>-{formatCurrency(totalExpenses, currency)}</span>
            </div>
            <div className={styles.payRowTotal}>
              <span>Net Profit</span>
              <span style={{ color: 'var(--sf-success-600)' }}>{formatCurrency(profit, currency)}</span>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--sf-text-primary)' }}>Expense Breakdown</h4>
              {!isAdding && (
                <Button variant="secondary" onClick={() => setIsAdding(true)} style={{ padding: '4px 8px', fontSize: '12px', minHeight: 'auto' }}>
                  <Symbol name="add" size={16} /> Add
                </Button>
              )}
            </div>

            {isAdding && (
              <div style={{ background: 'var(--sf-bg-surface-elevated)', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Input 
                  label="Description" 
                  placeholder="e.g. Guinea Brocade 5 yards" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <MoneyInput 
                      label="Amount" 
                      value={amount} 
                      onChange={setAmount} 
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Select 
                      label="Category" 
                      options={[
                        { value: 'material', label: 'Material' },
                        { value: 'outsourced', label: 'Outsourced/Embroidery' },
                        { value: 'labor', label: 'Internal Labor' },
                        { value: 'logistics', label: 'Delivery/Logistics' },
                      ]}
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                  <Button variant="primary" onClick={handleAddExpense} loading={submitting}>Save</Button>
                </div>
              </div>
            )}

            {loading ? (
              <p style={{ fontSize: '13px', color: 'var(--sf-text-tertiary)', textAlign: 'center', padding: '16px 0' }}>Loading expenses...</p>
            ) : expenses.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--sf-text-tertiary)', textAlign: 'center', padding: '16px 0' }}>No expenses logged for this order yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {expenses.map(exp => (
                  <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--sf-border-light)' }}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--sf-text-primary)' }}>{exp.description}</p>
                      <p style={{ fontSize: '11px', color: 'var(--sf-text-secondary)', textTransform: 'capitalize' }}>{exp.category} • {formatDate(exp.date)}</p>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sf-text-primary)' }}>{formatCurrency(exp.amount, currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

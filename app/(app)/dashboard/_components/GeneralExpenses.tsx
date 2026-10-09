'use client';

import { useState, useEffect } from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import MoneyInput from '@/components/ui/MoneyInput/MoneyInput';
import Select from '@/components/ui/Select/Select';
import { Expense } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency, formatDate } from '@/lib/formatters';
import styles from './OwnerDashboard.module.css';

interface GeneralExpensesProps {
  shopId: string;
  currency?: string;
}

export default function GeneralExpenses({ shopId, currency }: GeneralExpensesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Expense['category']>('general');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && loading) {
      const supabase = createClient();
      supabase.from('expenses')
        .select('*')
        .eq('shop_id', shopId)
        .is('order_id', null)
        .order('date', { ascending: false })
        .limit(10)
        .then(({ data, error }) => {
          if (!error && data) {
            setExpenses(data.map(d => ({
              id: d.id,
              shopId: d.shop_id,
              orderId: d.order_id,
              amount: d.amount,
              category: d.category,
              description: d.description,
              date: d.date,
              createdAt: d.created_at,
            })));
          }
          setLoading(false);
        });
    }
  }, [isOpen, shopId, loading]);

  const handleAddExpense = async () => {
    if (!amount || !description) return;
    setSubmitting(true);
    try {
      const { addExpense } = await import('@/app/actions/expenses');
      const newExp = await addExpense({
        shopId,
        amount: parseInt(amount.replace(/,/g, '')) || 0,
        category,
        description,
        date: new Date().toISOString(),
      });
      setExpenses([newExp, ...expenses]);
      setIsAdding(false);
      setAmount('');
      setDescription('');
      showToast('General expense logged', 'success');
    } catch (err) {
      showToast('Failed to log expense. Make sure migration is applied.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: 'var(--sf-bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--sf-border-light)', marginBottom: '16px' }}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Log General Shop Expenses</h3>
        <Symbol name={isOpen ? "expand_less" : "expand_more"} size={20} />
      </div>
      
      {isOpen && (
        <div style={{ marginTop: '16px' }}>
          {!isAdding && (
            <Button variant="secondary" onClick={() => setIsAdding(true)} style={{ marginBottom: '16px', width: '100%' }}>
              <Symbol name="add" size={16} /> Log Fuel, Rent, or Bulk Materials
            </Button>
          )}

          {isAdding && (
            <div style={{ background: 'var(--sf-bg-surface-elevated)', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input 
                label="Description" 
                placeholder="e.g. 10 Liters Fuel" 
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
                      { value: 'general', label: 'General / Rent / Fuel' },
                      { value: 'material', label: 'Bulk Materials' },
                      { value: 'logistics', label: 'Logistics' },
                    ]}
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleAddExpense} loading={submitting}>Save Expense</Button>
              </div>
            </div>
          )}

          {loading ? (
            <p style={{ fontSize: '13px', color: 'var(--sf-text-tertiary)', textAlign: 'center' }}>Loading...</p>
          ) : expenses.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--sf-text-tertiary)', textAlign: 'center' }}>No general expenses logged yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--sf-text-secondary)', marginBottom: '4px' }}>Recent General Expenses</h4>
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
      )}
    </div>
  );
}

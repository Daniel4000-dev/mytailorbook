'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { getExpensesByDate } from '@/app/actions/expenses';
import { getPaymentsByDate } from '@/app/actions/order_payments';
import type { Expense, Payment } from '@/lib/types';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import styles from './page.module.css';

export default function ReconciliationPage() {
  const { currentShop } = useData();
  const { user, isOwner } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !isOwner && user.role !== 'Accountant') {
      router.push('/');
    }
  }, [user, isOwner, router]);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentShop?.id) return;
    
    let isMounted = true;
    
    async function fetchData() {
      setLoading(true);
      try {
        const [expensesData, paymentsRes] = await Promise.all([
          getExpensesByDate(currentShop!.id, date),
          getPaymentsByDate(currentShop!.id, date)
        ]);
        
        if (isMounted) {
          setExpenses(expensesData || []);
          setPayments(paymentsRes.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch reconciliation data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [currentShop?.id, date]);

  // Calculations
  const cashIn = payments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
  const transferIn = payments.filter(p => p.method === 'transfer').reduce((sum, p) => sum + p.amount, 0);
  const posIn = payments.filter(p => p.method === 'pos').reduce((sum, p) => sum + p.amount, 0);
  
  const cashOut = expenses.filter(e => e.method === 'cash').reduce((sum, e) => sum + e.amount, 0);
  const transferOut = expenses.filter(e => e.method === 'transfer').reduce((sum, e) => sum + e.amount, 0);
  
  const expectedTill = cashIn - cashOut;
  const expectedBank = (transferIn + posIn) - transferOut;

  // Format currency
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  // Prepare combined transactions for display
  type Transaction = {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    method: string;
    desc: string;
    time: string;
  };

  const transactions: Transaction[] = [
    ...payments.map(p => ({
      id: `p-${p.id}`,
      type: 'income' as const,
      amount: p.amount,
      method: p.method || 'unknown',
      desc: p.reference_note || 'Order Payment',
      time: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })),
    ...expenses.map(e => ({
      id: `e-${e.id}`,
      type: 'expense' as const,
      amount: e.amount,
      method: e.method || 'unknown',
      desc: e.description || e.category,
      time: new Date(e.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }))
  ].sort((a, b) => {
    // Attempting a simple sort based on time strings if exact timestamps aren't available
    return b.time.localeCompare(a.time);
  });

  const changeDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const getDisplayDate = () => {
    const today = new Date().toISOString().split('T')[0];
    if (date === today) return 'Today';
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    
    return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Till Reconciliation</h1>
        <p className={styles.subtitle}>Track physical cash and bank balances</p>
      </header>

      <div className={styles.dateFilter}>
        <button className={styles.dateBtn} onClick={() => changeDate(-1)}>
          <Symbol name="chevron_left" />
        </button>
        <span className={styles.dateDisplay}>{getDisplayDate()}</span>
        <button 
          className={styles.dateBtn} 
          onClick={() => changeDate(1)}
          disabled={date === new Date().toISOString().split('T')[0]}
          style={{ opacity: date === new Date().toISOString().split('T')[0] ? 0.3 : 1 }}
        >
          <Symbol name="chevron_right" />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : (
        <>
          <div className={styles.tillCard}>
            <span className={styles.tillLabel}>Expected Cash in Till</span>
            <h2 className={styles.tillAmount}>{formatMoney(expectedTill)}</h2>
          </div>

          <div className={styles.summaryRow}>
            <div className={styles.summaryBox}>
              <span className={styles.summaryBoxLabel}>Bank & POS (In)</span>
              <span className={`${styles.summaryBoxAmount} ${styles.success}`}>{formatMoney(transferIn + posIn)}</span>
            </div>
            <div className={styles.summaryBox}>
              <span className={styles.summaryBoxLabel}>Cash & Bank (Out)</span>
              <span className={`${styles.summaryBoxAmount} ${styles.danger}`}>{formatMoney(cashOut + transferOut)}</span>
            </div>
          </div>

          <h3 className={styles.sectionTitle}>Transactions ({transactions.length})</h3>
          
          {transactions.length === 0 ? (
            <div style={{ marginTop: 24 }}>
              <EmptyState
                icon={<Symbol name="receipt_long" size={32} />}
                title="No transactions"
                description="No transactions recorded for this date."
              />
            </div>
          ) : (
            <div className={styles.transactionList}>
              {transactions.map(t => (
                <div key={t.id} className={styles.transactionItem}>
                  <div className={styles.transactionLeft}>
                    <div className={`${styles.transactionIcon} ${styles[t.type]}`}>
                      <Symbol name={t.type === 'income' ? 'arrow_downward' : 'arrow_upward'} size={20} />
                    </div>
                    <div className={styles.transactionDesc}>
                      <span className={styles.transactionName}>{t.desc}</span>
                      <span className={styles.transactionTime}>{t.time}</span>
                    </div>
                  </div>
                  <div className={styles.transactionRight}>
                    <span className={`${styles.transactionAmount} ${styles[t.type]}`}>
                      {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                    </span>
                    <span className={styles.transactionMethod}>{t.method}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

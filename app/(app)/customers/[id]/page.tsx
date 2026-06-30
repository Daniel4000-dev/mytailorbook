'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaWhatsapp, FaUserSlash } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import Avatar from '@/components/ui/Avatar/Avatar';
import Badge from '@/components/ui/Badge/Badge';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import MeasurementAnatomy from '@/components/customers/MeasurementAnatomy/MeasurementAnatomy';
import OrderDetailSheet from '@/components/kanban/OrderDetailSheet/OrderDetailSheet';
import { formatCurrency, formatPhone, getWhatsAppLink, truncateText } from '@/lib/formatters';
import { getBalanceOwed } from '@/lib/types';
import type { Measurements } from '@/lib/types';
import styles from './page.module.css';

interface Point {
  id: string;
  name: string;
  x: number;
  y: number;
}

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const { isOwner } = useAuth();
  const { customers, orders, updateCustomerMeasurements, updateOrder } = useData();

  const customer = customers.find((c) => c.id === id);

  // Initialize from customer measurements
  const [measurements, setMeasurements] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (customer?.measurements) {
      Object.entries(customer.measurements).forEach(([key, val]) => {
        if (val !== undefined && val !== null && key !== 'notes') {
          initial[key] = String(val);
        }
      });
    }
    return initial;
  });

  const [notes, setNotes] = useState(customer?.measurements?.notes || '');
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [currentValue, setCurrentValue] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  if (!isOwner) {
    return (
      <PageLayout header={<TopBar title="Customer" showBack />}>
        <EmptyState icon={<FaUserSlash />} title="Access Denied" />
      </PageLayout>
    );
  }

  if (!customer) {
    return (
      <PageLayout header={<TopBar title="Customer" showBack />}>
        <EmptyState icon={<FaUserSlash />} title="Customer not found" />
      </PageLayout>
    );
  }

  const custOrders = orders.filter((o) => o.customerId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalSpend = custOrders.reduce((s, o) => s + o.totalBill, 0);
  const totalOwed = custOrders.reduce((s, o) => s + getBalanceOwed(o), 0);

  const handlePointSelect = (point: Point) => {
    setSelectedPoint(point);
    setCurrentValue(measurements[point.id] || '');
  };

  const handleMeasurementChange = (pointId: string, val: string) => {
    setMeasurements(prev => ({
      ...prev,
      [pointId]: val
    }));
    
    const updatedMeasurements: Measurements = {
      ...customer.measurements,
      notes: notes || undefined
    };
    
    const updatedRecord = { ...measurements, [pointId]: val };
    
    Object.entries(updatedRecord).forEach(([key, value]) => {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        (updatedMeasurements as any)[key] = num;
      }
    });
    
    const num = parseFloat(val);
    if (isNaN(num)) {
      delete (updatedMeasurements as any)[pointId];
    }
    
    updateCustomerMeasurements(customer.id, updatedMeasurements);
  };

  const handleSaveNotes = () => {
    const updatedMeasurements: Measurements = {
      ...customer.measurements,
      notes: notes || undefined
    };
    
    Object.entries(measurements).forEach(([key, val]) => {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        (updatedMeasurements as any)[key] = num;
      }
    });

    updateCustomerMeasurements(customer.id, updatedMeasurements);
  };

  const handleSaveMeasurement = () => {
    if (selectedPoint) {
      const newVal = currentValue;
      setMeasurements(prev => ({
        ...prev,
        [selectedPoint.id]: newVal
      }));
      
      const updatedMeasurements: Measurements = {
        ...customer.measurements,
        notes: notes || undefined
      };
      
      Object.entries(measurements).forEach(([key, val]) => {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          (updatedMeasurements as any)[key] = num;
        }
      });
      
      const newNum = parseFloat(newVal);
      if (!isNaN(newNum)) {
        (updatedMeasurements as any)[selectedPoint.id] = newNum;
      } else {
        delete (updatedMeasurements as any)[selectedPoint.id];
      }
      
      updateCustomerMeasurements(customer.id, updatedMeasurements);
      setSelectedPoint(null);
    }
  };

  const handleClearMeasurement = () => {
    if (selectedPoint) {
      setMeasurements(prev => {
        const copy = { ...prev };
        delete copy[selectedPoint.id];
        return copy;
      });
      
      const updatedMeasurements: Measurements = {
        ...customer.measurements,
        notes: notes || undefined
      };
      
      Object.entries(measurements).forEach(([key, val]) => {
        if (key !== selectedPoint.id) {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            (updatedMeasurements as any)[key] = num;
          }
        }
      });
      
      delete (updatedMeasurements as any)[selectedPoint.id];
      
      updateCustomerMeasurements(customer.id, updatedMeasurements);
      setSelectedPoint(null);
    }
  };

  return (
    <PageLayout
      className={styles.pageGrid}
      header={<TopBar title="Customer Details" showBack />}
    >
        
        {/* LEFT COLUMN: Profile, Stats, Notes */}
        <div className={styles.leftColumn}>
          
          <div className={`${styles.card} ${styles.profileHeader}`}>
            <Avatar name={customer.fullName} size="lg" />
            <h2 className={styles.name}>{customer.fullName}</h2>
            <a href={getWhatsAppLink(customer.whatsappNumber)} target="_blank" rel="noopener noreferrer" className={styles.whatsapp}>
              <FaWhatsapp size={16} /> {formatPhone(customer.whatsappNumber)}
            </a>
          </div>

          <div className={`${styles.card} ${styles.statsGrid}`}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{custOrders.length}</span>
              <span className={styles.statLabel}>Orders</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{formatCurrency(totalSpend)}</span>
              <span className={styles.statLabel}>Lifetime</span>
            </div>
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${totalOwed > 0 ? styles.gold : ''}`}>
                {formatCurrency(totalOwed)}
              </span>
              <span className={styles.statLabel}>Owed</span>
            </div>
          </div>

          <div className={`${styles.card} ${styles.notesSection}`}>
            <h3 className={styles.sectionTitle}>Customer Notes</h3>
            <textarea
              className={styles.notesTextarea}
              placeholder="Add special requests, preferences, or fabric details here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
            />
          </div>

        </div>

        {/* RIGHT COLUMN: Measurements & Orders */}
        <div className={styles.rightColumn}>
          
          <div className={styles.card}>
            <h3 className={styles.sectionTitle}>Measurements</h3>
            <MeasurementAnatomy 
              gender={customer.gender || 'female'}
              measurements={measurements} 
              selectedPointId={selectedPoint?.id} 
              onPointSelect={handlePointSelect} 
              onValueChange={handleMeasurementChange}
            />
          </div>

          <div className={styles.card}>
            <h3 className={styles.sectionTitle}>Order History</h3>
            <div className={styles.orderList}>
              {custOrders.map((o, i) => (
                <div 
                  key={o.id} 
                  className={styles.orderCard} 
                  style={{ animationDelay: `${i * 0.05}s`, cursor: 'pointer' }}
                  onClick={() => setSelectedOrder(o)}
                >
                  <div className={styles.orderHeader}>
                    <div className={styles.orderMeta}>
                      <Badge variant={o.status.toLowerCase() as 'cutting' | 'sewing' | 'ready' | 'completed'} size="md">
                        {o.status}
                      </Badge>
                      <span className={styles.orderDate}>
                        {new Date(o.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <p className={styles.orderDetails}>{truncateText(o.orderDetails, 120)}</p>
                  
                  <div className={styles.orderFinancials}>
                    <span className={styles.orderAmount}>{formatCurrency(o.totalBill)}</span>
                    {getBalanceOwed(o) > 0 && (
                      <span className={styles.orderBalance}>Owes {formatCurrency(getBalanceOwed(o))}</span>
                    )}
                  </div>
                </div>
              ))}
              {custOrders.length === 0 && (
                <p style={{ color: 'var(--sf-text-tertiary)', textAlign: 'center', padding: 'var(--sf-space-lg) 0' }}>
                  No orders found for this customer.
                </p>
              )}
            </div>
          </div>

        </div>

      <BottomSheet isOpen={!!selectedPoint} onClose={() => setSelectedPoint(null)}>
        <div style={{ padding: 'var(--sf-space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--sf-space-md)' }}>
          <div>
            <p style={{ fontSize: 'var(--sf-text-sm)', color: 'var(--sf-text-secondary)' }}>Selected point</p>
            <h3 style={{ fontSize: 'var(--sf-text-lg)', fontWeight: 'var(--sf-weight-semibold)', color: 'var(--sf-text-primary)', marginBottom: 'var(--sf-space-md)' }}>
              {selectedPoint?.name}
            </h3>
          </div>
          
          <Input 
            label="Measurement Value" 
            placeholder="e.g. 15 inches or 38 cm" 
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
          />

          <div style={{ display: 'flex', gap: 'var(--sf-space-md)', marginTop: 'var(--sf-space-sm)' }}>
            <Button variant="ghost" fullWidth onClick={handleClearMeasurement}>
              Clear
            </Button>
            <Button variant="primary" fullWidth onClick={handleSaveMeasurement}>
              Save
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Order Detail Sheet */}
      <BottomSheet 
        isOpen={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)}
        title="Order Details"
      >
        {selectedOrder && (
          <OrderDetailSheet 
            order={orders.find(o => o.id === selectedOrder.id) || selectedOrder}
            customer={customer}
            userRole={isOwner ? 'Owner' : 'Staff'}
            onUpdatePayment={async (orderId, amount) => {
              await updateOrder(orderId, { depositPaid: amount });
            }}
          />
        )}
      </BottomSheet>
    </PageLayout>
  );
}

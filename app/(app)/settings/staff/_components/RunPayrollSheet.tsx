import React, { useMemo } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import Avatar from '@/components/ui/Avatar/Avatar';
import { formatCurrency } from '@/lib/formatters';
import type { User, Order, StatusChange } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  staffMembers: User[];
  orders: Order[];
  currency: string;
}

export default function RunPayrollSheet({ isOpen, onClose, staffMembers, orders, currency }: Props) {
  const payrollData = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return staffMembers.map(staff => {
      const type = staff.payrollType || 'none';
      const amount = staff.payrollAmount || 0;
      
      let earned = 0;
      let tasksCompleted = 0;
      const matchingOrders: Order[] = [];
      
      if (type !== 'none' && type !== 'salary') {
        // Find orders assigned to this staff that were moved to Ready or Delivered in the last 7 days
        for (const order of orders) {
          if (order.assignedTo !== staff.uid) continue;
          
          let wasCompletedRecently = false;
          let completionDate = new Date(order.updatedAt);
          
          if (order.statusHistory && Array.isArray(order.statusHistory)) {
             // Find the first time it hit Ready or Delivered
             const completedEvent = order.statusHistory.find((h: any) => h.to === 'Ready' || h.to === 'Delivered');
             if (completedEvent) {
               completionDate = new Date(completedEvent.timestamp);
             }
          }
          
          if ((order.status === 'Ready' || order.status === 'Delivered') && completionDate >= oneWeekAgo) {
            tasksCompleted++;
            matchingOrders.push(order);
            
            if (type === 'piece_rate') {
              earned += amount;
            } else if (type === 'percentage') {
              const profit = order.totalBill - ((order.materialCost || 0) + (order.otherCosts || 0));
              earned += profit * (amount / 100);
            }
          }
        }
      } else if (type === 'salary') {
        earned = amount; // Fixed weekly salary
      }

      return { staff, type, amount, earned, tasksCompleted, matchingOrders };
    }).sort((a, b) => b.earned - a.earned);
  }, [staffMembers, orders]);

  const totalPayroll = payrollData.reduce((sum, data) => sum + data.earned, 0);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Weekly Payroll Estimate">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '24px' }}>
        <p style={{ color: 'var(--sf-text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
          Calculated based on orders moved to <strong>Ready</strong> or <strong>Delivered</strong> by assigned staff in the last 7 days.
        </p>

        <div style={{ padding: '24px', background: 'var(--sf-bg-surface-hover)', borderRadius: 'var(--sf-radius-lg)', textAlign: 'center' }}>
          <div style={{ color: 'var(--sf-text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Total Payout</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--sf-text-primary)' }}>
            {formatCurrency(totalPayroll, currency)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {payrollData.map(({ staff, type, amount, earned, tasksCompleted }) => (
            <div key={staff.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px solid var(--sf-border-color)', borderRadius: 'var(--sf-radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar name={staff.name} imageUrl={staff.avatarUrl} size="sm" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--sf-text-primary)' }}>{staff.name}</span>
                  <span style={{ fontSize: '12px', color: 'var(--sf-text-secondary)' }}>
                    {type === 'salary' ? 'Salary' :
                     type === 'piece_rate' ? `${formatCurrency(amount, currency)} / piece (${tasksCompleted} completed)` :
                     type === 'percentage' ? `${amount}% margin (${tasksCompleted} completed)` :
                     'Unpaid'}
                  </span>
                </div>
              </div>
              <div style={{ fontWeight: 600, color: earned > 0 ? 'var(--sf-success)' : 'var(--sf-text-primary)' }}>
                {formatCurrency(earned, currency)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}

import React, { useMemo } from 'react';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import Symbol from '@/components/ui/Symbol/Symbol';
import Button from '@/components/ui/Button/Button';
import Avatar from '@/components/ui/Avatar/Avatar';
import { formatCurrency, getWhatsAppLink } from '@/lib/formatters';
import type { User, Order, StatusChange } from '@/lib/types';
import { CRAFT_ROLE_LABELS } from '@/lib/types';

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

  const handleSharePayoutWhatsApp = (staff: User, earned: number, tasksCompleted: number, ordersList: Order[]) => {
    const lines = ordersList.map((o) => `• #${o.id.slice(0, 4).toUpperCase()} ${o.styleName || o.orderDetails || 'Garment'}`).join('\n');
    const msg = `Hello ${staff.name}! Here is your weekly artisan payout summary:
Total Earned: ${formatCurrency(earned, currency)}
Garments Completed: ${tasksCompleted}
${lines ? `\nCompleted Pieces:\n${lines}\n` : ''}
Thank you for your excellent craftsmanship!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Weekly Atelier Payroll & Piece-Rate">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '24px' }}>
        <p style={{ color: 'var(--sf-text-secondary)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
          Automatically computed from garments moved to <strong>Ready</strong> or <strong>Delivered</strong> by assigned cutters, machinists, and apprentices over the last 7 days.
        </p>

        <div style={{ padding: '20px', background: 'var(--sf-bg-surface-hover, rgba(0,0,0,0.03))', borderRadius: 'var(--sf-radius-lg)', textAlign: 'center', border: '1px solid var(--sf-border-light)' }}>
          <div style={{ color: 'var(--sf-text-tertiary)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Total Team Payout</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--sf-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(totalPayroll, currency)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {payrollData.map(({ staff, type, amount, earned, tasksCompleted, matchingOrders }) => {
            const craftLabel = CRAFT_ROLE_LABELS[staff.craftRole || 'general'];
            return (
              <div key={staff.uid} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', border: '1px solid var(--sf-border-light)', borderRadius: 'var(--sf-radius-md)', background: 'var(--sf-bg-surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar name={staff.name} imageUrl={staff.avatarUrl} size="sm" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--sf-text-primary)' }}>{staff.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: staff.craftRole === 'apprentice' ? '#D97706' : 'var(--sf-accent-indigo)', background: staff.craftRole === 'apprentice' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(79, 70, 229, 0.08)', padding: '2px 6px', borderRadius: '9999px' }}>
                          {craftLabel}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--sf-text-secondary)' }}>
                        {type === 'salary' ? 'Fixed Weekly Salary' :
                         type === 'piece_rate' ? `${formatCurrency(amount, currency)} / piece (${tasksCompleted} completed)` :
                         type === 'percentage' ? `${amount}% margin (${tasksCompleted} completed)` :
                         staff.craftRole === 'apprentice' ? 'Apprentice Stipend / Unpaid' : 'Unpaid'}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: earned > 0 ? 'var(--sf-success, #059669)' : 'var(--sf-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(earned, currency)}
                    </div>
                  </div>
                </div>

                {earned > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--sf-border-light)' }}>
                    <button
                      type="button"
                      onClick={() => handleSharePayoutWhatsApp(staff, earned, tasksCompleted, matchingOrders)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--sf-accent-indigo, #4F46E5)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '4px 8px',
                      }}
                    >
                      <Symbol name="share" size={14} />
                      <span>Share Payout Breakdown</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
}

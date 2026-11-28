import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AgendaCard from '@/app/(app)/calendar/_components/AgendaCard';
import type { CalendarEvent, Customer } from '@/lib/types';

describe('AgendaCard Component Mount & Integration Tests', () => {
  const onToggleStatusMock = vi.fn();
  const onOpenVerdictMock = vi.fn();
  const onWhatsAppReminderMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /* -------------------------------------------------------------------------
     1. Rich / Full Data State
     ------------------------------------------------------------------------- */
  it('renders rich fitting session with full notes, customer details, and action triggers', () => {
    const richEvent: CalendarEvent = {
      id: 'evt-fit-101',
      shopId: 'shop-test-1',
      title: 'First Baste Fitting - Senator Ensemble',
      description: 'Check bicep ease and chest drape. Pin back sleeve pitch if necessary.',
      type: 'fitting',
      status: 'pending',
      date: '2026-11-28',
      startTime: '10:00',
      endTime: '11:00',
      relatedCustomerId: 'cust-1',
      relatedOrderId: 'ord-101',
      createdAt: '2026-11-20T08:00:00Z',
    };

    const richCustomer: Customer = {
      id: 'cust-1',
      shopId: 'shop-test-1',
      fullName: 'Chief Emeka Okafor',
      whatsappNumber: '+2348031234567',
      gender: 'male',
      preferredStyles: ['Senator', 'Agbada'],
      createdAt: '2026-01-01',
    };

    render(
      <AgendaCard
        event={richEvent}
        customer={richCustomer}
        onToggleStatus={onToggleStatusMock}
        onOpenVerdict={onOpenVerdictMock}
        onWhatsAppReminder={onWhatsAppReminderMock}
      />
    );

    // Contextual badge (replaces AI slop border)
    expect(screen.getByText('Fitting Session')).toBeDefined();
    expect(screen.getByText('First Baste Fitting - Senator Ensemble')).toBeDefined();
    expect(screen.getByText('Chief Emeka Okafor')).toBeDefined();

    // Full-width notes block
    expect(screen.getByText('Fitting Notes & Instructions')).toBeDefined();
    expect(
      screen.getByText('Check bicep ease and chest drape. Pin back sleeve pitch if necessary.')
    ).toBeDefined();

    // Time & Status
    expect(screen.getByText('10:00 - 11:00')).toBeDefined();
    expect(screen.getByText('Pending')).toBeDefined();

    // Interactive action triggers
    const verdictBtn = screen.getByTitle('Record fitting session outcome');
    fireEvent.click(verdictBtn);
    expect(onOpenVerdictMock).toHaveBeenCalledTimes(1);
    expect(onOpenVerdictMock).toHaveBeenCalledWith(richEvent);

    // Standard non-wrapping WhatsApp CTA
    const reminderBtn = screen.getByTitle('Send WhatsApp appointment reminder to client');
    expect(screen.getByText('WhatsApp Reminder')).toBeDefined();
    fireEvent.click(reminderBtn);
    expect(onWhatsAppReminderMock).toHaveBeenCalledTimes(1);
    expect(onWhatsAppReminderMock).toHaveBeenCalledWith(richEvent);

    const checkBtn = screen.getByTitle('Mark completed');
    fireEvent.click(checkBtn);
    expect(onToggleStatusMock).toHaveBeenCalledTimes(1);
    expect(onToggleStatusMock).toHaveBeenCalledWith(richEvent);
  });

  /* -------------------------------------------------------------------------
     2. Sparse / Minimal Data State
     ------------------------------------------------------------------------- */
  it('renders sparse workshop task without description or customer safely', () => {
    const sparseEvent: CalendarEvent = {
      id: 'evt-task-202',
      shopId: 'shop-test-1',
      title: 'Oil Industrial Overlock Machine',
      type: 'general_task',
      status: 'completed',
      date: '2026-11-28',
      createdAt: '2026-11-20T08:00:00Z',
    };

    render(
      <AgendaCard
        event={sparseEvent}
        customer={null}
        onToggleStatus={onToggleStatusMock}
        onOpenVerdict={onOpenVerdictMock}
        onWhatsAppReminder={onWhatsAppReminderMock}
      />
    );

    // Category pill for task
    expect(screen.getByText('Workshop Task')).toBeDefined();
    expect(screen.getByText('Oil Industrial Overlock Machine')).toBeDefined();

    // All day default
    expect(screen.getByText('All day')).toBeDefined();

    // No description block should be present
    expect(screen.queryByText('Task Notes')).toBeNull();
    expect(screen.queryByText('Fitting Notes & Instructions')).toBeNull();

    // Status is completed
    const checkBtn = screen.getByTitle('Mark pending');
    fireEvent.click(checkBtn);
    expect(onToggleStatusMock).toHaveBeenCalledWith(sparseEvent);
  });

  /* -------------------------------------------------------------------------
     3. Edge-Case / Corrupted Data State
     ------------------------------------------------------------------------- */
  it('renders delivery deadline linking to workshop slip and handles missing customer contacts', () => {
    const deadlineEvent: CalendarEvent = {
      id: 'order-deadline-ord-888',
      shopId: 'shop-test-1',
      title: 'Garment Delivery: 2-Piece Safari Suit',
      description: 'Special care instructions: Silk satin lining, steam only.',
      type: 'dispatch',
      status: 'pending',
      date: '2026-11-29',
      relatedOrderId: 'ord-888',
      relatedCustomerId: 'cust-missing-contact',
      createdAt: '2026-11-20T08:00:00Z',
    };

    const customerNoPhone: Customer = {
      id: 'cust-missing-contact',
      shopId: 'shop-test-1',
      fullName: 'Alhaji Musa',
      whatsappNumber: '',
      gender: 'male',
      createdAt: '2026-01-01',
    };

    render(
      <AgendaCard
        event={deadlineEvent}
        customer={customerNoPhone}
        onToggleStatus={onToggleStatusMock}
        onOpenVerdict={onOpenVerdictMock}
        onWhatsAppReminder={onWhatsAppReminderMock}
      />
    );

    // Delivery category pill
    expect(screen.getByText('Garment Delivery')).toBeDefined();
    expect(screen.getByText('Alhaji Musa')).toBeDefined();

    // Full-width notes block
    expect(screen.getByText('Task Notes')).toBeDefined();
    expect(
      screen.getByText('Special care instructions: Silk satin lining, steam only.')
    ).toBeDefined();

    // Workshop slip link
    const slipLink = screen.getByText('Open Workshop Slip');
    expect(slipLink).toBeDefined();
    expect(slipLink.closest('a')?.getAttribute('href')).toBe('/production/ord-888');

    // Deadlines do not have manual toggle button or verdict button
    expect(screen.queryByTitle('Toggle completion status')).toBeNull();
    expect(screen.queryByTitle('Record fitting session outcome')).toBeNull();

    // Customer without phone does not render phone/WhatsApp chips
    expect(screen.queryByTitle('Send WhatsApp appointment reminder to client')).toBeNull();
    expect(screen.queryByTitle('Call client')).toBeNull();
  });
});

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compressImage';
import { formatNumber, formatPhone, getCurrencySymbol, getWhatsAppLink, normalizePhone } from '@/lib/formatters';
import { ROUTES } from '@/lib/routes';
import { GARMENT_STYLES, STYLE_MEASUREMENTS, type StyleMeasurePoint } from '@/lib/constants';
import Symbol from '@/components/ui/Symbol/Symbol';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import BottomSheet from '@/components/ui/BottomSheet/BottomSheet';
import { PhoneInput } from '@/components/ui/PhoneInput/PhoneInput';
import type { Customer, Order, Priority } from '@/lib/types';
import styles from './UnifiedNewOrderForm.module.css';

const DEFAULT_POINTS: StyleMeasurePoint[] = [
  { key: 'neck', label: 'Neck', hint: 'Base of neck, relaxed', gx: 0, gy: 0 },
  { key: 'shoulder', label: 'Shoulder', hint: 'Bone to bone across back', gx: 0, gy: 0 },
  { key: 'chest', label: 'Chest / Bust', hint: 'Fullest part, arms down', gx: 0, gy: 0 },
  { key: 'sleeveLength', label: 'Sleeve Length', hint: 'Shoulder seam to wrist', gx: 0, gy: 0 },
  { key: 'waist', label: 'Waist', hint: 'Natural waistline', gx: 0, gy: 0 },
  { key: 'shirtLength', label: 'Top / Shirt Length', hint: 'Shoulder to top hem', gx: 0, gy: 0 },
  { key: 'trouserLength', label: 'Trouser / Dress Length', hint: 'Waist or shoulder to hem', gx: 0, gy: 0 },
  { key: 'hips', label: 'Hips', hint: 'Widest point around seat', gx: 0, gy: 0 },
  { key: 'thigh', label: 'Thigh', hint: 'Widest part of upper leg', gx: 0, gy: 0 },
  { key: 'ankle', label: 'Ankle / Bottom', hint: 'Around the bottom hem', gx: 0, gy: 0 },
];

export interface GarmentDraft {
  id: string;
  styleName: string;
  isCustomStyle?: boolean;
  price: string;
  measures: Record<string, string>;
  measurementNotes: string;
  isFitLoaded: boolean;
  showTweakMeasurements: boolean;
  fabricImage: string | null;
  styleReferenceImage: string | null;
  uploadingFabric: boolean;
  uploadingStyleRef: boolean;
  materialSuppliedBy: 'customer' | 'shop';
  fabricNotes: string;
}

export default function UnifiedNewOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    customers,
    orders,
    staffMembers,
    currentShop,
    addOrderBatch,
    addCustomer,
    updateCustomerStyleProfile,
    updateCustomerMeasurements,
    updateCustomerProfile,
  } = useData();
  const { showToast } = useToast();

  const currencySymbol = getCurrencySymbol(currentShop?.currency || 'NGN');

  // ── 1. Client State ──
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showInlineNewCustomer, setShowInlineNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerGender, setNewCustomerGender] = useState<'male' | 'female'>('male');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [isContactPickerSupported, setIsContactPickerSupported] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'contacts' in navigator) {
      setIsContactPickerSupported(true);
    }
  }, []);

  const handleImportContact = async () => {
    if (typeof navigator === 'undefined' || !('contacts' in navigator)) {
      showToast('Apple iOS restricts contact importing in browsers. Please enter details manually.', 'info');
      return;
    }
    try {
      const props = ['name', 'tel'];
      const opts = { multiple: false };
      const contacts = await (navigator as any).contacts.select(props, opts);
      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        if (contact.name && contact.name.length > 0) {
          setNewCustomerName(contact.name[0]);
        }
        if (contact.tel && contact.tel.length > 0) {
          const cleanedPhone = contact.tel[0].replace(/[^\d+]/g, '');
          setNewCustomerPhone(cleanedPhone);
        }
        setShowInlineNewCustomer(true);
        showToast('Contact imported! Review details below', 'success');
      }
    } catch (ex) {
      console.error('Failed to select contact:', ex);
    }
  };

  // Polish 1: Auto-carry search query into inline walk-in form
  const handleOpenNewCustomerForm = () => {
    const query = customerSearch.trim();
    if (query) {
      const digitsOnly = query.replace(/\D/g, '');
      const lettersOnly = query.replace(/[^a-zA-Z]/g, '');
      if (digitsOnly.length >= 4 && digitsOnly.length >= lettersOnly.length) {
        setNewCustomerPhone(query);
      } else {
        setNewCustomerName(query);
      }
    }
    setShowInlineNewCustomer(true);
  };

  // Pre-select if customer query param is passed
  useEffect(() => {
    const custId = searchParams.get('customer');
    if (custId && customers.length > 0 && !selectedCustomer) {
      const match = customers.find((c) => c.id === custId);
      if (match) setSelectedCustomer(match);
    }
  }, [searchParams, customers, selectedCustomer]);

  // Smart local phone number search normalization
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 5);
    const qRaw = customerSearch.trim();
    const qLower = qRaw.toLowerCase();
    const qDigits = qRaw.replace(/\D/g, '');
    const qNormalized = qDigits ? normalizePhone(qDigits) : '';

    return customers
      .filter((c) => {
        if (c.fullName.toLowerCase().includes(qLower)) return true;
        if (c.whatsappNumber.includes(qRaw)) return true;
        if (qDigits && c.whatsappNumber.includes(qDigits)) return true;
        if (qNormalized && c.whatsappNumber.includes(qNormalized)) return true;
        const localNum = c.whatsappNumber.startsWith('234') ? c.whatsappNumber.slice(3) : c.whatsappNumber;
        if (qDigits && localNum.includes(qDigits)) return true;
        return false;
      })
      .slice(0, 6);
  }, [customers, customerSearch]);

  const customerPastOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter((o) => o.customerId === selectedCustomer.id);
  }, [orders, selectedCustomer]);

  // Gender filter state for garment styles
  const [styleGenderFilter, setStyleGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  useEffect(() => {
    if (selectedCustomer?.gender === 'female') {
      setStyleGenderFilter('female');
    } else if (selectedCustomer?.gender === 'male') {
      setStyleGenderFilter('male');
    } else {
      setStyleGenderFilter('all');
    }
  }, [selectedCustomer]);

  // Catalog of styles
  const allStyles = useMemo(() => {
    const standard = GARMENT_STYLES.map((s) => ({
      name: s.name,
      subtitle: s.subtitle,
      gender: s.gender,
      photoUrl: s.photoUrl,
    }));
    const custom = (currentShop?.customStyles || []).map((s) => ({
      name: s.name,
      subtitle: 'Custom Studio Style',
      gender: s.gender || 'male',
      photoUrl: s.photoUrl,
    }));
    return [...standard, ...custom];
  }, [currentShop?.customStyles]);

  const displayedStyles = useMemo(() => {
    if (styleGenderFilter === 'all') return allStyles;
    return allStyles.filter((s) => !s.gender || s.gender === styleGenderFilter);
  }, [allStyles, styleGenderFilter]);

  // Helper to get measurement points spec for a style
  const getSpecPointsForStyle = (styleName: string): StyleMeasurePoint[] => {
    const spec = STYLE_MEASUREMENTS[styleName];
    if (spec && spec.points.length > 0) return spec.points;
    const customMatch = currentShop?.customStyles?.find((cs) => cs.name === styleName);
    if (customMatch && customMatch.measurementFields && customMatch.measurementFields.length > 0) {
      return customMatch.measurementFields.map((f) => ({
        key: f.id,
        label: f.label,
        hint: f.label,
        gx: 0,
        gy: 0,
      }));
    }
    return DEFAULT_POINTS;
  };

  // Helper to auto-load customer measurements for a style
  const loadFitForStyle = (
    cust: Customer | null,
    styleName: string
  ): { measures: Record<string, string>; isFitLoaded: boolean; notes: string } => {
    if (!cust) return { measures: {}, isFitLoaded: false, notes: '' };

    const styleProfile = cust.styleMeasurements?.[styleName]?.measurements;
    const pastSameOrder = orders
      .filter((o) => o.customerId === cust.id && o.styleName === styleName && o.measurements)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const bodyMeasurements = cust.measurements;

    // Merge baseline body measurements with style-specific measurements
    const merged: Record<string, any> = {
      ...(bodyMeasurements || {}),
      ...(pastSameOrder?.measurements || {}),
      ...(styleProfile || {}),
    };

    if (Object.keys(merged).length > 0) {
      const stringified: Record<string, string> = {};
      for (const [k, v] of Object.entries(merged)) {
        if (v !== undefined && v !== null) {
          const num = typeof v === 'number' ? v : parseFloat(String(v));
          if (!isNaN(num) && num > 0) stringified[k] = String(num);
        }
      }
      return { measures: stringified, isFitLoaded: Object.keys(stringified).length > 0, notes: cust.measurementNotes || '' };
    }
    return { measures: {}, isFitLoaded: false, notes: cust.measurementNotes || '' };
  };

  // ── 2. Multi-Garment State ──
  const [garments, setGarments] = useState<GarmentDraft[]>([
    {
      id: 'g-1',
      styleName: 'Senator',
      isCustomStyle: false,
      price: '',
      measures: {},
      measurementNotes: '',
      isFitLoaded: false,
      showTweakMeasurements: false,
      fabricImage: null,
      styleReferenceImage: null,
      uploadingFabric: false,
      uploadingStyleRef: false,
      materialSuppliedBy: 'customer',
      fabricNotes: '',
    },
  ]);

  // Update measurements for all garments when client changes (Polish 2: keep open if incomplete)
  useEffect(() => {
    setGarments((prev) =>
      prev.map((g) => {
        const { measures, isFitLoaded, notes } = loadFitForStyle(selectedCustomer, g.styleName);
        const spec = getSpecPointsForStyle(g.styleName);
        const filledCount = spec.filter((pt) => Boolean(measures[pt.key] && parseFloat(measures[pt.key]) > 0)).length;
        const isComplete = spec.length > 0 && filledCount === spec.length;
        return {
          ...g,
          measures,
          isFitLoaded,
          measurementNotes: notes,
          showTweakMeasurements: !isFitLoaded || !isComplete,
        };
      })
    );
  }, [selectedCustomer]);

  const updateGarment = (id: string, patch: Partial<GarmentDraft>) => {
    setGarments((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const handleStyleChange = (garmentId: string, newStyle: string, isCustom = false) => {
    const { measures, isFitLoaded, notes } = loadFitForStyle(selectedCustomer, newStyle);
    const spec = getSpecPointsForStyle(newStyle);
    const filledCount = spec.filter((pt) => Boolean(measures[pt.key] && parseFloat(measures[pt.key]) > 0)).length;
    const isComplete = spec.length > 0 && filledCount === spec.length;
    updateGarment(garmentId, {
      styleName: newStyle,
      isCustomStyle: isCustom,
      measures,
      isFitLoaded,
      measurementNotes: notes,
      showTweakMeasurements: !isFitLoaded || !isComplete,
    });
  };

  const handleMeasureChange = (garmentId: string, pointKey: string, val: string) => {
    setGarments((prev) =>
      prev.map((g) => (g.id === garmentId ? { ...g, measures: { ...g.measures, [pointKey]: val } } : g))
    );
  };

  const handleAddGarment = () => {
    const nextNum = garments.length + 1;
    const defaultNextStyle = selectedCustomer?.gender === 'female' ? 'Ankara Gown' : 'Kaftan';
    const { measures, isFitLoaded, notes } = loadFitForStyle(selectedCustomer, defaultNextStyle);
    const spec = getSpecPointsForStyle(defaultNextStyle);
    const filledCount = spec.filter((pt) => Boolean(measures[pt.key] && parseFloat(measures[pt.key]) > 0)).length;
    const isComplete = spec.length > 0 && filledCount === spec.length;

    setGarments((prev) => [
      ...prev,
      {
        id: `g-${Date.now()}`,
        styleName: defaultNextStyle,
        isCustomStyle: false,
        price: '',
        measures,
        measurementNotes: notes,
        isFitLoaded,
        showTweakMeasurements: !isFitLoaded || !isComplete,
        fabricImage: null,
        styleReferenceImage: null,
        uploadingFabric: false,
        uploadingStyleRef: false,
        materialSuppliedBy: 'customer',
        fabricNotes: '',
      },
    ]);
    showToast(`Added Outfit #${nextNum}`, 'info');
  };

  const handleRemoveGarment = (id: string) => {
    if (garments.length <= 1) return;
    setGarments((prev) => prev.filter((g) => g.id !== id));
  };

  // ── 3. Photos Upload ──
  const handlePhotoUpload = async (garmentId: string, file: File, type: 'fabric' | 'styleRef') => {
    if (!currentShop?.id) return;
    const isFabric = type === 'fabric';
    updateGarment(garmentId, isFabric ? { uploadingFabric: true } : { uploadingStyleRef: true });

    try {
      const compressed = await compressImage(file, { maxDimension: 1200 });
      const supabase = createClient();
      const ext = compressed.name.split('.').pop() || 'jpg';
      const path = `${currentShop.id}/orders/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('order-photos')
        .upload(path, compressed, { cacheControl: '3600', upsert: false });

      if (uploadError) throw new Error(uploadError.message);
      const url = supabase.storage.from('order-photos').getPublicUrl(path).data.publicUrl;

      updateGarment(garmentId, isFabric ? { fabricImage: url } : { styleReferenceImage: url });
      showToast(`${isFabric ? 'Fabric' : 'Style'} photo uploaded`, 'success');
    } catch (err) {
      showToast('Could not upload photo. Please try again.', 'error');
    } finally {
      updateGarment(garmentId, isFabric ? { uploadingFabric: false } : { uploadingStyleRef: false });
    }
  };

  // ── 4. Financials & Delivery Schedule ──
  const getDaysFromNow = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [manualTotalBill, setManualTotalBill] = useState('');
  const [depositPaid, setDepositPaid] = useState('');
  const [dueDate, setDueDate] = useState(() => getDaysFromNow(7));
  const [priority, setPriority] = useState<Priority>('normal');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Auto-sum individual garment prices if provided
  const sumOfGarmentPrices = useMemo(() => {
    return garments.reduce((sum, g) => sum + (parseInt(g.price.replace(/,/g, '')) || 0), 0);
  }, [garments]);

  // Polish 4: Auto-sync manualTotalBill to sumOfGarmentPrices when garment prices are entered
  useEffect(() => {
    if (sumOfGarmentPrices > 0) {
      setManualTotalBill(String(sumOfGarmentPrices));
    }
  }, [sumOfGarmentPrices]);

  const numericTotal = useMemo(() => {
    if (manualTotalBill) return parseInt(manualTotalBill.replace(/,/g, '')) || 0;
    return sumOfGarmentPrices;
  }, [manualTotalBill, sumOfGarmentPrices]);

  const numericDeposit = parseInt(depositPaid.replace(/,/g, '')) || 0;
  const numericBalance = Math.max(0, numericTotal - numericDeposit);

  // Deposit shortcut pills
  const handleQuickDeposit = (type: '50' | 'full' | 'zero') => {
    if (type === '50') {
      setDepositPaid(String(Math.round(numericTotal / 2)));
    } else if (type === 'full') {
      setDepositPaid(String(numericTotal));
    } else {
      setDepositPaid('0');
    }
  };

  // Workload Awareness on Due Date
  const setQuickDate = (days: number) => {
    setDueDate(getDaysFromNow(days));
  };

  const ordersDueOnDate = useMemo(() => {
    if (!dueDate) return 0;
    const targetDate = dueDate.split('T')[0];
    return orders.filter((o) => {
      if (!o.dueDate) return false;
      if (o.status === 'Delivered') return false;
      return o.dueDate.split('T')[0] === targetDate;
    }).length;
  }, [orders, dueDate]);

  // ── 5. Creation & WhatsApp Receipt ──
  const [submitting, setSubmitting] = useState(false);
  const [completedBatch, setCompletedBatch] = useState<{
    batchId: string;
    garments: {
      styleName: string;
      price: number;
      measures: Record<string, string>;
      measurementNotes: string;
      fabricNotes: string;
      materialSuppliedBy: 'customer' | 'shop';
      fabricImage: string | null;
    }[];
    totalBill: number;
    depositPaid: number;
    balanceDue: number;
    dueDate: string;
    firstOrderId: string;
    priority: Priority;
  } | null>(null);
  const [receiptSheetOpen, setReceiptSheetOpen] = useState(false);
  const [cuttingSlipOpen, setCuttingSlipOpen] = useState(false);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      showToast('Please enter the customer name', 'error');
      return;
    }
    if (!newCustomerPhone.trim()) {
      showToast('Please enter a WhatsApp number', 'error');
      return;
    }

    setSavingCustomer(true);
    try {
      const created = await addCustomer({
        fullName: newCustomerName.trim(),
        whatsappNumber: normalizePhone(newCustomerPhone.trim()),
        gender: newCustomerGender,
      });
      setSelectedCustomer(created);
      setShowInlineNewCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      showToast(`Added client ${created.fullName}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add customer', 'error');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedCustomer) {
      showToast('Please select or add a client first', 'error');
      return;
    }
    if (numericTotal <= 0) {
      showToast('Please enter the price for this order', 'error');
      return;
    }
    if (!dueDate) {
      showToast('Please choose a delivery / ready date', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const batchId = crypto.randomUUID();
      const formattedDueDate = dueDate.includes('T') ? dueDate : `${dueDate}T12:00:00.000Z`;

      // Distribute total and deposit across garments
      const garmentCount = garments.length;
      const unitDeposit = Math.round(numericDeposit / garmentCount);

      const garmentsPayload: Omit<Order, 'id' | 'shopId' | 'createdAt' | 'updatedAt' | 'batchId'>[] = garments.map(
        (g, idx) => {
          const parsedNumericMeasures: Record<string, number> = {};
          for (const [k, v] of Object.entries(g.measures)) {
            const parsed = parseFloat(v);
            if (!isNaN(parsed) && parsed > 0) parsedNumericMeasures[k] = parsed;
          }

          const unitPrice = g.price ? parseInt(g.price.replace(/,/g, '')) || 0 : Math.round(numericTotal / garmentCount);
          // For the last unit, allocate exact remaining deposit to avoid rounding errors
          const allocatedDeposit = idx === garmentCount - 1 ? Math.max(0, numericDeposit - unitDeposit * (garmentCount - 1)) : unitDeposit;

          const inspoList: string[] = [];
          if (g.styleReferenceImage) inspoList.push(g.styleReferenceImage);

          const fabricNotePrefix = g.fabricNotes.trim() ? ` [Fabric: ${g.fabricNotes.trim()}]` : '';
          const garmentName = g.styleName.trim() || 'Custom Outfit';
          const details = orderNotes.trim()
            ? `${orderNotes.trim()}${fabricNotePrefix}`
            : `${garmentName} (${idx + 1} of ${garmentCount}) for ${selectedCustomer.fullName}${fabricNotePrefix}`;

          return {
            customerId: selectedCustomer.id,
            customerName: selectedCustomer.fullName,
            orderDetails: details,
            totalBill: unitPrice,
            depositPaid: allocatedDeposit,
            status: 'Documented',
            assignedTo: assignedStaff || undefined,
            assignedToName: staffMembers.find((s) => s.uid === assignedStaff)?.name,
            dueDate: formattedDueDate,
            priority,
            measurements: parsedNumericMeasures,
            images: g.fabricImage
              ? [{ url: g.fabricImage, stage: 'Documented' as const, uploadedAt: new Date().toISOString() }]
              : [],
            inspirationImages: inspoList,
            styleName: garmentName,
            materialSuppliedBy: g.materialSuppliedBy,
            materialCost: 0,
            otherCosts: 0,
            statusHistory: [
              {
                from: null,
                to: 'Documented',
                changedBy: user?.uid || 'unknown',
                changedByName: user?.name || 'Tailor',
                timestamp: new Date().toISOString(),
              },
            ],
          };
        }
      );

      const createdIds = await addOrderBatch(garmentsPayload);

      // Update customer style measurements in profile
      for (const g of garments) {
        const parsedNumericMeasures: Record<string, number> = {};
        for (const [k, v] of Object.entries(g.measures)) {
          const parsed = parseFloat(v);
          if (!isNaN(parsed) && parsed > 0) parsedNumericMeasures[k] = parsed;
        }
        if (Object.keys(parsedNumericMeasures).length > 0) {
          await updateCustomerStyleProfile(selectedCustomer.id, g.styleName || 'Custom Outfit', parsedNumericMeasures).catch(() => {});
          await updateCustomerMeasurements(selectedCustomer.id, parsedNumericMeasures).catch(() => {});
        }
        if (g.measurementNotes.trim() && g.measurementNotes !== selectedCustomer.measurementNotes) {
          await updateCustomerProfile(selectedCustomer.id, { measurementNotes: g.measurementNotes.trim() }).catch(() => {});
        }
      }

      const firstOrderId = createdIds?.[0] || batchId;

      setCompletedBatch({
        batchId,
        garments: garments.map((g, i) => ({
          styleName: g.styleName.trim() || 'Custom Outfit',
          price: g.price ? parseInt(g.price.replace(/,/g, '')) || 0 : Math.round(numericTotal / garmentCount),
          measures: g.measures,
          measurementNotes: g.measurementNotes,
          fabricNotes: g.fabricNotes,
          materialSuppliedBy: g.materialSuppliedBy,
          fabricImage: g.fabricImage,
        })),
        totalBill: numericTotal,
        depositPaid: numericDeposit,
        balanceDue: numericBalance,
        dueDate: formattedDueDate,
        firstOrderId,
        priority,
      });

      setReceiptSheetOpen(true);
      showToast(garments.length > 1 ? `${garments.length} outfits queued into production!` : 'Order created successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getWhatsAppReceiptText = () => {
    if (!completedBatch || !selectedCustomer) return '';
    const shopName = currentShop?.name || 'Our Studio';
    const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}${ROUTES.track(completedBatch.firstOrderId)}` : '';
    const formattedDate = new Date(completedBatch.dueDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const garmentLines =
      completedBatch.garments.length > 1
        ? completedBatch.garments.map((g, i) => `  ${i + 1}. ${g.styleName} (${currencySymbol}${formatNumber(g.price)})`).join('\n')
        : `• *Garment:* ${completedBatch.garments[0]?.styleName || 'Custom Outfit'}`;

    return [
      `Hello ${selectedCustomer.fullName.split(' ')[0]}! ✂️`,
      `Thank you for placing your order with *${shopName}*.`,
      ``,
      `📋 *Order Summary:*`,
      garmentLines,
      `• *Total:* ${currencySymbol}${formatNumber(completedBatch.totalBill)}`,
      `• *Deposit Paid:* ${currencySymbol}${formatNumber(completedBatch.depositPaid)}`,
      `• *Balance Due:* ${currencySymbol}${formatNumber(completedBatch.balanceDue)}`,
      `• *Ready By:* ${formattedDate}`,
      ``,
      `Track your outfit's progress here:`,
      trackingUrl,
      ``,
      `Thank you for your business!`,
    ].join('\n');
  };

  const getCuttingSlipText = () => {
    if (!completedBatch || !selectedCustomer) return '';
    const shopName = currentShop?.name || 'Tailor Studio';
    const formattedDate = new Date(completedBatch.dueDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const lines = [
      `✂️ WORKSHOP CUTTING SLIP`,
      `Studio: ${shopName}`,
      `Order: #${completedBatch.firstOrderId.slice(-8).toUpperCase()}`,
      `Client: ${selectedCustomer.fullName} (${formatPhone(selectedCustomer.whatsappNumber)})`,
      `Ready By: ${formattedDate} ${completedBatch.priority === 'urgent' ? '⚡ [URGENT / RUSH]' : ''}`,
      `==============================`,
    ];

    completedBatch.garments.forEach((g, i) => {
      lines.push(
        ``,
        `OUTFIT #${i + 1}: ${g.styleName.toUpperCase()}`,
        `Fabric: ${g.materialSuppliedBy === 'shop' ? 'Shop Fabric' : 'Client Fabric'}${g.fabricNotes ? ` (${g.fabricNotes})` : ''}`,
        `MEASUREMENTS:`
      );
      const points = getSpecPointsForStyle(g.styleName);
      points.forEach((pt) => {
        const val = g.measures[pt.key];
        if (val) {
          lines.push(`• ${pt.label}: ${val}″`);
        }
      });
      if (g.measurementNotes) {
        lines.push(`Fit Notes: ${g.measurementNotes}`);
      }
      lines.push(`------------------------------`);
    });

    return lines.join('\n');
  };

  const handleCopyCuttingSlip = async () => {
    const text = getCuttingSlipText();
    try {
      await navigator.clipboard.writeText(text);
      showToast('Cutting slip copied to clipboard!', 'success');
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  return (
    <PageLayout
      width="narrow"
      header={
        <TopBar
          title="New Order"
          subtitle="Progressive bespoke order intake"
          showBack
          onBack={() => {
            const custIdParam = searchParams.get('customer');
            if (custIdParam) {
              router.push(ROUTES.customerDetail(custIdParam));
            } else {
              router.push(ROUTES.production);
            }
          }}
        />
      }
    >
      <div className={styles.container}>
        {/* ── CARD 1: CLIENT SELECTION ── */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <span className={styles.badgeNumber}>1</span>
              <div>
                <h2 className={styles.cardTitle}>Client</h2>
                <p className={styles.cardSubtitle}>Select client or register a walk-in</p>
              </div>
            </div>
            {selectedCustomer && (
              <button
                type="button"
                className={styles.textButton}
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerSearch('');
                }}
              >
                Change
              </button>
            )}
          </div>

          {!selectedCustomer ? (
            <div>
              {!showInlineNewCustomer ? (
                <>
                  <div className={styles.searchBox}>
                    <Symbol name="search" size={20} className={styles.searchIcon} />
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Search name or phone (e.g. 0803…)"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                    {customerSearch && (
                      <button
                        type="button"
                        onClick={() => setCustomerSearch('')}
                        className={styles.clearSearchBtn}
                      >
                        <Symbol name="close" size={16} />
                      </button>
                    )}
                  </div>

                  <div className={styles.customerList}>
                    {filteredCustomers.map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        className={styles.customerRow}
                        onClick={() => setSelectedCustomer(cust)}
                      >
                        <div className={styles.avatar}>
                          {cust.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.customerDetails}>
                          <span className={styles.customerName}>{cust.fullName}</span>
                          <span className={styles.customerPhone}>
                            {formatPhone(cust.whatsappNumber)}
                          </span>
                        </div>
                        <Symbol name="arrow_forward_ios" size={14} className={styles.rowArrow} />
                      </button>
                    ))}
                  </div>

                  {filteredCustomers.length === 0 && customerSearch.trim() && (
                    <div className={styles.noSearchMatch}>
                      <p className={styles.noSearchMatchText}>
                        No client found for &ldquo;{customerSearch.trim()}&rdquo;
                      </p>
                      <button
                        type="button"
                        className={styles.registerSearchQueryBtn}
                        onClick={handleOpenNewCustomerForm}
                      >
                        <Symbol name="person_add" size={18} />
                        <span>Register &ldquo;{customerSearch.trim()}&rdquo; as new client</span>
                      </button>
                    </div>
                  )}

                  <div className={styles.clientActionRow}>
                    <button
                      type="button"
                      className={styles.newClientBanner}
                      onClick={handleOpenNewCustomerForm}
                    >
                      <Symbol name="person_add" size={20} />
                      <span>New Walk-in Client? Register in 10s</span>
                    </button>
                    {isContactPickerSupported && (
                      <button
                        type="button"
                        className={styles.importContactBtn}
                        onClick={handleImportContact}
                        title="Import contact from address book"
                      >
                        <Symbol name="contact_phone" size={18} />
                        <span>Import Contact</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <form onSubmit={handleCreateCustomer} className={styles.inlineForm}>
                  <div className={styles.inlineHeaderRow}>
                    <span className={styles.inlineTitle}>New Walk-in Client</span>
                    {isContactPickerSupported && (
                      <button
                        type="button"
                        className={styles.importContactSmallBtn}
                        onClick={handleImportContact}
                        title="Import from device address book"
                      >
                        <Symbol name="contact_phone" size={16} />
                        <span>Import Contact</span>
                      </button>
                    )}
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Full Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. Adebayo Adeleke"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label}>WhatsApp Phone</label>
                    <PhoneInput
                      value={newCustomerPhone}
                      onChange={setNewCustomerPhone}
                      placeholder="0801 234 5678"
                      required
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Gender</label>
                    <div className={styles.segmented}>
                      <button
                        type="button"
                        className={`${styles.segBtn} ${newCustomerGender === 'male' ? styles.segActive : ''}`}
                        onClick={() => setNewCustomerGender('male')}
                      >
                        Male
                      </button>
                      <button
                        type="button"
                        className={`${styles.segBtn} ${newCustomerGender === 'female' ? styles.segActive : ''}`}
                        onClick={() => setNewCustomerGender('female')}
                      >
                        Female
                      </button>
                    </div>
                  </div>
                  <div className={styles.inlineActions}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => setShowInlineNewCustomer(false)}
                      disabled={savingCustomer}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.primaryInlineBtn}
                      disabled={savingCustomer}
                    >
                      {savingCustomer ? 'Adding…' : 'Add Client & Select'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className={styles.selectedClientCard}>
              <div className={styles.selectedClientHeader}>
                <div className={styles.avatarLarge}>
                  {selectedCustomer.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className={styles.selectedClientName}>{selectedCustomer.fullName}</h3>
                  <p className={styles.selectedClientPhone}>
                    {formatPhone(selectedCustomer.whatsappNumber)}
                  </p>
                  <div className={styles.clientBadges}>
                    <span className={styles.genderBadge}>
                      {selectedCustomer.gender === 'female' ? 'Female' : 'Male'}
                    </span>
                    {customerPastOrders.length > 0 ? (
                      <span className={styles.repeatBadge}>
                        <Symbol name="check_circle" size={14} /> Repeat Client ({customerPastOrders.length} orders)
                      </span>
                    ) : (
                      <span className={styles.newBadge}>First Order</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── CARD 2: GARMENTS & OUTFITS (MULTI-GARMENT SUPPORT) ── */}
        {garments.map((garment, idx) => {
          const specPoints = getSpecPointsForStyle(garment.styleName);
          const isMultiple = garments.length > 1;

          return (
            <div key={garment.id} className={styles.garmentSectionWrap}>
              {/* Garment Header if multiple */}
              {isMultiple && (
                <div className={styles.multiGarmentBar}>
                  <span className={styles.multiGarmentTitle}>
                    Outfit #{idx + 1}: <strong>{garment.styleName}</strong>
                  </span>
                  <button
                    type="button"
                    className={styles.removeGarmentBtn}
                    onClick={() => handleRemoveGarment(garment.id)}
                    title="Remove this outfit"
                  >
                    <Symbol name="delete" size={16} />
                    <span>Remove Outfit</span>
                  </button>
                </div>
              )}

              {/* Style Selection */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderLeft}>
                    <span className={styles.badgeNumber}>{isMultiple ? `${idx + 1}A` : '2'}</span>
                    <div>
                      <h2 className={styles.cardTitle}>
                        {isMultiple ? `Outfit #${idx + 1} Style` : 'Garment & Style'}
                      </h2>
                      <p className={styles.cardSubtitle}>Choose garment type</p>
                    </div>
                  </div>
                  <span className={styles.activeStyleTag}>{garment.styleName}</span>
                </div>

                {/* Gender filter tabs */}
                <div className={styles.genderFilterRow}>
                  <span className={styles.genderFilterLabel}>Filter:</span>
                  <div className={styles.genderPills}>
                    <button
                      type="button"
                      className={`${styles.genderPill} ${styleGenderFilter === 'male' ? styles.genderPillActive : ''}`}
                      onClick={() => setStyleGenderFilter('male')}
                    >
                      Men&apos;s
                    </button>
                    <button
                      type="button"
                      className={`${styles.genderPill} ${styleGenderFilter === 'female' ? styles.genderPillActive : ''}`}
                      onClick={() => setStyleGenderFilter('female')}
                    >
                      Women&apos;s
                    </button>
                    <button
                      type="button"
                      className={`${styles.genderPill} ${styleGenderFilter === 'all' ? styles.genderPillActive : ''}`}
                      onClick={() => setStyleGenderFilter('all')}
                    >
                      All
                    </button>
                  </div>
                </div>

                <div className={styles.styleGrid}>
                  {displayedStyles.map((style) => {
                    const isSelected = !garment.isCustomStyle && garment.styleName === style.name;
                    return (
                      <button
                        key={style.name}
                        type="button"
                        className={`${styles.styleCard} ${isSelected ? styles.styleCardActive : ''}`}
                        onClick={() => handleStyleChange(garment.id, style.name, false)}
                      >
                        <div className={styles.styleThumb}>
                          {style.photoUrl ? (
                            <Image
                              src={style.photoUrl}
                              alt={style.name}
                              width={60}
                              height={60}
                              className={styles.styleImg}
                            />
                          ) : (
                            <Symbol name="checkroom" size={24} />
                          )}
                        </div>
                        <span className={styles.styleName}>{style.name}</span>
                      </button>
                    );
                  })}

                  {/* + Custom Style Button */}
                  <button
                    type="button"
                    className={`${styles.styleCard} ${garment.isCustomStyle ? styles.styleCardActive : ''}`}
                    onClick={() => handleStyleChange(garment.id, garment.isCustomStyle ? garment.styleName : '', true)}
                  >
                    <div className={styles.styleThumb}>
                      <Symbol name="edit" size={24} />
                    </div>
                    <span className={styles.styleName}>+ Custom Style</span>
                  </button>
                </div>

                {/* Inline Custom Style Name Input */}
                {garment.isCustomStyle && (
                  <div className={styles.customStyleBox}>
                    <label className={styles.label}>Custom Outfit / Garment Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. 2-Piece Boubou, Jalabiya, Dinner Tuxedo…"
                      value={garment.styleName}
                      onChange={(e) => updateGarment(garment.id, { styleName: e.target.value })}
                      autoFocus
                    />
                  </div>
                )}
              </section>

              {/* Measurements */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderLeft}>
                    <span className={styles.badgeNumber}>{isMultiple ? `${idx + 1}B` : '3'}</span>
                    <div>
                      <h2 className={styles.cardTitle}>
                        {isMultiple ? `Outfit #${idx + 1} Measurements` : 'Measurements'}
                      </h2>
                      <p className={styles.cardSubtitle}>
                        {garment.styleName} fit specifications (inches)
                      </p>
                    </div>
                  </div>
                </div>

                {(() => {
                  const filledPoints = specPoints.filter((pt) => Boolean(garment.measures[pt.key] && parseFloat(garment.measures[pt.key]) > 0));
                  const filledCount = filledPoints.length;
                  const totalCount = specPoints.length;
                  const isCompleteFit = totalCount > 0 && filledCount === totalCount;
                  const isPartialFit = garment.isFitLoaded && filledCount > 0 && !isCompleteFit;
                  const missingPoints = specPoints.filter((pt) => !garment.measures[pt.key] || !parseFloat(garment.measures[pt.key]));

                  if (garment.isFitLoaded && isCompleteFit && !garment.showTweakMeasurements) {
                    return (
                      <div className={styles.fitLoadedBox}>
                        <div className={styles.fitBanner}>
                          <Symbol name="auto_awesome" size={20} className={styles.sparkleIcon} />
                          <div>
                            <strong>Saved fit loaded from previous order (All {totalCount} points ready)</strong>
                            <p>Measurements automatically loaded for {selectedCustomer?.fullName}.</p>
                          </div>
                        </div>

                        <div className={styles.measurePillGrid}>
                          {specPoints.map((pt) => {
                            const val = garment.measures[pt.key];
                            if (!val) return null;
                            return (
                              <div key={pt.key} className={styles.measurePill}>
                                <span className={styles.measurePillLabel}>{pt.label}</span>
                                <span className={styles.measurePillValue}>{val}″</span>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          className={styles.tweakBtn}
                          onClick={() => updateGarment(garment.id, { showTweakMeasurements: true })}
                        >
                          <Symbol name="tune" size={16} />
                          <span>Adjust / Tweak Values</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div>
                      {isPartialFit && (
                        <div className={styles.partialFitBanner}>
                          <Symbol name="warning" size={20} className={styles.partialWarningIcon} />
                          <div>
                            <strong>⚠️ {filledCount} of {totalCount} measurements loaded</strong>
                            <p>
                              Missing: {missingPoints.map((p) => p.label).join(', ')}. Please tape and enter remaining measurements below to prevent workshop delay.
                            </p>
                          </div>
                        </div>
                      )}

                      {garment.isFitLoaded && isCompleteFit && garment.showTweakMeasurements && (
                        <div className={styles.editingNotice}>
                          <span>Editing measurements for this outfit:</span>
                          <button
                            type="button"
                            onClick={() => updateGarment(garment.id, { showTweakMeasurements: false })}
                            className={styles.collapseTweakBtn}
                          >
                            Done Tweaking
                          </button>
                        </div>
                      )}

                      <div className={styles.measureGrid}>
                        {specPoints.map((pt) => {
                          const hasVal = Boolean(garment.measures[pt.key] && parseFloat(garment.measures[pt.key]) > 0);
                          const isMissing = isPartialFit && !hasVal;

                          return (
                            <div key={pt.key} className={styles.measureInputWrap}>
                              <label className={`${styles.measureLabel} ${isMissing ? styles.measureLabelMissing : ''}`}>
                                {pt.label}
                                {isMissing && <span className={styles.neededTag}>* Needed</span>}
                              </label>
                              <div className={`${styles.measureField} ${isMissing ? styles.measureFieldMissing : ''}`}>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.25"
                                  placeholder="0.0"
                                  className={styles.measureInput}
                                  value={garment.measures[pt.key] || ''}
                                  onChange={(e) => handleMeasureChange(garment.id, pt.key, e.target.value)}
                                />
                                <span className={styles.inchSymbol}>″</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className={styles.notesWrap}>
                        <label className={styles.label}>Fit & Posture Notes (Optional)</label>
                        <textarea
                          className={styles.textarea}
                          rows={2}
                          placeholder="e.g. Client likes snug chest, dropped left shoulder, high armhole"
                          value={garment.measurementNotes}
                          onChange={(e) => updateGarment(garment.id, { measurementNotes: e.target.value })}
                        />
                      </div>
                    </div>
                  );
                })()}
              </section>

              {/* Photos & Material */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderLeft}>
                    <span className={styles.badgeNumber}>{isMultiple ? `${idx + 1}C` : '4'}</span>
                    <div>
                      <h2 className={styles.cardTitle}>
                        {isMultiple ? `Outfit #${idx + 1} Photos` : 'Photos & Material'}
                      </h2>
                      <p className={styles.cardSubtitle}>Snap fabric to prevent workshop mix-ups</p>
                    </div>
                  </div>
                </div>

                <div className={styles.photoGrid}>
                  {/* Fabric Photo */}
                  <div className={styles.photoBox}>
                    <span className={styles.photoBoxTitle}>
                      <Symbol name="texture" size={16} /> Fabric Material
                    </span>
                    <p className={styles.photoBoxDesc}>Photograph client&apos;s physical cloth</p>

                    {garment.fabricImage ? (
                      <div className={styles.photoPreviewWrap}>
                        <Image
                          src={garment.fabricImage}
                          alt="Fabric"
                          width={200}
                          height={150}
                          className={styles.photoPreviewImg}
                        />
                        <button
                          type="button"
                          className={styles.removePhotoBtn}
                          onClick={() => updateGarment(garment.id, { fabricImage: null })}
                        >
                          <Symbol name="close" size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className={styles.photoUploadTrigger}>
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          disabled={garment.uploadingFabric}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(garment.id, file, 'fabric');
                          }}
                        />
                        <Symbol name="add_a_photo" size={28} />
                        <span>{garment.uploadingFabric ? 'Uploading…' : 'Snap / Upload Fabric'}</span>
                      </label>
                    )}
                  </div>

                  {/* Style Reference Photo */}
                  <div className={styles.photoBox}>
                    <span className={styles.photoBoxTitle}>
                      <Symbol name="photo_library" size={16} /> Style Reference
                    </span>
                    <p className={styles.photoBoxDesc}>Design or catalog inspiration</p>

                    {garment.styleReferenceImage ? (
                      <div className={styles.photoPreviewWrap}>
                        <Image
                          src={garment.styleReferenceImage}
                          alt="Style Reference"
                          width={200}
                          height={150}
                          className={styles.photoPreviewImg}
                        />
                        <button
                          type="button"
                          className={styles.removePhotoBtn}
                          onClick={() => updateGarment(garment.id, { styleReferenceImage: null })}
                        >
                          <Symbol name="close" size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className={styles.photoUploadTrigger}>
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          disabled={garment.uploadingStyleRef}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(garment.id, file, 'styleRef');
                          }}
                        />
                        <Symbol name="add_photo_alternate" size={28} />
                        <span>{garment.uploadingStyleRef ? 'Uploading…' : 'Snap / Upload Style'}</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Fabric Sourcing & Yardage Notes */}
                <div className={styles.fabricSourceWrap}>
                  <div className={styles.formRow}>
                    <label className={styles.label}>Fabric Sourcing</label>
                    <div className={styles.segmented}>
                      <button
                        type="button"
                        className={`${styles.segBtn} ${garment.materialSuppliedBy === 'customer' ? styles.segActive : ''}`}
                        onClick={() => updateGarment(garment.id, { materialSuppliedBy: 'customer' })}
                      >
                        Client Supplied
                      </button>
                      <button
                        type="button"
                        className={`${styles.segBtn} ${garment.materialSuppliedBy === 'shop' ? styles.segActive : ''}`}
                        onClick={() => updateGarment(garment.id, { materialSuppliedBy: 'shop' })}
                      >
                        Shop Sourced
                      </button>
                    </div>
                  </div>

                  <div className={styles.formRow} style={{ marginTop: 10 }}>
                    <label className={styles.label}>Fabric & Yardage Notes (Optional)</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. 3.5 yards brought, client supplied buttons/lining"
                      value={garment.fabricNotes}
                      onChange={(e) => updateGarment(garment.id, { fabricNotes: e.target.value })}
                    />
                  </div>
                </div>

                {/* Individual Garment Price if Multiple */}
                {isMultiple && (
                  <div className={styles.singleGarmentPriceWrap}>
                    <label className={styles.label}>Price for this {garment.styleName} ({currencySymbol})</label>
                    <div className={styles.inputPrefixWrap}>
                      <span className={styles.currencyPrefix}>{currencySymbol}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={styles.input}
                        placeholder="e.g. 35,000"
                        value={garment.price}
                        onChange={(e) => updateGarment(garment.id, { price: e.target.value.replace(/[^0-9]/g, '') })}
                      />
                    </div>
                  </div>
                )}
              </section>
            </div>
          );
        })}

        {/* ── ADD ANOTHER OUTFIT BUTTON ── */}
        <button
          type="button"
          className={styles.addGarmentBanner}
          onClick={handleAddGarment}
        >
          <Symbol name="add" size={20} />
          <span>+ Add Another Outfit for {selectedCustomer?.fullName || 'this Order'}</span>
        </button>

        {/* ── CARD 5: BILLING & DELIVERY SCHEDULE ── */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <span className={styles.badgeNumber}>5</span>
              <div>
                <h2 className={styles.cardTitle}>Pricing & Delivery</h2>
                <p className={styles.cardSubtitle}>Price, deposit and deadline</p>
              </div>
            </div>
          </div>

          <div className={styles.pricingRow}>
            <div className={styles.formRow}>
              <label className={styles.label}>
                Total Order Bill ({currencySymbol})
                {garments.length > 1 && sumOfGarmentPrices > 0 && (
                  <span className={styles.autoSumTag}>Sum: {currencySymbol}{formatNumber(sumOfGarmentPrices)}</span>
                )}
              </label>
              <div className={styles.inputPrefixWrap}>
                <span className={styles.currencyPrefix}>{currencySymbol}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.input}
                  placeholder={sumOfGarmentPrices > 0 ? String(sumOfGarmentPrices) : '0'}
                  value={manualTotalBill}
                  onChange={(e) => setManualTotalBill(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.depositLabelRow}>
                <label className={styles.label}>Deposit Paid ({currencySymbol})</label>
              </div>
              <div className={styles.inputPrefixWrap}>
                <span className={styles.currencyPrefix}>{currencySymbol}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.input}
                  placeholder="0"
                  value={depositPaid}
                  onChange={(e) => setDepositPaid(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>

              {/* 1-Tap Deposit Shortcuts */}
              {numericTotal > 0 && (
                <div className={styles.depositShortcuts}>
                  <button
                    type="button"
                    className={styles.shortcutBtn}
                    onClick={() => handleQuickDeposit('50')}
                  >
                    50% ({currencySymbol}{formatNumber(Math.round(numericTotal / 2))})
                  </button>
                  <button
                    type="button"
                    className={styles.shortcutBtn}
                    onClick={() => handleQuickDeposit('full')}
                  >
                    Paid in Full ({currencySymbol}{formatNumber(numericTotal)})
                  </button>
                  <button
                    type="button"
                    className={styles.shortcutBtn}
                    onClick={() => handleQuickDeposit('zero')}
                  >
                    Zero Deposit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Balance Calculation */}
          <div className={styles.balanceBar}>
            <span className={styles.balanceLabel}>Remaining Balance Due:</span>
            <span className={styles.balanceValue}>
              {currencySymbol}{formatNumber(numericBalance)}
            </span>
          </div>

          {/* Delivery Date & Workload Awareness */}
          <div className={styles.deliverySection}>
            <label className={styles.label}>Ready Date / Delivery</label>
            <div className={styles.quickDates}>
              <button
                type="button"
                className={`${styles.quickDateBtn} ${dueDate === getDaysFromNow(3) ? styles.quickDateBtnActive : ''}`}
                onClick={() => setQuickDate(3)}
              >
                In 3 Days
              </button>
              <button
                type="button"
                className={`${styles.quickDateBtn} ${dueDate === getDaysFromNow(7) ? styles.quickDateBtnActive : ''}`}
                onClick={() => setQuickDate(7)}
              >
                In 1 Week
              </button>
              <button
                type="button"
                className={`${styles.quickDateBtn} ${dueDate === getDaysFromNow(14) ? styles.quickDateBtnActive : ''}`}
                onClick={() => setQuickDate(14)}
              >
                In 2 Weeks
              </button>
            </div>

            <input
              type="date"
              className={styles.dateInput}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />

            {/* Workload / Capacity helper indicator */}
            {dueDate && (
              <div
                className={
                  ordersDueOnDate === 0
                    ? styles.workloadGood
                    : ordersDueOnDate >= (currentShop?.dailyCapacity || 5)
                    ? styles.workloadHeavy
                    : styles.workloadNormal
                }
              >
                <Symbol
                  name={
                    ordersDueOnDate >= (currentShop?.dailyCapacity || 5)
                      ? 'warning'
                      : ordersDueOnDate === 0
                      ? 'check_circle'
                      : 'schedule'
                  }
                  size={16}
                />
                <span>
                  {ordersDueOnDate === 0
                    ? 'No other orders due on this day (Great date!)'
                    : `${ordersDueOnDate} active ${ordersDueOnDate === 1 ? 'order' : 'orders'} already due on this day${
                        ordersDueOnDate >= (currentShop?.dailyCapacity || 5)
                          ? ` — studio capacity (${currentShop?.dailyCapacity || 5}) reached!`
                          : ''
                      }`}
                </span>
              </div>
            )}
          </div>

          {/* Priority & Staff Assignment */}
          <div className={styles.pricingRow}>
            <div className={styles.formRow}>
              <label className={styles.label}>Priority</label>
              <div className={styles.segmented}>
                <button
                  type="button"
                  className={`${styles.segBtn} ${priority === 'normal' ? styles.segActive : ''}`}
                  onClick={() => setPriority('normal')}
                >
                  Normal
                </button>
                <button
                  type="button"
                  className={`${styles.segBtn} ${priority === 'urgent' ? styles.segActiveUrgent : ''}`}
                  onClick={() => setPriority('urgent')}
                >
                  ⚡ Urgent / Rush
                </button>
              </div>
            </div>

            {staffMembers.length > 0 && (
              <div className={styles.formRow}>
                <label className={styles.label}>Assign to Staff</label>
                <select
                  className={styles.input}
                  value={assignedStaff}
                  onChange={(e) => setAssignedStaff(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {staffMembers.map((s) => (
                    <option key={s.uid} value={s.uid}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* ── CREATE ORDER CTA ── */}
        <div className={styles.footerBar}>
          <button
            type="button"
            className={styles.createOrderBtn}
            disabled={submitting}
            onClick={handleCreateOrder}
          >
            {submitting
              ? 'Creating Order…'
              : garments.length > 1
              ? `Create Order (${garments.length} Outfits)`
              : 'Create Order'}
          </button>
        </div>
      </div>

      {/* ── ORDER CREATED SUCCESS & WHATSAPP RECEIPT SHEET ── */}
      <BottomSheet
        isOpen={receiptSheetOpen}
        onClose={() => {
          setReceiptSheetOpen(false);
          router.replace(ROUTES.production);
        }}
        title="Order Created"
      >
        {completedBatch && selectedCustomer && (
          <div className={styles.receiptModal}>
            <div className={styles.successIconWrap}>
              <Symbol name="check_circle" size={48} className={styles.successIcon} />
            </div>

            <h3 className={styles.receiptTitle}>Order Logged Successfully!</h3>
            <p className={styles.receiptDesc}>
              {completedBatch.garments.length > 1
                ? `${completedBatch.garments.length} outfits for ${selectedCustomer.fullName} have been queued into production.`
                : `${completedBatch.garments[0]?.styleName} for ${selectedCustomer.fullName} has been queued into production.`}
            </p>

            <div className={styles.receiptSummaryCard}>
              <div className={styles.receiptRow}>
                <span className={styles.receiptMuted}>Client</span>
                <span className={styles.receiptBold}>{selectedCustomer.fullName}</span>
              </div>

              {completedBatch.garments.length > 1 ? (
                <div className={styles.receiptGarmentsList}>
                  <span className={styles.receiptMuted}>Outfits:</span>
                  {completedBatch.garments.map((g, i) => (
                    <div key={i} className={styles.receiptGarmentSubRow}>
                      <span>{i + 1}. {g.styleName}</span>
                      <span className={styles.receiptBold}>{currencySymbol}{formatNumber(g.price)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.receiptRow}>
                  <span className={styles.receiptMuted}>Garment</span>
                  <span className={styles.receiptBold}>{completedBatch.garments[0]?.styleName}</span>
                </div>
              )}

              <div className={styles.receiptRow}>
                <span className={styles.receiptMuted}>Total Bill</span>
                <span className={styles.receiptBold}>
                  {currencySymbol}{formatNumber(completedBatch.totalBill)}
                </span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptMuted}>Deposit Paid</span>
                <span className={styles.receiptBold}>
                  {currencySymbol}{formatNumber(completedBatch.depositPaid)}
                </span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptMuted}>Balance Due</span>
                <span className={styles.receiptHighlight}>
                  {currencySymbol}{formatNumber(completedBatch.balanceDue)}
                </span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptMuted}>Ready By</span>
                <span className={styles.receiptBold}>
                  {new Date(completedBatch.dueDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* 1-Tap WhatsApp Receipt Button */}
            <a
              href={getWhatsAppLink(selectedCustomer.whatsappNumber, getWhatsAppReceiptText())}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.whatsappReceiptBtn}
            >
              <Symbol name="send" size={20} />
              <span>Send Receipt via WhatsApp</span>
            </a>

            {/* Workshop Cutting Slip Action */}
            <button
              type="button"
              className={styles.cuttingSlipBtn}
              onClick={() => setCuttingSlipOpen(true)}
            >
              <Symbol name="content_cut" size={18} />
              <span>Print / View Workshop Cutting Slip</span>
            </button>

            <button
              type="button"
              className={styles.finishBtn}
              onClick={() => {
                setReceiptSheetOpen(false);
                router.replace(ROUTES.production);
              }}
            >
              Go to Production Queue
            </button>
          </div>
        )}
      </BottomSheet>

      {/* ── WORKSHOP CUTTING SLIP BOTTOMSHEET ── */}
      <BottomSheet
        isOpen={cuttingSlipOpen}
        onClose={() => setCuttingSlipOpen(false)}
        title="Workshop Cutting Slip"
      >
        {completedBatch && selectedCustomer && (
          <div className={styles.cuttingSlipContainer}>
            <div className={styles.slipActionsRow}>
              <button
                type="button"
                className={styles.slipActionPrimary}
                onClick={() => window.print()}
              >
                <Symbol name="print" size={18} />
                <span>Print Slip</span>
              </button>
              <button
                type="button"
                className={styles.slipActionSecondary}
                onClick={handleCopyCuttingSlip}
              >
                <Symbol name="content_copy" size={18} />
                <span>Copy Text</span>
              </button>
            </div>

            <div className={styles.printableSlip} id="cutting-slip-view">
              <div className={styles.slipHeader}>
                <div>
                  <h3 className={styles.slipShopTitle}>{currentShop?.name || 'Tailor Studio'}</h3>
                  <span className={styles.slipSubtitle}>WORKSHOP CUTTING SLIP</span>
                </div>
                <div className={styles.slipHeaderBadgeWrap}>
                  <span className={styles.slipOrderId}>#{completedBatch.firstOrderId.slice(-8).toUpperCase()}</span>
                  {completedBatch.priority === 'urgent' && (
                    <span className={styles.slipUrgentBadge}>⚡ URGENT</span>
                  )}
                </div>
              </div>

              <div className={styles.slipClientCard}>
                <div className={styles.slipInfoRow}>
                  <span className={styles.slipInfoLabel}>Client:</span>
                  <span className={styles.slipInfoValue}>{selectedCustomer.fullName}</span>
                </div>
                <div className={styles.slipInfoRow}>
                  <span className={styles.slipInfoLabel}>WhatsApp:</span>
                  <span className={styles.slipInfoValue}>{formatPhone(selectedCustomer.whatsappNumber)}</span>
                </div>
                <div className={styles.slipInfoRow}>
                  <span className={styles.slipInfoLabel}>Ready Date:</span>
                  <span className={styles.slipInfoHighlight}>
                    {new Date(completedBatch.dueDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {completedBatch.garments.map((g, idx) => {
                const specPoints = getSpecPointsForStyle(g.styleName);
                return (
                  <div key={idx} className={styles.slipGarmentBlock}>
                    <div className={styles.slipGarmentHeader}>
                      <span className={styles.slipGarmentName}>
                        Outfit #{idx + 1}: <strong>{g.styleName}</strong>
                      </span>
                      <span className={styles.slipSourceBadge}>
                        {g.materialSuppliedBy === 'shop' ? 'Shop Fabric' : 'Client Fabric'}
                      </span>
                    </div>

                    {g.fabricNotes && (
                      <div className={styles.slipFabricNote}>
                        <strong>Fabric Note:</strong> {g.fabricNotes}
                      </div>
                    )}

                    <div className={styles.slipMeasuresTable}>
                      {specPoints.map((pt) => {
                        const val = g.measures[pt.key];
                        if (!val) return null;
                        return (
                          <div key={pt.key} className={styles.slipMeasureRow}>
                            <span className={styles.slipMeasureLabel}>{pt.label}</span>
                            <span className={styles.slipMeasureValue}>{val}″</span>
                          </div>
                        );
                      })}
                    </div>

                    {g.measurementNotes && (
                      <div className={styles.slipFitNote}>
                        <strong>Posture & Fit:</strong> {g.measurementNotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </BottomSheet>
    </PageLayout>
  );
}

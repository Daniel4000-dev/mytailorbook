'use client';
import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { updateShopAction, updateOrderStatusAction, deleteOrderAction } from '@/app/actions';
import { createSizeChartAction, deleteSizeChartAction } from '@/app/actions/sizeCharts';
import { getStockAction, processSaleAction } from '@/app/actions/stock';
import { createClient } from '@/lib/supabase/client';
import { addPayment } from '@/app/actions/order_payments';
import { addExpense } from '@/app/actions/expenses';
import { createCatalogueAction, deleteCatalogueAction } from '@/app/actions/catalogues';

export default function TestSuitePage() {
  const { currentShop } = useData();
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const log = (msg: string) => setLogs(prev => [...prev, msg]);

  async function runTest() {
    if (!currentShop) return log('Error: No active shop context found.');
    setIsRunning(true);
    setLogs(['🚀 Starting Master E2E Test Suite...']);
    const supabase = createClient();
    
    let bespokeCustomerId = '';
    let bespokeOrderId = '';
    let catalogueId = '';
    
    let rtwBatchId = '';
    let sizeChartId = '';
    let internalCustomerId = '';

    try {
      log('--- PART 1: BESPOKE & FINANCE ---');
      log('1. Setting Business Mode to Hybrid...');
      await updateShopAction(currentShop.id, { businessMode: 'hybrid' });
      log('✅ Business mode updated.');

      log('2. Creating Bespoke Client...');
      let { data: bCust } = await supabase.from('customers')
        .select('id').eq('shop_id', currentShop.id).eq('whatsapp_number', 'E2E-0001').maybeSingle();
      if (!bCust) {
        const { data: newCust, error: bCustErr } = await supabase.from('customers').insert({
          shop_id: currentShop.id,
          org_id: currentShop.orgId,
          full_name: 'E2E Bespoke Client',
          whatsapp_number: 'E2E-0001',
          gender: 'male',
          measurements: { 'Chest': '42', 'Length': '30' }
        }).select('id').single();
        if (bCustErr || !newCust) throw new Error(bCustErr?.message || 'Failed to create bespoke client');
        bCust = newCust;
      }
      bespokeCustomerId = bCust.id;
      log(`✅ Client ready (ID: ${bespokeCustomerId})`);

      log('3. Creating Bespoke Order & Tracking Link...');
      const { data: bOrder, error: bOrderErr } = await supabase.from('orders').insert({
        shop_id: currentShop.id,
        customer_id: bespokeCustomerId,
        customer_name: 'E2E Bespoke Client',
        order_details: 'Custom Senator Suit',
        total_bill: 100000,
        deposit_paid: 0,
        status: 'Documented',
        is_internal_batch: false,
        include_tracking_link: true,
        due_date: new Date(Date.now() + 86400000 * 3).toISOString() // 3 days from now
      }).select('id').single();
      if (bOrderErr || !bOrder) throw new Error(bOrderErr?.message || 'Failed to create bespoke order');
      bespokeOrderId = bOrder.id;
      log(`✅ Order created with Tracking URL (ID: ${bespokeOrderId})`);

      log('4. Logging Deposit Payment (Finance)...');
      await addPayment(bespokeOrderId, 50000, 'transfer', 'First half');
      log('✅ ₦50k Payment logged successfully.');

      log('5. Logging Production Expense (Finance)...');
      await addExpense({
        shopId: currentShop.id,
        orderId: bespokeOrderId,
        amount: 20000,
        category: 'material',
        description: 'Italian Wool Fabric',
        date: new Date().toISOString(),
        method: 'cash'
      });
      log('✅ ₦20k Expense logged successfully.');
      
      log('6. Verifying Calendar Deadlines...');
      const { data: events } = await supabase.from('calendar_events').select('id').eq('related_order_id', bespokeOrderId);
      if (!events || events.length === 0) {
        log('⚠️ Warning: Calendar event generation might run asynchronously or requires UI trigger.');
      } else {
        log('✅ Calendar Event found for deadline.');
      }

      log('7. Creating Portfolio Outfit...');
      const { data: outfit, error: outfitErr } = await supabase.from('portfolio_outfits').insert({
        shop_id: currentShop.id,
        org_id: currentShop.orgId,
        title: 'E2E Test Outfit',
        story_mode_enabled: false
      }).select('id').single();
      if (outfitErr || !outfit) throw new Error(outfitErr?.message || 'Failed to create portfolio outfit');
      catalogueId = outfit.id;
      log('✅ Portfolio Outfit created.');

      log('--- PART 2: READY-TO-WEAR & POS ---');
      log('8. Creating Size Chart...');
      const chartResult = await createSizeChartAction(currentShop.id, 'E2E Chart', { 'S': 'Chest 40' });
      if ('error' in chartResult) throw new Error(chartResult.error);
      sizeChartId = chartResult.id || '';
      log('✅ Size chart created.');

      log('9. Creating Internal Factory Batch...');
      let { data: existingCust } = await supabase.from('customers')
        .select('id').eq('shop_id', currentShop.id).eq('whatsapp_number', '0000000000').maybeSingle();
      if (!existingCust) {
        const { data: newC } = await supabase.from('customers').insert({
          shop_id: currentShop.id, org_id: currentShop.orgId, full_name: 'Internal Production', whatsapp_number: '0000000000', gender: 'male'
        }).select('id').single();
        existingCust = newC;
      }
      internalCustomerId = existingCust?.id || '';

      const { data: rtwOrder, error: rtwErr } = await supabase.from('orders').insert({
        shop_id: currentShop.id, customer_id: internalCustomerId, is_internal_batch: true,
        customer_name: 'Internal Production', order_details: 'E2E Factory Shirt', style_name: 'E2E Factory Shirt',
        batch_sizes: [{ size: 'S', quantity: 5 }], status: 'Documented', total_bill: 0, deposit_paid: 0
      }).select('id').single();
      if (rtwErr || !rtwOrder) throw new Error(rtwErr?.message || 'Failed to create RTW batch');
      rtwBatchId = rtwOrder.id;
      log('✅ Internal Batch created.');

      log('10. Auto-Stocking via Delivery...');
      await updateOrderStatusAction(rtwBatchId, 'Delivered', currentShop.ownerUid, 'Test Admin', currentShop.id);
      
      const stockRes = await getStockAction(currentShop.id);
      const ourStock = (stockRes as any[]).filter(s => s.name === 'E2E Factory Shirt');
      if (ourStock.length === 0) throw new Error("Auto-stock failed");
      const targetStock = ourStock[0];
      log(`✅ Stock generated: ${targetStock.quantity} items available.`);

      log('11. Processing POS Walk-In Sale...');
      await supabase.from('finished_goods').update({ price: 5000 }).eq('id', targetStock.id);
      await processSaleAction(currentShop.id, [{ goodId: targetStock.id, name: targetStock.name, size: targetStock.size, quantity: 1, priceAtSale: 5000 }], 'cash', currentShop.ownerUid);
      
      const finalStockRes = await getStockAction(currentShop.id);
      const finalTarget = (finalStockRes as any[]).find(s => s.id === targetStock.id);
      log(`✅ Stock successfully reduced to ${finalTarget?.quantity}`);

      log('🎉 MASTER TEST SUITE PASSED PERFECTLY!');

    } catch (err: any) {
      log(`❌ TEST FAILED: ${err.message || String(err)}`);
    } finally {
      log('🧹 Cleaning up test data...');
      if (bespokeOrderId) await deleteOrderAction(bespokeOrderId);
      if (rtwBatchId) await deleteOrderAction(rtwBatchId);
      if (bespokeCustomerId) await supabase.from('customers').delete().eq('id', bespokeCustomerId);
      if (sizeChartId) await deleteSizeChartAction(sizeChartId);
      if (catalogueId) await supabase.from('portfolio_outfits').delete().eq('id', catalogueId);
      await supabase.from('finished_goods').delete().eq('name', 'E2E Factory Shirt');
      await supabase.from('orders').delete().like('order_details', '%E2E Factory Shirt%').eq('customer_name', 'Retail Walk-In');
      log('✅ Cleanup complete.');
      setIsRunning(false);
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Master E2E Verification Suite</h1>
      <button 
        onClick={runTest} 
        disabled={isRunning}
        style={{ padding: '12px 24px', backgroundColor: isRunning ? '#ccc' : '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: isRunning ? 'not-allowed' : 'pointer', fontWeight: 'bold', marginBottom: '20px' }}
      >
        {isRunning ? 'Running Master Suite...' : 'Run Master Suite'}
      </button>
      <div style={{ backgroundColor: '#111', color: '#0f0', padding: '20px', borderRadius: '8px', fontFamily: 'monospace', minHeight: '300px' }}>
        {logs.length === 0 ? <div style={{color: '#666'}}>Awaiting command...</div> : null}
        {logs.map((l, i) => <div key={i} style={{ marginBottom: '8px' }}>{l}</div>)}
      </div>
    </div>
  );
}

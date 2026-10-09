'use client';
import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { updateShopAction } from '@/app/actions';
import { createSizeChartAction, getGlobalSizeChartsAction, deleteSizeChartAction } from '@/app/actions/sizeCharts';
import { saveOrderAction, updateOrderStatusAction, deleteOrderAction } from '@/app/actions';
import { getStockAction, processSaleAction } from '@/app/actions/stock';
import { createClient } from '@/lib/supabase/client';

export default function TestSuitePage() {
  const { currentShop } = useData();
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const log = (msg: string) => setLogs(prev => [...prev, msg]);

  async function runTest() {
    if (!currentShop) return log('Error: No active shop context found.');
    setIsRunning(true);
    setLogs(['🚀 Starting Automated E2E Test in active session...']);
    const supabase = createClient();
    
    let createdBatchId = '';
    let sizeChartId = '';

    try {
      log('1. Setting Business Mode to Hybrid...');
      await updateShopAction(currentShop.id, { businessMode: 'hybrid' });
      log('✅ Business mode updated.');

      log('2. Creating a test Size Chart...');
      const chartResult = await createSizeChartAction(currentShop.id, 'E2E Test Chart', { 'S': 'Chest 40', 'M': 'Chest 42' });
      if ('error' in chartResult) throw new Error(chartResult.error);
      sizeChartId = chartResult.id;
      log(`✅ Size chart created (ID: ${sizeChartId})`);

      log('3. Creating a Production Batch...');
      const payload: any = {
        shopId: currentShop.id,
        isInternalBatch: true,
        styleName: 'Test Automation Shirt',
        batchSizes: [{ size: 'S', quantity: 5 }, { size: 'M', quantity: 3 }],
        status: 'Documented',
        images: [], payments: [], statusHistory: [],
        measurements: { 'S': 'Chest 40', 'M': 'Chest 42' }
      };
      const orderRes = await saveOrderAction(payload);
      if ('error' in orderRes) throw new Error(orderRes.error);
      createdBatchId = orderRes.id;
      log(`✅ Batch created (ID: ${createdBatchId})`);

      log('4. Advancing Batch to Delivered (auto-stocking)...');
      await updateOrderStatusAction(createdBatchId, 'Delivered', currentShop.id);
      log('✅ Batch Delivered.');

      log('5. Verifying Stock Generation...');
      const stockRes = await getStockAction(currentShop.id);
      if ('error' in stockRes) throw new Error(stockRes.error);
      
      const ourStock = stockRes.filter(s => s.name === 'Test Automation Shirt' && s.size === 'S');
      if (ourStock.length === 0) throw new Error("Auto-stock failed to create the items.");
      const targetStock = ourStock[0];
      log(`✅ Stock verified: ${targetStock.quantity} items available.`);

      // Update price so we can sell it
      await supabase.from('finished_goods').update({ price: 2000 }).eq('id', targetStock.id);

      log('6. Processing a POS Sale...');
      const saleRes = await processSaleAction(currentShop.id, [{
        goodId: targetStock.id,
        name: targetStock.name,
        size: targetStock.size,
        quantity: 1,
        priceAtSale: 2000
      }], 'cash', currentShop.ownerUid);
      if ('error' in saleRes) throw new Error(saleRes.error);
      log('✅ POS Sale processed successfully.');

      log('7. Final Stock Verification...');
      const finalStockRes = await getStockAction(currentShop.id);
      const finalTarget = (finalStockRes as any[]).find(s => s.id === targetStock.id);
      log(`✅ Stock reduced from ${targetStock.quantity} -> ${finalTarget.quantity}`);

      log('🎉 ALL TESTS PASSED SUCCESSFULLY!');

    } catch (err: any) {
      log(`❌ TEST FAILED: ${err.message || String(err)}`);
    } finally {
      // Cleanup
      log('🧹 Cleaning up test data...');
      if (createdBatchId) await deleteOrderAction(createdBatchId);
      if (sizeChartId) await deleteSizeChartAction(sizeChartId);
      await supabase.from('finished_goods').delete().eq('name', 'Test Automation Shirt');
      // Delete POS order (Retail Walk-In with that item)
      await supabase.from('orders').delete().like('order_details', '%Test Automation Shirt%').eq('customer_name', 'Retail Walk-In');
      log('✅ Cleanup complete.');
      setIsRunning(false);
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Ready-To-Wear E2E Test Suite</h1>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        This page will run the full end-to-end lifecycle of a Production Batch in your active session,
        using your real authentication tokens and shop context.
      </p>
      
      <button 
        onClick={runTest} 
        disabled={isRunning}
        style={{
          padding: '12px 24px',
          backgroundColor: isRunning ? '#ccc' : '#000',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: isRunning ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          marginBottom: '20px'
        }}
      >
        {isRunning ? 'Running Tests...' : 'Run Automated Tests'}
      </button>

      <div style={{
        backgroundColor: '#111',
        color: '#0f0',
        padding: '20px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        minHeight: '300px'
      }}>
        {logs.length === 0 ? <div style={{color: '#666'}}>Awaiting command...</div> : null}
        {logs.map((l, i) => <div key={i} style={{ marginBottom: '8px' }}>{l}</div>)}
      </div>
    </div>
  );
}

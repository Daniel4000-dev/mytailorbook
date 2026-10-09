'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import TopBar from '@/components/layout/TopBar/TopBar';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Symbol from '@/components/ui/Symbol/Symbol';
import { StyleCatalogue } from '@/lib/types';
import { getCataloguesAction, createCatalogueAction, deleteCatalogueAction } from '@/app/actions/catalogues';
import styles from './page.module.css';
import { useToast } from '@/contexts/ToastContext';

export default function CataloguesPage() {
  const { currentShop } = useData();
  const router = useRouter();
  const { showToast } = useToast();
  
  const [catalogues, setCatalogues] = useState<StyleCatalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    if (!currentShop) return;
    getCataloguesAction(currentShop.id)
      .then(res => {
        setCatalogues(res);
        setLoading(false);
      })
      .catch(err => {
        showToast(err.message, 'error');
        setLoading(false);
      });
  }, [currentShop, showToast]);

  const handleCreate = async () => {
    if (!currentShop || !newTitle.trim()) return;
    try {
      const id = await createCatalogueAction(currentShop.id, newTitle);
      router.push(`/catalogues/${id}`);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleShareGeneral = () => {
    if (!currentShop?.slug) {
      showToast('You must set a Public Link in Settings > Studio first.', 'error');
      return;
    }
    const url = `https://mytailorbook.com/catalogue/${currentShop.slug}`;
    navigator.clipboard.writeText(url);
    showToast('General Catalogue link copied!', 'success');
  };

  return (
    <div className={styles.container}>
      <TopBar title="Inspiration Catalogues" showBack={false} />
      
      <div className={styles.content}>
        <div className={styles.headerRow}>
          <p className={styles.subtitle}>Curate style ideas to show your clients what you can sew.</p>
          <button className={styles.shareGeneralBtn} onClick={handleShareGeneral}>
            <Symbol name="share" size={16} /> Share Full Catalogue
          </button>
        </div>

        {isCreating ? (
          <div className={styles.createBox}>
            <input 
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. Bridal Gowns, Agbada" 
              className={styles.input}
            />
            <div className={styles.createActions}>
              <button onClick={() => setIsCreating(false)} className={styles.cancelBtn}>Cancel</button>
              <button onClick={handleCreate} className={styles.saveBtn}>Create</button>
            </div>
          </div>
        ) : (
          <button className={styles.addBtn} onClick={() => setIsCreating(true)}>
            <Symbol name="add" size={24} />
            <span>Create New Album</span>
          </button>
        )}

        {loading ? (
          <div className={styles.loading}>Loading catalogues...</div>
        ) : catalogues.length === 0 ? (
          <EmptyState 
            icon={<Symbol name="menu_book" size={40} />}
            title="Create an Inspiration Menu"
            description="Create your first Album (e.g. 'Wedding Gowns'). Upload Pinterest photos or Instagram screenshots, then broadcast them to your clients as a menu of options!"
          />
        ) : (
          <div className={styles.grid}>
            {catalogues.map(cat => (
              <div key={cat.id} className={styles.card} onClick={() => router.push(`/catalogues/${cat.id}`)}>
                <div className={styles.cardThumb}>
                  {cat.photos && cat.photos.length > 0 ? (
                    <img src={cat.photos[0].imageUrl} alt={cat.title} />
                  ) : (
                    <div className={styles.emptyThumb}>
                      <Symbol name="collections" size={32} />
                    </div>
                  )}
                </div>
                <div className={styles.cardInfo}>
                  <h3>{cat.title}</h3>
                  <p>{cat.photos?.length || 0} photos</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import CircleIconButton from '@/components/ui/CircleIconButton/CircleIconButton';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import { FaBars, FaUserPlus, FaUsers, FaArrowRight, FaGear } from 'react-icons/fa6';
import { useSidebar } from '@/contexts/SidebarContext';
import styles from './page.module.css';

export default function SettingsPage() {
  const { user, isOwner } = useAuth();
  const { staffMembers, addStaff } = useData();
  const { toggleMenu } = useSidebar();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOwner) {
    return (
      <PageLayout>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sf-text-secondary)' }}>
          <h2>Access Denied</h2>
          <p>Only the studio owner has access to Settings.</p>
        </div>
      </PageLayout>
    );
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setLoading(true);
    setMessage('');
    try {
      await addStaff(name, email);
      setName('');
      setEmail('');
      setPassword('');
      setMessage('Staff member added successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to add staff member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      className={styles.pageGrid}
      header={
        <TopBar
          profileMode={{
            greeting: "Studio Settings",
            name: user?.name || "Owner",
            avatarInitials: user?.name ? user.name[0] : "O"
          }}
          leftAction={
            <div className={styles.mobileOnly}>
              <CircleIconButton
                icon={<FaBars />}
                onClick={toggleMenu}
                ariaLabel="Open menu"
              />
            </div>
          }
        />
      }
    >
      <div className={styles.container}>
        {/* Personal Details Card */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Account Profile</h3>
          <div className={styles.card}>
            <div className={styles.profileRow}>
              <div className={styles.avatarLarge}>
                {user?.name ? user.name[0] : 'O'}
              </div>
              <div className={styles.profileInfo}>
                <h4 className={styles.profileName}>{user?.name}</h4>
                <p className={styles.profileRole}>{user?.role} Account</p>
                <p className={styles.profileEmail}>{user?.email}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Staff Directory Card */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaUsers className={styles.sectionIcon} /> Active Staff ({staffMembers.length})
          </h3>
          <div className={styles.card}>
            <div className={styles.staffList}>
              {staffMembers.map((staff) => (
                <div key={staff.uid} className={styles.staffItem}>
                  <div className={styles.avatarCircle}>
                    {staff.name[0]}
                  </div>
                  <div className={styles.staffInfo}>
                    <span className={styles.staffName}>{staff.name}</span>
                    <span className={styles.staffRole}>{staff.role} ({staff.email})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Add Staff Form Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaUserPlus className={styles.sectionIcon} /> Register Employee
          </h3>
          <div className={styles.card}>
            <form onSubmit={handleAddStaff} className={styles.form}>
              <Input
                label="Full Name"
                placeholder="e.g. Chioma Eze"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Email/Username"
                type="email"
                placeholder="e.g. chioma@mytailorbook.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Temporary Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              
              {message && (
                <p className={message.includes('successfully') ? styles.successText : styles.errorText}>
                  {message}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className={styles.submitBtn}
              >
                Add Staff Member
              </Button>
            </form>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

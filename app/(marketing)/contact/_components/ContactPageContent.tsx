'use client';

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import Symbol from '@/components/ui/Symbol/Symbol';
import Input from '@/components/ui/Input/Input';
import TextArea from '@/components/ui/TextArea/TextArea';
import Button from '@/components/ui/Button/Button';
import { useReveal } from '@/lib/marketingMotion';
import { APP_CONFIG } from '@/lib/config';
import styles from './ContactPageContent.module.css';

const SUPPORT_EMAIL = `support@${APP_CONFIG.domain}`;

export default function ContactPageContent() {
  const reveal = useReveal();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  // There's no transactional email service wired up yet, so the honest,
  // zero-infrastructure way to actually deliver this is to hand off to the
  // visitor's own mail client with everything pre-filled — guaranteed to
  // land in the real inbox rather than silently failing against an
  // unconfigured API. Once a real email service exists this can become a
  // proper server-side send without changing the form itself.
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const subject = `Message from ${name || 'the contact form'}`;
    const body = `${message}\n\n—\n${name}\n${email}`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <motion.div
          className={styles.heroInner}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className={styles.heroEyebrow}>Get in Touch</span>
          <h1 className={styles.heroHeadline}>We read every message.</h1>
          <p className={styles.heroSubhead}>
            Questions, feedback, or something not working right — tell us. This opens your email app with
            everything filled in, addressed straight to our support inbox.
          </p>
        </motion.div>
      </section>

      <motion.section className={styles.formSection} {...reveal()}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            label="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Your Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextArea
            label="Message"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <Button type="submit" fullWidth icon={<Symbol name="chat" size={18} />}>
            Send Message
          </Button>
          <p className={styles.directEmail}>
            Prefer email directly? Write to{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
        </form>
      </motion.section>
    </div>
  );
}

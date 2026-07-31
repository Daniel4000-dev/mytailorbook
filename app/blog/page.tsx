import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/blog';
import { APP_CONFIG } from '@/lib/config';
import Header from '@/components/marketing/Header/Header';
import Footer from '@/components/marketing/Footer/Footer';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: `Blog — ${APP_CONFIG.name}`,
  description: 'Business advice and resources for fashion designers and tailors.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/blog' },
};

export default function BlogIndex() {
  const posts = getAllBlogPosts();

  return (
    <>
      <Header />
      <main className={styles.page}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Resources</span>
          <h1 className={styles.title}>{APP_CONFIG.name} Blog</h1>
          <p className={styles.intro}>Practical advice to help you manage and grow your tailoring business.</p>
        </section>

        <div className={styles.content}>
          {posts.length === 0 ? (
            <p className={styles.empty}>Nothing published yet — check back soon.</p>
          ) : (
            <div className={styles.grid}>
              {posts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.postCard}>
                  <article>
                    <h2 className={styles.postTitle}>{post.title}</h2>
                    <p className={styles.postDate}>{post.date}</p>
                    <p className={styles.postExcerpt}>{post.excerpt}</p>
                    <span className={styles.readMore}>Read more &rarr;</span>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

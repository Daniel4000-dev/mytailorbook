import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllBlogPosts } from '@/lib/blog';
import { APP_CONFIG } from '@/lib/config';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: `Blog — ${APP_CONFIG.name}`,
  description: 'Business advice and resources for fashion designers and tailors.',
  robots: { index: true, follow: true },
};

export default function BlogIndex() {
  const posts = getAllBlogPosts();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/login" className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-mark.png" alt="" className={styles.logo} />
          <span>{APP_CONFIG.name.toUpperCase()}</span>
        </Link>
      </header>

      <div className={styles.content}>
        <h1 className={styles.title}>{APP_CONFIG.name} Blog</h1>
        <p className={styles.intro}>Resources to help you manage and grow your fashion business.</p>

        {posts.length === 0 ? (
          <p className={styles.empty}>Nothing published yet — check back soon.</p>
        ) : (
          <div className={styles.list}>
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.postLink}>
                <article className={styles.post}>
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
    </div>
  );
}

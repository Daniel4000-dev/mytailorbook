import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getAllBlogPosts } from '@/lib/blog';
import { APP_CONFIG } from '@/lib/config';
import { breadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import JsonLd from '@/components/seo/JsonLd';
import Header from '@/components/marketing/Header/Header';
import Footer from '@/components/marketing/Footer/Footer';
import { ROUTES } from '@/lib/routes';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: `Blog — ${APP_CONFIG.name}`,
  description: 'Business advice and resources for fashion designers and tailors.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/blog' },
};

export default function BlogIndex() {
  const posts = getAllBlogPosts();
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
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
                <Link key={post.slug} href={ROUTES.blogPost(post.slug)} className={styles.postCard}>
                  <article>
                    {post.coverImage && (
                      <div className={styles.thumbWrap}>
                        <Image
                          src={post.coverImage}
                          alt={post.coverImageAlt || post.title}
                          fill
                          sizes="(max-width: 600px) 100vw, 300px"
                          className={styles.thumb}
                        />
                      </div>
                    )}
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

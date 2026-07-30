import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getBlogPostBySlug, getBlogSlugs } from '@/lib/blog';
import { APP_CONFIG } from '@/lib/config';
import styles from './page.module.css';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return { title: 'Post Not Found' };
  }

  return {
    title: `${post.title} | ${APP_CONFIG.name} Blog`,
    description: post.excerpt,
    robots: { index: true, follow: true },
  };
}

export function generateStaticParams() {
  const slugs = getBlogSlugs();
  return slugs.map((slug) => ({ slug: slug.replace(/\.mdx$/, '') }));
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/login" className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-mark.png" alt="" className={styles.logo} />
          <span>{APP_CONFIG.name.toUpperCase()}</span>
        </Link>
      </header>

      <article className={styles.content}>
        <Link href="/blog" className={styles.back}>
          &larr; Back to Blog
        </Link>

        <h1 className={styles.title}>{post.title}</h1>
        <p className={styles.date}>{post.date}</p>

        <div className={styles.prose}>
          <MDXRemote source={post.content} />
        </div>
      </article>
    </div>
  );
}

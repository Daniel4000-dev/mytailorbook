import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getBlogPostBySlug, getBlogSlugs } from '@/lib/blog';
import { APP_CONFIG } from '@/lib/config';
import Header from '@/components/marketing/Header/Header';
import Footer from '@/components/marketing/Footer/Footer';
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

  const title = `${post.title} | ${APP_CONFIG.name} Blog`;
  // Falls back to the site's default OG image (root layout) when a post
  // has no coverImage of its own — a shared link should never show a
  // blank/broken preview image.
  const ogImage = post.coverImage || '/images/logo-full.png';

  return {
    title,
    description: post.excerpt,
    robots: { index: true, follow: true },
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author || APP_CONFIG.name],
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: post.excerpt,
      images: [ogImage],
    },
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { '@type': 'Organization', name: post.author || APP_CONFIG.name },
    publisher: { '@type': 'Organization', name: APP_CONFIG.name },
    ...(post.coverImage ? { image: post.coverImage } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Post frontmatter is repo-controlled content, not user input, but
        // this still escapes "<" defensively — matches the same pattern
        // used for shop-entered content on the public portfolio page.
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Header />
      <main className={styles.page}>
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
      </main>
      <Footer />
    </>
  );
}

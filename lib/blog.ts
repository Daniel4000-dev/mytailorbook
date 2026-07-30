import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const blogDirectory = path.join(process.cwd(), 'content/blog');

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
};

export function getBlogSlugs() {
  if (!fs.existsSync(blogDirectory)) {
    return [];
  }
  return fs.readdirSync(blogDirectory).filter((file) => file.endsWith('.mdx'));
}

export function getBlogPostBySlug(slug: string): BlogPost | null {
  try {
    const realSlug = slug.replace(/\.mdx$/, '');
    // The slug comes straight from the URL — reject anything that isn't a
    // plain filename segment before it ever touches the filesystem, so a
    // request like /blog/..%2f..%2f.env can't read a file outside
    // content/blog no matter how path.join would otherwise resolve it.
    if (!/^[a-zA-Z0-9-]+$/.test(realSlug)) return null;
    const fullPath = path.join(blogDirectory, `${realSlug}.mdx`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug: realSlug,
      title: data.title || 'Untitled',
      date: data.date || '',
      excerpt: data.excerpt || '',
      content,
    };
  } catch {
    return null;
  }
}

export function getAllBlogPosts(): BlogPost[] {
  const slugs = getBlogSlugs();
  const posts = slugs
    .map((slug) => getBlogPostBySlug(slug))
    .filter((post): post is BlogPost => post !== null)
    .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return posts;
}

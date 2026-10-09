import re

with open('next.config.ts', 'r') as f:
    content = f.read()

pattern = r"remotePatterns: \[\s*\{\s*protocol: 'https',\s*hostname: 'dbbzgdklhxshgqhwrxoq.supabase.co',\s*pathname: '/storage/v1/object/public/\*\*',\s*\},"

replacement = """remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dbbzgdklhxshgqhwrxoq.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'atmtzcimmdzfzkixiiyl.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },"""

new_content = re.sub(pattern, replacement, content)

with open('next.config.ts', 'w') as f:
    f.write(new_content)

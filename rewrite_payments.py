import re

with open('app/actions/payments.ts', 'r') as f:
    content = f.read()

# Add imports
import_statement = "import { validateBillingEnvironment, getPlanCode, getBillingEnv } from '@/lib/billing/environment';\n"
content = re.sub(r"import \{ refundTrialChargeOnce \} from '@/lib/paystackRefund';", "import { refundTrialChargeOnce } from '@/lib/paystackRefund';\n" + import_statement, content)

# 1. initializeSubscription
content = re.sub(r"(export async function initializeSubscription\(.*?\) \{\n\s+const supabase = await createClient\(\);)", r"\1\n\n  validateBillingEnvironment();", content)

content = re.sub(r"const PLAN_CODE = interval === 'yearly'\s*\n\s*\? process.env.NEXT_PUBLIC_PAYSTACK_YEARLY_PLAN_CODE\s*\n\s*: process.env.NEXT_PUBLIC_PAYSTACK_PLAN_CODE;", "const PLAN_CODE = getPlanCode(interval);", content)

# 2. confirmSubscriptionPayment
content = re.sub(r"(export async function confirmSubscriptionPayment\(.*?\) \{\n\s+const supabase = await createClient\(\);)", r"\1\n\n  validateBillingEnvironment();", content)

content = re.sub(r"(\.update\(\{[\s\S]*?grace_expires_at: null,)(\s*\})", r"\1\n        paystack_environment: getBillingEnv(),\2", content)
content = re.sub(r"(\.eq\('id', profile.shop_id\);)", r"\1", content) # We don't filter by paystack_environment here since we are SETTING it for the first time or updating it based on id. Wait, the rule says "All future writes/lookups involving paystack_* must verify paystack_environment". But here we update by ID.

# 3. startFreeTrial
content = re.sub(r"(export async function startFreeTrial\(.*?\) \{\n\s+const supabase = await createClient\(\);)", r"\1\n\n  validateBillingEnvironment();", content)

content = re.sub(r"const PLAN_CODE = interval === 'yearly'\s*\n\s*\? process.env.NEXT_PUBLIC_PAYSTACK_YEARLY_PLAN_CODE\s*\n\s*: process.env.NEXT_PUBLIC_PAYSTACK_PLAN_CODE;", "const PLAN_CODE = getPlanCode(interval);", content)

# 4. confirmFreeTrial
content = re.sub(r"(export async function confirmFreeTrial\(.*?\) \{\n\s+const supabase = await createClient\(\);)", r"\1\n\n  validateBillingEnvironment();", content)

content = re.sub(r"(\.update\(\{[\s\S]*?grace_expires_at: null,)(\s*\})", r"\1\n        paystack_environment: getBillingEnv(),\2", content)


# 5. cancelSubscriptionAction
content = re.sub(r"(export async function cancelSubscriptionAction\(.*?\) \{\n\s+const supabase = await createClient\(\);)", r"\1\n\n  validateBillingEnvironment();", content)

content = re.sub(r"(\.select\('id, subscription_status, paystack_subscription_code, current_period_end, is_primary, org_id'\)\n\s+\.eq\('id', profile\.shop_id\))", r"\1\n    .eq('paystack_environment', getBillingEnv())", content)

content = re.sub(r"(\(await admin\.from\('shops'\)\.select\('id, subscription_status, paystack_subscription_code, current_period_end'\)\.eq\('org_id', shop\.org_id\)\.eq\('is_primary', true\))", r"\1.eq('paystack_environment', getBillingEnv())", content)

content = re.sub(r"(\.update\(\{ paystack_subscription_code: null \}\)\n\s+\.eq\('id', billingShop\.id \?\? profile\.shop_id\))", r"\1\n    .eq('paystack_environment', getBillingEnv())", content)

with open('app/actions/payments.ts', 'w') as f:
    f.write(content)

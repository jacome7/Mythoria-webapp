# 🔧 Clerk Authentication Production Issues - Troubleshooting Guide

## 🎯 Quick Summary of Issues Found

Based on your production setup, I've identified **2 critical issues** causing the authentication failures:

### ❌ Issue 1: Missing Root Domain in Clerk
**Problem**: Your Clerk dashboard only has `clerk.mythoria.pt` and `accounts.mythoria.pt` configured, but NOT the root domain `mythoria.pt`.
**Result**: Browsers reject the `__session` cookie because the domain is invalid, causing all authenticated API calls to return 401.

### ❌ Issue 2: Wrong Environment Variable Name
**Problem**: Your webhook handler expects `CLERK_WEBHOOK_SECRET` but your Cloud Run YAML defines `CLERK_WEBHOOK_SIGNING_SECRET`.
**Result**: Webhook verification fails with 500 "Error creating user in database".

---

## 🚀 Step-by-Step Fix

### Step 1: Fix Clerk Domain Configuration

1. **Go to Clerk Dashboard** → Settings → Domains & TLS
2. **Add the root domain**: Click "Add Domain" and enter `mythoria.pt` (no subdomain)
3. **Verify the domain**: Follow Clerk's verification process
4. **Set as Primary**: Click "Make Primary" next to `mythoria.pt`

**Why this matters**: Clerk needs the root domain to set session cookies that browsers will accept.

### Step 2: Update Environment Variables

Deploy the updated configuration that fixes the webhook secret name:

```powershell
# Use the fixed deployment script
.\scripts\deploy-fixed.ps1
```

**Key changes in environment variables:**
- ✅ `CLERK_WEBHOOK_SIGNING_SECRET` → `CLERK_WEBHOOK_SECRET` 
- ❌ Removed `NEXTAUTH_SECRET` and `NEXTAUTH_URL` (not needed for Clerk)

### Step 3: Update Clerk Webhook Configuration

1. **Go to Clerk Dashboard** → Webhooks
2. **Update the endpoint URL** to: `https://mythoria.pt/api/webhooks`
3. **Ensure events are enabled**: `user.created`, `user.updated`, `user.deleted`, `session.created`

### Step 4: Test the Fix

1. **Deploy the updated code** (with debug pages)
2. **Visit debug pages**:
   - Environment check: `https://mythoria.pt/api/debug/env`
   - Clerk debug: `https://mythoria.pt/clerk-debug`
3. **Test authentication flow**:
   - Sign in to the application
   - Check browser cookies (should see `__session` with `Domain=mythoria.pt`)
   - Test protected API endpoints

---

## 🔍 Debug Pages Created

I've created comprehensive debug pages to help you troubleshoot:

### `/clerk-debug` - Interactive Debug Dashboard
- Shows client-side auth state
- Displays cookie information 
- Tests server-side authentication
- Tests all API endpoints

### `/api/debug/env` - Environment Variables Check
- Validates all Clerk configuration
- Identifies missing or incorrect variables
- Shows legacy variables that should be removed

### `/api/debug/auth` - Server-Side Auth Test
- Tests the `auth()` function directly
- Shows what the server sees for authentication

---

## 📋 Clerk Dashboard Checklist

Go through these settings in your Clerk dashboard:

### ✅ Domains & TLS
- [ ] `mythoria.pt` is added and verified
- [ ] `mythoria.pt` is set as Primary domain
- [ ] `clerk.mythoria.pt` is configured
- [ ] `accounts.mythoria.pt` is configured

### ✅ API Keys
- [ ] Using Production keys (not Development)
- [ ] `CLERK_SECRET_KEY` starts with `sk_live_`
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_live_`

### ✅ Webhooks
- [ ] Endpoint URL: `https://mythoria.pt/api/webhooks`
- [ ] Events enabled: `user.created`, `user.updated`, `user.deleted`, `session.created`
- [ ] Webhook secret matches `CLERK_WEBHOOK_SECRET` environment variable

### ✅ Application Settings
- [ ] Sign-in URL: `/sign-in`
- [ ] Sign-up URL: `/sign-up`
- [ ] After sign-in URL: `/`
- [ ] After sign-up URL: `/`

---

## 🧪 Testing Sequence

After deploying the fixes, test in this order:

1. **Health Check**: `https://mythoria.pt/api/health` → Should return 200 OK
2. **Environment Check**: `https://mythoria.pt/api/debug/env` → Should show no critical issues
3. **Clerk Configuration**: `https://mythoria.pt/clerk-test` → Should show all green checkmarks
4. **Sign In**: Test the complete authentication flow
5. **Cookie Check**: Open Browser DevTools → Application → Cookies → Should see `__session` cookie with `Domain=mythoria.pt`
6. **Protected APIs**: Test `/api/auth/me`, `/api/my-credits`, `/api/my-stories` → Should return 200 instead of 401
7. **Webhook Test**: Create a new user account → Should see successful user creation in logs

---

## 🔧 Common Additional Issues

If you're still having problems after the main fixes:

### Issue: Still getting 401 on API calls
**Check**: Browser cookies are being sent with requests
**Fix**: Ensure `mythoria.pt` is the Primary domain in Clerk, not just added

### Issue: Webhook still failing
**Check**: Environment variable name exactly matches `CLERK_WEBHOOK_SECRET`
**Fix**: Verify the webhook secret value matches between Clerk dashboard and Cloud Run

### Issue: Users not being created
**Check**: Database connection and permissions
**Fix**: Test database connectivity with `/api/health`

### Issue: Session cookie not appearing
**Check**: Cloud Run domain mapping
**Fix**: Ensure custom domain is properly mapped to Cloud Run service

---

## 📞 Next Steps

1. **Deploy the fixes** using the updated scripts
2. **Configure Clerk domains** as described above
3. **Test using the debug pages** 
4. **Report back** with the results from `/clerk-debug` and `/api/debug/env`

The debug pages will give us detailed information about what's working and what still needs fixing.

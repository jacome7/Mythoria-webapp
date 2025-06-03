# 📋 Production Deployment Checklist

## Pre-Deployment Steps

### ✅ Code Changes
- [ ] Fixed webhook handler to use `CLERK_WEBHOOK_SECRET` instead of `CLERK_WEBHOOK_SIGNING_SECRET`
- [ ] Added comprehensive debug pages (`/clerk-debug`, `/api/debug/env`, `/api/debug/auth`)
- [ ] Improved error handling in webhook route
- [ ] Updated middleware to allow debug routes

### ✅ Local Testing
```powershell
cd c:\Mythoria\mythoria-webapp
.\scripts\test-local.ps1
```
- [ ] Application builds without errors
- [ ] Debug pages load correctly
- [ ] No TypeScript compilation errors

## Deployment Steps

### 1. Deploy Updated Code
```powershell
cd c:\Mythoria\mythoria-webapp
.\scripts\deploy-fixed.ps1
```

### 2. Configure Clerk Dashboard

#### Domains & TLS Settings
- [ ] Go to Clerk Dashboard → Settings → Domains & TLS
- [ ] Add `mythoria.pt` (root domain, no subdomain)
- [ ] Verify domain ownership
- [ ] Set `mythoria.pt` as **Primary** domain
- [ ] Confirm existing subdomains still work:
  - [ ] `clerk.mythoria.pt` 
  - [ ] `accounts.mythoria.pt`

#### Webhook Configuration
- [ ] Go to Clerk Dashboard → Webhooks
- [ ] Update endpoint URL to: `https://mythoria.pt/api/webhooks`
- [ ] Ensure these events are enabled:
  - [ ] `user.created`
  - [ ] `user.updated` 
  - [ ] `user.deleted`
  - [ ] `session.created`
- [ ] Copy the webhook signing secret
- [ ] Verify it matches the `CLERK_WEBHOOK_SECRET` in Cloud Run

#### API Keys Verification
- [ ] Go to Clerk Dashboard → API Keys
- [ ] Confirm using **Production** keys (not Development)
- [ ] `CLERK_SECRET_KEY` should start with `sk_live_`
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` should start with `pk_live_`

## Post-Deployment Verification

### 1. Basic Health Checks
- [ ] `https://mythoria.pt/api/health` → 200 OK
- [ ] `https://mythoria.pt/clerk-test` → All green checkmarks

### 2. Debug Information
- [ ] `https://mythoria.pt/api/debug/env` → No critical issues
- [ ] `https://mythoria.pt/clerk-debug` → Shows proper auth state

### 3. Authentication Flow Testing

#### Sign In Process
- [ ] Go to `https://mythoria.pt`
- [ ] Click Sign In
- [ ] Complete authentication
- [ ] Should redirect back to home page

#### Cookie Verification
- [ ] Open Browser DevTools → Application → Cookies
- [ ] Look for `__session` cookie
- [ ] Verify `Domain = mythoria.pt` (not a subdomain)
- [ ] Cookie should be included in API requests

#### Protected API Testing
After signing in, these should return 200 instead of 401:
- [ ] `https://mythoria.pt/api/auth/me`
- [ ] `https://mythoria.pt/api/my-credits`
- [ ] `https://mythoria.pt/api/my-stories`

### 4. Webhook Testing
- [ ] Create a new test user account
- [ ] Check Cloud Run logs for successful webhook processing
- [ ] Verify user appears in database
- [ ] No 500 errors in Clerk webhook dashboard

## Troubleshooting

### If Still Getting 401 Errors
1. Check browser cookies - `__session` cookie should be present
2. Verify `mythoria.pt` is set as Primary domain in Clerk
3. Check Cloud Run logs for authentication errors
4. Test with `/api/debug/auth` to see server-side auth state

### If Webhooks Still Failing
1. Verify environment variable name is exactly `CLERK_WEBHOOK_SECRET`
2. Check webhook secret value matches between Clerk and Cloud Run
3. Review Cloud Run logs for detailed error messages
4. Test webhook endpoint manually if needed

### If Cookies Not Setting
1. Verify domain mapping in Cloud Run
2. Check that load balancer forwards Host header correctly
3. Ensure `mythoria.pt` is Primary domain in Clerk
4. Try clearing browser cache and cookies

## Environment Variables Summary

### ✅ Correct Configuration
```yaml
# Clerk Authentication
- name: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  value: pk_live_Y2xlcmsubXl0aG9yaWEucHQk
- name: CLERK_SECRET_KEY
  value: sk_live_8L3AhdA8zaS5FSXSZFcyJDbwlt0F2os7pXmtfNJ6mj
- name: CLERK_WEBHOOK_SECRET  # FIXED: was CLERK_WEBHOOK_SIGNING_SECRET
  value: whsec_yC4gwWqgOTLRsPwhQMYp5ApvxfL+5lK7
```

### ❌ Removed (Legacy)
```yaml
# These should NOT be present for Clerk
- name: NEXTAUTH_SECRET      # Not needed
- name: NEXTAUTH_URL         # Not needed
```

## Success Criteria

✅ **Authentication Working When:**
- Sign in/out flow works smoothly
- `__session` cookie is set with correct domain
- Protected API routes return 200 instead of 401
- User data displays correctly in app

✅ **Webhooks Working When:**
- New user registration creates database record
- User updates sync to database
- No 500 errors in Clerk webhook logs
- Cloud Run logs show successful webhook processing

✅ **Overall Success When:**
- All existing functionality works
- No authentication-related errors
- Users can access their profiles and data
- Admin portal functions correctly

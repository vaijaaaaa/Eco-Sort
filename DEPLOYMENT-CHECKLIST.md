# 🚀 Vercel Deployment Checklist

Use this checklist to ensure a smooth deployment to Vercel.

## Before Deployment

### 1. Code Preparation
- [ ] All code is committed to Git
- [ ] `.env` file is in `.gitignore` (already done ✅)
- [ ] No sensitive data in source code
- [ ] Build works locally: `npm run build`
- [ ] Preview works locally: `npm run preview`

### 2. Supabase Setup
- [ ] Database schema deployed (`supabase/schema.sql`)
- [ ] Storage bucket created (`listing-images`)
- [ ] Storage policies configured (read/write permissions)
- [ ] RLS policies enabled and working
- [ ] Have Supabase URL ready
- [ ] Have Supabase anon key ready

### 3. GitHub Repository
- [ ] Code pushed to GitHub repository
- [ ] Repository is accessible
- [ ] Main branch is up to date

## During Deployment

### 4. Vercel Project Setup
- [ ] Signed in to Vercel
- [ ] Imported GitHub repository
- [ ] Selected correct framework (Vite)
- [ ] Build settings configured:
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Install Command: `npm install`

### 5. Environment Variables
Add these in Vercel Dashboard → Settings → Environment Variables:

- [ ] `VITE_SUPABASE_URL` = `your_supabase_url`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` = `your_anon_key`

**Important**: Set for "Production", "Preview", and "Development" environments

### 6. Deploy
- [ ] Click "Deploy" button
- [ ] Wait for build to complete
- [ ] Check for build errors in logs

## After Deployment

### 7. Supabase Configuration
- [ ] Add Vercel URL to Supabase Site URL
- [ ] Add Vercel URL to Supabase Redirect URLs
- [ ] Configure CORS if needed

### 8. Testing
- [ ] Visit deployed URL
- [ ] Test homepage loads
- [ ] Test user sign up
- [ ] Test user login
- [ ] Test marketplace page
- [ ] Test creating a listing
- [ ] Test image upload
- [ ] Test navigation (refresh pages)
- [ ] Check browser console for errors
- [ ] Test on mobile device

### 9. Optional Enhancements
- [ ] Configure custom domain
- [ ] Enable Web Analytics
- [ ] Set up monitoring
- [ ] Configure automatic deployments
- [ ] Add deployment status badge to README

## Common Issues & Solutions

### ❌ Build Fails
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Test build locally: `npm run build`

### ❌ White Screen / Blank Page
- Check browser console for errors
- Verify environment variables are set
- Check network tab for failed requests

### ❌ Authentication Not Working
- Verify Supabase URL in environment variables
- Check Site URL in Supabase settings
- Verify Redirect URLs include Vercel domain

### ❌ 404 on Page Refresh
- Verify `vercel.json` exists in root
- Check rewrite rules in `vercel.json`
- Redeploy if just added

### ❌ Images Not Uploading
- Verify storage bucket exists
- Check storage policies
- Verify bucket name matches code (`listing-images`)

## Quick Commands

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs [deployment-url]

# Pull environment variables locally
vercel env pull
```

## Deployment URLs

After deployment, you'll get:
- **Production**: `https://your-project.vercel.app`
- **Preview**: `https://your-project-git-branch.vercel.app`

---

## Need Help?

- 📚 [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- 🔗 [Vercel Documentation](https://vercel.com/docs)
- 🔗 [Supabase Documentation](https://supabase.com/docs)
- 💬 [Vercel Discord](https://vercel.com/discord)

---

**Last Updated**: November 9, 2025

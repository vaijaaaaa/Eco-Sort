# 🚀 Deploying EcoSort to Vercel

This guide will help you deploy your EcoSort application to Vercel.

## Prerequisites

- [ ] GitHub account
- [ ] Vercel account (free tier works)
- [ ] Supabase project set up with database schema
- [ ] Code pushed to GitHub repository

## Deployment Steps

### 1. Push Your Code to GitHub

If you haven't already, push your code to GitHub:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Ready for Vercel deployment"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/vaijaaaaa/Bio-Bin.git

# Push to main/master branch
git push -u origin main
```

### 2. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)** and sign in
2. **Click "Add New Project"**
3. **Import your GitHub repository**:
   - Select "Import Git Repository"
   - Choose your `Bio-Bin` repository
   - Click "Import"
4. **Configure Project**:
   - Framework Preset: **Vite** (auto-detected)
   - Root Directory: `./` or `ecosort-ai-market` (if it's in a subfolder)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. **Add Environment Variables**:
   Click "Environment Variables" and add:
   
   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | Your Supabase project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key |

   **Where to find these values:**
   - Go to your Supabase Dashboard → Settings → API
   - Copy the `Project URL` for `VITE_SUPABASE_URL`
   - Copy the `anon public` key for `VITE_SUPABASE_PUBLISHABLE_KEY`

6. **Deploy**:
   - Click "Deploy"
   - Wait for the build to complete (usually 1-3 minutes)
   - Your app will be live at `https://your-project-name.vercel.app`

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No
# - What's your project's name? ecosort-ai-market
# - In which directory is your code located? ./
# - Want to override settings? No

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY

# Deploy to production
vercel --prod
```

### 3. Post-Deployment Configuration

#### Update Supabase Authentication URLs

1. Go to your **Supabase Dashboard** → Authentication → URL Configuration
2. Add your Vercel URL to:
   - **Site URL**: `https://your-project-name.vercel.app`
   - **Redirect URLs**: 
     - `https://your-project-name.vercel.app`
     - `https://your-project-name.vercel.app/**`

#### Configure CORS (if needed)

In Supabase Dashboard → Settings → API → CORS:
- Add `https://your-project-name.vercel.app`

### 4. Verify Deployment

1. **Visit your deployed site**: `https://your-project-name.vercel.app`
2. **Test authentication**: Try signing up/logging in
3. **Test listings**: Create a new listing
4. **Test image uploads**: Upload images (make sure storage bucket is set up)

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify environment variables are set correctly

### Environment Variables Not Working

- Make sure they start with `VITE_` prefix
- Redeploy after adding environment variables
- Check they're added to "Production" environment

### Supabase Connection Issues

- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are correct
- Check Supabase project is not paused (free tier pauses after inactivity)
- Verify CORS settings in Supabase

### Routing Issues (404 on refresh)

- The `vercel.json` file should handle this
- Verify it's in the root of your project
- Redeploy if you just added it

### Image Upload Issues

- Ensure `listing-images` storage bucket exists in Supabase
- Verify storage policies are set up correctly
- Check browser console for errors

## Automatic Deployments

Once connected to GitHub, Vercel will automatically:
- ✅ Deploy on every push to `main` branch
- ✅ Create preview deployments for pull requests
- ✅ Provide deployment URLs for each commit

## Custom Domain (Optional)

1. Go to your project in Vercel → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update Supabase authentication URLs to include custom domain

## Environment-Specific Deployments

For staging/production environments:

```bash
# Production
vercel --prod

# Preview (staging)
vercel
```

## Monitoring

- **Analytics**: Vercel Dashboard → Analytics
- **Logs**: Vercel Dashboard → Deployments → [Select deployment] → Logs
- **Performance**: Vercel Dashboard → Speed Insights

---

## Quick Reference

### Your Vercel Project URLs
- **Production**: `https://your-project-name.vercel.app`
- **Preview**: `https://your-project-name-git-branch.vercel.app`

### Important Links
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Documentation](https://vercel.com/docs)

---

🎉 **That's it!** Your EcoSort app should now be live on Vercel!

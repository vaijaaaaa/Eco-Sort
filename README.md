# EcoSort - E-Waste Marketplace

A modern web application for buying and selling electronic waste (e-waste) responsibly. EcoSort connects users who want to sell their old electronics with buyers looking for affordable devices, promoting sustainability and reducing electronic waste.

## Features

### User Authentication
- Secure sign-up and login system
- Email-based authentication via Supabase
- Protected routes and user sessions
- Role-based access control (Admin/Community Member)

### Marketplace
- Browse available e-waste listings
- Advanced filtering by category, condition, and price
- Search functionality for finding specific items
- Detailed product listings with multiple images
- Real-time availability status

### Dashboard
- User profile management
- Create and manage listings
- Upload multiple images per listing (up to 5)
- Track buying activity
- View listing analytics
- Edit and delete listings

### Listing Management
- Create detailed listings with:
  - Title and description
  - Category selection (Laptop, Smartphone, Tablet, etc.)
  - Condition grading (Excellent, Good, Fair, Poor)
  - Price and currency
  - Location information
  - Contact details
  - Multiple image uploads from device
- Image validation (max 5MB per image, up to 5 images)
- Status management (Available, Sold, Reserved)

### AI Waste Classifier
- Live camera capture for detecting waste items
- FastAPI service powered by YOLOv8 custom weights
- Confidence scoring with disposal guidance

### Image Upload
- Direct file upload from device
- Secure storage via Supabase Storage
- Image preview and management
- Supported formats: JPG, PNG, GIF, WebP
- File size validation

## Technology Stack

### Frontend
- React 18 - UI library
- TypeScript - Type safety
- Vite - Build tool and dev server
- React Router - Client-side routing
- Tailwind CSS - Styling framework
- Shadcn UI - Component library

### Backend & Services
- Supabase - Backend as a Service
  - PostgreSQL database
  - Authentication
  - File storage
  - Real-time subscriptions
- TanStack Query - Server state management
- React Hook Form - Form handling
- Zod - Schema validation

### UI Components
- Radix UI - Accessible components
- Lucide React - Icon library
- Tailwind CSS - Utility-first CSS
- Custom components with Shadcn UI

## Prerequisites

- Node.js 18.x or higher
- npm or bun package manager
- Python 3.9 or higher
- Supabase account
- Git

## Installation

1. Clone the repository:
```bash
git clone https://github.com/vaijaaaaa/Bio-Bin.git
cd Bio-Bin/ecosort-ai-market
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_CLASSIFIER_API_URL=http://127.0.0.1:8000
```

4. Set up the database:
Run the SQL scripts in your Supabase SQL Editor:
- `supabase/schema.sql` - Database tables and policies
- `supabase/storage-bucket.sql` - Storage bucket configuration

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:8080`

6. Start the waste classifier API (instructions below) to enable the AI classifier page.

## Waste Classifier API (FastAPI)

The YOLOv8-based waste classifier runs as a separate FastAPI service located in the `server/` directory.

1. Create and activate a virtual environment (example using `python -m venv`):
  ```bash
  python -m venv .venv
  .\.venv\Scripts\activate
  # On macOS/Linux: source .venv/bin/activate
  ```

2. Install backend dependencies:
  ```bash
  pip install -r server/requirements.txt
  ```

3. (Optional) Configure environment variables:
  - `MODEL_PATH` (default: `yolov8/runs/detect/train3/weights/best.pt`)
  - `ALLOWED_ORIGINS` (comma-separated list, default: `*`)
  - `MIN_CONFIDENCE` (float between 0 and 1, default: `0.25`)

4. Start the API:
  ```bash
  uvicorn server.main:app --reload --host 0.0.0.0 --port 8000
  ```

  The service exposes `POST /detect` for image classification and `GET /health` for readiness checks.

5. Keep the API running while developing so the frontend classifier page can submit images for analysis.

## Database Setup

### Required Tables
- `profiles` - User profile information
- `listings` - Product listings
- `listing_images` - Image URLs for listings
- `buy_requests` - Purchase requests
- `saved_listings` - User saved items

### Storage Bucket
- `listing-images` - Public bucket for listing images
  - Max file size: 5MB
  - Allowed types: image/jpeg, image/png, image/gif, image/webp
  - Public read access
  - Authenticated write access

### Row Level Security (RLS)
All tables have RLS policies enabled for data security:
- Users can read public listings
- Users can create/update/delete their own listings
- Users can manage their own profile
- Admins have elevated permissions

## Project Structure

```
ecosort-ai-market/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── ui/         # Shadcn UI components
│   │   ├── Navbar.tsx  # Navigation bar
│   │   └── NavLink.tsx # Navigation links
│   ├── hooks/          # Custom React hooks
│   ├── integrations/   # External service integrations
│   │   └── supabase/   # Supabase client and types
│   ├── lib/            # Utility functions
│   ├── pages/          # Page components
│   │   ├── dashboard/  # Dashboard pages
│   │   ├── Auth.tsx    # Authentication page
│   │   ├── Home.tsx    # Landing page
│   │   └── Marketplace.tsx # Marketplace listing
│   ├── services/       # API service functions
│   └── main.tsx        # Application entry point
├── supabase/           # Database migrations and config
├── server/             # FastAPI waste classifier service
├── .env.example        # Environment variables template
├── vercel.json         # Vercel deployment config
└── package.json        # Project dependencies
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository on Vercel
3. Configure environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Deploy

See `DEPLOYMENT.md` for detailed deployment instructions.

### Environment Variables

Required environment variables for deployment:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### Post-Deployment

After deployment, update Supabase configuration:
1. Add your deployment URL to Supabase Site URL
2. Add your deployment URL to Redirect URLs
3. Configure CORS if needed

## Features in Detail

### User Dashboard
- Overview of user activity
- My Listings - Manage your product listings
- Create Listing - Add new items for sale
- Buying - Track purchase requests
- Profile - Update user information

### Listing Creation
1. Fill in product details
2. Upload images from your device
3. Set price and location
4. Provide contact information
5. Submit for review

### Image Management
- Upload up to 5 images per listing
- Drag and drop support
- Image preview before upload
- Remove unwanted images
- Automatic optimization

### Search and Filter
- Search by title or description
- Filter by category
- Filter by condition
- Filter by price range
- Sort by date, price, or relevance

## Security

- Row Level Security (RLS) enabled on all tables
- Authentication required for sensitive operations
- Secure file upload with validation
- Environment variables for sensitive data
- CORS configuration
- XSS protection

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email vaijuwalker111@gmail.com or open an issue in the repository.

## Acknowledgments

- Supabase for backend infrastructure
- Shadcn UI for component library
- Tailwind CSS for styling system
- Lucide for icons
- React team for the amazing framework

## Roadmap

- [x] AI-powered item classification
- [ ] Real-time chat between buyers and sellers
- [ ] Payment integration
- [ ] Rating and review system
- [ ] Mobile application
- [ ] Email notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-language support

## Authors

- Vaijnath Patil -[vaijaaaaa](https://github.com/vaijaaaaa)
- Yuvraj Singh   -[YuvrajRajbanshi](https://github.com/YuvrajRajbanshi)

## Project Status

Active development - Version 1.0.0
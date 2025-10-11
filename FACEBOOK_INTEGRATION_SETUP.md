# Facebook Integration Setup Guide

এই গাইড আপনাকে Facebook Developer App তৈরি করে আপনার অ্যাপে Facebook পেজ কানেকশন ফিচার সেটআপ করতে সাহায্য করবে।

## 1. Facebook Developer App তৈরি করুন

### Step 1: Facebook Developer Account তৈরি করুন
1. [Facebook Developers](https://developers.facebook.com/) এ যান
2. "Get Started" বাটনে ক্লিক করুন
3. Facebook account দিয়ে login করুন
4. Developer account তৈরি করুন

### Step 2: নতুন App তৈরি করুন
1. Facebook Developers dashboard এ যান
2. "Create App" বাটনে ক্লিক করুন
3. "Consumer" বা "Business" type select করুন
4. App name দিন (যেমন: "Facebook Auto Post")
5. App contact email দিন
6. "Create App" বাটনে ক্লিক করুন

### Step 3: Facebook Login Product যোগ করুন
1. App dashboard এ "Add Product" section এ যান
2. "Facebook Login" product এ "Set Up" বাটনে ক্লিক করুন
3. "Web" platform select করুন

## 2. App Configuration

### Step 1: Basic Settings
1. App Settings > Basic এ যান
2. **App ID** এবং **App Secret** নোট করুন
3. **App Domains** এ আপনার domain যোগ করুন:
   - Development: `localhost`
   - Production: `yourdomain.com`

### Step 2: Facebook Login Settings
1. Products > Facebook Login > Settings এ যান
2. **Valid OAuth Redirect URIs** এ যোগ করুন:
   - Development: `http://localhost:5000/api/facebook/callback`
   - Production: `https://yourdomain.com/api/facebook/callback`

### Step 3: App Review (Production এর জন্য)
Production এ deploy করার আগে Facebook থেকে permissions approve করাতে হবে:
- `pages_manage_posts`
- `pages_read_engagement`
- `pages_show_list`
- `pages_manage_metadata`
- `pages_read_user_content`

## 3. Environment Variables Setup

### Server Environment Variables
`.env` ফাইলে নিম্নলিখিত variables যোগ করুন:

```env
# Facebook App Configuration
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:5000/api/facebook/callback

# Client URL
CLIENT_URL=http://localhost:3000
```

### Production Environment Variables
Production এর জন্য:

```env
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=https://yourdomain.com/api/facebook/callback
CLIENT_URL=https://yourdomain.com
```

## 4. Facebook App Permissions

### Required Permissions
আপনার Facebook app এ নিম্নলিখিত permissions configure করুন:

1. **pages_manage_posts** - পেজে পোস্ট করতে
2. **pages_read_engagement** - পেজের engagement data পড়তে
3. **pages_show_list** - ইউজারের পেজ list দেখতে
4. **pages_manage_metadata** - পেজের metadata manage করতে
5. **pages_read_user_content** - ইউজারের content পড়তে
6. **pages_manage_ads** - পেজের ads manage করতে
7. **pages_manage_instant_articles** - Instant Articles manage করতে
8. **pages_messaging** - Messages handle করতে
9. **pages_messaging_subscriptions** - Message subscriptions manage করতে
10. **pages_manage_events** - Events manage করতে
11. **pages_read_insights** - Page insights পড়তে

## 5. Testing

### Development Testing
1. Server start করুন: `npm run dev` (server directory তে)
2. Client start করুন: `npm run dev` (client directory তে)
3. Browser এ `http://localhost:3000` এ যান
4. Login করুন
5. Dashboard > Schedule page এ যান
6. "Connect Facebook Pages" বাটনে ক্লিক করুন
7. Facebook OAuth flow complete করুন

### Production Testing
1. Production environment variables set করুন
2. App deploy করুন
3. Facebook app এর redirect URI production URL এ update করুন
4. Test করুন

## 6. Troubleshooting

### Common Issues

#### 1. "Invalid redirect URI" Error
- Facebook app এর redirect URI ঠিক আছে কিনা check করুন
- Development: `http://localhost:5000/api/facebook/callback`
- Production: `https://yourdomain.com/api/facebook/callback`

#### 2. "App Not Setup" Error
- Facebook app এ Facebook Login product add করেছেন কিনা check করুন
- Valid OAuth Redirect URIs configure করেছেন কিনা check করুন

#### 3. "Permissions Not Granted" Error
- Facebook app এ required permissions add করেছেন কিনা check করুন
- Production এর জন্য App Review process complete করেছেন কিনা check করুন

#### 4. "Invalid App ID" Error
- Environment variables এ correct App ID set করেছেন কিনা check করুন
- App ID এবং App Secret match করছে কিনা check করুন

### Debug Tips
1. Browser developer tools এ network requests check করুন
2. Server logs check করুন
3. Facebook app dashboard এ error logs check করুন
4. Environment variables correctly set হয়েছে কিনা verify করুন

## 7. Security Considerations

### Production Security
1. **App Secret** কখনো client-side এ expose করবেন না
2. **HTTPS** ব্যবহার করুন production এ
3. **Environment variables** secure রাখুন
4. **Facebook App Review** process complete করুন
5. **Rate limiting** implement করুন

### Data Privacy
1. User data শুধুমাত্র necessary permissions দিয়ে access করুন
2. User consent নিন data access এর জন্য
3. GDPR compliance maintain করুন
4. Data retention policy implement করুন

## 8. Next Steps

Facebook integration setup complete হওয়ার পর:

1. **Post Scheduling** feature implement করুন
2. **Analytics Dashboard** তৈরি করুন
3. **Bulk Operations** feature যোগ করুন
4. **Error Handling** improve করুন
5. **User Management** features যোগ করুন

## Support

যদি কোনো সমস্যা হয়:
1. Facebook Developers documentation check করুন
2. GitHub issues এ report করুন
3. Community forums এ help নিন

---

**Note**: এই setup guide development environment এর জন্য। Production deployment এর জন্য additional security measures এবং Facebook App Review process follow করতে হবে।

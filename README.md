# KindleGive 🎁

A **complete, offline-capable donation crowdfunding platform** that runs entirely in your browser. No backend, no database, no real payments – just pure frontend magic using localStorage.

## 🌟 Features

### User Features
- **User Registration & Login** - First user automatically becomes admin
- **Create Campaigns** - Personal, medical, educational, and more
- **Browse Campaigns** - Search, filter by category, sort by funding/deadline
- **Donate** - Simulated payment flow with mock confirmation
- **Profile Dashboard** - View your campaigns and donation history
- **Withdrawal Requests** - Request funds after campaign closes
- **Notifications** - In-app alerts for campaign approvals, donations, and withdrawals

### Admin Features
- **Approve/Reject Campaigns** - Moderate pending campaigns
- **Feature Campaigns** - Highlight worthy causes on homepage
- **Manage Withdrawals** - Approve or reject withdrawal requests
- **User Management** - View users, change roles, delete accounts
- **Site Statistics** - Total campaigns, donations, and amount raised

## 🚀 Quick Start

1. **Clone or download** this repository
2. **Open `index.html`** in any modern web browser (Chrome, Firefox, Safari, Edge)
3. **Register** your first account (automatically becomes admin)
4. **Start creating campaigns** or browsing existing ones

That's it! No build process, no server setup, no dependencies to install.

## 📁 Project Structure

```
kindlegive/
├── index.html      # Main HTML file with all pages and modals
├── styles.css      # Custom responsive CSS styling
├── app.js          # All JavaScript logic and localStorage management
└── README.md       # This file
```

## 💡 How It Works

### Data Storage
All data is stored in your browser's **localStorage** under these keys:
- `kindleGive_users` - User accounts
- `kindleGive_campaigns` - Fundraising campaigns
- `kindleGive_donations` - Donation records
- `kindleGive_withdrawals` - Withdrawal requests
- `kindleGive_notifications` - User notifications

### Simulated Payments
When you donate, a mock payment modal appears asking for confirmation. **No real money is processed** – it's purely a simulation for demonstration purposes.

### Admin System
- The **first registered user** automatically becomes an admin
- Admins can access the admin panel via the navbar
- Admins approve campaigns before they go live
- Admins process withdrawal requests

## 🎯 Example User Flow

1. **First Visit**: Register as a new user → You become the admin
2. **Create Campaign**: Fill out the campaign form → Status: Pending
3. **Approve Campaign**: Go to Admin Panel → Approve your campaign → Status: Live
4. **Donate**: Browse campaigns → Click Donate → Confirm mock payment → See progress update
5. **Campaign Ends**: After deadline passes → Status: Closed
6. **Withdraw**: Request withdrawal → Admin approves → Status: Paid
7. **Notifications**: Receive in-app alerts at each step

## 🔒 Security Notes

⚠️ **This is a demo application** - Not for production use!

- Passwords are stored in **plain text** in localStorage (for demo only)
- Input sanitization prevents basic XSS attacks
- All data is **local to your browser** - clearing cache deletes everything
- No real authentication or authorization beyond localStorage checks

## 🎨 Technologies Used

- **HTML5** - Semantic structure
- **CSS3** - Flexbox/Grid, responsive design, custom styling
- **Vanilla JavaScript** - No frameworks, pure ES6+
- **localStorage** - Client-side data persistence
- **Font Awesome** (CDN) - Icons

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop browsers
- Tablets
- Mobile phones

## 🧪 Testing Tips

### Test Admin Features
1. Register first user (becomes admin)
2. Create a campaign
3. Go to Admin Panel → Approve campaign
4. Logout and register second user
5. Donate to the campaign as second user

### Test Campaign Lifecycle
1. Create campaign with near-future deadline (e.g., 7 days)
2. For quick testing, use browser DevTools to modify localStorage deadline
3. Refresh page → Campaign auto-closes if deadline passed
4. Request withdrawal → Admin approves

### Test Notifications
- Campaign approval notification
- New donation notification
- Withdrawal approved notification
- Check bell icon in navbar

## 🌐 Browser Compatibility

Works on all modern browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## 📝 Data Models

### User
```javascript
{
  id: string,
  name: string,
  email: string,
  password: string, // plain text (demo only!)
  role: "user" | "admin",
  createdAt: ISO string,
  avatarUrl: string (optional)
}
```

### Campaign
```javascript
{
  id: string,
  creatorId: string,
  title: string,
  shortDescription: string,
  fullDescription: string,
  goalAmount: number,
  raisedAmount: number,
  deadline: ISO string,
  category: string,
  coverImageUrl: string,
  location: string,
  status: "pending" | "live" | "closed" | "rejected",
  isFeatured: boolean,
  rejectionReason: string,
  createdAt: ISO string,
  updatedAt: ISO string
}
```

### Donation
```javascript
{
  id: string,
  campaignId: string,
  donorId: string,
  donorName: string,
  amount: number,
  anonymous: boolean,
  message: string,
  createdAt: ISO string
}
```

### WithdrawalRequest
```javascript
{
  id: string,
  campaignId: string,
  creatorId: string,
  amount: number,
  status: "pending" | "paid" | "rejected",
  requestedAt: ISO string,
  processedAt: ISO string
}
```

### Notification
```javascript
{
  id: string,
  userId: string,
  type: string,
  message: string,
  read: boolean,
  relatedId: string,
  createdAt: ISO string
}
```

## ⚠️ Important Disclaimers

1. **Demo Only**: This is a proof-of-concept application for educational purposes
2. **No Real Money**: All payments are simulated – no actual transactions occur
3. **Local Data**: All data stays in your browser; clearing cache deletes everything
4. **Not Production Ready**: Missing proper authentication, encryption, and security measures
5. **Single Browser**: Data doesn't sync across devices or browsers

## 🛠️ Development

### Adding New Features
All logic is in `app.js`. Key functions:
- `getData(key)` / `saveData(key, data)` - localStorage helpers
- `renderPage(page)` - Page routing
- `sanitizeInput(str)` - XSS protection
- `mockPayment(amount, callback)` - Simulated payment

### Customization
- Modify categories in the campaign form
- Adjust minimum donation amounts
- Change color scheme in `styles.css`
- Add new notification types

## 📄 License

This project is open source and available for educational purposes.

## 🤝 Contributing

Feel free to fork, modify, and experiment with this codebase. It's designed to be a learning resource for building offline-first web applications.

---

**Built with ❤️ using vanilla JavaScript, HTML, and CSS**

*KindleGive - Sparking generosity, one simulated donation at a time!*

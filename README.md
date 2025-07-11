# Tick Feed 

A web application that tracks and compares climbing activity from Mountain Project users. Built with Node.js, Express, and modern web technologies.

## Features

- **User Tick Tracking**: Downloads and stores user climbing tick data from Mountain Project
- **Recent Activity Comparison**: Compare climbing activity from the last 30 days between users
- **Hardest Climbs Analysis**: Find who climbed the hardest routes in the last 30 days
- **Real-time Updates**: WebSocket-based real-time notifications
- **CSV Export**: Downloads user tick data directly from Mountain Project
- **Tie Handling**: Properly handles ties in rankings
- **Loading States**: Visual feedback during data operations
- **Failure Handling**: Alerts when user data fails to update
- **Scrollable Interface**: Better organization of user data and recent ticks
- **Modal Popups**: Individual user tick details in popup windows

## Tech Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: HTML, CSS, JavaScript
- **Data Scraping**: Puppeteer, Axios with fallback mechanisms
- **Data Storage**: In-memory storage with JSON file persistence

## Installation

1. Clone the repository:
```bash
git clone https://github.com/lalynjay/sturdy-octo-potato.git
cd sturdy-octo-potato
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
node server.js
```

The application will be available at `http://localhost:3002` (or automatically find an available port)

## Usage

1. **Add Users**: Paste Mountain Project user tick URLs to start tracking their climbing activity
2. **View Recent Ticks**: See all ticks from all users in the last 3 days
3. **Compare Activity**: Use "Most routes climbed- last 30 days" to get the latest comparison
4. **Find Hardest Climbs**: Use "Rank who's climbed the hardest- last 30 days" to see difficulty rankings
5. **Individual User Details**: Click "Recent ticks" buttons to view individual user data in popup modals
6. **Real-time Updates**: Get notified of data refresh completion and any failures

## Key Features

### 30-Day Activity Comparison
- Compares the number of climbs completed in the last 30 days
- Shows rankings with proper tie handling
- Highlights the user who has ticked the most routes
- Disqualifies users with no recent activity (shows them separately)

### Hardest Climbs Analysis
- Analyzes route difficulty ratings (5.12a, 5.13a/b, 5.13b, etc.)
- Converts bouldering grades, with a penalty (V12 ~= 5.13a)
- Shows the hardest route per user in the last 30 days
- Displays route name, grade, and date
- Disqualifies users with no recent activity

### Recent Activity Feed
- Shows all ticks from all users in the last 3 days
- Scrollable interface for better data organization
- Individual user tick details available in modal popups

### Data Management
- Stores thousands of ticks per user in memory
- Automatically refreshes data when requested
- Handles Mountain Project's anti-bot measures with multiple fallback methods
- Supports users with large datasets (2000+ ticks)
- Filters out ticks with future dates (bad data)
- Shows loading states during operations
- Alerts when specific users fail to update

### User Interface Improvements
- Clean, modern interface with improved button labels
- Loading indicators during data operations
- Modal popups for detailed user information
- Scrollable sections for better data organization
- Clear failure notifications with specific user names
- Responsive design for better usability

## API Endpoints

- `GET /api/users` - Get all tracked users
- `GET /api/user/:username` - Get specific user data including recent and all ticks
- `POST /api/download-ticks` - Download tick data for a new user
- `GET /api/recent-ticks` - Get all ticks from all users in the last 3 days
- `POST /api/refresh-all-ticks` - Refresh all users' tick data
- `GET /api/recent-comparison` - Get 30-day tick comparison
- `GET /api/hardest-climbs` - Get hardest climbs comparison for last 30 days

## Troubleshooting

### Common Issues

1. **Port Conflicts**: The server automatically finds an available port if 3002 is busy
2. **Download Failures**: Some users' data may be large and occasionally fail to download properly, resulting in HTML responses instead of CSV
3. **Timeout Issues**: Large datasets may take several minutes to download (timeouts increased to 3 minutes)
4. **Rate Limiting**: Mountain Project may temporarily block requests if too frequent
5. **Private Data**: Some users may have private tick data that cannot be downloaded

### Data Accuracy

- The app downloads complete tick histories but only displays recent activity
- 30-day comparisons and hardest climbs analysis use the full dataset
- Data is refreshed on-demand to ensure accuracy
- Future-dated ticks are automatically filtered out
- Failed downloads are clearly reported with specific user names

### Loading and Error States

- Loading indicators show during data operations
- Individual user refresh buttons show loading states
- Failed operations display clear error messages
- Popup alerts notify when specific users fail to update
- All operations have proper error handling and user feedback

## Support

For issues and questions:
- Check the server console for detailed error messages
- Review the browser console for frontend issues
- Failed user updates are clearly reported in the interface
- Create an issue in the GitHub repository

---

**Note**: This application is for educational and personal use. Please respect Mountain Project's terms of service and rate limits when using this tool. 
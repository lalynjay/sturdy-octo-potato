# Naked Edge Monitor

A real-time monitoring application for tracking climbing activity on Mountain Project routes and user tick data. This application scrapes Mountain Project to monitor route changes and allows you to download and track user climbing activity (ticks).

## Features

### Route Monitoring
- **Real-time monitoring** of Mountain Project routes for changes
- **Automatic daily checks** at 5 PM for route updates
- **WebSocket updates** for live status updates
- **Multiple scraping methods** with fallback options (Puppeteer + Axios)
- **Change detection** based on content hash, link count, and other metrics

### User Tick Tracking
- **CSV download** of user climbing activity from Mountain Project
- **User management** - add, remove, and refresh user data
- **Recent activity display** showing latest climbs
- **Automatic data cleanup** - saves recent ticks and deletes CSV files
- **Session-based authentication** for accessing private user data

### Web Interface
- **Real-time dashboard** with live status updates
- **User-friendly interface** for managing monitored users
- **Responsive design** that works on desktop and mobile
- **Manual check triggers** for immediate route monitoring

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- Internet connection for Mountain Project access

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd nakededge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

4. **Access the application**
   - Open your browser and navigate to `http://localhost:3001`
   - The server will automatically try ports 3001, 3002, 3003 if the default port is busy

## Usage

### Route Monitoring

1. **View Current Status**: The dashboard shows the current monitoring status, last check time, and any detected changes
2. **Manual Check**: Click "Check Now" to trigger an immediate route check
3. **Real-time Updates**: The interface updates automatically via WebSocket when changes are detected

### User Tick Tracking

1. **Add a User**:
   - Enter a Mountain Project user URL (e.g., `https://www.mountainproject.com/user/110713768/crag-cat/ticks`)
   - Click "Download Ticks" to fetch the user's climbing data
   - Click "Add User" to add them to your monitored users list

2. **Manage Users**:
   - **View Details**: See the user's recent climbing activity
   - **Refresh**: Download updated tick data
   - **Remove**: Remove the user from monitoring

3. **View Recent Activity**: Each user's most recent climbs are displayed with route names, dates, and ratings

## Configuration

### Environment Variables

The application uses the following default configuration:

- **Port**: 3001 (automatically tries 3002, 3003 if busy)
- **Route URL**: `https://www.mountainproject.com/route/stats/105748786/the-naked-edge`
- **Check Schedule**: Daily at 5 PM
- **Timeout**: 2 minutes for CSV downloads

### Customization

To monitor a different route, modify the `routeUrl` variable in `server.js`:

```javascript
const routeUrl = 'https://www.mountainproject.com/route/stats/YOUR_ROUTE_ID/YOUR_ROUTE_NAME';
```

## Technical Details

### Architecture

- **Backend**: Node.js with Express.js
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Real-time**: Socket.IO for WebSocket communication
- **Scraping**: Puppeteer (headless browser) + Axios (HTTP client)
- **Scheduling**: node-cron for automated checks
- **Data Storage**: JSON file-based storage

### Scraping Methods

1. **Puppeteer**: Primary method using headless Chrome browser
2. **Axios**: Fallback method with enhanced headers
3. **Multiple API endpoints**: Tries various Mountain Project API endpoints
4. **HTML parsing**: Extracts data from route pages and tick tables

### Data Management

- **Route data**: Stored in `data.json` with timestamps and change detection
- **User data**: Stored in memory with JSON persistence
- **CSV files**: Automatically deleted after parsing to save disk space
- **Recent ticks**: Only the most recent activity is kept for display

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   - The application automatically tries alternative ports (3002, 3003)
   - Check the console output for the actual port being used

2. **CSV Download Failures**
   - Some users have private tick data that cannot be accessed
   - The application will show "Failed to download CSV" for these users
   - Try different users or check if the user's data is publicly accessible

3. **Scraping Errors**
   - Mountain Project may block requests if too frequent
   - The application includes retry logic and fallback methods
   - Check the console for detailed error messages

4. **Puppeteer Connection Issues**
   - The application automatically falls back to Axios if Puppeteer fails
   - This is normal behavior and doesn't affect functionality

### Performance

- **Large tick datasets**: Users with thousands of ticks may take longer to download
- **Memory usage**: The application keeps recent tick data in memory
- **Disk space**: CSV files are automatically cleaned up after processing

## Development

### Project Structure

```
nakededge/
├── server.js              # Main server application
├── package.json           # Dependencies and scripts
├── data.json             # Persistent route data
├── public/
│   └── index.html        # Web interface
├── downloads/            # Temporary CSV storage (auto-cleaned)
├── test-*.js            # Test scripts
└── node_modules/        # Dependencies
```

### Adding Features

1. **New Scraping Methods**: Add to the scraping logic in `server.js`
2. **UI Enhancements**: Modify `public/index.html`
3. **Data Processing**: Extend the tick parsing logic
4. **Authentication**: Enhance the Mountain Project login system

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license here]

## Acknowledgments

- Mountain Project for providing climbing data
- The climbing community for inspiration and feedback

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the console output for error messages
- Create an issue in the GitHub repository

---

**Note**: This application is for educational and personal use. Please respect Mountain Project's terms of service and rate limits when using this tool. 
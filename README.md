# Mountain Project Tick Monitor

A web application that monitors Mountain Project climbing routes and tracks user tick data. Built with Node.js, Express, and modern web technologies.

## Features

- **Route Monitoring**: Automatically checks for changes to climbing routes
- **User Tick Tracking**: Downloads and stores user climbing tick data
- **Real-time Updates**: WebSocket-based real-time notifications
- **30-Day Comparison**: Compare recent climbing activity between users
- **CSV Export**: Downloads user tick data directly from Mountain Project

## Tech Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: HTML, CSS, JavaScript
- **Data Scraping**: Puppeteer, Axios
- **Data Storage**: JSON file-based storage

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
npm start
```

The application will be available at `http://localhost:3002`

## Usage

1. **Monitor Routes**: Enter a Mountain Project route URL to start monitoring
2. **Track Users**: Add user tick URLs to download and track their climbing activity
3. **View Comparisons**: Compare recent climbing activity between users
4. **Real-time Updates**: Get notified of changes automatically

## API Endpoints

- `GET /api/status` - Get current monitoring status
- `POST /api/check` - Manually trigger a route check
- `POST /api/add-user` - Add a new user to track
- `GET /api/users` - Get all tracked users
- `GET /api/user/:username` - Get specific user data
- `POST /api/refresh-ticks/:username` - Refresh user tick data
- `GET /api/recent-ticks` - Get 30-day tick comparison
- `POST /api/refresh-all-ticks` - Refresh all users' tick data

## License

MIT License

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
const axios = require('axios');

// Browser-like headers for authentication
const AUTH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"'
};

class MountainProjectAuth {
  constructor() {
    this.sessionCookies = null;
    this.csrfToken = null;
    this.isAuthenticated = false;
  }

  async login(email, password) {
    try {
      console.log('=== STARTING MOUNTAIN PROJECT LOGIN ===');
      
      // Step 1: First try to get the main page to find the correct login URL
      console.log('Step 1: Getting main page to find login URL...');
      const mainPageResponse = await axios.get('https://www.mountainproject.com/', {
        headers: AUTH_HEADERS,
        timeout: 180000
      });
      
      // Look for login links in the main page
      const loginUrlMatch = mainPageResponse.data.match(/href="([^"]*login[^"]*)"/i);
      let loginUrl = 'https://www.mountainproject.com/user/login'; // default
      
      if (loginUrlMatch) {
        loginUrl = loginUrlMatch[1];
        if (!loginUrl.startsWith('http')) {
          loginUrl = 'https://www.mountainproject.com' + loginUrl;
        }
        console.log('Found login URL:', loginUrl);
        
        // Check if this is a third-party login (like onX) and look for the main login
        if (loginUrl.includes('onx') || loginUrl.includes('facebook') || loginUrl.includes('google')) {
          console.log('Found third-party login, looking for main login...');
          // Look for the main login URL
          const mainLoginMatch = mainPageResponse.data.match(/href="([^"]*\/auth\/login[^"]*)"[^>]*>.*?Sign in/i);
          if (mainLoginMatch) {
            loginUrl = mainLoginMatch[1];
            if (!loginUrl.startsWith('http')) {
              loginUrl = 'https://www.mountainproject.com' + loginUrl;
            }
            console.log('Found main login URL:', loginUrl);
          }
        }
      } else {
        console.log('Using default login URL:', loginUrl);
      }
      
      // Try alternative login URLs if the first one fails
      const alternativeUrls = [
        'https://www.mountainproject.com/auth/login',
        'https://www.mountainproject.com/user/login',
        'https://www.mountainproject.com/login',
        'https://www.mountainproject.com/signin',
        'https://www.mountainproject.com/user/signin'
      ];
      
      let workingUrl = null;
      let loginPageResponse = null;
      
      for (const url of alternativeUrls) {
        try {
          console.log(`Trying login URL: ${url}`);
          const response = await axios.get(url, {
            headers: AUTH_HEADERS,
            timeout: 180000
          });
          
          if (response.status === 200) {
            workingUrl = url;
            loginPageResponse = response;
            console.log(`Successfully accessed login page: ${url}`);
            break;
          }
        } catch (error) {
          console.log(`Failed to access ${url}: ${error.message}`);
        }
      }
      
      if (!workingUrl) {
        throw new Error('Could not access any login page');
      }
      
      loginUrl = workingUrl;
      
      // Step 2: Extract CSRF token from the login page
      console.log('Step 2: Extracting CSRF token...');
      
      // Extract CSRF token from the login page
      const csrfMatch = loginPageResponse.data.match(/name="csrf_token"\s+value="([^"]+)"/);
      if (csrfMatch) {
        this.csrfToken = csrfMatch[1];
        console.log('CSRF token extracted:', this.csrfToken);
      } else {
        console.log('Warning: Could not extract CSRF token');
      }
      
      // Step 3: Submit login form
      console.log('Step 3: Submitting login credentials...');
      
      // Try different form submission methods
      const loginMethods = [
        {
          name: 'POST to login URL',
          method: 'POST',
          url: loginUrl,
          data: new URLSearchParams({
            email: email,
            password: password,
            ...(this.csrfToken && { csrf_token: this.csrfToken })
          }),
          headers: {
            ...AUTH_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://www.mountainproject.com',
            'Referer': loginUrl
          }
        },
        {
          name: 'POST to /user/login',
          method: 'POST',
          url: 'https://www.mountainproject.com/user/login',
          data: new URLSearchParams({
            email: email,
            password: password,
            ...(this.csrfToken && { csrf_token: this.csrfToken })
          }),
          headers: {
            ...AUTH_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://www.mountainproject.com',
            'Referer': loginUrl
          }
        },
        {
          name: 'GET with credentials',
          method: 'GET',
          url: `https://www.mountainproject.com/user/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
          headers: {
            ...AUTH_HEADERS,
            'Referer': loginUrl
          }
        }
      ];
      
      let loginResponse = null;
      let loginSuccess = false;
      
      for (const method of loginMethods) {
        try {
          console.log(`Trying ${method.name}...`);
          
          if (method.method === 'POST') {
            loginResponse = await axios.post(method.url, method.data, {
              headers: method.headers,
              maxRedirects: 5,
              validateStatus: function (status) {
                return status >= 200 && status < 400; // Accept redirects
              },
              timeout: 15000
            });
          } else {
            loginResponse = await axios.get(method.url, {
              headers: method.headers,
              maxRedirects: 5,
              validateStatus: function (status) {
                return status >= 200 && status < 400; // Accept redirects
              },
              timeout: 15000
            });
          }
          
          console.log(`${method.name} response status:`, loginResponse.status);
          
          // Check if login was successful
          if (loginResponse.status >= 200 && loginResponse.status < 400) {
            loginSuccess = true;
            console.log(`${method.name} appears successful`);
            break;
          }
        } catch (error) {
          console.log(`${method.name} failed:`, error.message);
        }
      }
      
      if (!loginSuccess) {
        throw new Error('All login methods failed');
      }
      
      // Extract cookies from response
      const setCookieHeaders = loginResponse.headers['set-cookie'];
      if (setCookieHeaders) {
        this.sessionCookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
        console.log('Session cookies obtained');
        console.log('Cookie count:', setCookieHeaders.length);
      }
      
      // Step 4: Verify login by checking if we can access authenticated content
      console.log('Step 4: Verifying authentication...');
      const verifyResponse = await axios.get('https://www.mountainproject.com/account', {
        headers: {
          ...AUTH_HEADERS,
          'Cookie': this.sessionCookies
        },
        timeout: 180000
      });
      
      // Check if we're logged in by looking for account-specific content
      if (verifyResponse.data.includes('logout') || verifyResponse.data.includes('account') || verifyResponse.data.includes('profile')) {
        this.isAuthenticated = true;
        console.log('✅ Login successful!');
        return true;
      } else {
        console.log('❌ Login verification failed');
        return false;
      }
      
    } catch (error) {
      console.error('Login failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data preview:', error.response.data.substring(0, 500));
      }
      return false;
    }
  }

  getAuthenticatedHeaders() {
    if (!this.isAuthenticated || !this.sessionCookies) {
      throw new Error('Not authenticated. Please login first.');
    }
    
    return {
      ...AUTH_HEADERS,
      'Cookie': this.sessionCookies
    };
  }

  isLoggedIn() {
    return this.isAuthenticated;
  }

  logout() {
    this.sessionCookies = null;
    this.csrfToken = null;
    this.isAuthenticated = false;
    console.log('Logged out');
  }
}

module.exports = MountainProjectAuth; 
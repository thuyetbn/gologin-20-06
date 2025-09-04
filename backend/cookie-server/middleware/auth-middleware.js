/**
 * Authentication Middleware
 * Xử lý authentication và authorization
 */

export class AuthMiddleware {
  constructor(database) {
    this.db = database;
  }

  async authenticate(req, res, next) {
    try {
      const apiKey = this.extractApiKey(req);
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: 'API key is required',
          message: 'Provide API key in Authorization header or X-API-Key header'
        });
      }

      // Get user by API key
      const user = await this.db.getUserByApiKey(apiKey);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API key'
        });
      }

      // Attach user to request
      req.user = user;
      req.apiKey = apiKey;
      
      next();
      
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  }

  async requireAdmin(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    next();
  }

  extractApiKey(req) {
    // Try Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try X-API-Key header
    const apiKeyHeader = req.headers['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Try query parameter (less secure, for testing only)
    if (process.env.NODE_ENV === 'development' && req.query.api_key) {
      return req.query.api_key;
    }

    return null;
  }
}

export class ValidationMiddleware {
  validateProfile(req, res, next) {
    const { name, description, gologinProfileId, settings } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Profile name is required and must be a non-empty string'
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Profile name must be less than 100 characters'
      });
    }

    // Validate optional fields
    if (description && typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Description must be a string'
      });
    }

    if (description && description.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Description must be less than 500 characters'
      });
    }

    if (gologinProfileId && typeof gologinProfileId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'GoLogin profile ID must be a string'
      });
    }

    if (settings && typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Settings must be an object'
      });
    }

    // Sanitize data
    req.body.name = name.trim();
    if (description) {
      req.body.description = description.trim();
    }

    next();
  }

  validateCookies(req, res, next) {
    const { cookies, replace } = req.body;

    // Validate cookies array
    if (!cookies || !Array.isArray(cookies)) {
      return res.status(400).json({
        success: false,
        error: 'Cookies must be an array'
      });
    }

    if (cookies.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cookies array cannot be empty'
      });
    }

    if (cookies.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Too many cookies (max 10,000 per request)'
      });
    }

    // Validate each cookie
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const error = this.validateSingleCookie(cookie, i);
      if (error) {
        return res.status(400).json({
          success: false,
          error
        });
      }
    }

    // Validate replace flag
    if (replace !== undefined && typeof replace !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Replace flag must be a boolean'
      });
    }

    next();
  }

  validateBrowserHistory(req, res, next) {
    const { history, replace } = req.body;

    if (!history || !Array.isArray(history)) {
      return res.status(400).json({
        success: false,
        error: 'History must be an array'
      });
    }

    if (history.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'History array cannot be empty'
      });
    }

    if (history.length > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Too many history items (max 50,000 per request)'
      });
    }

    // Validate each history item
    for (let i = 0; i < history.length; i++) {
      const item = history[i];
      const error = this.validateSingleHistoryItem(item, i);
      if (error) {
        return res.status(400).json({
          success: false,
          error
        });
      }
    }

    if (replace !== undefined && typeof replace !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Replace flag must be a boolean'
      });
    }

    next();
  }

  validatePasswords(req, res, next) {
    const { passwords, replace, encrypt } = req.body;

    if (!passwords || !Array.isArray(passwords)) {
      return res.status(400).json({
        success: false,
        error: 'Passwords must be an array'
      });
    }

    if (passwords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Passwords array cannot be empty'
      });
    }

    if (passwords.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Too many passwords (max 10,000 per request)'
      });
    }

    // Validate each password
    for (let i = 0; i < passwords.length; i++) {
      const password = passwords[i];
      const error = this.validateSinglePassword(password, i);
      if (error) {
        return res.status(400).json({
          success: false,
          error
        });
      }
    }

    if (replace !== undefined && typeof replace !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Replace flag must be a boolean'
      });
    }

    if (encrypt !== undefined && typeof encrypt !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Encrypt flag must be a boolean'
      });
    }

    next();
  }

  validateBookmarks(req, res, next) {
    const { bookmarks, replace } = req.body;

    if (!bookmarks || !Array.isArray(bookmarks)) {
      return res.status(400).json({
        success: false,
        error: 'Bookmarks must be an array'
      });
    }

    if (bookmarks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bookmarks array cannot be empty'
      });
    }

    if (bookmarks.length > 20000) {
      return res.status(400).json({
        success: false,
        error: 'Too many bookmarks (max 20,000 per request)'
      });
    }

    // Validate each bookmark
    for (let i = 0; i < bookmarks.length; i++) {
      const bookmark = bookmarks[i];
      const error = this.validateSingleBookmark(bookmark, i);
      if (error) {
        return res.status(400).json({
          success: false,
          error
        });
      }
    }

    if (replace !== undefined && typeof replace !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Replace flag must be a boolean'
      });
    }

    next();
  }

  validateSingleHistoryItem(item, index) {
    if (!item || typeof item !== 'object') {
      return `History item ${index}: must be an object`;
    }

    if (!item.url || typeof item.url !== 'string') {
      return `History item ${index}: url is required and must be a string`;
    }

    if (item.url.length > 2048) {
      return `History item ${index}: url must be less than 2048 characters`;
    }

    if (item.title && typeof item.title !== 'string') {
      return `History item ${index}: title must be a string`;
    }

    if (item.title && item.title.length > 1000) {
      return `History item ${index}: title must be less than 1000 characters`;
    }

    if (item.visitCount && (!Number.isInteger(item.visitCount) || item.visitCount < 0)) {
      return `History item ${index}: visitCount must be a positive integer`;
    }

    if (item.lastVisitTime && isNaN(new Date(item.lastVisitTime).getTime())) {
      return `History item ${index}: lastVisitTime must be a valid date`;
    }

    return null;
  }

  validateSinglePassword(password, index) {
    if (!password || typeof password !== 'object') {
      return `Password ${index}: must be an object`;
    }

    if (!password.originUrl || typeof password.originUrl !== 'string') {
      return `Password ${index}: originUrl is required and must be a string`;
    }

    if (password.originUrl.length > 2048) {
      return `Password ${index}: originUrl must be less than 2048 characters`;
    }

    if (!password.passwordValue || typeof password.passwordValue !== 'string') {
      return `Password ${index}: passwordValue is required and must be a string`;
    }

    if (password.passwordValue.length > 1000) {
      return `Password ${index}: passwordValue must be less than 1000 characters`;
    }

    if (password.usernameValue && typeof password.usernameValue !== 'string') {
      return `Password ${index}: usernameValue must be a string`;
    }

    if (password.usernameValue && password.usernameValue.length > 500) {
      return `Password ${index}: usernameValue must be less than 500 characters`;
    }

    return null;
  }

  validateSingleBookmark(bookmark, index) {
    if (!bookmark || typeof bookmark !== 'object') {
      return `Bookmark ${index}: must be an object`;
    }

    if (!bookmark.title || typeof bookmark.title !== 'string') {
      return `Bookmark ${index}: title is required and must be a string`;
    }

    if (bookmark.title.length > 500) {
      return `Bookmark ${index}: title must be less than 500 characters`;
    }

    if (bookmark.type === 'url' && (!bookmark.url || typeof bookmark.url !== 'string')) {
      return `Bookmark ${index}: url is required for url type bookmarks`;
    }

    if (bookmark.url && bookmark.url.length > 2048) {
      return `Bookmark ${index}: url must be less than 2048 characters`;
    }

    const validTypes = ['url', 'folder'];
    if (bookmark.type && !validTypes.includes(bookmark.type)) {
      return `Bookmark ${index}: type must be one of ${validTypes.join(', ')}`;
    }

    return null;
  }

  validateSingleCookie(cookie, index) {
    if (!cookie || typeof cookie !== 'object') {
      return `Cookie ${index}: must be an object`;
    }

    // Required fields
    if (!cookie.name || typeof cookie.name !== 'string') {
      return `Cookie ${index}: name is required and must be a string`;
    }

    if (cookie.name.length > 255) {
      return `Cookie ${index}: name must be less than 255 characters`;
    }

    if (cookie.value === undefined || cookie.value === null) {
      return `Cookie ${index}: value is required`;
    }

    if (typeof cookie.value !== 'string' && typeof cookie.value !== 'number') {
      return `Cookie ${index}: value must be a string or number`;
    }

    if (String(cookie.value).length > 4096) {
      return `Cookie ${index}: value must be less than 4096 characters`;
    }

    if (!cookie.domain || typeof cookie.domain !== 'string') {
      return `Cookie ${index}: domain is required and must be a string`;
    }

    if (cookie.domain.length > 255) {
      return `Cookie ${index}: domain must be less than 255 characters`;
    }

    // Optional fields validation
    if (cookie.path && typeof cookie.path !== 'string') {
      return `Cookie ${index}: path must be a string`;
    }

    if (cookie.path && cookie.path.length > 255) {
      return `Cookie ${index}: path must be less than 255 characters`;
    }

    if (cookie.expires && isNaN(new Date(cookie.expires).getTime())) {
      return `Cookie ${index}: expires must be a valid date`;
    }

    if (cookie.httpOnly !== undefined && typeof cookie.httpOnly !== 'boolean') {
      return `Cookie ${index}: httpOnly must be a boolean`;
    }

    if (cookie.secure !== undefined && typeof cookie.secure !== 'boolean') {
      return `Cookie ${index}: secure must be a boolean`;
    }

    const validSameSite = ['Strict', 'Lax', 'None'];
    if (cookie.sameSite && !validSameSite.includes(cookie.sameSite)) {
      return `Cookie ${index}: sameSite must be one of ${validSameSite.join(', ')}`;
    }

    return null; // No error
  }
}

export class LoggingMiddleware {
  constructor() {
    this.requestCount = 0;
  }

  log(req, res, next) {
    const startTime = Date.now();
    this.requestCount++;
    
    const requestId = `req_${this.requestCount}_${Date.now()}`;
    req.requestId = requestId;

    // Log request
    console.log(`📥 [${requestId}] ${req.method} ${req.originalUrl} - ${req.ip}`);
    
    if (req.user) {
      console.log(`👤 [${requestId}] User: ${req.user.username} (${req.user.id})`);
    }

    // Log request body for non-GET requests (excluding sensitive data)
    if (req.method !== 'GET' && req.body) {
      const logBody = { ...req.body };
      
      // Remove sensitive data from logs
      if (logBody.cookies && Array.isArray(logBody.cookies)) {
        logBody.cookies = `[${logBody.cookies.length} cookies]`;
      }
      
      console.log(`📝 [${requestId}] Body:`, logBody);
    }

    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(data) {
      const duration = Date.now() - startTime;
      
      console.log(`📤 [${requestId}] ${res.statusCode} - ${duration}ms`);
      
      if (res.statusCode >= 400) {
        console.log(`❌ [${requestId}] Error:`, data.error || data.message);
      }
      
      return originalJson.call(this, data);
    };

    next();
  }
}

/**
 * Custom Cookie Storage Server
 * Independent server để lưu trữ và quản lý cookies
 */

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { CookieDatabase } from './database/cookie-database.js';
import { AuthMiddleware } from './middleware/auth-middleware.js';
import { LoggingMiddleware } from './middleware/logging-middleware.js';
import { ValidationMiddleware } from './middleware/validation-middleware.js';
import { CookieService } from './services/cookie-service.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CookieServer {
  constructor(options = {}) {
    this.app = express();
    this.port = options.port || process.env.COOKIE_SERVER_PORT || 3001;
    this.host = options.host || process.env.COOKIE_SERVER_HOST || 'localhost';
    this.dbPath = options.dbPath || process.env.COOKIE_DB_PATH || join(__dirname, 'data', 'cookies.db');
    
    this.database = new CookieDatabase(this.dbPath);
    this.cookieService = new CookieService(this.database);
    this.authMiddleware = new AuthMiddleware();
    this.validationMiddleware = new ValidationMiddleware();
    this.loggingMiddleware = new LoggingMiddleware();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Profile-ID', 'X-API-Key']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Custom middleware
    this.app.use(this.loggingMiddleware.log.bind(this.loggingMiddleware));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime()
      });
    });

    // API Info
    this.app.get('/api/info', (req, res) => {
      res.json({
        name: 'Cookie Storage Server',
        version: '1.0.0',
        description: 'Custom cookie storage and synchronization server',
        endpoints: {
          profiles: '/api/profiles',
          cookies: '/api/profiles/:profileId/cookies',
          sync: '/api/profiles/:profileId/sync',
          backup: '/api/profiles/:profileId/backup'
        }
      });
    });

    // Authentication required for all API routes
    this.app.use('/api', this.authMiddleware.authenticate.bind(this.authMiddleware));

    // Profile routes
    this.setupProfileRoutes();
    
    // Cookie routes
    this.setupCookieRoutes();

    // Browser data routes
    this.setupBrowserDataRoutes();

    // Sync routes
    this.setupSyncRoutes();

    // Backup routes
    this.setupBackupRoutes();

    // Admin routes
    this.setupAdminRoutes();

    // Static files for admin dashboard
    this.app.use('/admin', express.static(join(__dirname, 'public')));
  }

  setupProfileRoutes() {
    // Get all profiles
    this.app.get('/api/profiles', async (req, res) => {
      try {
        const profiles = await this.cookieService.getAllProfiles(req.user.id);
        res.json({
          success: true,
          data: profiles,
          count: profiles.length
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get profile info
    this.app.get('/api/profiles/:profileId', async (req, res) => {
      try {
        const { profileId } = req.params;
        const profile = await this.cookieService.getProfile(profileId, req.user.id);
        
        if (!profile) {
          return res.status(404).json({
            success: false,
            error: 'Profile not found'
          });
        }

        res.json({
          success: true,
          data: profile
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Create profile
    this.app.post('/api/profiles', 
      this.validationMiddleware.validateProfile.bind(this.validationMiddleware),
      async (req, res) => {
        try {
          const profileData = {
            ...req.body,
            userId: req.user.id
          };
          
          const profile = await this.cookieService.createProfile(profileData);
          
          res.status(201).json({
            success: true,
            data: profile,
            message: 'Profile created successfully'
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      }
    );

    // Delete profile
    this.app.delete('/api/profiles/:profileId', async (req, res) => {
      try {
        const { profileId } = req.params;
        const deleted = await this.cookieService.deleteProfile(profileId, req.user.id);
        
        if (!deleted) {
          return res.status(404).json({
            success: false,
            error: 'Profile not found'
          });
        }

        res.json({
          success: true,
          message: 'Profile deleted successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  setupCookieRoutes() {
    // Get cookies for profile
    this.app.get('/api/profiles/:profileId/cookies', async (req, res) => {
      try {
        const { profileId } = req.params;
        const { domain, limit, offset } = req.query;
        
        const cookies = await this.cookieService.getCookies(profileId, req.user.id, {
          domain,
          limit: parseInt(limit) || 1000,
          offset: parseInt(offset) || 0
        });

        res.json({
          success: true,
          data: cookies,
          count: cookies.length
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Upload cookies
    this.app.post('/api/profiles/:profileId/cookies',
      this.validationMiddleware.validateCookies.bind(this.validationMiddleware),
      async (req, res) => {
        try {
          const { profileId } = req.params;
          const { cookies, replace = false } = req.body;
          
          const result = await this.cookieService.saveCookies(
            profileId, 
            req.user.id, 
            cookies, 
            { replace }
          );

          res.json({
            success: true,
            data: result,
            message: `${replace ? 'Replaced' : 'Added'} ${result.savedCount} cookies`
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      }
    );

    // Delete cookies
    this.app.delete('/api/profiles/:profileId/cookies', async (req, res) => {
      try {
        const { profileId } = req.params;
        const { domain, name } = req.query;
        
        const deletedCount = await this.cookieService.deleteCookies(
          profileId, 
          req.user.id, 
          { domain, name }
        );

        res.json({
          success: true,
          data: { deletedCount },
          message: `Deleted ${deletedCount} cookies`
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  setupBrowserDataRoutes() {
    // Browser history routes
    this.app.get('/api/profiles/:profileId/history', async (req, res) => {
      try {
        const { profileId } = req.params;
        const { limit, offset, search } = req.query;

        const history = await this.cookieService.getBrowserHistory(profileId, req.user.id, {
          limit: parseInt(limit) || 1000,
          offset: parseInt(offset) || 0,
          search
        });

        res.json({
          success: true,
          data: history,
          count: history.length
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/profiles/:profileId/history',
      this.validationMiddleware.validateBrowserHistory.bind(this.validationMiddleware),
      async (req, res) => {
        try {
          const { profileId } = req.params;
          const { history, replace = false } = req.body;

          const result = await this.cookieService.saveBrowserHistory(
            profileId,
            req.user.id,
            history,
            { replace }
          );

          res.json({
            success: true,
            data: result,
            message: `${replace ? 'Replaced' : 'Added'} ${result.savedCount} history items`
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      }
    );

    // Saved passwords routes
    this.app.get('/api/profiles/:profileId/passwords', async (req, res) => {
      try {
        const { profileId } = req.params;
        const { limit, offset, decrypt = false } = req.query;

        const passwords = await this.cookieService.getSavedPasswords(profileId, req.user.id, {
          limit: parseInt(limit) || 1000,
          offset: parseInt(offset) || 0,
          decrypt: decrypt === 'true'
        });

        res.json({
          success: true,
          data: passwords,
          count: passwords.length
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/profiles/:profileId/passwords',
      this.validationMiddleware.validatePasswords.bind(this.validationMiddleware),
      async (req, res) => {
        try {
          const { profileId } = req.params;
          const { passwords, replace = false, encrypt = true } = req.body;

          const result = await this.cookieService.saveSavedPasswords(
            profileId,
            req.user.id,
            passwords,
            { replace, encrypt }
          );

          res.json({
            success: true,
            data: result,
            message: `${replace ? 'Replaced' : 'Added'} ${result.savedCount} passwords`
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      }
    );

    // Bookmarks routes
    this.app.get('/api/profiles/:profileId/bookmarks', async (req, res) => {
      try {
        const { profileId } = req.params;
        const { limit, offset, parentId } = req.query;

        const bookmarks = await this.cookieService.getBookmarks(profileId, req.user.id, {
          limit: parseInt(limit) || 1000,
          offset: parseInt(offset) || 0,
          parentId: parentId === 'null' ? null : parentId
        });

        res.json({
          success: true,
          data: bookmarks,
          count: bookmarks.length
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/profiles/:profileId/bookmarks',
      this.validationMiddleware.validateBookmarks.bind(this.validationMiddleware),
      async (req, res) => {
        try {
          const { profileId } = req.params;
          const { bookmarks, replace = false } = req.body;

          const result = await this.cookieService.saveBookmarks(
            profileId,
            req.user.id,
            bookmarks,
            { replace }
          );

          res.json({
            success: true,
            data: result,
            message: `${replace ? 'Replaced' : 'Added'} ${result.savedCount} bookmarks`
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      }
    );

    // All browser data endpoint
    this.app.get('/api/profiles/:profileId/browser-data', async (req, res) => {
      try {
        const { profileId } = req.params;
        const { types = 'cookies,history,passwords,bookmarks' } = req.query;

        const requestedTypes = types.split(',');
        const data = {};

        if (requestedTypes.includes('cookies')) {
          data.cookies = await this.cookieService.getCookies(profileId, req.user.id);
        }
        if (requestedTypes.includes('history')) {
          data.history = await this.cookieService.getBrowserHistory(profileId, req.user.id);
        }
        if (requestedTypes.includes('passwords')) {
          data.passwords = await this.cookieService.getSavedPasswords(profileId, req.user.id, { decrypt: false });
        }
        if (requestedTypes.includes('bookmarks')) {
          data.bookmarks = await this.cookieService.getBookmarks(profileId, req.user.id);
        }

        res.json({
          success: true,
          data,
          types: requestedTypes
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/profiles/:profileId/browser-data', async (req, res) => {
      try {
        const { profileId } = req.params;
        const { cookies, history, passwords, bookmarks, replace = false } = req.body;

        const results = {};

        if (cookies) {
          results.cookies = await this.cookieService.saveCookies(profileId, req.user.id, cookies, { replace });
        }
        if (history) {
          results.history = await this.cookieService.saveBrowserHistory(profileId, req.user.id, history, { replace });
        }
        if (passwords) {
          results.passwords = await this.cookieService.saveSavedPasswords(profileId, req.user.id, passwords, { replace });
        }
        if (bookmarks) {
          results.bookmarks = await this.cookieService.saveBookmarks(profileId, req.user.id, bookmarks, { replace });
        }

        res.json({
          success: true,
          data: results,
          message: 'Browser data saved successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  setupSyncRoutes() {
    // Sync status
    this.app.get('/api/profiles/:profileId/sync', async (req, res) => {
      try {
        const { profileId } = req.params;
        const syncStatus = await this.cookieService.getSyncStatus(profileId, req.user.id);

        res.json({
          success: true,
          data: syncStatus
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Trigger sync
    this.app.post('/api/profiles/:profileId/sync', async (req, res) => {
      try {
        const { profileId } = req.params;
        const { direction = 'both' } = req.body;
        
        const syncResult = await this.cookieService.performSync(
          profileId, 
          req.user.id, 
          direction
        );

        res.json({
          success: true,
          data: syncResult,
          message: 'Sync completed successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  setupBackupRoutes() {
    // Create backup
    this.app.post('/api/profiles/:profileId/backup', async (req, res) => {
      try {
        const { profileId } = req.params;
        const backup = await this.cookieService.createBackup(profileId, req.user.id);
        
        res.json({
          success: true,
          data: backup,
          message: 'Backup created successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // List backups
    this.app.get('/api/profiles/:profileId/backups', async (req, res) => {
      try {
        const { profileId } = req.params;
        const backups = await this.cookieService.getBackups(profileId, req.user.id);
        
        res.json({
          success: true,
          data: backups,
          count: backups.length
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Restore backup
    this.app.post('/api/profiles/:profileId/backups/:backupId/restore', async (req, res) => {
      try {
        const { profileId, backupId } = req.params;
        const result = await this.cookieService.restoreBackup(
          profileId, 
          backupId, 
          req.user.id
        );
        
        res.json({
          success: true,
          data: result,
          message: 'Backup restored successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  setupAdminRoutes() {
    // Admin dashboard
    this.app.get('/admin', (req, res) => {
      res.sendFile(join(__dirname, 'public', 'admin.html'));
    });

    // Admin API - Statistics
    this.app.get('/api/admin/stats', 
      this.authMiddleware.requireAdmin.bind(this.authMiddleware),
      async (req, res) => {
        try {
          const stats = await this.cookieService.getSystemStats();
          res.json({
            success: true,
            data: stats
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      }
    );
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Server Error:', error);
      
      res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    });
  }

  async start() {
    try {
      // Initialize database
      await this.database.initialize();
      console.log('✅ Database initialized');

      // Start server
      this.server = this.app.listen(this.port, this.host, () => {
        console.log(`🚀 Cookie Server running on http://${this.host}:${this.port}`);
        console.log(`📊 Admin Dashboard: http://${this.host}:${this.port}/admin`);
        console.log(`🔍 API Info: http://${this.host}:${this.port}/api/info`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.stop());
      process.on('SIGINT', () => this.stop());

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  async stop() {
    console.log('🛑 Shutting down server...');
    
    if (this.server) {
      this.server.close();
    }
    
    if (this.database) {
      await this.database.close();
    }
    
    console.log('✅ Server stopped gracefully');
    process.exit(0);
  }
}

export { CookieServer };

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new CookieServer();
  server.start();
}

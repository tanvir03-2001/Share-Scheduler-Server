# Scheduling Engine

This is the dedicated scheduling engine for content posts. All scheduling-related functionality is centralized here to make it clear where content scheduling operations are handled.

## 🎯 Purpose

The Scheduling Engine is responsible for:
- Automatically processing scheduled content posts
- Managing cron-based scheduling
- Providing API endpoints for scheduling operations
- Monitoring scheduling engine health and status

## 📁 File Structure

```
scheduling/
├── scheduling.engine.ts      # Core scheduling logic and cron jobs
├── scheduling.controller.ts  # API controllers for scheduling operations
├── scheduling.routes.ts      # API routes for scheduling endpoints
├── scheduling.types.ts       # TypeScript interfaces and types
├── index.ts                  # Main export file
└── README.md                 # This documentation
```

## 🚀 Features

### Core Engine (`scheduling.engine.ts`)
- **Automatic Scheduling**: Runs every minute to check for scheduled posts
- **Manual Triggering**: Allows manual processing for testing/debugging
- **Status Monitoring**: Provides engine status and health information
- **Immediate Scheduling**: Can schedule content for immediate processing

### API Endpoints (`scheduling.routes.ts`)
- `GET /api/scheduling-engine/status` - Get engine status
- `GET /api/scheduling-engine/health` - Health check
- `POST /api/scheduling-engine/trigger` - Manual trigger processing
- `POST /api/scheduling-engine/schedule-immediate/:contentId` - Schedule immediate
- `GET /api/scheduling-engine/upcoming` - Get upcoming posts
- `GET /api/scheduling-engine/history` - Get scheduling history

### Type Safety (`scheduling.types.ts`)
- Complete TypeScript interfaces for all scheduling operations
- Type-safe API responses and data structures
- Clear type definitions for scheduling engine configuration

## 🔧 Usage

### Starting the Engine
```typescript
import { SchedulingEngine } from './engines/scheduling';

// Start the scheduling engine
SchedulingEngine.start();
```

### Using API Endpoints
```typescript
import { schedulingRoutes } from './engines/scheduling';

// Add to your Express app
app.use('/api/scheduling-engine', schedulingRoutes);
```

### Manual Operations
```typescript
import { SchedulingEngine } from './engines/scheduling';

// Trigger manual processing
await SchedulingEngine.triggerProcessing();

// Schedule content for immediate processing
await SchedulingEngine.scheduleImmediate(contentId);

// Get engine status
const status = SchedulingEngine.getStatus();
```

## 📊 Monitoring

The scheduling engine provides comprehensive monitoring:

- **Status Endpoint**: Real-time engine status
- **Health Check**: Engine health monitoring
- **Logging**: Detailed logging for all operations
- **Metrics**: Processing statistics and performance data

## 🔄 Integration

The scheduling engine integrates with:
- **Content Service**: For content management operations
- **Facebook Service**: For Facebook posting operations
- **Logger**: For comprehensive logging
- **Cron Jobs**: For automatic scheduling

## 🛠️ Configuration

The engine uses the following configuration:
- **Cron Schedule**: `* * * * *` (every minute)
- **Retry Logic**: Built-in error handling and retry mechanisms
- **Logging**: Comprehensive logging for debugging and monitoring

## 📝 Notes

- All scheduling operations are centralized in this engine
- The engine is designed to be self-contained and easily maintainable
- Clear separation of concerns with dedicated files for each responsibility
- Type-safe implementation with comprehensive TypeScript support

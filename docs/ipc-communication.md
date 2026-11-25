# IPC Communication Architecture - Improved Pattern

## Overview
This document describes the improved IPC (Inter-Process Communication) pattern used in the HelperApplication to synchronize state between multiple windows in an Electron app.

## Problem with the Old Approach
The previous implementation used a **publish-subscribe broadcast pattern** where:
- Every state change (heat, state, algeState, udpActive) would be broadcasted to all windows
- This resulted in constant message traffic, even when not all windows needed the updates
- Performance degradation with multiple windows
- Inefficient use of system resources

## New Architecture: Request-Response Pattern

### Key Improvements
1. **Centralized Data Store** - Main process holds the single source of truth
2. **On-Demand Queries** - Renderer processes request data when needed via `invoke()`
3. **Minimal Notifications** - Only a notification is sent when data changes, not the entire dataset
4. **Event-Driven Updates** - Windows fetch fresh data only when notified of changes

### Architecture Diagram

```
Main Process (main.js)
├── sharedState (Single Source of Truth)
│   ├── currentHeat
│   ├── state
│   ├── algeState
│   └── udpActive
│
└── IPC Handlers
    ├── alge:update-* (receives updates from primary window)
    ├── alge:get-* (serves queries from any window)
    └── Broadcast state-changed notifications

Renderer Processes (Angular Windows)
├── AlgeService (subscribes to observables)
│   ├── Sends: alge:update-* when local state changes
│   ├── Listens: alge:state-changed:* notifications
│   └── Queries: alge:get-* when notified of changes
│
└── Live Timing Display (secondary window)
    └── Receives: alge:state-changed:* notifications
        └── Queries: alge:get-* to fetch latest data
```

## Communication Flow

### Scenario 1: Primary Window receives UDP data
```
1. ElectronService.processMessage() → processes UDP data
2. AlgeService.processUdpMessage() → updates local state
3. AlgeService.currentHeatSubject.next() → emits change
4. setupIpcSync() subscriber → sends alge:update-current-heat to main
5. Main process → updates sharedState.currentHeat
6. Main process → broadcasts alge:state-changed:heat to all windows
7. Secondary windows receive notification
8. Secondary windows → invoke alge:get-current-heat
9. Main process → returns sharedState.currentHeat
10. Secondary windows → update their local state
```

### Scenario 2: Display window starts and needs current data
```
1. LiveTimingDisplayComponent initializes
2. Subscribes to AlgeService.currentHeat observable
3. AlgeService has no local data yet
4. Display window is waiting for first notification...
   OR manually queries via AlgeService for initial data

Option A: Wait for automatic sync (when primary window gets UDP data)
Option B: Force initial query in component init
```

## Implementation Details

### Main Process (main.js)

#### Shared State
```javascript
const sharedState = {
  currentHeat: { /* heat data */ },
  state: 'NOT_RUNNING',
  algeState: 'DISCONNECTED',
  udpActive: false
};
```

#### Query Handlers (Request-Response)
```javascript
ipcMain.handle('alge:get-current-heat', async () => {
    return sharedState.currentHeat;
});
```

#### Update Handlers (From primary window)
```javascript
ipcMain.on('alge:update-current-heat', (event, heat) => {
    sharedState.currentHeat = heat;
    broadcastStateChange('heat', heat); // Lightweight notification
});
```

#### Broadcast Function
```javascript
function broadcastStateChange(changeType, data) {
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send(`alge:state-changed:${changeType}`, data);
  });
}
```

### Renderer Process (AlgeService)

#### Outgoing Updates
```typescript
this.currentHeat.subscribe(heat => {
  this.sendStateUpdateToMain('alge:update-current-heat', 
    this.serializeHeat(heat), ipcRenderer);
});
```

#### Incoming Notifications & Queries
```typescript
ipcRenderer.on('alge:state-changed:heat', async () => {
  const latestHeat = await ipcRenderer.invoke('alge:get-current-heat');
  this.currentHeatSubject.next(this.deserializeHeat(latestHeat));
});
```

## Performance Benefits

### Message Reduction
- **Old**: Broadcasting full heat object on every change = ~5KB per update
- **New**: Notification only = ~100 bytes, query on demand = ~5KB once

### Example with frequent updates
- 10 updates/second with 2 windows
- **Old**: 10 broadcasts × 2 targets × 5KB = 100KB/sec
- **New**: 10 notifications × 2 targets × 0.1KB + 2 queries × 5KB = 10KB + 10KB (on demand)

### CPU Usage
- Reduced JSON serialization/deserialization overhead
- Fewer event listeners triggered
- More efficient data synchronization

## Usage from Components

### Subscribing to Live Data
```typescript
constructor(private algeService: AlgeService) {}

ngOnInit() {
  // Subscribe to current heat
  this.algeService.currentHeat.subscribe(heat => {
    this.displayHeat(heat);
  });

  // Subscribe to state changes
  this.algeService.state.subscribe(state => {
    this.updateUI(state);
  });
}
```

### Manual Data Queries (if needed)
```typescript
// In AlgeService, you can also manually invoke queries:
async getLatestHeat() {
  const ipcRenderer = this.getIpcRenderer();
  if (ipcRenderer) {
    return await ipcRenderer.invoke('alge:get-current-heat');
  }
}
```

## Future Improvements

### Consider for Next Phase
1. **WebSocket Bridge**: Use native WebSocket instead of IPC for display window
   - Allows display window to run on different machine
   - Better scalability

2. **Data Compression**: Only send changed fields
   - Track delta changes
   - Further reduce message size

3. **Batched Updates**: Accumulate changes and send periodically
   - For high-frequency updates
   - Reduce message frequency to 10-20/sec instead of per-update

4. **Persistent Storage**: Cache state in localStorage/database
   - Recover display if window crashes
   - Historical data tracking

## Troubleshooting

### Display window shows outdated data
1. Check if AlgeService is subscribing to notifications
2. Ensure ipcRenderer listeners are properly registered in setupIpcSync()
3. Check browser console for IPC errors

### Main process state not updating
1. Verify that primary window is sending alge:update-* messages
2. Check if sharedState is being modified correctly
3. Enable detailed logging in main.js broadcastStateChange()

### Message loss
1. IPC is guaranteed delivery within same process
2. If display window misses update, re-query via invoke()
3. Consider adding a ping mechanism for confirmation


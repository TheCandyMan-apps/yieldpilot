# YieldPilot Progressive Web App (PWA)

YieldPilot is now an installable Progressive Web App with offline capabilities.

## What is a PWA?

A Progressive Web App gives you an app-like experience directly from your browser:
- 📱 Install to home screen (no app store needed)
- ⚡ Fast loading and smooth performance
- 📶 Works offline for viewing cached content
- 🔄 Auto-updates when new versions are available
- 🖥️ Works on all devices (phones, tablets, desktops)

## Installing YieldPilot

### From Browser (Recommended)

**On iPhone/iPad:**
1. Open YieldPilot in Safari
2. Tap the Share button (square with arrow pointing up)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"
5. YieldPilot icon appears on your home screen

**On Android:**
1. Open YieldPilot in Chrome
2. Tap the menu (⋮) in the top right
3. Tap "Add to Home screen" or "Install app"
4. Tap "Add" or "Install"
5. YieldPilot icon appears on your home screen

**On Desktop (Chrome, Edge, Brave):**
1. Open YieldPilot in your browser
2. Look for the install icon in the address bar (⊕ or computer icon)
3. Click it and select "Install"
4. YieldPilot opens as a standalone app

### Guided Installation

Visit `/install` in the app for step-by-step installation instructions.

## Offline Features

YieldPilot works partially offline after you've visited it once:

### What Works Offline:
✅ Home page shell  
✅ Navigation and UI  
✅ Previously viewed deals (read-only)  
✅ Deal summaries you've already generated  
✅ Cached images and static content  

### What Requires Internet:
❌ New property searches  
❌ Generating new AI summaries  
❌ PDF exports  
❌ Syncing new properties from Zoopla/Rightmove  
❌ User authentication (login/signup)  
❌ Real-time data updates  

## Caching Strategy

YieldPilot uses intelligent caching:

| Resource | Strategy | Duration |
|----------|----------|----------|
| App Shell (HTML/CSS/JS) | Cache First | Until update |
| Images | Cache First | 30 days |
| API Responses | Network First (5min timeout) | 5 minutes |
| Google Fonts | Cache First | 1 year |

## Updates

YieldPilot automatically checks for updates and will notify you when a new version is available.

When you see the update notification:
1. Click "Update Now" to reload with the latest version
2. Or dismiss it and update later (next time you reload the page)

## Technical Details

### Service Worker

YieldPilot uses Workbox for advanced service worker features:
- Automatic caching of static assets
- Runtime caching for API calls
- Background sync (when implemented)
- Offline fallback pages

### Manifest

The app manifest (`manifest.json`) defines:
```json
{
  "name": "YieldPilot - AI Property Deal Intelligence",
  "short_name": "YieldPilot",
  "theme_color": "#00B2A9",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait"
}
```

### Icons

PWA icons are optimized for all devices:
- 192x192: Standard Android icon
- 512x512: High-res Android icon + maskable icon
- Favicon: Browser tab icon

## Development

### Testing PWA Locally

1. Build the production app:
   ```bash
   npm run build
   ```

2. Serve the build locally:
   ```bash
   npx serve dist
   ```

3. Open in your browser (must use HTTPS or localhost)

4. Check PWA features:
   - Chrome DevTools → Application → Service Workers
   - Chrome DevTools → Application → Manifest
   - Chrome DevTools → Lighthouse → Progressive Web App audit

### Debugging Service Worker

**View active service worker:**
- Chrome: `chrome://serviceworker-internals/`
- Firefox: `about:debugging#/runtime/this-firefox`
- Safari: Develop → Service Workers

**Clear cache and service workers:**
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

### Service Worker in Development

The PWA works in development mode too. Changes are automatically reloaded, and the service worker is updated on each refresh.

## Troubleshooting

### "Install" button doesn't appear

**Possible causes:**
- Already installed (check home screen)
- Using HTTP instead of HTTPS
- Browser doesn't support PWA
- Recently dismissed the install prompt (wait 3+ days or use `/install` page)

**Solution:**
- Use the manual installation method (Share → Add to Home Screen)
- Visit `/install` for guided installation

### App doesn't work offline

**Possible causes:**
- Never visited the page while online (first visit requires internet)
- Service worker failed to register
- Cache was cleared

**Solution:**
- Visit the app once while online
- Check browser console for service worker errors
- Try reinstalling the PWA

### Old content showing after update

**Possible causes:**
- Service worker hasn't updated yet
- Hard refresh needed

**Solution:**
- Click "Update Now" when prompted
- Or force refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### Icons not showing

**Possible causes:**
- Icons not cached yet
- Manifest not loaded

**Solution:**
- Reinstall the PWA
- Clear cache and reinstall

## Best Practices

### For Users

1. **Install the app** for the best experience
2. **Keep it updated** by accepting update prompts
3. **Visit while online first** to cache content
4. **Avoid clearing browser data** to keep cached content

### For Developers

1. **Test offline mode** thoroughly
2. **Version your service worker** for cache busting
3. **Implement update prompts** for users
4. **Cache critical resources** but not everything
5. **Use network-first for dynamic data**

## Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [Apple iOS PWA Guide](https://developer.apple.com/design/human-interface-guidelines/ios/icons-and-images/custom-icons/)

## Support

For PWA-specific issues:
- Check browser console for errors
- Test in Chrome DevTools' Application panel
- Try uninstalling and reinstalling
- Contact support with browser/OS details

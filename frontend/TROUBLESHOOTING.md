# CodeJAM - Troubleshooting Guide

Common issues and their solutions.

## 🚨 Installation Issues

### Problem: `npm install` fails

**Symptoms:**
- Errors during dependency installation
- Missing packages
- Version conflicts

**Solutions:**

1. **Clear npm cache:**
```bash
npm cache clean --force
npm install
```

2. **Delete node_modules and reinstall:**
```bash
rm -rf node_modules package-lock.json
npm install
```

3. **Check Node version:**
```bash
node --version  # Should be 16+
```
If outdated, download from: https://nodejs.org/

4. **Use npm instead of yarn:**
```bash
npm install
```

---

### Problem: Port 3000 already in use

**Symptoms:**
- Error: "Port 3000 is already in use"
- Server won't start

**Solutions:**

1. **Vite will auto-select next port** (3001, 3002, etc.)
   - Just use the new port shown in terminal

2. **Or kill the process using port 3000:**

**Mac/Linux:**
```bash
lsof -ti:3000 | xargs kill
```

**Windows:**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

3. **Or specify different port:**
Edit `vite.config.js`:
```javascript
server: {
  port: 3001
}
```

---

## 💻 Development Issues

### Problem: Page doesn't reload on changes

**Symptoms:**
- Changes not reflecting in browser
- Need to manually refresh

**Solutions:**

1. **Restart dev server:**
```bash
# Stop: Ctrl+C
npm run dev
```

2. **Hard refresh browser:**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

3. **Clear browser cache:**
- Open DevTools (F12)
- Right-click refresh button
- Select "Empty Cache and Hard Reload"

---

### Problem: Styles not applying

**Symptoms:**
- Tailwind classes not working
- CSS not loading
- Broken layout

**Solutions:**

1. **Verify Tailwind is running:**
Check `index.css` has:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

2. **Restart dev server:**
```bash
npm run dev
```

3. **Check browser console:**
- F12 → Console tab
- Look for CSS errors

4. **Rebuild:**
```bash
rm -rf node_modules dist
npm install
npm run dev
```

---

### Problem: Components not rendering

**Symptoms:**
- Blank page
- React errors in console
- Components not showing

**Solutions:**

1. **Check browser console:**
```
F12 → Console tab
Look for red errors
```

2. **Common React errors:**
- Missing imports: Add import statement
- Typos in component names: Check spelling
- Missing closing tags: Check JSX syntax

3. **Verify file structure:**
```bash
ls src/components/
ls src/pages/
```

---

## 🔐 Authentication Issues

### Problem: Can't login

**Symptoms:**
- Login fails
- Redirected back to login
- Session not persisting

**Solutions:**

1. **This is a demo app** - any email/password works!
Try:
- Email: `test@test.com`
- Password: `password`

2. **Clear localStorage:**
```javascript
// In browser console (F12):
localStorage.clear()
location.reload()
```

3. **Check browser console:**
- Look for errors
- Verify localStorage is enabled

4. **Try incognito/private window:**
- Sometimes extensions block localStorage

---

### Problem: Logged out unexpectedly

**Symptoms:**
- Random logouts
- Session not persisting

**Solutions:**

1. **Don't clear browser data** during session

2. **Check localStorage:**
```javascript
// In console:
console.log(localStorage.getItem('codejam_user'))
```

3. **Browser settings:**
- Allow cookies and site data
- Disable "Clear on exit" for localhost

---

## 📁 Project Issues

### Problem: Projects not saving

**Symptoms:**
- Projects disappear after refresh
- Changes not persisting

**Solutions:**

1. **Check localStorage:**
```javascript
// In console:
console.log(localStorage.getItem('codejam_projects'))
```

2. **Verify browser storage:**
- F12 → Application tab → Local Storage
- Should see `codejam_projects` key

3. **Browser might be blocking storage:**
- Check browser settings
- Allow storage for localhost
- Try different browser

4. **Storage full:**
```javascript
// In console - check size:
let total = 0;
for(let key in localStorage) {
  total += localStorage[key].length;
}
console.log(`Storage used: ${total / 1024}KB`);
```

---

### Problem: Can't create projects

**Symptoms:**
- Modal doesn't open
- Create button doesn't work
- Projects don't appear

**Solutions:**

1. **Check console for errors:**
```
F12 → Console tab
```

2. **Try refreshing:**
```
Ctrl + Shift + R (hard refresh)
```

3. **Verify you're logged in:**
- Should see username in navbar
- If not, login again

4. **Clear and recreate:**
```javascript
localStorage.clear()
// Login again
// Try creating project
```

---

## 📝 Editor Issues

### Problem: Code editor not working

**Symptoms:**
- Can't type in editor
- Editor appears blank
- Code not saving

**Solutions:**

1. **Refresh the page:**
```
F5 or Ctrl + R
```

2. **Check if file is selected:**
- Click on a file in file explorer
- Active file should be highlighted

3. **Verify project has files:**
- Every project should have at least main file
- If empty, try creating new file

4. **Clear and reload:**
```javascript
localStorage.clear()
// Login and create new project
```

---

### Problem: Code won't run

**Symptoms:**
- Run button doesn't work
- No output shown
- Execution fails

**Solutions:**

1. **This is a demo** - execution is simulated
   - Currently shows mock output
   - Real execution requires backend

2. **Check output panel:**
   - Should show at bottom of editor
   - Look for messages

3. **Verify code is saved:**
   - Click Save button first
   - Then try Run

---

## 🔗 Sharing Issues

### Problem: Share link doesn't work

**Symptoms:**
- Link doesn't copy
- Collaborators can't access
- Share modal issues

**Solutions:**

1. **Copy manually:**
- Click in link field
- Ctrl+C or Cmd+C

2. **Verify clipboard permissions:**
- Browser might block clipboard access
- Allow clipboard in browser settings

3. **Share modal not opening:**
- Check console for errors
- Refresh and try again

---

## 🎨 UI/Display Issues

### Problem: Layout looks broken

**Symptoms:**
- Elements overlapping
- Weird spacing
- Missing styles

**Solutions:**

1. **Hard refresh:**
```
Ctrl + Shift + R
```

2. **Check zoom level:**
- Reset: Ctrl + 0
- Should be 100%

3. **Try different browser:**
- Chrome (recommended)
- Firefox
- Safari

4. **Clear browser cache:**
- Settings → Privacy → Clear browsing data
- Or Ctrl + Shift + Delete

---

### Problem: Fonts not loading

**Symptoms:**
- System fonts instead of custom fonts
- Typography looks different

**Solutions:**

1. **Check internet connection:**
- Google Fonts require internet
- Fonts load from CDN

2. **Wait for fonts to load:**
- Takes a few seconds on first load
- Refresh if needed

3. **Check browser console:**
- Look for font loading errors
- F12 → Console

---

## 🌐 Browser-Specific Issues

### Chrome
- **Issue**: Performance slow
- **Solution**: Disable extensions, clear cache

### Firefox
- **Issue**: Styles slightly different
- **Solution**: This is normal, minor differences OK

### Safari
- **Issue**: Some animations choppy
- **Solution**: Known limitation, functional though

### Edge
- **Issue**: Should work perfectly
- **Solution**: Most compatible browser

---

## 🔧 Build Issues

### Problem: Build fails

**Symptoms:**
- `npm run build` errors
- Can't create production build

**Solutions:**

1. **Check for errors:**
```bash
npm run build
# Read error messages carefully
```

2. **Clean build:**
```bash
rm -rf dist node_modules
npm install
npm run build
```

3. **Check Node version:**
```bash
node --version  # 16+
npm --version   # 8+
```

---

## 📱 Mobile/Responsive Issues

### Problem: Mobile view broken

**Symptoms:**
- Layout issues on phone/tablet
- Elements cut off

**Solutions:**

1. **This is desktop-first:**
- Best on desktop/laptop
- Mobile support basic

2. **Use desktop for editing:**
- Mobile for viewing only

3. **Rotate device:**
- Landscape mode better for editor

---

## 🆘 Still Having Issues?

### Debug Checklist
- [ ] Node version 16+
- [ ] npm version 8+
- [ ] No console errors
- [ ] localStorage enabled
- [ ] Cookies enabled
- [ ] Internet connected (for fonts)
- [ ] Modern browser
- [ ] Extensions disabled

### Getting Help

1. **Check browser console:**
```
Press F12
Look for red errors
Copy error message
```

2. **Check terminal output:**
```
Look for error messages
Note any warnings
```

3. **Clear everything and start fresh:**
```bash
# Delete all
rm -rf node_modules dist package-lock.json

# Reinstall
npm install

# Start
npm run dev

# Clear browser
localStorage.clear()
# Hard refresh: Ctrl + Shift + R
```

4. **Try different browser:**
- Chrome (recommended)
- Firefox
- Edge

### Reset to Factory Settings

If all else fails:

```bash
# Terminal:
rm -rf node_modules dist
npm install
npm run dev

# Browser Console (F12):
localStorage.clear()
sessionStorage.clear()

# Browser:
Clear cookies and cache
Hard refresh (Ctrl + Shift + R)
```

---

## 📞 Contact & Resources

- **Documentation**: See README.md
- **Setup Guide**: See SETUP_GUIDE.md
- **Features**: See FEATURES.md
- **Quick Start**: See QUICK_START.md

---

**Remember**: This is a demo application. Some features are simulated and would require a backend in production!

Good luck! 🚀

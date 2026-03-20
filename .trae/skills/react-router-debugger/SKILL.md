---
name: "react-router-debugger"
description: "Debug React Router navigation issues, especially with HashRouter and custom URL state hooks. Invoke when navigation doesn't work, URL changes but content doesn't, or useSearchParams conflicts with routing."
---

# React Router Navigation Debugger

## Purpose

This skill helps diagnose and fix React Router navigation issues, particularly:
- URL changes but page content doesn't update
- Navigation works from some pages but not others
- HashRouter-specific routing problems
- Conflicts between useSearchParams and routing

## Common Issues & Solutions

### Issue 1: useSearchParams Conflicts with HashRouter

**Symptom**: Navigation works from most pages but fails from specific pages (usually the home page).

**Root Cause**: A component (often the home page) uses `useSearchParams` or a custom hook that internally uses `useSearchParams` to manage URL state. When navigating away:
1. The component's useEffect is still listening to searchParams changes
2. HashRouter's URL format (`/#/path?s=xxx`) differs from standard URL
3. The useEffect triggers state updates that interfere with navigation

**Example Problematic Code**:
```typescript
// In a custom hook like useURLState.ts
export function useURLState<T>(paramName: string, defaultState: T) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // This effect runs on every searchParams change
  useEffect(() => {
    const urlState = getStateFromURL();
    setInternalState(urlState);
  }, [searchParams]); // <-- Problem: runs even when navigating away
}
```

**Solution**: Add path checking to ensure the hook only operates on its intended route:

```typescript
useEffect(() => {
  // Only sync state if we're on the correct page
  const currentPath = window.location.hash.replace('#', '') || '/';
  if (currentPath === '/' || currentPath === '') {
    const urlState = getStateFromURL();
    setInternalState(urlState);
  }
}, [searchParams]);
```

### Issue 2: Incorrect Nested Route Configuration

**Symptom**: Outlet doesn't render child routes.

**Common Mistakes**:
- Using `element={<Layout><Children /></Layout>}` instead of nested routes
- Forgetting to use `<Outlet />` in the Layout component
- Incorrect path definitions

**Correct Pattern**:
```tsx
// App.tsx
<Route path="/" element={<Layout />}>
  <Route index element={<Dashboard />} />
  <Route path="campaigns" element={<CampaignManagement />} />
</Route>

// Layout.tsx
export const Layout = () => {
  return (
    <div>
      <Sidebar />
      <Outlet /> {/* Child routes render here */}
    </div>
  );
};
```

### Issue 3: React Error #185 (Maximum Update Depth)

**Symptom**: Console shows "Maximum update depth exceeded" error.

**Common Causes**:
- useEffect with missing or incorrect dependencies
- State updates during render
- Functions recreated on every render used as dependencies

**Solution**:
```typescript
// Bad: Function recreated every render
const refreshData = () => { setState(...) };
useEffect(() => {
  refreshData();
}, [refreshData]); // Infinite loop!

// Good: Use useCallback with stable dependencies
const refreshData = useCallback(() => {
  setState(...);
}, []); // Empty deps = stable reference
```

## Debugging Checklist

When navigation doesn't work:

1. **Check URL changes**: Does the URL update when clicking navigation?
   - If NO: Check Link/onClick handlers
   - If YES: Check Outlet and route configuration

2. **Check for console errors**: Any React errors or warnings?
   - Error #185: Check for infinite loops in useEffect
   - 404 errors: Check route paths and imports

3. **Compare working vs non-working pages**:
   - What hooks does the problematic page use?
   - Does it use useSearchParams or custom URL hooks?
   - Does it have useEffect with URL dependencies?

4. **Verify Outlet rendering**:
   - Is `<Outlet />` present in Layout component?
   - Are child routes properly nested?

5. **Test with debug info**:
   ```tsx
   <div>Current Path: {location.pathname}</div>
   <Outlet />
   ```

## Prevention Guidelines

1. **Isolate URL state hooks**: Only use useSearchParams on pages that need it
2. **Add route guards**: Check current path before operating on URL
3. **Use replace: true**: When updating URL state to avoid history pollution
4. **Clean up effects**: Ensure useEffect cleanup functions don't interfere with navigation

## Related Skills

- `browser-test-verification`: For testing fixes in production
- `frontend-architect`: For general frontend architecture issues

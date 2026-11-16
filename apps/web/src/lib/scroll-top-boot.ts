/**
 * Runs in each root layout's <head>, before paint: turns off the browser's own scroll restoring,
 * so a reload or a page brought back from the back/forward cache opens at its top. The rest of the
 * rule (every change of page inside the app) is in components/layout/scroll-to-top.tsx.
 */
export const SCROLL_TOP_BOOT =
  'try{if("scrollRestoration"in history)history.scrollRestoration="manual";addEventListener("pageshow",function(e){if(e.persisted&&!location.hash)scrollTo(0,0)})}catch(e){}';

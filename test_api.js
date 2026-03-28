const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyNCIsImVtYWlsIjoiYWpzaWFwbm82MEBtZW4yY29ycC5jb20iLCJGaXJzdE5hbWUiOiJBbmRyZWkiLCJNaWRkbGVOYW1lIjoiSmFtIEJhY2hvIiwiTGFzdE5hbWUiOiJTaWFwbm8iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzQ2NjQxOTYsImV4cCI6MTc3NDY3MTM5Nn0.6A_m7EMkpogWJyST-9tEyHdNZbZad14dcN0wdN0lp60";

(async () => {
    try {
        const url = "http://100.124.220.52:8084/api/view-inventory-current-allocated/filter";
        console.log("Fetching", url);
        const res = await fetch(url, { 
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(10000)
        });
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Text length:", text.length, "Snippet:", text.slice(0, 500));
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
})();

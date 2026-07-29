const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyNCIsImVtYWlsIjoiYWpzaWFwbm82MEBtZW4yY29ycC5jb20iLCJGaXJzdE5hbWUiOiJBbmRyZWkiLCJNaWRkbGVOYW1lIjoiSmFtIEJhY2hvIiwiTGFzdE5hbWUiOiJTaWFwbm8iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzQ2NjQxOTYsImV4cCI6MTc3NDY3MTM5Nn0.6A_m7EMkpogWJyST-9tEyHdNZbZad14dcN0wdN0lp60";

const endpoints = [
    "/api/view-inventory-current-allocated/filter",
    "/api/inventory-report",
    "/api/inventory/filter",
    "/api/stock/report",
    "/auth/check",
    "/v3/api-docs",
    "/swagger-ui/index.html"
];

const urls = endpoints.map(e => `http://100.124.220.52:8084${e}`);

(async () => {
    for (const url of urls) {
        try {
            console.log(`\nTesting ${url}...`);
            const res = await fetch(url, { 
                headers: { Authorization: `Bearer ${token}` },
                signal: AbortSignal.timeout(5000)
            });
            console.log(`Status: ${res.status}`);
            const text = await res.text();
            console.log(`Response length: ${text.length}`);
            if (res.status === 200) {
                console.log(`SUCCESS on ${url}!`);
                console.log("Snippet:", text.slice(0, 200));
            }
        } catch (e) {
            console.log(`Error on ${url}: ${e.message}`);
        }
    }
})();

const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyNCIsImVtYWlsIjoiYWpzaWFwbm82MEBtZW4yY29ycC5jb20iLCJGaXJzdE5hbWUiOiJBbmRyZWkiLCJNaWRkbGVOYW1lIjoiSmFtIEJhY2hvIiwiTGFzdE5hbWUiOiJTaWFwbm8iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzQ2NjQxOTYsImV4cCI6MTc3NDY3MTM5Nn0.6A_m7EMkpogWJyST-9tEyHdNZbZad14dcN0wdN0lp60";

(async () => {
    try {
        const url1 = "http://100.81.225.79:8086/api/view-inventory-current-allocated/filter?branch=Makati";
        console.log("Fetching", url1);
        const res1 = await fetch(url1, { headers: { Authorization: `Bearer ${token}` } });
        console.log("Status from 8086 /filter:", res1.status);
    } catch (e) {
        console.error(e);
    }
})();

const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyNCIsImVtYWlsIjoiYWpzaWFwbm82MEBtZW4yY29ycC5jb20iLCJGaXJzdE5hbWUiOiJBbmRyZWkiLCJNaWRkbGVOYW1lIjoiSmFtIEJhY2hvIiwiTGFzdE5hbWUiOiJTaWFwbm8iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzQ2NzUzMDYsImV4cCI6MTc3NDY3MjUwNn0.-ANIBKhQu4yLKxROkNbECiSZXwTgcbSl2B-xkMBfGO4";

const url = "http://100.124.220.52:8084/api/view-inventory-current-allocated/filter";

(async () => {
    try {
        console.log("Fetching", url, "with NEW token...");
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response Snippet:", text.slice(0, 300));
    } catch (e) {
        console.error(e);
    }
})();

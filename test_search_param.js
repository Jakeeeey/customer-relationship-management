const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyNCIsImVtYWlsIjoiYWpzaWFwbm82MEBtZW4yY29ycC5jb20iLCJGaXJzdE5hbWUiOiJBbmRyZWkiLCJNaWRkbGVOYW1lIjoiSmFtIEJhY2hvIiwiTGFzdE5hbWUiOiJTaWFwbm8iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzQ2NzUzMDYsImV4cCI6MTc3NDY4MjUwNn0.-ANIBKhQu4yLKxROkNbECiSZXwTgcbSl2B-xkMBfGO4";

const url = "http://100.85.88.114:9000/api/view-inventory-current-allocated/filter?search=nabati";

(async () => {
    try {
        console.log("Fetching", url);
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Length:", text.length, "Snippet:", text.slice(0, 300));
        
        // Let's also parse it to see how many items were returned
        const data = JSON.parse(text);
        console.log("Data length:", Array.isArray(data) ? data.length : "Not an array");
    } catch (e) {
        console.error(e);
    }
})();

const API = "http://localhost:3000";

// Standard Auth Header Generator
function getAuthHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
    };
}

// Convert image files to Base64 strings asynchronously
function getBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) resolve("");
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function register(){
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch(API + "/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    alert(data.message);
    if(data.success) {
        window.location = "login.html";
    }
}

async function login(){
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const res = await fetch(API + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if(data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userEmail", email);
        window.location = "dashboard.html";
    } else {
        alert(data.message);
    }
}

function logout() {
    localStorage.clear();
    window.location = "login.html";
}

async function addItem(){
    const itemName = document.getElementById("itemName").value;
    const category = document.getElementById("category").value;
    const description = document.getElementById("description").value;
    const location = document.getElementById("location").value;
    const type = document.getElementById("type").value;
    
    const fileInput = document.getElementById("itemImage");
    let imageBase64 = "";
    if(fileInput && fileInput.files[0]) {
        imageBase64 = await getBase64(fileInput.files[0]);
    }

    const res = await fetch(API + "/add-item", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ itemName, category, description, location, type, image: imageBase64 })
    });

    const data = await res.json();
    alert(data.message);
    window.location = "dashboard.html";
}

async function submitLost(){
    const itemName = document.getElementById("itemName").value;
    const category = document.getElementById("category").value;
    const description = document.getElementById("description").value;
    const location = document.getElementById("location").value;

    const fileInput = document.getElementById("itemImage");
    let imageBase64 = "";
    if(fileInput && fileInput.files[0]) {
        imageBase64 = await getBase64(fileInput.files[0]);
    }

    const res = await fetch(API + "/add-item", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ itemName, category, description, location, type: "Lost", image: imageBase64 })
    });

    alert("Lost Item Reported");
    window.location = "lost.html";
}

async function submitFound(){
    const itemName = document.getElementById("itemName").value;
    const category = document.getElementById("category").value;
    const description = document.getElementById("description").value;
    const location = document.getElementById("location").value;

    const fileInput = document.getElementById("itemImage");
    let imageBase64 = "";
    if(fileInput && fileInput.files[0]) {
        imageBase64 = await getBase64(fileInput.files[0]);
    }

    const res = await fetch(API + "/add-item", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ itemName, category, description, location, type: "Found", image: imageBase64 })
    });

    alert("Found Item Reported");
    window.location = "found.html";
}

async function claimItemAction(id, targetReload) {
    if(!confirm("Are you sure you want to change status to claimed?")) return;
    const res = await fetch(`${API}/items/claim/${id}`, {
        method: "PUT",
        headers: getAuthHeaders()
    });
    const data = await res.json();
    alert(data.message);
    
    if(targetReload === 'dashboard') loadDashboard();
    if(targetReload === 'lost') loadLostItems();
    if(targetReload === 'found') loadFoundItems();
}

async function deleteItemAction(id) {
    if(!confirm("Are you sure you want to remove this report?")) return;
    const res = await fetch(`${API}/delete/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    const data = await res.json();
    alert(data.message);
    loadMyReports();
}

/* ==========================================
   LOAD ENGINE LOGIC (WITH RE-ENGINEERED MULTI-FIELD SEARCH)
========================================== */
async function loadDashboard(){
    const res = await fetch(API + "/items");
    const items = await res.json();
    const dashboard = document.getElementById("dashboardItems");
    if(!dashboard) return;

    dashboard.innerHTML = "";
    let lost = 0;
    let found = 0;

    const search = document.getElementById("search")?.value.toLowerCase() || "";

    items.forEach(item => {
        if(item.type === "Lost") lost++;
        else found++;

        // Comprehensive match filtering engine across four fields
        const matchesSearch = 
            item.itemName.toLowerCase().includes(search) ||
            item.category.toLowerCase().includes(search) ||
            item.location.toLowerCase().includes(search) ||
            item.description.toLowerCase().includes(search);

        if(matchesSearch){
            const imageTag = item.image ? `<img src="${item.image}" class="item-img" alt="item thumbnail">` : '';
            const statusClass = item.status === "Claimed" ? "claimed-status" : item.type.toLowerCase();
            const actionButton = item.status !== "Claimed" ? `<button onclick="claimItemAction('${item._id}', 'dashboard')">Claim Item</button>` : `<span class="claimed-tag">Closed</span>`;

            dashboard.innerHTML += `
            <div class="item">
                ${imageTag}
                <h3>${item.itemName}</h3>
                <p><strong>Category:</strong> ${item.category}</p>
                <p>${item.description}</p>
                <p>📍 <em>${item.location}</em></p>
                <span class="badge-tag ${statusClass}">
                ${item.status === "Claimed" ? "✅ CLAIMED" : item.type.toUpperCase()}
                </span>
                <div style="margin-top: 10px;">${actionButton}</div>
            </div>
            `;
        }
    });

    if(document.getElementById("totalItems")) document.getElementById("totalItems").innerText = items.length;
    if(document.getElementById("lostCount")) document.getElementById("lostCount").innerText = lost;
    if(document.getElementById("foundCount")) document.getElementById("foundCount").innerText = found;
}

async function loadLostItems(){
    const res = await fetch(API + "/items");
    const items = await res.json();
    const list = document.getElementById("lostList");
    if(!list) return;

    list.innerHTML = "";
    const search = document.getElementById("searchLost")?.value.toLowerCase() || "";

    items.forEach(item => {
        if(item.type === "Lost") {
            const matchesSearch = 
                item.itemName.toLowerCase().includes(search) ||
                item.category.toLowerCase().includes(search) ||
                item.description.toLowerCase().includes(search) ||
                item.location.toLowerCase().includes(search);

            if(matchesSearch) {
                const imageTag = item.image ? `<img src="${item.image}" class="item-img" alt="item">` : '';
                const isClaimed = item.status === "Claimed";

                list.innerHTML += `
                <div class="item">
                    ${imageTag}
                    <h3>${item.itemName}</h3>
                    <p><strong>Category:</strong> ${item.category}</p>
                    <p><strong>Location:</strong> ${item.location}</p>
                    <p>${item.description}</p>
                    <span class="badge-tag ${isClaimed ? 'claimed-status' : 'lost'}">
                        ${isClaimed ? '✅ CLAIMED' : '🔴 LOST'}
                    </span>
                    <div style="margin-top:10px;">
                        ${!isClaimed ? `<button onclick="claimItemAction('${item._id}', 'lost')">Claim / Match Item</button>` : ''}
                    </div>
                </div>
                `;
            }
        }
    });
}

async function loadFoundItems(){
    const res = await fetch(API + "/items");
    const items = await res.json();
    const list = document.getElementById("foundList");
    if(!list) return;

    list.innerHTML = "";
    const search = document.getElementById("searchFound")?.value.toLowerCase() || "";

    items.forEach(item => {
        if(item.type === "Found") {
            const matchesSearch = 
                item.itemName.toLowerCase().includes(search) ||
                item.category.toLowerCase().includes(search) ||
                item.description.toLowerCase().includes(search) ||
                item.location.toLowerCase().includes(search);

            if(matchesSearch) {
                const imageTag = item.image ? `<img src="${item.image}" class="item-img" alt="item">` : '';
                const isClaimed = item.status === "Claimed";

                list.innerHTML += `
                <div class="item">
                    ${imageTag}
                    <h3>${item.itemName}</h3>
                    <p><strong>Category:</strong> ${item.category}</p>
                    <p><strong>Location:</strong> ${item.location}</p>
                    <p>${item.description}</p>
                    <span class="badge-tag ${isClaimed ? 'claimed-status' : 'found'}">
                        ${isClaimed ? '🔒 CLAIMED' : '🟢 FOUND'}
                    </span>
                    <div style="margin-top:10px;">
                        ${!isClaimed ? `<button onclick="claimItemAction('${item._id}', 'found')">Claim Item</button>` : ''}
                    </div>
                </div>
                `;
            }
        }
    });
}

async function loadMyReports(){
    const res = await fetch(API + "/items");
    const items = await res.json();
    const list = document.getElementById("myReports");
    if(!list) return;

    list.innerHTML = "";
    const currentEmail = localStorage.getItem("userEmail");

    items.forEach(item => {
        if(item.owner === currentEmail) {
            const imageTag = item.image ? `<img src="${item.image}" class="item-img" alt="item image">` : '';
            list.innerHTML += `
            <div class="item">
                ${imageTag}
                <h3>${item.itemName}</h3>
                <p><strong>Category:</strong> ${item.category}</p>
                <p>${item.description}</p>
                <p>📍 <em>${item.location}</em></p>
                <span class="badge-tag ${item.status === 'Claimed' ? 'claimed-status' : item.type.toLowerCase()}">${item.type} (${item.status})</span>
                <div style="margin-top:15px;">
                     <button class="delete-btn" onclick="deleteItemAction('${item._id}')">Remove Report</button>
                </div>
            </div>
            `;
        }
    });
}
// Function to toggle between themes
function toggleTheme() {
    const body = document.body;
    const isLight = body.classList.toggle("light-mode");
    
    // Save state to storage
    localStorage.setItem("theme", isLight ? "light" : "dark");
    updateThemeButtonText(isLight);
}

// Update the UI text of the button
function updateThemeButtonText(isLight) {
    const btn = document.getElementById("themeToggleBtn");
    if (btn) {
        btn.innerHTML = isLight ? "☀️ Light Mode" : "🌙 Dark Mode";
    }
}

// Initialize theme checking immediately on page setup
function initTheme() {
    const savedTheme = localStorage.getItem("theme");
    const body = document.body;
    
    if (savedTheme === "light") {
        body.classList.add("light-mode");
        updateThemeButtonText(true);
    } else {
        body.classList.remove("light-mode");
        updateThemeButtonText(false);
    }
}

// Execute theme check as soon as scripts parse
document.addEventListener("DOMContentLoaded", initTheme);
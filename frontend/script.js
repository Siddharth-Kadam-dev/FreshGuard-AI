/* FreshGuard AI - beginner-friendly source layout
   This file controls login/register, inventory, expiry alerts, predictions,
   shopping-list actions, and saving data in the browser.
   The logic and UI behavior are kept the same. */

/* ==================== DATE, ID, AND TEXT HELPERS ==================== */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const todayISO = () => {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateText = value => value ? new Date(value + "T00:00:00").toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}) : "Not set";
const daysTo = value => value ? Math.ceil((new Date(value+"T00:00:00") - new Date(todayISO()+"T00:00:00"))/86400000) : null;
/* ==================== STARTER DATA ==================== */
const icons = {Grains:"🌾",Dairy:"🥛",Vegetables:"🥬",Fruits:"🍎",Meat:"🍗",Household:"🧴",Other:"📦"};
const seedItems = [
 {id:uid(),name:"Rice",category:"Grains",quantity:5,unit:"kg",location:"Pantry",purchase:todayISO(),expiry:"",threshold:1},
 {id:uid(),name:"Milk",category:"Dairy",quantity:1,unit:"litre",location:"Fridge",purchase:todayISO(),expiry:addDays(2),threshold:1},
 {id:uid(),name:"Tomatoes",category:"Vegetables",quantity:.5,unit:"kg",location:"Fridge",purchase:todayISO(),expiry:addDays(3),threshold:1},
 {id:uid(),name:"Onions",category:"Vegetables",quantity:2,unit:"kg",location:"Kitchen",purchase:todayISO(),expiry:addDays(12),threshold:1},
 {id:uid(),name:"Dish soap",category:"Household",quantity:2,unit:"pieces",location:"Kitchen",purchase:todayISO(),expiry:"",threshold:1}
];


function addDays(n){const d=new Date();d.setDate(d.getDate()+n);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
/* ==================== SAVED DATA ==================== */
let items = load("fg_items", seedItems);
let usage = load("fg_usage", []);
let shopping = load("fg_shopping", []);
let profile = load("fg_profile", {name:"FreshGuard User",email:""});
let activeExpiryFilter = "all";
let toastTimer;
/* ==================== STORAGE AND SMALL HELPERS ==================== */


function load(key, fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}


function save(){localStorage.setItem("fg_items",JSON.stringify(items));localStorage.setItem("fg_usage",JSON.stringify(usage));localStorage.setItem("fg_shopping",JSON.stringify(shopping));localStorage.setItem("fg_profile",JSON.stringify(profile))}


function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600)}
/* ==================== INVENTORY AND DASHBOARD DISPLAY ==================== */


function stockStatus(item){const d=daysTo(item.expiry);if(Number(item.quantity)===0)return {label:"Out of stock",cls:"tag-out"};if(d!==null&&d<0)return {label:"Expired",cls:"tag-expired"};if(d!==null&&d<=3)return {label:"Expiring soon",cls:"tag-soon"};if(Number(item.quantity)<=Number(item.threshold??1))return {label:"Low stock",cls:"tag-low"};return {label:"Normal",cls:"tag-normal"}}


function isLow(item){return Number(item.quantity)<=Number(item.threshold??1)}


function product(item){return `<span class="product-cell"><span class="product-emoji">${icons[item.category]||"📦"}</span>${esc(item.name)}</span>`}


function statusTag(item){const s=stockStatus(item);return `<span class="status-tag ${s.cls}">${s.label}</span>`}


function empty(message){return `<div class="empty-state"><span>🌱</span>${esc(message)}</div>`}


function table(headers,rows){if(!rows.length)return empty("Nothing to show yet. Add an item to get started.");return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`}


function itemRows(list,actions=true){return list.map(item=>`<tr><td>${product(item)}</td><td>${esc(item.category)}</td><td>${esc(item.quantity)} ${esc(item.unit)}</td><td>${esc(item.location)}</td><td>${dateText(item.expiry)}</td><td>${statusTag(item)}</td>${actions?`<td><button class="action-btn" data-edit="${item.id}">Edit</button><button class="action-btn delete" data-delete="${item.id}">Delete</button></td>`:""}</tr>`)}


function renderInventory(){const q=($("#inventorySearch")?.value||"").trim().toLowerCase();const cat=$("#categoryFilter")?.value||"";const loc=$("#locationFilter")?.value||"";const filtered=items.filter(i=>i.name.toLowerCase().includes(q)&&(!cat||i.category===cat)&&(!loc||i.location===loc));$("#inventoryTable").innerHTML=table(["ITEM","CATEGORY","QUANTITY","LOCATION","EXPIRY DATE","STATUS","ACTIONS"],itemRows(filtered));$("#dashboardInventory").innerHTML=table(["ITEM","QUANTITY","LOCATION","STATUS"],items.slice(0,5).map(i=>`<tr><td>${product(i)}</td><td>${esc(i.quantity)} ${esc(i.unit)}</td><td>${esc(i.location)}</td><td>${statusTag(i)}</td></tr>`));}


function renderAlerts(){const attention=items.filter(i=>stockStatus(i).cls!=="tag-normal").slice(0,5);$("#recentAlerts").innerHTML=attention.length?attention.map(i=>{const s=stockStatus(i);return `<div class="alert-row"><span class="alert-dot ${s.cls==="tag-expired"?"red-bg":""}">${icons[i.category]||"📦"}</span><div class="alert-info"><b>${esc(i.name)} · ${s.label}</b><small>${i.expiry?(daysTo(i.expiry)<0?`Expired ${Math.abs(daysTo(i.expiry))} day(s) ago`:`Expiry: ${dateText(i.expiry)}`):`${esc(i.quantity)} ${esc(i.unit)} remaining`}</small></div>${statusTag(i)}</div>`}).join(""):empty("Everything looks good. No urgent alerts!")}
/* ==================== EXPIRY DISPLAY ==================== */


function renderExpiry(){let list=items.filter(i=>i.expiry);if(activeExpiryFilter==="soon")list=list.filter(i=>daysTo(i.expiry)>=0&&daysTo(i.expiry)<=3);if(activeExpiryFilter==="expired")list=list.filter(i=>daysTo(i.expiry)<0);list.sort((a,b)=>daysTo(a.expiry)-daysTo(b.expiry));const rows=list.map(i=>{const d=daysTo(i.expiry);const label=d<0?`${Math.abs(d)} day(s) ago`:d===0?"Today":`${d} day(s)`;return `<tr><td>${product(i)}</td><td>${label}</td><td>${dateText(i.expiry)}</td><td>${statusTag(i)}</td><td><button class="action-btn" data-edit="${i.id}">Edit</button></td></tr>`});$("#expiryTable").innerHTML=table(["ITEM","TIME LEFT","EXPIRY DATE","STATUS","ACTION"],rows)}
/* ==================== CONSUMPTION PREDICTIONS ==================== */


function renderForecast(){const cards=items.map(item=>{const logs=usage.filter(u=>u.itemId===item.id).sort((a,b)=>a.date.localeCompare(b.date));let avg=0,days=null;if(logs.length){const total=logs.reduce((sum,u)=>sum+Number(u.quantity),0);const span=Math.max(1,Math.ceil((new Date(logs.at(-1).date+"T00:00:00")-new Date(logs[0].date+"T00:00:00"))/86400000)+1);avg=total/span;if(avg>0)days=Math.ceil(Number(item.quantity)/avg)}return {item,logs,avg,days}}).filter(x=>x.logs.length).sort((a,b)=>(a.days??Infinity)-(b.days??Infinity));$("#forecastCards").innerHTML=cards.length?cards.slice(0,5).map(x=>`<div class="forecast-card"><div class="forecast-head"><b>${esc(x.item.name)}</b>${statusTag(x.item)}</div><div class="forecast-days">${x.days===null?"Not enough data":`${x.days} day${x.days===1?"":"s"}`}</div><p>${x.avg.toFixed(2)} ${esc(x.item.unit)} average use per day · Current stock ${esc(x.item.quantity)} ${esc(x.item.unit)}</p></div>`).join(""):empty("Log consumption for an item to start estimating how long it may last.");const totals={};usage.forEach(u=>{totals[u.itemName]=(totals[u.itemName]||0)+Number(u.quantity)});const chartData=Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,6);const max=Math.max(1,...chartData.map(x=>x[1]));$("#usageChart").innerHTML=chartData.length?chartData.map(([name,value])=>`<div class="bar-item" title="${esc(name)}: ${value}"><div class="bar" style="height:${Math.max(4,value/max*100)}%"></div><small>${esc(name.length>9?name.slice(0,8)+"…":name)}</small></div>`).join(""):empty("Log usage to see your chart.");const rows=usage.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(u=>`<tr><td>${dateText(u.date)}</td><td>${esc(u.itemName)}</td><td>${esc(u.quantity)} ${esc(u.unit)}</td><td>${esc(u.note||"—")}</td></tr>`);$("#consumptionTable").innerHTML=table(["DATE","ITEM","QUANTITY USED","NOTE"],rows)}
/* ==================== SHOPPING LIST DISPLAY ==================== */


function renderShopping(){const checked=shopping.filter(x=>x.checked).length;$("#listTotal").textContent=shopping.length;$("#listChecked").textContent=checked;$("#listSuggested").textContent=items.filter(isLow).length;$("#shoppingList").innerHTML=shopping.length?shopping.map(s=>`<div class="shopping-row ${s.checked?"done":""}"><input type="checkbox" data-check-shopping="${s.id}" ${s.checked?"checked":""} aria-label="Mark ${esc(s.name)} complete"><div class="shopping-name"><b>${esc(s.name)}</b><small>${esc(s.quantity||"Quantity not specified")}${s.suggested?" · Suggested from inventory":""}</small></div><span class="priority ${esc(s.priority)}">${esc(s.priority)}</span><button class="action-btn delete" data-delete-shopping="${s.id}">Remove</button></div>`).join(""):empty("Your list is empty. Add items or suggest low-stock products.")}
/* ==================== PAGE AND MODAL CONTROLS ==================== */


function render(){renderInventory();renderAlerts();renderExpiry();renderForecast();renderShopping();$("#totalStat").textContent=items.length;$("#lowStat").textContent=items.filter(isLow).length;$("#expiringStat").textContent=items.filter(i=>i.expiry&&daysTo(i.expiry)>=0&&daysTo(i.expiry)<=3).length;$("#shoppingStat").textContent=shopping.filter(s=>!s.checked).length;$("#expiryNavCount").textContent=items.filter(i=>i.expiry&&daysTo(i.expiry)<=3).length;$("#shoppingNavCount").textContent=shopping.filter(s=>!s.checked).length;$("#welcomeTitle").textContent=`Good day, ${(profile.name||"there").split(" ")[0]}! 👋`;$("#avatar").textContent=(profile.name||"FG").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();$("#usageItem").innerHTML=items.length?items.map(i=>`<option value="${i.id}">${esc(i.name)} (${esc(i.unit)})</option>`).join(""):`<option value="">Add an inventory item first</option>`}


function showPage(page){const names={dashboard:"Home Dashboard",inventory:"Inventory Management",expiry:"Expiry Tracking",prediction:"Consumption & Prediction",shopping:"Smart Shopping List"};$$(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));$$(".nav-link[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#pageCrumb").textContent=names[page]||"Home Dashboard";$(".sidebar").classList.remove("open");render()}


function openModal(id){if(id==="itemModal"){$("#itemError").textContent="";$("#itemModalTitle").textContent=$("#editId").value?"Edit item":"Add new item"}if(id==="usageModal"){$("#usageError").textContent="";$("#usageDate").value=todayISO();if(!items.length){toast("Add an inventory item first.");return}}if(id==="shoppingModal")$("#shoppingError").textContent="";$("#"+id).classList.remove("hidden")}


function closeModal(id){$("#"+id).classList.add("hidden")}
/* ==================== ITEM ACTIONS ==================== */


function resetItemForm(){ $("#itemForm").reset();$("#editId").value="";$("#itemPurchase").value=todayISO();$("#itemThreshold").value="1";$("#itemError").textContent=""}


function editItem(id){const i=items.find(x=>x.id===id);if(!i)return;$("#editId").value=i.id;$("#itemName").value=i.name;$("#itemCategory").value=i.category;$("#itemQuantity").value=i.quantity;$("#itemUnit").value=i.unit;$("#itemLocation").value=i.location;$("#itemPurchase").value=i.purchase||"";$("#itemExpiry").value=i.expiry||"";$("#itemThreshold").value=i.threshold??1;openModal("itemModal")}


async function deleteItem(id) {
  const item = items.find(i => i.id === String(id));
  if (!item) return;

  if (!confirm(`Delete ${item.name} from inventory?`)) return;

  try {
    await apiRequest(`items/${id}/`, {
      method: "DELETE"
    });

    usage = usage.filter(u => String(u.itemId) !== String(id));
    await loadInventoryFromApi();
    save();
    toast("Item deleted from database.");
  } catch (error) {
    toast("Delete failed: " + error.message);
  }
}

// function deleteItem(id){const item=items.find(i=>i.id===id);if(!item)return;if(!confirm(`Delete ${item.name} from inventory?`))return;items=items.filter(i=>i.id!==id);usage=usage.filter(u=>u.itemId!==id);save();render();toast("Item deleted.")}


function addShopping(name,quantity="",priority="Medium",suggested=false){if(shopping.some(s=>s.name.toLowerCase()===name.toLowerCase()&&!s.checked)){return false}shopping.push({id:uid(),name,quantity,priority,checked:false,suggested});return true}


// function startApp(){profile.name=profile.name||"FreshGuard User";$("#authView").classList.add("hidden");$("#appView").classList.remove("hidden");save();render();showPage("dashboard")}

function startApp() {
  profile.name = profile.name || "FreshGuard User";
  $("#authView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  save();
  render();
  showPage("dashboard");
  checkExpiryOnOpen();
}

/* ==================== BUTTONS AND FORM EVENTS ==================== */
$$("[data-auth]").forEach(btn=>btn.addEventListener("click",()=>{const reg=btn.dataset.auth==="register";$$("[data-auth]").forEach(b=>b.classList.toggle("active",b===btn));$("#loginForm").classList.toggle("hidden",reg);$("#registerForm").classList.toggle("hidden",!reg)}));
// $("#loginForm").addEventListener("submit",e=>{e.preventDefault();profile.email=$("#loginEmail").value;profile.name=profile.email.split("@")[0].replace(/[._-]/g," ").replace(/\b\w/g,c=>c.toUpperCase())||"FreshGuard User";startApp();toast("Welcome to FreshGuard AI!")});
// $("#registerForm").addEventListener("submit",e=>{e.preventDefault();profile.name=$("#registerName").value.trim();profile.email=$("#registerEmail").value.trim();startApp();toast("Demo account created. Welcome!")});

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  const email = $("#loginEmail").value.trim();
  const password = $("#loginPassword").value;

  try {
    await loginApi(email, password);

    profile.email = email;
    profile.name = email.split("@")[0];
    await loadInventoryFromApi();

    startApp();
    toast("Login successful!");
  } catch (error) {
    toast("Login failed: " + error.message);
  }
});

$("#registerForm").addEventListener("submit", async e => {
  e.preventDefault();

  const name = $("#registerName").value.trim();
  const email = $("#registerEmail").value.trim();
  const password = $("#registerPassword").value;

  try {
    await registerApi(name, email, password);

    profile.name = name;
    profile.email = email;
    await loadInventoryFromApi();

    startApp();
    toast("Account created successfully!");
  } catch (error) {
    toast("Registration failed: " + error.message);
  }
});

$("#logoutBtn").addEventListener("click",()=>{if(!confirm("Log out of this demo?"))return;$("#appView").classList.add("hidden");$("#authView").classList.remove("hidden");$("#loginPassword").value="";toast("Logged out.")});
$("#mainNav").addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b)showPage(b.dataset.page)});
document.addEventListener("click",e=>{const go=e.target.closest("[data-goto]");if(go)showPage(go.dataset.goto);const edit=e.target.closest("[data-edit]");if(edit)editItem(edit.dataset.edit);const del=e.target.closest("[data-delete]");if(del)deleteItem(del.dataset.delete);const close=e.target.closest("[data-close]");if(close)closeModal(close.dataset.close);const delShop=e.target.closest("[data-delete-shopping]");if(delShop){shopping=shopping.filter(s=>s.id!==delShop.dataset.deleteShopping);save();render();toast("Removed from shopping list.")}});
$("#newItemBtn").addEventListener("click",()=>{resetItemForm();openModal("itemModal")});

// OCR label scan: extracts readable text and tries to identify a product name and expiry date.
const scanStatus = $("#scanStatus");
$("#ocrImage").addEventListener("change", async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!window.Tesseract) { scanStatus.textContent = "OCR library could not load. Check your internet connection and try again."; return; }
  scanStatus.textContent = "Reading product label… please wait.";
  try {
    const result = await Tesseract.recognize(file, "eng");
    const text = result.data.text || "";
    // Prefer text following common expiry labels; support YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY.
    const labelled = text.match(/(?:EXP(?:IRY|IRATION)?|USE\s*BY|BEST\s*BEFORE|BBE|EXP\s*DATE)[^\d]{0,15}(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2})/i);
    const anyDate = text.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/);
    const rawDate = labelled?.[1] || anyDate?.[1];
    if (!$("#itemName").value.trim()) {
      const lines = text.split(/\r?\n/).map(x=>x.trim()).filter(x=>x.length>2);
      const candidate = lines.find(x=>!/EXPIR|BEST BEFORE|USE BY|MFG|MANUFACT|NET WT|INGREDIENT|NUTRITION|MRP|BATCH|LOT|DATE/i.test(x) && /[A-Za-z]/.test(x));
      if (candidate) $("#itemName").value = candidate.replace(/[^A-Za-z0-9 &'().-]/g, "").slice(0,60).trim();
    }
    if (rawDate) {
      let iso = "";
      let m = rawDate.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
      if (m) iso = `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
      else {
        m = rawDate.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
        if (m) { let year = Number(m[3]); if (year < 100) year += year < 70 ? 2000 : 1900; const a=Number(m[1]), b=Number(m[2]); const day=a>12?a:b>12?b:a; const month=a>12?b:b>12?a:b; iso=`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`; }
      }
      if (iso && !Number.isNaN(Date.parse(iso))) $("#itemExpiry").value = iso;
      scanStatus.textContent = `Label scanned. ${rawDate ? "Expiry date detected — please verify it." : "No expiry date found; enter it manually."} Please verify the item name too.`;
    } else scanStatus.textContent = "Label scanned, but expiry date was not recognized. Please enter it manually and verify the name.";
    toast("OCR scan complete. Verify the extracted details.");
  } catch (err) { scanStatus.textContent = "Could not read this image. Try a clearer, well-lit label photo."; }
  e.target.value = "";
});


/* ==================== BARCODE SCANNER FIX ==================== */

let barcodeReader = null;
let nativeBarcodeStream = null;
let nativeBarcodeTimer = null;
let barcodeDetectBusy = false;

async function handleScannedBarcode(code) {
  scanStatus.textContent = `Barcode scanned: ${code}. Looking up product...`;

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`
    );

    if (!response.ok) throw new Error("Product lookup failed");

    const data = await response.json();
    const product = data.product;

    if (data.status === 1 && product) {
      if (product.product_name) {
        $("#itemName").value = product.product_name;
      }

      const cats = (product.categories_tags || [])
        .join(" ")
        .toLowerCase();

      if (/grain|rice|cereal|pasta|flour/.test(cats)) {
        $("#itemCategory").value = "Grains";
      } else if (/dairy|milk|cheese|yogurt/.test(cats)) {
        $("#itemCategory").value = "Dairy";
      } else if (/vegetable/.test(cats)) {
        $("#itemCategory").value = "Vegetables";
      } else if (/fruit/.test(cats)) {
        $("#itemCategory").value = "Fruits";
      }

      scanStatus.textContent =
        `Product found: ${product.product_name || "Name unavailable"}. Verify the details and enter the expiry date.`;
    } else {
      scanStatus.textContent =
        `Barcode ${code} scanned, but product was not found. Enter the item name manually.`;
      $("#itemName").focus();
    }
  } catch (error) {
    scanStatus.textContent =
      `Barcode ${code} scanned. Online lookup failed; enter product details manually.`;
  }

  if (!$("#itemQuantity").value) {
    $("#itemQuantity").value = "1";
  }

  if (!$("#itemPurchase").value) {
    $("#itemPurchase").value = todayISO();
  }

  toast("Barcode scanned. Verify details before saving.");

  if ($("#itemExpiry")) $("#itemExpiry").focus();
}

function stopNativeBarcodeScan() {
  if (nativeBarcodeTimer) {
    clearInterval(nativeBarcodeTimer);
  }

  nativeBarcodeTimer = null;
  barcodeDetectBusy = false;

  if (nativeBarcodeStream) {
    nativeBarcodeStream.getTracks().forEach(track => track.stop());
  }

  nativeBarcodeStream = null;

  const video = $("#barcodeVideo");

  if (video) {
    video.pause();
    video.srcObject = null;
    video.classList.add("hidden");
  }

  $("#stopBarcodeBtn").classList.add("hidden");
}

$("#startBarcodeBtn").addEventListener("click", async () => {
  const video = $("#barcodeVideo");

  try {
    scanStatus.textContent = "Starting camera...";

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera requires HTTPS and a supported browser.");
    }

    video.classList.remove("hidden");
    video.setAttribute("playsinline", "true");
    video.setAttribute("autoplay", "true");
    video.muted = true;

    $("#stopBarcodeBtn").classList.remove("hidden");

    // Try ZXing first because it supports more browsers.
    const Reader =
      window.ZXingBrowser?.BrowserMultiFormatReader ||
      window.ZXing?.BrowserMultiFormatReader;

    if (Reader) {
      barcodeReader = new Reader();

      scanStatus.textContent =
        "Camera on. Center the barcode and hold the phone steady.";

      await barcodeReader.decodeFromVideoDevice(
        undefined,
        video,
        async (result, error, controls) => {
          if (!result) return;

          const code = result.getText();

          try {
            controls?.stop?.();
            barcodeReader?.reset?.();
          } catch (_) {}

          barcodeReader = null;
          stopNativeBarcodeScan();

          await handleScannedBarcode(code);
        }
      );

      return;
    }

    // Native browser fallback.
    if (!("BarcodeDetector" in window)) {
      throw new Error(
        "Barcode library unavailable. Check the ZXing script in index.html."
      );
    }

    let formats = [
      "ean_13", "ean_8", "upc_a", "upc_e",
      "code_128", "code_39", "itf", "qr_code"
    ];

    if (BarcodeDetector.getSupportedFormats) {
      const supported = await BarcodeDetector.getSupportedFormats();
      formats = formats.filter(format => supported.includes(format));
    }

    if (!formats.length) {
      throw new Error("No supported barcode formats.");
    }

    const detector = new BarcodeDetector({ formats });

    nativeBarcodeStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });

    video.srcObject = nativeBarcodeStream;
    await video.play();

    scanStatus.textContent =
      "Camera on. Keep the barcode centered, flat and well-lit.";

    nativeBarcodeTimer = setInterval(async () => {
      if (
        !nativeBarcodeStream ||
        barcodeDetectBusy ||
        video.readyState < 2 ||
        !video.videoWidth
      ) {
        return;
      }

      barcodeDetectBusy = true;

      try {
        let codes = await detector.detect(video);

        // Try the center crop if the full video frame did not detect it.
        if (!codes.length) {
          const canvas = document.createElement("canvas");
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const cw = Math.floor(vw * 0.9);
          const ch = Math.floor(vh * 0.8);

          canvas.width = cw;
          canvas.height = ch;

          const ctx = canvas.getContext("2d", {
            willReadFrequently: true
          });

          ctx.drawImage(
            video,
            Math.floor((vw - cw) / 2),
            Math.floor((vh - ch) / 2),
            cw,
            ch,
            0,
            0,
            cw,
            ch
          );

          codes = await detector.detect(canvas);
        }

        const code = codes.find(item => item.rawValue)?.rawValue;

        if (code) {
          stopNativeBarcodeScan();
          await handleScannedBarcode(code);
        }
      } catch (_) {
        // Keep scanning subsequent frames.
      } finally {
        barcodeDetectBusy = false;
      }
    }, 250);

  } catch (error) {
    stopNativeBarcodeScan();

    try {
      barcodeReader?.reset?.();
    } catch (_) {}

    barcodeReader = null;

    video.classList.add("hidden");
    $("#stopBarcodeBtn").classList.add("hidden");

    scanStatus.textContent =
      "Scanner could not start. Check HTTPS, camera permission and internet. " +
      (error.message || "");
  }
});

$("#stopBarcodeBtn").addEventListener("click", () => {
  try {
    barcodeReader?.reset?.();
  } catch (_) {}

  barcodeReader = null;
  stopNativeBarcodeScan();

  scanStatus.textContent = "Camera stopped.";
});

    // Fallback for modern browsers: use the built-in BarcodeDetector, without an external library.
    if (!("BarcodeDetector" in window)) {
      scanStatus.textContent = "Barcode scanner could not load. Try Chrome on HTTPS, refresh the page, or use manual item entry.";
      return;
    }
    const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"] });
    nativeBarcodeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    video.srcObject = nativeBarcodeStream;
    video.classList.remove("hidden"); $("#stopBarcodeBtn").classList.remove("hidden");
    await video.play();
    scanStatus.textContent = "Camera on. Hold the barcode steady inside the frame.";
    nativeBarcodeTimer = setInterval(async () => {
      if (!nativeBarcodeStream || video.readyState < 2) return;
      try {
        const codes = await detector.detect(video);
        if (codes.length && codes[0].rawValue) {
          const code = codes[0].rawValue;
          stopNativeBarcodeScan();
          await handleScannedBarcode(code);
        }
      } catch (_) { /* Continue scanning on the next frame. */ }
    }, 250);
  } catch (err) {
    stopNativeBarcodeScan();
    video.classList.add("hidden"); $("#stopBarcodeBtn").classList.add("hidden");
    scanStatus.textContent = "Camera unavailable. Open the HTTPS website, allow camera permission, and try again.";
  }
});
$("#stopBarcodeBtn").addEventListener("click", () => { try { barcodeReader?.reset(); } catch (_) {} stopNativeBarcodeScan(); $("#barcodeVideo").classList.add("hidden"); $("#stopBarcodeBtn").classList.add("hidden"); scanStatus.textContent = "Camera stopped."; });

$("#itemForm").addEventListener("submit", async e => {
  e.preventDefault();

  const id = $("#editId").value;
  const name = $("#itemName").value.trim();
  const quantity = Number($("#itemQuantity").value);
  const expiry = $("#itemExpiry").value;

  if (!name || quantity < 0) {
    $("#itemError").textContent =
      "Enter a valid item name and quantity.";
    return;
  }

  if (expiry && daysTo(expiry) < 0 &&
      !confirm("This expiry date is in the past. Save anyway?")) {
    return;
  }

  const item = {
    name,
    category: $("#itemCategory").value,
    quantity,
    unit: $("#itemUnit").value,
    location: $("#itemLocation").value,
    purchase: $("#itemPurchase").value || null,
    expiry_date: expiry || null,
    threshold: Number($("#itemThreshold").value || 1)
  };

  try {
    if (id) {
      await apiRequest(`items/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(item)
      });
    } else {
      await apiRequest("items/", {
        method: "POST",
        body: JSON.stringify(item)
      });
    }

    await loadInventoryFromApi();
    closeModal("itemModal");
    resetItemForm();
    toast(id ? "Item updated in database!" :
                "Item saved to database!");
  } catch (error) {
    $("#itemError").textContent =
      "Could not save item: " + error.message;
  }
});

// $("#itemForm").addEventListener("submit",e=>{e.preventDefault();const id=$("#editId").value;const name=$("#itemName").value.trim();const quantity=Number($("#itemQuantity").value);const expiry=$("#itemExpiry").value;if(!name||quantity<0){$("#itemError").textContent="Enter a valid item name and quantity.";return}if(expiry&&daysTo(expiry)<0&&!confirm("This expiry date is in the past. Save anyway?"))return;const item={id:id||uid(),name,category:$("#itemCategory").value,quantity,unit:$("#itemUnit").value,location:$("#itemLocation").value,purchase:$("#itemPurchase").value,expiry,threshold:Number($("#itemThreshold").value||0)};if(id)items=items.map(x=>x.id===id?item:x);else items.unshift(item);save();closeModal("itemModal");render();toast(id?"Item updated.":"Item added to inventory.")});
$("#inventorySearch").addEventListener("input",renderInventory);$("#categoryFilter").addEventListener("change",renderInventory);$("#locationFilter").addEventListener("change",renderInventory);
$("#globalSearch").addEventListener("input",e=>{showPage("inventory");$("#inventorySearch").value=e.target.value;renderInventory()});
$("#expiryFilters").addEventListener("click",e=>{const b=e.target.closest("[data-expiry]");if(!b)return;activeExpiryFilter=b.dataset.expiry;$$("[data-expiry]").forEach(x=>x.classList.toggle("active",x===b));renderExpiry()});
// $("#notificationBtn").addEventListener("click",()=>{showPage("expiry");toast(`${items.filter(i=>i.expiry&&daysTo(i.expiry)<=3).length} item(s) need an expiry check.`)});
$("#logUsageBtn").addEventListener("click",()=>openModal("usageModal"));
$("#usageForm").addEventListener("submit",e=>{e.preventDefault();const item=items.find(i=>i.id===$("#usageItem").value);const quantity=Number($("#usageQuantity").value);if(!item){$("#usageError").textContent="Please add an inventory item first.";return}if(!quantity||quantity<=0){$("#usageError").textContent="Enter a quantity greater than zero.";return}if(quantity>Number(item.quantity)&&!confirm("Usage is greater than current stock. Record it anyway?"))return;item.quantity=Math.max(0,Number((Number(item.quantity)-quantity).toFixed(3)));usage.push({id:uid(),itemId:item.id,itemName:item.name,quantity,unit:item.unit,date:$("#usageDate").value||todayISO(),note:$("#usageNote").value.trim()});save();closeModal("usageModal");e.target.reset();render();toast("Consumption recorded and stock updated.")});
$("#addShoppingBtn").addEventListener("click",()=>openModal("shoppingModal"));
$("#shoppingForm").addEventListener("submit",e=>{e.preventDefault();const name=$("#shoppingName").value.trim();if(!name){$("#shoppingError").textContent="Enter an item name.";return}if(!addShopping(name,$("#shoppingQuantity").value.trim(),$("#shoppingPriority").value)){ $("#shoppingError").textContent="This item is already on your active list.";return}save();closeModal("shoppingModal");e.target.reset();render();toast("Added to shopping list.")});
$("#suggestLowBtn").addEventListener("click",()=>{let count=0;items.filter(isLow).forEach(i=>{if(addShopping(i.name,`${i.quantity} ${i.unit}`,"High",true))count++});save();render();toast(count?`${count} low-stock item(s) added.`:"No new low-stock items to add.")});
$("#shoppingList").addEventListener("change",e=>{const id=e.target.dataset.checkShopping;if(!id)return;const s=shopping.find(x=>x.id===id);if(s)s.checked=e.target.checked;save();renderShopping();$("#shoppingStat").textContent=shopping.filter(x=>!x.checked).length;$("#shoppingNavCount").textContent=shopping.filter(x=>!x.checked).length});
$("#menuBtn").addEventListener("click",()=>$(".sidebar").classList.toggle("open"));
document.addEventListener("click",e=>{if(e.target.closest("[data-page]")&&window.innerWidth<=820)$(".sidebar").classList.remove("open")});
$$(".modal-backdrop").forEach(backdrop=>backdrop.addEventListener("click",e=>{if(e.target===backdrop)closeModal(backdrop.id)}));
document.addEventListener("keydown",e=>{if(e.key==="Escape")$$(".modal-backdrop:not(.hidden)").forEach(m=>closeModal(m.id))});
$("#itemPurchase").value=todayISO();




const API_BASE = "https://freshguard-ai-7qyh.onrender.com/api/";
let authToken = localStorage.getItem("freshguardToken");

async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Token ${authToken}` } : {}),
    ...options.headers,
  };

  const response = await fetch(API_BASE + path, { ...options, headers });
  const data = response.status === 204
    ? null
    : await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || JSON.stringify(data) || `HTTP ${response.status}`);
  }

  return data;
}

function fromApi(p) {
  return {
    id: String(p.id),
    name: p.name,
    category: p.category,
    quantity: Number(p.quantity),
    unit: p.unit,
    location: p.location,
    purchase: p.purchase || "",
    expiry: p.expiry_date || "",
    threshold: Number(p.threshold ?? 1),
  };
}

function toApi(item) {
  return {
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    location: item.location,
    purchase: item.purchase || null,
    expiry_date: item.expiry || null,
    threshold: item.threshold,
  };
}

async function loadInventoryFromApi() {
  const data = await apiRequest("items/");
  items = data.map(fromApi);
  render();
}

async function loginApi(email, password) {
  const result = await apiRequest("login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  authToken = result.token;
  localStorage.setItem("freshguardToken", authToken);
  return result;
}

async function registerApi(name, email, password) {
  const result = await apiRequest("register/", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

  authToken = result.token;
  localStorage.setItem("freshguardToken", authToken);
  return result;
}



/* Restore login session after page reload */
(async function restoreSession() {
  if (!authToken) return;

  try {
    await loadInventoryFromApi();

    const response = await apiRequest("items/");
    // A valid token confirms the user is still authenticated.
    profile.email = profile.email || "";
    startApp();
  } catch (error) {
    authToken = null;
    localStorage.removeItem("freshguardToken");
    $("#appView").classList.add("hidden");
    $("#authView").classList.remove("hidden");
    console.log("Session expired or backend unavailable:", error.message);
  }
})();




/* ========== EXPIRY NOTIFICATION POPUP ========== */

// Upcoming reminders only appear at the requested milestones. Past dates are
// shown in a separate Expired Items section and never mixed into upcoming alerts.
function getExpiryPopupItems() {
  return items.filter(item => item.expiry).map(item => ({
    ...item,
    daysLeft: daysTo(item.expiry)
  }));
}
function getExpiryAlerts() {
  return getExpiryPopupItems()
    .filter(item => [15, 7, 3, 1, 0].includes(item.daysLeft))
    .sort((a, b) => a.daysLeft - b.daysLeft);
}
function getExpiredItems() {
  return getExpiryPopupItems()
    .filter(item => item.daysLeft < 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}
function expiryItemMarkup(item, expired = false) {
  const days = item.daysLeft;
  const label = expired ? `Expired ${Math.abs(days)} day(s) ago` :
    days === 0 ? "Expires today" : `Expires in ${days} day(s)`;
  return `<div class="expiry-item ${expired || days === 0 ? "expired" : ""}">
    <div class="expiry-item-icon">${icons[item.category] || "📦"}</div>
    <div class="expiry-item-info"><h3>${esc(item.name)}</h3>
      <p>Category: ${esc(item.category || "Other")}</p>
      <p>Quantity: ${esc(String(item.quantity))} ${esc(item.unit || "")}</p>
      <p>Location: ${esc(item.location || "Not specified")}</p></div>
    <div class="expiry-item-date"><strong>${esc(label)}</strong><span>${dateText(item.expiry)}</span></div>
  </div>`;
}
function showExpiryPopup() {
  const popup = $("#expiryPopup");
  const content = $("#expiryPopupContent");
  const count = $("#expiryCount");
  const expiredSection = $("#expiredPopupSection");
  const expiredContent = $("#expiredPopupContent");
  if (!popup || !content) return;

  const alerts = getExpiryAlerts();
  const expired = getExpiredItems();
  if (count) count.textContent = `${alerts.length} alert${alerts.length === 1 ? "" : "s"}`;
  content.innerHTML = alerts.length
    ? alerts.map(item => expiryItemMarkup(item)).join("")
    : `<div class="expiry-empty"><div style="font-size:32px">✅</div><h3>No upcoming milestone alerts</h3><p>No items are due at 15, 7, 3, 1 or 0 days.</p></div>`;
  if (expiredSection && expiredContent) {
    expiredSection.style.display = expired.length ? "block" : "none";
    expiredContent.innerHTML = expired.map(item => expiryItemMarkup(item, true)).join("");
  }
  popup.classList.remove("hidden");
}
function checkExpiryOnOpen() {
  if (getExpiryAlerts().length > 0 || getExpiredItems().length > 0) {
    setTimeout(showExpiryPopup, 600);
  }
}

/* Notification bell */
$("#notificationBtn").addEventListener("click", () => {
  showExpiryPopup();
});

const $ = s => document.querySelector(s);
const user = () => { try{return JSON.parse(sessionStorage.getItem("party_user")||"null")}catch(e){return null} };
const titles = {dashboard:"ภาพรวม",members:"ระบบสมาชิก",attendance:"ระบบเช็กชื่อ",behavior:"คะแนนความประพฤติ"};
function toast(msg){const el=$("#toast");el.textContent=msg;el.style.display="block";setTimeout(()=>el.style.display="none",3000)}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function showApp(){
  $("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");
  $("#userName").textContent=user()?.displayName||"สมาชิก";$("#userRole").textContent=user()?.role||"MEMBER";
  $("#avatar").textContent=(user()?.displayName||"U").slice(0,1);
  $("#today").textContent=new Intl.DateTimeFormat("th-TH",{dateStyle:"long"}).format(new Date());
  loadPage("dashboard");
}
function showLogin(){$("#appView").classList.add("hidden");$("#loginView").classList.remove("hidden")}
async function loadPage(page){
  document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  $("#pageTitle").textContent=titles[page]||page;
  const content=$("#pageContent");content.innerHTML='<div class="empty">กำลังโหลดข้อมูล...</div>';
  try{
    if(page==="dashboard") await renderDashboard(content);
    if(page==="members") await renderMembers(content);
    if(page==="attendance") await renderAttendance(content);
    if(page==="behavior") await renderBehavior(content);
  }catch(e){content.innerHTML=`<div class="panel error">${escapeHtml(e.message)}</div>`}
}
async function renderDashboard(el){
  const d=await API.call("dashboard");
  el.innerHTML=`<div class="page-heading"><div><h2>ภาพรวมพรรค</h2><p>สรุปข้อมูลการดำเนินงานและสมาชิก</p></div></div>
  <div class="stats">
    ${stat("สมาชิกทั้งหมด",d.totalMembers,"fa-users")}
    ${stat("มาเข้าร่วมวันนี้",d.todayPresent,"fa-calendar-check")}
    ${stat("มาสายวันนี้",d.todayLate,"fa-clock")}
    ${stat("รายการคะแนนรออนุมัติ",d.pendingBehavior,"fa-award")}
  </div>
  <div class="panel"><h3>ฝ่ายภายในพรรค</h3><div class="table-wrap"><table><thead><tr><th>รหัสฝ่าย</th><th>ชื่อฝ่าย</th><th>สถานะ</th></tr></thead><tbody>${(d.departments||[]).map(x=>`<tr><td>${escapeHtml(x.departmentId)}</td><td>${escapeHtml(x.name)}</td><td><span class="pill green">ใช้งาน</span></td></tr>`).join("")||'<tr><td colspan="3">ยังไม่มีข้อมูลฝ่าย</td></tr>'}</tbody></table></div></div>`;
}
function stat(label,value,icon){return `<div class="stat"><div class="stat-top"><span>${label}</span><span class="stat-icon"><i class="fa-solid ${icon}"></i></span></div><strong>${value??0}</strong></div>`}
async function renderMembers(el){
  const [members,depts]=await Promise.all([API.call("listMembers"),API.call("listDepartments")]);
  el.innerHTML=`<div class="page-heading"><div><h2>สมาชิกทั้งหมด</h2><p>จัดการข้อมูลสมาชิกภายในพรรค</p></div><button class="btn primary" id="addMember"><i class="fa-solid fa-plus"></i> เพิ่มสมาชิก</button></div>
  <div class="panel"><div class="toolbar"><input class="field" id="memberSearch" placeholder="ค้นหาชื่อหรือรหัสสมาชิก"></div><div class="table-wrap"><table><thead><tr><th>ชื่อ–นามสกุล</th><th>รหัสนักเรียน</th><th>ฝ่าย</th><th>ตำแหน่ง</th><th>สถานะ</th></tr></thead><tbody id="memberRows"></tbody></table></div></div>`;
  const draw=()=>{$("#memberRows").innerHTML=members.filter(m=>(m.firstName+" "+m.lastName+" "+m.studentCode).toLowerCase().includes($("#memberSearch").value.toLowerCase())).map(m=>`<tr><td>${escapeHtml(m.prefix)}${escapeHtml(m.firstName)} ${escapeHtml(m.lastName)}</td><td>${escapeHtml(m.studentCode)}</td><td>${escapeHtml((depts.find(d=>d.departmentId===m.departmentId)||{}).name||"-")}</td><td>${escapeHtml(m.position)}</td><td><span class="pill ${m.status==="ACTIVE"?"green":"amber"}">${escapeHtml(m.status)}</span></td></tr>`).join("")||'<tr><td colspan="5">ไม่พบข้อมูล</td></tr>'};
  $("#memberSearch").addEventListener("input",draw);draw();
  $("#addMember").onclick=()=>memberDialog(depts);
}
function memberDialog(depts){
  const first=prompt("ชื่อจริงสมาชิก");if(!first)return;
  const last=prompt("นามสกุลสมาชิก");if(!last)return;
  const studentCode=prompt("รหัสนักเรียน (ถ้ามี)")||"";
  const departmentId=prompt("รหัสฝ่าย: "+depts.map(d=>d.departmentId+"="+d.name).join(", "),depts[0]?.departmentId||"")||"";
  API.call("saveMember",{firstName:first,lastName:last,studentCode,departmentId}).then(()=>{toast("เพิ่มสมาชิกเรียบร้อย");loadPage("members")}).catch(e=>toast(e.message));
}
async function renderAttendance(el){
  const members=await API.call("listMembers");
  const records=await API.call("listAttendance");
  el.innerHTML=`<div class="page-heading"><div><h2>ระบบเช็กชื่อ</h2><p>บันทึกการประชุม กิจกรรม และการปฏิบัติหน้าที่</p></div></div>
  <div class="panel"><h3>บันทึกการเข้าร่วม</h3><div class="form-grid">
  <label>กิจกรรม<input id="eventName" class="field" placeholder="เช่น ประชุมประจำสัปดาห์"></label>
  <label>สมาชิก<select id="attMember" class="field">${members.map(m=>`<option value="${escapeHtml(m.memberId)}">${escapeHtml(m.firstName+" "+m.lastName)}</option>`).join("")}</select></label>
  <label>ประเภท<select id="eventType" class="field"><option value="MEETING">ประชุม</option><option value="ACTIVITY">กิจกรรม</option><option value="DUTY">ปฏิบัติหน้าที่</option></select></label>
  <label>สถานะ<select id="attStatus" class="field"><option value="PRESENT">มา</option><option value="LATE">สาย</option><option value="LEAVE">ลา</option><option value="ABSENT">ขาด</option></select></label></div><button class="btn primary" id="saveAttendance" style="margin-top:15px">บันทึกการเช็กชื่อ</button></div>
  <div class="panel" style="margin-top:18px"><h3>ประวัติล่าสุด</h3><div class="table-wrap"><table><thead><tr><th>กิจกรรม</th><th>สมาชิก</th><th>สถานะ</th><th>เวลา</th></tr></thead><tbody>${records.map(r=>`<tr><td>${escapeHtml(r.eventName)}</td><td>${escapeHtml(r.memberName)}</td><td>${statusPill(r.status)}</td><td>${escapeHtml(String(r.createdAt).slice(0,16).replace("T"," "))}</td></tr>`).join("")||'<tr><td colspan="4">ยังไม่มีรายการ</td></tr>'}</tbody></table></div></div>`;
  $("#saveAttendance").onclick=async()=>{try{await API.call("recordAttendance",{eventName:$("#eventName").value,eventType:$("#eventType").value,memberId:$("#attMember").value,status:$("#attStatus").value});toast("บันทึกแล้ว");loadPage("attendance")}catch(e){toast(e.message)}};
}
function statusPill(s){const map={PRESENT:["มา","green"],LATE:["สาย","amber"],LEAVE:["ลา",""],ABSENT:["ขาด","red"]};const x=map[s]||[s,""];return `<span class="pill ${x[1]}">${x[0]}</span>`}
async function renderBehavior(el){
  const [members,logs]=await Promise.all([API.call("listMembers"),API.call("listBehavior")]);
  el.innerHTML=`<div class="page-heading"><div><h2>คะแนนความประพฤติ</h2><p>คะแนนเริ่มต้น 100 คะแนน · รายการใหม่ต้องผ่านการอนุมัติ</p></div></div>
  <div class="panel"><h3>ส่งคำขอเพิ่ม / หักคะแนน</h3><div class="form-grid">
  <label>สมาชิก<select id="behMember" class="field">${members.map(m=>`<option value="${escapeHtml(m.memberId)}">${escapeHtml(m.firstName+" "+m.lastName)}</option>`).join("")}</select></label>
  <label>คะแนน (+ เพิ่ม / - หัก)<input id="behPoints" class="field" type="number" min="-30" max="30" placeholder="-5"></label>
  <label>เหตุผล<input id="behReason" class="field" placeholder="ระบุเหตุผล"></label>
  <label>ลิงก์หลักฐาน<input id="behEvidence" class="field" placeholder="https://... (ถ้ามี)"></label></div><button class="btn primary" id="sendBehavior" style="margin-top:15px">ส่งคำขอ</button></div>
  <div class="panel" style="margin-top:18px"><h3>ประวัติคะแนน</h3><div class="table-wrap"><table><thead><tr><th>สมาชิก</th><th>คะแนน</th><th>เหตุผล</th><th>สถานะ</th><th>ผู้บันทึก</th><th>การอนุมัติ</th></tr></thead><tbody>${logs.map(x=>`<tr><td>${escapeHtml(x.memberName)}</td><td>${Number(x.pointsChange)>0?"+":""}${escapeHtml(x.pointsChange)}</td><td>${escapeHtml(x.reason)}</td><td>${escapeHtml(x.status)}</td><td>${escapeHtml(x.recordedBy)}</td><td>${x.status==="PENDING"&&["ADMIN","PRESIDENT"].includes(user().role)?`<button class="btn primary" data-approve="${escapeHtml(x.logId)}">อนุมัติ</button>`:"-"}</td></tr>`).join("")||'<tr><td colspan="6">ยังไม่มีรายการ</td></tr>'}</tbody></table></div></div>`;
  $("#sendBehavior").onclick=async()=>{try{await API.call("addBehavior",{memberId:$("#behMember").value,pointsChange:Number($("#behPoints").value),reason:$("#behReason").value,evidenceUrl:$("#behEvidence").value});toast("ส่งคำขอแล้ว");loadPage("behavior")}catch(e){toast(e.message)}};
  document.querySelectorAll("[data-approve]").forEach(b=>b.onclick=async()=>{try{await API.call("approveBehavior",{logId:b.dataset.approve,approve:true});toast("อนุมัติแล้ว");loadPage("behavior")}catch(e){toast(e.message)}});
}
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();$("#loginError").textContent="";try{await API.login($("#username").value,$("#password").value);showApp()}catch(err){$("#loginError").textContent=err.message}});
$("#logoutBtn").addEventListener("click",async()=>{await API.logout();showLogin()});
document.querySelectorAll(".nav-link").forEach(b=>b.addEventListener("click",()=>loadPage(b.dataset.page)));
if(user()&&API.token())showApp();else showLogin();

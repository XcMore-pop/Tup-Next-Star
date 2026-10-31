const $ = s => document.querySelector(s);
const user = () => { try{return JSON.parse(sessionStorage.getItem("party_user")||"null")}catch(e){return null} };
const titles = {dashboard:"ภาพรวม",members:"ระบบสมาชิก",attendance:"ระบบเช็กชื่อ",behavior:"คะแนนความประพฤติ",memberPortal:"ข้อมูลของฉัน",appeals:"ตรวจคำอุทธรณ์"};
function toast(msg){const el=$("#toast");el.textContent=msg;el.style.display="block";setTimeout(()=>el.style.display="none",3000)}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function showApp(){
  $("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");
  $("#userName").textContent=user()?.displayName||"สมาชิก";$("#userRole").textContent=user()?.role||"MEMBER";
  $("#avatar").textContent=(user()?.displayName||"U").slice(0,1);
  $("#today").textContent=new Intl.DateTimeFormat("th-TH",{dateStyle:"long"}).format(new Date());
  const role=user()?.role;
  document.querySelectorAll(".nav-link").forEach(b=>{
    const page=b.dataset.page;
    b.classList.toggle("hidden", role==="MEMBER" ? page!=="memberPortal" : (page==="memberPortal" || (page==="appeals" && !["ADMIN","PRESIDENT"].includes(role))));
  });
  loadPage(role==="MEMBER" ? "memberPortal" : "dashboard");
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
    if(page==="memberPortal") await renderMemberPortal(content);
    if(page==="appeals") await renderAppeals(content);
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
  ${user().role==="ADMIN"?`<div class="panel" style="margin-bottom:18px"><h3>สร้างบัญชีเข้าสู่ระบบให้สมาชิก</h3><div class="form-grid"><label>เลือกสมาชิก<select id="accountMember" class="field">${members.map(m=>`<option value="${escapeHtml(m.memberId)}">${escapeHtml(m.firstName+" "+m.lastName)} (${escapeHtml(m.memberId)})</option>`).join("")}</select></label><label>Username<input id="accountUsername" class="field" autocomplete="off" placeholder="เช่น member001"></label><label>Password (อย่างน้อย 10 ตัว)<input id="accountPassword" class="field" type="password" autocomplete="new-password"></label></div><button class="btn primary" id="createAccount" style="margin-top:14px">สร้างบัญชีสมาชิก</button><p class="muted" style="font-size:12px">ระบบจะผูกบัญชีกับรหัสสมาชิกที่เลือกโดยอัตโนมัติ</p></div>`:""}
  <div class="panel"><div class="toolbar"><input class="field" id="memberSearch" placeholder="ค้นหาชื่อหรือรหัสสมาชิก"></div><div class="table-wrap"><table><thead><tr><th>ชื่อ–นามสกุล</th><th>รหัสนักเรียน</th><th>ฝ่าย</th><th>ตำแหน่ง</th><th>สถานะ</th></tr></thead><tbody id="memberRows"></tbody></table></div></div>`;
  const draw=()=>{$("#memberRows").innerHTML=members.filter(m=>(m.firstName+" "+m.lastName+" "+m.studentCode).toLowerCase().includes($("#memberSearch").value.toLowerCase())).map(m=>`<tr><td>${escapeHtml(m.prefix)}${escapeHtml(m.firstName)} ${escapeHtml(m.lastName)}</td><td>${escapeHtml(m.studentCode)}</td><td>${escapeHtml((depts.find(d=>d.departmentId===m.departmentId)||{}).name||"-")}</td><td>${escapeHtml(m.position)}</td><td><span class="pill ${m.status==="ACTIVE"?"green":"amber"}">${escapeHtml(m.status)}</span></td></tr>`).join("")||'<tr><td colspan="5">ไม่พบข้อมูล</td></tr>'};
  $("#memberSearch").addEventListener("input",draw);draw();
  $("#addMember").onclick=()=>memberDialog(depts);
  if(user().role==="ADMIN") $("#createAccount").onclick=async()=>{try{const r=await API.call("createMemberAccount",{memberId:$("#accountMember").value,username:$("#accountUsername").value,password:$("#accountPassword").value});toast("สร้างบัญชี "+r.username+" เรียบร้อย");$("#accountPassword").value="";}catch(e){toast(e.message)}};
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

async function renderMemberPortal(el){
  const d=await API.call("getMyPortal");
  const m=d.member, summary=d.attendanceSummary;
  const deptNames={D1:"วิชาการ",D2:"กิจการนักเรียน",D3:"ประชาสัมพันธ์",D4:"บริหาร",D5:"งบประมาณ",D6:"นันทนาการ"};
  const behaviorRows=d.behavior.map(x=>`<tr><td>${escapeHtml(new Date(x.createdAt).toLocaleString("th-TH"))}</td><td>${escapeHtml(x.reason)}</td><td>${Number(x.pointsChange)>0?"+":""}${Number(x.pointsChange)}</td><td>${statusBehavior(x.status)}</td><td>${x.status==="APPROVED"&&Number(x.pointsChange)<0?`<button class="btn primary" data-appeal="${escapeHtml(x.logId)}">ยื่นอุทธรณ์</button>`:"-"}</td></tr>`).join("")||'<tr><td colspan="5">ยังไม่มีประวัติคะแนน</td></tr>';
  const attendanceRows=d.attendance.map(x=>`<tr><td>${escapeHtml(new Date(x.createdAt).toLocaleString("th-TH"))}</td><td>${escapeHtml(x.eventName)}</td><td>${escapeHtml(x.eventType)}</td><td>${statusPill(x.status)}</td><td>${escapeHtml(x.note||"-")}</td></tr>`).join("")||'<tr><td colspan="5">ยังไม่มีประวัติเช็กชื่อ</td></tr>';
  const appealRows=d.appeals.map(a=>`<tr><td>${escapeHtml(new Date(a.createdAt).toLocaleString("th-TH"))}</td><td>${escapeHtml(a.reason)}</td><td>${appealStatus(a.status)}</td><td>${escapeHtml(a.reviewNote||"รอผลพิจารณา")}</td></tr>`).join("")||'<tr><td colspan="4">ยังไม่มีคำอุทธรณ์</td></tr>';
  el.innerHTML=`<div class="page-heading"><div><h2>ข้อมูลสมาชิกของฉัน</h2><p>ข้อมูลส่วนตัว คะแนน และการเข้าร่วมกิจกรรม</p></div></div>
  <div class="panel" style="margin-bottom:18px"><h2 style="margin:0 0 5px">${escapeHtml([m.prefix,m.firstName,m.lastName].filter(Boolean).join(" "))}</h2><p class="muted">${escapeHtml(deptNames[m.departmentId]||m.departmentId||"ไม่ระบุฝ่าย")} · ${escapeHtml(m.position||"สมาชิก")} · ${escapeHtml(m.classRoom||"")}</p></div>
  <div class="stats"><div class="stat"><div class="stat-top">คะแนนปัจจุบัน</div><strong>${Number(d.currentScore)}</strong></div><div class="stat"><div class="stat-top">เข้าร่วม (มา + สาย)</div><strong>${summary.attended}/${summary.total}</strong></div><div class="stat"><div class="stat-top">มาสาย</div><strong>${summary.late}</strong></div><div class="stat"><div class="stat-top">ขาด / ลา</div><strong>${summary.absent} / ${summary.leave}</strong></div></div>
  <div class="panel" style="margin-bottom:18px"><h3>ประวัติคะแนนและเหตุผล</h3><div class="table-wrap"><table><thead><tr><th>วันที่</th><th>เหตุผล</th><th>คะแนน</th><th>สถานะ</th><th>อุทธรณ์</th></tr></thead><tbody>${behaviorRows}</tbody></table></div></div>
  <div class="panel" style="margin-bottom:18px"><h3>ประวัติการเช็กชื่อ</h3><div class="table-wrap"><table><thead><tr><th>วันที่</th><th>กิจกรรม</th><th>ประเภท</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead><tbody>${attendanceRows}</tbody></table></div></div>
  <div class="panel"><h3>คำอุทธรณ์ของฉัน</h3><div class="table-wrap"><table><thead><tr><th>วันที่</th><th>เหตุผลที่อุทธรณ์</th><th>สถานะ</th><th>ผลพิจารณา</th></tr></thead><tbody>${appealRows}</tbody></table></div></div>`;
  document.querySelectorAll("[data-appeal]").forEach(b=>b.onclick=async()=>{const reason=prompt("ชี้แจงเหตุผลที่ต้องการอุทธรณ์ (อย่างน้อย 10 ตัวอักษร)");if(!reason)return;const evidenceUrl=prompt("ลิงก์หลักฐาน (ถ้ามี)")||"";try{await API.call("submitAppeal",{behaviorLogId:b.dataset.appeal,reason,evidenceUrl});toast("ส่งคำอุทธรณ์แล้ว");loadPage("memberPortal")}catch(e){toast(e.message)}});
}
function statusBehavior(s){const map={APPROVED:["อนุมัติแล้ว","green"],PENDING:["รออนุมัติ","amber"],REJECTED:["ไม่อนุมัติ","red"]};const v=map[s]||[s,""];return `<span class="pill ${v[1]}">${v[0]}</span>`}
function appealStatus(s){const map={PENDING:["รอตรวจสอบ","amber"],APPROVED:["อนุมัติ","green"],REJECTED:["ไม่อนุมัติ","red"]};const v=map[s]||[s,""];return `<span class="pill ${v[1]}">${v[0]}</span>`}
async function renderAppeals(el){
  const items=await API.call("listAppeals");
  el.innerHTML=`<div class="page-heading"><div><h2>ตรวจสอบคำอุทธรณ์</h2><p>เมื่ออนุมัติ ระบบจะคืนคะแนนตามรายการหักเดิมโดยบันทึกเป็นรายการใหม่</p></div></div><div class="panel"><div class="table-wrap"><table><thead><tr><th>สมาชิก</th><th>รหัสรายการคะแนน</th><th>เหตุผลอุทธรณ์</th><th>หลักฐาน</th><th>สถานะ</th><th>พิจารณา</th></tr></thead><tbody>${items.map(a=>`<tr><td>${escapeHtml(a.memberId)}</td><td>${escapeHtml(a.behaviorLogId)}</td><td>${escapeHtml(a.reason)}</td><td>${a.evidenceUrl?`<a href="${escapeHtml(a.evidenceUrl)}" target="_blank" rel="noopener">เปิดหลักฐาน</a>`:"-"}</td><td>${appealStatus(a.status)}</td><td>${a.status==="PENDING"?`<button class="btn primary" data-review="${escapeHtml(a.appealId)}" data-approve="1">อนุมัติ</button> <button class="btn" data-review="${escapeHtml(a.appealId)}" data-approve="0">ไม่อนุมัติ</button>`:escapeHtml(a.reviewNote||"-")}</td></tr>`).join("")||'<tr><td colspan="6">ไม่มีคำอุทธรณ์</td></tr>'}</tbody></table></div></div>`;
  document.querySelectorAll("[data-review]").forEach(b=>b.onclick=async()=>{const reviewNote=prompt("ระบุเหตุผลการพิจารณา");if(!reviewNote)return;try{await API.call("reviewAppeal",{appealId:b.dataset.review,approve:b.dataset.approve==="1",reviewNote});toast("บันทึกผลพิจารณาแล้ว");loadPage("appeals")}catch(e){toast(e.message)}});
}

$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();$("#loginError").textContent="";try{await API.login($("#username").value,$("#password").value);showApp()}catch(err){$("#loginError").textContent=err.message}});
$("#logoutBtn").addEventListener("click",async()=>{await API.logout();showLogin()});
document.querySelectorAll(".nav-link").forEach(b=>b.addEventListener("click",()=>loadPage(b.dataset.page)));
if(user()&&API.token())showApp();else showLogin();

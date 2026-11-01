const $ = s => document.querySelector(s);
const user = () => { try{return JSON.parse(sessionStorage.getItem("party_user")||"null")}catch(e){return null} };
const titles = {dashboard:"ภาพรวม",members:"ระบบสมาชิก",attendance:"ระบบเช็กชื่อ",behavior:"คะแนนความประพฤติ",memberPortal:"ภาพรวมของฉัน",myAttendance:"ประวัติการเช็กชื่อ",myBehavior:"คะแนนความประพฤติ",myAppeals:"คำอุทธรณ์ของฉัน",appeals:"ตรวจคำอุทธรณ์",account:"บัญชีของฉัน",userManagement:"จัดการบัญชีผู้ใช้"};
function toast(msg){const el=$("#toast");el.textContent=msg;el.style.display="block";setTimeout(()=>el.style.display="none",3000)}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function showApp(){
  $("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");
  $("#userName").textContent=user()?.displayName||"สมาชิก";$("#userRole").textContent=user()?.role||"MEMBER";
  $("#avatar").textContent=(user()?.displayName||"U").slice(0,1);
  $("#today").textContent=new Intl.DateTimeFormat("th-TH",{dateStyle:"long"}).format(new Date());
  const role=user()?.role;
  document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",role!=="ADMIN"));
  document.querySelectorAll(".member-only").forEach(x=>x.classList.toggle("hidden",role!=="MEMBER"));
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
    if(["memberPortal","myAttendance","myBehavior","myAppeals"].includes(page)) await renderMemberPortal(content,page);
    if(page==="appeals") await renderAppeals(content);
    if(page==="account") await renderAccount(content);
    if(page==="userManagement") await renderUserManagement(content);
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
  ${user().role==="ADMIN"?`<div class="panel" style="margin-bottom:18px"><h3>สร้างบัญชีเข้าสู่ระบบให้สมาชิก</h3><div class="form-grid"><label>เลือกสมาชิก<select id="accountMember" class="field">${members.map(m=>`<option value="${escapeHtml(m.memberId)}">${escapeHtml(m.firstName+" "+m.lastName)} (${escapeHtml(m.memberId)})</option>`).join("")}</select></label><label>Username<input id="accountUsername" class="field" autocomplete="off" placeholder="เช่น member001"></label><label>Password (อย่างน้อย 5 ตัว)<input id="accountPassword" class="field" type="password" autocomplete="new-password"></label></div><button class="btn primary" id="createAccount" style="margin-top:14px">สร้างบัญชีสมาชิก</button><p class="muted" style="font-size:12px">ระบบจะผูกบัญชีกับรหัสสมาชิกที่เลือกโดยอัตโนมัติ</p></div>`:""}
  <div class="panel"><div class="toolbar"><input class="field" id="memberSearch" placeholder="ค้นหาชื่อหรือรหัสสมาชิก"></div><div class="table-wrap"><table><thead><tr><th>ชื่อ–นามสกุล</th><th>รหัสนักเรียน</th><th>ฝ่าย</th><th>ตำแหน่ง</th><th>สถานะ</th></tr></thead><tbody id="memberRows"></tbody></table></div></div>`;
  const draw=()=>{$("#memberRows").innerHTML=members.filter(m=>(m.firstName+" "+m.lastName+" "+m.studentCode).toLowerCase().includes($("#memberSearch").value.toLowerCase())).map(m=>`<tr><td>${escapeHtml(m.prefix)}${escapeHtml(m.firstName)} ${escapeHtml(m.lastName)}</td><td>${escapeHtml(m.studentCode)}</td><td>${escapeHtml((depts.find(d=>d.departmentId===m.departmentId)||{}).name||"-")}</td><td>${escapeHtml(m.position)}</td><td><span class="pill ${m.status==="ACTIVE"?"green":"amber"}">${escapeHtml(m.status)}</span></td></tr>`).join("")||'<tr><td colspan="5">ไม่พบข้อมูล</td></tr>'};
  $("#memberSearch").addEventListener("input",draw);draw();
  $("#addMember").onclick=()=>memberDialog(depts);
  if(user().role==="ADMIN") $("#createAccount").onclick=async()=>{try{const password=$("#accountPassword").value;if(password.length<5)throw new Error("รหัสผ่านต้องมีอย่างน้อย 5 ตัวอักษร");const r=await API.call("createMemberAccount",{memberId:$("#accountMember").value,username:$("#accountUsername").value,password});toast("สร้างบัญชี "+r.username+" เรียบร้อย");$("#accountPassword").value="";}catch(e){toast(e.message)}};
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

async function renderMemberPortal(el,page="memberPortal"){
  const d=await API.call("getMyPortal");
  const m=d.member, summary=d.attendanceSummary;
  const deptNames={D1:"วิชาการ",D2:"กิจการนักเรียน",D3:"ประชาสัมพันธ์",D4:"บริหาร",D5:"งบประมาณ",D6:"นันทนาการ"};
  const activeAppealIds=new Set(d.appeals.filter(a=>["PENDING","APPROVED"].includes(a.status)).map(a=>String(a.behaviorLogId)));
  const behaviorRows=d.behavior.map(x=>`<tr><td>${escapeHtml(new Date(x.createdAt).toLocaleString("th-TH"))}</td><td>${escapeHtml(x.reason)}</td><td>${Number(x.pointsChange)>0?"+":""}${Number(x.pointsChange)}</td><td>${statusBehavior(x.status)}</td><td>${x.status==="APPROVED"&&Number(x.pointsChange)<0?(activeAppealIds.has(String(x.logId))?"ส่งอุทธรณ์แล้ว":`<button class="btn primary" data-appeal="${escapeHtml(x.logId)}">ยื่นอุทธรณ์</button>`):"-"}</td></tr>`).join("")||'<tr><td colspan="5">ยังไม่มีประวัติคะแนน</td></tr>';
  const attendanceRows=d.attendance.map(x=>`<tr><td>${escapeHtml(new Date(x.createdAt).toLocaleString("th-TH"))}</td><td>${escapeHtml(x.eventName)}</td><td>${escapeHtml(x.eventType)}</td><td>${statusPill(x.status)}</td><td>${escapeHtml(x.note||"-")}</td></tr>`).join("")||'<tr><td colspan="5">ยังไม่มีประวัติเช็กชื่อ</td></tr>';
  const appealRows=d.appeals.map(a=>`<tr><td>${escapeHtml(new Date(a.createdAt).toLocaleString("th-TH"))}</td><td>${escapeHtml(a.reason)}</td><td>${appealStatus(a.status)}</td><td>${escapeHtml(a.reviewNote||"รอผลพิจารณา")}</td></tr>`).join("")||'<tr><td colspan="4">ยังไม่มีคำอุทธรณ์</td></tr>';
  const heading={memberPortal:["ภาพรวมของฉัน","สรุปข้อมูลสมาชิก คะแนน และการเข้าร่วมกิจกรรม"],myAttendance:["ประวัติการเช็กชื่อ","ตรวจสอบการเข้าร่วมประชุม กิจกรรม และการปฏิบัติหน้าที่"],myBehavior:["คะแนนความประพฤติ","ตรวจสอบคะแนน เหตุผล และยื่นอุทธรณ์รายการที่เข้าเงื่อนไข"],myAppeals:["คำอุทธรณ์ของฉัน","ติดตามสถานะและผลการพิจารณาคำอุทธรณ์"]}[page];
  let body="";
  if(page==="memberPortal") body=`<div class="panel" style="margin-bottom:18px"><h2 style="margin:0 0 5px">${escapeHtml([m.prefix,m.firstName,m.lastName].filter(Boolean).join(" "))}</h2><p class="muted">${escapeHtml(deptNames[m.departmentId]||m.departmentId||"ไม่ระบุฝ่าย")} · ${escapeHtml(m.position||"สมาชิก")} · ${escapeHtml(m.classRoom||"")}</p></div><div class="stats"><div class="stat"><div class="stat-top">คะแนนปัจจุบัน</div><strong>${Number(d.currentScore)}</strong></div><div class="stat"><div class="stat-top">เข้าร่วม (มา + สาย)</div><strong>${summary.attended}/${summary.total}</strong></div><div class="stat"><div class="stat-top">มาสาย</div><strong>${summary.late}</strong></div><div class="stat"><div class="stat-top">ขาด / ลา</div><strong>${summary.absent} / ${summary.leave}</strong></div></div><div class="quick-grid"><button class="quick-card" data-go="myAttendance"><i class="fa-solid fa-calendar-check"></i><b>ประวัติการเช็กชื่อ</b><small>ดูการมา สาย ลา และขาด</small></button><button class="quick-card" data-go="myBehavior"><i class="fa-solid fa-award"></i><b>คะแนนความประพฤติ</b><small>ดูคะแนนและรายการย้อนหลัง</small></button><button class="quick-card" data-go="myAppeals"><i class="fa-solid fa-scale-balanced"></i><b>คำอุทธรณ์ของฉัน</b><small>ติดตามผลการพิจารณา</small></button></div>`;
  if(page==="myAttendance") body=`<div class="stats"><div class="stat"><div class="stat-top">เข้าร่วม (มา + สาย)</div><strong>${summary.attended}/${summary.total}</strong></div><div class="stat"><div class="stat-top">มาสาย</div><strong>${summary.late}</strong></div><div class="stat"><div class="stat-top">ขาด</div><strong>${summary.absent}</strong></div><div class="stat"><div class="stat-top">ลา</div><strong>${summary.leave}</strong></div></div><div class="panel"><h3>ประวัติการเช็กชื่อ</h3><div class="table-wrap"><table><thead><tr><th>วันที่</th><th>กิจกรรม</th><th>ประเภท</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead><tbody>${attendanceRows}</tbody></table></div></div>`;
  if(page==="myBehavior") body=`<div class="stat" style="max-width:260px;margin-bottom:18px"><div class="stat-top">คะแนนปัจจุบัน</div><strong>${Number(d.currentScore)}</strong></div><div class="panel"><h3>ประวัติคะแนนและเหตุผล</h3><div class="table-wrap"><table><thead><tr><th>วันที่</th><th>เหตุผล</th><th>คะแนน</th><th>สถานะ</th><th>อุทธรณ์</th></tr></thead><tbody>${behaviorRows}</tbody></table></div></div>`;
  if(page==="myAppeals") body=`<div class="panel"><h3>คำอุทธรณ์ของฉัน</h3><div class="table-wrap"><table><thead><tr><th>วันที่</th><th>เหตุผลที่อุทธรณ์</th><th>สถานะ</th><th>ผลพิจารณา</th></tr></thead><tbody>${appealRows}</tbody></table></div></div>`;
  el.innerHTML=`<div class="page-heading"><div><h2>${heading[0]}</h2><p>${heading[1]}</p></div><button class="btn" id="refreshPortal">รีเฟรชข้อมูล</button></div>${body}`;
  $("#refreshPortal").onclick=()=>loadPage(page);
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>loadPage(b.dataset.go));
  document.querySelectorAll("[data-appeal]").forEach(b=>b.onclick=async()=>{const reason=prompt("ชี้แจงเหตุผลที่ต้องการอุทธรณ์ (อย่างน้อย 10 ตัวอักษร)");if(!reason)return;const evidenceUrl=prompt("ลิงก์หลักฐาน (ถ้ามี)")||"";try{await API.call("submitAppeal",{behaviorLogId:b.dataset.appeal,reason,evidenceUrl});toast("ส่งคำอุทธรณ์แล้ว");loadPage("myAppeals")}catch(e){toast(e.message)}});
}

function statusBehavior(s){const map={APPROVED:["อนุมัติแล้ว","green"],PENDING:["รออนุมัติ","amber"],REJECTED:["ไม่อนุมัติ","red"]};const v=map[s]||[s,""];return `<span class="pill ${v[1]}">${v[0]}</span>`}
function appealStatus(s){const map={PENDING:["รอตรวจสอบ","amber"],APPROVED:["อนุมัติ","green"],REJECTED:["ไม่อนุมัติ","red"]};const v=map[s]||[s,""];return `<span class="pill ${v[1]}">${v[0]}</span>`}
async function renderAppeals(el){
  const items=await API.call("listAppeals");
  el.innerHTML=`<div class="page-heading"><div><h2>ตรวจสอบคำอุทธรณ์</h2><p>เมื่ออนุมัติ ระบบจะคืนคะแนนตามรายการหักเดิมโดยบันทึกเป็นรายการใหม่</p></div></div><div class="panel"><div class="table-wrap"><table><thead><tr><th>สมาชิก</th><th>รหัสรายการคะแนน</th><th>เหตุผลอุทธรณ์</th><th>หลักฐาน</th><th>สถานะ</th><th>พิจารณา</th></tr></thead><tbody>${items.map(a=>`<tr><td>${escapeHtml(a.memberId)}</td><td>${escapeHtml(a.behaviorLogId)}</td><td>${escapeHtml(a.reason)}</td><td>${a.evidenceUrl?`<a href="${escapeHtml(a.evidenceUrl)}" target="_blank" rel="noopener">เปิดหลักฐาน</a>`:"-"}</td><td>${appealStatus(a.status)}</td><td>${a.status==="PENDING"?`<button class="btn primary" data-review="${escapeHtml(a.appealId)}" data-approve="1">อนุมัติ</button> <button class="btn" data-review="${escapeHtml(a.appealId)}" data-approve="0">ไม่อนุมัติ</button>`:escapeHtml(a.reviewNote||"-")}</td></tr>`).join("")||'<tr><td colspan="6">ไม่มีคำอุทธรณ์</td></tr>'}</tbody></table></div></div>`;
  document.querySelectorAll("[data-review]").forEach(b=>b.onclick=async()=>{const reviewNote=prompt("ระบุเหตุผลการพิจารณา");if(!reviewNote)return;try{await API.call("reviewAppeal",{appealId:b.dataset.review,approve:b.dataset.approve==="1",reviewNote});toast("บันทึกผลพิจารณาแล้ว");loadPage("appeals")}catch(e){toast(e.message)}});
}


async function renderAccount(el){
  const current=user()||{};
  const admin=current.role==="ADMIN";
  el.innerHTML=`<div class="page-heading"><div><h2>บัญชีของฉัน</h2><p>จัดการข้อมูลบัญชีและความปลอดภัยในการเข้าสู่ระบบ</p></div></div>
  <div class="account-layout">
    <section class="panel account-profile">
      <div class="account-section-head"><span class="account-icon"><i class="fa-solid fa-user-shield"></i></span><div><h3>ข้อมูลบัญชี</h3><p>ข้อมูลประจำบัญชีที่กำลังใช้งาน</p></div></div>
      <div class="account-info-grid">
        <div class="account-info-item"><span>ชื่อผู้ใช้</span><strong>${escapeHtml(current.username||"-")}</strong></div>
        <div class="account-info-item"><span>ระดับสิทธิ์</span><strong><span class="account-role">${escapeHtml(current.role||"MEMBER")}</span></strong></div>
        <div class="account-info-item account-info-wide"><span>ชื่อที่แสดง</span><strong>${escapeHtml(current.displayName||"-")}</strong></div>
      </div>
      <p class="account-note"><i class="fa-solid fa-circle-info"></i> ${admin?"ผู้ดูแลระบบสามารถแก้ไขชื่อที่แสดงได้จากเมนูจัดการบัญชีผู้ใช้":"หากต้องการแก้ไขชื่อที่แสดง โปรดติดต่อผู้ดูแลระบบ"}</p>
    </section>
    <section class="panel password-panel">
      <div class="account-section-head"><span class="account-icon security"><i class="fa-solid fa-lock"></i></span><div><h3>เปลี่ยนรหัสผ่าน</h3><p>ตั้งรหัสผ่านใหม่เพื่อปกป้องบัญชีของคุณ</p></div></div>
      <form id="changePasswordForm" class="password-form" novalidate>
        <label class="password-label" for="myOldPassword">รหัสผ่านปัจจุบัน</label>
        <div class="password-input-wrap"><input id="myOldPassword" class="field password-field" type="password" autocomplete="current-password" placeholder="กรอกรหัสผ่านปัจจุบัน" required><button class="password-visibility" type="button" data-toggle-password="myOldPassword" aria-label="แสดงรหัสผ่าน"><i class="fa-regular fa-eye"></i></button></div>
        <div class="password-divider"></div>
        <label class="password-label" for="myNewPassword">รหัสผ่านใหม่</label>
        <div class="password-input-wrap"><input id="myNewPassword" class="field password-field" type="password" autocomplete="new-password" minlength="5" placeholder="อย่างน้อย 5 ตัวอักษร" required><button class="password-visibility" type="button" data-toggle-password="myNewPassword" aria-label="แสดงรหัสผ่าน"><i class="fa-regular fa-eye"></i></button></div>
        <div class="password-hint"><i class="fa-solid fa-shield-halved"></i> ควรใช้รหัสผ่านที่เดายากและไม่ซ้ำกับเว็บไซต์อื่น</div>
        <label class="password-label" for="myConfirmPassword">ยืนยันรหัสผ่านใหม่</label>
        <div class="password-input-wrap"><input id="myConfirmPassword" class="field password-field" type="password" autocomplete="new-password" minlength="5" placeholder="กรอกรหัสผ่านใหม่อีกครั้ง" required><button class="password-visibility" type="button" data-toggle-password="myConfirmPassword" aria-label="แสดงรหัสผ่าน"><i class="fa-regular fa-eye"></i></button></div>
        <p id="passwordFormError" class="password-form-error" role="alert"></p>
        <div class="password-form-actions"><button class="btn primary password-submit" id="changeMyPassword" type="submit"><span class="password-submit-label">บันทึกการเปลี่ยนรหัสผ่าน</span><i class="fa-solid fa-arrow-right"></i><span class="button-spinner" aria-hidden="true"></span></button><span class="password-secure-caption"><i class="fa-solid fa-lock"></i> ข้อมูลถูกส่งผ่านระบบบัญชี</span></div>
      </form>
    </section>
  </div>`;

  el.querySelectorAll("[data-toggle-password]").forEach(btn=>btn.addEventListener("click",()=>{
    const input=document.getElementById(btn.dataset.togglePassword);
    const visible=input.type==="password";
    input.type=visible?"text":"password";
    btn.innerHTML=visible?'<i class="fa-regular fa-eye-slash"></i>':'<i class="fa-regular fa-eye"></i>';
    btn.setAttribute("aria-label",visible?"ซ่อนรหัสผ่าน":"แสดงรหัสผ่าน");
  }));

  $("#changePasswordForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const button=$("#changeMyPassword"),error=$("#passwordFormError");
    const oldPassword=$("#myOldPassword").value;
    const newPassword=$("#myNewPassword").value;
    const confirmPassword=$("#myConfirmPassword").value;
    error.textContent="";
    if(!oldPassword||!newPassword||!confirmPassword){error.textContent="กรุณากรอกข้อมูลให้ครบทุกช่อง";return;}
    if(newPassword.length<5){error.textContent="รหัสผ่านใหม่ต้องมีอย่างน้อย 5 ตัวอักษร";return;}
    if(newPassword!==confirmPassword){error.textContent="รหัสผ่านใหม่และการยืนยันไม่ตรงกัน";return;}
    if(oldPassword===newPassword){error.textContent="รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน";return;}
    button.disabled=true;button.classList.add("is-loading");button.querySelector(".password-submit-label").textContent="กำลังบันทึก...";
    try{
      await API.call("changePassword",{oldPassword,newPassword,confirmPassword});
      $("#myOldPassword").value=$("#myNewPassword").value=$("#myConfirmPassword").value="";
      toast("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
    }catch(err){error.textContent=err.message||"ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองอีกครั้ง";}
    finally{button.disabled=false;button.classList.remove("is-loading");button.querySelector(".password-submit-label").textContent="บันทึกการเปลี่ยนรหัสผ่าน";}
  });
}

async function renderUserManagement(el){
  if(user()?.role!=="ADMIN")throw new Error("ไม่มีสิทธิ์เข้าถึงหน้านี้");
  const accounts=await API.call("adminListUsers");
  el.innerHTML=`<div class="page-heading"><div><h2>จัดการบัญชีผู้ใช้</h2><p>จัดการชื่อที่แสดงและตั้งรหัสผ่านใหม่ให้สมาชิกหรือผู้ดูแล</p></div><button class="btn" id="reloadUsers"><i class="fa-solid fa-rotate"></i> รีเฟรช</button></div>
  <div class="panel user-management-panel"><div class="toolbar"><div class="user-search-wrap"><i class="fa-solid fa-magnifying-glass"></i><input id="userSearch" class="field" placeholder="ค้นหา Username ชื่อผู้ใช้ หรือรหัสสมาชิก" aria-label="ค้นหาบัญชีผู้ใช้"></div><span class="user-count" id="userCount"></span></div><div class="table-wrap"><table><thead><tr><th>Username</th><th>ชื่อที่แสดง</th><th>สิทธิ์</th><th>รหัสสมาชิก</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody id="userAccountRows"></tbody></table></div></div>`;
  const draw=()=>{
    const query=$("#userSearch").value.trim().toLowerCase();
    const filtered=accounts.filter(a=>(String(a.username)+" "+String(a.displayName)+" "+String(a.memberId)).toLowerCase().includes(query));
    $("#userCount").textContent=`${filtered.length} จาก ${accounts.length} บัญชี`;
    $("#userAccountRows").innerHTML=filtered.map(a=>`<tr><td><span class="account-username">${escapeHtml(a.username)}</span></td><td>${escapeHtml(a.displayName)}</td><td><span class="role-tag ${String(a.role).toUpperCase()==="ADMIN"?"role-admin":"role-member"}">${escapeHtml(a.role)}</span></td><td>${escapeHtml(a.memberId||"-")}</td><td><span class="pill ${a.active?"green":"red"}"><span class="status-dot"></span>${a.active?"ใช้งาน":"ปิดใช้งาน"}</span></td><td><button class="btn account-edit-btn" data-edit-user="${escapeHtml(a.userId)}"><i class="fa-solid fa-pen-to-square"></i><span>แก้ไข</span></button></td></tr>`).join("")||'<tr><td colspan="6" class="user-empty">ไม่พบบัญชีผู้ใช้ที่ตรงกับการค้นหา</td></tr>';
    el.querySelectorAll("[data-edit-user]").forEach(btn=>btn.addEventListener("click",()=>openAccountEditDialog(accounts.find(a=>String(a.userId)===btn.dataset.editUser))));
  };
  $("#userSearch").addEventListener("input",draw);
  $("#reloadUsers").onclick=()=>loadPage("userManagement");
  draw();
}

function openAccountEditDialog(account){
  if(!account)return;
  const overlay=document.createElement("div");
  overlay.className="account-modal-backdrop";
  overlay.innerHTML=`<section class="account-modal" role="dialog" aria-modal="true" aria-labelledby="accountModalTitle">
    <header class="account-modal-head"><div class="account-modal-heading"><span class="account-modal-icon"><i class="fa-solid fa-user-pen"></i></span><div><span class="account-modal-eyebrow">ACCOUNT MANAGEMENT</span><h2 id="accountModalTitle">แก้ไขบัญชีผู้ใช้</h2><p>แก้ไขข้อมูลบัญชีและตั้งรหัสผ่านใหม่</p></div></div><button type="button" class="account-modal-close" data-modal-close aria-label="ปิดหน้าต่าง"><i class="fa-solid fa-xmark"></i></button></header>
    <form id="adminEditAccountForm" class="account-modal-form" novalidate>
      <div class="account-identity-card"><span class="account-identity-avatar">${escapeHtml(String(account.displayName||account.username||"U").slice(0,1).toUpperCase())}</span><div><strong>${escapeHtml(account.username)}</strong><span>${escapeHtml(account.role)} · ${escapeHtml(account.memberId||"ไม่มีรหัสสมาชิก")}</span></div><span class="pill ${account.active?"green":"red"}">${account.active?"ใช้งาน":"ปิดใช้งาน"}</span></div>
      <label class="account-modal-label" for="adminEditDisplayName">ชื่อที่แสดง</label><div class="account-modal-input-wrap"><i class="fa-regular fa-id-card"></i><input id="adminEditDisplayName" class="field" value="${escapeHtml(account.displayName)}" maxlength="80" placeholder="กรอกชื่อที่แสดง" required></div>
      <div class="account-modal-section"><div><strong>ตั้งรหัสผ่านใหม่</strong><p>เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน</p></div><span class="optional-tag">ไม่บังคับ</span></div>
      <label class="account-modal-label" for="adminEditNewPassword">รหัสผ่านใหม่</label><div class="account-modal-input-wrap has-toggle"><i class="fa-solid fa-lock"></i><input id="adminEditNewPassword" class="field" type="password" minlength="5" autocomplete="new-password" placeholder="อย่างน้อย 5 ตัวอักษร"><button type="button" class="account-modal-eye" data-password-toggle="adminEditNewPassword" aria-label="แสดงรหัสผ่าน"><i class="fa-regular fa-eye"></i></button></div>
      <label class="account-modal-label" for="adminEditConfirmPassword">ยืนยันรหัสผ่านใหม่</label><div class="account-modal-input-wrap has-toggle"><i class="fa-solid fa-shield-halved"></i><input id="adminEditConfirmPassword" class="field" type="password" minlength="5" autocomplete="new-password" placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"><button type="button" class="account-modal-eye" data-password-toggle="adminEditConfirmPassword" aria-label="แสดงรหัสผ่าน"><i class="fa-regular fa-eye"></i></button></div>
      <p class="account-modal-error" id="adminEditAccountError" role="alert"></p>
      <footer class="account-modal-actions"><button type="button" class="btn account-cancel-btn" data-modal-close>ยกเลิก</button><button type="submit" class="btn primary account-save-btn" id="adminEditSave"><span class="account-save-label">บันทึกการเปลี่ยนแปลง</span><i class="fa-solid fa-check"></i><span class="button-spinner" aria-hidden="true"></span></button></footer>
    </form>
  </section>`;
  document.body.appendChild(overlay);
  const close=()=>{document.removeEventListener("keydown",onKey);overlay.remove()};
  const onKey=e=>{if(e.key==="Escape")close()};
  document.addEventListener("keydown",onKey);
  overlay.querySelectorAll("[data-modal-close]").forEach(b=>b.addEventListener("click",close));
  overlay.addEventListener("click",e=>{if(e.target===overlay)close()});
  overlay.querySelectorAll("[data-password-toggle]").forEach(btn=>btn.addEventListener("click",()=>{
    const input=overlay.querySelector("#"+btn.dataset.passwordToggle),visible=input.type==="password";
    input.type=visible?"text":"password";
    btn.innerHTML=visible?'<i class="fa-regular fa-eye-slash"></i>':'<i class="fa-regular fa-eye"></i>';
    btn.setAttribute("aria-label",visible?"ซ่อนรหัสผ่าน":"แสดงรหัสผ่าน");
  }));
  const nameInput=overlay.querySelector("#adminEditDisplayName");
  nameInput.focus();nameInput.select();
  overlay.querySelector("#adminEditAccountForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const error=overlay.querySelector("#adminEditAccountError"),button=overlay.querySelector("#adminEditSave");
    const displayName=nameInput.value.trim(),newPassword=overlay.querySelector("#adminEditNewPassword").value,confirmPassword=overlay.querySelector("#adminEditConfirmPassword").value;
    error.textContent="";
    if(displayName.length<2){error.textContent="ชื่อที่แสดงต้องมีอย่างน้อย 2 ตัวอักษร";nameInput.focus();return;}
    if(newPassword&&newPassword.length<5){error.textContent="รหัสผ่านใหม่ต้องมีอย่างน้อย 5 ตัวอักษร";return;}
    if(newPassword!==confirmPassword){error.textContent="รหัสผ่านใหม่และการยืนยันไม่ตรงกัน";return;}
    if(!newPassword&&confirmPassword){error.textContent="กรุณากรอกรหัสผ่านใหม่ก่อนยืนยัน";return;}
    button.disabled=true;button.classList.add("is-loading");button.querySelector(".account-save-label").textContent="กำลังบันทึก...";
    try{
      await API.call("adminUpdateUser",{userId:account.userId,displayName,newPassword});
      close();toast("บันทึกการแก้ไขบัญชีเรียบร้อย");loadPage("userManagement");
    }catch(err){error.textContent=err.message||"ไม่สามารถบันทึกข้อมูลได้ กรุณาลองอีกครั้ง";button.disabled=false;button.classList.remove("is-loading");button.querySelector(".account-save-label").textContent="บันทึกการเปลี่ยนแปลง";}
  });
}

$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget,button=$("#loginSubmit"),error=$("#loginError"),status=$("#loginStatus");
  if(button.disabled)return;
  error.textContent="";status.textContent="กำลังตรวจสอบข้อมูลเข้าสู่ระบบ...";
  button.disabled=true;button.classList.add("is-loading");button.querySelector(".login-submit-label").textContent="กำลังเข้าสู่ระบบ...";
  try{
    await API.login($("#username").value,$("#password").value);
    status.textContent="เข้าสู่ระบบสำเร็จ กำลังเปิดหน้าหลัก...";
    showApp();
  }catch(err){
    error.textContent=err.message||"เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง";
    status.textContent="";
  }finally{
    button.disabled=false;button.classList.remove("is-loading");button.querySelector(".login-submit-label").textContent="เข้าสู่ระบบ";
  }
});
$("#logoutBtn").addEventListener("click",async()=>{await API.logout();showLogin()});
document.querySelectorAll(".nav-link").forEach(b=>{
  b.dataset.label = b.textContent.trim();
  b.addEventListener("click",()=>{
    loadPage(b.dataset.page);
    closeSidebar();
  });
});

function closeSidebar(){
  document.body.classList.remove("sidebar-open");
  const toggle=$("#sidebarToggle");
  if(toggle){
    toggle.setAttribute("aria-expanded","false");
    toggle.setAttribute("aria-label","เปิดเมนู");
    toggle.innerHTML='<i class="fa-solid fa-bars"></i>';
  }
}
function toggleSidebar(){
  const opened=document.body.classList.toggle("sidebar-open");
  const toggle=$("#sidebarToggle");
  if(toggle){
    toggle.setAttribute("aria-expanded",String(opened));
    toggle.setAttribute("aria-label",opened?"ปิดเมนู":"เปิดเมนู");
    toggle.innerHTML=opened?'<i class="fa-solid fa-xmark"></i>':'<i class="fa-solid fa-bars"></i>';
  }
}
$("#sidebarToggle")?.addEventListener("click",toggleSidebar);
$("#sidebarBackdrop")?.addEventListener("click",closeSidebar);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSidebar()});
window.addEventListener("resize",()=>{if(window.innerWidth>767)closeSidebar()});
if(user()&&API.token())showApp();else showLogin();

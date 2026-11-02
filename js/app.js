const $ = s => document.querySelector(s);
const user = () => { try{return JSON.parse(sessionStorage.getItem("party_user")||"null")}catch(e){return null} };
const titles = {dashboard:"ภาพรวม",members:"ระบบสมาชิก",attendance:"ระบบเช็กชื่อ",behavior:"คะแนนความประพฤติ",memberPortal:"ภาพรวมของฉัน",myAttendance:"ประวัติการเช็กชื่อ",myBehavior:"คะแนนความประพฤติ",myAppeals:"คำอุทธรณ์ของฉัน",appeals:"ตรวจคำอุทธรณ์",account:"บัญชีของฉัน",userManagement:"จัดการบัญชีผู้ใช้",departmentLeaders:"แต่งตั้งหัวหน้าฝ่าย",tasks:"ระบบมอบหมายงาน",announcements:"ประกาศข่าวสาร",calendar:"ปฏิทินกิจกรรม",reports:"รายงานผลการปฏิบัติงาน",audit:"ประวัติการใช้งาน"};
function toast(msg){const el=$("#toast");el.textContent=msg;el.style.display="block";setTimeout(()=>el.style.display="none",3000)}
// ซ่อนรหัสอ้างอิงภายในระบบจากข้อความที่แสดงบนหน้าเว็บ (ยังเก็บไว้ในฐานข้อมูลเพื่อป้องกันการหักคะแนนซ้ำ)
function cleanDisplayReason(value){return String(value??"").replace(/\s*\[ATTENDANCE:[^\]]+\]/gi, "").trim()}
function cleanDisplayDetails(value){return String(value??"").replace(/\s*\[ATTENDANCE:[^\]]+\]/gi, "").trim()}

// Reusable, accessible modal form. Replaces native browser prompt() dialogs.
function modalForm({title,subtitle="กรอกข้อมูลให้ครบถ้วน",icon="fa-pen-to-square",fields=[],submitText="บันทึกข้อมูล",intro="",onSubmit}){
  return new Promise(resolve=>{
    const backdrop=document.createElement("div");backdrop.className="app-modal-backdrop";
    const fieldHtml=fields.map((f,i)=>{
      const id="appModalField"+i, required=f.required?"required":"", hint=f.hint?`<small class="app-modal-hint">${escapeHtml(f.hint)}</small>`:"";
      let control="";
      if(f.type==="textarea") control=`<textarea id="${id}" name="${escapeHtml(f.name)}" class="app-modal-control" rows="${f.rows||4}" placeholder="${escapeHtml(f.placeholder||"")}" ${required} ${f.minLength?`minlength="${f.minLength}"`:""}>${escapeHtml(f.value||"")}</textarea>`;
      else if(f.type==="select") control=`<select id="${id}" name="${escapeHtml(f.name)}" class="app-modal-control" ${required}>${(f.options||[]).map(o=>`<option value="${escapeHtml(o.value)}" ${String(o.value)===String(f.value??"")?"selected":""}>${escapeHtml(o.label)}</option>`).join("")}</select>`;
      else control=`<input id="${id}" name="${escapeHtml(f.name)}" class="app-modal-control" type="${f.type||"text"}" value="${escapeHtml(f.value||"")}" placeholder="${escapeHtml(f.placeholder||"")}" ${required} ${f.minLength?`minlength="${f.minLength}"`:""} ${f.maxLength?`maxlength="${f.maxLength}"`:""} ${f.autocomplete?`autocomplete="${escapeHtml(f.autocomplete)}"`:""}>`;
      return `<label class="app-modal-field" for="${id}"><span>${escapeHtml(f.label)}${f.required?'<b class="app-modal-required"> *</b>':""}</span>${control}${hint}</label>`;
    }).join("");
    backdrop.innerHTML=`<section class="app-modal" role="dialog" aria-modal="true" aria-labelledby="appModalTitle"><header class="app-modal-head"><div class="app-modal-heading"><span class="app-modal-icon"><i class="fa-solid ${icon}"></i></span><div><h2 id="appModalTitle">${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div></div><button type="button" class="app-modal-close" aria-label="ปิด"><i class="fa-solid fa-xmark"></i></button></header>${intro?`<div class="app-modal-intro">${intro}</div>`:""}<form class="app-modal-form">${fieldHtml}<p class="app-modal-error" role="alert" aria-live="polite"></p><footer class="app-modal-actions"><button type="button" class="app-modal-cancel">ยกเลิก</button><button type="submit" class="btn primary app-modal-submit"><i class="fa-solid fa-check"></i><span>${escapeHtml(submitText)}</span></button></footer></form></section>`;
    document.body.appendChild(backdrop);
    const form=backdrop.querySelector("form"), error=backdrop.querySelector(".app-modal-error"), submit=backdrop.querySelector(".app-modal-submit");
    let finished=false;
    const close=value=>{if(finished)return;finished=true;document.removeEventListener("keydown",onKey);backdrop.remove();resolve(value);};
    const onKey=e=>{if(e.key==="Escape")close(null);};
    document.addEventListener("keydown",onKey);
    backdrop.querySelector(".app-modal-close").onclick=()=>close(null);
    backdrop.querySelector(".app-modal-cancel").onclick=()=>close(null);
    backdrop.addEventListener("mousedown",e=>{if(e.target===backdrop)close(null)});
    form.onsubmit=async e=>{
      e.preventDefault();if(!form.reportValidity())return;
      const values=Object.fromEntries(new FormData(form).entries());
      submit.disabled=true;submit.innerHTML='<span class="app-modal-spinner"></span><span>กำลังบันทึก...</span>';error.textContent="";
      try{const result=onSubmit?await onSubmit(values):values;close(result===undefined?values:result);}
      catch(err){error.textContent=err?.message||"เกิดข้อผิดพลาด กรุณาลองอีกครั้ง";submit.disabled=false;submit.innerHTML=`<i class="fa-solid fa-check"></i><span>${escapeHtml(submitText)}</span>`;}
    };
    const first=backdrop.querySelector("input,textarea,select");if(first)requestAnimationFrame(()=>first.focus());
  });
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function showApp(){
  $("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");
  $("#userName").textContent=user()?.displayName||"สมาชิก";$("#userRole").textContent=user()?.role||"MEMBER";
  $("#avatar").textContent=(user()?.displayName||"U").slice(0,1);
  $("#today").textContent=new Intl.DateTimeFormat("th-TH",{dateStyle:"long"}).format(new Date());
  const role=user()?.role;
  document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",role!=="ADMIN"));
  const isLeader=["DEPT_HEAD","DEPT_DEPUTY"].includes(role);
  // หัวหน้าฝ่ายและรองหัวหน้าฝ่ายยังคงเป็นสมาชิก จึงเห็นเมนูส่วนตัวทั้งหมดด้วย
  document.querySelectorAll(".member-only").forEach(x=>x.classList.toggle("hidden",role!=="MEMBER"&&!isLeader));
  document.querySelectorAll(".leader-only").forEach(x=>x.classList.toggle("hidden",!isLeader));
  document.querySelectorAll(".president-only").forEach(x=>x.classList.toggle("hidden",role!=="PRESIDENT"&&role!=="ADMIN"));
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
    if(page==="departmentLeaders") await renderDepartmentLeaders(content);
    if(page==="tasks") await renderTasks(content);
    if(page==="announcements") await renderAnnouncements(content);
    if(page==="calendar") await renderCalendar(content);
    if(page==="reports") await renderReports(content);
    if(page==="audit") await renderAudit(content);
  }catch(e){content.innerHTML=`<div class="panel error">${escapeHtml(e.message)}</div>`}
}
async function renderDashboard(el){
  const d=await API.call("dashboard");
  el.innerHTML=`<div class="page-heading"><div><h2>${["DEPT_HEAD","DEPT_DEPUTY"].includes(user().role)?"ภาพรวมฝ่าย":"ภาพรวมพรรค"}</h2><p>${["DEPT_HEAD","DEPT_DEPUTY"].includes(user().role)?"สรุปสมาชิกและการดำเนินงานภายในฝ่ายของคุณ":"สรุปข้อมูลการดำเนินงานและสมาชิก"}</p></div></div>
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
  el.innerHTML=`<div class="page-heading"><div><h2>${["DEPT_HEAD","DEPT_DEPUTY"].includes(user().role)?"สมาชิกในฝ่าย":"สมาชิกทั้งหมด"}</h2><p>จัดการและตรวจสอบข้อมูลสมาชิก</p></div>${user().role==="ADMIN"?'<button class="btn primary" id="addMember"><i class="fa-solid fa-plus"></i> เพิ่มสมาชิก</button>':""}</div>
  ${user().role==="ADMIN"?`<div class="panel" style="margin-bottom:18px"><h3>สร้างบัญชีเข้าสู่ระบบให้สมาชิก</h3><div class="form-grid"><label>เลือกสมาชิก<select id="accountMember" class="field">${members.map(m=>`<option value="${escapeHtml(m.memberId)}">${escapeHtml(m.firstName+" "+m.lastName)} (${escapeHtml(m.memberId)})</option>`).join("")}</select></label><label>Username<input id="accountUsername" class="field" autocomplete="off" placeholder="เช่น member001"></label><label>Password (อย่างน้อย 5 ตัว)<input id="accountPassword" class="field" type="password" autocomplete="new-password"></label></div><button class="btn primary" id="createAccount" style="margin-top:14px">สร้างบัญชีสมาชิก</button><p class="muted" style="font-size:12px">ระบบจะผูกบัญชีกับรหัสสมาชิกที่เลือกโดยอัตโนมัติ</p></div>`:""}
  <div class="panel"><div class="toolbar"><input class="field" id="memberSearch" placeholder="ค้นหาชื่อหรือรหัสสมาชิก"></div><div class="table-wrap"><table><thead><tr><th>ชื่อ–นามสกุล</th><th>รหัสนักเรียน</th><th>ฝ่าย</th><th>ตำแหน่ง</th><th>สถานะ</th></tr></thead><tbody id="memberRows"></tbody></table></div></div>`;
  const draw=()=>{$("#memberRows").innerHTML=members.filter(m=>(m.firstName+" "+m.lastName+" "+m.studentCode).toLowerCase().includes($("#memberSearch").value.toLowerCase())).map(m=>`<tr><td>${escapeHtml(m.prefix)}${escapeHtml(m.firstName)} ${escapeHtml(m.lastName)}</td><td>${escapeHtml(m.studentCode)}</td><td>${escapeHtml((depts.find(d=>d.departmentId===m.departmentId)||{}).name||"-")}</td><td>${escapeHtml(m.position)}</td><td><span class="pill ${m.status==="ACTIVE"?"green":"amber"}">${escapeHtml(m.status)}</span></td></tr>`).join("")||'<tr><td colspan="5">ไม่พบข้อมูล</td></tr>'};
  $("#memberSearch").addEventListener("input",draw);draw();
  if(user().role==="ADMIN") $("#addMember").onclick=()=>memberDialog(depts);
  if(user().role==="ADMIN") $("#createAccount").onclick=async()=>{try{const password=$("#accountPassword").value;if(password.length<5)throw new Error("รหัสผ่านต้องมีอย่างน้อย 5 ตัวอักษร");const r=await API.call("createMemberAccount",{memberId:$("#accountMember").value,username:$("#accountUsername").value,password});toast("สร้างบัญชี "+r.username+" เรียบร้อย");$("#accountPassword").value="";}catch(e){toast(e.message)}};
}
async function memberDialog(depts){
  await modalForm({title:"เพิ่มสมาชิกใหม่",subtitle:"กรอกข้อมูลพื้นฐานและเลือกฝ่ายที่สังกัด",icon:"fa-user-plus",submitText:"เพิ่มสมาชิก",fields:[
    {name:"firstName",label:"ชื่อจริง",placeholder:"ระบุชื่อจริง",required:true,maxLength:80},
    {name:"lastName",label:"นามสกุล",placeholder:"ระบุนามสกุล",required:true,maxLength:80},
    {name:"studentCode",label:"รหัสนักเรียน",placeholder:"ระบุรหัสนักเรียน (ไม่บังคับ)",maxLength:40},
    {name:"departmentId",label:"ฝ่ายที่สังกัด",type:"select",required:true,options:depts.map(d=>({value:d.departmentId,label:d.name})),value:depts[0]?.departmentId||""}
  ],onSubmit:async v=>{await API.call("saveMember",v);toast("เพิ่มสมาชิกเรียบร้อย");loadPage("members");}});
}
async function renderAttendance(el){
  const [members,records]=await Promise.all([API.call("listMembers"),API.call("listAttendance")]);
  const activeMembers=members.filter(m=>String(m.status||"ACTIVE").toUpperCase()==="ACTIVE");
  el.innerHTML=`<div class="page-heading"><div><h2>ระบบเช็กชื่อแบบกลุ่ม</h2><p>เลือกสมาชิกหลายคนและกำหนดสถานะได้ในครั้งเดียว ${["DEPT_HEAD","DEPT_DEPUTY"].includes(user().role)?"· แสดงเฉพาะสมาชิกในฝ่ายของคุณ":""}</p></div></div>
  <div class="panel attendance-batch-panel"><h3><i class="fa-solid fa-clipboard-check"></i> บันทึกการเข้าร่วมกิจกรรม</h3>
    <div class="form-grid attendance-event-fields">
      <label>ชื่อกิจกรรม<input id="eventName" class="field" maxlength="120" placeholder="เช่น ประชุมประจำสัปดาห์"></label>
      <label>ประเภทกิจกรรม<select id="eventType" class="field"><option value="MEETING">ประชุม</option><option value="ACTIVITY">กิจกรรม</option><option value="DUTY">ปฏิบัติหน้าที่</option></select></label>
    </div>
    <div class="attendance-toolbar">
      <input id="attendanceSearch" class="field" type="search" placeholder="ค้นหาชื่อหรือรหัสสมาชิก..." aria-label="ค้นหาสมาชิก">
      <div class="attendance-selection-actions">
        <button class="btn" type="button" id="selectAllAttendance">เลือกทั้งหมด</button>
        <button class="btn" type="button" id="clearAllAttendance">ล้างการเลือก</button>
      </div>
    </div>
    <div class="attendance-quick-status"><span>ตั้งสถานะให้สมาชิกที่เลือก:</span>
      <button type="button" class="attendance-status-btn present" data-set-status="PRESENT">ทั้งหมดมา</button>
      <button type="button" class="attendance-status-btn late" data-set-status="LATE">ทั้งหมดสาย</button>
      <button type="button" class="attendance-status-btn leave" data-set-status="LEAVE">ทั้งหมดลา</button>
      <button type="button" class="attendance-status-btn absent" data-set-status="ABSENT">ทั้งหมดขาด</button>
    </div>
    <div class="attendance-count-line"><strong id="attendanceSelectedCount">เลือก 0 คน</strong><span id="attendanceVisibleCount">สมาชิก ${activeMembers.length} คน</span></div>
    <div class="table-wrap attendance-batch-table-wrap"><table class="attendance-batch-table"><thead><tr><th class="att-check-col"><input type="checkbox" id="toggleVisibleAttendance" aria-label="เลือกสมาชิกที่แสดง"></th><th>สมาชิก</th><th>รหัสสมาชิก</th><th>สถานะการเข้าร่วม</th></tr></thead><tbody id="attendanceBatchRows"></tbody></table></div>
    <div class="attendance-submit-row"><span class="muted">บันทึกเฉพาะสมาชิกที่ติ๊กเลือกไว้</span><button class="btn primary" id="saveAttendanceBatch"><i class="fa-solid fa-floppy-disk"></i> บันทึกการเช็กชื่อ</button></div>
  </div>
  <div class="panel" style="margin-top:18px"><h3>ประวัติการเช็กชื่อล่าสุด</h3><div class="table-wrap"><table><thead><tr><th>กิจกรรม</th><th>สมาชิก</th><th>สถานะ</th><th>ผู้บันทึก</th><th>เวลา</th></tr></thead><tbody>${records.map(r=>`<tr><td>${escapeHtml(r.eventName)}</td><td>${escapeHtml(r.memberName)}</td><td>${statusPill(r.status)}</td><td>${escapeHtml(r.recordedBy||"-")}</td><td>${escapeHtml(String(r.createdAt).slice(0,16).replace("T"," "))}</td></tr>`).join("")||'<tr><td colspan="5">ยังไม่มีรายการ</td></tr>'}</tbody></table></div></div>`;

  const selected = new Set(activeMembers.map(m=>String(m.memberId)));
  const statusByMember = new Map(activeMembers.map(m=>[String(m.memberId),"PRESENT"]));
  const statusOptions = `<option value="PRESENT">มา</option><option value="LATE">สาย</option><option value="LEAVE">ลา</option><option value="ABSENT">ขาด</option>`;
  const tbody=$("#attendanceBatchRows");
  const updateCount=()=>{
    $("#attendanceSelectedCount").textContent=`เลือก ${selected.size} คน`;
    const visible=filteredMembers();
    $("#toggleVisibleAttendance").checked=visible.length>0&&visible.every(m=>selected.has(String(m.memberId)));
    $("#toggleVisibleAttendance").indeterminate=visible.some(m=>selected.has(String(m.memberId)))&&!visible.every(m=>selected.has(String(m.memberId)));
  };
  const filteredMembers=()=>{
    const q=$("#attendanceSearch").value.trim().toLowerCase();
    return activeMembers.filter(m=>(`${m.firstName||""} ${m.lastName||""} ${m.studentCode||""} ${m.memberId||""}`).toLowerCase().includes(q));
  };
  const drawRows=()=>{
    const visible=filteredMembers();
    $("#attendanceVisibleCount").textContent=`แสดง ${visible.length} จาก ${activeMembers.length} คน`;
    tbody.innerHTML=visible.map(m=>{
      const id=String(m.memberId);
      return `<tr data-attendance-row="${escapeHtml(id)}"><td><input class="attendance-member-check" type="checkbox" data-member-check="${escapeHtml(id)}" ${selected.has(id)?"checked":""} aria-label="เลือก ${escapeHtml(m.firstName+" "+m.lastName)}"></td><td><strong>${escapeHtml((m.prefix||"")+(m.firstName||"")+" "+(m.lastName||""))}</strong></td><td>${escapeHtml(m.studentCode||id)}</td><td><select class="field attendance-status-select" data-member-status="${escapeHtml(id)}">${statusOptions}</select></td></tr>`;
    }).join("")||'<tr><td colspan="4" class="empty">ไม่พบสมาชิกที่ค้นหา</td></tr>';
    visible.forEach(m=>{const select=document.querySelector(`[data-member-status="${CSS.escape(String(m.memberId))}"]`);if(select)select.value=statusByMember.get(String(m.memberId))||"PRESENT";});
    tbody.querySelectorAll("[data-member-check]").forEach(chk=>chk.addEventListener("change",()=>{const id=chk.dataset.memberCheck;if(chk.checked)selected.add(id);else selected.delete(id);updateCount();}));
    tbody.querySelectorAll("[data-member-status]").forEach(sel=>sel.addEventListener("change",()=>statusByMember.set(sel.dataset.memberStatus,sel.value)));
    updateCount();
  };
  $("#attendanceSearch").addEventListener("input",drawRows);
  $("#selectAllAttendance").onclick=()=>{filteredMembers().forEach(m=>selected.add(String(m.memberId)));drawRows();};
  $("#clearAllAttendance").onclick=()=>{filteredMembers().forEach(m=>selected.delete(String(m.memberId)));drawRows();};
  $("#toggleVisibleAttendance").onchange=e=>{filteredMembers().forEach(m=>e.target.checked?selected.add(String(m.memberId)):selected.delete(String(m.memberId)));drawRows();};
  document.querySelectorAll("[data-set-status]").forEach(btn=>btn.onclick=()=>{filteredMembers().filter(m=>selected.has(String(m.memberId))).forEach(m=>statusByMember.set(String(m.memberId),btn.dataset.setStatus));drawRows();});
  $("#saveAttendanceBatch").onclick=async()=>{
    const recordsToSave=activeMembers.filter(m=>selected.has(String(m.memberId))).map(m=>({memberId:String(m.memberId),status:statusByMember.get(String(m.memberId))||"PRESENT"}));
    if(!$("#eventName").value.trim()){toast("กรุณาระบุชื่อกิจกรรม");$("#eventName").focus();return;}
    if(!recordsToSave.length){toast("กรุณาเลือกสมาชิกอย่างน้อย 1 คน");return;}
    const btn=$("#saveAttendanceBatch");btn.disabled=true;btn.innerHTML='<span class="button-spinner inline-spinner"></span> กำลังบันทึก...';
    try{const result=await API.call("recordAttendanceBatch",{eventName:$("#eventName").value.trim(),eventType:$("#eventType").value,records:recordsToSave});const deductionText=result.autoDeductions?` · หักอัตโนมัติ ${result.absentPenalties||0} คน (ขาด) และ ${result.latePenalties||0} คน (สาย) รวม ${result.deductedPoints} คะแนน`:"";toast(`บันทึกเช็กชื่อสำเร็จ ${result.saved} คน${deductionText}`);loadPage("attendance");}
    catch(e){toast(e.message);btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> บันทึกการเช็กชื่อ';}
  };
  drawRows();
}
function statusPill(s){const map={PRESENT:["มา","green"],LATE:["สาย","amber"],LEAVE:["ลา",""],ABSENT:["ขาด","red"]};const x=map[s]||[s,""];return `<span class="pill ${x[1]}">${x[0]}</span>`}
async function renderBehavior(el){
  const [members,logs]=await Promise.all([API.call("listMembers"),API.call("listBehavior")]);
  el.innerHTML=`<div class="page-heading"><div><h2>คะแนนความประพฤติ</h2><p>คะแนนเริ่มต้น 100 คะแนน · รายการทั่วไปต้องผ่านการอนุมัติ · ขาดหัก 5 คะแนน และสายหัก 3 คะแนนอัตโนมัติ ตามประเภทการประชุม การปฏิบัติหน้าที่ หรือกิจกรรม</p></div></div>
  <div class="panel"><h3>ส่งคำขอเพิ่ม / หักคะแนน</h3><div class="form-grid">
  <label>สมาชิก<select id="behMember" class="field">${members.map(m=>`<option value="${escapeHtml(m.memberId)}">${escapeHtml(m.firstName+" "+m.lastName)}</option>`).join("")}</select></label>
  <label>คะแนน (+ เพิ่ม / - หัก)<input id="behPoints" class="field" type="number" min="-30" max="30" placeholder="-5"></label>
  <label>เหตุผล<input id="behReason" class="field" placeholder="ระบุเหตุผล"></label>
  <label>ลิงก์หลักฐาน<input id="behEvidence" class="field" placeholder="https://... (ถ้ามี)"></label></div><button class="btn primary" id="sendBehavior" style="margin-top:15px">ส่งคำขอ</button></div>
  <div class="panel" style="margin-top:18px"><h3>ประวัติคะแนน</h3><div class="table-wrap"><table><thead><tr><th>สมาชิก</th><th>คะแนน</th><th>เหตุผล</th><th>สถานะ</th><th>ผู้บันทึก</th><th>การอนุมัติ</th></tr></thead><tbody>${logs.map(x=>`<tr><td>${escapeHtml(x.memberName)}</td><td>${Number(x.pointsChange)>0?"+":""}${escapeHtml(x.pointsChange)}</td><td>${escapeHtml(cleanDisplayReason(x.reason))}</td><td>${escapeHtml(x.status)}</td><td>${escapeHtml(x.recordedBy)}</td><td>${x.status==="PENDING"&&user().role==="ADMIN"?`<button class="btn primary" data-approve="${escapeHtml(x.logId)}">อนุมัติ</button>`:"-"}</td></tr>`).join("")||'<tr><td colspan="6">ยังไม่มีรายการ</td></tr>'}</tbody></table></div></div>`;
  $("#sendBehavior").onclick=async()=>{try{await API.call("addBehavior",{memberId:$("#behMember").value,pointsChange:Number($("#behPoints").value),reason:$("#behReason").value,evidenceUrl:$("#behEvidence").value});toast("ส่งคำขอแล้ว");loadPage("behavior")}catch(e){toast(e.message)}};
  document.querySelectorAll("[data-approve]").forEach(b=>b.onclick=async()=>{try{await API.call("approveBehavior",{logId:b.dataset.approve,approve:true});toast("อนุมัติแล้ว");loadPage("behavior")}catch(e){toast(e.message)}});
}

async function renderMemberPortal(el,page="memberPortal"){
  const d=await API.call("getMyPortal");
  const m=d.member, summary=d.attendanceSummary;
  const deptNames={D1:"วิชาการ",D2:"กิจการนักเรียน",D3:"ประชาสัมพันธ์",D4:"บริหาร",D5:"งบประมาณ",D6:"นันทนาการ"};
  const activeAppealIds=new Set(d.appeals.filter(a=>["PENDING","APPROVED"].includes(a.status)).map(a=>String(a.behaviorLogId)));
  const behaviorRows=d.behavior.map(x=>`<tr><td>${escapeHtml(new Date(x.createdAt).toLocaleString("th-TH"))}</td><td>${escapeHtml(cleanDisplayReason(x.reason))}</td><td>${Number(x.pointsChange)>0?"+":""}${Number(x.pointsChange)}</td><td>${statusBehavior(x.status)}</td><td>${x.status==="APPROVED"&&Number(x.pointsChange)<0?(activeAppealIds.has(String(x.logId))?"ส่งอุทธรณ์แล้ว":`<button class="btn primary" data-appeal="${escapeHtml(x.logId)}">ยื่นอุทธรณ์</button>`):"-"}</td></tr>`).join("")||'<tr><td colspan="5">ยังไม่มีประวัติคะแนน</td></tr>';
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
  document.querySelectorAll("[data-appeal]").forEach(b=>b.onclick=async()=>{await modalForm({title:"ยื่นคำอุทธรณ์คะแนน",subtitle:"ชี้แจงเหตุผลและแนบหลักฐานประกอบ (ถ้ามี)",icon:"fa-scale-balanced",submitText:"ส่งคำอุทธรณ์",fields:[{name:"reason",label:"เหตุผลที่ต้องการอุทธรณ์",type:"textarea",placeholder:"อธิบายเหตุผลอย่างน้อย 10 ตัวอักษร",required:true,minLength:10,rows:5},{name:"evidenceUrl",label:"ลิงก์หลักฐาน",type:"url",placeholder:"https://... (ไม่บังคับ)",hint:"ใส่ลิงก์ไฟล์หรือหลักฐานที่ผู้พิจารณาสามารถเปิดดูได้"}],onSubmit:async v=>{await API.call("submitAppeal",{behaviorLogId:b.dataset.appeal,...v});toast("ส่งคำอุทธรณ์แล้ว");loadPage("myAppeals");}})});
}

function statusBehavior(s){const map={APPROVED:["อนุมัติแล้ว","green"],PENDING:["รออนุมัติ","amber"],REJECTED:["ไม่อนุมัติ","red"]};const v=map[s]||[s,""];return `<span class="pill ${v[1]}">${v[0]}</span>`}
function appealStatus(s){const map={PENDING:["รอตรวจสอบ","amber"],APPROVED:["อนุมัติ","green"],REJECTED:["ไม่อนุมัติ","red"]};const v=map[s]||[s,""];return `<span class="pill ${v[1]}">${v[0]}</span>`}
async function renderAppeals(el){
  const items=await API.call("listAppeals");
  el.innerHTML=`<div class="page-heading"><div><h2>ตรวจสอบคำอุทธรณ์</h2><p>เมื่ออนุมัติ ระบบจะคืนคะแนนตามรายการหักเดิมโดยบันทึกเป็นรายการใหม่</p></div></div><div class="panel"><div class="table-wrap"><table><thead><tr><th>สมาชิก</th><th>รหัสรายการคะแนน</th><th>เหตุผลอุทธรณ์</th><th>หลักฐาน</th><th>สถานะ</th><th>พิจารณา</th></tr></thead><tbody>${items.map(a=>`<tr><td>${escapeHtml(a.memberId)}</td><td>${escapeHtml(a.behaviorLogId)}</td><td>${escapeHtml(a.reason)}</td><td>${a.evidenceUrl?`<a href="${escapeHtml(a.evidenceUrl)}" target="_blank" rel="noopener">เปิดหลักฐาน</a>`:"-"}</td><td>${appealStatus(a.status)}</td><td>${a.status==="PENDING"?`<button class="btn primary" data-review="${escapeHtml(a.appealId)}" data-approve="1">อนุมัติ</button> <button class="btn" data-review="${escapeHtml(a.appealId)}" data-approve="0">ไม่อนุมัติ</button>`:escapeHtml(a.reviewNote||"-")}</td></tr>`).join("")||'<tr><td colspan="6">ไม่มีคำอุทธรณ์</td></tr>'}</tbody></table></div></div>`;
  document.querySelectorAll("[data-review]").forEach(b=>b.onclick=async()=>{const approve=b.dataset.approve==="1";await modalForm({title:approve?"อนุมัติคำอุทธรณ์":"ไม่อนุมัติคำอุทธรณ์",subtitle:"บันทึกเหตุผลประกอบการพิจารณา",icon:approve?"fa-circle-check":"fa-circle-xmark",submitText:"ยืนยันผลพิจารณา",fields:[{name:"reviewNote",label:"เหตุผลการพิจารณา",type:"textarea",placeholder:"ระบุเหตุผลให้สมาชิกเข้าใจ",required:true,minLength:3,rows:4}],onSubmit:async v=>{await API.call("reviewAppeal",{appealId:b.dataset.review,approve,reviewNote:v.reviewNote});toast("บันทึกผลพิจารณาแล้ว");loadPage("appeals");}})});
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

async function renderDepartmentLeaders(el){
  if(user()?.role!=="ADMIN") throw new Error("เฉพาะ ADMIN เท่านั้นที่แต่งตั้งหัวหน้าฝ่ายได้");
  const [departments,accounts,members]=await Promise.all([API.call("listDepartments"),API.call("adminListUsers"),API.call("listMembers")]);
  const memberById=new Map(members.map(m=>[String(m.memberId),m]));
  const eligible=accounts.filter(a=>a.active&&a.memberId&&memberById.has(String(a.memberId))&&["MEMBER","DEPT_HEAD","DEPT_DEPUTY"].includes(String(a.role).toUpperCase())).map(a=>({...a,departmentId:memberById.get(String(a.memberId)).departmentId}));
  const nameOf=a=>`${a.displayName||a.username} (${a.username})`;
  el.innerHTML=`<div class="page-heading"><div><h2>แต่งตั้งหัวหน้าฝ่าย</h2><p>กำหนดหัวหน้าฝ่าย 1 คน และรองหัวหน้าได้หลายคน โดยเลือกจากบัญชีสมาชิกที่อยู่ในฝ่ายนั้น</p></div><button class="btn" id="reloadDepartmentLeaders"><i class="fa-solid fa-rotate"></i> รีเฟรช</button></div>
  <div class="panel dept-leader-info"><i class="fa-solid fa-circle-info"></i><div><b>หลักการกำหนดตำแหน่ง</b><p>ADMIN เป็นผู้แต่งตั้งเท่านั้น ผู้ได้รับตำแหน่งต้องมีบัญชีที่ใช้งานได้และผูกกับสมาชิกในฝ่ายนั้น การเปลี่ยนตำแหน่งจะมีผลกับสิทธิ์หลังบันทึกทันทีที่เรียก API ครั้งถัดไป</p></div></div>
  <div class="dept-leader-grid">${departments.filter(d=>String(d.active).toLowerCase()!=="false").map(d=>{
    const currentHead=accounts.find(a=>a.role==="DEPT_HEAD"&&String(a.departmentId)===String(d.departmentId));
    const currentDeputies=accounts.filter(a=>a.role==="DEPT_DEPUTY"&&String(a.departmentId)===String(d.departmentId));
    const options=eligible.filter(a=>String(a.departmentId)===String(d.departmentId));
    return `<section class="panel dept-leader-card" data-dept-card="${escapeHtml(d.departmentId)}"><div class="dept-leader-card-head"><span class="dept-icon"><i class="fa-solid fa-people-group"></i></span><div><h3>${escapeHtml(d.name)}</h3><small>${escapeHtml(d.departmentId)}</small></div></div>
      <label>หัวหน้าฝ่าย <span class="required-mark">*</span><select class="field dept-head-select"><option value="">เลือกหัวหน้าฝ่าย</option>${options.map(a=>`<option value="${escapeHtml(a.userId)}" ${currentHead&&String(currentHead.userId)===String(a.userId)?"selected":""}>${escapeHtml(nameOf(a))}</option>`).join("")}</select></label>
      <label>รองหัวหน้าฝ่าย <small class="muted">เลือกได้หลายคน</small><select class="field dept-deputy-select" multiple size="${Math.min(4,Math.max(2,options.length))}">${options.filter(a=>!currentHead||String(a.userId)!==String(currentHead.userId)).map(a=>`<option value="${escapeHtml(a.userId)}" ${currentDeputies.some(x=>String(x.userId)===String(a.userId))?"selected":""}>${escapeHtml(nameOf(a))}</option>`).join("")}</select></label>
      <p class="dept-leader-hint">มีบัญชีที่สามารถแต่งตั้งได้ ${options.length} บัญชี</p><button class="btn primary dept-save-btn" data-save-dept="${escapeHtml(d.departmentId)}"><i class="fa-solid fa-floppy-disk"></i> บันทึกตำแหน่งฝ่ายนี้</button></section>`;
  }).join("")}</div>`;
  el.querySelectorAll("[data-save-dept]").forEach(btn=>btn.addEventListener("click",async()=>{
    const card=btn.closest("[data-dept-card]"),headUserId=card.querySelector(".dept-head-select").value;
    const deputyUserIds=Array.from(card.querySelector(".dept-deputy-select").selectedOptions).map(o=>o.value);
    if(!headUserId){toast("กรุณาเลือกหัวหน้าฝ่าย");return;}
    if(deputyUserIds.includes(headUserId)){toast("บัญชีเดียวกันเป็นทั้งหัวหน้าและรองหัวหน้าไม่ได้");return;}
    btn.disabled=true;btn.innerHTML='<span class="button-spinner"></span> กำลังบันทึก...';
    try{await API.call("adminSetDepartmentLeaders",{departmentId:btn.dataset.saveDept,headUserId,deputyUserIds});toast("บันทึกตำแหน่งหัวหน้าฝ่ายเรียบร้อย");loadPage("departmentLeaders");}
    catch(e){toast(e.message);btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> บันทึกตำแหน่งฝ่ายนี้';}
  }));
  $("#reloadDepartmentLeaders").onclick=()=>loadPage("departmentLeaders");
}

async function renderUserManagement(el){
  if(user()?.role!=="ADMIN")throw new Error("ไม่มีสิทธิ์เข้าถึงหน้านี้");
  const [accounts,departments]=await Promise.all([API.call("adminListUsers"),API.call("listDepartments")]);
  el.innerHTML=`<div class="page-heading"><div><h2>จัดการบัญชีผู้ใช้</h2><p>จัดการชื่อที่แสดงและตั้งรหัสผ่านใหม่ให้สมาชิกหรือผู้ดูแล</p></div><button class="btn" id="reloadUsers"><i class="fa-solid fa-rotate"></i> รีเฟรช</button></div>
  <div class="panel user-management-panel"><div class="toolbar"><div class="user-search-wrap"><i class="fa-solid fa-magnifying-glass"></i><input id="userSearch" class="field" placeholder="ค้นหา Username ชื่อผู้ใช้ หรือรหัสสมาชิก" aria-label="ค้นหาบัญชีผู้ใช้"></div><span class="user-count" id="userCount"></span></div><div class="table-wrap"><table><thead><tr><th>Username</th><th>ชื่อที่แสดง</th><th>สิทธิ์</th><th>รหัสสมาชิก</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody id="userAccountRows"></tbody></table></div></div>`;
  const draw=()=>{
    const query=$("#userSearch").value.trim().toLowerCase();
    const filtered=accounts.filter(a=>(String(a.username)+" "+String(a.displayName)+" "+String(a.memberId)).toLowerCase().includes(query));
    $("#userCount").textContent=`${filtered.length} จาก ${accounts.length} บัญชี`;
    $("#userAccountRows").innerHTML=filtered.map(a=>`<tr><td><span class="account-username">${escapeHtml(a.username)}</span></td><td>${escapeHtml(a.displayName)}</td><td><span class="role-tag ${String(a.role).toUpperCase()==="ADMIN"?"role-admin":"role-member"}">${escapeHtml(({ADMIN:"ผู้ดูแลระบบ",MEMBER:"สมาชิก",DEPT_HEAD:"หัวหน้าฝ่าย",DEPT_DEPUTY:"รองหัวหน้าฝ่าย"}[a.role]||a.role))}</span></td><td>${escapeHtml(a.memberId||"-")}</td><td><span class="pill ${a.active?"green":"red"}"><span class="status-dot"></span>${a.active?"ใช้งาน":"ปิดใช้งาน"}</span></td><td><button class="btn account-edit-btn" data-edit-user="${escapeHtml(a.userId)}"><i class="fa-solid fa-pen-to-square"></i><span>แก้ไข</span></button></td></tr>`).join("")||'<tr><td colspan="6" class="user-empty">ไม่พบบัญชีผู้ใช้ที่ตรงกับการค้นหา</td></tr>';
    el.querySelectorAll("[data-edit-user]").forEach(btn=>btn.addEventListener("click",()=>openAccountEditDialog(accounts.find(a=>String(a.userId)===btn.dataset.editUser),departments)));
  };
  $("#userSearch").addEventListener("input",draw);
  $("#reloadUsers").onclick=()=>loadPage("userManagement");
  draw();
}

function openAccountEditDialog(account,departments=[]){
  if(!account)return;
  const overlay=document.createElement("div");
  overlay.className="account-modal-backdrop";
  overlay.innerHTML=`<section class="account-modal" role="dialog" aria-modal="true" aria-labelledby="accountModalTitle">
    <header class="account-modal-head"><div class="account-modal-heading"><span class="account-modal-icon"><i class="fa-solid fa-user-pen"></i></span><div><span class="account-modal-eyebrow">ACCOUNT MANAGEMENT</span><h2 id="accountModalTitle">แก้ไขบัญชีผู้ใช้</h2><p>แก้ไขข้อมูลบัญชีและตั้งรหัสผ่านใหม่</p></div></div><button type="button" class="account-modal-close" data-modal-close aria-label="ปิดหน้าต่าง"><i class="fa-solid fa-xmark"></i></button></header>
    <form id="adminEditAccountForm" class="account-modal-form" novalidate>
      <div class="account-identity-card"><span class="account-identity-avatar">${escapeHtml(String(account.displayName||account.username||"U").slice(0,1).toUpperCase())}</span><div><strong>${escapeHtml(account.username)}</strong><span>${escapeHtml(account.role)} · ${escapeHtml(account.memberId||"ไม่มีรหัสสมาชิก")}</span></div><span class="pill ${account.active?"green":"red"}">${account.active?"ใช้งาน":"ปิดใช้งาน"}</span></div>
      <label class="account-modal-label" for="adminEditDepartment">ฝ่ายที่สังกัด</label><div class="account-modal-input-wrap"><i class="fa-solid fa-building"></i><select id="adminEditDepartment" class="field" ${account.memberId ? "" : "disabled"}>${departments.filter(d=>String(d.active).toLowerCase()!=="false").map(d=>`<option value="${escapeHtml(d.departmentId)}" ${String(d.departmentId)===String(account.departmentId)?"selected":""}>${escapeHtml(d.name)}</option>`).join("")}</select></div>${account.memberId?'<p class="muted" style="font-size:12px">เมื่อเปลี่ยนฝ่าย ระบบจะย้ายข้อมูลสมาชิกและถอดตำแหน่งหัวหน้าฝ่าย/รองหัวหน้าฝ่ายเดิมโดยอัตโนมัติ</p>':'<p class="muted" style="font-size:12px">บัญชีนี้ยังไม่ได้ผูกกับข้อมูลสมาชิก จึงเปลี่ยนฝ่ายไม่ได้</p>'}
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
    const displayName=nameInput.value.trim(),newPassword=overlay.querySelector("#adminEditNewPassword").value,confirmPassword=overlay.querySelector("#adminEditConfirmPassword").value,departmentId=overlay.querySelector("#adminEditDepartment").value;
    error.textContent="";
    if(displayName.length<2){error.textContent="ชื่อที่แสดงต้องมีอย่างน้อย 2 ตัวอักษร";nameInput.focus();return;}
    if(newPassword&&newPassword.length<5){error.textContent="รหัสผ่านใหม่ต้องมีอย่างน้อย 5 ตัวอักษร";return;}
    if(newPassword!==confirmPassword){error.textContent="รหัสผ่านใหม่และการยืนยันไม่ตรงกัน";return;}
    if(!newPassword&&confirmPassword){error.textContent="กรุณากรอกรหัสผ่านใหม่ก่อนยืนยัน";return;}
    button.disabled=true;button.classList.add("is-loading");button.querySelector(".account-save-label").textContent="กำลังบันทึก...";
    try{
      const updatePayload={userId:account.userId,displayName,newPassword};
      if(account.memberId) updatePayload.departmentId=departmentId;
      await API.call("adminUpdateUser",updatePayload);
      close();toast("บันทึกการแก้ไขบัญชีเรียบร้อย");loadPage("userManagement");
    }catch(err){error.textContent=err.message||"ไม่สามารถบันทึกข้อมูลได้ กรุณาลองอีกครั้ง";button.disabled=false;button.classList.remove("is-loading");button.querySelector(".account-save-label").textContent="บันทึกการเปลี่ยนแปลง";}
  });
}


async function renderTasks(el){
  const role=user().role, manager=["ADMIN","DEPT_HEAD","DEPT_DEPUTY","PRESIDENT"].includes(role);
  const [tasks,members,depts]=await Promise.all([API.call("listTasks"),manager?API.call("listMembers"):Promise.resolve([]),["ADMIN","DEPT_HEAD","DEPT_DEPUTY","PRESIDENT"].includes(role)?API.call("listDepartments"):Promise.resolve([])]);
  el.innerHTML=`<div class="page-heading"><div><h2>${manager?"มอบหมายและติดตามงาน":"งานที่ได้รับมอบหมาย"}</h2><p>ติดตามกำหนดส่ง รายงานผล และตรวจสอบสถานะงาน</p></div></div>
  ${manager?`<div class="panel"><h3>สร้างงานใหม่</h3><form id="taskCreateForm" class="form-grid"><label>ชื่องาน<input class="field" name="title" maxlength="150" required></label><label>วันครบกำหนด<input class="field" name="dueDate" type="date" required></label><label>ฝ่าย<select class="field" name="departmentId" id="taskDepartment" ${!["ADMIN","PRESIDENT"].includes(role)?"disabled":""}>${depts.filter(d=>String(d.active).toLowerCase()!=="false" && (["ADMIN","PRESIDENT"].includes(role)||String(d.departmentId)===String(user().departmentId))).map(d=>`<option value="${escapeHtml(d.departmentId)}">${escapeHtml(d.name)}</option>`).join("")}</select></label><label>ความสำคัญ<select class="field" name="priority"><option value="NORMAL">ปกติ</option><option value="LOW">ต่ำ</option><option value="HIGH">สูง</option><option value="URGENT">เร่งด่วน</option></select></label><label style="grid-column:1/-1">รายละเอียด<textarea class="field" name="description" rows="3"></textarea></label><label style="grid-column:1/-1">ผู้รับผิดชอบ (เลือกได้หลายคน)<select class="field" name="assignees" id="taskAssignees" multiple size="5">${members.filter(m=>String(m.status).toUpperCase()!=="INACTIVE").map(m=>`<option value="${escapeHtml(m.memberId)}">${escapeHtml([m.prefix,m.firstName,m.lastName].filter(Boolean).join(""))}</option>`).join("")}</select><small class="muted">กด Ctrl (คอมพิวเตอร์) หรือแตะเลือกหลายรายการตามอุปกรณ์</small></label><div><button class="btn primary" type="submit"><i class="fa-solid fa-plus"></i> สร้างงานและมอบหมาย</button></div></form></div>`:""}
  <div class="panel"><h3>รายการงาน (${tasks.length})</h3><div class="table-wrap"><table><thead><tr><th>งาน</th><th>ผู้รับผิดชอบ</th><th>กำหนดส่ง</th><th>สถานะ</th><th>รายงาน/จัดการ</th></tr></thead><tbody>${tasks.map(t=>`<tr><td><strong>${escapeHtml(t.title)}</strong><br><small>${escapeHtml(t.description||"")}</small></td><td>${escapeHtml(t.assigneeName||t.assigneeMemberId)}</td><td>${escapeHtml(t.dueDate)} ${dueLabel(t.dueDate,t.status)}</td><td>${taskStatus(t.status)}</td><td>${manager?`<button class="btn" data-task-detail="${escapeHtml(t.taskId)}">ดูรายงาน</button>`:""}${t.status!=="APPROVED"&&t.status!=="CANCELLED"&&String(t.assigneeMemberId)===String(user().memberId)?` <button class="btn primary" data-task-submit="${escapeHtml(t.taskId)}">ส่งรายงาน</button>`:""}</td></tr>`).join("")||'<tr><td colspan="5">ยังไม่มีงาน</td></tr>'}</tbody></table></div></div>`;
  const form=el.querySelector("#taskCreateForm");
  if(form && ["ADMIN","PRESIDENT"].includes(role)){
    const deptSelect=form.querySelector("#taskDepartment"), assigneeSelect=form.querySelector("#taskAssignees");
    const refreshAssignees=()=>{const dept=deptSelect.value;[...assigneeSelect.options].forEach(o=>{const m=members.find(x=>String(x.memberId)===String(o.value));o.hidden=!!(m&&String(m.departmentId)!==String(dept));if(o.hidden)o.selected=false;});};
    deptSelect.addEventListener("change",refreshAssignees);refreshAssignees();
  }
  if(form)form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form);const ids=[...form.querySelector("#taskAssignees").selectedOptions].map(o=>o.value);try{await API.call("createTask",{title:fd.get("title"),dueDate:fd.get("dueDate"),description:fd.get("description"),priority:fd.get("priority"),departmentId:form.querySelector("#taskDepartment").value,assigneeMemberIds:ids});toast("สร้างงานเรียบร้อย");loadPage("tasks")}catch(err){toast(err.message)}};
  el.querySelectorAll("[data-task-submit]").forEach(b=>b.onclick=async()=>{await modalForm({title:"ส่งรายงานผลการทำงาน",subtitle:"อธิบายสิ่งที่ดำเนินการและแนบหลักฐานได้",icon:"fa-file-arrow-up",submitText:"ส่งรายงาน",fields:[{name:"report",label:"รายงานผลการทำงาน",type:"textarea",placeholder:"สรุปผลการดำเนินงานอย่างน้อย 10 ตัวอักษร",required:true,minLength:10,rows:5},{name:"evidenceUrl",label:"ลิงก์หลักฐาน",type:"url",placeholder:"https://... (ไม่บังคับ)"}],onSubmit:async v=>{await API.call("submitTask",{taskId:b.dataset.taskSubmit,...v});toast("ส่งรายงานแล้ว");loadPage("tasks");}})});
  el.querySelectorAll("[data-task-detail]").forEach(b=>b.onclick=async()=>{const t=tasks.find(x=>String(x.taskId)===b.dataset.taskDetail);const sub=(t.submissions||[]).slice(-1)[0];if(!sub){toast("ยังไม่มีรายงานส่งเข้ามา");return;}const intro=`<div class="app-modal-report"><b>รายงานจากสมาชิก</b><p>${escapeHtml(sub.report)}</p>${sub.evidenceUrl?`<a href="${escapeHtml(sub.evidenceUrl)}" target="_blank" rel="noopener">เปิดหลักฐาน <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`:'<small>ไม่มีลิงก์หลักฐานแนบ</small>'}</div>`;await modalForm({title:"ตรวจสอบรายงานงาน",subtitle:escapeHtml(t.title||"งานที่ได้รับมอบหมาย"),icon:"fa-clipboard-check",intro,submitText:"บันทึกผลตรวจ",fields:[{name:"decision",label:"ผลการตรวจ",type:"select",required:true,value:"APPROVED",options:[{value:"APPROVED",label:"อนุมัติ — งานเรียบร้อย"},{value:"REVISION",label:"ให้แก้ไข — ส่งกลับสมาชิก"}]},{name:"note",label:"หมายเหตุถึงสมาชิก",type:"textarea",placeholder:"ระบุข้อเสนอแนะหรือสิ่งที่ต้องแก้ไข (กรณีให้แก้ไขต้องระบุ)",rows:3}],onSubmit:async v=>{if(v.decision==="REVISION"&&v.note.trim().length<3)throw new Error("กรุณาระบุสิ่งที่ต้องแก้ไขอย่างน้อย 3 ตัวอักษร");await API.call("reviewTask",{taskId:t.taskId,decision:v.decision,note:v.note});toast("บันทึกผลตรวจงานแล้ว");loadPage("tasks");}})});
}
function taskStatus(s){const m={OPEN:["รอดำเนินการ",""],SUBMITTED:["ส่งแล้ว","amber"],APPROVED:["สำเร็จ","green"],REVISION:["ให้แก้ไข","red"],CANCELLED:["ยกเลิก",""]};const x=m[s]||[s,""];return `<span class="pill ${x[1]}">${x[0]}</span>`}
function dueLabel(date,status){if(["APPROVED","CANCELLED"].includes(status)||!date)return "";const days=Math.ceil((new Date(String(date)+"T23:59:59").getTime()-Date.now())/86400000);if(days<0)return '<span class="pill red">เลยกำหนด</span>';if(days<=3)return `<span class="pill amber">${days===0?"ครบกำหนดวันนี้":"เหลือ "+days+" วัน"}</span>`;return ""}

async function renderAnnouncements(el){
  const role=user().role,canPost=["ADMIN","DEPT_HEAD","DEPT_DEPUTY","PRESIDENT"].includes(role);
  const [items,depts]=await Promise.all([API.call("listAnnouncements"),role==="ADMIN"?API.call("listDepartments"):Promise.resolve([])]);
  el.innerHTML=`<div class="page-heading"><div><h2>ประกาศข่าวสาร</h2><p>ติดตามข่าวสารและกดรับทราบประกาศสำคัญ</p></div></div>${canPost?`<div class="panel"><h3>สร้างประกาศ</h3><form id="announcementForm" class="form-grid"><label>หัวข้อ<input class="field" name="title" required maxlength="150"></label>${role==="ADMIN"?`<label>กลุ่มเป้าหมาย<select class="field" name="departmentId"><option value="">ทั้งพรรค</option>${depts.map(d=>`<option value="${escapeHtml(d.departmentId)}">${escapeHtml(d.name)}</option>`).join("")}</select></label>`:""}<label style="grid-column:1/-1">เนื้อหาประกาศ<textarea class="field" name="body" rows="4" required></textarea></label><label>วันหมดอายุ (ไม่บังคับ)<input class="field" type="date" name="expiresAt"></label><label><input type="checkbox" name="isPinned"> ปักหมุดประกาศ</label><div><button class="btn primary" type="submit">เผยแพร่ประกาศ</button></div></form></div>`:""}<div class="panel"><h3>ประกาศทั้งหมด</h3>${items.map(a=>`<article class="announcement-item"><div><strong>${String(a.isPinned)==="true"?"📌 ":""}${escapeHtml(a.title)}</strong><small class="muted">${escapeHtml(a.createdBy)} · ${new Date(a.createdAt).toLocaleString("th-TH")}</small></div><p>${escapeHtml(a.body).replace(/\n/g,"<br>")}</p><div class="toolbar"><span class="pill ${a.acknowledged?"green":"amber"}">${a.acknowledged?"รับทราบแล้ว":"ยังไม่รับทราบ"}</span>${!a.acknowledged&&user().memberId?`<button class="btn primary" data-ack="${escapeHtml(a.announcementId)}">รับทราบ</button>`:""}</div></article>`).join("")||'<p class="muted">ยังไม่มีประกาศ</p>'}</div>`;
  const f=el.querySelector("#announcementForm");if(f)f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f);try{await API.call("saveAnnouncement",{title:fd.get("title"),body:fd.get("body"),departmentId:fd.get("departmentId")||"",expiresAt:fd.get("expiresAt"),isPinned:fd.has("isPinned")});toast("เผยแพร่ประกาศแล้ว");loadPage("announcements")}catch(err){toast(err.message)}};
  el.querySelectorAll("[data-ack]").forEach(b=>b.onclick=async()=>{try{await API.call("acknowledgeAnnouncement",{announcementId:b.dataset.ack});toast("บันทึกการรับทราบแล้ว");loadPage("announcements")}catch(err){toast(err.message)}});
}

async function renderCalendar(el){
  const items=await API.call("listCalendar",{from:new Date().toISOString().slice(0,10)});const role=user().role,canCreate=["ADMIN","DEPT_HEAD","DEPT_DEPUTY","PRESIDENT"].includes(role);
  el.innerHTML=`<div class="page-heading"><div><h2>ปฏิทินกิจกรรม</h2><p>รวมวันประชุม กิจกรรม และกำหนดส่งงาน</p></div></div>${canCreate?`<div class="panel"><h3>เพิ่มกิจกรรมในปฏิทิน</h3><form id="calendarForm" class="form-grid"><label>ชื่อกิจกรรม<input class="field" name="title" required></label><label>วันที่<input class="field" type="date" name="eventDate" required></label><label>สถานที่<input class="field" name="location"></label><label>ประเภท<select class="field" name="activityType"><option value="MEETING">ประชุม</option><option value="ACTIVITY">กิจกรรม</option><option value="DUTY">งาน/เวร</option></select></label><label style="grid-column:1/-1">รายละเอียด<textarea class="field" name="description"></textarea></label><div><button class="btn primary">เพิ่มกิจกรรม</button></div></form></div>`:""}<div class="panel"><h3>กำหนดการที่กำลังจะมาถึง</h3><div class="table-wrap"><table><thead><tr><th>วันที่</th><th>รายการ</th><th>ประเภท</th><th>รายละเอียด</th></tr></thead><tbody>${items.map(x=>`<tr><td>${escapeHtml(x.date)}</td><td><strong>${escapeHtml(x.title)}</strong></td><td>${x.type==="TASK"?"กำหนดส่งงาน":"กิจกรรม"}</td><td>${escapeHtml(x.location||x.description||x.status||"-")} ${x.type==="TASK"?dueLabel(x.date,x.status):""}</td></tr>`).join("")||'<tr><td colspan="4">ยังไม่มีกำหนดการ</td></tr>'}</tbody></table></div></div>`;
  const f=el.querySelector("#calendarForm");if(f)f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f);try{await API.call("saveCalendarEvent",{title:fd.get("title"),eventDate:fd.get("eventDate"),location:fd.get("location"),activityType:fd.get("activityType"),description:fd.get("description")});toast("เพิ่มกิจกรรมแล้ว");loadPage("calendar")}catch(err){toast(err.message)}};
}

async function renderReports(el){
  const d=await API.call("getReports",{departmentId:user().role==="ADMIN"?"":user().departmentId});
  el.innerHTML=`<div class="page-heading"><div><h2>รายงานผลการปฏิบัติงาน</h2><p>สรุปข้อมูลการเข้าร่วม คะแนน และความคืบหน้างานจากฐานข้อมูล</p></div></div><div class="stats">${stat("สมาชิก",d.totalMembers,"fa-users")}${stat("เข้าร่วมกิจกรรม",d.attendance.rate+"%","fa-calendar-check")}${stat("คะแนนเฉลี่ย",d.averageScore,"fa-award")}${stat("งานสำเร็จ",d.tasks.done+" / "+d.tasks.total,"fa-list-check")}</div><div class="stats">${stat("งานค้าง",d.tasks.open,"fa-hourglass-half")}${stat("งานเลยกำหนด",d.tasks.overdue,"fa-triangle-exclamation")}${stat("ขาดกิจกรรม",d.attendance.absent,"fa-user-xmark")}${stat("มาสาย",d.attendance.late,"fa-clock")}</div><div class="panel"><h3>เปรียบเทียบผลงานรายเดือน (จำนวนงาน)</h3><div class="table-wrap"><table><thead><tr><th>เดือน</th><th>งานทั้งหมด</th><th>สำเร็จ</th><th>ยังไม่สำเร็จ</th></tr></thead><tbody>${d.monthly.map(m=>`<tr><td>${escapeHtml(m.month)}</td><td>${m.total}</td><td>${m.done}</td><td>${m.open}</td></tr>`).join("")||'<tr><td colspan="4">ยังไม่มีข้อมูลงานรายเดือน</td></tr>'}</tbody></table></div></div><div class="panel"><h3>เปรียบเทียบผลการดำเนินงานรายฝ่าย</h3><div class="table-wrap"><table><thead><tr><th>ฝ่าย</th><th>สมาชิก</th><th>คะแนนเฉลี่ย</th><th>เข้าร่วม</th><th>งานสำเร็จ</th></tr></thead><tbody>${d.departmentComparison.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${x.members}</td><td>${x.averageScore}</td><td>${x.attendanceRate}%</td><td>${x.tasksDone}/${x.tasksTotal}</td></tr>`).join("")||'<tr><td colspan="5">ไม่มีข้อมูล</td></tr>'}</tbody></table></div></div><div class="panel"><h3>สถิติการเข้าร่วมกิจกรรม</h3><p>มา/สาย ${d.attendance.attended} · ลา ${d.attendance.leave} · ขาด ${d.attendance.absent} · ทั้งหมด ${d.attendance.total} รายการ</p></div>`;
}

async function renderAudit(el){if(user().role!=="ADMIN"&&user().role!=="AUDITOR")throw new Error("ไม่มีสิทธิ์ดูประวัติการใช้งาน");const items=await API.call("listAuditLog",{limit:300});el.innerHTML=`<div class="page-heading"><div><h2>ประวัติการใช้งานระบบ</h2><p>ตรวจสอบว่าใครดำเนินการอะไร กับข้อมูลใด และเมื่อใด</p></div><button class="btn" id="reloadAudit"><i class="fa-solid fa-rotate"></i> รีเฟรช</button></div><div class="panel"><div class="table-wrap"><table><thead><tr><th>วันและเวลา</th><th>ผู้ดำเนินการ</th><th>การกระทำ</th><th>ประเภทข้อมูล</th><th>รายละเอียด</th></tr></thead><tbody>${items.map(x=>`<tr><td>${escapeHtml(new Date(x.createdAt).toLocaleString("th-TH"))}</td><td>${escapeHtml(x.actorUsername)}</td><td>${escapeHtml(x.action)}</td><td>${escapeHtml(x.targetType)} / ${escapeHtml(x.targetId)}</td><td>${escapeHtml(cleanDisplayDetails(x.details))}</td></tr>`).join("")||'<tr><td colspan="5">ยังไม่มีประวัติ</td></tr>'}</tbody></table></div></div>`;el.querySelector("#reloadAudit").onclick=()=>loadPage("audit")}

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

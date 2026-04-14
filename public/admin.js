
// === CONFIG ===============================================
const SESSION_MS = 30 * 60 * 1000;
let idleTimer = null;
const AUTO_URL = (window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1')
  ? 'http://localhost:5000/api' : window.location.origin+'/api';
let CFG = { url: localStorage.getItem('jd_admin_url')||AUTO_URL, token: localStorage.getItem('jd_admin_token')||'' };
let DATA = { courses:[], students:[], quizzes:[], requests:[], connected:false };

// === API ==================================================
const api = async (path, opts={}) => {
  const h={'Content-Type':'application/json'};
  if (CFG.token) h['Authorization']='Bearer '+CFG.token;
  const r=await fetch(CFG.url+path,{...opts,headers:{...h,...(opts.headers||{})}});
  const d=await r.json();
  if (!r.ok) throw new Error(d.error||'API error');
  return d;
};

// === SESSION ==============================================
const saveSession = tok => { localStorage.setItem('jd_admin_token',tok); localStorage.setItem('jd_admin_last',Date.now().toString()); CFG.token=tok; };
const clearSession = () => { localStorage.removeItem('jd_admin_token'); localStorage.removeItem('jd_admin_last'); CFG.token=''; if(idleTimer)clearTimeout(idleTimer); };
const resetIdle = () => {
  if (!CFG.token) return;
  localStorage.setItem('jd_admin_last',Date.now().toString());
  if(idleTimer)clearTimeout(idleTimer);
  idleTimer=setTimeout(()=>{ toast('Session expired - please log in again'); clearSession(); showLogin(); }, SESSION_MS);
};
['click','keydown','mousemove','touchstart'].forEach(e=>document.addEventListener(e,resetIdle,{passive:true}));

const showLogin = () => document.getElementById('login-screen').style.display='flex';
const hideLogin = () => document.getElementById('login-screen').style.display='none';

// === LOGIN ================================================
const doLogin = async () => {
  const email=document.getElementById('li-email').value.trim();
  const pass=document.getElementById('li-pass').value;
  const lerr=document.getElementById('lerr');
  const btn=document.getElementById('lbtn');
  lerr.classList.remove('on');
  if (!email||!pass){lerr.textContent='Fill in email and password';lerr.classList.add('on');return;}
  btn.textContent='...';btn.disabled=true;
  try {
    const d=await fetch(CFG.url+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})}).then(r=>r.json());
    if (!d.success) throw new Error(d.error||'Login failed');
    if (!['admin','instructor'].includes(d.user?.role)) throw new Error('Access denied - admin/instructor only');
    saveSession(d.token);
    const ini=(d.user.name||'AD').split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase();
    document.getElementById('sb-av').textContent=ini;
    document.getElementById('sb-name').textContent=d.user.name||'Admin';
    document.getElementById('sb-role').textContent=d.user.role||'admin';
    hideLogin();
    resetIdle();
    await checkConn();
    await loadAll();
    renderDashboard();
    toast('Welcome, '+d.user.name.split(' ')[0]+'! !');
  } catch(e){lerr.textContent=e.message;lerr.classList.add('on');}
  finally{btn.textContent='Sign In';btn.disabled=false;}
};

const tryAutoLogin = async () => {
  const tok=localStorage.getItem('jd_admin_token');
  const last=parseInt(localStorage.getItem('jd_admin_last')||'0',10);
  if (!tok||Date.now()-last>SESSION_MS){clearSession();showLogin();return;}
  CFG.token=tok;
  try {
    const d=await api('/auth/me');
    if (!['admin','instructor'].includes(d.user?.role)) throw new Error('Not admin');
    const ini=(d.user.name||'AD').split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase();
    document.getElementById('sb-av').textContent=ini;
    document.getElementById('sb-name').textContent=d.user.name||'Admin';
    document.getElementById('sb-role').textContent=d.user.role||'admin';
    saveSession(tok);
    hideLogin();
    resetIdle();
    await checkConn();
    await loadAll();
    renderDashboard();
  } catch { clearSession(); showLogin(); }
};

const doLogout = () => { clearSession(); showLogin(); toast('Logged out'); };

// === CONNECT + LOAD =======================================
const checkConn = async () => {
  try {
    const d=await fetch(CFG.url+'/health').then(r=>r.json());
    DATA.connected=true;
    document.getElementById('apill').className='apill on';
    document.getElementById('apill-txt').textContent='Firebase Connected';
    document.getElementById('cdot').className='cdot';
  } catch {
    DATA.connected=false;
    document.getElementById('apill').className='apill off';
    document.getElementById('apill-txt').textContent='Offline';
    document.getElementById('cdot').className='cdot off';
  }
};

const loadAll = async () => {
  if (!DATA.connected) { loadDemo(); return; }
  try {
    const [c,s,r,q]=await Promise.all([
      api('/courses?limit=50').catch(()=>({courses:[]})),
      api('/users?limit=100').catch(()=>({users:[]})),
      api('/courses/requests/all?status=all').catch(()=>({requests:[]})),
      api('/quizzes/course/all').catch(()=>({quizzes:[]})),
    ]);
    DATA.courses  = (c.courses||[]).map(x=>({...x,id:x.id||x._id}));
    DATA.students = (s.users||[]).map(x=>({...x,id:x.id||x.uid}));
    DATA.requests = (r.requests||[]).map(x=>({...x,id:x.id||x._id}));
    DATA.quizzes  = (q.quizzes||[]).map(x=>({...x,id:x.id||x._id}));
  } catch { loadDemo(); }
  updateBadges();
};

const loadDemo = () => {
  DATA.courses=[
    {id:'c1',title:'React.js Complete Guide',emoji:'[c]',category:'web',difficulty:'intermediate',totalLessons:6,enrolledCount:204,isPublished:true,instructorName:'Arjun Mehta',projectTitle:'Build a Todo App',projectDescription:'Build a Todo app.',projectDeadlineDays:7},
    {id:'c2',title:'Python for Data Science',emoji:'[c]',category:'data',difficulty:'beginner',totalLessons:4,enrolledCount:178,isPublished:true,instructorName:'Priya Sharma',projectTitle:'Sales Analysis',projectDescription:'Analyze sales data.',projectDeadlineDays:10},
    {id:'c3',title:'JavaScript ES6+',emoji:'[c]',category:'web',difficulty:'beginner',totalLessons:28,enrolledCount:287,isPublished:true,instructorName:'Priya Sharma',projectTitle:'Weather App',projectDescription:'Build a weather app.',projectDeadlineDays:5},
  ];
  DATA.students=[
    {id:'u1',name:'Aarav Joshi',email:'aarav@email.com',enrolledCourses:['c1','c2'],xp:2840,streakDays:7,isActive:true,createdAt:'2024-01-12'},
    {id:'u2',name:'Meera Kapoor',email:'meera@email.com',enrolledCourses:['c1','c2','c3'],xp:4210,streakDays:12,isActive:true,createdAt:'2023-11-08'},
  ];
  DATA.requests=[
    {id:'r1',userName:'Karan Malhotra',userEmail:'karan@email.com',courseTitle:'React.js Complete Guide',courseEmoji:'[c]',status:'pending',requestedAt:null},
    {id:'r2',userName:'Riya Bansal',userEmail:'riya@email.com',courseTitle:'Python for Data Science',courseEmoji:'[c]',status:'pending',requestedAt:null},
  ];
  DATA.quizzes=[
    {id:'q1',title:'React Fundamentals Quiz',courseId:'c1',courseTitle:'React.js Complete Guide',questions:[{},{},{},{},{}],timeLimit:300,passMark:60},
  ];
  updateBadges();
};

const updateBadges = () => {
  document.getElementById('nb-c').textContent=DATA.courses.length;
  document.getElementById('nb-s').textContent=DATA.students.length;
  document.getElementById('nb-r').textContent=DATA.requests.filter(r=>r.status==='pending').length;
};

const refreshAll = async () => { toast('Refreshing...'); await loadAll(); renderDashboard(); toast('Refreshed v'); };

// === DASHBOARD ============================================
const renderDashboard = () => {
  document.getElementById('st-c').textContent=DATA.courses.length;
  document.getElementById('st-s').textContent=DATA.students.length;
  document.getElementById('st-r').textContent=DATA.requests.filter(r=>r.status==='pending').length;
  document.getElementById('st-q').textContent=DATA.quizzes.length;
  const vals=[42,65,28,80,55,92,70];
  document.getElementById('chart').innerHTML=vals.map(h=>`<div class="mbar" style="height:${h}%"></div>`).join('');
  document.getElementById('dash-courses').innerHTML=DATA.courses.slice(0,4).map(c=>
    `<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid var(--bdr)"><span style="font-size:18px">${c.emoji||'[c]'}</span><div style="flex:1"><div style="font-size:11px;font-weight:500">${c.title}</div><div style="font-size:9px;color:var(--muted)">${c.enrolledCount||0} enrolled</div></div><span class="tag ${c.isPublished?'t-pub':'t-dft'}">${c.isPublished?'Live':'Draft'}</span></div>`
  ).join('');
  const pend=DATA.requests.filter(r=>r.status==='pending').slice(0,4);
  document.getElementById('dash-requests').innerHTML=pend.length?pend.map(r=>
    `<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid var(--bdr)"><span style="font-size:18px">${r.courseEmoji||'[c]'}</span><div style="flex:1"><div style="font-size:11px;font-weight:500">${r.userName}</div><div style="font-size:9px;color:var(--muted)">${r.courseTitle}</div></div><button class="vbtn" style="border-color:var(--green);color:var(--green);font-size:9px" onclick="approveReq('${r.id}')">Approve</button></div>`
  ).join(''):'<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px">No pending requests</div>';
  const acts=[{t:'<strong>Meera Kapoor</strong> completed Python course',tm:'2 min ago'},{t:'<strong>Aarav Joshi</strong> scored 94% in React Quiz',tm:'18 min ago'},{t:'New course <strong>Flutter Dev</strong> created',tm:'1 hr ago'}];
  document.getElementById('dash-activity').innerHTML=acts.map(a=>`<div class="act-item"><div class="adot"></div><div><div class="atxt">${a.t}</div><div class="atime">${a.tm}</div></div></div>`).join('');
};

// === COURSES ==============================================
const renderCourses = (cat='') => {
  const list=cat?DATA.courses.filter(c=>c.category===cat):DATA.courses;
  document.getElementById('tb-courses').innerHTML=list.map(c=>`
    <tr>
      <td><div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px">${c.emoji||'[c]'}</span><div><div style="font-weight:500">${c.title}</div><div style="font-size:9px;color:var(--muted)">${c.instructorName||''}</div></div></div></td>
      <td><span class="tag t-pub" style="text-transform:capitalize">${c.category||'-'}</span></td>
      <td style="text-transform:capitalize;color:var(--muted);font-size:10px">${c.difficulty||'-'}</td>
      <td>${c.totalLessons||0}</td>
      <td>${c.enrolledCount||0}</td>
      <td><span class="tag ${c.isPublished?'t-pub':'t-dft'}">${c.isPublished?'Published':'Draft'}</span></td>
      <td><div style="display:flex;gap:5px">
        <button class="vbtn" onclick="togglePub('${c.id}',${c.isPublished})">${c.isPublished?'Unpublish':'Publish'}</button>
        <button class="vbtn del" onclick="delCourse('${c.id}')">Delete</button>
      </div></td>
    </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No courses</td></tr>';
};
const filterCourses=(cat,btn)=>{document.querySelectorAll('#page-courses .vbtn').forEach(b=>{b.style.borderColor='';b.style.color=''});btn.style.borderColor='var(--acc)';btn.style.color='var(--acc)';renderCourses(cat);};
const togglePub=async(id,cur)=>{try{if(DATA.connected)await api('/courses/'+id,{method:'PUT',body:JSON.stringify({isPublished:!cur})});const c=DATA.courses.find(x=>x.id===id);if(c)c.isPublished=!cur;renderCourses();toast('Course '+(cur?'unpublished':'published'));} catch(e){toast(e.message);}};
const delCourse=async(id)=>{if(!confirm('Delete?'))return;try{if(DATA.connected)await api('/courses/'+id,{method:'DELETE'});DATA.courses=DATA.courses.filter(c=>c.id!==id);renderCourses();renderDashboard();toast('Deleted');} catch(e){toast(e.message);}};

const createCourse = async () => {
  const title=document.getElementById('nc-title').value.trim();
  if (!title){toast('Title required');return;}
  const payload={
    title, emoji:document.getElementById('nc-emoji').value||'[c]',
    description:document.getElementById('nc-desc').value,
    category:document.getElementById('nc-cat').value,
    difficulty:document.getElementById('nc-diff').value,
    durationStr:document.getElementById('nc-dur').value,
    githubFolder:document.getElementById('nc-folder').value,
    projectTitle:document.getElementById('nc-proj-title').value,
    projectDescription:document.getElementById('nc-proj-desc').value,
    projectDeadlineDays:parseInt(document.getElementById('nc-proj-days').value)||7,
    isPublished:document.getElementById('nc-pub').checked,
    totalLessons:0, enrolledCount:0, sections:[],
  };
  try {
    if(DATA.connected){const d=await api('/courses',{method:'POST',body:JSON.stringify(payload)});DATA.courses.unshift({...d.course,id:d.course.id});}
    else DATA.courses.unshift({id:'c'+Date.now(),...payload,instructorName:'You'});
    closeModal('modal-course');renderCourses();renderDashboard();updateBadges();toast('Course created v');
  } catch(e){toast(e.message);}
};

// === ENROLLMENT REQUESTS ==================================
let REQ_FILTER='pending';
const renderRequests=(filter)=>{
  REQ_FILTER=filter;
  const list=filter==='all'?DATA.requests:DATA.requests.filter(r=>r.status===filter);
  document.getElementById('req-lbl').textContent=list.length+' request'+(list.length!==1?'s':'');
  const sbadge=s=>({pending:'t-pnd',approved:'t-act',rejected:'t-ina'}[s]||'t-ina');
  document.getElementById('tb-requests').innerHTML=list.length?list.map(r=>{
    let dt='-';
    try{const d=r.requestedAt?.toDate?r.requestedAt.toDate():new Date((r.requestedAt?.seconds||0)*1000);dt=d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}catch{}
    const ini=(r.userName||'?').split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase();
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:7px"><div class="uav" style="width:26px;height:26px;font-size:9px">${ini}</div><span style="font-weight:500">${r.userName||'-'}</span></div></td>
      <td style="color:var(--muted);font-size:10px">${r.userEmail||'-'}</td>
      <td>${r.courseEmoji||'[c]'} ${r.courseTitle||'-'}</td>
      <td style="font-size:10px;color:var(--muted)">${dt}</td>
      <td><span class="tag ${sbadge(r.status)}">${r.status.charAt(0).toUpperCase()+r.status.slice(1)}</span></td>
      <td>${r.status==='pending'?`<button class="vbtn" style="border-color:var(--green);color:var(--green)" onclick="approveReq('${r.id}')">v Approve</button><button class="vbtn del" style="margin-left:5px" onclick="rejectReq('${r.id}')">x Reject</button>`:'<span style="font-size:10px;color:var(--muted)">Reviewed</span>'}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">No '+filter+' requests</td></tr>';
};
const filterReqs=(f,btn)=>{document.querySelectorAll('#page-requests .vbtn').forEach(b=>{b.style.borderColor='';b.style.color=''});btn.style.borderColor='var(--acc)';btn.style.color='var(--acc)';renderRequests(f);};
const approveReq=async(id)=>{try{if(DATA.connected)await api('/courses/requests/'+id+'/approve',{method:'POST'});const r=DATA.requests.find(x=>x.id===id);if(r)r.status='approved';updateBadges();renderRequests(REQ_FILTER);renderDashboard();toast('Student enrolled! v');}catch(e){toast(e.message);}};
const rejectReq=async(id)=>{if(!confirm('Reject?'))return;try{if(DATA.connected)await api('/courses/requests/'+id+'/reject',{method:'POST'});const r=DATA.requests.find(x=>x.id===id);if(r)r.status='rejected';updateBadges();renderRequests(REQ_FILTER);toast('Rejected');}catch(e){toast(e.message);}};

// === STUDENTS =============================================
const renderStudents=()=>{
  document.getElementById('tb-students').innerHTML=DATA.students.map(s=>`
    <tr>
      <td><div style="display:flex;align-items:center;gap:7px"><div class="uav" style="width:26px;height:26px;font-size:9px">${(s.name||'?').split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase()}</div><span style="font-weight:500">${s.name||'-'}</span></div></td>
      <td style="color:var(--muted);font-size:10px">${s.email||'-'}</td>
      <td>${(s.enrolledCourses||[]).length}</td>
      <td style="font-family:'Space Mono',monospace;font-size:10px;color:var(--gold)">${(s.xp||0).toLocaleString()}</td>
      <td>Fire ${s.streakDays||0}d</td>
      <td><span class="tag ${s.isActive!==false?'t-act':'t-ina'}">${s.isActive!==false?'Active':'Inactive'}</span></td>
    </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">No students</td></tr>';
};

// === QUIZZES ==============================================
let qzQuestions=[];
const addQuestion=()=>{
  const idx=qzQuestions.length;
  qzQuestions.push({question:'',options:['','','',''],correct:0,explanation:''});
  renderQzQuestions();
};
const removeQuestion=idx=>{qzQuestions.splice(idx,1);renderQzQuestions();};
const renderQzQuestions=()=>{
  document.getElementById('qz-questions').innerHTML=qzQuestions.length?qzQuestions.map((q,i)=>`
    <div class="q-item">
      <div class="q-item-hdr"><span>Question ${i+1}</span><button class="vbtn del" onclick="removeQuestion(${i})" style="font-size:9px;padding:2px 6px">Remove</button></div>
      <div class="fg"><label>Question Text</label><input class="fi" value="${q.question}" onchange="qzQuestions[${i}].question=this.value" placeholder="Enter question..."></div>
      <div class="q-opts">
        ${q.options.map((o,j)=>`<div class="q-opt"><input type="radio" name="correct-${i}" ${q.correct===j?'checked':''} onchange="qzQuestions[${i}].correct=${j}"><label style="flex:1"><input class="fi" value="${o}" onchange="qzQuestions[${i}].options[${j}]=this.value" placeholder="Option ${String.fromCharCode(65+j)}..." style="margin-top:3px"></label></div>`).join('')}
      </div>
      <div class="fg" style="margin-top:8px"><label>Explanation (shown after answer)</label><input class="fi" value="${q.explanation||''}" onchange="qzQuestions[${i}].explanation=this.value" placeholder="Why is this the correct answer?"></div>
    </div>`).join(''):'<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px">No questions yet - click + Add Question</div>';
};

const renderQuizzes=()=>{
  document.getElementById('tb-quizzes').innerHTML=DATA.quizzes.map(q=>`
    <tr>
      <td style="font-weight:500">${q.title}</td>
      <td style="color:var(--muted)">${q.courseTitle||DATA.courses.find(c=>c.id===q.courseId)?.title||'-'}</td>
      <td>${q.questions?.length||0}</td>
      <td style="font-family:'Space Mono',monospace;font-size:10px">${Math.floor((q.timeLimit||300)/60)}m</td>
      <td>${q.passMark||60}%</td>
      <td><button class="vbtn del" onclick="toast('Delete quiz from Firebase console')">Delete</button></td>
    </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">No quizzes</td></tr>';
};

const createQuiz=async()=>{
  const title=document.getElementById('qz-title').value.trim();
  if (!title){toast('Title required');return;}
  if (!qzQuestions.length){toast('Add at least 1 question');return;}
  const invalid=qzQuestions.find(q=>!q.question.trim()||q.options.some(o=>!o.trim()));
  if (invalid){toast('Fill in all question text and options');return;}
  const courseId=document.getElementById('qz-course').value;
  const payload={title,courseId,timeLimit:parseInt(document.getElementById('qz-time').value)||300,passMark:parseInt(document.getElementById('qz-pass').value)||60,questions:qzQuestions,isActive:true};
  try {
    if(DATA.connected){const d=await api('/quizzes',{method:'POST',body:JSON.stringify(payload)});DATA.quizzes.push({...d.quiz,id:d.quiz.id,courseTitle:DATA.courses.find(c=>c.id===courseId)?.title});}
    else DATA.quizzes.push({id:'q'+Date.now(),...payload,courseTitle:DATA.courses.find(c=>c.id===courseId)?.title});
    qzQuestions=[];
    closeModal('modal-quiz');renderQuizzes();toast('Quiz created v');
  } catch(e){toast(e.message);}
};

// === ANNOUNCEMENTS ========================================
let ANNS=[{title:'Welcome to Jain Developers LMS!',body:'Start browsing courses and tracking your progress.',tag:'info',authorName:'Admin',date:'Today'}];
const renderAnns=async()=>{
  if(DATA.connected){try{const d=await api('/announcements');ANNS=d.announcements.map(a=>({...a,date:new Date((a.createdAt?.seconds||Date.now()/1000)*1000).toLocaleDateString()}));}catch{}}
  document.getElementById('ann-list').innerHTML=ANNS.map(a=>`
    <div style="background:var(--surf);border:1px solid var(--bdr);border-radius:var(--r);padding:14px;margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div><span class="tag ${a.tag==='urgent'?'t-act':a.tag==='event'?'t-pub':'t-ina'}" style="margin-right:7px">${(a.tag||'info').toUpperCase()}</span><span style="font-size:12px;font-weight:600">${a.title}</span></div>
        <span style="font-size:9px;color:var(--muted)">${a.date||''}</span>
      </div>
      <div style="font-size:11px;color:var(--muted)">${a.body}</div>
    </div>`).join('');
};
const postAnn=async()=>{
  const title=document.getElementById('ann-title').value.trim();
  const body=document.getElementById('ann-body').value.trim();
  if(!title||!body){toast('Fill title and body');return;}
  const tag=document.getElementById('ann-tag').value;
  try{
    if(DATA.connected)await api('/announcements',{method:'POST',body:JSON.stringify({title,body,tag})});
    ANNS.unshift({title,body,tag,authorName:'Admin',date:'Just now'});
    renderAnns();document.getElementById('ann-title').value='';document.getElementById('ann-body').value='';toast('Posted v');
  }catch(e){toast(e.message);}
};

// === SETTINGS =============================================
const testConn=async()=>{
  CFG.url=document.getElementById('api-url-in').value.trim();
  CFG.token=document.getElementById('api-tok-in').value.trim();
  try{const d=await fetch(CFG.url+'/health').then(r=>r.json());document.getElementById('conn-res').innerHTML='<span style="color:var(--green)">v Connected - '+d.project+'</span>';DATA.connected=true;saveSettings();await loadAll();renderDashboard();toast('Connected v');}
  catch{document.getElementById('conn-res').innerHTML='<span style="color:var(--acc)">x Cannot reach '+CFG.url+'</span>';}
};
const saveSettings=()=>{CFG.url=document.getElementById('api-url-in').value.trim();CFG.token=document.getElementById('api-tok-in').value.trim();localStorage.setItem('jd_admin_url',CFG.url);localStorage.setItem('jd_admin_token',CFG.token);toast('Saved v');};

// === NAV ==================================================
const TITLES={dashboard:'Dashboard',courses:'Courses',requests:'Enrollment Requests',students:'Students',quizzes:'Quizzes',announcements:'Announcements',settings:'Settings'};
const nav=(page,btn)=>{
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.si').forEach(s=>s.classList.remove('on'));
  document.getElementById('page-'+page)?.classList.add('on');
  document.getElementById('tb-title').textContent=TITLES[page]||page;
  if(btn) btn.classList.add('on');
  if(page==='courses') renderCourses();
  if(page==='requests') renderRequests('pending');
  if(page==='students') renderStudents();
  if(page==='quizzes'){renderQuizzes();popQzCourses();}
  if(page==='announcements') renderAnns();
  if(page==='settings'){document.getElementById('api-url-in').value=CFG.url;document.getElementById('api-tok-in').value=CFG.token;}
};
const popQzCourses=()=>{document.getElementById('qz-course').innerHTML=DATA.courses.map(c=>`<option value="${c.id}">${c.title}</option>`).join('');};

// === MODALS ===============================================
const openModal=(id)=>{document.getElementById(id).classList.add('on');if(id==='modal-quiz'){qzQuestions=[];renderQzQuestions();popQzCourses();}};
const closeModal=(id)=>document.getElementById(id).classList.remove('on');
document.querySelectorAll('.mbg').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('on');}));

// === TOAST + KEEPALIVE ====================================
const toast=msg=>{const el=document.getElementById('tst');el.textContent=msg;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),3000);};
setInterval(()=>fetch(CFG.url+'/health').catch(()=>{}),13*60*1000);

// === BOOT ================================================
tryAutoLogin();


// === CONFIG ===============================================
const API = window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1'
  ? 'http://localhost:5000/api' : window.location.origin+'/api';

// === STATE ================================================
const S = {
  user: null, token: localStorage.getItem('jd_token'),
  courses: [], progress: [], requests: [],
  currentCourse: null, currentLesson: null,
  quizState: null, demo: false,
};

// === API HELPER ===========================================
const api = async (path, opts={}) => {
  const h = {'Content-Type':'application/json'};
  if (S.token) h['Authorization'] = 'Bearer '+S.token;
  const r = await fetch(API+path, {...opts, headers:{...h,...(opts.headers||{})}});
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
};

// === DEMO DATA ============================================
const DEMO_COURSES = [
  {id:'c1',title:'React.js Complete Guide',instructorName:'Arjun Mehta',category:'web',difficulty:'intermediate',emoji:'React',totalLessons:6,durationStr:'22h 10m',enrolledCount:204,isPublished:true,projectTitle:'Build a Todo App',projectDescription:'Create a complete Todo app using React hooks.',projectDeadlineDays:7,
   sections:[{title:'Section 1',order:1,lessons:[{id:'l1',title:'Introduction',durationStr:'3 min',isFree:true,githubPath:'web/react/l1.mp4'},{id:'l2',title:'Setup',durationStr:'8 min',isFree:true,githubPath:'web/react/l2.mp4'},{id:'l3',title:'First App',durationStr:'15 min',isFree:false,githubPath:'web/react/l3.mp4'}]},{title:'Section 2',order:2,lessons:[{id:'l4',title:'useState',durationStr:'25 min',isFree:false,githubPath:'web/react/l4.mp4'},{id:'l5',title:'useEffect',durationStr:'30 min',isFree:false,githubPath:'web/react/l5.mp4'}]}]},
  {id:'c2',title:'Python for Data Science',instructorName:'Priya Sharma',category:'data',difficulty:'beginner',emoji:'Python',totalLessons:4,durationStr:'14h 45m',enrolledCount:178,isPublished:true,projectTitle:'Sales Data Analysis',projectDescription:'Analyze a sales CSV using Pandas and create visualizations.',projectDeadlineDays:10,
   sections:[{title:'Python Basics',order:1,lessons:[{id:'p1',title:'Setup & Jupyter',durationStr:'10 min',isFree:true,githubPath:'data/python/p1.mp4'},{id:'p2',title:'Variables',durationStr:'20 min',isFree:false,githubPath:'data/python/p2.mp4'}]}]},
  {id:'c3',title:'JavaScript ES6+',instructorName:'Priya Sharma',category:'web',difficulty:'beginner',emoji:'JS',totalLessons:28,durationStr:'10h',enrolledCount:287,isPublished:true,projectTitle:'Weather App',projectDescription:'Build a weather app using fetch API.',projectDeadlineDays:5,sections:[]},
  {id:'c4',title:'Flutter Mobile Dev',instructorName:'Arjun Mehta',category:'mobile',difficulty:'intermediate',emoji:'Mobile',totalLessons:42,durationStr:'18h',enrolledCount:87,isPublished:true,projectTitle:'Chat App',projectDescription:'Build a simple real-time chat app.',projectDeadlineDays:14,sections:[]},
  {id:'c5',title:'Machine Learning A-Z',instructorName:'Dr. Anil Kumar',category:'data',difficulty:'advanced',emoji:'AI',totalLessons:60,durationStr:'32h',enrolledCount:98,isPublished:true,projectTitle:'ML Model Deployment',projectDescription:'Train and deploy a classification model.',projectDeadlineDays:21,sections:[]},
  {id:'c6',title:'UI/UX Fundamentals',instructorName:'Kavya Rao',category:'design',difficulty:'beginner',emoji:'Design',totalLessons:20,durationStr:'9h',enrolledCount:234,isPublished:true,projectTitle:'Redesign an App',projectDescription:'Redesign any popular app in Figma.',projectDeadlineDays:7,sections:[]},
  {id:'c7',title:'AWS Cloud Practitioner',instructorName:'Rohit Agarwal',category:'devops',difficulty:'advanced',emoji:'Cloud',totalLessons:38,durationStr:'16h',enrolledCount:119,isPublished:true,projectTitle:'Deploy a Node App',projectDescription:'Deploy a Node.js app on AWS EC2.',projectDeadlineDays:10,sections:[]},
  {id:'c8',title:'Node.js & Express API',instructorName:'Vikram Singh',category:'web',difficulty:'intermediate',emoji:'Node',totalLessons:30,durationStr:'11h',enrolledCount:142,isPublished:true,projectTitle:'Build a REST API',projectDescription:'Build a complete REST API with auth.',projectDeadlineDays:7,sections:[]},
];
const DEMO_USER = {uid:'d1',name:'Aarav Joshi',email:'aarav@email.com',role:'student',xp:2840,streakDays:7,enrolledCourses:['c1','c2'],badges:['Fire 7-Day Streak']};
const DEMO_PROGRESS = [
  {courseId:'c1',course:{id:'c1',title:'React.js Complete Guide',emoji:'React',totalLessons:6,instructorName:'Arjun Mehta'},completedLessons:['l1','l2'],percentComplete:33,lastLessonId:'l3'},
  {courseId:'c2',course:{id:'c2',title:'Python for Data Science',emoji:'Python',totalLessons:4,instructorName:'Priya Sharma'},completedLessons:['p1'],percentComplete:25,lastLessonId:'p2'},
];
const DEMO_QUIZZES = [
  {id:'q1',courseId:'c1',courseTitle:'React.js Complete Guide',title:'React Fundamentals Quiz',timeLimit:300,passMark:60,questions:[
    {question:'Which hook manages local state?',options:['useEffect','useState','useContext','useReducer']},
    {question:'What does JSX stand for?',options:['JavaScript XML','JavaScript Extension','Java Syntax','JSON XML']},
    {question:'Which hook runs after every render?',options:['useState','useMemo','useEffect','useRef']},
    {question:'How is data passed parent -&gt; child?',options:['State','Context','Props','Redux']},
    {question:'Command to create React app?',options:['npm init react','npx create-react-app','npm install react','react new']},
  ]},
];

// === HELPERS ==============================================
const isEnrolled = id => (S.user?.enrolledCourses||[]).includes(id);
const getProgress = id => S.progress.find(p=>p.courseId===id);
const getRequest = id => S.requests.find(r=>r.courseId===id);
const getCoverBg = cat => ({web:'linear-gradient(135deg,#fef2ee,#ffe8e0)',data:'linear-gradient(135deg,#eff8ff,#dbeafe)',mobile:'linear-gradient(135deg,#f0faf5,#d1fae5)',design:'linear-gradient(135deg,#fef9f0,#fef3c7)',devops:'linear-gradient(135deg,#f5f0ff,#ede9fe)'  }[cat]||'linear-gradient(135deg,#f7f5f0,#ede8de)');

// === INIT =================================================
const init = async () => {
  try { await fetch(API+'/health'); S.demo=false; }
  catch { S.demo=true; loadDemo(); return; }

  if (S.token) {
    try {
      const {user} = await api('/auth/me');
      S.user = user;
      await loadUserData();
      onLogin();
    } catch { S.token=null; localStorage.removeItem('jd_token'); }
  }
  await loadCourses();
  if (!S.token) goPage('auth'); else goPage('home');
};

const loadDemo = () => {
  S.user=DEMO_USER; S.token='demo'; S.courses=DEMO_COURSES;
  S.progress=DEMO_PROGRESS; S.requests=[];
  localStorage.setItem('jd_token','demo');
  onLogin(); goPage('home');
};

const loadUserData = async () => {
  try { const d=await api('/progress/user/all'); S.progress=d.records||[]; } catch { S.progress=[]; }
  try { const d=await api('/courses/requests/my'); S.requests=d.requests||[]; } catch { S.requests=[]; }
};

const loadCourses = async () => {
  if (S.demo) return;
  try { const d=await api('/courses?limit=50'); S.courses=(d.courses||[]).map(c=>({...c,id:c.id||c._id})); } catch {}
};

// === AUTH =================================================
let isSignIn = true;
const toggleMode = () => {
  isSignIn=!isSignIn;
  document.getElementById('atitle').textContent = isSignIn?'Welcome back':'Create account';
  document.getElementById('asub').textContent   = isSignIn?'Sign in to continue learning':'Join thousands of learners';
  document.getElementById('namefg').style.display = isSignIn?'none':'block';
  document.getElementById('authbtn').textContent  = isSignIn?'Sign In':'Create Account';
  document.getElementById('atog').innerHTML = isSignIn
    ? 'New here? <span onclick="toggleMode()">Create account</span>'
    : 'Already registered? <span onclick="toggleMode()">Sign in</span>';
  document.getElementById('aerr').classList.remove('on');
};

const doAuth = async () => {
  const email=document.getElementById('f-email').value.trim();
  const pass =document.getElementById('f-pass').value;
  const name =document.getElementById('f-name').value.trim();
  if (!email||!pass) { showErr('Please fill in all fields'); return; }
  const btn=document.getElementById('authbtn');
  btn.disabled=true; btn.textContent='...';
  try {
    if (S.demo) {
      S.user={...DEMO_USER,name:name||DEMO_USER.name,email};
      S.progress=DEMO_PROGRESS; S.requests=[];
    } else {
      const ep=isSignIn?'/auth/login':'/auth/register';
      const body=isSignIn?{email,password:pass}:{name,email,password:pass};
      const d=await api(ep,{method:'POST',body:JSON.stringify(body)});
      S.token=d.token; S.user=d.user;
      localStorage.setItem('jd_token',d.token);
      await loadCourses();
      await loadUserData();
    }
    onLogin();
    goPage('home');
    toast('Welcome, '+S.user.name.split(' ')[0]+'! !');
  } catch(e) { showErr(e.message); }
  finally { btn.disabled=false; btn.textContent=isSignIn?'Sign In':'Create Account'; }
};

const showErr = msg => { const e=document.getElementById('aerr'); e.textContent=msg; e.classList.add('on'); };

const onLogin = () => {
  const u=S.user;
  document.getElementById('mainnav').style.display='flex';
  document.getElementById('srchwrap').style.display='flex';
  document.getElementById('xpchip').style.display='flex';
  document.getElementById('usrchip').style.display='flex';
  document.getElementById('loginbtn').style.display='none';
  document.getElementById('xpval').textContent=(u.xp||0).toLocaleString();
  const ini=(u.name||'??').split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase();
  document.getElementById('navav').textContent=ini;
  document.getElementById('navname').textContent=(u.name||'').split(' ')[0];
};

const logout = () => { S.token=null; S.user=null; localStorage.removeItem('jd_token'); location.reload(); };

// === COURSES ==============================================
const courseCard = (c, showProg=false) => {
  const en=isEnrolled(c.id), pr=getProgress(c.id), req=getRequest(c.id);
  const dc={beginner:'db',intermediate:'di',advanced:'da'}[c.difficulty]||'db';
  const dl=(c.difficulty||'').charAt(0).toUpperCase()+(c.difficulty||'').slice(1);
  let bcls='', btxt='', bact='';
  if (en) { bcls='enrolled'; btxt='v Enrolled'; bact=`openCourse('${c.id}')`; }
  else if (req?.status==='pending')  { bcls='pending';  btxt='[Pending] Pending';   bact=`toast('Awaiting admin approval')`; }
  else if (req?.status==='rejected') { bcls='rejected'; btxt='x Rejected';   bact=`toast('Request rejected. Contact admin.')`; }
  else { bcls=''; btxt='Request Enrollment'; bact=`requestEnroll('${c.id}',event)`; }

  return `<div class="cc" onclick="openCourse('${c.id}')">
    <div class="cc-cov" style="background:${getCoverBg(c.category)}">${c.emoji||'[courses]'}</div>
    <div class="cc-body">
      <div class="cc-title">${c.title}</div>
      <div class="cc-inst">by ${c.instructorName||'Instructor'}</div>
      <div class="cc-meta"><span>[book] ${c.totalLessons||0}</span><span>Duration: ${c.durationStr||'-'}</span><span> ${c.enrolledCount||0}</span></div>
      ${showProg&&pr?`<div class="pb"><div class="pf" style="width:${pr.percentComplete}%"></div></div><div class="pct">${pr.percentComplete}% complete</div>`:''}
      <div class="cc-foot">
        <span class="diff ${dc}">${dl}</span>
        <button class="ebtn ${bcls}" onclick="event.stopPropagation();${bact}">${btxt}</button>
      </div>
    </div>
  </div>`;
};

const requestEnroll = async (id, e) => {
  if (e) e.stopPropagation();
  if (!S.user) { goPage('auth'); return; }
  if (S.demo) {
    S.requests.push({courseId:id,status:'pending'});
    toast('Enrollment request sent! [Request] Awaiting admin approval');
    renderAllCourses(); return;
  }
  try {
    const d=await api(`/courses/${id}/request-enrollment`,{method:'POST'});
    toast(d.message);
    S.requests.push({courseId:id,status:'pending'});
    renderAllCourses();
  } catch(e) { toast(e.message); }
};

const renderAllCourses = (cat='') => {
  const list=cat?S.courses.filter(c=>c.category===cat):S.courses;
  const el1=document.getElementById('home-courses');
  const el2=document.getElementById('explore-grid');
  if (el1) el1.innerHTML=list.slice(0,8).map(c=>courseCard(c)).join('')||'<div class="empty"><div class="ico">[courses]</div><p>No courses yet</p></div>';
  if (el2) el2.innerHTML=list.map(c=>courseCard(c)).join('')||'<div class="empty"><div class="ico">[search]</div><p>No courses found</p></div>';
};

const filterCat = (cat, btn) => {
  document.querySelectorAll('#cat-filters .ebtn').forEach(b=>b.classList.remove('enrolled'));
  btn.classList.add('enrolled');
  renderAllCourses(cat);
};

const doSearch = val => {
  if (val.length<2) return;
  goPage('explore');
  const list=S.courses.filter(c=>c.title.toLowerCase().includes(val.toLowerCase())||c.instructorName?.toLowerCase().includes(val.toLowerCase()));
  document.getElementById('explore-grid').innerHTML=list.map(c=>courseCard(c)).join('')||'<div class="empty"><div class="ico">[search]</div><p>No results</p></div>';
};

// === HOME RENDER ==========================================
const renderHome = () => {
  const u=S.user; if (!u) return;
  document.getElementById('hgreet').textContent='Welcome back, '+(u.name||'').split(' ')[0]+' !';
  const progs=S.progress, avg=progs.length?Math.round(progs.reduce((a,p)=>a+(p.percentComplete||0),0)/progs.length):0;
  const done=progs.filter(p=>p.percentComplete>=100).length;
  document.getElementById('hs-en').textContent=(u.enrolledCourses||[]).length;
  document.getElementById('hs-avg').textContent=avg+'%';
  document.getElementById('hs-done').textContent=done;
  document.getElementById('snum').textContent=u.streakDays||0;
  document.getElementById('sdots').innerHTML=Array.from({length:10},(_,i)=>`<div class="sd ${i<(u.streakDays||0)?'on':''}"></div>`).join('');
  document.getElementById('ps-en').textContent=(u.enrolledCourses||[]).length;
  document.getElementById('ps-avg').textContent=avg+'%';
  document.getElementById('ps-xp').textContent=(u.xp||0).toLocaleString();
  document.getElementById('ps-streak').textContent=u.streakDays||0;
  document.getElementById('pav').textContent=(u.name||'??').split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase();
  document.getElementById('pname').textContent=u.name||'-';
  document.getElementById('pemail').textContent=(u.email||'')+ ' . Student';
  document.getElementById('pbadges').innerHTML=(u.badges||[]).map(b=>`<span class="pb-badge">${b}</span>`).join('');
  // Continue learning
  const inp=progs.filter(p=>p.percentComplete>0&&p.percentComplete<100);
  if (inp.length) {
    document.getElementById('cont-sec').style.display='block';
    document.getElementById('cont-grid').innerHTML=inp.slice(0,3).map(p=>{
      const c=p.course;
      return `<div class="contcard" onclick="openCourse('${c?.id||p.courseId}')">
        <div style="font-size:28px;margin-bottom:9px">${c?.emoji||'[courses]'}</div>
        <div style="font-size:13px;font-weight:600;margin-bottom:3px">${c?.title||'Course'}</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:3px">${c?.instructorName||''}</div>
        <div class="pb"><div class="pf" style="width:${p.percentComplete}%"></div></div>
        <div class="pct">${p.percentComplete}% complete</div>
        <button class="resumebtn">> Resume</button>
      </div>`;
    }).join('');
  }
  renderAllCourses();
};

// === MY LEARNING ==========================================
const renderMyCourses = () => {
  const enrolled=S.courses.filter(c=>isEnrolled(c.id));
  const el=document.getElementById('my-courses-grid');
  if (!enrolled.length) { el.innerHTML='<div class="empty"><div class="ico">[book]</div><p>No enrolled courses. Request enrollment from the Explore page.</p></div>'; return; }
  el.innerHTML=enrolled.map(c=>{
    const pr=getProgress(c.id);
    return `<div class="lcard">
      <div class="lcard-hdr">
        <div style="font-size:26px">${c.emoji||'[courses]'}</div>
        <div><div class="lcard-title">${c.title}</div><div class="lcard-meta">${c.instructorName||''} . ${pr?.completedLessons?.length||0}/${c.totalLessons||0} lessons</div></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)"><span>Progress</span><span style="color:var(--accent);font-weight:600">${pr?.percentComplete||0}%</span></div>
      <div class="pb-lg"><div class="pf-lg" style="width:${pr?.percentComplete||0}%"></div></div>
      <div class="lcards-actions">
        <button class="btnc" onclick="openCourse('${c.id}')">${(pr?.percentComplete||0)>=100?'v Review':'> Continue'}</button>
        <button class="btno" onclick="openCourseQuiz('${c.id}')">[quiz] Quiz</button>
        <button class="btno" onclick="openCourseProject('${c.id}')">[project] Project</button>
      </div>
    </div>`;
  }).join('');
};

const renderMyQuizzes = async () => {
  const el=document.getElementById('quiz-list');
  el.innerHTML='<div style="text-align:center;padding:32px;color:var(--muted);font-size:13px">Loading quizzes...</div>';
  const enrolled=S.courses.filter(c=>isEnrolled(c.id));
  if (!enrolled.length) { el.innerHTML='<div class="empty"><div class="ico">[quiz]</div><p>Enroll in courses to access quizzes</p></div>'; return; }

  let allQuizzes=[];
  if (S.demo) {
    allQuizzes=DEMO_QUIZZES;
  } else {
    for (const c of enrolled) {
      try { const d=await api(`/quizzes/course/${c.id}`); allQuizzes.push(...(d.quizzes||[]).map(q=>({...q,courseTitle:c.title,courseEmoji:c.emoji}))); } catch {}
    }
  }

  if (!allQuizzes.length) { el.innerHTML='<div class="empty"><div class="ico">[quiz]</div><p>No quizzes available yet</p></div>'; return; }
  el.innerHTML=allQuizzes.map(q=>`
    <div class="quiz-box">
      <div class="quiz-title">${q.courseEmoji||'[courses]'} ${q.title}</div>
      <div class="quiz-meta">Course: ${q.courseTitle||'-'} . ${q.questions?.length||0} questions . ${Math.floor((q.timeLimit||300)/60)} min . Pass: ${q.passMark||60}%</div>
      <button class="quiz-start-btn" onclick="startQuiz(${JSON.stringify(q).replace(/"/g,'&quot;')})">Start Quiz -&gt;</button>
    </div>`).join('');
};

const renderMyProjects = () => {
  const enrolled=S.courses.filter(c=>isEnrolled(c.id)&&c.projectTitle);
  const el=document.getElementById('proj-list');
  if (!enrolled.length) { el.innerHTML='<div class="empty"><div class="ico">[project]</div><p>Enroll in courses to access projects</p></div>'; return; }
  el.innerHTML=enrolled.map(c=>`
    <div class="proj-box">
      <div class="proj-title">${c.emoji||'[courses]'} ${c.projectTitle}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px">Course: ${c.title}</div>
      <div class="proj-desc">${c.projectDescription||'Project details will be provided by your instructor.'}</div>
      <div class="proj-deadline">Deadline: Deadline: ${c.projectDeadlineDays||7} days after enrollment</div>
      <button class="proj-submit" onclick="submitProject('${c.id}',this)">Submit Project</button>
      <input class="fi proj-link-input" id="proj-input-${c.id}" placeholder="Paste GitHub/Drive link...">
      <div id="proj-status-${c.id}" style="font-size:11px;color:var(--green);margin-top:6px;display:none">v Submitted!</div>
    </div>`).join('');
};

const submitProject = (cid, btn) => {
  const inp=document.getElementById(`proj-input-${cid}`);
  if (inp.style.display==='none'||!inp.style.display) { inp.style.display='block'; inp.focus(); return; }
  if (!inp.value.trim()) { toast('Please paste a link first'); return; }
  btn.style.display='none'; inp.style.display='none';
  document.getElementById(`proj-status-${cid}`).style.display='block';
  toast('Project submitted! v');
};

// Open quiz/project from My Courses tab
const openCourseQuiz = (cid) => {
  switchTab('quiz', document.querySelectorAll('.tab')[1]);
  setTimeout(renderMyQuizzes, 100);
};
const openCourseProject = (cid) => {
  switchTab('projects', document.querySelectorAll('.tab')[2]);
  renderMyProjects();
};

const switchTab = (tab, btn) => {
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  btn.classList.add('on');
  ['courses','quiz','projects'].forEach(t=>{ document.getElementById('tab-'+t).style.display=t===tab?'block':'none'; });
  if (tab==='courses') renderMyCourses();
  if (tab==='quiz') renderMyQuizzes();
  if (tab==='projects') renderMyProjects();
};

// Switch to quiz/project from player
const switchToQuiz = () => { goPage('mylearn'); switchTab('quiz', document.querySelectorAll('.tab')[1]); };
const switchToProject = () => { goPage('mylearn'); switchTab('projects', document.querySelectorAll('.tab')[2]); };

// === QUIZ ENGINE ==========================================
let QS = null; // quiz state
const startQuiz = (quiz) => {
  QS = { quiz, current:0, answers:[], timer:null, seconds: quiz.timeLimit||300, started:false };
  goPage('mylearn');
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.tab')[1].classList.add('on');
  ['courses','quiz','projects'].forEach(t=>{ document.getElementById('tab-'+t).style.display=t==='quiz'?'block':'none'; });
  renderActiveQuiz();
};

const renderActiveQuiz = () => {
  const q=QS.quiz.questions[QS.current];
  const pct=Math.round(QS.current/QS.quiz.questions.length*100);
  const m=Math.floor(QS.seconds/60), s=String(QS.seconds%60).padStart(2,'0');
  document.getElementById('quiz-list').innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:3px">QUESTION ${QS.current+1} / ${QS.quiz.questions.length}</div>
        <div class="quiz-prog-bar" style="width:200px"><div class="quiz-prog-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="quiz-timer" id="qtimer">${m}:${s}</div>
    </div>
    <div class="quiz-q">
      <div class="quiz-qnum">Question ${QS.current+1}</div>
      <div class="quiz-qtext">${q.question}</div>
      ${q.options.map((o,i)=>`<div class="opt ${QS.answers[QS.current]===i?'sel':''}" onclick="selectOpt(${i})"><span class="opt-letter">${String.fromCharCode(65+i)}</span><span>${o}</span></div>`).join('')}
    </div>
    <div class="quiz-nav">
      ${QS.current>0?`<button class="qbtn" onclick="quizBack()">&lt;- Back</button>`:''}
      <button class="qbtn primary" onclick="quizNext()" style="margin-left:auto">${QS.current===QS.quiz.questions.length-1?'Finish -&gt;':'Next -&gt;'}</button>
    </div>`;
  if (!QS.timer) {
    QS.timer=setInterval(()=>{
      QS.seconds--;
      const el=document.getElementById('qtimer');
      if (el) { const m=Math.floor(QS.seconds/60),s=String(QS.seconds%60).padStart(2,'0'); el.textContent=`${m}:${s}`; }
      if (QS.seconds<=0) { clearInterval(QS.timer); finishQuiz(); }
    },1000);
  }
};

const selectOpt = i => { QS.answers[QS.current]=i; renderActiveQuiz(); };
const quizBack  = () => { QS.current--; renderActiveQuiz(); };
const quizNext  = () => {
  if (QS.answers[QS.current]==null) { toast('Please select an answer'); return; }
  if (QS.current<QS.quiz.questions.length-1) { QS.current++; renderActiveQuiz(); }
  else finishQuiz();
};
const finishQuiz = () => {
  if (QS.timer) { clearInterval(QS.timer); QS.timer=null; }
  const total=QS.quiz.questions.length;
  const correct=QS.answers.filter((a,i)=>a===QS.quiz.questions[i]?.correct).length;
  const score=Math.round(correct/total*100);
  const grade=score>=90?'A+':score>=80?'A':score>=70?'B':score>=60?'C':'D';
  const passed=score>=(QS.quiz.passMark||60);
  if (!S.demo) api(`/quizzes/${QS.quiz.id}/submit`,{method:'POST',body:JSON.stringify({answers:QS.answers,courseId:QS.quiz.courseId})}).catch(()=>{});
  document.getElementById('quiz-list').innerHTML=`
    <div class="result-box">
      <div style="font-size:44px;margin-bottom:12px">${passed?':)':'[courses]'}</div>
      <div class="result-score">${score}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:4px">out of 100</div>
      <div class="result-grade">Grade: ${grade} . ${passed?'Passed v':'Try again'}</div>
      <div class="result-detail">${correct} of ${total} correct . ${passed?'+'+Math.round(score/10)*10+' XP earned':''}</div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="qbtn" onclick="renderMyQuizzes()">Back to Quizzes</button>
        <button class="qbtn primary" onclick="startQuiz(${JSON.stringify(QS.quiz).replace(/"/g,'&quot;')})">Retry</button>
      </div>
    </div>`;
};

// === PLAYER ===============================================
const openCourse = async id => {
  const c=S.courses.find(x=>x.id===id); if (!c) return;
  S.currentCourse=c;
  if (!S.demo && isEnrolled(id)) {
    try { const d=await api(`/courses/${id}`); S.currentCourse={...d.course,id:d.course.id||d.course._id}; } catch {}
  }
  goPage('player');
  renderCurriculum();
  // Show enrollment banner if not enrolled
  const pinfo=document.querySelector('.pinfo');
  const existing=document.getElementById('enroll-banner-player');
  if (existing) existing.remove();
  if (!isEnrolled(id)) {
    const req=getRequest(id);
    const banner=document.createElement('div');
    banner.id='enroll-banner-player';
    if (req?.status==='pending') {
      banner.className='enroll-banner';
      banner.innerHTML='[Pending] Your enrollment request is pending admin approval. Free preview lessons available below.';
    } else if (req?.status==='rejected') {
      banner.className='enroll-banner rejected';
      banner.innerHTML='x Your enrollment request was rejected. Please contact the admin.';
    } else {
      banner.className='enroll-banner';
      banner.innerHTML=`[Request] You are not enrolled in this course.<button class="ebtn" onclick="requestEnroll('${id}',event)" style="margin-left:auto">Request Enrollment</button>`;
    }
    document.querySelector('.player-left').insertBefore(banner, pinfo);
  }
  // Auto-load last lesson or first
  const all=(S.currentCourse.sections||[]).flatMap(s=>s.lessons||[]);
  const pr=getProgress(id);
  const start=pr?.lastLessonId ? all.find(l=>l.id===pr.lastLessonId) : all[0];
  if (start) loadLesson(start);
};

const renderCurriculum = () => {
  const c=S.currentCourse; if (!c) return;
  const pr=getProgress(c.id), done=pr?.completedLessons||[];
  const total=c.totalLessons||0, pct=total?Math.round(done.length/total*100):0;
  document.getElementById('curr-prog').textContent=pct+'%';
  const html=(c.sections||[]).map(s=>
    `<div class="cshdr">${s.title} <span style="font-weight:400">(${s.lessons?.length||0})</span></div>`+
    (s.lessons||[]).map(l=>{
      const isDone=done.includes(l.id), isOn=S.currentLesson?.id===l.id;
      const locked=!isEnrolled(c.id)&&!l.isFree;
      return `<div class="cl ${isOn?'on':''} ${isDone?'done':''}" onclick="${locked?`toast('Enroll to unlock this lesson')`:`loadLessonById('${l.id}')`}">
        <span class="cls">${isDone?'v':isOn?'>':locked?'[locked]':'o'}</span>
        <span style="flex:1">${l.title}</span>
        <span class="cldur">${l.durationStr||''}</span>
      </div>`;
    }).join('')
  ).join('')||'<div style="padding:16px;font-size:12px;color:var(--muted);text-align:center">No lessons yet</div>';
  document.getElementById('curr-body').innerHTML=html;
};

const loadLessonById = id => {
  const l=(S.currentCourse?.sections||[]).flatMap(s=>s.lessons||[]).find(x=>x.id===id);
  if (l) loadLesson(l);
};

const loadLesson = l => {
  S.currentLesson=l;
  const c=S.currentCourse;
  document.getElementById('pl-title').textContent=l.title;
  document.getElementById('pl-course').textContent=(c?.emoji||'')+' '+(c?.title||'');
  document.getElementById('pl-dur').textContent='Duration: '+(l.durationStr||'-');
  document.getElementById('pl-free').textContent=l.isFree?'[Free] Free Preview':'';
  const vbox=document.getElementById('vbox');
  const enrolled=isEnrolled(c?.id);
  const src=l.videoUrl||(l.githubPath&&enrolled?`https://raw.githubusercontent.com/${window._ghOwner||'OWNER'}/${window._ghRepo||'lms-videos'}/main/${l.githubPath}`:null);
  if (src) {
    vbox.innerHTML=`<video id="mv" controls autoplay style="width:100%;display:block;max-height:58vh;background:#000"><source src="${src}" type="video/mp4"></video>`;
    document.getElementById('mv').addEventListener('ended',markDone);
    document.getElementById('mv').addEventListener('error',()=>{ vbox.innerHTML=fallback(l.title,'[!] Video file not found on GitHub. Push the .mp4 file first.'); });
  } else {
    vbox.innerHTML=fallback(l.title, l.isFree?'Push this video to GitHub to watch':'[locked] Enroll in this course to watch all lessons');
  }
  renderCurriculum();
};

const fallback = (title, hint) =>
  `<div class="vfallback"><div style="font-size:44px;margin-bottom:10px">[video]</div><p style="font-size:13px;color:rgba(255,255,255,.6)">${title}</p><p style="font-size:11px;margin-top:6px;color:rgba(255,255,255,.3);max-width:320px">${hint}</p></div>`;

const markDone = async () => {
  const l=S.currentLesson, c=S.currentCourse; if (!l||!c) return;
  try {
    if (!S.demo) {
      const d=await api(`/progress/${c.id}/complete-lesson`,{method:'POST',body:JSON.stringify({lessonId:l.id,watchSeconds:60})});
      if (d.xpEarned) { S.user.xp=(S.user.xp||0)+d.xpEarned; document.getElementById('xpval').textContent=S.user.xp.toLocaleString(); toast('Lesson complete! +'+d.xpEarned+' XP +'); }
      if (d.isCompleted) setTimeout(()=>toast(':) Course complete! Certificate earned!'),1500);
      await loadUserData();
    } else {
      let pr=S.progress.find(p=>p.courseId===c.id);
      if (!pr) { pr={courseId:c.id,course:{id:c.id,title:c.title,emoji:c.emoji,totalLessons:c.totalLessons,instructorName:c.instructorName},completedLessons:[],percentComplete:0}; S.progress.push(pr); }
      if (!pr.completedLessons.includes(l.id)) { pr.completedLessons.push(l.id); pr.percentComplete=Math.round(pr.completedLessons.length/(c.totalLessons||1)*100); S.user.xp=(S.user.xp||0)+20; document.getElementById('xpval').textContent=S.user.xp.toLocaleString(); toast('Lesson complete! +20 XP +'); }
      else toast('Already marked complete v');
      pr.lastLessonId=l.id;
    }
    renderCurriculum();
  } catch(e) { toast(e.message); }
};

// === NAV ==================================================
const gotoHome = () => { if (S.user) goPage('home'); else goPage('auth'); };
const goPage = (page, btn) => {
  if (!S.user&&page!=='auth') { goPage('auth'); return; }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));
  document.getElementById('page-'+page)?.classList.add('on');
  if (btn) btn.classList.add('on');
  else { const m={home:0,explore:1,mylearn:2,profile:3}; document.querySelectorAll('.nb')[m[page]]?.classList.add('on'); }
  if (page==='home') renderHome();
  if (page==='explore') renderAllCourses();
  if (page==='mylearn') { renderMyCourses(); }
  if (page==='profile') renderProfile();
};

const renderProfile = () => {
  const u=S.user; if (!u) return;
  const ini=(u.name||'??').split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase();
  document.getElementById('pav').textContent=ini;
  document.getElementById('pname').textContent=u.name||'-';
  document.getElementById('pemail').textContent=(u.email||'')+' . Student';
  document.getElementById('pbadges').innerHTML=(u.badges||[]).map(b=>`<span class="pb-badge">${b}</span>`).join('');
  const progs=S.progress, avg=progs.length?Math.round(progs.reduce((a,p)=>a+(p.percentComplete||0),0)/progs.length):0;
  document.getElementById('ps-en').textContent=(u.enrolledCourses||[]).length;
  document.getElementById('ps-avg').textContent=avg+'%';
  document.getElementById('ps-xp').textContent=(u.xp||0).toLocaleString();
  document.getElementById('ps-streak').textContent=u.streakDays||0;
};

// === TOAST + KEEPALIVE ====================================
const toast = msg => {
  const el=document.getElementById('tst'); el.textContent=msg; el.classList.add('on');
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('on'),2800);
};
window.toast=toast;
setInterval(()=>fetch(API+'/health').catch(()=>{}), 13*60*1000);

// === BOOT ================================================
init();

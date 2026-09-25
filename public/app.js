const $ = id => document.getElementById(id);
let state = {user:null,freeToday:false,canRead:false,credits:0,demo:true};
let image = null, resultId = null, authMode = 'register';
let currentChart=null;
const days = ['일','월','화','수','목','금','토'];
async function api(url, options={}) {
  const res=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...options});
  const data=await res.json(); if(!res.ok) throw new Error(data.error || '잠시 후 다시 시도해주세요.');return data;
}
const post=(url,data)=>api(url,{method:'POST',body:JSON.stringify(data)});
function renderAuth() {
  $('authButton').textContent=state.user ? '내 계정 · 로그아웃' : '로그인 / 가입';
  $('deleteAccount').hidden=!state.user;
  $('freePill').textContent=`매주 ${days[state.freeWeekday ?? 3]}요일 · 전체 풀이 무료${state.freeToday?' (오늘 무료)':''}`;
  if(state.user){
    $('referralBox').replaceChildren();
    const code=document.createElement('p');code.className='invite-code';code.textContent=`내 초대 코드 ${state.user.code} · 남은 이용권 ${state.user.credits}장`;
    const button=document.createElement('button');button.className='button light';button.textContent='초대 링크 복사 ↗';button.onclick=share;
    $('referralBox').append(code,button);
  } else $('referralBox').innerHTML='<button id="referralButton" class="button light">내 초대 링크 만들기 ↗</button>', $('referralButton').onclick=()=>openAuth();
}
function openAuth(mode='register') {
  authMode=mode; $('authTitle').textContent=mode==='register'?'사이 시작하기':'다시 만나서 반가워요';
  $('authSubmit').textContent=mode==='register'?'회원가입':'로그인';
  $('toggleAuth').textContent=mode==='register'?'이미 계정이 있으신가요? 로그인':'처음 오셨나요? 회원가입';
  $('refRow').hidden=mode!=='register';$('authError').textContent='';$('authDialog').showModal();
}
function renderResult(result) {
  $('result').hidden=false; $('resultPreview').textContent=result.preview;
  renderChart(result.chart);
  $('locked').hidden=!result.locked;$('report').hidden=result.locked;
  if(!result.locked){$('report').textContent=result.full;post('/api/event',{name:'card_opened'}).catch(()=>{});}
  if(result.locked){
    $('gateText').textContent=!state.user?'가입 후 무료 요일 또는 초대 이용권으로 전체 풀이를 확인할 수 있어요.':`매주 ${days[state.freeWeekday ?? 3]}요일에 무료예요. 친구 5명 초대로 1일 이용권을 받을 수도 있어요.`;
    $('gateButton').textContent=!state.user?'회원가입하고 이어서 보기 ↗':state.user.credits>0?'이용권 1장 사용하기 ↗':'초대 혜택 보기 ↗';
    post('/api/event',{name:'report_gate_viewed'}).catch(()=>{});
  }
  $('result').scrollIntoView({behavior:'smooth',block:'center'});
}
function renderChart(chart){
  currentChart=chart;$('chart').hidden=!chart;if(!chart)return;
  $('chartPillars').replaceChildren();
  for(const pillar of [...chart.pillars].reverse()){
    const card=document.createElement('div');card.className='pillar';
    const label=document.createElement('small');label.textContent=pillar.name;
    const glyphs=document.createElement('div');glyphs.className='glyphs';
    for(const [value,element] of [[pillar.stem,pillar.elementStem],[pillar.branch,pillar.elementBranch]]){
      const span=document.createElement('span');span.textContent=pillar.unknown?'?':value;span.className=element||'';glyphs.append(span);
    }
    const god=document.createElement('strong');god.textContent=pillar.unknown?'시간 미입력':pillar.tenGod;
    card.append(label,glyphs,god);$('chartPillars').append(card);
  }
  $('chartElements').textContent='보이는 글자의 오행: '+Object.entries(chart.elements).map(([name,n])=>`${name} ${n}`).join(' · ');
  $('chartNotice').textContent=chart.warnings.join(' ') || chart.basis;
}
function downloadChart(){
  if(!currentChart)return;
  const c=document.createElement('canvas');c.width=1200;c.height=900;const ctx=c.getContext('2d');
  ctx.fillStyle='#f6f2eb';ctx.fillRect(0,0,1200,900);ctx.fillStyle='#283c30';
  ctx.font='bold 52px sans-serif';ctx.fillText('사이 · 나의 만세력',65,100);
  ctx.font='26px sans-serif';ctx.fillText(`${currentChart.solarDate} · ${currentChart.input.time || '출생시각 미입력'} · ${currentChart.input.calendar==='lunar'?'음력 입력':'양력 입력'}`,65,150);
  const colors={목:'#b5dfc3',화:'#edac9e',토:'#edd796',금:'#e5e4dc',수:'#bdc8d1'};
  for(const [i,p] of [...currentChart.pillars].reverse().entries()){
    const x=65+i*270;ctx.font='bold 28px sans-serif';ctx.fillStyle='#425a43';ctx.fillText(p.name,x+60,235);
    for(const [row,val,element] of [[0,p.stem,p.elementStem],[1,p.branch,p.elementBranch]]){
      ctx.fillStyle=colors[element]||'#ecece4';ctx.fillRect(x,270+row*140,230,118);
      ctx.fillStyle='#1f3427';ctx.font='bold 78px serif';ctx.textAlign='center';ctx.fillText(p.unknown?'?':val,x+115,357+row*140);ctx.textAlign='left';
    }
    ctx.font='22px sans-serif';ctx.fillStyle='#435846';ctx.fillText(p.unknown?'시간 미입력':p.tenGod,x+65,585);
  }
  ctx.fillStyle='#435846';ctx.font='25px sans-serif';ctx.fillText(Object.entries(currentChart.elements).map(([k,n])=>`${k} ${n}`).join('   '),65,690);
  ctx.font='20px sans-serif';ctx.fillText('기준: 한국 표준시 · 출생지 보정 없음 · 계산 규칙 v1',65,760);
  ctx.fillText('사주 결과는 자기 탐색과 대화의 소재입니다.',65,805);
  const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='sai-manse.png';a.click();
}
async function loadResult(){if(!resultId)return;try{renderResult(await api(`/api/analyses/${resultId}`));}catch(err){$('formError').textContent=err.message;}}
function showError(id,err){$(id).textContent=err.message || String(err);}
async function share(){
  const link=`${location.origin}${location.pathname}?ref=${encodeURIComponent(state.user.code)}`;
  try{if(navigator.share) await navigator.share({title:'사이 · 사주로 시작하는 대화',url:link});else await navigator.clipboard.writeText(link);
    post('/api/event',{name:'share_clicked'}).catch(()=>{});
    const button=$('referralBox').querySelector('button');button.textContent='초대 링크를 공유했어요 ✓';setTimeout(()=>button.textContent='초대 링크 복사 ↗',2500);
  }catch(err){if(err.name!=='AbortError')alert(`초대 링크: ${link}`);}
}
function cards(list){$('cardsContainer').replaceChildren();for(const [i,card] of list.entries()){
  const article=document.createElement('article');article.className='question-card';
  const top=document.createElement('div');const label=document.createElement('span');label.textContent=card.title;const index=document.createElement('span');index.textContent=`0${i+1} / 0${list.length}`;top.append(label,index);
  const title=document.createElement('h3');title.textContent=card.question;
  const copy=document.createElement('button');copy.textContent='질문 복사해서 대화 시작하기 ↗';copy.onclick=async()=>{try{await navigator.clipboard.writeText(card.question);copy.textContent='질문을 복사했어요 ✓';}catch{copy.textContent=card.question;}post('/api/event',{name:'card_opened'}).catch(()=>{});};
  article.append(top,title,copy);$('cardsContainer').append(article);
}}
async function boot(){try{const data=await api('/api/bootstrap');state=data;renderAuth();cards(data.cards);}catch(err){showError('formError',err);}}
$('authButton').onclick=async()=>{if(!state.user)return openAuth();try{state=await post('/api/logout',{});renderAuth();await loadResult();}catch(err){showError('formError',err);}};
$('closeAuth').onclick=()=>$('authDialog').close();
$('downloadChart').onclick=downloadChart;
$('birthTab').onclick=()=>{ $('birthForm').hidden=false;$('imageForm').hidden=true;$('birthTab').classList.add('active');$('imageTab').classList.remove('active');$('birthTab').setAttribute('aria-selected','true');$('imageTab').setAttribute('aria-selected','false');$('formError').textContent='';};
$('imageTab').onclick=()=>{ $('birthForm').hidden=true;$('imageForm').hidden=false;$('imageTab').classList.add('active');$('birthTab').classList.remove('active');$('imageTab').setAttribute('aria-selected','true');$('birthTab').setAttribute('aria-selected','false');$('formError').textContent='';};
$('calendar').onchange=()=>{$('leapLabel').hidden=$('calendar').value!=='lunar';if($('leapLabel').hidden)$('birthForm').elements.leapMonth.checked=false;};
$('birthForm').onsubmit=async event=>{event.preventDefault();$('formError').textContent='';const f=new FormData(event.currentTarget);
  try{const data=await post('/api/manse',{calendar:f.get('calendar'),date:f.get('date'),time:f.get('time'),gender:f.get('gender'),leapMonth:f.has('leapMonth'),priority:f.get('priority'),mode:f.get('mode')});resultId=data.id;renderResult(data);}catch(err){showError('formError',err);}
};
$('deleteAccount').onclick=async()=>{if(!confirm('계정과 저장된 결과를 삭제할까요? 삭제 후 복구할 수 없습니다.'))return;try{await post('/api/account/delete',{});resultId=null;$('result').hidden=true;state=(await api('/api/bootstrap'));renderAuth();}catch(err){showError('formError',err);}};
$('toggleAuth').onclick=()=>openAuth(authMode==='register'?'login':'register');
$('authForm').onsubmit=async event=>{event.preventDefault();$('authError').textContent='';const form=new FormData(event.currentTarget);
  try {state=await post(authMode==='register'?'/api/register':'/api/login',{email:form.get('email'),password:form.get('password'),ref:form.get('ref')});$('authDialog').close();renderAuth();await loadResult();}
  catch(err){showError('authError',err);}};
$('imageInput').onchange=event=>{const file=event.target.files?.[0];$('formError').textContent='';if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>4_000_000){$('formError').textContent='JPG, PNG, WEBP 이미지를 4MB 이하로 골라주세요.';return;}
  const reader=new FileReader();reader.onload=()=>{image=reader.result;$('imagePreview').src=image;$('imagePreview').hidden=false;$('dropTitle').textContent=file.name;$('dropHint').textContent='이미지를 바꾸려면 다시 눌러주세요.';};reader.readAsDataURL(file);
};
$('dropzone').ondragover=e=>{e.preventDefault();};$('dropzone').ondrop=e=>{e.preventDefault();const file=e.dataTransfer.files?.[0];if(file){const dt=new DataTransfer();dt.items.add(file);$('imageInput').files=dt.files;$('imageInput').dispatchEvent(new Event('change'));}};
$('analyze').onclick=async()=>{if(!image){$('formError').textContent='먼저 만세력 캡처를 올려주세요.';return;}
  $('formError').textContent='';$('loading').hidden=false;
  try{const data=await post('/api/analysis',{image,priority:$('priority').value,mode:$('mode').value});resultId=data.id;renderResult(data);}catch(err){showError('formError',err);}finally{$('loading').hidden=true;}};
$('gateButton').onclick=async()=>{if(!state.user)return openAuth();if(state.user.credits>0){try{state=await post('/api/redeem',{});renderAuth();await loadResult();}catch(err){showError('formError',err);}return;}location.hash='growth';};
const ref=new URLSearchParams(location.search).get('ref');if(ref && /^[A-F0-9]{10}$/i.test(ref)) $('authForm').elements.ref.value=ref;
boot();

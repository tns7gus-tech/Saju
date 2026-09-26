/* Browser-only manse chart. Calendar values come from lunar-javascript; unverified star rules are omitted. */
(() => {
  'use strict';
  const S={甲:'갑',乙:'을',丙:'병',丁:'정',戊:'무',己:'기',庚:'경',辛:'신',壬:'임',癸:'계'};
  const B={子:'자',丑:'축',寅:'인',卯:'묘',辰:'진',巳:'사',午:'오',未:'미',申:'신',酉:'유',戌:'술',亥:'해'};
  const E={甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수',子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'};
  const G={'比肩':'비견','劫财':'겁재','食神':'식신','伤官':'상관','偏财':'편재','正财':'정재','七杀':'편관','正官':'정관','偏印':'편인','正印':'정인'};
  const ST={'长生':'장생','沐浴':'목욕','冠带':'관대','临官':'건록','帝旺':'제왕','衰':'쇠','病':'병','死':'사','墓':'묘','绝':'절','胎':'태','养':'양'};
  const NY={'山头火':'산두화','城头土':'성두토','松柏木':'송백목','杨柳木':'양류목','海中金':'해중금','炉中火':'노중화','大林木':'대림목','路旁土':'노방토','剑锋金':'검봉금','涧下水':'간하수','白蜡金':'백랍금','泉中水':'천중수','屋上土':'옥상토','霹雳火':'벽력화','长流水':'장류수','砂中金':'사중금','山下火':'산하화','平地木':'평지목','壁上土':'벽상토','金箔金':'금박금','覆灯火':'복등화','天河水':'천하수','大驿土':'대역토','钗钏金':'채천금','桑柘木':'상자목','大溪水':'대계수','沙中土':'사중토','天上火':'천상화','石榴木':'석류목','大海水':'대해수'};
  const $=id=>document.getElementById(id);
  const el=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls||'';node.textContent=text||'';return node;};
  const put=(target,tag,cls,text)=>{const node=el(tag,cls,text);target.append(node);return node;};
  const sound=gz=>S[gz?.[0]]&&B[gz?.[1]]?S[gz[0]]+B[gz[1]]:'—';
  const god=(day,stem)=>G[window.LunarUtil.SHI_SHEN[day+stem]]||'—';
  function branchGod(day,branch){const hidden=window.LunarUtil.ZHI_HIDE_GAN[branch];return hidden?.length?god(day,hidden[0]):'—';}
  function stage(day,branch){
    const stems=Object.keys(S), branches=Object.keys(B);
    const ziIndex=branches.indexOf(branch), stemIndex=stems.indexOf(day);
    if(ziIndex<0||stemIndex<0)return '—';
    const offset=window.LunarUtil.CHANG_SHENG_OFFSET[day];
    const value=window.LunarUtil.CHANG_SHENG[((offset+(stemIndex%2===0?ziIndex:-ziIndex))%12+12)%12];
    return ST[value]||value||'—';
  }
  function tile(target,char){put(target,'span','manse-tile element-'+(E[char]||'none'),char||'—');}
  function column(target,title,gz,day,extras={}){
    const col=put(target,'div','manse-col','');
    put(col,'span','manse-col-heading',title);
    if(extras.reading)put(col,'span','manse-reading',sound(gz));
    put(col,'span','manse-god'+(extras.isDay?' is-day':''),extras.isDay?'일간(나)':gz?god(day,gz[0]):'시각 미상');
    const glyph=put(col,'div','manse-glyph','');tile(glyph,gz?.[0]);tile(glyph,gz?.[1]);
    put(col,'span','manse-branch-god',gz?branchGod(day,gz[1]):'—');
    if(extras.hidden)put(col,'span','manse-extra',extras.hidden.length?extras.hidden.join(' · '):'—');
    put(col,'span','manse-extra',gz?stage(day,gz[1]):'—');
    if(extras.naYin)put(col,'span','manse-extra',NY[extras.naYin]||extras.naYin);
    return col;
  }
  function fortuneGroup(root,heading,items,day,note){
    const section=put(root,'section','fortune-section','');
    put(section,'h3','',heading);
    if(note)put(section,'p','fortune-note',note);
    const descending=items.slice().reverse();
    for(let start=0;start<descending.length;start+=7){
      const grid=put(section,'div','fortune-grid','');
      for(const x of descending.slice(start,start+7))column(grid,x.label,x.gz,day);
    }
  }
  function render(chart){
    const {input,pillars,elements,luck}=chart,day=pillars[2].stem;
    const head=$('manseHeader');head.replaceChildren();
    const year=Number(input.date.slice(0,4)), now=new Date().getFullYear();
    const age=now-year+1;
    put(head,'strong','',`나의 만세력${age>0?` (${now}년 기준 세는나이 ${age}세)`:''}`);
    put(head,'span','',`${input.calendar==='lunar'?'음력':'양력'} ${input.date} · ${input.time||'출생 시각 미입력'}${input.calendar==='lunar'?` · 양력 환산 ${chart.solarDate}`:''}`);
    const grid=$('pillars');grid.replaceChildren();
    for(const p of pillars.slice().reverse())column(grid,p.name,p.hanja,day,{reading:true,isDay:p.name==='일주',hidden:p.hiddenStems,naYin:p.naYin});
    const summary=$('manseSummary');summary.replaceChildren();
    put(summary,'div','',`오행 · ${Object.entries(elements).map(([e,n])=>`${e} ${n}`).join('  /  ')}`);
    put(summary,'div','',`공망 · 년주 ${pillars[0].xunKong||'—'} / 일주 ${pillars[2].xunKong||'—'}`);
    put(summary,'small','',`위부터 천간 십성, 천간·지지, 지지 십성, 지장간, 12운성, 납음. 신살·귀인 및 합충형파해는 앱별 규칙 확인 전까지 표시하지 않습니다.`);
    const fortunes=$('fortuneTables');fortunes.replaceChildren();
    if(luck){
      const note=`대운수 약 ${luck.periods[0].startAge-1}년 · ${luck.direction} · 나이는 참고 화면의 대운수 표기 방식입니다. 실제 만 나이와 다를 수 있습니다.`;
      fortuneGroup(fortunes,'대운 · 10년 흐름',luck.periods.map(p=>({label:`${p.startAge-1}세 · ${p.startYear}년`,gz:p.ganZhi})),day,note);
    }else put(fortunes,'p','fortune-note','대운은 출생 시각과 대운 계산 기준을 입력하면 볼 수 있습니다.');
    const years=[];for(let y=now-1;y<=now+5;y++){
      const gz=window.Solar.fromYmdHms(y,7,15,12,0,0).getLunar().getEightChar().getYear();
      years.push({label:`${y}년`,gz});
    }
    fortuneGroup(fortunes,'세운 · 연도별 흐름',years,day,'연도는 입춘에 바뀝니다. 표시 연도의 입춘 이후 간지입니다.');
    const months=[];for(let m=1;m<=12;m++){
      const gz=window.Solar.fromYmdHms(now,m,15,12,0,0).getLunar().getEightChar().getMonth();
      months.push({label:`${m}월`,gz});
    }
    fortuneGroup(fortunes,`${now}년 월운 · 절입 기준`,months,day,'각 달 15일의 월주를 표시합니다. 실제 월주는 절입 시각에 바뀝니다.');
  }
  window.renderVisualManse=render;
})();

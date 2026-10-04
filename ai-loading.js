/* Time-based feedback: Ollama currently returns a complete response, not token progress. */
(() => {
  'use strict';
  const estimates={quick:5,topic:5,section:300,full:5,saju:5,consult:5,daily:5,compatibility:5,decade:5,annual:5,dates:5};
  window.SaiLoading={mount(container,{kind='quick',label='나의 이야기를 준비하고 있어요.'}={}){
    container.querySelectorAll('.ai-loading').forEach(n=>n.remove());
    const root=document.createElement('section');root.className='ai-loading';
    root.innerHTML='<div class="ai-loading-art"><img src="./assets/sai-mascot.png" width="140" height="140" alt="책을 읽으며 이야기를 준비하는 사이 토끼"><span class="ai-loading-spark" aria-hidden="true">✦</span></div><div class="ai-loading-copy"><strong class="ai-loading-title"></strong><p class="ai-loading-phase" role="status"></p><div class="ai-loading-track" role="progressbar" aria-label="시간 기준 예상 진행"><span class="ai-loading-fill"></span></div><div class="ai-loading-meta"><span class="ai-loading-time"></span><span>시간 기준 예상 진행</span></div><p class="ai-loading-note"></p></div>';
    container.append(root);
    const q=s=>root.querySelector(s),bar=q('.ai-loading-track'),fill=q('.ai-loading-fill');
    q('.ai-loading-title').textContent=label;
    const estimate=estimates[kind]||180;
    q('.ai-loading-note').textContent=`잠시만 기다려주세요. 나에게 맞는 이야기를 준비하고 있어요.`;
    let started=Date.now(),phase='generating',lastMood=-1,timer,observer,disposed=false;
    const format=s=>s<60?`${s}초`:`${Math.floor(s/60)}분 ${s%60}초`;
    function change(text){q('.ai-loading-phase').textContent=text;root.classList.remove('ai-loading-change');void root.offsetWidth;root.classList.add('ai-loading-change');}
    function dispose(){if(disposed)return;disposed=true;clearInterval(timer);observer?.disconnect();}
    function tick(){
      if(!root.isConnected){dispose();return;}
      const dialog=root.closest('dialog');if(dialog&&!dialog.open){dispose();return;}
      const seconds=Math.floor((Date.now()-started)/1000);
      q('.ai-loading-time').textContent=`${format(seconds)} 경과`;
      const percent=phase==='waiting'?5:Math.min(92,8+84*(1-Math.exp(-seconds/(estimate*.55))));
      fill.style.width=`${percent}%`;
      bar.setAttribute('aria-valuetext',phase==='waiting'?'앞선 요청을 기다리는 중':`작성 중, ${format(seconds)} 경과. 시간 기준 예상이며 실제 생성 비율은 아닙니다.`);
      const mood=Math.floor(seconds/20);
      if(phase==='generating'&&mood!==lastMood){lastMood=mood;change(seconds>estimate?'예상보다 조금 길어지고 있어요. 답변을 기다리는 중이에요.':['토끼와 함께 이야기를 기다려요.','나에게 맞는 이야기를 차근차근 정리하고 있어요.','조금만 더 기다려주세요. 이야기를 준비하고 있어요.'][mood%3]);root.dataset.mood=String(mood%3);}
    }
    timer=setInterval(tick,1000);observer=new MutationObserver(()=>{if(!root.isConnected)dispose();});observer.observe(document.body,{childList:true,subtree:true});tick();
    return {dispose,updateText(text){if(disposed||!root.isConnected||!text)return;let output=q('.ai-loading-stream');if(!output){output=document.createElement('p');output.className='ai-loading-stream';q('.ai-loading-copy').append(output);q('.ai-loading-note').textContent='이야기가 조금씩 완성되고 있어요.';}output.textContent=text;},setPhase(next){if(disposed)return;phase=next;started=Date.now();lastMood=-1;if(next==='waiting')change('먼저 요청한 이번 달 이야기를 기다리고 있어요.');tick();},finish(){if(disposed)return;fill.style.width='100%';bar.setAttribute('aria-valuetext','답변 작성 완료');change('이야기가 완성됐어요!');dispose();}};
  }};
})();

// ══════════ TRANSLATIONS ══════════
let LANG='en';
const T={
  en:{
    scan_place:'Place Your Finger Here',scan_hold:'Touch & hold the sensor to begin scan',
    scan_detected:'Finger Detected',scan_scanning:'Hold still — scanning...',
    scan_done:'Scan Complete',scan_again:'Touch sensor again for new reading',
    finger_removed:'⚠  Finger removed — try again',scan_complete:'✓  Scan complete',
    bp_normal:'NORMAL',bp_elevated:'ELEVATED',bp_high:'HIGH',bp_stage2:'STAGE 2',bp_low:'LOW',
    spo2_normal:'NORMAL',spo2_low:'LOW',spo2_critical:'CRITICAL',
    pdf_no_data:'Please complete a scan first!',
    pdf_gen:'📄 Generating PDF report...',pdf_done:'✓  PDF downloaded!',
    hist_cleared:'🗑  History cleared',
    installed:'✓  App installed successfully!',
    install_ready:'Ready to install — tap button below',
    install_done:'App installed on your device',
    install_ios:'📲 Safari: Share → Add to Home Screen',
    install_chrome:'📲 Chrome: Menu (⋮) → Install App',
    bmi_fill:'Enter height and weight first!',
    sleep_fill:'Enter sleep hours first!',
  },
  ur:{
    scan_place:'یہاں انگلی رکھیں',scan_hold:'اسکین کے لیے سینسر پر انگلی رکھیں',
    scan_detected:'انگلی محسوس ہوئی',scan_scanning:'ہلیں نہیں — اسکین جاری ہے...',
    scan_done:'اسکین مکمل',scan_again:'دوبارہ اسکین کے لیے انگلی رکھیں',
    finger_removed:'⚠  انگلی ہٹ گئی — دوبارہ کوشش کریں',scan_complete:'✓  اسکین مکمل',
    bp_normal:'نارمل',bp_elevated:'بڑھا ہوا',bp_high:'زیادہ',bp_stage2:'مرحلہ 2',bp_low:'کم',
    spo2_normal:'نارمل',spo2_low:'کم',spo2_critical:'خطرناک',
    pdf_no_data:'پہلے اسکین مکمل کریں!',
    pdf_gen:'📄 PDF بن رہی ہے...',pdf_done:'✓  PDF ڈاؤن لوڈ ہوگئی!',
    hist_cleared:'🗑  ریکارڈ صاف',
    installed:'✓  ایپ انسٹال ہوگئی!',
    install_ready:'انسٹال کے لیے تیار',
    install_done:'ایپ انسٹال ہے',
    install_ios:'📲 Safari: Share → Add to Home Screen',
    install_chrome:'📲 Chrome: مینو → Install App',
    bmi_fill:'پہلے قد اور وزن لکھیں!',
    sleep_fill:'نیند کے گھنٹے لکھیں!',
  }
};
const t=k=>T[LANG][k]||T.en[k]||k;

function setLang(lang){
  LANG=lang;
  document.querySelectorAll('.lang-btn').forEach(b=>b.classList.toggle('active',b.dataset.l===lang));
  document.querySelectorAll('[data-'+lang+']').forEach(el=>{
    const v=el.getAttribute('data-'+lang);
    if(el.tagName==='INPUT')el.placeholder=v; else el.innerHTML=v;
  });
  if(S.mode==='idle'){G('imain').textContent=t('scan_place');G('isub').textContent=t('scan_hold');}
  calcStress();
}

// ══════════ HELPERS ══════════
const ri=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const G=id=>document.getElementById(id);
let _tt;
function toast(msg){const e=G('toast');e.textContent=msg;e.classList.add('show');clearTimeout(_tt);_tt=setTimeout(()=>e.classList.remove('show'),3000);}
function vin(e){e.classList.remove('vin');void e.offsetWidth;e.classList.add('vin');setTimeout(()=>e.classList.remove('vin'),500);}

// ══════════ NAV ══════════
function showPage(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  G('page-'+id).classList.add('active');
  btn.classList.add('active');
  G('footerWrap').style.display=id==='scan'?'block':'none';
}

// ══════════ CLOCK ══════════
function tick(){G('clock').textContent=new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'});}
tick();setInterval(tick,1000);

// ══════════ APP STATE ══════════
const S={mode:'idle',progress:0,ptimer:null,wraf:null,wphase:0,history:[],dprompt:null,
  lastBP:null,lastSpO2:null,lastHR:null,lastTemp:null,lastRsp:null};
const ctx=G('cv').getContext('2d');

// ══════════ SENSOR ══════════
G('score').addEventListener('mousedown',fingerDown);
G('score').addEventListener('touchstart',e=>{e.preventDefault();fingerDown();},{passive:false});
document.addEventListener('mouseup',fingerUp);
document.addEventListener('touchend',fingerUp);

function fingerDown(){
  if(S.mode==='measuring')return;
  S.mode='measuring';
  G('score').classList.add('touched','measuring');
  G('scard').classList.add('measuring');
  G('sicon').textContent='☝️';
  G('imain').textContent=t('scan_detected');
  G('isub').textContent=t('scan_scanning');
  G('progbox').style.display='block';
  S.progress=0; drawWave(true);
  let step=0;
  S.ptimer=setInterval(()=>{
    step++;S.progress=Math.min(100,Math.round(step/80*100));
    G('pfill').style.width=S.progress+'%';G('ppct').textContent=S.progress+'%';
    if(S.progress>=100){clearInterval(S.ptimer);finish();}
  },50);
}
function fingerUp(){
  if(S.mode!=='measuring')return;
  clearInterval(S.ptimer);resetSensor();toast(t('finger_removed'));
}
function finish(){
  const bp=genBP(),spo2=genSpO2(),hr=genHR(),tmp=genTemp(),rsp=ri(12,20);
  S.lastBP=bp;S.lastSpO2=spo2;S.lastHR=hr;S.lastTemp=tmp;S.lastRsp=rsp;
  S.mode='done';
  G('score').classList.remove('measuring','touched');
  G('scard').classList.remove('measuring');
  G('bpval').textContent=bp.sys+'/'+bp.dia;G('bpval').classList.remove('dim');vin(G('bpval'));
  G('bpcard').classList.add('ready');badge(G('bpbadge'),bp.label);
  G('spo2val').textContent=spo2.val+'%';G('spo2val').classList.remove('dim');vin(G('spo2val'));
  G('spo2card').classList.add('ready');badge(G('spo2badge'),spo2.label);
  G('hrval').textContent=hr;G('hrval').classList.remove('dim');vin(G('hrval'));G('hrcard').classList.add('ready');
  G('tmpval').textContent=tmp;G('tmpval').classList.remove('dim');vin(G('tmpval'));G('tmpcard').classList.add('ready');
  G('rspval').textContent=rsp;G('rspval').classList.remove('dim');vin(G('rspval'));G('rspcard').classList.add('ready');
  G('wbpm').textContent=hr+' BPM';
  addHistory(bp,spo2,hr);toast(t('scan_complete'));
  G('sicon').textContent='✅';G('imain').textContent=t('scan_done');G('isub').textContent=t('scan_again');
  G('progbox').style.display='none';G('pfill').style.width='0%';
}
function resetSensor(){
  S.mode='idle';S.progress=0;
  G('score').classList.remove('touched','measuring');
  G('scard').classList.remove('active','measuring');
  G('sicon').textContent='👆';G('imain').textContent=t('scan_place');G('isub').textContent=t('scan_hold');
  G('progbox').style.display='none';G('pfill').style.width='0%';drawWave(false);
}
function badge(e,l){
  e.textContent=l;e.className='mbadge';
  const lo=l.toLowerCase();
  if(lo.includes('normal')||lo.includes('نارمل'))e.classList.add('ok');
  else if(lo.includes('elevat')||lo.includes('بڑھا')||lo.includes('low')||lo.includes('کم'))e.classList.add('warn');
  else e.classList.add('bad');
}

// ══════════ GENERATORS ══════════
function genBP(){
  // Realistic: 70% normal, 15% slightly elevated, 8% high, 4% low, 3% very high
  // Consecutive readings vary by max ±8 mmHg (realistic home monitor variation)
  const r=Math.random();
  let sys,dia,label;
  if(r<0.70){
    // Normal: 110-129 / 70-84
    sys=ri(110,129); dia=ri(70,84); label=t('bp_normal');
  } else if(r<0.85){
    // Elevated: 130-139 / 80-89
    sys=ri(130,139); dia=ri(80,89); label=t('bp_elevated');
  } else if(r<0.93){
    // Stage 1 High: 140-149 / 90-95
    sys=ri(140,149); dia=ri(90,95); label=t('bp_high');
  } else if(r<0.97){
    // Low: 95-109 / 60-69
    sys=ri(95,109); dia=ri(60,69); label=t('bp_low');
  } else {
    // Stage 2 High: 150-165 / 96-105 (very rare — 3%)
    sys=ri(150,165); dia=ri(96,105); label=t('bp_stage2');
  }
  // Add small natural variation (±4 mmHg) to simulate real measurement
  sys += ri(-3,3); dia += ri(-2,2);
  return {sys,dia,label};
}
function genSpO2(){
  // Healthy adults: 95-100% most of the time
  const r=Math.random();
  if(r<0.80)return{val:ri(97,100),label:t('spo2_normal')};
  if(r<0.94)return{val:ri(95,96),label:t('spo2_normal')};
  if(r<0.98)return{val:ri(92,94),label:t('spo2_low')};
  return{val:ri(88,91),label:t('spo2_critical')};
}
function genHR(){
  // Resting HR: 60-80 most common for adults
  const r=Math.random();
  if(r<0.65)return ri(62,78);   // normal resting
  if(r<0.82)return ri(55,62);   // athletic/low-normal
  if(r<0.93)return ri(79,95);   // slightly elevated
  if(r<0.98)return ri(96,110);  // elevated
  return ri(110,120);            // high (rare)
}
function genTemp(){return(36.1+Math.random()*1.1).toFixed(1);}

// ══════════ ECG WAVE ══════════
function drawWave(active){
  if(S.wraf){cancelAnimationFrame(S.wraf);S.wraf=null;}
  const cv=G('cv'),W=cv.width=cv.offsetWidth*(window.devicePixelRatio||1),H=cv.height=70*(window.devicePixelRatio||1);
  const draw=()=>{
    ctx.clearRect(0,0,W,H);const mid=H/2;
    if(!active){ctx.strokeStyle='rgba(0,229,255,.18)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,mid);ctx.lineTo(W,mid);ctx.stroke();return;}
    S.wphase+=.055;
    const g=ctx.createLinearGradient(0,0,W,0);
    g.addColorStop(0,'rgba(0,255,136,0)');g.addColorStop(.15,'rgba(0,255,136,.9)');
    g.addColorStop(.85,'rgba(0,229,255,.9)');g.addColorStop(1,'rgba(0,229,255,0)');
    ctx.strokeStyle=g;ctx.lineWidth=2;ctx.shadowColor='rgba(0,255,136,.7)';ctx.shadowBlur=10;
    ctx.beginPath();
    for(let x=0;x<=W;x++){
      const c=((x/W*5+S.wphase/(2*Math.PI))%1);
      let y=mid;
      if(c>.38&&c<.41)y=mid-H*.18*Math.sin((c-.38)/.03*Math.PI);
      else if(c>.48&&c<.495)y=mid-H*.07;
      else if(c>.495&&c<.515)y=mid+H*.13;
      else if(c>.515&&c<.535)y=mid-H*.45;
      else if(c>.535&&c<.555)y=mid+H*.10;
      else if(c>.62&&c<.72)y=mid-H*.09*Math.sin((c-.62)/.10*Math.PI);
      else y=mid+Math.sin(S.wphase*.3+x*.002)*2;
      x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.stroke();ctx.shadowBlur=0;S.wraf=requestAnimationFrame(draw);
  };draw();
}
drawWave(false);
// Canvas responsive resize
window.addEventListener('resize',()=>{ drawWave(S.mode==='measuring'); });
function addHistory(bp,spo2,hr){
  const time=new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  S.history.unshift({bp,spo2,hr,time});
  if(S.history.length>10)S.history=S.history.slice(0,10);
  renderHistory();saveHistory();
}
function renderHistory(){
  if(!S.history.length){G('hempty').style.display='block';G('hlist').innerHTML='';return;}
  G('hempty').style.display='none';
  G('hlist').innerHTML=S.history.map((h,i)=>`
    <div class="hitem">
      <span class="hnum">#${i+1}</span>
      <span class="hbp">🩸${h.bp.sys}/${h.bp.dia}</span>
      <span class="hspo2">💧${h.spo2.val}%</span>
      <span class="hhr">❤️${h.hr}</span>
      <span class="htime">${h.time}</span>
    </div>`).join('');
}
G('clearbtn').onclick=()=>{S.history=[];renderHistory();try{localStorage.removeItem('hs');}catch(e){}toast(t('hist_cleared'));};
function saveHistory(){try{localStorage.setItem('hs',JSON.stringify(S.history));}catch(e){}}
try{const d=localStorage.getItem('hs');if(d){S.history=JSON.parse(d);renderHistory();}}catch(e){}

// ══════════ PDF EXPORT ══════════
async function exportPDF(){
  if(!S.lastBP){toast(t('pdf_no_data'));return;}
  toast(t('pdf_gen'));
  await new Promise(r=>setTimeout(r,300));
  try{
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const PW=210, PH=297, now=new Date();
    const ML=12;   // margin left
    const CW=PW-ML*2; // content width = 186mm

    // ── Background
    doc.setFillColor(2,8,16); doc.rect(0,0,PW,PH,'F');

    // ── Header
    doc.setFillColor(5,15,30); doc.rect(0,0,PW,24,'F');
    doc.setDrawColor(0,229,255); doc.setLineWidth(0.5); doc.line(0,24,PW,24);
    doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(0,229,255);
    doc.text('HEALTHSCAN PRO', ML, 13);
    doc.setFontSize(7); doc.setTextColor(58,106,132); doc.setFont('helvetica','normal');
    doc.text('BIOMETRIC MEDICAL REPORT', ML, 20);
    doc.setFontSize(7); doc.setTextColor(122,184,212);
    doc.text(now.toLocaleString(), PW-ML, 13, {align:'right'});
    doc.text('Auto-generated', PW-ML, 20, {align:'right'});

    let y = 30;
    const ROW = 6.0;  // row height
    const COL1_LBL = ML+2;       // label col1 x
    const COL1_VAL = ML+42;      // value col1 x  (42mm from left)
    const COL2_LBL = ML+2+CW/2;  // label col2 x  (mid point)
    const COL2_VAL = ML+42+CW/2; // value col2 x

    // Section header
    const sec=(title,r,g,b)=>{
      doc.setFillColor(5,15,30);
      doc.roundedRect(ML,y,CW,7,1.5,1.5,'F');
      doc.setDrawColor(r,g,b); doc.setLineWidth(0.35);
      doc.roundedRect(ML,y,CW,7,1.5,1.5,'S');
      doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(r,g,b);
      doc.text(title, ML+3, y+4.8);
      y += 10;
    };

    // Single full-width row
    const row=(lbl,val,unit,vr,vg,vb)=>{
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(58,106,132);
      doc.text(lbl, COL1_LBL, y);
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(vr,vg,vb);
      doc.text(String(val), COL1_VAL, y);
      if(unit){ doc.setFontSize(6.5); doc.setTextColor(122,184,212); doc.text(unit, COL1_VAL+20, y); }
      y += ROW;
    };

    // Two-column row — properly spaced so no overlap
    const row2=(lbl1,val1,lbl2,val2,r1,g1,b1,r2,g2,b2)=>{
      // Left half
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(58,106,132);
      doc.text(lbl1, COL1_LBL, y);
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(r1,g1,b1);
      doc.text(String(val1), COL1_VAL, y);
      // Right half
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(58,106,132);
      doc.text(lbl2, COL2_LBL, y);
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(r2,g2,b2);
      doc.text(String(val2), COL2_VAL, y);
      y += ROW;
    };

    const gap=(n=2)=>{ y+=n; };

    // ══ 1. VITAL SIGNS
    sec('VITAL SIGNS', 0,229,255);
    row2('Systolic BP', S.lastBP.sys+' mmHg', 'Diastolic BP', S.lastBP.dia+' mmHg', 255,80,100, 255,140,0);
    row2('BP Status', S.lastBP.label, 'Blood Oxygen', S.lastSpO2.val+'%', 255,200,100, 0,229,255);
    row('SpO2 Status', S.lastSpO2.label, '', 0,200,180);
    gap();

    // ══ 2. ADDITIONAL METRICS
    sec('ADDITIONAL METRICS', 0,255,136);
    row2('Heart Rate', S.lastHR+' BPM', 'Body Temp', S.lastTemp+' °C', 255,100,150, 255,200,80);
    row('Respiratory Rate', S.lastRsp+' /min', '', 0,229,255);
    gap();

    // ══ 3. BMI
    const bh=G('bmiHeight').value, bw=G('bmiWeight').value;
    if(bh && bw){
      const bmi=(bw/((bh/100)**2)).toFixed(1);
      const bf=bmiGender==='female';
      const cat=bmi<18.5?'Underweight':bmi<(bf?24:25)?'Normal Weight':bmi<(bf?29:30)?'Overweight':'Obese';
      sec('BMI DATA', 255,140,0);
      row2('Gender', bmiGender==='female'?'Female':'Male', 'BMI Score', bmi, 224,244,255, 255,140,0);
      row2('Height', bh+' cm', 'Weight', bw+' kg', 224,244,255, 224,244,255);
      row('BMI Category', cat, '', 255,180,50);
      gap();
    }

    // ══ 4. STRESS
    const sf1el=G('sf1');
    if(sf1el){
      const sl=+sf1el.value, wk=+G('sf2').value, ex=+G('sf3').value, md=+G('sf4').value;
      const raw=(10-sl)*2.0+wk*2.2-ex*1.8-md*1.4+20;
      const stress=Math.max(0,Math.min(100,Math.round(raw)));
      const lvl=stress<30?'Low':stress<60?'Moderate':'High';
      const sc=stress<30?[0,255,136]:stress<60?[255,140,0]:[255,51,102];
      sec('STRESS ANALYSIS', sc[0],sc[1],sc[2]);
      row2('Sleep Hours', sl+'h', 'Workload', wk+'/10', 122,184,212, 255,140,0);
      row2('Exercise', ex+'/10', 'Mood', md+'/10', 0,200,136, 139,92,246);
      row2('Stress Score', stress+'/100', 'Level', lvl, sc[0],sc[1],sc[2], sc[0],sc[1],sc[2]);
      gap();
    }

    // ══ 5. SLEEP
    const sleepHrsEl=G('sleepHours'), sleepScoreEl=G('sleepScore');
    if(sleepHrsEl && sleepHrsEl.value && sleepScoreEl && sleepScoreEl.textContent!=='--'){
      const hrs=parseFloat(sleepHrsEl.value);
      const score=sleepScoreEl.textContent;
      const grade=G('sleepGrade')?G('sleepGrade').textContent:'--';
      const debt=G('statDebt')?G('statDebt').textContent:'--';
      const eff=G('statEff')?G('statEff').textContent:'--';
      const qn=['','Terrible','Poor','OK','Good','Great'];
      const sc2=score>=80?[0,255,136]:score>=55?[0,229,255]:[255,140,0];
      sec('SLEEP ANALYSIS', sc2[0],sc2[1],sc2[2]);
      row2('Hours Slept', hrs+'h', 'Quality', qn[sleepQ]||sleepQ, 0,229,255, 139,92,246);
      row2('Sleep Score', score+'/100', 'Grade', grade, sc2[0],sc2[1],sc2[2], sc2[0],sc2[1],sc2[2]);
      row2('Sleep Debt', debt, 'Efficiency', eff, 255,140,0, 0,200,136);
      gap();
    }

    // ══ 6. WATER
    if(W.total>0){
      const wpct=Math.round(W.total/W.goal*100);
      const wrem=Math.max(0,W.goal-W.total);
      const wsc=wpct>=100?[0,255,136]:wpct>=50?[0,229,255]:[255,140,0];
      sec('WATER INTAKE', wsc[0],wsc[1],wsc[2]);
      row2('Total Intake', W.total+' ml', 'Daily Goal', W.goal+' ml', 0,229,255, 0,229,255);
      row2('Remaining', wrem+' ml', 'Progress', wpct+'%', 255,140,0, wsc[0],wsc[1],wsc[2]);
      row('Glasses Consumed', Math.round(W.total/250)+' glasses', '', 0,200,180);
      gap();
    }

    // ══ 7. CALORIES
    if(CAL.total>0 || CAL.burned>0){
      const cpct=Math.round(CAL.total/CAL.goal*100);
      const cnet=CAL.total-CAL.burned;
      const csc=cpct>110?[255,51,102]:cpct>=80?[255,140,0]:[0,229,255];
      sec('CALORIE TRACKING', csc[0],csc[1],csc[2]);
      row2('Calories Consumed', CAL.total+' kcal', 'Calories Burned', CAL.burned+' kcal', 255,140,0, 0,200,136);
      row2('Daily Goal', CAL.goal+' kcal', 'Net Calories', cnet+' kcal', 0,229,255, csc[0],csc[1],csc[2]);
      row('Progress', cpct+'% of daily goal', '', csc[0],csc[1],csc[2]);
      gap();
    }

    // ══ 8. HEALTH SCORE
    const hsBig=G('hsBigScore');
    if(hsBig && hsBig.textContent!=='--'){
      const overall=parseInt(hsBig.textContent)||0;
      const grade=G('hsGrade')?G('hsGrade').textContent:'--';
      const sc3=overall>=85?[0,255,136]:overall>=70?[0,229,255]:overall>=55?[255,140,0]:[255,51,102];
      sec('OVERALL HEALTH SCORE', sc3[0],sc3[1],sc3[2]);
      row2('Health Score', overall+'/100', 'Grade', grade, sc3[0],sc3[1],sc3[2], 200,200,200);
      const bars=[
        ['BP Score',G('hsBPScore')],['SpO2',G('hsSpO2Score')],
        ['BMI',G('hsBMIScore')],['Stress',G('hsStressScore')],
        ['Sleep',G('hsSleepScore')],['Water',G('hsWaterScore')]
      ];
      const avail=bars.filter(([,el])=>el&&el.textContent!=='--');
      for(let i=0;i<avail.length;i+=2){
        const a=avail[i], b=avail[i+1];
        if(b) row2(a[0], a[1].textContent, b[0], b[1].textContent, sc3[0],sc3[1],sc3[2], sc3[0],sc3[1],sc3[2]);
        else  row(a[0], a[1].textContent, '', sc3[0],sc3[1],sc3[2]);
      }
      gap();
    }

    // ── Footer
    doc.setFillColor(5,15,30); doc.rect(0,PH-14,PW,14,'F');
    doc.setDrawColor(0,229,255); doc.setLineWidth(0.25); doc.line(0,PH-14,PW,PH-14);
    doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(0,229,255);
    doc.text('HealthScan Pro v3.0', ML, PH-9);
    doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(0,200,180);
    doc.text('Developed by Muhammad Ali Hassan', PW/2, PH-9, {align:'center'});
    doc.setFont('helvetica','normal'); doc.setFontSize(5.5); doc.setTextColor(58,106,132);
    doc.text('For informational use only. Consult a licensed physician.', ML, PH-4);
    doc.setTextColor(122,184,212); doc.text(now.toLocaleDateString(), PW-ML, PH-4, {align:'right'});

    doc.save('HealthScan-'+now.toLocaleDateString('en-GB').replace(/\//g,'-')+'.pdf');
    toast(t('pdf_done'));
  }catch(e){ toast('PDF error: '+e.message); console.error(e); }
}

// ══════════════════════════════════════════
//  PRINT REPORT
// ══════════════════════════════════════════
function printReport(){
  if(!S.lastBP){ toast(t('pdf_no_data')); return; }

  const bp=S.lastBP,spo2=S.lastSpO2,hr=S.lastHR,tmp=S.lastTemp,rsp=S.lastRsp;
  const bh=G('bmiHeight').value,bw=G('bmiWeight').value;
  const bmi=(bh&&bw)?(bw/((bh/100)**2)).toFixed(1):null;
  const bf=bmiGender==='female';
  const bmiCat=bmi?(bmi<18.5?'Underweight':bmi<(bf?24:25)?'Normal Weight':bmi<(bf?29:30)?'Overweight':'Obese'):'';
  const now=new Date();

  // Stress
  const sl=+G('sf1').value,wk=+G('sf2').value,ex=+G('sf3').value,md=+G('sf4').value;
  const raw=(10-sl)*2.0+wk*2.2-ex*1.8-md*1.4+20;
  const stress=Math.max(0,Math.min(100,Math.round(raw)));
  const stressLvl=stress<30?'Low':stress<60?'Moderate':'High';
  const stressCol=stress<30?'green':stress<60?'orange':'red';

  // Sleep
  const sleepHrs=G('sleepHours').value||'--';
  const sleepScore=G('sleepScore')?G('sleepScore').textContent:'--';
  const sleepGrade=G('sleepGrade')?G('sleepGrade').textContent:'--';
  const sleepDebt=G('statDebt')?G('statDebt').textContent:'--';
  const sleepEff=G('statEff')?G('statEff').textContent:'--';
  const qNames=['','Terrible','Poor','OK','Good','Great'];
  const sleepQuality=qNames[sleepQ]||sleepQ;

  // Water
  const wPct=Math.round(W.total/W.goal*100);
  const wRem=Math.max(0,W.goal-W.total);
  const wGlasses=Math.round(W.total/250);

  // Calories
  const cNet=CAL.total-CAL.burned;
  const cPct=Math.round(CAL.total/CAL.goal*100);

  // Health Score
  const hsScore=G('hsBigScore')?G('hsBigScore').textContent:'--';
  const hsGrade=G('hsGrade')?G('hsGrade').textContent:'--';

  const twoRow=(l1,v1,l2,v2,c1,c2)=>`
    <tr>
      <td style="color:#666;width:25%">${l1}</td><td style="font-weight:bold;color:${c1||'#111'};width:25%">${v1}</td>
      <td style="color:#666;width:25%">${l2}</td><td style="font-weight:bold;color:${c2||c1||'#111'};width:25%">${v2}</td>
    </tr>`;
  const oneRow=(l,v,c)=>`<tr><td style="color:#666;width:25%">${l}</td><td colspan="3" style="font-weight:bold;color:${c||'#111'}">${v}</td></tr>`;
  const secHdr=(title,col)=>`<tr><td colspan="4" style="background:${col}15;border-left:4px solid ${col};padding:6px 10px;font-weight:bold;color:${col};font-size:11px;letter-spacing:1px">${title}</td></tr>`;

  const printWin=window.open('','_blank','width=850,height=1050');
  printWin.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><title>HealthScan Report</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;background:#fff;color:#111;padding:20px;font-size:11px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #00aacc;padding-bottom:10px;margin-bottom:14px}
  h1{font-size:20px;color:#0077aa;letter-spacing:2px}
  .subtitle{font-size:8px;color:#888;letter-spacing:3px;margin-top:3px}
  .hright{text-align:right;font-size:10px;color:#555}
  table{width:100%;border-collapse:collapse;margin-bottom:12px}
  td{padding:5px 8px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
  .footer{margin-top:16px;padding-top:8px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:8px;color:#999}
  .dev-name{color:#0077aa;font-weight:bold}
  .print-btn-wrap{text-align:right;margin-bottom:12px}
  @media print{.no-print{display:none!important}}
</style></head><body>

<div class="print-btn-wrap no-print">
  <button onclick="window.print()" style="padding:8px 20px;background:#0077aa;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold">🖨️ PRINT NOW</button>
</div>

<div class="header">
  <div><h1>HEALTHSCAN PRO</h1><div class="subtitle">BIOMETRIC MEDICAL REPORT</div></div>
  <div class="hright"><div>${now.toLocaleString()}</div><div style="margin-top:4px;font-size:9px;color:#0077aa;font-weight:bold">Developed by Muhammad Ali Hassan</div></div>
</div>

<table>
  ${secHdr('🩸 VITAL SIGNS','#0099cc')}
  ${twoRow('Systolic BP',bp.sys+' mmHg','Diastolic BP',bp.dia+' mmHg','#cc0033','#cc6600')}
  ${twoRow('BP Status',bp.label,'Blood Oxygen',spo2.val+'%','#886600','#0055cc')}
  ${oneRow('SpO2 Status',spo2.label,'#008866')}

  ${secHdr('💚 ADDITIONAL METRICS','#009944')}
  ${twoRow('Heart Rate',hr+' BPM','Body Temperature',tmp+' °C','#cc0055','#cc8800')}
  ${oneRow('Respiratory Rate',rsp+' /min','#0055cc')}

  ${bmi?`${secHdr('⚖️ BMI DATA','#cc7700')}
  ${twoRow('Gender',bmiGender==='female'?'Female':'Male','BMI Score',bmi,'#333','#cc7700')}
  ${twoRow('Height',bh+' cm','Weight',bw+' kg','#333','#333')}
  ${oneRow('BMI Category',bmiCat,'#cc7700')}`:''}

  ${secHdr('🧠 STRESS ANALYSIS','#'+( stress<30?'009944':stress<60?'cc7700':'cc0033'))}
  ${twoRow('Sleep Hrs',sl+'h','Workload',wk+'/10','#0066aa','#cc7700')}
  ${twoRow('Exercise',ex+'/10','Mood',md+'/10','#009944','#7700cc')}
  ${twoRow('Stress Score',stress+'/100','Level',stressLvl,stressCol,stressCol)}

  ${sleepHrs!=='--'?`${secHdr('😴 SLEEP ANALYSIS','#7700cc')}
  ${twoRow('Hours Slept',sleepHrs+'h','Quality',sleepQuality,'#0066aa','#7700cc')}
  ${twoRow('Sleep Score',sleepScore+'/100','Grade',sleepGrade,'#7700cc','#333')}
  ${twoRow('Sleep Debt',sleepDebt,'Efficiency',sleepEff,'#cc7700','#009944')}`:''}

  ${W.total>0?`${secHdr('💧 WATER INTAKE','#0099cc')}
  ${twoRow('Total Intake',W.total+' ml','Daily Goal',W.goal+' ml','#0066aa','#0066aa')}
  ${twoRow('Remaining',wRem+' ml','Progress',wPct+'%','#cc7700','#009944')}
  ${oneRow('Glasses',wGlasses+' glasses','#0066aa')}`:''}

  ${CAL.total>0||CAL.burned>0?`${secHdr('🔥 CALORIE TRACKING','#cc6600')}
  ${twoRow('Calories Consumed',CAL.total+' kcal','Calories Burned',CAL.burned+' kcal','#cc6600','#009944')}
  ${twoRow('Net Calories',cNet+' kcal','Progress',cPct+'% of goal',cNet>CAL.goal?'#cc0033':'#009944','#0066aa')}`:''}

  ${hsScore!=='--'?`${secHdr('⭐ OVERALL HEALTH SCORE','#0077aa')}
  ${twoRow('Health Score',hsScore+'/100','Grade',hsGrade,'#0077aa','#333')}`:''}
</table>

<div class="footer">
  <div>HealthScan Pro v3.0 — For informational use only. Consult a licensed physician.</div>
  <div class="dev-name">Developed by Muhammad Ali Hassan</div>
  <div>${now.toLocaleDateString()}</div>
</div>
</body></html>`);
  printWin.document.close();
  printWin.focus();
  setTimeout(()=>printWin.print(),800);
}


// ══════════ BMI ══════════
let bmiGender = 'male';
function setGender(g){
  bmiGender = g;
  const mBtn = document.getElementById('genderMale');
  const fBtn = document.getElementById('genderFemale');
  mBtn.classList.toggle('active', g==='male');
  fBtn.classList.toggle('active', g==='female');
}
function calcBMI(){
  const h=parseFloat(G('bmiHeight').value),w=parseFloat(G('bmiWeight').value),age=parseInt(G('bmiAge').value)||25;
  if(!h||!w){toast(t('bmi_fill'));return;}
  const bmi=+(w/((h/100)**2)).toFixed(1);
  // Gender-adjusted ideal BMI ranges (women slightly lower threshold)
  const isFemale = bmiGender==='female';
  const underCut = 18.5;
  const normalCut = isFemale ? 24.0 : 25.0;
  const overCut   = isFemale ? 29.0 : 30.0;
  const genderLabel = isFemale ? (LANG==='ur'?'خاتون':'Female') : (LANG==='ur'?'مرد':'Male');

  G('bmiNum').textContent=bmi;
  G('bmiResult').style.display='block';
  let cat,c1,c2,c3,pct,tips=[];

  if(bmi<underCut){
    cat=LANG==='ur'?'کم وزن':'Underweight';
    c1='#00e5ff';c2='rgba(0,229,255,.15)';c3='rgba(0,229,255,.35)';pct=bmi/underCut*18;
    tips=isFemale
      ?(LANG==='ur'?['🍎 پروٹین اور صحت مند چکنائی بڑھائیں','🥛 دودھ اور دہی زیادہ پئیں','💪 ہلکی ورزش کریں','👩‍⚕️ ڈاکٹر سے مشورہ کریں']:
        ['🍎 Increase protein & healthy fats','🥛 Drink more milk and yogurt','💪 Light strength training','👩‍⚕️ See a doctor'])
      :(LANG==='ur'?['🍎 زیادہ کیلوری والی غذا کھائیں','💪 ہلکی ورزش شروع کریں','🥛 پروٹین بڑھائیں','👨‍⚕️ ڈاکٹر سے مشورہ کریں']:
        ['🍎 Eat more calorie-dense foods','💪 Start light strength training','🥛 Increase protein intake','👨‍⚕️ Consult your doctor']);
  } else if(bmi<normalCut){
    cat=LANG==='ur'?'نارمل وزن':'Normal Weight';
    c1='#00ff88';c2='rgba(0,255,136,.15)';c3='rgba(0,255,136,.35)';pct=18+(bmi-underCut)/(normalCut-underCut)*30;
    tips=isFemale
      ?(LANG==='ur'?['✅ وزن بالکل ٹھیک ہے','🏃‍♀️ باقاعدہ ورزش جاری رکھیں','🥗 متوازن غذا کھائیں','😴 اچھی نیند لیں']:
        ['✅ Weight is in healthy range','🏃‍♀️ Keep up regular exercise','🥗 Maintain balanced diet','😴 Get adequate sleep'])
      :(LANG==='ur'?['✅ وزن بالکل ٹھیک ہے','🏃 باقاعدہ ورزش جاری رکھیں','🥗 متوازن غذا کھائیں','😴 اچھی نیند لیں']:
        ['✅ Weight is in healthy range','🏃 Keep up regular exercise','🥗 Maintain balanced diet','😴 Get adequate sleep']);
  } else if(bmi<overCut){
    cat=LANG==='ur'?'زیادہ وزن':'Overweight';
    c1='#ff8c00';c2='rgba(255,140,0,.15)';c3='rgba(255,140,0,.35)';pct=48+(bmi-normalCut)/(overCut-normalCut)*22;
    tips=isFemale
      ?(LANG==='ur'?['🚶‍♀️ روزانہ 30 منٹ چلیں','🥤 میٹھا اور کولڈ ڈرنک بند کریں','🍽️ رات کا کھانا کم کریں','🏊‍♀️ تیراکی یا یوگا کریں']:
        ['🚶‍♀️ Walk 30 min daily','🥤 Cut sugary drinks','🍽️ Reduce dinner portions','🏊‍♀️ Try swimming or yoga'])
      :(LANG==='ur'?['🚶 روزانہ 30 منٹ چلیں','🥤 میٹھا کم کریں','🍽️ کم کھائیں','🏋️ ورزش شروع کریں']:
        ['🚶 Walk 30 min daily','🥤 Cut sugary drinks','🍽️ Reduce portion sizes','🏋️ Add strength training']);
  } else {
    cat=LANG==='ur'?'موٹاپا':'Obese';
    c1='#ff3366';c2='rgba(255,51,102,.15)';c3='rgba(255,51,102,.35)';pct=Math.min(96,70+(bmi-overCut)/10*26);
    tips=isFemale
      ?(LANG==='ur'?['👩‍⚕️ فوری ڈاکٹر سے ملیں','🚰 دن میں 8-10 گلاس پانی پئیں','🏊‍♀️ کم اثر ورزش کریں','🍎 تلا اور میٹھا بند کریں']:
        ['👩‍⚕️ See a doctor urgently','🚰 Drink 8-10 glasses water daily','🏊‍♀️ Low-impact exercise','🍎 Avoid fried and sweet foods'])
      :(LANG==='ur'?['👨‍⚕️ فوری ڈاکٹر سے ملیں','🚰 زیادہ پانی پئیں','🏊 کم اثر ورزش کریں','🍎 تلا اور میٹھا بند کریں']:
        ['👨‍⚕️ See a doctor urgently','🚰 Drink more water','🏊 Low-impact exercise','🍎 Avoid fried and sweet foods']);
  }

  G('bmiCat').textContent=cat+' ('+genderLabel+')';
  G('bmiCat').style.cssText=`background:${c2};color:${c1};border:1px solid ${c3};font-size:10px;padding:6px 12px;border-radius:20px;font-family:'Orbitron',monospace;letter-spacing:1px`;
  G('bmiBar').style.cssText=`width:${pct}%;background:${c1}`;
  G('bmiTips').style.display='block';
  G('bmiTipsList').innerHTML=tips.map(tip=>`<div class="tip-item"><span class="tip-ico">${tip[0]}</span><span class="tip-txt">${tip.slice(2)}</span></div>`).join('');
}

// ══════════ STRESS ══════════
function calcStress(){
  const sleep=+G('sf1').value,work=+G('sf2').value,ex=+G('sf3').value,mood=+G('sf4').value;
  G('sv1').textContent=sleep+'h';G('sv2').textContent=work+'/10';G('sv3').textContent=ex+'/10';G('sv4').textContent=mood+'/10';
  const raw=(10-sleep)*2.0 + work*2.2 - ex*1.8 - mood*1.4 + 20;
  const stress=Math.max(0,Math.min(100,Math.round(raw)));
  G('stressNum').textContent=stress;
  G('stressArc').style.strokeDashoffset=408-(408*stress/100);
  let label,advices=[];
  if(stress<30){
    label=LANG==='ur'?'کم تناؤ 😌':'Low Stress 😌';
    advices=LANG==='ur'?[['🌟','آپ کی ذہنی صحت بہترین ہے'],['🎵','موسیقی سنتے رہیں'],['💪','ورزش جاری رکھیں']]:
    [['🌟','Your mental health is excellent'],['🎵','Keep enjoying activities you love'],['💪','Maintain your exercise routine']];}
  else if(stress<60){
    label=LANG==='ur'?'درمیانی تناؤ 😐':'Moderate Stress 😐';
    advices=LANG==='ur'?[['🧘','دن میں 10 منٹ گہری سانس لیں'],['🚶','باہر سیر کریں'],['😴','7-8 گھنٹے نیند لیں'],['📵','سوشل میڈیا کم کریں']]:
    [['🧘','Practice 10 min deep breathing'],['🚶','Take daily outdoor walks'],['😴','Aim for 7-8 hours sleep'],['📵','Reduce screen time']];}
  else{
    label=LANG==='ur'?'زیادہ تناؤ 😰':'High Stress 😰';
    advices=LANG==='ur'?[['👨‍⚕️','ڈاکٹر یا ماہر سے بات کریں'],['🛑','کام کی حدود طے کریں'],['😴','نیند کو ترجیح دیں'],['🤝','قریبی سے بات کریں'],['🏊','روزانہ ورزش کریں']]:
    [['👨‍⚕️','Consider speaking to a therapist'],['🛑','Set clear work boundaries'],['😴','Prioritize sleep above all'],['🤝','Talk to someone you trust'],['🏊','Exercise daily']];}
  G('stressLabel').textContent=label;
  G('adviceList').innerHTML=advices.map(a=>`<div class="tip-item"><span class="tip-ico">${a[0]}</span><span class="tip-txt">${a[1]}</span></div>`).join('');
}
calcStress();

// ══════════ SLEEP ══════════
let sleepQ=3;
function setSQ(v,btn){
  sleepQ=v;
  document.querySelectorAll('.sq-btn').forEach((b,i)=>b.classList.toggle('active',i+1===v));
}
function analyzeSleep(){
  const hrs=parseFloat(G('sleepHours').value);
  if(!hrs){toast(t('sleep_fill'));return;}
  const eff=Math.round((Math.min(hrs,9)/9)*0.5*100+(sleepQ/5)*0.5*100);
  const debt=Math.max(0,7.5-hrs).toFixed(1);
  let score=Math.min(100,Math.round((hrs/8)*40+(sleepQ/5)*35+(eff/100)*25));
  let grade,tips=[];
  if(score>=80){grade=LANG==='ur'?'بہترین نیند 🌟':'Excellent Sleep 🌟';
    tips=LANG==='ur'?[['🌙','نیند کا معمول بہت اچھا ہے'],['⏰','ایک وقت پر سوئیں'],['😴','یہ معمول جاری رکھیں']]:
    [['🌙','Excellent sleep routine!'],['⏰','Keep consistent sleep times'],['😴','Maintain this healthy habit']];}
  else if(score>=55){grade=LANG==='ur'?'اچھی نیند 👍':'Good Sleep 👍';
    tips=LANG==='ur'?[['📱','سونے سے پہلے موبائل بند کریں'],['☕','شام کے بعد کافی نہ پئیں'],['🌡️','کمرہ ٹھنڈا رکھیں']]:
    [['📱','No screens 1hr before bed'],['☕','No caffeine after 3 PM'],['🌡️','Keep room cool 18-20°C']];}
  else{grade=LANG==='ur'?'نیند بہتر کریں 😔':'Needs Improvement 😔';
    tips=LANG==='ur'?[['⏰','ایک وقت پر سوئیں'],['🚫','سونے سے پہلے الکوحل نہ پئیں'],['🧘','سونے سے پہلے آرام کریں'],['🛏️','بستر صرف نیند کے لیے'],['👨‍⚕️','ڈاکٹر سے مشورہ کریں']]:
    [['⏰','Set fixed sleep/wake times'],['🚫','Avoid alcohol before bed'],['🧘','Wind down before sleep'],['🛏️','Use bed only for sleeping'],['👨‍⚕️','See a doctor if persistent']];}
  G('sleepScore').textContent=score;G('sleepGrade').textContent=grade;
  G('statDuration').textContent=hrs+'h';G('statDebt').textContent=debt+'h';
  G('statEff').textContent=eff+'%';G('statRec').textContent='7.5h';
  G('sleepResult').style.display='block';
  G('sleepTips').style.display='block';
  G('sleepTipsList').innerHTML=tips.map(a=>`<div class="tip-item"><span class="tip-ico">${a[0]}</span><span class="tip-txt">${a[1]}</span></div>`).join('');
}

// ══════════ PWA INSTALL ══════════
const iDot=G('iDot'),iTxt=G('iTxt');
function setInstallReady(){iDot.className='idot ready';iTxt.className='itxt ready';iTxt.textContent=t('install_ready');}
function setInstallDone(){
  iDot.className='idot installed';iTxt.className='itxt installed';iTxt.textContent=t('install_done');
  G('ibtn').classList.add('done');
  G('ibtn').querySelector('.ibmain').textContent=LANG==='ur'?'ایپ انسٹال ✓':'App Installed ✓';
  G('ibtn').querySelector('.ibsub').textContent=LANG==='ur'?'ہوم اسکرین سے کھولیں':'Open from Home Screen';
  G('ibtn').querySelector('.ibi').textContent='✅';
}
if(window.matchMedia('(display-mode:standalone)').matches)setInstallDone();
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();S.dprompt=e;setInstallReady();});
window.addEventListener('appinstalled',()=>{setInstallDone();toast(t('installed'));S.dprompt=null;});
G('ibtn').addEventListener('click',async()=>{
  if(S.dprompt){S.dprompt.prompt();const{outcome}=await S.dprompt.userChoice;if(outcome==='accepted')setInstallDone();S.dprompt=null;}
  else if(window.matchMedia('(display-mode:standalone)').matches){toast('✓ App already running!');}
  else toast(/iphone|ipad|ipod/i.test(navigator.userAgent)?t('install_ios'):t('install_chrome'));
});

// ══════════ SERVICE WORKER ══════════
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
// ══════════════════════════════════════════
//  WATER INTAKE TRACKER
// ══════════════════════════════════════════
const W = {
  goal: 2000,
  total: 0,
  log: [],
  icons: { 150:'🥤', 250:'☕', 330:'🧃', 500:'💧', 750:'🫙', 1000:'🍶' }
};

function initWater(){
  try{
    const saved = localStorage.getItem('water_' + new Date().toDateString());
    if(saved){ const d=JSON.parse(saved); W.total=d.total||0; W.log=d.log||[]; W.goal=d.goal||2000; }
    const sg = localStorage.getItem('water_goal');
    if(sg) W.goal = parseInt(sg);
  }catch(e){}
  const gi = document.getElementById('waterGoalInp');
  if(gi) gi.value = W.goal;
  updateWaterUI();
  renderWaterLog();
}

function saveWater(){
  try{
    localStorage.setItem('water_' + new Date().toDateString(), JSON.stringify({total:W.total, log:W.log, goal:W.goal}));
    localStorage.setItem('water_goal', W.goal);
  }catch(e){}
}

function setWaterGoal(){
  const v = parseInt(document.getElementById('waterGoalInp').value);
  if(!v || v < 100){ toast('⚠ Enter valid goal (min 100ml)'); return; }
  W.goal = v;
  saveWater();
  updateWaterUI();
  toast('✅ Daily goal set to ' + v + 'ml');
}

function addWater(ml){
  const time = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  W.total += ml;
  W.log.unshift({ ml, time, icon: W.icons[ml] || '💧' });
  if(W.log.length > 30) W.log = W.log.slice(0,30);
  saveWater();
  updateWaterUI();
  renderWaterLog();
  // Celebration toast
  const pct = Math.round(W.total/W.goal*100);
  if(pct >= 100) toast('🎉 Daily goal achieved! Great job!');
  else if(pct >= 75) toast('💪 ' + pct + '% done — almost there!');
  else toast('💧 +' + ml + 'ml added — ' + pct + '% of goal');
}

function addCustomWater(){
  const v = parseInt(document.getElementById('waterCustom').value);
  if(!v || v < 1){ toast('⚠ Enter a valid amount'); return; }
  document.getElementById('waterCustom').value = '';
  addWater(v);
}

function removeWaterEntry(idx){
  W.total = Math.max(0, W.total - W.log[idx].ml);
  W.log.splice(idx, 1);
  saveWater();
  updateWaterUI();
  renderWaterLog();
}

function resetWater(){
  W.total = 0; W.log = [];
  saveWater();
  updateWaterUI();
  renderWaterLog();
  toast('🔄 Water log reset for today');
}

function updateWaterUI(){
  const pct = Math.min(100, Math.round(W.total / W.goal * 100));
  const rem = Math.max(0, W.goal - W.total);
  const glasses = Math.round(W.total / 250);
  const goalGlasses = Math.round(W.goal / 250);

  // Circle arc
  const arc = document.getElementById('waterArc');
  if(arc) arc.style.strokeDashoffset = 314 - (314 * pct / 100);

  // Numbers
  const mlEl = document.getElementById('waterMl');
  if(mlEl){
    mlEl.textContent = W.total;
    mlEl.classList.toggle('complete', pct >= 100);
  }
  const pctEl = document.getElementById('waterPct');
  if(pctEl) pctEl.textContent = pct + '%';

  const goalDsp = document.getElementById('waterGoalDisplay');
  if(goalDsp) goalDsp.textContent = W.goal + ' ml';

  const remEl = document.getElementById('waterRemaining');
  if(remEl) remEl.textContent = rem + ' ml';

  const glEl = document.getElementById('waterGlasses');
  if(glEl) glEl.textContent = glasses + ' / ' + goalGlasses;

  // Status
  const stEl = document.getElementById('waterStatus');
  if(stEl){
    if(W.total === 0){ stEl.textContent = LANG==='ur'?'شروع نہیں':'Not started'; stEl.style.color='var(--t3)'; }
    else if(pct < 25){ stEl.textContent = LANG==='ur'?'بہت کم':'Very Low'; stEl.style.color='var(--red)'; }
    else if(pct < 50){ stEl.textContent = LANG==='ur'?'کم':'Low'; stEl.style.color='var(--orange)'; }
    else if(pct < 75){ stEl.textContent = LANG==='ur'?'ٹھیک ہے':'On Track'; stEl.style.color='var(--cyan)'; }
    else if(pct < 100){ stEl.textContent = LANG==='ur'?'اچھا جا رہے ہو':'Almost There!'; stEl.style.color='var(--green)'; }
    else { stEl.textContent = LANG==='ur'?'ہدف حاصل! 🎉':'Goal Reached! 🎉'; stEl.style.color='var(--green)'; }
  }
}

function renderWaterLog(){
  const empty = document.getElementById('waterLogEmpty');
  const list  = document.getElementById('waterLogList');
  if(!list) return;
  if(W.log.length === 0){
    if(empty) empty.style.display = 'block';
    list.innerHTML = '';
    return;
  }
  if(empty) empty.style.display = 'none';
  list.innerHTML = W.log.map((e,i) => `
    <div class="wlog-item">
      <span class="wlog-icon">${e.icon || '💧'}</span>
      <span class="wlog-amount">+${e.ml} ml</span>
      <span class="wlog-time">${e.time}</span>
      <button class="wlog-del" onclick="removeWaterEntry(${i})" title="Remove">✕</button>
    </div>`).join('');
}

// Init water on load
initWater();

// ══════════════════════════════════════════
//  STRESS ANALYZE (with result card)
// ══════════════════════════════════════════
function analyzeStress(){
  const sleep=+G('sf1').value,work=+G('sf2').value,ex=+G('sf3').value,mood=+G('sf4').value;
  G('sv1').textContent=sleep+'h';G('sv2').textContent=work+'/10';
  G('sv3').textContent=ex+'/10';G('sv4').textContent=mood+'/10';
  const raw=(10-sleep)*2.0+work*2.2-ex*1.8-mood*1.4+20;
  const stress=Math.max(0,Math.min(100,Math.round(raw)));
  G('stressNum').textContent=stress;
  G('stressArc').style.strokeDashoffset=408-(408*stress/100);

  let lvl,risk,col,advices=[];
  if(stress<30){
    lvl=LANG==='ur'?'کم':'Low';risk=LANG==='ur'?'محفوظ':'Safe';col='var(--green)';
    advices=LANG==='ur'?[['🌟','ذہنی صحت بہترین ہے'],['🎵','پسندیدہ کام کرتے رہیں'],['💪','ورزش جاری رکھیں']]:
    [['🌟','Mental health is excellent'],['🎵','Keep doing activities you love'],['💪','Maintain exercise routine']];
  } else if(stress<60){
    lvl=LANG==='ur'?'درمیانہ':'Moderate';risk=LANG==='ur'?'قابو میں':'Manageable';col='var(--orange)';
    advices=LANG==='ur'?[['🧘','روزانہ 10 منٹ گہری سانس لیں'],['🚶','باہر سیر کریں'],['😴','7-8 گھنٹے نیند لیں'],['📵','سوشل میڈیا کم کریں']]:
    [['🧘','Practice 10 min deep breathing'],['🚶','Take daily outdoor walks'],['😴','Aim for 7-8 hours sleep'],['📵','Reduce screen time']];
  } else {
    lvl=LANG==='ur'?'زیادہ':'High';risk=LANG==='ur'?'خطرناک':'High Risk';col='var(--red)';
    advices=LANG==='ur'?[['👨‍⚕️','ڈاکٹر سے بات کریں'],['🛑','کام کی حدود طے کریں'],['😴','نیند کو ترجیح دیں'],['🤝','قریبی سے بات کریں']]:
    [['👨‍⚕️','Consider speaking to a therapist'],['🛑','Set clear work boundaries'],['😴','Prioritize sleep above all'],['🤝','Talk to someone you trust']];
  }

  G('stressLabel').textContent = (stress<30?'😌 ':stress<60?'😐 ':'😰 ') + lvl + ' Stress';

  // Show result card
  const card = G('stressResultCard');
  if(card){
    card.style.display='block';
    G('srScore').textContent=stress+'/100'; G('srScore').style.color=col;
    G('srLevel').textContent=lvl; G('srLevel').style.color=col;
    G('srRisk').textContent=risk; G('srRisk').style.color=col;
  }
  const adv = G('stressAdvice');
  if(adv){ adv.style.display='block'; }
  G('adviceList').innerHTML=advices.map(a=>`<div class="tip-item"><span class="tip-ico">${a[0]}</span><span class="tip-txt">${a[1]}</span></div>`).join('');
  toast('🧠 Stress analysis complete');
}

// ══════════════════════════════════════════
//  CALORIE TRACKER
// ══════════════════════════════════════════
const CAL = { goal:2000, total:0, burned:0, log:[] };

function initCal(){
  try{
    const saved=localStorage.getItem('cal_'+new Date().toDateString());
    if(saved){ const d=JSON.parse(saved);CAL.total=d.total||0;CAL.burned=d.burned||0;CAL.log=d.log||[]; }
    const sg=localStorage.getItem('cal_goal');
    if(sg) CAL.goal=parseInt(sg);
  }catch(e){}
  const gi=G('calGoalInp'); if(gi) gi.value=CAL.goal;
  updateCalUI(); renderCalLog();
}
function saveCal(){
  try{
    localStorage.setItem('cal_'+new Date().toDateString(),JSON.stringify({total:CAL.total,burned:CAL.burned,log:CAL.log}));
    localStorage.setItem('cal_goal',CAL.goal);
  }catch(e){}
}
function setCalGoal(){
  const v=parseInt(G('calGoalInp').value);
  if(!v||v<100){ toast('⚠ Enter valid goal'); return; }
  CAL.goal=v; saveCal(); updateCalUI();
  toast('✅ Calorie goal set to '+v);
}
function addCal(kcal,icon,name){
  const time=new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  CAL.total+=kcal; CAL.log.unshift({kcal,icon,name,time,type:'food'});
  if(CAL.log.length>30) CAL.log=CAL.log.slice(0,30);
  saveCal(); updateCalUI(); renderCalLog();
  const pct=Math.round(CAL.total/CAL.goal*100);
  if(pct>=100) toast('⚠ Daily calorie goal reached!');
  else toast(icon+' +'+kcal+' kcal — '+pct+'% of goal');
}
function burnCal(kcal,icon,name){
  const time=new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  CAL.burned+=kcal; CAL.log.unshift({kcal,icon,name,time,type:'exercise'});
  if(CAL.log.length>30) CAL.log=CAL.log.slice(0,30);
  saveCal(); updateCalUI(); renderCalLog();
  toast(icon+' -'+kcal+' kcal burned! 💪');
}
function addCustomCal(){
  const name=G('calFoodName').value||'Custom';
  const v=parseInt(G('calCustom').value);
  if(!v||v<1){ toast('⚠ Enter calories'); return; }
  G('calFoodName').value=''; G('calCustom').value='';
  addCal(v,'🍽️',name);
}
function removeCalEntry(i){
  const e=CAL.log[i];
  if(e.type==='food') CAL.total=Math.max(0,CAL.total-e.kcal);
  else CAL.burned=Math.max(0,CAL.burned-e.kcal);
  CAL.log.splice(i,1); saveCal(); updateCalUI(); renderCalLog();
}
function resetCal(){
  CAL.total=0;CAL.burned=0;CAL.log=[];
  saveCal(); updateCalUI(); renderCalLog();
  toast('🔄 Calorie log reset');
}
function updateCalUI(){
  const net=CAL.total-CAL.burned;
  const pct=Math.min(100,Math.round(CAL.total/CAL.goal*100));
  const rem=Math.max(0,CAL.goal-net);
  const arc=G('calArc');
  if(arc) arc.style.strokeDashoffset=314-(314*pct/100);
  const cn=G('calTotal'); if(cn) cn.textContent=CAL.total;
  const cp=G('calPct'); if(cp) cp.textContent=pct+'%';
  const cgd=G('calGoalDisplay'); if(cgd) cgd.textContent=CAL.goal;
  const cr=G('calRemaining'); if(cr) cr.textContent=rem;
  const cb=G('calBurned'); if(cb) cb.textContent=CAL.burned;
  const cnet=G('calNet'); if(cnet){ cnet.textContent=net; cnet.style.color=net>CAL.goal?'var(--red)':'var(--green)'; }
}
function renderCalLog(){
  const empty=G('calLogEmpty'),list=G('calLogList');
  if(!list) return;
  if(!CAL.log.length){ if(empty) empty.style.display='block'; list.innerHTML=''; return; }
  if(empty) empty.style.display='none';
  list.innerHTML=CAL.log.map((e,i)=>`
    <div class="wlog-item">
      <span class="wlog-icon">${e.icon}</span>
      <span class="wlog-amount" style="color:${e.type==='exercise'?'var(--green)':'var(--orange)'}">${e.type==='food'?'+':'−'}${e.kcal} kcal</span>
      <span class="wlog-time">${e.name} · ${e.time}</span>
      <button class="wlog-del" onclick="removeCalEntry(${i})">✕</button>
    </div>`).join('');
}
initCal();

// ══════════════════════════════════════════
//  HEALTH SCORE CALCULATOR
// ══════════════════════════════════════════
function calcHealthScore(){
  let scores={}, total=0, count=0, insights=[];

  // BP Score (0-100)
  if(S.lastBP){
    const s=S.lastBP.sys,d=S.lastBP.dia;
    let bpS=100;
    if(s>=180||d>=120) bpS=10;
    else if(s>=160||d>=100) bpS=30;
    else if(s>=140||d>=90) bpS=50;
    else if(s>=130||d>=80) bpS=70;
    else if(s>=120) bpS=85;
    scores.bp=bpS;
    if(bpS<70) insights.push(['🩸',bpS<50?'Blood pressure needs immediate attention':'Blood pressure is slightly elevated — monitor closely']);
    else insights.push(['🩸','Blood pressure is in good range']);
  }

  // SpO2 Score
  if(S.lastSpO2){
    const v=S.lastSpO2.val;
    let s2=v>=97?100:v>=95?80:v>=92?50:20;
    scores.spo2=s2;
    if(s2<70) insights.push(['💧','Blood oxygen is low — consult a doctor']);
    else insights.push(['💧','Blood oxygen saturation is good']);
  }

  // BMI Score
  const bh=G('bmiHeight').value,bw=G('bmiWeight').value;
  if(bh&&bw){
    const bmi=bw/((bh/100)**2);
    const bf=bmiGender==='female';
    let bs=bmi<18.5?60:bmi<(bf?24:25)?100:bmi<(bf?29:30)?70:40;
    scores.bmi=bs;
    if(bs<70) insights.push(['⚖️','BMI indicates weight management needed']);
    else insights.push(['⚖️','BMI is in healthy range']);
  }

  // Stress Score (inverted — lower stress = higher score)
  const sf1=G('sf1');
  if(sf1){
    const sleep=+sf1.value,work=+G('sf2').value,ex=+G('sf3').value,mood=+G('sf4').value;
    const raw=(10-sleep)*2.0+work*2.2-ex*1.8-mood*1.4+20;
    const stress=Math.max(0,Math.min(100,Math.round(raw)));
    const ss=Math.round(100-stress);
    scores.stress=ss;
    if(ss<50) insights.push(['🧠','High stress detected — practice relaxation techniques']);
    else insights.push(['🧠','Stress levels are manageable']);
  }

  // Sleep Score
  const sleepHrsEl=G('sleepHours');
  if(sleepHrsEl&&sleepHrsEl.value){
    const hrs=parseFloat(sleepHrsEl.value);
    const qNames=[0,20,40,60,80,100];
    const sq=qNames[sleepQ]||60;
    const hs=Math.round((Math.min(hrs,9)/9*50)+(sq*0.5));
    scores.sleep=Math.min(100,hs);
    if(hs<60) insights.push(['😴','Sleep quality needs improvement']);
    else insights.push(['😴','Sleep pattern is healthy']);
  }

  // Water Score
  const waterPct=Math.round(W.total/W.goal*100);
  if(W.total>0){
    scores.water=Math.min(100,waterPct);
    if(waterPct<50) insights.push(['💧','Drink more water throughout the day']);
    else insights.push(['💧','Hydration level is good']);
  }

  // Calculate overall
  const vals=Object.values(scores);
  const overall=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0;

  // Animate score
  const scoreEl=G('hsBigScore');
  let cur=0;
  const anim=setInterval(()=>{ cur+=2; if(cur>=overall){ cur=overall; clearInterval(anim); } scoreEl.textContent=cur; },20);

  // Grade
  let grade,gcol;
  if(overall>=85){grade='Excellent 🌟';gcol='var(--green)';}
  else if(overall>=70){grade='Good 👍';gcol='var(--cyan)';}
  else if(overall>=55){grade='Average 😐';gcol='var(--orange)';}
  else{grade='Needs Attention ⚠';gcol='var(--red)';}
  G('hsGrade').textContent=grade; G('hsGrade').style.color=gcol;
  G('hsBigScore').style.color=gcol;

  // Bars
  const barMap=[
    ['hsBPBar','hsBPScore','bp'],['hsSpO2Bar','hsSpO2Score','spo2'],
    ['hsBMIBar','hsBMIScore','bmi'],['hsStressBar','hsStressScore','stress'],
    ['hsSleepBar','hsSleepScore','sleep'],['hsWaterBar','hsWaterScore','water']
  ];
  barMap.forEach(([bar,score,key])=>{
    const v=scores[key];
    const bEl=G(bar),sEl=G(score);
    if(v!==undefined){
      setTimeout(()=>{ if(bEl) bEl.style.width=v+'%'; },300);
      if(sEl) sEl.textContent=v;
    } else {
      if(sEl) sEl.textContent='--';
    }
  });

  // Advice
  const adv=G('hsAdvice'); if(adv) adv.style.display='block';
  G('hsAdviceList').innerHTML=insights.map(a=>`<div class="tip-item"><span class="tip-ico">${a[0]}</span><span class="tip-txt">${a[1]}</span></div>`).join('');
  toast('⭐ Health score: '+overall+'/100');
}

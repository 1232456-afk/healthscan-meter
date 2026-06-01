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
  const r=Math.random();
  if(r<.55)return{sys:ri(110,129),dia:ri(70,84),label:t('bp_normal')};
  if(r<.75)return{sys:ri(130,139),dia:ri(80,89),label:t('bp_elevated')};
  if(r<.88)return{sys:ri(140,159),dia:ri(90,99),label:t('bp_high')};
  if(r<.95)return{sys:ri(160,175),dia:ri(100,110),label:t('bp_stage2')};
  return{sys:ri(90,109),dia:ri(60,69),label:t('bp_low')};
}
function genSpO2(){
  const r=Math.random();
  if(r<.75)return{val:ri(97,100),label:t('spo2_normal')};
  if(r<.90)return{val:ri(95,96),label:t('spo2_normal')};
  if(r<.97)return{val:ri(92,94),label:t('spo2_low')};
  return{val:ri(88,91),label:t('spo2_critical')};
}
function genHR(){const r=Math.random();if(r<.6)return ri(65,85);if(r<.8)return ri(55,64);if(r<.95)return ri(86,100);return ri(101,115);}
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
    const W=210,PH=297;
    const now=new Date();

    // Background
    doc.setFillColor(2,8,16);doc.rect(0,0,W,PH,'F');

    // Header
    doc.setFillColor(5,15,30);doc.rect(0,0,W,26,'F');
    doc.setDrawColor(0,229,255);doc.setLineWidth(0.5);doc.line(0,26,W,26);
    doc.setFont('helvetica','bold');doc.setFontSize(17);doc.setTextColor(0,229,255);
    doc.text('HEALTHSCAN PRO',14,11);
    doc.setFontSize(7);doc.setTextColor(58,106,132);doc.setFont('helvetica','normal');
    doc.text('BIOMETRIC MEDICAL REPORT',14,18);
    doc.setFontSize(7);doc.setTextColor(122,184,212);
    doc.text(now.toLocaleString(),W-12,11,{align:'right'});
    doc.text('Auto-generated',W-12,18,{align:'right'});

    let y=32;
    const LPAD=14, VPAD=65, ROW=6.2;

    // Section header
    const sec=(title,r,g,b)=>{
      doc.setFillColor(5,15,30);doc.roundedRect(8,y,W-16,7,1.5,1.5,'F');
      doc.setDrawColor(r,g,b);doc.setLineWidth(0.35);doc.roundedRect(8,y,W-16,7,1.5,1.5,'S');
      doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.setTextColor(r,g,b);
      doc.text(title,LPAD,y+5);y+=10;
    };
    // Data row
    const row=(lbl,val,unit,vr,vg,vb)=>{
      doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(58,106,132);
      doc.text(lbl,LPAD+2,y);
      doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(vr,vg,vb);
      doc.text(String(val),VPAD,y);
      if(unit){doc.setFontSize(6.5);doc.setTextColor(122,184,212);doc.text(unit,VPAD+22,y);}
      y+=ROW;
    };
    const gap=(n=2)=>{y+=n;};

    // ── 1. VITAL SIGNS (5 rows)
    sec('VITAL SIGNS',0,229,255);
    row('Systolic BP',S.lastBP.sys,'mmHg',255,80,100);
    row('Diastolic BP',S.lastBP.dia,'mmHg',255,140,0);
    row('BP Status',S.lastBP.label,'',255,200,100);
    row('Blood Oxygen (SpO2)',S.lastSpO2.val+'%','',0,229,255);
    row('SpO2 Status',S.lastSpO2.label,'',0,200,180);
    gap();

    // ── 2. ADDITIONAL METRICS (3 rows)
    sec('ADDITIONAL METRICS',0,255,136);
    row('Heart Rate',S.lastHR,'BPM',255,100,150);
    row('Body Temperature',S.lastTemp,'°C',255,200,80);
    row('Respiratory Rate',S.lastRsp,'/min',0,229,255);
    gap();

    // ── 3. BMI (5 rows if available)
    const bh=G('bmiHeight').value,bw=G('bmiWeight').value;
    if(bh&&bw){
      const bmi=(bw/((bh/100)**2)).toFixed(1);
      const bf=bmiGender==='female';
      const cat=bmi<18.5?'Underweight':bmi<(bf?24:25)?'Normal Weight':bmi<(bf?29:30)?'Overweight':'Obese';
      sec('BMI DATA',255,140,0);
      row('Gender',bmiGender==='female'?'Female':'Male','',224,244,255);
      row('Height / Weight',bh+'cm  /  '+bw+'kg','',224,244,255);
      row('BMI Score',bmi,'',255,140,0);
      row('BMI Category',cat,'',255,180,50);
      gap();
    }

    // ── 4. STRESS (6 rows)
    const sf1=G('sf1'),sf2=G('sf2'),sf3=G('sf3'),sf4=G('sf4');
    if(sf1){
      const sleep=+sf1.value,work=+sf2.value,ex=+sf3.value,mood=+sf4.value;
      const raw=(10-sleep)*2.0+work*2.2-ex*1.8-mood*1.4+20;
      const stress=Math.max(0,Math.min(100,Math.round(raw)));
      const lvl=stress<30?'Low':stress<60?'Moderate':'High';
      const sc=stress<30?[0,255,136]:stress<60?[255,140,0]:[255,51,102];
      sec('STRESS ANALYSIS',sc[0],sc[1],sc[2]);
      row('Sleep / Work / Exercise / Mood',sleep+'h  '+work+'/10  '+ex+'/10  '+mood+'/10','',122,184,212);
      row('Stress Score',stress+'/100','',sc[0],sc[1],sc[2]);
      row('Stress Level',lvl,'',sc[0],sc[1],sc[2]);
      gap();
    }

    // ── 5. SLEEP (6 rows if analyzed)
    const shEl=G('sleepScore'),sleepHrsEl=G('sleepHours');
    if(sleepHrsEl&&sleepHrsEl.value&&shEl&&shEl.textContent!=='--'){
      const hrs=parseFloat(sleepHrsEl.value)||0;
      const score=shEl.textContent;
      const grade=G('sleepGrade')?G('sleepGrade').textContent:'--';
      const debt=G('statDebt')?G('statDebt').textContent:'--';
      const eff=G('statEff')?G('statEff').textContent:'--';
      const sc2=score>=80?[0,255,136]:score>=55?[0,229,255]:[255,140,0];
      const qNames=['','Terrible','Poor','OK','Good','Great'];
      sec('SLEEP ANALYSIS',sc2[0],sc2[1],sc2[2]);
      row('Hours Slept / Quality',hrs+'h  |  '+(qNames[sleepQ]||sleepQ),'',0,229,255);
      row('Sleep Score / Grade',score+'/100  |  '+grade,'',sc2[0],sc2[1],sc2[2]);
      row('Sleep Debt / Efficiency',debt+'  |  '+eff,'',255,140,0);
      gap();
    }

    // ── 6. HISTORY (compact table)
    if(S.history.length>0){
      sec('READING HISTORY',139,92,246);
      doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.setTextColor(58,106,132);
      doc.text('#',LPAD+2,y);doc.text('Blood Pressure',LPAD+10,y);
      doc.text('SpO2',LPAD+55,y);doc.text('HR',LPAD+75,y);doc.text('Time',W-18,y,{align:'right'});
      y+=4;
      doc.setDrawColor(20,50,80);doc.setLineWidth(0.15);doc.line(LPAD,y,W-LPAD,y);y+=3.5;
      S.history.slice(0,8).forEach((h,i)=>{
        doc.setFont('helvetica','normal');doc.setFontSize(7);
        doc.setTextColor(58,106,132);doc.text('#'+(i+1),LPAD+2,y);
        doc.setTextColor(255,80,100);doc.text(h.bp.sys+'/'+h.bp.dia,LPAD+10,y);
        doc.setTextColor(0,229,255);doc.text(h.spo2.val+'%',LPAD+55,y);
        doc.setTextColor(139,92,246);doc.text(h.hr+'',LPAD+75,y);
        doc.setTextColor(58,106,132);doc.text(h.time,W-18,y,{align:'right'});
        y+=5.2;
      });
    }

    // Footer
    doc.setFillColor(5,15,30);doc.rect(0,PH-12,W,12,'F');
    doc.setDrawColor(0,229,255);doc.setLineWidth(0.25);doc.line(0,PH-12,W,PH-12);
    doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.setTextColor(0,229,255);
    doc.text('HealthScan Pro v3.0',LPAD,PH-9);
    doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(0,200,180);
    doc.text('Developed by Muhammad Ali Hassan',W/2,PH-9,{align:'center'});
    doc.setFont('helvetica','normal');doc.setFontSize(5.5);doc.setTextColor(58,106,132);
    doc.text('For informational use only. Consult a licensed physician.',LPAD,PH-4);
    doc.setTextColor(122,184,212);doc.text(now.toLocaleDateString(),W-LPAD,PH-4,{align:'right'});

    doc.save('HealthScan-'+now.toLocaleDateString('en-GB').replace(/\//g,'-')+'.pdf');
    toast(t('pdf_done'));
  }catch(e){toast('❌ PDF error: '+e.message);console.error(e);}
}

// ══════════════════════════════════════════
//  PRINT REPORT
// ══════════════════════════════════════════
function printReport(){
  if(!S.lastBP){ toast(t('pdf_no_data')); return; }
  
  // Build a clean printable HTML page
  const bp = S.lastBP, spo2 = S.lastSpO2, hr = S.lastHR, tmp = S.lastTemp, rsp = S.lastRsp;
  const bh = G('bmiHeight').value, bw = G('bmiWeight').value;
  const bmi = (bh&&bw) ? (bw/((bh/100)**2)).toFixed(1) : null;
  const bf = bmiGender==='female';
  const bmiCat = bmi ? (bmi<18.5?'Underweight':bmi<(bf?24:25)?'Normal Weight':bmi<(bf?29:30)?'Overweight':'Obese') : '';
  const now = new Date();

  // Stress values
  const sleep=+G('sf1').value, work=+G('sf2').value, ex=+G('sf3').value, mood=+G('sf4').value;
  const raw=(10-sleep)*2.0+work*2.2-ex*1.8-mood*1.4+20;
  const stress=Math.max(0,Math.min(100,Math.round(raw)));
  const stressLvl=stress<30?'Low':stress<60?'Moderate':'High';

  // Sleep values
  const sleepHrs = G('sleepHours').value || '--';
  const sleepScoreEl = G('sleepScore');
  const sleepScore = sleepScoreEl ? sleepScoreEl.textContent : '--';
  const sleepGradeEl = G('sleepGrade');
  const sleepGrade = sleepGradeEl ? sleepGradeEl.textContent : '--';
  const qNames=['','Terrible','Poor','OK','Good','Great'];

  const histRows = S.history.slice(0,8).map((h,i)=>`
    <tr>
      <td>#${i+1}</td>
      <td style="color:#c00">${h.bp.sys}/${h.bp.dia} mmHg</td>
      <td style="color:#007">${h.spo2.val}%</td>
      <td style="color:#606">${h.hr} bpm</td>
      <td>${h.time}</td>
    </tr>`).join('');

  const printWin = window.open('','_blank','width=800,height=900');
  printWin.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<title>HealthScan Report</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;background:#fff;color:#111;padding:24px;font-size:12px}
  h1{font-size:22px;color:#0077aa;letter-spacing:2px;margin-bottom:2px}
  .subtitle{font-size:9px;color:#888;letter-spacing:3px;margin-bottom:4px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #00aacc;padding-bottom:10px;margin-bottom:16px}
  .hright{text-align:right;font-size:10px;color:#555}
  .section{margin-bottom:14px;page-break-inside:avoid}
  .sec-title{background:#f0faff;border-left:4px solid #00aacc;padding:5px 10px;font-size:11px;font-weight:bold;color:#005577;letter-spacing:1px;margin-bottom:6px}
  table{width:100%;border-collapse:collapse}
  td{padding:5px 10px;border-bottom:1px solid #eee}
  td:first-child{color:#777;width:45%}
  td:last-child{font-weight:bold}
  .footer{margin-top:20px;padding-top:10px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:9px;color:#999}
  .dev-name{color:#0077aa;font-weight:bold}
  @media print{
    .no-print{display:none!important}
    body{padding:12px}
  }
</style>
</head><body>
<div class="header">
  <div>
    <h1>HEALTHSCAN PRO</h1>
    <div class="subtitle">BIOMETRIC MEDICAL REPORT</div>
  </div>
  <div class="hright">
    <div>${now.toLocaleString()}</div>
    <div style="margin-top:4px;font-size:9px">Auto-generated</div>
    <button class="no-print" onclick="window.print()" style="margin-top:8px;padding:6px 14px;background:#0077aa;color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:bold">🖨️ PRINT</button>
  </div>
</div>

<div class="section">
  <div class="sec-title">🩸 VITAL SIGNS</div>
  <table>
    <tr><td>Systolic Blood Pressure</td><td style="color:#cc0033">${bp.sys} mmHg</td></tr>
    <tr><td>Diastolic Blood Pressure</td><td style="color:#cc6600">${bp.dia} mmHg</td></tr>
    <tr><td>BP Status</td><td>${bp.label}</td></tr>
    <tr><td>Blood Oxygen (SpO2)</td><td style="color:#0055cc">${spo2.val}%</td></tr>
    <tr><td>SpO2 Status</td><td>${spo2.label}</td></tr>
  </table>
</div>

<div class="section">
  <div class="sec-title">💚 ADDITIONAL METRICS</div>
  <table>
    <tr><td>Heart Rate</td><td style="color:#cc0055">${hr} BPM</td></tr>
    <tr><td>Body Temperature</td><td style="color:#cc8800">${tmp} °C</td></tr>
    <tr><td>Respiratory Rate</td><td style="color:#0055cc">${rsp} /min</td></tr>
  </table>
</div>

${bmi ? `<div class="section">
  <div class="sec-title">⚖️ BMI DATA</div>
  <table>
    <tr><td>Gender</td><td>${bmiGender==='female'?'Female':'Male'}</td></tr>
    <tr><td>Height / Weight</td><td>${bh} cm / ${bw} kg</td></tr>
    <tr><td>BMI Score</td><td style="color:#cc6600">${bmi}</td></tr>
    <tr><td>BMI Category</td><td>${bmiCat}</td></tr>
  </table>
</div>` : ''}

<div class="section">
  <div class="sec-title">🧠 STRESS ANALYSIS</div>
  <table>
    <tr><td>Sleep / Work / Exercise / Mood</td><td>${sleep}h &nbsp; ${work}/10 &nbsp; ${ex}/10 &nbsp; ${mood}/10</td></tr>
    <tr><td>Stress Score</td><td style="color:${stress<30?'green':stress<60?'orange':'red'}">${stress}/100</td></tr>
    <tr><td>Stress Level</td><td style="color:${stress<30?'green':stress<60?'orange':'red'}">${stressLvl}</td></tr>
  </table>
</div>

${sleepHrs!=='--'?`<div class="section">
  <div class="sec-title">😴 SLEEP ANALYSIS</div>
  <table>
    <tr><td>Hours Slept / Quality</td><td>${sleepHrs}h / ${qNames[sleepQ]||sleepQ}</td></tr>
    <tr><td>Sleep Score / Grade</td><td>${sleepScore}/100 — ${sleepGrade}</td></tr>
    <tr><td>Sleep Debt / Efficiency</td><td>${G('statDebt')?G('statDebt').textContent:'--'} / ${G('statEff')?G('statEff').textContent:'--'}</td></tr>
  </table>
</div>`:''}

${S.history.length>0?`<div class="section">
  <div class="sec-title">📋 READING HISTORY</div>
  <table>
    <tr style="background:#f5f5f5;font-size:10px;color:#555">
      <td>#</td><td>Blood Pressure</td><td>SpO2</td><td>Heart Rate</td><td>Time</td>
    </tr>
    ${histRows}
  </table>
</div>`:''}

<div class="footer">
  <div>HealthScan Pro v3.0 — For informational use only. Consult a licensed physician.</div>
  <div class="dev-name">Developed by Muhammad Ali Hassan</div>
  <div>${now.toLocaleDateString()}</div>
</div>
</body></html>`);

  printWin.document.close();
  printWin.focus();
  setTimeout(()=>{ printWin.print(); }, 800);
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
// Canvas preview for browsers where WebGL is unavailable. The UI labels it as 2D.
export function createFallback(holder, initialPhoto) {
  const canvas=document.createElement('canvas');holder.append(canvas);
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label','写真立てと降る雪の2Dプレビュー');
  const ctx=canvas.getContext('2d');let photo=initialPhoto,time=0,boost=0,width=0,height=0;
  const flakes=Array.from({length:100},(_,i)=>({x:Math.sin(i*17.17)*.88,y:(i*.618034)%1,front:i%3===0,size:1.2+i%4*.35,speed:.07+i%5*.013,phase:i*1.9}));
  function ellipse(x,y,rx,ry,color,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  function snow(front,cx,cy,r){flakes.filter(f=>f.front===front).forEach(f=>{const y=((f.y+time*f.speed)%1)*1.85-.92;const x=f.x+Math.sin(time+f.phase)*.025;if(x*x+y*y>.9||y>.72)return;ellipse(cx+x*r,cy+y*r,f.size,f.size,'#ffffff',front?.95:.5);});}
  function render(){
    ctx.clearRect(0,0,width,height);const r=Math.min(width*.39,height*.37,175),cx=width/2,cy=height*.43,floor=cy+r*.76;
    ellipse(cx,floor+r*.35,r*.95,r*.085,'#234e42',.10);
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
    const gradient=ctx.createRadialGradient(cx-r*.5,cy-r*.55,r*.05,cx,cy,r);
    gradient.addColorStop(0,'rgba(255,255,255,.75)');gradient.addColorStop(.8,'rgba(199,226,226,.24)');gradient.addColorStop(1,'rgba(139,186,190,.32)');
    ctx.fillStyle=gradient;ctx.fillRect(cx-r,cy-r,r*2,r*2);snow(false,cx,cy,r);
    ellipse(cx,floor,r*.85,r*.20,'#fffef8');
    const fw=r*1.16,fh=fw*.75,fx=cx-fw/2,fy=cy-fh*.32;
    ctx.fillStyle='#775341';ctx.fillRect(fx+6,fy+5,fw,fh);ctx.fillStyle='#c8a367';ctx.fillRect(fx,fy,fw,fh);
    ctx.drawImage(photo,fx+7,fy+7,fw-14,fh-14);
    ctx.fillStyle='#72523c';ctx.fillRect(cx-4,fy+fh,8,floor-fy-fh);snow(true,cx,cy,r);ctx.restore();
    ctx.strokeStyle='rgba(120,173,179,.4)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx,cy,r,Math.PI*.24,Math.PI*2.76);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.arc(cx,cy,r*.89,Math.PI*1.12,Math.PI*1.38);ctx.stroke();
    const bw=r*.88,top=floor+5;ctx.fillStyle='#674638';ctx.fillRect(cx-bw,top,bw*2,r*.19);ellipse(cx,top+r*.19,bw,r*.07,'#674638');
    ellipse(cx,top,bw,r*.075,'#c4a06b');ellipse(cx,top-3,bw*.96,r*.059,'#fffef8');
    ctx.fillStyle='#e6cf9c';ctx.textAlign='center';ctx.font='10px Georgia,serif';ctx.fillText('CHRISTMAS MEMORIES',cx,top+r*.145);
  }
  function resize(){width=holder.clientWidth;height=holder.clientHeight;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);render();}
  const observer=new ResizeObserver(resize);observer.observe(holder);resize();
  return {setPhoto(value){photo=value;render();},update(dt){time+=Math.min(dt,.05)*(1+boost*2);boost=Math.max(0,boost-dt*.3);},render,swirl(){boost=1;},dispose(){observer.disconnect();}};
}

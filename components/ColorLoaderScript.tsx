'use client';

import Script from 'next/script';

/**
 * Script qui charge instantanément les couleurs de l'événement depuis sessionStorage
 * Double stratégie: script inline + beforeInteractive pour maximum de rapidité
 */
export default function ColorLoaderScript() {
  return (
    <>
      {/* Script inline IMMÉDIAT - s'exécute pendant le parsing HTML */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
try{
var m=window.location.pathname.match(/\\/event\\/([^\\/]+)/);
if(!m)return;
var k='event-'+m[1]+'-colors',c=sessionStorage.getItem(k);
if(!c)return;
var d=JSON.parse(c),adj=function(h,p){var r=parseInt(h.substring(1,3),16),g=parseInt(h.substring(3,5),16),b=parseInt(h.substring(5,7),16);r=Math.min(255,Math.max(0,r+(r*p/100)));g=Math.min(255,Math.max(0,g+(g*p/100)));b=Math.min(255,Math.max(0,b+(b*p/100)));return'#'+Math.round(r).toString(16).padStart(2,'0')+Math.round(g).toString(16).padStart(2,'0')+Math.round(b).toString(16).padStart(2,'0')},toRgb=function(h){var r=/^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(h);return r?{r:parseInt(r[1],16),g:parseInt(r[2],16),b:parseInt(r[3],16)}:null},p=d.primaryColor||'#8b7355',s=d.secondaryColor||'#c9a875',pRgb=toRgb(p),sRgb=toRgb(s),st=document.createElement('style');st.id='event-colors-instant';st.innerHTML=':root{--primary-color:'+p+';--primary-light:'+adj(p,20)+';--primary-dark:'+adj(p,-20)+';--secondary-color:'+s+';--secondary-light:'+adj(s,20)+';--secondary-dark:'+adj(s,-20)+';'+(pRgb?'--primary-color-rgb:'+pRgb.r+','+pRgb.g+','+pRgb.b+';':'')+(sRgb?'--secondary-rgb:'+sRgb.r+','+sRgb.g+','+sRgb.b+';':'')+'--primary-gradient:linear-gradient(135deg,'+p+' 0%,'+adj(p,20)+' 100%);--secondary-gradient:linear-gradient(135deg,'+s+' 0%,'+adj(s,20)+' 100%);'+(d.backgroundImageUrl?'--bg-image:url('+d.backgroundImageUrl+');':'')+'}';document.head.insertBefore(st,document.head.firstChild);
}catch(e){}
})();
          `,
        }}
      />
      {/* Script avec beforeInteractive comme backup */}
      <Script
        id="instant-color-loader-backup"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  if(document.getElementById('event-colors-instant')) return;
  try {
    var path = window.location.pathname;
    var match = path.match(/\\/event\\/([^\\/]+)/);
    if (!match) return;
    
    var eventId = match[1];
    var key = 'event-' + eventId + '-colors';
    var cached = sessionStorage.getItem(key);
    if (!cached) return;
    
    var colors = JSON.parse(cached);
    
    function adjust(color, percent) {
      var r = parseInt(color.substring(1,3), 16);
      var g = parseInt(color.substring(3,5), 16);
      var b = parseInt(color.substring(5,7), 16);
      r = Math.min(255, Math.max(0, r + (r * percent / 100)));
      g = Math.min(255, Math.max(0, g + (g * percent / 100)));
      b = Math.min(255, Math.max(0, b + (b * percent / 100)));
      return '#' + Math.round(r).toString(16).padStart(2,'0') + Math.round(g).toString(16).padStart(2,'0') + Math.round(b).toString(16).padStart(2,'0');
    }
    
    function toRgb(hex) {
      var r = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
      return r ? {r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16)} : null;
    }
    
    var p = colors.primaryColor || '#8b7355';
    var s = colors.secondaryColor || '#c9a875';
    
    var pRgb = toRgb(p);
    var sRgb = toRgb(s);
    
    var styleTag = document.createElement('style');
    styleTag.id = 'event-colors-instant';
    styleTag.innerHTML = ':root {' +
      '--primary-color: ' + p + ';' +
      '--primary-light: ' + adjust(p, 20) + ';' +
      '--primary-dark: ' + adjust(p, -20) + ';' +
      '--secondary-color: ' + s + ';' +
      '--secondary-light: ' + adjust(s, 20) + ';' +
      '--secondary-dark: ' + adjust(s, -20) + ';' +
      (pRgb ? '--primary-color-rgb: ' + pRgb.r + ',' + pRgb.g + ',' + pRgb.b + ';' : '') +
      (sRgb ? '--secondary-rgb: ' + sRgb.r + ',' + sRgb.g + ',' + sRgb.b + ';' : '') +
      '--primary-gradient: linear-gradient(135deg,' + p + ' 0%,' + adjust(p,20) + ' 100%);' +
      '--secondary-gradient: linear-gradient(135deg,' + s + ' 0%,' + adjust(s,20) + ' 100%);' +
      (colors.backgroundImageUrl ? '--bg-image: url(' + colors.backgroundImageUrl + ');' : '') +
      '}';
    
    document.head.insertBefore(styleTag, document.head.firstChild);
  } catch(e) {}
})();
        `,
        }}
      />
    </>
  );
}

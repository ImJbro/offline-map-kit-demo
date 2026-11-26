"use strict";
const $ = id => document.getElementById(id);
const demo = {type:"FeatureCollection",features:[
  {type:"Feature",properties:{name:"Demo Park"},geometry:{type:"Polygon",coordinates:[[[-104.54,39.78],[-104.47,39.78],[-104.46,39.81],[-104.51,39.84],[-104.55,39.82],[-104.54,39.78]]]}},
  {type:"Feature",properties:{name:"Demo Trail"},geometry:{type:"LineString",coordinates:[[-104.545,39.807],[-104.521,39.814],[-104.501,39.807],[-104.482,39.793]]}},
  {type:"Feature",properties:{name:"Demo Trailhead"},geometry:{type:"Point",coordinates:[-104.545,39.807]}}
]};
const keys = {layer:"omk-public-demo.layer.1",points:"omk-public-demo.points.1"};
const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
let layer = read(keys.layer,null), points = read(keys.points,[]), fix = null;
let center = [-104.51,39.81], span = .11, anchor = null, drag = null;
const map = $("map"), ns="http://www.w3.org/2000/svg";
const announce = text => { $("status").textContent=text; };
const save = (key,value) => {
  try { localStorage.setItem(key,JSON.stringify(value)); return true; }
  catch { announce("Could not save on this device. Storage may be full or unavailable."); return false; }
};
const clamp = (value,lo,hi) => Math.min(hi,Math.max(lo,value));
const format = ([lon,lat]) => `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`;
const dimensions = () => ({w:map.clientWidth||320,h:map.clientHeight||300});
const svg = (tag,attrs,text) => {
  const element=document.createElementNS(ns,tag);
  for (const [k,v] of Object.entries(attrs)) element.setAttribute(k,v);
  if (text) element.textContent=text;
  return element;
};
function draw(){
  const {w,h}=dimensions(), scale=w/span, ratio=Math.max(.1,Math.cos(center[1]*Math.PI/180));
  const xy=([lon,lat])=>[w/2+(lon-center[0])*scale,h/2-(lat-center[1])*scale/ratio];
  const point=(coordinate,attrs)=>{
    const [cx,cy]=xy(coordinate);
    map.append(svg("circle",{cx,cy,...attrs}));
  };
  const label=(coordinate,text,fill)=>{
    const [x,y]=xy(coordinate);
    map.append(svg("text",{x:x+10,y:y-8,fill,"font-size":12,"paint-order":"stroke",stroke:"#102321","stroke-width":3},text));
  };
  map.setAttribute("viewBox",`0 0 ${w} ${h}`);
  map.replaceChildren();
  const step=10**Math.floor(Math.log10(span/5));
  const gridStep=span/step>17?step*5:step*2;
  const vSpan=h*ratio/scale;
  const grid=[];
  for(let x=Math.floor((center[0]-span/2)/gridStep)*gridStep;x<=center[0]+span/2;x+=gridStep)
    grid.push(`M${xy([x,0])[0]},0V${h}`);
  for(let y=Math.floor((center[1]-vSpan/2)/gridStep)*gridStep;y<=center[1]+vSpan/2;y+=gridStep)
    grid.push(`M0,${xy([0,y])[1]}H${w}`);
  map.append(svg("path",{d:grid.join(" "),stroke:"#284540","stroke-width":1}));
  function paint(g,name,kind){
    if (!g) return;
    const c=g.coordinates;
    const line=list=>list.map((p,i)=>(i?"L":"M")+xy(p).join(",")).join(" ");
    const poly=rings=>map.append(svg("path",{d:rings.map(list=>line(list)+"Z").join(" "),fill:"#2c5241","fill-rule":"evenodd",stroke:"#72a18a","stroke-width":1}));
    const styles={highway:["#e5bd71",2.6],road:["#81918b",1.15],water:["#6ab4d7",1.35],boundary:["#b9d7cb",1.4]};
    const path=list=>{const [stroke,width]=styles[kind]||["#dbbf79",2.5];map.append(svg("path",{d:line(list),fill:"none",stroke,"stroke-width":width,...(kind==="boundary"?{"stroke-dasharray":"5 6"}:{})}));};
    const dot=p=>{const fill=kind==="town"?"#e8eee9":kind==="park"?"#bdf4a4":"#dbbf79";point(p,{r:kind==="town"?2.5:4,fill});if(name)label(p,name,fill);};
    switch(g.type){
      case "GeometryCollection":g.geometries.forEach(item=>paint(item,name,kind));break;
      case "Point":dot(c);break;
      case "MultiPoint":c.forEach(dot);break;
      case "LineString":path(c);break;
      case "MultiLineString":c.forEach(path);break;
      case "Polygon":poly(c);break;
      case "MultiPolygon":c.forEach(poly);break;
    }
  }
  (layer?.data||demo).features.forEach(f=>paint(f.geometry,String(f.properties?.name??"").slice(0,48),layer?.builtin===true?f.properties?.kind:null));
  points.forEach(p=>{point(p.coordinates,{r:5,fill:"#bcf79c",stroke:"#122117","stroke-width":2});label(p.coordinates,p.name,"#e0efe7");});
  if(fix){
    if(fix.accuracy<10000) point(fix.coordinates,{r:fix.accuracy*scale/(111320*ratio),fill:"#52b8ef","fill-opacity":.12});
    point(fix.coordinates,{r:6,fill:"#52b8ef",stroke:"#e0f6ff","stroke-width":2});
  }
  map.append(svg("path",{d:`M${w/2-11},${h/2}h22M${w/2},${h/2-11}v22`,stroke:"#e0efe7","stroke-width":1.2}));
  const meters=span*111320*ratio/5, base=10**Math.floor(Math.log10(meters));
  const bar=meters>=5*base?5*base:meters>=2*base?2*base:base;
  const width=bar*scale/(111320*ratio);
  map.append(svg("path",{d:`M12,50v4h${width}v-4`,stroke:"#dbece4","stroke-width":1,fill:"none"}));
  map.append(svg("text",{x:12,y:45,fill:"#dbece4","font-size":11},bar>=1000?`${bar/1000} km`:`${bar} m`));
  $("center").textContent="Center: "+format(center);
  $("legend").hidden=layer?.builtin!==true;
  $("map-label").textContent=layer?.builtin===true?"Beavercreek · 10 mi · U.S. Census TIGERweb":layer?`Local layer: ${layer.name}`:"Fictional demo · Not for navigation";
}
function zoom(factor,pixel){
  const old=span;
  span=clamp(span*factor,.00012,330);
  if(pixel){
    const {w,h}=dimensions(), ratio=Math.max(.1,Math.cos(center[1]*Math.PI/180));
    center=[clamp(center[0]+(pixel[0]-w/2)*(old-span)/w,-180,180),clamp(center[1]-(pixel[1]-h/2)*(old-span)*ratio/w,-85,85)];
  }
  draw();
}
function fit(){
  const [west,south,east,north]=layer?.bounds??[-104.55,39.78,-104.46,39.84];
  center=[(west+east)/2,clamp((south+north)/2,-85,85)];
  const {w,h}=dimensions(), ratio=Math.max(.1,Math.cos(center[1]*Math.PI/180));
  span=clamp(Math.max(.004,(east-west)*1.25,(north-south)*1.25*w/h/ratio),.00012,330);
  draw();
}
function validate(raw){
  let features;
  const levels={Point:0,MultiPoint:1,LineString:1,MultiLineString:2,Polygon:2,MultiPolygon:3};
  if(raw?.type==="FeatureCollection") features=raw.features;
  else if(raw?.type==="Feature") features=[raw];
  else if(raw?.type in levels||raw?.type==="GeometryCollection") features=[{type:"Feature",geometry:raw,properties:{}}];
  if(!Array.isArray(features)||features.length>10000) throw Error("Expected a GeoJSON file with up to 10,000 features.");
  let count=0,bounds=[180,90,-180,-90];
  function values(c,level){
    if(!Array.isArray(c)) throw Error("Invalid GeoJSON coordinates.");
    if(level>0){for(const p of c) values(p,level-1);return;}
    const [x,y]=c;
    if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>180||Math.abs(y)>85) throw Error("Use WGS84 longitude/latitude within 85° north or south.");
    if(++count>40000) throw Error("This layer exceeds 40,000 points. Simplify it and retry.");
    bounds=[Math.min(bounds[0],x),Math.min(bounds[1],y),Math.max(bounds[2],x),Math.max(bounds[3],y)];
  }
  function geom(g,depth=0){
    if(g===null)return;
    if(depth>8)throw Error("Geometry is nested too deeply.");
    if(g?.type==="GeometryCollection"&&Array.isArray(g.geometries)){g.geometries.forEach(x=>geom(x,depth+1));return;}
    if(!Object.hasOwn(levels,g?.type))throw Error("Unsupported GeoJSON geometry.");
    values(g.coordinates,levels[g.type]);
  }
  for(const f of features){if(f?.type!=="Feature")throw Error("Invalid GeoJSON feature.");geom(f.geometry);}
  if(!count)throw Error("This layer has no supported coordinates.");
  if(bounds[2]-bounds[0]>180)throw Error("Split layers crossing the date line or spanning over 180° of longitude.");
  return {data:{type:"FeatureCollection",features},bounds};
}
map.addEventListener("pointerdown",event=>{
  if(!event.isPrimary||event.button!==0)return;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY};
  map.setPointerCapture(event.pointerId);
});
map.addEventListener("pointermove",event=>{
  if(drag?.id!==event.pointerId)return;
  const {w}=dimensions(), ratio=Math.max(.1,Math.cos(center[1]*Math.PI/180));
  center=[clamp(center[0]-(event.clientX-drag.x)*span/w,-180,180),clamp(center[1]+(event.clientY-drag.y)*span/w*ratio,-85,85)];
  drag.x=event.clientX;drag.y=event.clientY;draw();
});
["pointercancel","pointerup","lostpointercapture"].forEach(type=>map.addEventListener(type,event=>{if(drag?.id===event.pointerId)drag=null;}));
map.addEventListener("wheel",event=>{
  event.preventDefault();const rect=map.getBoundingClientRect();
  zoom(event.deltaY>0?1.25:.8,[event.clientX-rect.left,event.clientY-rect.top]);
},{passive:false});
$("zoom-in").onclick=()=>zoom(.66);$("zoom-out").onclick=()=>zoom(1.5);$("fit").onclick=fit;
$("locate").onclick=()=>{
  if(!isSecureContext||!navigator.geolocation){announce("GPS needs HTTPS on a phone, or localhost on this computer.");return;}
  $("locate").disabled=true;announce("Waiting for GPS. Try outdoors with a clear view of the sky.");
  navigator.geolocation.getCurrentPosition(position=>{
    const {longitude,latitude,accuracy}=position.coords;
    if(Math.abs(latitude)>85){announce("GPS is outside the map’s supported latitude range.");$("locate").disabled=false;return;}
    fix={coordinates:[longitude,latitude],accuracy};center=[...fix.coordinates];span=Math.min(span,.025);
    draw();announce(`GPS fix: ${format(fix.coordinates)} · accuracy about ${Math.round(accuracy)} m.`);$("locate").disabled=false;
  },error=>{announce(error.code===1?"Location permission is off. Enable it and try again.":"No GPS fix yet. Try outdoors and retry.");$("locate").disabled=false;},{enableHighAccuracy:true,timeout:18000,maximumAge:0});
};
const form=$("waypoint-form"),nameField=$("name");
$("add").onclick=()=>{ anchor=[...center];form.hidden=false;nameField.value="Waypoint "+(points.length+1);nameField.focus();nameField.select();announce("Saving location at "+format(anchor)+"."); };
$("cancel").onclick=()=>{anchor=null;form.hidden=true;$("add").focus();};
form.onsubmit=event=>{
  event.preventDefault(); const name=nameField.value.trim();
  if(!name||!anchor){announce("Enter a waypoint name.");return;}
  const next=[...points,{name,coordinates:anchor}];
  if(save(keys.points,next)){points=next;anchor=null;form.hidden=true;list();draw();announce("Waypoint saved on this device.");$("add").focus();}
};
function list(){
  const target=$("points");target.replaceChildren();
  if(!points.length){const li=document.createElement("li");li.textContent="No saved waypoints yet.";target.append(li);}
  points.forEach((p,i)=>{
    const li=document.createElement("li"),go=document.createElement("button"),del=document.createElement("button");
    go.className="point";go.textContent=p.name;go.onclick=()=>{center=[...p.coordinates];span=Math.min(span,.04);draw();announce("Centered on "+p.name+".");};
    const coord=document.createElement("small");coord.textContent=format(p.coordinates);go.append(coord);
    del.textContent="Remove";del.setAttribute("aria-label","Remove "+p.name);del.onclick=()=>{const next=points.filter((_,j)=>i!==j);if(save(keys.points,next)){points=next;list();draw();announce("Waypoint removed.");}};
    li.append(go,del);target.append(li);
  });
  $("export").disabled=!points.length;
}
$("export").onclick=()=>{
  const data={type:"FeatureCollection",features:points.map(p=>({type:"Feature",properties:{name:p.name},geometry:{type:"Point",coordinates:p.coordinates}}))};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/geo+json"}));
  const a=document.createElement("a");a.href=url;a.download="waypoints.geojson";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$("import").onchange=async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>2*1024*1024)throw Error("Use a GeoJSON file no larger than 2 MB.");
    const next={name:file.name,...validate(JSON.parse(await file.text()))};
    if(save(keys.layer,next)){layer=next;fit();announce("Map layer saved on this device.");}
  }catch(error){announce("Import failed: "+error.message);}
  finally{event.target.value="";}
};
$("beavercreek").onclick=async()=>{
  const button=$("beavercreek");button.disabled=true;
  try{
    const r=await fetch("./beavercreek-10mi.geojson");if(!r.ok)throw Error("Map file unavailable.");
    const next={name:"Beavercreek 10 mi",builtin:true,...validate(await r.json())};
    if(save(keys.layer,next)){layer=next;fit();announce("Beavercreek map loaded and saved on this device.");}
  }catch(e){announce("Could not open Beavercreek: "+e.message);}
  finally{button.disabled=false;}
};
$("demo").onclick=()=>{if(save(keys.layer,null)){layer=null;fit();announce("Fictional demo map restored. Waypoints kept.");}};
new ResizeObserver(draw).observe(map);
fit();list();
(async()=>{
  const note=$("offline");
  if(!("serviceWorker" in navigator)){note.textContent="Offline install needs HTTPS or localhost.";return;}
  try{
    await navigator.serviceWorker.register("./sw.js");
    const sync=()=>{ if(navigator.serviceWorker.controller)note.textContent="Offline shell ready · data stays on this device"; };
    navigator.serviceWorker.addEventListener("controllerchange",sync);sync();
  }catch{note.textContent="Could not prepare offline mode. Check HTTPS and storage settings.";}
})();

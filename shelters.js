"use strict";
const AtlasShelters=(()=>{
 const empty={type:"FeatureCollection",features:[]};
 const liveSource="https://gis.fema.gov/arcgis/rest/services/NSS/FEMA_NSS/FeatureServer/0/query";
 let map, base, current=empty, timer, request=0;
 const el=id=>document.getElementById(id);
 const visibility=(on)=>({visibility:on?"visible":"none"});
 const directoryEnabled=()=>el("shelter-directory")?.checked===true;
 function style(sources,layers,baseURL){
  const path=new URL("shelter-directory.geojson",baseURL).href;
  if(directoryEnabled())sources["shelter-directory-data"]={type:"geojson",data:path,cluster:true,clusterRadius:40,clusterMaxZoom:10,attribution:"FEMA ESF#6 planning directory"};
  sources["shelter-live-data"]={type:"geojson",data:current,cluster:true,clusterRadius:40,clusterMaxZoom:10};
  const dots=(id,src,color,enabled)=>({id,type:"circle",source:src,layout:visibility(enabled),paint:{"circle-radius":["case",["has","point_count"],["step",["get","point_count"],7,20,10,100,13],5],"circle-color":color,"circle-opacity":.85,"circle-stroke-width":1.4,"circle-stroke-color":"#122522"}});
  if(directoryEnabled())layers.push(dots("shelter-directory-pins","shelter-directory-data","#ffc879",true));
  layers.push(dots("shelter-open-pins","shelter-live-data","#75d9ff",true));
 }
 function notice(s){el("shelter-status").textContent=s;}
 const detailText="Select a pin for its name and address. Amber = planning only. Blue = reported open by FEMA.";
 function resetLive(s){
  request++;clearTimeout(timer);current=empty;
  map?.getSource("shelter-live-data")?.setData(current);notice(s);
  el("shelter-detail").textContent=detailText;
  el("shelter-refresh").disabled=false;
 }
 function toFeatures(rows){
  const features=[],seen=new Set();
  for(const r of rows){
   const a=r.attributes||{}, g=r.geometry;
   const x=g?.x,y=g?.y;
   if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>180||Math.abs(y)>85)continue;
   const clean=(v,n)=>typeof v==="string"?v.trim().slice(0,n):"";
   const name=clean(a.shelter_name,140);if(!name)continue;
   const address=clean(a.address_1,140),city=clean(a.city,70),state=clean(a.state,2),zip=clean(a.zip,10);
   const key=[name,address,state,x,y].join("|");if(seen.has(key))continue;seen.add(key);
   features.push({type:"Feature",properties:{name,address,city,state,zip},geometry:{type:"Point",coordinates:[x,y]}});
  }
  return {type:"FeatureCollection",features};
 }
 async function refresh(){
  if(!navigator.onLine){resetLive("Offline: current openings are unknown. The amber directory is for planning only.");return;}
  const seq=++request;notice("Checking FEMA’s open-shelter feed…");el("shelter-refresh").disabled=true;
  try{
   const q=new URLSearchParams({f:"json",where:"1=1",outFields:"shelter_name,address_1,city,state,zip",returnGeometry:true,outSR:4326,resultRecordCount:4000});
   let data;
   try{
    const r=await fetch(new URL("shelter-open.json",base),{cache:"no-store",signal:AbortSignal.timeout(12000)});
    if(!r.ok)throw Error("Feed unavailable");
    data=await r.json();
   }catch{
    const r=await fetch(liveSource+"?"+q,{cache:"no-store",signal:AbortSignal.timeout(7000)});
    if(!r.ok)throw Error("Feed unavailable");
    data=await r.json();
   }
   if(data.error||data.exceededTransferLimit||!Array.isArray(data.features))throw Error("Feed incomplete");
   const next=toFeatures(data.features);
   if(next.features.length===0&&data.features.length>0)throw Error("No mapped locations");
   if(seq!==request)return;
   current=next;map.getSource("shelter-live-data")?.setData(current);
   const n=current.features.length, when=new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
   notice("FEMA feed checked at "+when+": "+(n?n+" mapped open "+(n===1?"shelter":"shelters")+". Confirm locally before travel.":"no mapped open shelters reported. Check local officials and Red Cross too."));
   clearTimeout(timer);timer=setTimeout(()=>resetLive("Open-shelter results expired. Check again for current information."),15*60*1000);
  }catch{if(seq===request)resetLive("FEMA feed unavailable. Current openings are unknown. Check Red Cross or local officials.");}
  finally{if(seq===request)el("shelter-refresh").disabled=false;}
 }
 function attach(m,baseURL,rebuild){
  map=m;base=baseURL;
  const box=el("shelter-directory");
  box.checked=false;
  box.onchange=()=>{el("shelter-detail").textContent=detailText;rebuild();};
  el("shelter-refresh").onclick=refresh;
  window.addEventListener("offline",()=>resetLive("Offline: current openings are unknown. The amber directory is for planning only."));
  fetch(new URL("shelter-directory-info.json",base)).then(r=>r.json()).then(info=>{
   const d=new Date(info.snapshot);
   el("shelter-coverage").textContent=info.count.toLocaleString()+" potential locations across 50 states and D.C. Retrieved "+d.toLocaleDateString()+". Not proof any site is open.";
  }).catch(()=>{});
  map.on("click",async e=>{
   const ids=["shelter-open-pins","shelter-directory-pins"].filter(id=>map.getLayer(id));
   if(!ids.length)return;
   const features=map.queryRenderedFeatures(e.point,{layers:ids});if(!features.length)return;
   const f=features.find(x=>x.layer.id==="shelter-open-pins")||features[0],p=f.properties,live=f.layer.id==="shelter-open-pins";
   if(p.cluster){
    try{const zoom=await map.getSource(f.source).getClusterExpansionZoom(p.cluster_id);map.easeTo({center:f.geometry.coordinates,zoom});}catch{}
    return;
   }
   const where=[p.address,[p.city,p.state,p.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
   el("shelter-detail").textContent=(live?"FEMA reported open; confirm locally: ":"Planning site; opening unconfirmed: ")+p.name+(where?" · "+where:"");
  });
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&current!==empty)resetLive("Open-shelter status may have changed while you were away. Check again.");});
 }
 return {style,attach,toFeatures};
})();